#!/usr/bin/env node

/**
 * Comprehensive Refunds Audit
 * 
 * We're missing $1,154.94 in refunds (Shopify shows $1,280.16, we only have $125.22)
 * This script will investigate all possible sources of missing refunds data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function comprehensiveRefundsAudit() {
  console.log('🚨 COMPREHENSIVE REFUNDS AUDIT');
  console.log('Target: Find missing $1,154.94 in refunds');
  console.log('Shopify Analytics: -$1,280.16');
  console.log('Our System: $125.22');
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

    // 1. Check our current refunds data
    console.log('\n📊 1. CURRENT REFUNDS DATA ANALYSIS:');
    
    const refundsSummary = await prisma.shopifyOrder.aggregate({
      where: { storeId: store.id },
      _sum: { totalRefunds: true },
      _count: { id: true }
    });

    const ordersWithRefunds = await prisma.shopifyOrder.findMany({
      where: { 
        storeId: store.id,
        totalRefunds: { gt: 0 }
      },
      select: { 
        orderName: true, 
        totalRefunds: true, 
        financialStatus: true,
        createdAt: true
      },
      orderBy: { totalRefunds: 'desc' }
    });

    console.log(`   Total orders: ${refundsSummary._count.id}`);
    console.log(`   Orders with refunds: ${ordersWithRefunds.length}`);
    console.log(`   Total refunds captured: $${(refundsSummary._sum.totalRefunds || 0).toFixed(2)}`);
    
    console.log('\n   Top refunded orders:');
    ordersWithRefunds.slice(0, 10).forEach(order => {
      console.log(`   ${order.orderName}: $${order.totalRefunds.toFixed(2)} (${order.financialStatus}) - ${order.createdAt.toISOString().split('T')[0]}`);
    });

    // 2. Check for different financial statuses that might have refunds
    console.log('\n📊 2. FINANCIAL STATUS BREAKDOWN:');
    
    const statusBreakdown = await prisma.shopifyOrder.groupBy({
      by: ['financialStatus'],
      where: { storeId: store.id },
      _count: { financialStatus: true },
      _sum: { totalRefunds: true },
      orderBy: { _count: { financialStatus: 'desc' } }
    });

    statusBreakdown.forEach(status => {
      const refunds = status._sum.totalRefunds || 0;
      console.log(`   ${status.financialStatus}: ${status._count.financialStatus} orders, $${refunds.toFixed(2)} refunds`);
    });

    // 3. Sample recent orders to check if refunds API is working correctly
    console.log('\n📊 3. RECENT ORDERS REFUNDS CHECK:');
    
    const recentOrders = await prisma.shopifyOrder.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { 
        id: true, 
        orderName: true, 
        totalRefunds: true, 
        financialStatus: true,
        totalPrice: true
      }
    });

    console.log('   Checking refunds for 20 most recent orders...');
    let apiRefundsFound = 0;
    let discrepancies = 0;

    for (let i = 0; i < Math.min(5, recentOrders.length); i++) {
      const order = recentOrders[i];
      console.log(`\n   📄 ${order.orderName} (${order.financialStatus}) - DB: $${order.totalRefunds}`);
      
      try {
        const url = `https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${order.id}/refunds.json`;
        
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': store.accessToken,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          let actualRefunds = 0;
          if (data.refunds && data.refunds.length > 0) {
            data.refunds.forEach(refund => {
              if (refund.transactions) {
                refund.transactions.forEach(tx => {
                  if (tx.kind === 'refund' || tx.kind === 'void') {
                    actualRefunds += parseFloat(tx.amount || '0');
                  }
                });
              }
            });
          }
          
          apiRefundsFound += actualRefunds;
          
          if (Math.abs(actualRefunds - order.totalRefunds) > 0.01) {
            console.log(`     ⚠️  DISCREPANCY: API shows $${actualRefunds.toFixed(2)}, DB shows $${order.totalRefunds.toFixed(2)}`);
            discrepancies++;
          } else {
            console.log(`     ✅ Matches: $${actualRefunds.toFixed(2)}`);
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 250));
      } catch (error) {
        console.log(`     ❌ Error: ${error.message}`);
      }
    }

    // 4. Check for orders with 'refunded' status but $0 refunds in our DB
    console.log('\n📊 4. REFUNDED ORDERS WITH $0 IN DATABASE:');
    
    const refundedButZero = await prisma.shopifyOrder.findMany({
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
      take: 10
    });

    console.log(`   Found ${refundedButZero.length} orders marked as refunded but showing $0 refunds`);
    
    if (refundedButZero.length > 0) {
      console.log('\n   Checking these orders for missing refunds...');
      let missingRefundsTotal = 0;
      
      for (const order of refundedButZero.slice(0, 5)) {
        console.log(`\n   📄 ${order.orderName} ($${order.totalPrice}) - ${order.financialStatus}`);
        
        try {
          const url = `https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${order.id}/refunds.json`;
          
          const response = await fetch(url, {
            headers: {
              'X-Shopify-Access-Token': store.accessToken,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            
            let actualRefunds = 0;
            if (data.refunds && data.refunds.length > 0) {
              console.log(`     Found ${data.refunds.length} refund records`);
              data.refunds.forEach((refund, i) => {
                console.log(`       Refund ${i + 1}: ${refund.transactions?.length || 0} transactions`);
                if (refund.transactions) {
                  refund.transactions.forEach(tx => {
                    if (tx.kind === 'refund' || tx.kind === 'void') {
                      actualRefunds += parseFloat(tx.amount || '0');
                      console.log(`         ${tx.kind}: $${tx.amount}`);
                    }
                  });
                }
              });
              
              if (actualRefunds > 0) {
                console.log(`     🚨 MISSING REFUNDS: $${actualRefunds.toFixed(2)}`);
                missingRefundsTotal += actualRefunds;
              }
            } else {
              console.log(`     No refund records found despite ${order.financialStatus} status`);
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (error) {
          console.log(`     ❌ Error: ${error.message}`);
        }
      }
      
      console.log(`\n   💰 Missing refunds found so far: $${missingRefundsTotal.toFixed(2)}`);
    }

    // 5. Check timeframe alignment with Shopify Analytics
    console.log('\n📊 5. TIMEFRAME ANALYSIS:');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const last30DaysRefunds = await prisma.shopifyOrder.aggregate({
      where: {
        storeId: store.id,
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: { totalRefunds: true },
      _count: { id: true }
    });

    console.log(`   Last 30 days orders: ${last30DaysRefunds._count.id}`);
    console.log(`   Last 30 days refunds: $${(last30DaysRefunds._sum.totalRefunds || 0).toFixed(2)}`);
    console.log(`   Shopify Analytics shows: -$1,280.16`);
    console.log(`   Difference: $${(1280.16 - (last30DaysRefunds._sum.totalRefunds || 0)).toFixed(2)} missing`);

    // 6. Summary
    console.log('\n📋 AUDIT SUMMARY:');
    console.log(`   🎯 Target missing amount: $1,154.94`);
    console.log(`   📊 Total refunds in DB: $${(refundsSummary._sum.totalRefunds || 0).toFixed(2)}`);
    console.log(`   📊 Orders with refunded status but $0 in DB: ${refundedButZero.length}`);
    console.log(`   📊 API discrepancies found: ${discrepancies}`);
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('   1. Backfill missing refunds for orders marked as refunded');
    console.log('   2. Check if there are other refund types we\'re not capturing');
    console.log('   3. Verify timeframe alignment with Shopify Analytics');
    console.log('   4. Consider checking older orders that might have refunds');

  } catch (error) {
    console.error('❌ Audit failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

comprehensiveRefundsAudit(); 