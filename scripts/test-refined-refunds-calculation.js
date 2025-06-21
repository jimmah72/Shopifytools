#!/usr/bin/env node

/**
 * Test Refined Refunds Calculation
 * 
 * Test different combinations to find the right refunds calculation
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRefinedRefundsCalculation() {
  console.log('🔬 Testing refined refunds calculation approaches...');
  
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
    console.log(`🎯 Shopify Analytics target: $1,280.16`);
    console.log(`📈 Gap to close: $${(1280.16 - (currentTotal._sum.totalRefunds || 0)).toFixed(2)}`);
    
    // Test different calculation methods on sample orders
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
      take: 5
    });
    
    console.log(`\n🧪 Testing different approaches on ${testOrders.length} orders:`);
    
    const shopDomain = store.domain.replace('.myshopify.com', '');
    const methods = {
      current: 0,
      transactions_only: 0,
      line_items_only: 0,
      line_items_plus_shipping: 0,
      transactions_plus_adjustments: 0
    };
    
    for (const order of testOrders) {
      console.log(`\n📄 Order ${order.orderName} (Current DB: $${order.totalRefunds}):`);
      
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
          let lineItems = 0;
          let shipping = 0;
          let positiveAdjustments = 0;
          let negativeAdjustments = 0;
          
          data.refunds.forEach(refund => {
            // Count transactions
            if (refund.transactions) {
              refund.transactions.forEach(tx => {
                if (tx.kind === 'refund' || tx.kind === 'void') {
                  transactions += parseFloat(tx.amount || '0');
                }
              });
            }
            
            // Count line items
            if (refund.refund_line_items) {
              refund.refund_line_items.forEach(item => {
                lineItems += parseFloat(item.subtotal || '0');
              });
            }
            
            // Count shipping
            if (refund.shipping && parseFloat(refund.shipping.amount || '0') > 0) {
              shipping += parseFloat(refund.shipping.amount);
            }
            
            // Count adjustments
            if (refund.order_adjustments) {
              refund.order_adjustments.forEach(adj => {
                const amount = parseFloat(adj.amount || '0');
                if (amount > 0) {
                  positiveAdjustments += amount;
                } else if (amount < 0) {
                  negativeAdjustments += Math.abs(amount);
                }
              });
            }
          });
          
          console.log(`   💳 Transactions: $${transactions.toFixed(2)}`);
          console.log(`   📦 Line Items: $${lineItems.toFixed(2)}`);
          console.log(`   🚚 Shipping: $${shipping.toFixed(2)}`);
          console.log(`   ➕ Positive Adjustments: $${positiveAdjustments.toFixed(2)}`);
          console.log(`   ➖ Negative Adjustments: $${negativeAdjustments.toFixed(2)}`);
          
          // Calculate different methods
          methods.current += order.totalRefunds;
          methods.transactions_only += transactions;
          methods.line_items_only += lineItems;
          methods.line_items_plus_shipping += lineItems + shipping;
          methods.transactions_plus_adjustments += transactions + positiveAdjustments;
          
          console.log(`   📊 Current DB: $${order.totalRefunds.toFixed(2)}`);
          console.log(`   📊 Transactions only: $${transactions.toFixed(2)}`);
          console.log(`   📊 Line items only: $${lineItems.toFixed(2)}`);
          console.log(`   📊 Line items + shipping: $${(lineItems + shipping).toFixed(2)}`);
          console.log(`   📊 Transactions + adjustments: $${(transactions + positiveAdjustments).toFixed(2)}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log(`\n🎯 METHOD COMPARISON (for ${testOrders.length} test orders):`);
    Object.entries(methods).forEach(([method, total]) => {
      console.log(`   ${method.replace(/_/g, ' ').toUpperCase()}: $${total.toFixed(2)}`);
    });
    
    // Calculate which method would get us closest to $1,280.16
    const targetGap = 1280.16 - (currentTotal._sum.totalRefunds || 0);
    console.log(`\n📊 To reach $1,280.16, we need to add: $${targetGap.toFixed(2)}`);
    
    if (testOrders.length > 0) {
      const ordersWithRefunds = await prisma.shopifyOrder.count({
        where: {
          storeId: store.id,
          createdAt: { gte: thirtyDaysAgo },
          totalRefunds: { gt: 0 }
        }
      });
      
      console.log(`\n🎯 PROJECTIONS (based on ${ordersWithRefunds} orders with refunds):`);
      
      Object.entries(methods).forEach(([method, total]) => {
        if (method === 'current') return;
        
        const avgDifference = (total - methods.current) / testOrders.length;
        const projectedImpact = avgDifference * ordersWithRefunds;
        const projectedTotal = (currentTotal._sum.totalRefunds || 0) + projectedImpact;
        const gapToTarget = 1280.16 - projectedTotal;
        
        console.log(`   ${method.replace(/_/g, ' ').toUpperCase()}:`);
        console.log(`     Projected total: $${projectedTotal.toFixed(2)}`);
        console.log(`     Gap to target: $${gapToTarget.toFixed(2)}`);
        console.log(`     Distance from target: ${Math.abs(gapToTarget).toFixed(2)}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRefinedRefundsCalculation(); 