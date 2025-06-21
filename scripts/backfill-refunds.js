#!/usr/bin/env node

/**
 * Backfill Refunds Script
 * 
 * This script fetches refunds data for existing orders that don't have refunds data yet.
 * Run this after adding the totalRefunds field to populate historical data.
 * 
 * Usage: node scripts/backfill-refunds.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function backfillRefunds() {
  console.log('🔄 Starting refunds backfill process...');
  
  try {
    // Get the first store
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });

    if (!store) {
      console.error('❌ No store found in database');
      return;
    }

    // Find orders that don't have refunds data (totalRefunds = 0)
    const ordersNeedingRefunds = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        totalRefunds: 0 // Orders that haven't been updated with refunds data
      },
      select: { id: true },
      take: 100 // Process in batches to avoid overwhelming the API
    });

    console.log(`📊 Found ${ordersNeedingRefunds.length} orders needing refunds data`);

    if (ordersNeedingRefunds.length === 0) {
      console.log('✅ All orders already have refunds data');
      return;
    }

    // Import the refunds function
    const { getOrderRefunds } = require('../src/lib/shopify-api.ts');
    const { formatShopDomain } = require('../src/lib/shopify.config.ts');

    const formattedDomain = formatShopDomain(store.domain);
    let updatedCount = 0;
    let errorCount = 0;

    console.log('🚀 Starting to fetch refunds data...');

    // Process orders one by one to avoid rate limiting
    for (const order of ordersNeedingRefunds) {
      try {
        console.log(`📥 Fetching refunds for order ${order.id}...`);
        
        const totalRefunds = await getOrderRefunds(formattedDomain, store.accessToken, order.id);
        
        // Update the order with refunds data
        await prisma.shopifyOrder.update({
          where: { id: order.id },
          data: { totalRefunds }
        });

        if (totalRefunds > 0) {
          console.log(`   ✅ Order ${order.id}: $${totalRefunds} in refunds`);
        }
        
        updatedCount++;

        // Add a small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`   ❌ Failed to update order ${order.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Backfill Summary:');
    console.log(`   ✅ Successfully updated: ${updatedCount} orders`);
    console.log(`   ❌ Errors: ${errorCount} orders`);
    console.log('\n🎉 Refunds backfill completed!');

  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillRefunds(); 