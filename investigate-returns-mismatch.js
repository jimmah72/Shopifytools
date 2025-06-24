const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateReturnsMismatch() {
  try {
    console.log('🔍 INVESTIGATING RETURNS/REFUNDS MISMATCH');
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
    
    console.log('📅 Analyzing returns for date range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
    
    // Get current refunds data
    const refundsData = await prisma.shopifyOrder.aggregate({
      where: {
        storeId: store.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        totalRefunds: true
      },
      _count: {
        id: true
      }
    });
    
    // Get orders with refunds breakdown
    const ordersWithRefunds = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        totalRefunds: {
          gt: 0
        }
      },
      select: {
        orderName: true,
        totalPrice: true,
        totalRefunds: true,
        financialStatus: true,
        createdAt: true
      },
      orderBy: {
        totalRefunds: 'desc'
      }
    });
    
    // Get orders with refunded/partially_refunded status but $0 refunds
    const refundedStatusZeroAmount = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        OR: [
          { financialStatus: 'refunded' },
          { financialStatus: 'partially_refunded' }
        ],
        totalRefunds: 0
      },
      select: {
        orderName: true,
        totalPrice: true,
        totalRefunds: true,
        financialStatus: true,
        createdAt: true
      }
    });
    
    // Get total refunds by financial status
    const refundsByStatus = await prisma.shopifyOrder.groupBy({
      by: ['financialStatus'],
      where: {
        storeId: store.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        totalRefunds: true
      },
      _count: {
        id: true
      }
    });
    
    console.log('\n📊 RETURNS/REFUNDS ANALYSIS:');
    console.log('='.repeat(50));
    
    console.log('\n1️⃣ SHOPIFY ANALYTICS (from image):');
    console.log('   Returns: -$1,260.16');
    console.log('   (This appears in the "Total sales breakdown" section)');
    
    console.log('\n2️⃣ YOUR DATABASE:');
    console.log('   Total Refunds: $' + (refundsData._sum.totalRefunds || 0).toFixed(2));
    console.log('   Orders with refunds: ' + ordersWithRefunds.length);
    console.log('   Total orders: ' + refundsData._count.id);
    
    console.log('\n3️⃣ MISSING RETURNS:');
    const missingReturns = 1260.16 - (refundsData._sum.totalRefunds || 0);
    console.log('   Missing amount: $' + missingReturns.toFixed(2));
    console.log('   Percentage missing: ' + ((missingReturns / 1260.16) * 100).toFixed(1) + '%');
    
    console.log('\n4️⃣ REFUNDS BY FINANCIAL STATUS:');
    console.log('='.repeat(30));
    refundsByStatus.forEach(status => {
      console.log(`   ${status.financialStatus || 'null'}: ${status._count.id} orders, $${(status._sum.totalRefunds || 0).toFixed(2)} refunds`);
    });
    
    console.log('\n5️⃣ ORDERS WITH ACTUAL REFUNDS (Top 10):');
    console.log('='.repeat(40));
    ordersWithRefunds.slice(0, 10).forEach(order => {
      console.log(`   ${order.orderName} - $${order.totalPrice} (refunded: $${order.totalRefunds}) - ${order.financialStatus} - ${order.createdAt.toISOString().split('T')[0]}`);
    });
    
    if (ordersWithRefunds.length > 10) {
      console.log(`   ... and ${ordersWithRefunds.length - 10} more orders with refunds`);
    }
    
    console.log('\n6️⃣ PROBLEM ORDERS (Refunded status but $0 refunds):');
    console.log('='.repeat(50));
    console.log('   Count: ' + refundedStatusZeroAmount.length);
    
    if (refundedStatusZeroAmount.length > 0) {
      console.log('   These orders should have refund amounts but show $0:');
      refundedStatusZeroAmount.slice(0, 10).forEach(order => {
        console.log(`     ${order.orderName} - $${order.totalPrice} - ${order.financialStatus} - ${order.createdAt.toISOString().split('T')[0]}`);
      });
      
      if (refundedStatusZeroAmount.length > 10) {
        console.log(`     ... and ${refundedStatusZeroAmount.length - 10} more problematic orders`);
      }
      
      // Calculate potential missing refunds if we fix these orders
      const potentialRecoveredRefunds = refundedStatusZeroAmount.reduce((sum, order) => sum + order.totalPrice, 0);
      console.log(`\n   💡 If all these orders were fully refunded, that would be: $${potentialRecoveredRefunds.toFixed(2)}`);
      console.log(`   📊 This could explain ${((potentialRecoveredRefunds / missingReturns) * 100).toFixed(1)}% of the missing returns`);
    }
    
    console.log('\n7️⃣ LIKELY CAUSES:');
    console.log('='.repeat(30));
    console.log('   1. Orders marked as "refunded" but missing actual refund amounts');
    console.log('   2. Partial refunds not being captured correctly');
    console.log('   3. Different types of returns (exchanges, store credit, etc.)');
    console.log('   4. Shopify Analytics might include returns that haven\'t been processed yet');
    console.log('   5. Time zone differences in data capture');
    console.log('   6. Refunds processed but not synced to the database');
    
    console.log('\n8️⃣ RECOMMENDATIONS:');
    console.log('='.repeat(30));
    console.log('   1. ⚠️  CRITICAL: Fix orders with refunded status but $0 amounts');
    console.log('   2. Run a refunds backfill process for the 30-day period');
    console.log('   3. Verify refunds sync process is working correctly');
    console.log('   4. Check if there are pending refunds not yet processed');
    console.log('   5. Compare with Shopify Admin panel refunds section');
    
    if (refundedStatusZeroAmount.length > 0) {
      console.log('\n🚨 IMMEDIATE ACTION NEEDED:');
      console.log(`   You have ${refundedStatusZeroAmount.length} orders marked as refunded but with $0 refund amounts.`);
      console.log('   This is likely the main cause of the $' + missingReturns.toFixed(2) + ' discrepancy.');
      console.log('   Run a refunds backfill script to fetch actual refund amounts from Shopify API.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

investigateReturnsMismatch(); 