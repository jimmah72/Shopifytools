#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSyncStatus() {
  console.log('🔍 Checking sync status...');
  
  try {
    const syncStatuses = await prisma.syncStatus.findMany({
      orderBy: { lastSyncAt: 'desc' }
    });
    
    console.log('\n📊 Current Sync Status:');
    syncStatuses.forEach(status => {
      console.log(`\n${status.dataType.toUpperCase()}:`);
      console.log(`  Store ID: ${status.storeId}`);
      console.log(`  In Progress: ${status.syncInProgress}`);
      console.log(`  Last Sync: ${status.lastSyncAt}`);
      console.log(`  Total Records: ${status.totalRecords}`);
      console.log(`  Timeframe Days: ${status.timeframeDays}`);
      console.log(`  Last Heartbeat: ${status.lastHeartbeat}`);
      if (status.errorMessage) {
        console.log(`  ❌ Error: ${status.errorMessage}`);
      }
    });
    
    // Check order counts
    const orderCount = await prisma.shopifyOrder.count();
    console.log(`\n💾 Database Order Count: ${orderCount}`);
    
    // Check if there are any recent orders that might have failed
    const recentOrders = await prisma.shopifyOrder.findMany({
      orderBy: { lastSyncedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderName: true,
        lastSyncedAt: true,
        totalPrice: true,
        financialStatus: true
      }
    });
    
    console.log('\n🔄 Recent Orders:');
    recentOrders.forEach(order => {
      console.log(`  ${order.orderName}: $${order.totalPrice} (${order.financialStatus}) - Last sync: ${order.lastSyncedAt}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking sync status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSyncStatus(); 