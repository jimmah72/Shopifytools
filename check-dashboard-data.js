const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDashboardData() {
  try {
    console.log('📊 Checking dashboard data directly from database...');
    
    // Get store
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true }
    });
    
    if (!store) {
      console.log('❌ No store found');
      return;
    }
    
    console.log('🏪 Store:', store.domain);
    
    // Calculate 30-day timeframe (same as dashboard API)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    console.log('📅 Date range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
    
    // Get order metrics
    const orderMetrics = await prisma.shopifyOrder.aggregate({
      where: {
        storeId: store.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: { id: true },
      _sum: {
        totalPrice: true,
        totalShipping: true,
        totalTax: true,
        totalDiscounts: true,
        totalRefunds: true
      }
    });
    
    // Get total items
    const totalItemsData = await prisma.shopifyLineItem.aggregate({
      where: {
        order: {
          storeId: store.id,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      },
      _sum: {
        quantity: true
      }
    });
    
    console.log('\n📊 DATABASE METRICS (30 days):');
    console.log('='.repeat(50));
    console.log('Total Orders:', (orderMetrics._count.id || 0).toLocaleString());
    console.log('Total Revenue:', '$' + (orderMetrics._sum.totalPrice || 0).toFixed(2));
    console.log('Total Items:', (totalItemsData._sum.quantity || 0).toLocaleString());
    console.log('Shipping Revenue:', '$' + (orderMetrics._sum.totalShipping || 0).toFixed(2));
    console.log('Total Taxes:', '$' + (orderMetrics._sum.totalTax || 0).toFixed(2));
    console.log('Total Discounts:', '$' + (orderMetrics._sum.totalDiscounts || 0).toFixed(2));
    console.log('Total Refunds:', '$' + (orderMetrics._sum.totalRefunds || 0).toFixed(2));
    
    const avgOrderValue = orderMetrics._count.id > 0 ? (orderMetrics._sum.totalPrice || 0) / orderMetrics._count.id : 0;
    console.log('Avg Order Value:', '$' + avgOrderValue.toFixed(2));
    
    console.log('\n🔍 COMPARISON WITH SHOPIFY ANALYTICS:');
    console.log('='.repeat(50));
    console.log('Shopify Gross Sales: $196,793.89');
    console.log('Your Total Revenue:  $' + (orderMetrics._sum.totalPrice || 0).toFixed(2));
    console.log('Difference:          $' + ((orderMetrics._sum.totalPrice || 0) - 196793.89).toFixed(2));
    console.log('');
    console.log('Shopify Orders:      3,158');
    console.log('Your Orders:         ' + (orderMetrics._count.id || 0).toLocaleString());
    console.log('Difference:          ' + ((orderMetrics._count.id || 0) - 3158));
    console.log('');
    console.log('Shopify Total Sales: $208,166.39');
    console.log('Your Revenue + Shipping: $' + ((orderMetrics._sum.totalPrice || 0) + (orderMetrics._sum.totalShipping || 0)).toFixed(2));
    console.log('Difference:          $' + (((orderMetrics._sum.totalPrice || 0) + (orderMetrics._sum.totalShipping || 0)) - 208166.39).toFixed(2));
    
    // Check for recent orders to verify sync
    const recentOrders = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        orderName: true,
        createdAt: true,
        totalPrice: true,
        lastSyncedAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log('\n📋 RECENT ORDERS (last 5):');
    console.log('='.repeat(50));
    recentOrders.forEach(order => {
      console.log(`${order.orderName} - $${order.totalPrice} - ${order.createdAt.toISOString().split('T')[0]} - Synced: ${order.lastSyncedAt ? order.lastSyncedAt.toISOString().split('T')[0] : 'Never'}`);
    });
    
    // Check if there's a significant difference that suggests data sync issues
    const revenueDiff = Math.abs((orderMetrics._sum.totalPrice || 0) - 196793.89);
    const ordersDiff = Math.abs((orderMetrics._count.id || 0) - 3158);
    
    console.log('\n🔍 ANALYSIS:');
    console.log('='.repeat(50));
    
    if (revenueDiff > 5000 || ordersDiff > 100) {
      console.log('⚠️  SIGNIFICANT DIFFERENCES FOUND:');
      if (revenueDiff > 5000) {
        console.log('- Revenue differs by more than $5,000');
      }
      if (ordersDiff > 100) {
        console.log('- Order count differs by more than 100 orders');
      }
      console.log('\nPossible causes:');
      console.log('1. Data sync incomplete or outdated');
      console.log('2. Different timezone handling');
      console.log('3. Different order status filtering (test vs live orders)');
      console.log('4. Draft orders included/excluded differently');
      console.log('5. Date range interpretation differences');
    } else {
      console.log('✅ Data looks reasonably close to Shopify Analytics');
    }
    
    // Check sync status
    const syncStatus = await prisma.syncStatus.findFirst({
      where: {
        storeId: store.id,
        dataType: 'orders'
      }
    });
    
    if (syncStatus) {
      console.log('\n📡 SYNC STATUS:');
      console.log('Last Sync:', syncStatus.lastSyncAt ? syncStatus.lastSyncAt.toISOString() : 'Never');
      console.log('Sync in Progress:', syncStatus.syncInProgress ? 'Yes' : 'No');
      console.log('Timeframe Days:', syncStatus.timeframeDays || 'Unknown');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDashboardData(); 