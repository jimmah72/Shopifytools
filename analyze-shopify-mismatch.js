const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeShopifyMismatch() {
  try {
    console.log('🔍 ANALYZING SHOPIFY ANALYTICS vs DASHBOARD MISMATCH');
    console.log('='.repeat(60));
    
    // Get store
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true }
    });
    
    if (!store) {
      console.log('❌ No store found');
      return;
    }
    
    // Calculate 30-day timeframe
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    console.log('📅 Analyzing date range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
    
    // Get detailed order metrics
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
    
    // Get breakdown by financial status
    const financialStatusBreakdown = await prisma.shopifyOrder.groupBy({
      by: ['financialStatus'],
      where: {
        storeId: store.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: { id: true },
      _sum: {
        totalPrice: true
      }
    });
    
    // Get test orders (those with email containing 'test' or customer name containing 'test')
    const testOrders = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        OR: [
          { email: { contains: 'test', mode: 'insensitive' } },
          { customerFirstName: { contains: 'test', mode: 'insensitive' } },
          { customerLastName: { contains: 'test', mode: 'insensitive' } },
          { orderName: { contains: 'test', mode: 'insensitive' } }
        ]
      },
      select: {
        orderName: true,
        email: true,
        customerFirstName: true,
        customerLastName: true,
        totalPrice: true,
        financialStatus: true
      }
    });
    
    // Calculate total for test orders
    const testOrdersTotal = testOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    
    console.log('\n📊 DETAILED ANALYSIS:');
    console.log('='.repeat(50));
    
    console.log('\n1️⃣ SHOPIFY ANALYTICS (from your image):');
    console.log('   Gross sales: $196,793.89');
    console.log('   Total sales: $208,166.39');  // This includes shipping, taxes, etc.
    console.log('   Net sales: $186,386.49');    // After discounts and refunds
    console.log('   Orders: 3,158');
    console.log('   Orders fulfilled: 3,484');   // This suggests some orders have multiple fulfillments
    
    console.log('\n2️⃣ YOUR DATABASE (current data):');
    console.log('   Total Revenue (totalPrice): $' + (orderMetrics._sum.totalPrice || 0).toFixed(2));
    console.log('   + Shipping: $' + (orderMetrics._sum.totalShipping || 0).toFixed(2));
    console.log('   + Taxes: $' + (orderMetrics._sum.totalTax || 0).toFixed(2));
    console.log('   - Discounts: $' + (orderMetrics._sum.totalDiscounts || 0).toFixed(2));
    console.log('   - Refunds: $' + (orderMetrics._sum.totalRefunds || 0).toFixed(2));
    console.log('   Orders: ' + (orderMetrics._count.id || 0).toLocaleString());
    
    const calculatedTotalSales = (orderMetrics._sum.totalPrice || 0) + (orderMetrics._sum.totalShipping || 0) + (orderMetrics._sum.totalTax || 0);
    const calculatedNetSales = calculatedTotalSales - (orderMetrics._sum.totalDiscounts || 0) - (orderMetrics._sum.totalRefunds || 0);
    
    console.log('   → Calculated Total Sales: $' + calculatedTotalSales.toFixed(2));
    console.log('   → Calculated Net Sales: $' + calculatedNetSales.toFixed(2));
    
    console.log('\n3️⃣ DIFFERENCES:');
    console.log('   Gross Sales Diff: $' + ((orderMetrics._sum.totalPrice || 0) - 196793.89).toFixed(2));
    console.log('   Total Sales Diff: $' + (calculatedTotalSales - 208166.39).toFixed(2));
    console.log('   Net Sales Diff: $' + (calculatedNetSales - 186386.49).toFixed(2));
    console.log('   Orders Diff: ' + ((orderMetrics._count.id || 0) - 3158));
    
    console.log('\n4️⃣ FINANCIAL STATUS BREAKDOWN:');
    console.log('='.repeat(30));
    financialStatusBreakdown.forEach(status => {
      console.log(`   ${status.financialStatus || 'null'}: ${status._count.id} orders, $${(status._sum.totalPrice || 0).toFixed(2)}`);
    });
    
    console.log('\n5️⃣ TEST ORDERS ANALYSIS:');
    console.log('='.repeat(30));
    console.log('   Test orders found: ' + testOrders.length);
    console.log('   Test orders total: $' + testOrdersTotal.toFixed(2));
    
    if (testOrders.length > 0) {
      console.log('\n   Test orders details:');
      testOrders.slice(0, 10).forEach(order => {
        console.log(`     ${order.orderName} - $${order.totalPrice} - ${order.email || 'no email'} - ${order.financialStatus}`);
      });
      if (testOrders.length > 10) {
        console.log(`     ... and ${testOrders.length - 10} more test orders`);
      }
    }
    
    // Check for recent vs older orders in the timeframe
    const midDate = new Date(startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2);
    
    const recentHalf = await prisma.shopifyOrder.aggregate({
      where: {
        storeId: store.id,
        createdAt: {
          gte: midDate,
          lte: endDate
        }
      },
      _count: { id: true },
      _sum: { totalPrice: true }
    });
    
    const olderHalf = await prisma.shopifyOrder.aggregate({
      where: {
        storeId: store.id,
        createdAt: {
          gte: startDate,
          lt: midDate
        }
      },
      _count: { id: true },
      _sum: { totalPrice: true }
    });
    
    console.log('\n6️⃣ TIMEFRAME DISTRIBUTION:');
    console.log('='.repeat(30));
    console.log(`   Recent half (${midDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}):`);
    console.log(`     Orders: ${recentHalf._count.id}, Revenue: $${(recentHalf._sum.totalPrice || 0).toFixed(2)}`);
    console.log(`   Older half (${startDate.toISOString().split('T')[0]} to ${midDate.toISOString().split('T')[0]}):`);
    console.log(`     Orders: ${olderHalf._count.id}, Revenue: $${(olderHalf._sum.totalPrice || 0).toFixed(2)}`);
    
    console.log('\n7️⃣ LIKELY CAUSES OF MISMATCH:');
    console.log('='.repeat(40));
    
    const revenueDiff = (orderMetrics._sum.totalPrice || 0) - 196793.89;
    const ordersDiff = (orderMetrics._count.id || 0) - 3158;
    
    if (revenueDiff > 0 && ordersDiff < 0) {
      console.log('   🔍 YOUR DATABASE HAS: Higher revenue but fewer orders');
      console.log('   📊 This suggests: Shopify Analytics excludes some high-value orders');
      console.log('   💡 Possible reasons:');
      console.log('      - Test orders are included in your DB but excluded from Analytics');
      console.log('      - Draft orders are counted differently');
      console.log('      - Cancelled orders handling differs');
      console.log('      - Different timezone calculations');
    } else if (revenueDiff > 0 && ordersDiff > 0) {
      console.log('   🔍 YOUR DATABASE HAS: More orders and higher revenue');
      console.log('   📊 This suggests: Your DB includes orders that Analytics excludes');
      console.log('   💡 Possible reasons:');
      console.log('      - Test orders included in DB');
      console.log('      - Different date range interpretation');
      console.log('      - Draft orders counted in DB');
    } else if (revenueDiff < 0) {
      console.log('   🔍 YOUR DATABASE HAS: Lower revenue than Analytics');
      console.log('   📊 This suggests: Missing orders in your DB');
      console.log('   💡 Possible reasons:');
      console.log('      - Incomplete sync');
      console.log('      - API rate limiting during sync');
      console.log('      - Orders created after last sync');
    }
    
    if (testOrdersTotal > Math.abs(revenueDiff)) {
      console.log('\n   🎯 TEST ORDERS IMPACT:');
      console.log(`      Test orders total ($${testOrdersTotal.toFixed(2)}) is larger than the`);
      console.log(`      revenue difference ($${Math.abs(revenueDiff).toFixed(2)})`);
      console.log('      → This suggests test orders are the main cause of the mismatch');
    }
    
    console.log('\n8️⃣ RECOMMENDATIONS:');
    console.log('='.repeat(30));
    console.log('   1. Check if Shopify Analytics excludes test orders by default');
    console.log('   2. Verify timezone settings in both systems');
    console.log('   3. Check if "draft" orders should be included/excluded');
    console.log('   4. Consider filtering test orders from dashboard calculations');
    console.log('   5. Verify the exact date range Shopify Analytics uses');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeShopifyMismatch(); 