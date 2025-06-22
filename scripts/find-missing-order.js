#!/usr/bin/env node

const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMissingOrder() {
  console.log('🔍 Finding missing order in 30-day timeframe...');
  
  try {
    // Calculate 30-day date range (same logic as sync status API)
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - 30);
    
    console.log(`📅 Date range: ${startDate.toISOString()} to ${now.toISOString()}`);
    
    // Get store info
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });
    
    if (!store) {
      throw new Error('No store found');
    }
    
    // Get orders from database in the 30-day timeframe
    const dbOrders = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        createdAt: {
          gte: startDate,
          lte: now
        }
      },
      select: {
        id: true,
        orderName: true,
        createdAt: true,
        totalPrice: true,
        lastSyncedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`💾 Database orders in timeframe: ${dbOrders.length}`);
    
    // Show recent orders
    console.log('\n📋 Recent orders in database:');
    dbOrders.slice(0, 10).forEach(order => {
      console.log(`  ${order.orderName} (ID: ${order.id}) - Created: ${order.createdAt.toISOString().split('T')[0]} - $${order.totalPrice}`);
    });
    
    // Try to get Shopify orders count with the exact same parameters
    console.log('\n🌐 Checking Shopify API...');
    
    // Import the Shopify API function with correct path
    const { getOrdersCount } = require(path.join(__dirname, '..', 'src', 'lib', 'shopify-api'));
    const { formatShopDomain } = require(path.join(__dirname, '..', 'src', 'lib', 'shopify.config'));
    
    const shopifyOrdersCount = await getOrdersCount(
      formatShopDomain(store.domain), 
      store.accessToken, 
      {
        created_at_min: startDate.toISOString(),
        created_at_max: now.toISOString(),
        status: 'any'
      }
    );
    
    console.log(`🛍️ Shopify orders count in timeframe: ${shopifyOrdersCount}`);
    console.log(`📊 Difference: ${shopifyOrdersCount - dbOrders.length} order(s) missing`);
    
    if (shopifyOrdersCount > dbOrders.length) {
      console.log('\n❌ Missing order(s) detected!');
      console.log('📝 This suggests the sync process is failing to retrieve or save specific order(s)');
      
      // Check if there are any sync errors
      const syncStatus = await prisma.syncStatus.findFirst({
        where: {
          storeId: store.id,
          dataType: 'orders'
        }
      });
      
      if (syncStatus?.errorMessage) {
        console.log(`🚨 Sync error message: ${syncStatus.errorMessage}`);
      } else {
        console.log('🤔 No sync error message found - might be a silent failure');
      }
    } else if (shopifyOrdersCount === dbOrders.length) {
      console.log('\n✅ No missing orders detected - counts match');
    } else {
      console.log('\n🤔 Database has more orders than Shopify reports - possible data inconsistency');
    }
    
  } catch (error) {
    console.error('❌ Error finding missing order:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findMissingOrder(); 