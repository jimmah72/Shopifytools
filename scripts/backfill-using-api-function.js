#!/usr/bin/env node

/**
 * Backfill Using API Function
 * 
 * Use the actual getOrderRefunds function from our API to update all orders
 */

const { PrismaClient } = require('@prisma/client');
const { getOrderRefunds } = require('../src/lib/shopify-api.ts');

const prisma = new PrismaClient();

async function backfillUsingAPIFunction() {
  console.log('🚀 Backfilling using actual getOrderRefunds API function...');
  console.log('This will use the corrected logic with shipping refunds');
  
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
        // Use the actual API function with our corrected logic
        const newTotalRefunds = await getOrderRefunds(shopDomain, store.accessToken, order.id);
        
        console.log(`   🧮 API calculated: $${newTotalRefunds.toFixed(2)}`);
        
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
    }
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backfillUsingAPIFunction(); 