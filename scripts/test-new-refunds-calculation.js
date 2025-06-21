#!/usr/bin/env node

/**
 * Test New Refunds Calculation
 * 
 * Test the updated refunds calculation to see if it gets us closer to Shopify Analytics
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNewRefundsCalculation() {
  console.log('🧪 Testing new refunds calculation approach...');
  
  try {
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });
    
    if (!store) {
      console.log('❌ No store found');
      return;
    }
    
    // Get current 30-day refunds total from DB
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const currentTotal = await prisma.shopifyOrder.aggregate({
      where: {
        storeId: store.id,
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: { totalRefunds: true },
      _count: { id: true }
    });
    
    console.log(`📊 Current 30-day refunds in DB: $${(currentTotal._sum.totalRefunds || 0).toFixed(2)}`);
    console.log(`📊 Orders in timeframe: ${currentTotal._count.id}`);
    
    // Test new calculation on a few orders
    const testOrders = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        createdAt: { gte: thirtyDaysAgo },
        OR: [
          { financialStatus: 'refunded' },
          { financialStatus: 'partially_refunded' },
          { totalRefunds: { gt: 0 } }
        ]
      },
      select: { 
        id: true, 
        orderName: true, 
        totalRefunds: true, 
        financialStatus: true 
      },
      take: 10
    });
    
    console.log(`\n🔬 Testing new calculation on ${testOrders.length} orders:`);
    
    const shopDomain = store.domain.replace('.myshopify.com', '');
    let totalOldMethod = 0;
    let totalNewMethod = 0;
    
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
          // Old method (transactions only)
          let oldMethodTotal = 0;
          
          // New method (line items + shipping + positive adjustments)
          let newMethodTotal = 0;
          
          data.refunds.forEach(refund => {
            // Old method: just transactions
            if (refund.transactions) {
              refund.transactions.forEach(tx => {
                if (tx.kind === 'refund' || tx.kind === 'void' || 
                    (tx.status === 'success' && parseFloat(tx.amount || '0') > 0)) {
                  oldMethodTotal += parseFloat(tx.amount || '0');
                }
              });
            }
            
            // New method: line items + shipping + positive adjustments
            // 1. Line items
            if (refund.refund_line_items) {
              refund.refund_line_items.forEach(item => {
                newMethodTotal += parseFloat(item.subtotal || '0');
              });
            }
            
            // 2. Shipping refunds
            if (refund.shipping && parseFloat(refund.shipping.amount || '0') > 0) {
              newMethodTotal += parseFloat(refund.shipping.amount);
            }
            
            // 3. Positive order adjustments
            if (refund.order_adjustments) {
              refund.order_adjustments.forEach(adj => {
                const amount = parseFloat(adj.amount || '0');
                if (amount > 0) {
                  newMethodTotal += amount;
                }
              });
            }
          });
          
          console.log(`   Old method: $${oldMethodTotal.toFixed(2)}`);
          console.log(`   New method: $${newMethodTotal.toFixed(2)}`);
          console.log(`   Difference: $${(newMethodTotal - oldMethodTotal).toFixed(2)}`);
          
          totalOldMethod += oldMethodTotal;
          totalNewMethod += newMethodTotal;
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log(`\n📊 TOTALS FOR TEST ORDERS:`);
    console.log(`   Old method total: $${totalOldMethod.toFixed(2)}`);
    console.log(`   New method total: $${totalNewMethod.toFixed(2)}`);
    console.log(`   Difference: $${(totalNewMethod - totalOldMethod).toFixed(2)}`);
    
    // Estimate impact on 30-day total
    if (testOrders.length > 0) {
      const avgDifference = (totalNewMethod - totalOldMethod) / testOrders.length;
      const ordersWithRefunds = await prisma.shopifyOrder.count({
        where: {
          storeId: store.id,
          createdAt: { gte: thirtyDaysAgo },
          totalRefunds: { gt: 0 }
        }
      });
      
      const estimatedImpact = avgDifference * ordersWithRefunds;
      const projectedTotal = (currentTotal._sum.totalRefunds || 0) + estimatedImpact;
      
      console.log(`\n🎯 PROJECTION:`);
      console.log(`   Orders with refunds in 30 days: ${ordersWithRefunds}`);
      console.log(`   Average difference per order: $${avgDifference.toFixed(2)}`);
      console.log(`   Estimated impact: $${estimatedImpact.toFixed(2)}`);
      console.log(`   Projected new 30-day total: $${projectedTotal.toFixed(2)}`);
      console.log(`   Target (Shopify Analytics): $1,280.16`);
      console.log(`   Remaining gap: $${(1280.16 - projectedTotal).toFixed(2)}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewRefundsCalculation(); 