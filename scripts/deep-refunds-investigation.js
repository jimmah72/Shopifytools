#!/usr/bin/env node

/**
 * Deep Refunds Investigation
 * 
 * Comprehensive check of ALL possible sources of refunds/returns data:
 * 1. Transactions API (different from Refunds API)
 * 2. Different transaction kinds/types
 * 3. Line-item level refunds
 * 4. Shipping refunds
 * 5. Order adjustments
 * 6. Returns API (if it exists)
 * 7. Different status combinations
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepRefundsInvestigation() {
  console.log('🔬 DEEP REFUNDS INVESTIGATION');
  console.log('Checking ALL possible refund data sources');
  console.log('=' .repeat(60));
  
  try {
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });

    if (!store) {
      console.error('❌ No store found');
      return;
    }

    const shopDomain = store.domain.replace('.myshopify.com', '');

    // First, let's see what our current data shows vs the logs
    console.log('\n🔍 1. CURRENT DATABASE STATUS CHECK:');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const currentRefunds = await prisma.shopifyOrder.aggregate({
      where: {
        storeId: store.id,
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: { totalRefunds: true },
      _count: { id: true }
    });
    
    console.log(`   📊 Current 30-day refunds in DB: $${(currentRefunds._sum.totalRefunds || 0).toFixed(2)}`);
    console.log(`   📊 Dashboard logs show: $125.22`);
    console.log(`   📊 Shopify Analytics shows: $1,280.16`);
    
    if ((currentRefunds._sum.totalRefunds || 0) > 125.22) {
      console.log('   ⚠️  Database has more refunds than dashboard is showing - there may be a cache/sync issue');
    }

    // 2. Deep dive into Transactions API (different from Refunds API)
    console.log('\n🔬 2. TRANSACTIONS API INVESTIGATION:');
    
    // Get a sample of orders to check transactions
    const sampleOrders = await prisma.shopifyOrder.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { 
        id: true, 
        orderName: true, 
        totalRefunds: true, 
        financialStatus: true,
        totalPrice: true
      }
    });

    let transactionsRefundsFound = 0;
    let newRefundKinds = new Set();

    for (let i = 0; i < Math.min(3, sampleOrders.length); i++) {
      const order = sampleOrders[i];
      console.log(`\n   📄 Checking ${order.orderName} via Transactions API...`);
      
      try {
        // Check transactions API instead of refunds API
        const transactionsUrl = `https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${order.id}/transactions.json`;
        
        const response = await fetch(transactionsUrl, {
          headers: {
            'X-Shopify-Access-Token': store.accessToken,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`     📊 Found ${data.transactions.length} total transactions`);
          
          let orderTransactionRefunds = 0;
          const refundTypes = new Set();
          
          data.transactions.forEach(tx => {
            // Log ALL transaction types to see what we might be missing
            if (tx.kind !== 'sale' && tx.kind !== 'authorization' && tx.kind !== 'capture') {
              console.log(`       🔄 ${tx.kind}: $${tx.amount} (${tx.status}) - Gateway: ${tx.gateway}`);
              refundTypes.add(tx.kind);
              newRefundKinds.add(tx.kind);
              
              // Include ALL non-sale transaction types as potential refunds
              if (tx.status === 'success' || tx.status === 'pending') {
                orderTransactionRefunds += parseFloat(tx.amount || '0');
              }
            }
          });
          
          if (orderTransactionRefunds > 0) {
            transactionsRefundsFound += orderTransactionRefunds;
            console.log(`     💰 Total refund-like transactions: $${orderTransactionRefunds.toFixed(2)}`);
            console.log(`     📋 Refund types found: ${Array.from(refundTypes).join(', ')}`);
            
            if (Math.abs(orderTransactionRefunds - order.totalRefunds) > 0.01) {
              console.log(`     ⚠️  DISCREPANCY: Transactions=$${orderTransactionRefunds.toFixed(2)}, DB=$${order.totalRefunds.toFixed(2)}`);
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.log(`     ❌ Error: ${error.message}`);
      }
    }

    console.log(`\n   📊 New transaction kinds found: ${Array.from(newRefundKinds).join(', ')}`);
    console.log(`   💰 Total refunds from transactions API: $${transactionsRefundsFound.toFixed(2)}`);

    // 3. Check for Returns API or other endpoints
    console.log('\n🔬 3. ALTERNATIVE APIS INVESTIGATION:');
    
    const testOrder = sampleOrders[0];
    if (testOrder) {
      const alternativeEndpoints = [
        `/orders/${testOrder.id}/returns.json`,
        `/orders/${testOrder.id}/adjustments.json`,
        `/orders/${testOrder.id}/discounts.json`,
        `/orders/${testOrder.id}/fulfillments.json`,
      ];
      
      for (const endpoint of alternativeEndpoints) {
        try {
          const url = `https://${shopDomain}.myshopify.com/admin/api/2025-04${endpoint}`;
          console.log(`   🔍 Checking: ${endpoint}`);
          
          const response = await fetch(url, {
            headers: {
              'X-Shopify-Access-Token': store.accessToken,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`     ✅ ${endpoint} exists! Keys: ${Object.keys(data).join(', ')}`);
            
            // If it's returns, check for return data
            if (endpoint.includes('returns') && data.returns) {
              console.log(`     📦 Found ${data.returns.length} returns`);
            }
          } else {
            console.log(`     ❌ ${endpoint}: ${response.status}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.log(`     ❌ ${endpoint}: Error`);
        }
      }
    }

    // 4. Check comprehensive order statuses that might have refunds
    console.log('\n🔬 4. COMPREHENSIVE STATUS ANALYSIS:');
    
    const statusAnalysis = await prisma.shopifyOrder.groupBy({
      by: ['financialStatus'],
      where: {
        storeId: store.id,
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: { financialStatus: true },
      _sum: { 
        totalRefunds: true,
        totalPrice: true,
        totalDiscounts: true
      },
      orderBy: { _count: { financialStatus: 'desc' } }
    });

    console.log('\n   📊 30-day Financial Status Breakdown:');
    statusAnalysis.forEach(status => {
      const refunds = status._sum.totalRefunds || 0;
      const revenue = status._sum.totalPrice || 0;
      const discounts = status._sum.totalDiscounts || 0;
      
      console.log(`   ${status.financialStatus}:`);
      console.log(`     Orders: ${status._count.financialStatus}`);
      console.log(`     Revenue: $${revenue.toFixed(2)}`);
      console.log(`     Discounts: $${discounts.toFixed(2)}`);
      console.log(`     Refunds: $${refunds.toFixed(2)}`);
      
      if (refunds === 0 && (status.financialStatus.includes('refund') || status.financialStatus.includes('void'))) {
        console.log(`     ⚠️  No refunds recorded for ${status.financialStatus} status!`);
      }
    });

    // 5. Check for orders with financial_status != paid that might need investigation
    console.log('\n🔬 5. NON-PAID ORDERS INVESTIGATION:');
    
    const suspiciousOrders = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        createdAt: { gte: thirtyDaysAgo },
        NOT: { financialStatus: 'paid' },
        totalRefunds: 0
      },
      select: { 
        id: true, 
        orderName: true, 
        financialStatus: true, 
        totalPrice: true 
      },
      take: 5
    });

    console.log(`\n   Found ${suspiciousOrders.length} non-paid orders with $0 refunds (checking 5):`);
    
    let suspiciousRefundsFound = 0;
    for (const order of suspiciousOrders) {
      console.log(`\n   📄 ${order.orderName} (${order.financialStatus}) - $${order.totalPrice}`);
      
      try {
        // Check both refunds and transactions for this order
        const [refundsResponse, transactionsResponse] = await Promise.all([
          fetch(`https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${order.id}/refunds.json`, {
            headers: { 'X-Shopify-Access-Token': store.accessToken }
          }),
          fetch(`https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${order.id}/transactions.json`, {
            headers: { 'X-Shopify-Access-Token': store.accessToken }
          })
        ]);

        let orderRefunds = 0;
        
        if (refundsResponse.ok) {
          const refundsData = await refundsResponse.json();
          if (refundsData.refunds && refundsData.refunds.length > 0) {
            refundsData.refunds.forEach(refund => {
              if (refund.transactions) {
                refund.transactions.forEach(tx => {
                  if (tx.kind === 'refund' || tx.kind === 'void') {
                    orderRefunds += parseFloat(tx.amount || '0');
                  }
                });
              }
            });
            console.log(`     🔄 Refunds API: $${orderRefunds.toFixed(2)}`);
          }
        }
        
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          let transactionRefunds = 0;
          const transactionTypes = new Set();
          
          transactionsData.transactions.forEach(tx => {
            transactionTypes.add(tx.kind);
            if (tx.kind === 'refund' || tx.kind === 'void') {
              transactionRefunds += parseFloat(tx.amount || '0');
            }
          });
          
          console.log(`     💳 Transactions: ${Array.from(transactionTypes).join(', ')}`);
          console.log(`     💰 Transaction refunds: $${transactionRefunds.toFixed(2)}`);
          
          if (orderRefunds > 0) {
            console.log(`     🚨 MISSING REFUNDS: $${orderRefunds.toFixed(2)} not in database!`);
            suspiciousRefundsFound += orderRefunds;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 400));
      } catch (error) {
        console.log(`     ❌ Error checking order: ${error.message}`);
      }
    }

    // 6. Summary and recommendations
    console.log('\n📋 INVESTIGATION SUMMARY:');
    console.log(`   🎯 Target gap: $${(1280.16 - (currentRefunds._sum.totalRefunds || 0)).toFixed(2)}`);
    console.log(`   💰 Suspicious refunds found: $${suspiciousRefundsFound.toFixed(2)}`);
    console.log(`   📊 Database vs logs discrepancy: ${(currentRefunds._sum.totalRefunds || 0) > 125.22 ? 'YES' : 'NO'}`);
    
    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('   1. Check if dashboard cache needs refresh');
    console.log('   2. Investigate transaction types beyond "refund" and "void"');
    console.log('   3. Check if there are orders with status changes we missed');
    console.log('   4. Consider bulk backfill of ALL non-paid orders');
    console.log('   5. Verify sync process is updating refunds on order changes');

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deepRefundsInvestigation(); 