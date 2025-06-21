#!/usr/bin/env node

/**
 * Fix Partially Refunded Orders
 * 
 * Focus on the 10 partially_refunded orders we're missing
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPartiallyRefunded() {
  console.log('🔧 Fixing partially refunded orders...');
  
  try {
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });

    if (!store) {
      console.error('❌ No store found');
      return;
    }

    // Get ALL partially refunded orders
    const partiallyRefunded = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        financialStatus: 'partially_refunded'
      },
      select: { 
        id: true, 
        orderName: true, 
        totalPrice: true, 
        totalRefunds: true 
      }
    });

    console.log(`📊 Found ${partiallyRefunded.length} partially refunded orders`);

    if (partiallyRefunded.length === 0) {
      console.log('✅ No partially refunded orders to fix');
      return;
    }

    const shopDomain = store.domain.replace('.myshopify.com', '');
    let totalRefundsFound = 0;
    let updatedCount = 0;

    for (const order of partiallyRefunded) {
      console.log(`\n📄 Processing order ${order.orderName} (Current refunds: $${order.totalRefunds})...`);
      
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
        console.log(`   📊 Found ${data.refunds.length} refund records`);
        
        data.refunds.forEach((refund, i) => {
          console.log(`     Refund ${i + 1}: ${refund.transactions.length} transactions`);
          
          refund.transactions.forEach((transaction, j) => {
            console.log(`       Transaction ${j + 1}: ${transaction.kind} - $${transaction.amount} (${transaction.status})`);
            
            // Include ALL transaction types that represent money back to customer
            if (transaction.kind === 'refund' || 
                transaction.kind === 'void' || 
                transaction.status === 'success') {
              orderRefunds += parseFloat(transaction.amount || '0');
            }
          });
        });
        
        if (orderRefunds > 0 && orderRefunds !== order.totalRefunds) {
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
          console.log(`   ⚠️  No refund transactions found despite partially_refunded status`);
        }
        
        // Respect API limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`   📈 Orders processed: ${partiallyRefunded.length}`);
    console.log(`   ✅ Orders updated: ${updatedCount}`);
    console.log(`   💰 Total refunds found: $${totalRefundsFound.toFixed(2)}`);

    // Check total refunds after update
    const finalRefundsSum = await prisma.shopifyOrder.aggregate({
      where: { storeId: store.id },
      _sum: { totalRefunds: true }
    });

    console.log(`   📊 Total refunds in database: $${(finalRefundsSum._sum.totalRefunds || 0).toFixed(2)}`);

  } catch (error) {
    console.error('❌ Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPartiallyRefunded(); 