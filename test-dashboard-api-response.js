const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDashboardApiResponse() {
  try {
    console.log('🔍 Testing dashboard API response...');
    
    // Get store
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true }
    });
    
    if (!store) {
      console.log('❌ No store found');
      return;
    }
    
    // Calculate 30-day timeframe (exact same logic as dashboard API)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    const dateFilter = {
      storeId: store.id,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };
    
    console.log('📅 Date filter:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
    
    // Execute the EXACT same query as the dashboard API
    const orderMetrics = await prisma.shopifyOrder.aggregate({
      where: dateFilter,
      _count: { id: true },
      _sum: {
        totalPrice: true,
        totalShipping: true,
        totalTax: true,
        totalDiscounts: true,
        totalRefunds: true
      }
    });
    
    console.log('\n📊 RAW DATABASE RESULTS:');
    console.log('   _count.id:', orderMetrics._count.id);
    console.log('   _sum.totalPrice:', orderMetrics._sum.totalPrice);
    console.log('   _sum.totalRefunds:', orderMetrics._sum.totalRefunds);
    console.log('   _sum.totalDiscounts:', orderMetrics._sum.totalDiscounts);
    
    // Apply the exact same calculations as dashboard API
    const totalOrders = orderMetrics._count.id;
    const totalRevenue = orderMetrics._sum.totalPrice || 0;
    const totalRefunds = orderMetrics._sum.totalRefunds || 0;
    const totalDiscounts = orderMetrics._sum.totalDiscounts || 0;
    
    console.log('\n🧮 DASHBOARD API CALCULATIONS:');
    console.log('   totalOrders:', totalOrders);
    console.log('   totalRevenue:', totalRevenue);
    console.log('   totalRefunds:', totalRefunds);
    console.log('   totalDiscounts:', totalDiscounts);
    
    // Now test what happens when this gets to the frontend
    const mockMetrics = {
      totalSales: totalRevenue,
      totalOrders,
      totalRevenue,
      totalRefunds,
      totalDiscounts
    };
    
    console.log('\n📱 FRONTEND WILL RECEIVE:');
    console.log('   metrics.totalRefunds:', mockMetrics.totalRefunds);
    console.log('   formatCurrency(totalRefunds):', '$' + mockMetrics.totalRefunds.toFixed(2));
    
    // Check if there are any type issues
    console.log('\n🔬 TYPE ANALYSIS:');
    console.log('   typeof totalRefunds:', typeof totalRefunds);
    console.log('   totalRefunds === 0:', totalRefunds === 0);
    console.log('   totalRefunds == 0:', totalRefunds == 0);
    console.log('   totalRefunds || 0:', totalRefunds || 0);
    
    // Get the actual orders with refunds to verify
    const ordersWithActualRefunds = await prisma.shopifyOrder.findMany({
      where: {
        ...dateFilter,
        totalRefunds: { gt: 0 }
      },
      select: {
        orderName: true,
        totalRefunds: true
      }
    });
    
    console.log('\n✅ VERIFICATION - Orders with refunds:');
    let verificationTotal = 0;
    ordersWithActualRefunds.forEach(order => {
      console.log(`   ${order.orderName}: $${order.totalRefunds}`);
      verificationTotal += order.totalRefunds;
    });
    console.log(`   Verification total: $${verificationTotal.toFixed(2)}`);
    
    if (Math.abs(verificationTotal - totalRefunds) > 0.01) {
      console.log('❌ MISMATCH: Aggregate query result differs from manual sum!');
    } else {
      console.log('✅ VERIFIED: Aggregate query matches manual sum');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDashboardApiResponse(); 