const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getOrderRefunds(shopDomain, accessToken, orderId) {
  try {
    const url = `https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${orderId}/refunds.json`;
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    let totalRefunds = 0;

    if (data.refunds && data.refunds.length > 0) {
      data.refunds.forEach((refund) => {
        // Add transaction refunds
        if (refund.transactions && refund.transactions.length > 0) {
          refund.transactions.forEach((transaction) => {
            if (transaction.kind === 'refund' || transaction.kind === 'void') {
              const amount = parseFloat(transaction.amount || '0');
              totalRefunds += amount;
            }
          });
        }
        
        // Add shipping refunds
        if (refund.shipping && parseFloat(refund.shipping.amount || '0') > 0) {
          const shippingAmount = parseFloat(refund.shipping.amount);
          totalRefunds += shippingAmount;
        }
        
        // Add order adjustments for taxes, fees, etc.
        if (refund.order_adjustments && refund.order_adjustments.length > 0) {
          refund.order_adjustments.forEach((adjustment) => {
            const amount = parseFloat(adjustment.amount || '0');
            if (adjustment.kind === 'tax_adjustment' || 
                adjustment.kind === 'return_fee' ||
                adjustment.kind === 'shipping_refund') {
              totalRefunds += Math.abs(amount);
            }
          });
        }
      });
    }
    
    return totalRefunds;
    
  } catch (error) {
    console.error(`Error fetching refunds for order ${orderId}:`, error.message);
    return 0;
  }
}

async function fixMissingRefundsBackfill() {
  try {
    console.log('🚀 FIXING MISSING REFUNDS BACKFILL');
    console.log('='.repeat(60));
    console.log('Target: Fix orders with refunded status but $0 refund amounts');
    
    // Get store
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });
    
    if (!store) {
      console.log('❌ No store found');
      return;
    }
    
    // Calculate 30-day timeframe for context
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    console.log('📅 Working on 30-day period:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
    
    // Get the problematic orders (refunded status but $0 refunds)
    const problematicOrders = await prisma.shopifyOrder.findMany({
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
        id: true,
        orderName: true,
        totalPrice: true,
        financialStatus: true,
        totalRefunds: true
      }
    });
    
    console.log(`\n📊 Found ${problematicOrders.length} problematic orders to fix`);
    
    if (problematicOrders.length === 0) {
      console.log('✅ No problematic orders found - all refunded orders have refund amounts!');
      return;
    }
    
    const shopDomain = store.domain.replace('.myshopify.com', '');
    let totalProcessed = 0;
    let totalFixed = 0;
    let totalRefundsRecovered = 0;
    let errors = 0;
    
    console.log('\n🔧 PROCESSING PROBLEMATIC ORDERS:');
    console.log('='.repeat(50));
    
    for (const order of problematicOrders) {
      totalProcessed++;
      console.log(`\n📄 [${totalProcessed}/${problematicOrders.length}] ${order.orderName}`);
      console.log(`   Status: ${order.financialStatus}, Order Total: $${order.totalPrice}, Current Refunds: $${order.totalRefunds}`);
      
      try {
        // Fetch actual refunds from Shopify API
        const actualRefunds = await getOrderRefunds(shopDomain, store.accessToken, order.id);
        
        console.log(`   🔍 API returned: $${actualRefunds.toFixed(2)}`);
        
        if (actualRefunds > 0) {
          // Update the database with the correct refund amount
          await prisma.shopifyOrder.update({
            where: { id: order.id },
            data: { totalRefunds: actualRefunds }
          });
          
          console.log(`   ✅ FIXED: $0.00 → $${actualRefunds.toFixed(2)}`);
          totalFixed++;
          totalRefundsRecovered += actualRefunds;
        } else {
          console.log(`   ⚠️  No refunds found in API despite ${order.financialStatus} status`);
        }
        
        // Rate limiting - respect Shopify's API limits
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errors++;
      }
    }
    
    console.log('\n📊 BACKFILL SUMMARY:');
    console.log('='.repeat(40));
    console.log(`   📈 Orders processed: ${totalProcessed}`);
    console.log(`   ✅ Orders fixed: ${totalFixed}`);
    console.log(`   💰 Refunds recovered: $${totalRefundsRecovered.toFixed(2)}`);
    console.log(`   ❌ Errors: ${errors}`);
    
    // Get updated 30-day totals
    const updatedRefunds = await prisma.shopifyOrder.aggregate({
      where: {
        storeId: store.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: { totalRefunds: true }
    });
    
    const newTotal = updatedRefunds._sum.totalRefunds || 0;
    const previousTotal = 428.49; // We know this from our investigation
    const improvement = newTotal - previousTotal;
    
    console.log('\n🎯 FINAL RESULTS:');
    console.log('='.repeat(30));
    console.log(`   📊 Previous 30-day refunds: $${previousTotal.toFixed(2)}`);
    console.log(`   📊 Updated 30-day refunds: $${newTotal.toFixed(2)}`);
    console.log(`   📈 Improvement: $${improvement.toFixed(2)}`);
    console.log(`   🎯 Shopify Analytics target: $1,260.16`);
    console.log(`   📊 Remaining gap: $${(1260.16 - newTotal).toFixed(2)}`);
    console.log(`   📊 Progress: ${((newTotal / 1260.16) * 100).toFixed(1)}% of target reached`);
    
    if (totalFixed > 0) {
      console.log('\n🎉 SUCCESS! Fixed orders with missing refund data.');
      console.log('   📱 Your dashboard should now show the correct refund amounts.');
      console.log('   🔄 Refresh your dashboard to see the updated data.');
    }
    
    if (newTotal >= 1200) {
      console.log('\n🎊 EXCELLENT! Refunds data now closely matches Shopify Analytics!');
    } else {
      const remainingGap = 1260.16 - newTotal;
      console.log(`\n🔍 Still missing $${remainingGap.toFixed(2)} - you may need to:`);
      console.log('   1. Check for refunds outside the 30-day window');
      console.log('   2. Verify if Shopify Analytics includes different data');
      console.log('   3. Look for exchange/store credit transactions');
      console.log('   4. Check for pending refunds not yet processed');
    }
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingRefundsBackfill(); 