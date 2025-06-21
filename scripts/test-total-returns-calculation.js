#!/usr/bin/env node

/**
 * Test Total Returns Calculation
 * 
 * Test the updated approach targeting Shopify's "Total returns" ($1,514.88)
 * instead of just "Net returns" ($1,280.16)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTotalReturnsCalculation() {
  console.log('🎯 Testing TOTAL RETURNS calculation approach...');
  console.log('Target: $1,514.88 (Shopify Analytics "Total returns")');
  console.log('Components: Gross returns + Shipping returned + Taxes returned + Return fees');
  
  try {
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });
    
    if (!store) {
      console.log('❌ No store found');
      return;
    }
    
    // Get current 30-day refunds total
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const currentTotal = await prisma.shopifyOrder.aggregate({
      where: {
        storeId: store.id,
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: { totalRefunds: true }
    });
    
    console.log(`📊 Current 30-day refunds in DB: $${(currentTotal._sum.totalRefunds || 0).toFixed(2)}`);
    console.log(`🎯 Shopify Analytics Total Returns: $1,514.88`);
    console.log(`📈 Gap to close: $${(1514.88 - (currentTotal._sum.totalRefunds || 0)).toFixed(2)}`);
    
    // Test new calculation on sample orders
    const testOrders = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        createdAt: { gte: thirtyDaysAgo },
        totalRefunds: { gt: 0 }
      },
      select: { 
        id: true, 
        orderName: true, 
        totalRefunds: true 
      },
      take: 8
    });
    
    console.log(`\n🧪 Testing new TOTAL RETURNS approach on ${testOrders.length} orders:`);
    
    const shopDomain = store.domain.replace('.myshopify.com', '');
    let oldMethodTotal = 0;
    let newMethodTotal = 0;
    
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
          let shipping = 0;
          let taxes = 0;
          let otherAdjustments = 0;
          
          data.refunds.forEach(refund => {
            // Count transactions (current method)
            if (refund.transactions) {
              refund.transactions.forEach(tx => {
                if (tx.kind === 'refund' || tx.kind === 'void') {
                  transactions += parseFloat(tx.amount || '0');
                }
              });
            }
            
            // Count shipping refunds
            if (refund.shipping && parseFloat(refund.shipping.amount || '0') > 0) {
              shipping += parseFloat(refund.shipping.amount);
            }
            
            // Count tax and other adjustments
            if (refund.order_adjustments) {
              refund.order_adjustments.forEach(adj => {
                const amount = parseFloat(adj.amount || '0');
                if (adj.kind === 'tax_adjustment') {
                  taxes += Math.abs(amount);
                } else if (adj.kind === 'shipping_refund' || 
                          adj.kind === 'return_fee' ||
                          (adj.kind === 'refund_discrepancy' && amount > 0)) {
                  otherAdjustments += Math.abs(amount);
                }
              });
            }
          });
          
          const totalRefunds = transactions + shipping + taxes + otherAdjustments;
          
          console.log(`   💳 Transactions: $${transactions.toFixed(2)}`);
          console.log(`   🚚 Shipping: $${shipping.toFixed(2)}`);
          console.log(`   🏛️  Taxes: $${taxes.toFixed(2)}`);
          console.log(`   ⚖️  Other adjustments: $${otherAdjustments.toFixed(2)}`);
          console.log(`   🧮 NEW TOTAL: $${totalRefunds.toFixed(2)}`);
          console.log(`   📊 vs Current DB: $${order.totalRefunds.toFixed(2)}`);
          console.log(`   📈 Difference: $${(totalRefunds - order.totalRefunds).toFixed(2)}`);
          
          oldMethodTotal += order.totalRefunds;
          newMethodTotal += totalRefunds;
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log(`\n📊 SUMMARY FOR TEST ORDERS:`);
    console.log(`   Old method total: $${oldMethodTotal.toFixed(2)}`);
    console.log(`   New method total: $${newMethodTotal.toFixed(2)}`);
    console.log(`   Improvement: $${(newMethodTotal - oldMethodTotal).toFixed(2)}`);
    
    // Project impact on full 30-day total
    if (testOrders.length > 0) {
      const avgImprovement = (newMethodTotal - oldMethodTotal) / testOrders.length;
      const ordersWithRefunds = await prisma.shopifyOrder.count({
        where: {
          storeId: store.id,
          createdAt: { gte: thirtyDaysAgo },
          totalRefunds: { gt: 0 }
        }
      });
      
      const projectedImpact = avgImprovement * ordersWithRefunds;
      const projectedTotal = (currentTotal._sum.totalRefunds || 0) + projectedImpact;
      const remainingGap = 1514.88 - projectedTotal;
      
      console.log(`\n🎯 PROJECTION TO TOTAL RETURNS TARGET:`);
      console.log(`   Orders with refunds in 30 days: ${ordersWithRefunds}`);
      console.log(`   Average improvement per order: $${avgImprovement.toFixed(2)}`);
      console.log(`   Projected impact: $${projectedImpact.toFixed(2)}`);
      console.log(`   Current total: $${(currentTotal._sum.totalRefunds || 0).toFixed(2)}`);
      console.log(`   Projected new total: $${projectedTotal.toFixed(2)}`);
      console.log(`   Target (Total returns): $1,514.88`);
      console.log(`   Remaining gap: $${remainingGap.toFixed(2)}`);
      console.log(`   Accuracy: ${((projectedTotal / 1514.88) * 100).toFixed(1)}%`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTotalReturnsCalculation(); 