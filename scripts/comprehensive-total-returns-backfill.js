#!/usr/bin/env node

/**
 * Comprehensive Total Returns Backfill
 * 
 * Update all orders with the corrected total returns calculation:
 * Transactions + Shipping + Tax adjustments + Return fees
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function comprehensiveTotalReturnsBackfill() {
  console.log('🚀 Starting comprehensive Total Returns backfill...');
  console.log('Target: $1,514.88 (Shopify Analytics Total Returns)');
  
  try {
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });
    
    if (!store) {
      console.log('❌ No store found');
      return;
    }
    
    // Get all orders that might have refunds (not just those already showing refunds)
    const ordersToCheck = await prisma.shopifyOrder.findMany({
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
      orderBy: { orderName: 'desc' } // Most recent first
    });
    
    console.log(`📊 Found ${ordersToCheck.length} orders to check/update`);
    
    if (ordersToCheck.length === 0) {
      console.log('✅ No orders need refunds checking');
      return;
    }
    
    const shopDomain = store.domain.replace('.myshopify.com', '');
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalRefundsFound = 0;
    let totalShippingFound = 0;
    let totalTaxFound = 0;
    let errors = 0;
    
    for (const order of ordersToCheck) {
      totalProcessed++;
      console.log(`\n📄 [${totalProcessed}/${ordersToCheck.length}] ${order.orderName} (${order.financialStatus})`);
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
          errors++;
          continue;
        }
        
        const data = await response.json();
        
        let newTotalRefunds = 0;
        let orderShipping = 0;
        let orderTax = 0;
        
        if (data.refunds && data.refunds.length > 0) {
          console.log(`   📊 Found ${data.refunds.length} refund record(s)`);
          
          data.refunds.forEach(refund => {
            // 1. Add transaction refunds (gross returns)
            if (refund.transactions) {
              refund.transactions.forEach(tx => {
                if (tx.kind === 'refund' || tx.kind === 'void') {
                  const amount = parseFloat(tx.amount || '0');
                  newTotalRefunds += amount;
                  console.log(`     💳 Transaction: $${amount} (${tx.kind})`);
                }
              });
            }
            
            // 2. Add shipping refunds
            if (refund.shipping && parseFloat(refund.shipping.amount || '0') > 0) {
              const shippingAmount = parseFloat(refund.shipping.amount);
              newTotalRefunds += shippingAmount;
              orderShipping += shippingAmount;
              console.log(`     🚚 Shipping: $${shippingAmount}`);
            }
            
            // 3. Add tax and return fee adjustments
            if (refund.order_adjustments) {
              refund.order_adjustments.forEach(adj => {
                const amount = parseFloat(adj.amount || '0');
                if (adj.kind === 'tax_adjustment' || adj.kind === 'return_fee') {
                  const adjAmount = Math.abs(amount);
                  newTotalRefunds += adjAmount;
                  if (adj.kind === 'tax_adjustment') {
                    orderTax += adjAmount;
                  }
                  console.log(`     ⚖️  ${adj.kind}: $${adjAmount}`);
                }
              });
            }
          });
          
          console.log(`   🧮 Calculated total: $${newTotalRefunds.toFixed(2)}`);
          
          // Update the database if the amount changed
          if (Math.abs(newTotalRefunds - order.totalRefunds) > 0.01) {
            await prisma.shopifyOrder.update({
              where: { id: order.id },
              data: { totalRefunds: newTotalRefunds }
            });
            
            console.log(`   ✅ Updated: $${order.totalRefunds} → $${newTotalRefunds.toFixed(2)}`);
            totalUpdated++;
          } else {
            console.log(`   ⚪ No change needed`);
          }
          
          totalRefundsFound += newTotalRefunds;
          totalShippingFound += orderShipping;
          totalTaxFound += orderTax;
          
        } else {
          console.log(`   ⚪ No refund records found`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 250));
        
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
    console.log(`   🚚 Total shipping found: $${totalShippingFound.toFixed(2)}`);
    console.log(`   🏛️  Total tax found: $${totalTaxFound.toFixed(2)}`);
    
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
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

comprehensiveTotalReturnsBackfill(); 