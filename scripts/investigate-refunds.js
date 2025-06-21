#!/usr/bin/env node

/**
 * Comprehensive Refunds Investigation
 * 
 * Check for all possible refund scenarios including canceled orders,
 * different transaction types, and potential returns data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateRefunds() {
  console.log('🔍 Comprehensive refunds investigation...');
  
  try {
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });

    if (!store) {
      console.error('❌ No store found');
      return;
    }

    // 1. Check all possible financial statuses that might indicate refunds
    console.log('\n📊 1. FINANCIAL STATUS ANALYSIS:');
    
    const statusCounts = await prisma.shopifyOrder.groupBy({
      by: ['financialStatus'],
      where: { storeId: store.id },
      _count: { financialStatus: true },
      orderBy: { _count: { financialStatus: 'desc' } }
    });

    statusCounts.forEach(status => {
      console.log(`   ${status.financialStatus}: ${status._count.financialStatus} orders`);
    });

    // 2. Check for canceled/voided orders specifically
    console.log('\n🚫 2. CANCELED/VOIDED ORDERS:');
    
    const canceledOrders = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        OR: [
          { financialStatus: 'voided' },
          { financialStatus: 'canceled' },
          { financialStatus: 'cancelled' },
          { fulfillmentStatus: 'cancelled' }
        ]
      },
      select: { 
        id: true, 
        orderName: true, 
        totalPrice: true, 
        financialStatus: true,
        fulfillmentStatus: true,
        totalRefunds: true
      },
      take: 10
    });

    if (canceledOrders.length > 0) {
      console.log(`   Found ${canceledOrders.length} canceled orders (showing first 10):`);
      for (const order of canceledOrders) {
        console.log(`   📄 ${order.orderName}: $${order.totalPrice}, Financial: ${order.financialStatus}, Fulfillment: ${order.fulfillmentStatus}, Refunds: $${order.totalRefunds}`);
      }
    } else {
      console.log('   ✅ No canceled orders found');
    }

    // 3. Test a refund API call with detailed transaction analysis
    console.log('\n🔬 3. DETAILED REFUND TRANSACTION ANALYSIS:');
    
    const testOrder = await prisma.shopifyOrder.findFirst({
      where: {
        storeId: store.id,
        OR: [
          { financialStatus: 'refunded' },
          { financialStatus: 'partially_refunded' },
          { financialStatus: 'voided' }
        ]
      },
      select: { id: true, orderName: true, totalPrice: true, financialStatus: true }
    });

    if (testOrder) {
      console.log(`   Testing order: ${testOrder.orderName}`);
      
      const shopDomain = store.domain.replace('.myshopify.com', '');
      const url = `https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${testOrder.id}/refunds.json`;
      
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': store.accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`   📊 Refunds found: ${data.refunds.length}`);
        
        data.refunds.forEach((refund, i) => {
          console.log(`\n   🔄 Refund ${i + 1}:`);
          console.log(`      ID: ${refund.id}`);
          console.log(`      Created: ${refund.created_at}`);
          console.log(`      Note: ${refund.note || 'No note'}`);
          console.log(`      Transactions: ${refund.transactions.length}`);
          
          refund.transactions.forEach((tx, j) => {
            console.log(`        Transaction ${j + 1}:`);
            console.log(`          Kind: ${tx.kind}`);
            console.log(`          Status: ${tx.status}`);
            console.log(`          Amount: $${tx.amount}`);
            console.log(`          Gateway: ${tx.gateway || 'N/A'}`);
            console.log(`          Source Name: ${tx.source_name || 'N/A'}`);
          });
          
          // Check refund line items
          if (refund.refund_line_items && refund.refund_line_items.length > 0) {
            console.log(`      Refund Line Items: ${refund.refund_line_items.length}`);
            refund.refund_line_items.forEach((item, k) => {
              console.log(`        Item ${k + 1}: ${item.line_item?.title || 'Unknown'} - Qty: ${item.quantity} - $${item.subtotal}`);
            });
          }
        });
      }
    }

    // 4. Check for potential returns API (this might not exist, but let's try)
    console.log('\n📦 4. CHECKING FOR RETURNS API:');
    
    if (testOrder) {
      const returnsUrl = `https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${testOrder.id}/returns.json`;
      
      try {
        const returnsResponse = await fetch(returnsUrl, {
          headers: {
            'X-Shopify-Access-Token': store.accessToken,
            'Content-Type': 'application/json',
          },
        });
        
        if (returnsResponse.ok) {
          const returnsData = await returnsResponse.json();
          console.log(`   📦 Returns API works! Found: ${returnsData.returns ? returnsData.returns.length : 0} returns`);
        } else {
          console.log(`   ⚪ Returns API not available (${returnsResponse.status})`);
        }
      } catch (error) {
        console.log(`   ⚪ Returns API not available (error)`);
      }
    }

    // 5. Check transactions directly on an order
    console.log('\n💳 5. DIRECT TRANSACTIONS CHECK:');
    
    if (testOrder) {
      const transactionsUrl = `https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${testOrder.id}/transactions.json`;
      
      try {
        const txResponse = await fetch(transactionsUrl, {
          headers: {
            'X-Shopify-Access-Token': store.accessToken,
            'Content-Type': 'application/json',
          },
        });
        
        if (txResponse.ok) {
          const txData = await txResponse.json();
          console.log(`   💳 Transactions found: ${txData.transactions.length}`);
          
          const refundTransactions = txData.transactions.filter(tx => 
            tx.kind === 'refund' || tx.kind === 'void' || tx.status === 'refunded'
          );
          
          console.log(`   🔄 Refund-related transactions: ${refundTransactions.length}`);
          
          refundTransactions.forEach((tx, i) => {
            console.log(`     ${i + 1}. Kind: ${tx.kind}, Status: ${tx.status}, Amount: $${tx.amount}`);
          });
        }
      } catch (error) {
        console.log(`   ❌ Transactions API error: ${error.message}`);
      }
    }

    // 6. Summary of current refunds data
    console.log('\n📈 6. CURRENT REFUNDS SUMMARY:');
    
    const totalRefundsSum = await prisma.shopifyOrder.aggregate({
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

    console.log(`   📊 Total orders: ${totalRefundsSum._count.id}`);
    console.log(`   💸 Orders with refunds: ${ordersWithRefunds}`);
    console.log(`   💰 Total refunds captured: $${(totalRefundsSum._sum.totalRefunds || 0).toFixed(2)}`);
    console.log(`   📊 Refund rate: ${((ordersWithRefunds / totalRefundsSum._count.id) * 100).toFixed(2)}%`);

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateRefunds(); 