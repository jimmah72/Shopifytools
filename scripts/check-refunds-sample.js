#!/usr/bin/env node

/**
 * Check Sample Orders for Refunds
 * 
 * This script checks a few sample orders to see if any have refunds
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSampleRefunds() {
  console.log('🔍 Checking sample orders for refunds...');
  
  try {
    // Get the first store
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });

    if (!store) {
      console.error('❌ No store found in database');
      return;
    }

    // Get 10 sample orders to check
    const sampleOrders = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        totalRefunds: 0 // Orders that haven't been checked yet
      },
      select: { 
        id: true, 
        orderName: true, 
        totalPrice: true, 
        financialStatus: true,
        totalRefunds: true
      },
      take: 10
    });

    console.log(`📊 Checking ${sampleOrders.length} sample orders:`);
    
    for (const order of sampleOrders) {
      console.log(`   📄 Order ${order.orderName}: $${order.totalPrice}, Status: ${order.financialStatus}, Refunds: $${order.totalRefunds}`);
    }

    // Check if any orders have financial_status indicating refunds
    const potentialRefundOrders = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        OR: [
          { financialStatus: 'refunded' },
          { financialStatus: 'partially_refunded' }
        ]
      },
      select: { 
        id: true, 
        orderName: true, 
        totalPrice: true, 
        financialStatus: true,
        totalRefunds: true
      },
      take: 5
    });

    if (potentialRefundOrders.length > 0) {
      console.log(`\n🔍 Found ${potentialRefundOrders.length} orders with refund status:`);
      for (const order of potentialRefundOrders) {
        console.log(`   💰 Order ${order.orderName}: $${order.totalPrice}, Status: ${order.financialStatus}, Refunds: $${order.totalRefunds}`);
      }
    } else {
      console.log('\n✅ No orders with refunded status found - this store may not have many refunds');
    }

    // Check total counts
    const totalOrders = await prisma.shopifyOrder.count({
      where: { storeId: store.id }
    });

    const ordersWithRefunds = await prisma.shopifyOrder.count({
      where: { 
        storeId: store.id,
        totalRefunds: { gt: 0 }
      }
    });

    console.log(`\n📈 Summary:`);
    console.log(`   📊 Total orders: ${totalOrders}`);
    console.log(`   💸 Orders with refunds: ${ordersWithRefunds}`);
    console.log(`   📊 Refund rate: ${totalOrders > 0 ? ((ordersWithRefunds / totalOrders) * 100).toFixed(2) : 0}%`);

  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkSampleRefunds(); 