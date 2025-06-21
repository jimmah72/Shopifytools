#!/usr/bin/env node

/**
 * Final Refunds Backfill
 * 
 * Backfill with the corrected logic embedded directly
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getOrderRefundsWithShipping(shopDomain, accessToken, orderId) {
  try {
    const url = `https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${orderId}/refunds.json`;
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    let totalRefunds = 0;
    
    if (data.refunds && data.refunds.length > 0) {
      data.refunds.forEach((refund) => {
        // 1. Add transaction refunds (gross returns)
        if (refund.transactions && refund.transactions.length > 0) {
          refund.transactions.forEach((transaction) => {
            if (transaction.kind === 'refund' || transaction.kind === 'void') {
              const amount = parseFloat(transaction.amount || '0');
              totalRefunds += amount;
              console.log(`     💳 Transaction: $${amount} (${transaction.kind})`);
            }
          });
        }
        
        // 2. Add shipping refunds (from shipping field)
        if (refund.shipping && parseFloat(refund.shipping.amount || '0') > 0) {
          const shippingAmount = parseFloat(refund.shipping.amount);
          totalRefunds += shippingAmount;
          console.log(`     🚚 Shipping: $${shippingAmount}`);
        }
        
        // 3. Add order adjustments for taxes, fees, and shipping
        if (refund.order_adjustments && refund.order_adjustments.length > 0) {
          refund.order_adjustments.forEach((adjustment) => {
            const amount = parseFloat(adjustment.amount || '0');
            if (adjustment.kind === 'tax_adjustment' || 
                adjustment.kind === 'return_fee' ||
                adjustment.kind === 'shipping_refund') {
              totalRefunds += Math.abs(amount);
              console.log(`     ⚖️  ${adjustment.kind}: $${Math.abs(amount)}`);
            }
          });
        }
      });
    }
    
    return totalRefunds;
    
  } catch (error) {
    console.error(`Error fetching refunds for order ${orderId}:`, error.message);
    return 0;
  }
}

async function finalRefundsBackfill() {
  console.log('🚀 Final refunds backfill with shipping refunds...');
  console.log('Target: $1,514.88 (Shopify Analytics Total Returns)');
  
  try {
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });
    
    if (!store) {
      console.log('❌ No store found');
      return;
    }
    
    // Get all orders that might have refunds  
    const ordersToUpdate = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
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
      orderBy: { orderName: 'desc' }
    });
    
    console.log(`📊 Found ${ordersToUpdate.length} orders to update`);
    
    const shopDomain = store.domain.replace('.myshopify.com', '');
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalRefundsFound = 0;
    let totalImprovement = 0;
    let errors = 0;
    
    for (const order of ordersToUpdate) {
      totalProcessed++;
      console.log(`\n📄 [${totalProcessed}/${ordersToUpdate.length}] ${order.orderName}`);
      console.log(`   Current DB: $${order.totalRefunds}`);
      
      try {
        // Use our corrected logic with shipping refunds
        const newTotalRefunds = await getOrderRefundsWithShipping(shopDomain, store.accessToken, order.id);
        
        console.log(`   🧮 Calculated: $${newTotalRefunds.toFixed(2)}`);
        
        // Update the database if the amount changed
        if (Math.abs(newTotalRefunds - order.totalRefunds) > 0.01) {
          await prisma.shopifyOrder.update({
            where: { id: order.id },
            data: { totalRefunds: newTotalRefunds }
          });
          
          const improvement = newTotalRefunds - order.totalRefunds;
          console.log(`   ✅ Updated: $${order.totalRefunds} → $${newTotalRefunds.toFixed(2)} (+$${improvement.toFixed(2)})`);
          totalUpdated++;
          totalImprovement += improvement;
        } else {
          console.log(`   ⚪ No change needed`);
        }
        
        totalRefundsFound += newTotalRefunds;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errors++;
      }
    }
    
    console.log(`\n📊 BACKFILL SUMMARY:`);
    console.log(`   📈 Orders processed: ${totalProcessed}`);
    console.log(`   ✅ Orders updated: ${totalUpdated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   💰 Total refunds found: $${totalRefundsFound.toFixed(2)}`);
    console.log(`   📈 Total improvement: $${totalImprovement.toFixed(2)}`);
    
    // Get updated 30-day totals
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const updatedTotal = await prisma.shopifyOrder.aggregate({
      where: {
        storeId: store.id,
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: { totalRefunds: true }
    });
    
    console.log(`\n🎯 FINAL 30-DAY RESULTS:`);
    console.log(`   📊 Updated 30-day total: $${(updatedTotal._sum.totalRefunds || 0).toFixed(2)}`);
    console.log(`   🎯 Target (Total returns): $1,514.88`);
    console.log(`   📈 Gap remaining: $${(1514.88 - (updatedTotal._sum.totalRefunds || 0)).toFixed(2)}`);
    console.log(`   📊 Accuracy: ${(((updatedTotal._sum.totalRefunds || 0) / 1514.88) * 100).toFixed(1)}%`);
    
    if (totalImprovement > 0) {
      console.log(`\n🎉 SUCCESS! Captured an additional $${totalImprovement.toFixed(2)} in refunds!`);
      console.log(`   This brings us much closer to the Shopify Analytics target!`);
    }
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalRefundsBackfill(); 