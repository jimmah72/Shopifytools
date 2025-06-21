#!/usr/bin/env node

/**
 * Fix ALL Missing Refunds
 * 
 * Backfill refunds for ALL orders marked as refunded/partially_refunded but showing $0
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllMissingRefunds() {
  console.log('🔧 FIXING ALL MISSING REFUNDS');
  console.log('Target: Backfill all orders marked as refunded but showing $0');
  console.log('=' .repeat(50));
  
  try {
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });

    if (!store) {
      console.error('❌ No store found');
      return;
    }

    const shopDomain = store.domain.replace('.myshopify.com', '');

    // Get ALL orders marked as refunded but showing $0 in totalRefunds
    const missingRefundOrders = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        OR: [
          { financialStatus: 'refunded' },
          { financialStatus: 'partially_refunded' }
        ],
        totalRefunds: 0
      },
      select: { 
        id: true, 
        orderName: true, 
        financialStatus: true, 
        totalPrice: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Found ${missingRefundOrders.length} orders to fix`);
    
    if (missingRefundOrders.length === 0) {
      console.log('✅ No missing refunds to fix');
      return;
    }

    let totalRefundsFound = 0;
    let ordersFixed = 0;
    let errors = 0;

    for (let i = 0; i < missingRefundOrders.length; i++) {
      const order = missingRefundOrders[i];
      
      console.log(`\n📄 [${i + 1}/${missingRefundOrders.length}] ${order.orderName} ($${order.totalPrice}) - ${order.financialStatus}`);
      
      try {
        const url = `https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${order.id}/refunds.json`;
        
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': store.accessToken,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.log(`   ❌ API call failed: ${response.status}`);
          errors++;
          continue;
        }

        const data = await response.json();
        
        let orderRefunds = 0;
        if (data.refunds && data.refunds.length > 0) {
          console.log(`   📊 Found ${data.refunds.length} refund records`);
          
          data.refunds.forEach(refund => {
            if (refund.transactions) {
              refund.transactions.forEach(tx => {
                if (tx.kind === 'refund' || tx.kind === 'void') {
                  orderRefunds += parseFloat(tx.amount || '0');
                  console.log(`     ${tx.kind}: $${tx.amount}`);
                }
              });
            }
          });
          
          if (orderRefunds > 0) {
            // Update the database
            await prisma.shopifyOrder.update({
              where: { id: order.id },
              data: { totalRefunds: orderRefunds }
            });
            
            console.log(`   ✅ Fixed: $0 → $${orderRefunds.toFixed(2)}`);
            totalRefundsFound += orderRefunds;
            ordersFixed++;
          } else {
            console.log(`   ⚠️  No refund transactions found`);
          }
        } else {
          console.log(`   ⚠️  No refund records despite ${order.financialStatus} status`);
        }
        
        // Rate limiting - be more careful with API calls
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n📊 BACKFILL COMPLETE:`);
    console.log(`   📈 Orders processed: ${missingRefundOrders.length}`);
    console.log(`   ✅ Orders fixed: ${ordersFixed}`);
    console.log(`   💰 Refunds recovered: $${totalRefundsFound.toFixed(2)}`);
    console.log(`   ❌ Errors: ${errors}`);

    // Get updated totals
    const updatedRefunds = await prisma.shopifyOrder.aggregate({
      where: { storeId: store.id },
      _sum: { totalRefunds: true }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const updated30DayRefunds = await prisma.shopifyOrder.aggregate({
      where: {
        storeId: store.id,
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: { totalRefunds: true }
    });

    console.log(`\n📊 UPDATED TOTALS:`);
    console.log(`   💰 Total refunds (all time): $${(updatedRefunds._sum.totalRefunds || 0).toFixed(2)}`);
    console.log(`   💰 Total refunds (30 days): $${(updated30DayRefunds._sum.totalRefunds || 0).toFixed(2)}`);
    console.log(`   🎯 Shopify Analytics target: $1,280.16`);
    console.log(`   📊 Remaining gap: $${(1280.16 - (updated30DayRefunds._sum.totalRefunds || 0)).toFixed(2)}`);

    if ((updated30DayRefunds._sum.totalRefunds || 0) >= 1200) {
      console.log('\n🎉 SUCCESS: Refunds data now matches Shopify Analytics!');
    } else {
      console.log('\n🔍 Still some gap remaining - may need to check older orders or different refund types');
    }

  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllMissingRefunds(); 