#!/usr/bin/env node

/**
 * SEPARATE Refunds Backfill Script
 * 
 * This script runs INDEPENDENTLY from the main sync process.
 * It only updates refunds for orders that specifically need it.
 * 
 * Usage: node scripts/refunds-backfill-separate.js [--limit=50]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function separateRefundsBackfill() {
  console.log('💸 SEPARATE Refunds Backfill - Running independently...');
  console.log('🎯 This does NOT affect the main sync process');
  
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 50;
  
  try {
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });

    if (!store) {
      console.error('❌ No store found');
      return;
    }

    // Only get orders that specifically need refunds update
    const ordersNeedingRefunds = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        OR: [
          { financialStatus: 'refunded' },
          { financialStatus: 'partially_refunded' },
          // Orders with status that suggests refunds but showing $0
          { 
            AND: [
              { totalRefunds: { lte: 0 } },
              { financialStatus: { in: ['refunded', 'partially_refunded'] } }
            ]
          }
        ]
      },
      select: { 
        id: true, 
        orderName: true, 
        totalRefunds: true,
        financialStatus: true
      },
      take: limit,
      orderBy: { updatedAt: 'desc' }
    });

    console.log(`📊 Found ${ordersNeedingRefunds.length} orders that may need refunds update`);
    
    if (ordersNeedingRefunds.length === 0) {
      console.log('✅ No orders need refunds backfill at this time');
      return;
    }

    const shopDomain = store.domain.replace('.myshopify.com', '');
    let updated = 0;
    let errors = 0;
    
    console.log('⚠️  Proceeding with careful rate limiting...');
    
    for (const order of ordersNeedingRefunds) {
      console.log(`\n📄 Checking ${order.orderName} (${order.financialStatus})...`);
      
      try {
        const url = `https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${order.id}/refunds.json`;
        
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': store.accessToken,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.log('   ⚠️  Rate limited - stopping to prevent issues');
            console.log('   💡 Run again later to continue where left off');
            break;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        let orderRefunds = 0;
        
        if (data.refunds && data.refunds.length > 0) {
          data.refunds.forEach(refund => {
            if (refund.transactions) {
              refund.transactions.forEach(tx => {
                if (tx.kind === 'refund' || tx.kind === 'void') {
                  orderRefunds += parseFloat(tx.amount || '0');
                }
              });
            }
          });
        }
        
        if (Math.abs(orderRefunds - order.totalRefunds) > 0.01) {
          await prisma.shopifyOrder.update({
            where: { id: order.id },
            data: { totalRefunds: orderRefunds }
          });
          
          console.log(`   ✅ Updated: $${order.totalRefunds} → $${orderRefunds.toFixed(2)}`);
          updated++;
        } else {
          console.log(`   ⚪ Correct: $${orderRefunds.toFixed(2)}`);
        }
        
        // Respectful delay between requests
        await new Promise(resolve => setTimeout(resolve, 750));
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n📊 BACKFILL SUMMARY:`);
    console.log(`   📈 Orders checked: ${ordersNeedingRefunds.length}`);
    console.log(`   ✅ Orders updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   💡 Main sync process: Unaffected and optimized`);

  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  separateRefundsBackfill();
}

module.exports = { separateRefundsBackfill }; 