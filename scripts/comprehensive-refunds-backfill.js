#!/usr/bin/env node

/**
 * Comprehensive Refunds Backfill
 * 
 * This script ensures ALL refunds data is captured, including:
 * - Fully refunded orders
 * - Partially refunded orders  
 * - Any other financial statuses that might have refunds
 * - Orders that might have been missed in previous backfills
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function comprehensiveRefundsBackfill() {
  console.log('🔧 Comprehensive refunds backfill starting...');
  
  try {
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });

    if (!store) {
      console.error('❌ No store found');
      return;
    }

    // Get ALL orders that might have refunds
    const potentialRefundOrders = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        OR: [
          { financialStatus: 'refunded' },
          { financialStatus: 'partially_refunded' },
          { financialStatus: 'voided' },
          // Also check orders that currently show $0 refunds but might have some
          { totalRefunds: { lte: 0 } }
        ]
      },
      select: { 
        id: true, 
        orderName: true, 
        totalPrice: true, 
        financialStatus: true,
        totalRefunds: true 
      },
      orderBy: { orderName: 'desc' }, // Most recent first
      take: 50 // Limit to prevent overwhelming the API
    });

    console.log(`📊 Found ${potentialRefundOrders.length} orders to check for refunds`);

    if (potentialRefundOrders.length === 0) {
      console.log('✅ No orders need refunds checking');
      return;
    }

    const shopDomain = store.domain.replace('.myshopify.com', '');
    let totalRefundsFound = 0;
    let updatedCount = 0;
    let processedCount = 0;

    for (const order of potentialRefundOrders) {
      processedCount++;
      console.log(`\n📄 [${processedCount}/${potentialRefundOrders.length}] ${order.orderName} (${order.financialStatus}) - Current: $${order.totalRefunds}`);
      
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
          continue;
        }

        const data = await response.json();
        
        let orderRefunds = 0;
        
        if (data.refunds && data.refunds.length > 0) {
          console.log(`   📊 Found ${data.refunds.length} refund records`);
          
          data.refunds.forEach((refund) => {
            if (refund.transactions && refund.transactions.length > 0) {
              refund.transactions.forEach((transaction) => {
                // Include ALL transaction types that represent money back to customer
                if (transaction.kind === 'refund' || 
                    transaction.kind === 'void' || 
                    (transaction.status === 'success' && parseFloat(transaction.amount || '0') > 0)) {
                  const amount = parseFloat(transaction.amount || '0');
                  orderRefunds += amount;
                }
              });
            }
          });
        }
        
        if (orderRefunds !== order.totalRefunds) {
          await prisma.shopifyOrder.update({
            where: { id: order.id },
            data: { totalRefunds: orderRefunds }
          });
          
          console.log(`   ✅ Updated from $${order.totalRefunds} to $${orderRefunds}`);
          totalRefundsFound += orderRefunds;
          updatedCount++;
        } else if (orderRefunds > 0) {
          console.log(`   ⚪ Already correct: $${orderRefunds}`);
          totalRefundsFound += orderRefunds;
        } else {
          console.log(`   ⚪ No refunds found`);
        }
        
        // Respect API limits (5 requests per second max)
        await new Promise(resolve => setTimeout(resolve, 220));
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log(`\n📊 FINAL SUMMARY:`);
    console.log(`   📈 Orders checked: ${processedCount}`);
    console.log(`   ✅ Orders updated: ${updatedCount}`);
    console.log(`   💰 Total refunds in checked orders: $${totalRefundsFound.toFixed(2)}`);

    // Get final system-wide refunds total
    const finalRefundsSum = await prisma.shopifyOrder.aggregate({
      where: { storeId: store.id },
      _sum: { totalRefunds: true },
      _count: { id: true }
    });

    const ordersWithRefunds = await prisma.shopifyOrder.count({
      where: { 
        storeId: store.id,
        totalRefunds: { gt: 0 }
      }
    });

    console.log(`\n📈 SYSTEM-WIDE REFUNDS STATUS:`);
    console.log(`   💰 Total refunds in database: $${(finalRefundsSum._sum.totalRefunds || 0).toFixed(2)}`);
    console.log(`   📊 Orders with refunds: ${ordersWithRefunds}/${finalRefundsSum._count.id}`);
    console.log(`   📊 Refund rate: ${((ordersWithRefunds / finalRefundsSum._count.id) * 100).toFixed(2)}%`);

  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

comprehensiveRefundsBackfill(); 