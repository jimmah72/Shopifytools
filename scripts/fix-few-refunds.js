#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixFewRefunds() {
  console.log('🔧 Fixing refunds for a few more orders...');
  
  try {
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });

    if (!store) {
      console.error('❌ No store found');
      return;
    }

    // Get a few more refunded orders
    const refundedOrders = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        OR: [
          { financialStatus: 'refunded' },
          { financialStatus: 'partially_refunded' }
        ],
        totalRefunds: 0
      },
      select: { id: true, orderName: true, totalPrice: true, financialStatus: true },
      take: 3
    });

    if (refundedOrders.length === 0) {
      console.log('✅ No more refunded orders to fix');
      return;
    }

    const shopDomain = store.domain.replace('.myshopify.com', '');
    let totalRefundsFound = 0;

    for (const order of refundedOrders) {
      console.log(`\n📄 Checking order ${order.orderName}...`);
      
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
        data.refunds.forEach(refund => {
          refund.transactions.forEach(transaction => {
            if (transaction.kind === 'refund') {
              orderRefunds += parseFloat(transaction.amount || '0');
            }
          });
        });
        
        if (orderRefunds > 0) {
          await prisma.shopifyOrder.update({
            where: { id: order.id },
            data: { totalRefunds: orderRefunds }
          });
          
          console.log(`   ✅ Updated with $${orderRefunds} in refunds`);
          totalRefundsFound += orderRefunds;
        } else {
          console.log(`   ⚪ No refund transactions found`);
        }
        
        // Small delay to respect API limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log(`\n📊 Summary: Found $${totalRefundsFound.toFixed(2)} total in refunds`);

  } catch (error) {
    console.error('❌ Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixFewRefunds(); 