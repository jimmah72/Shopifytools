#!/usr/bin/env node

/**
 * Test Shipping Refunds Fix
 * 
 * Test the updated refunds calculation on orders we know had shipping refunds
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testShippingRefundsFix() {
  console.log('🧪 Testing shipping refunds fix...');
  
  try {
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });
    
    if (!store) {
      console.log('❌ No store found');
      return;
    }
    
    // Test on orders we know had shipping refunds
    const testOrderNames = ['#PG3875', '#PG3880', '#PG4098', '#PG4267', '#PG4728', '#PG4988', '#PG5202'];
    
    const testOrders = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        orderName: { in: testOrderNames }
      },
      select: { 
        id: true, 
        orderName: true, 
        totalRefunds: true 
      }
    });
    
    console.log(`📊 Testing ${testOrders.length} orders with known shipping refunds`);
    
    const shopDomain = store.domain.replace('.myshopify.com', '');
    let totalCurrent = 0;
    let totalNew = 0;
    let totalShippingFound = 0;
    
    for (const order of testOrders) {
      console.log(`\n📄 Order ${order.orderName}:`);
      console.log(`   Current DB: $${order.totalRefunds}`);
      
      try {
        const url = `https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${order.id}/refunds.json`;
        
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': store.accessToken,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.log(`   ❌ API call failed: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        
        if (data.refunds && data.refunds.length > 0) {
          let transactions = 0;
          let shippingFromField = 0;
          let shippingFromAdjustments = 0;
          let taxAdjustments = 0;
          
          data.refunds.forEach(refund => {
            // Count transactions
            if (refund.transactions) {
              refund.transactions.forEach(tx => {
                if (tx.kind === 'refund' || tx.kind === 'void') {
                  transactions += parseFloat(tx.amount || '0');
                }
              });
            }
            
            // Check shipping field
            if (refund.shipping && parseFloat(refund.shipping.amount || '0') > 0) {
              shippingFromField += parseFloat(refund.shipping.amount);
            }
            
            // Check adjustments
            if (refund.order_adjustments) {
              refund.order_adjustments.forEach(adj => {
                const amount = parseFloat(adj.amount || '0');
                if (adj.kind === 'shipping_refund') {
                  shippingFromAdjustments += Math.abs(amount);
                } else if (adj.kind === 'tax_adjustment') {
                  taxAdjustments += Math.abs(amount);
                }
              });
            }
          });
          
          const totalShipping = shippingFromField + shippingFromAdjustments;
          const newTotal = transactions + totalShipping + taxAdjustments;
          
          console.log(`   💳 Transactions: $${transactions.toFixed(2)}`);
          console.log(`   🚚 Shipping (field): $${shippingFromField.toFixed(2)}`);
          console.log(`   🚚 Shipping (adjustments): $${shippingFromAdjustments.toFixed(2)}`);
          console.log(`   🏛️  Tax adjustments: $${taxAdjustments.toFixed(2)}`);
          console.log(`   🧮 NEW TOTAL: $${newTotal.toFixed(2)}`);
          console.log(`   📈 Difference: $${(newTotal - order.totalRefunds).toFixed(2)}`);
          
          totalCurrent += order.totalRefunds;
          totalNew += newTotal;
          totalShippingFound += totalShipping;
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log(`\n📊 SUMMARY FOR TEST ORDERS:`);
    console.log(`   Current total: $${totalCurrent.toFixed(2)}`);
    console.log(`   New total: $${totalNew.toFixed(2)}`);
    console.log(`   Improvement: $${(totalNew - totalCurrent).toFixed(2)}`);
    console.log(`   Shipping found: $${totalShippingFound.toFixed(2)}`);
    
    // Project to full dataset
    if (testOrders.length > 0) {
      const avgImprovement = (totalNew - totalCurrent) / testOrders.length;
      const ordersWithRefunds = 16; // We know this from previous analysis
      
      const projectedImpact = avgImprovement * ordersWithRefunds;
      const projectedTotal = 1078.72 + projectedImpact; // Current 30-day total
      
      console.log(`\n🎯 PROJECTION:`);
      console.log(`   Average improvement per order: $${avgImprovement.toFixed(2)}`);
      console.log(`   Projected impact: $${projectedImpact.toFixed(2)}`);
      console.log(`   Projected 30-day total: $${projectedTotal.toFixed(2)}`);
      console.log(`   Target: $1,514.88`);
      console.log(`   Remaining gap: $${(1514.88 - projectedTotal).toFixed(2)}`);
      console.log(`   Accuracy: ${((projectedTotal / 1514.88) * 100).toFixed(1)}%`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testShippingRefundsFix(); 