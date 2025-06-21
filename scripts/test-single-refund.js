#!/usr/bin/env node

/**
 * Test Refunds API on a specific order
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRefundsAPI() {
  console.log('🔍 Testing refunds API on a specific order...');
  
  try {
    // Get the first store
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });

    if (!store) {
      console.error('❌ No store found in database');
      return;
    }

    // Get an order that shows as refunded
    const refundedOrder = await prisma.shopifyOrder.findFirst({
      where: {
        storeId: store.id,
        financialStatus: 'refunded'
      },
      select: { 
        id: true, 
        orderName: true, 
        totalPrice: true, 
        financialStatus: true,
        totalRefunds: true
      }
    });

    if (!refundedOrder) {
      console.log('❌ No refunded orders found');
      return;
    }

    console.log(`📄 Testing order: ${refundedOrder.orderName} (${refundedOrder.id})`);
    console.log(`   💰 Total Price: $${refundedOrder.totalPrice}`);
    console.log(`   📊 Status: ${refundedOrder.financialStatus}`);
    console.log(`   💸 Current Refunds: $${refundedOrder.totalRefunds}`);

    // Make direct API call to Shopify refunds endpoint
    const shopDomain = store.domain.replace('.myshopify.com', '');
    const url = `https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${refundedOrder.id}/refunds.json`;
    
    console.log(`\n🔗 Making API call to: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': store.accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ API call failed: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    
    console.log(`\n📊 API Response:`);
    console.log(`   🔢 Number of refunds: ${data.refunds.length}`);
    
    if (data.refunds.length > 0) {
      let totalRefunded = 0;
      
      data.refunds.forEach((refund, index) => {
        console.log(`\n   💰 Refund ${index + 1}:`);
        console.log(`      🆔 ID: ${refund.id}`);
        console.log(`      📅 Created: ${refund.created_at}`);
        console.log(`      💵 Transactions: ${refund.transactions.length}`);
        
        refund.transactions.forEach((transaction, txIndex) => {
          console.log(`         Transaction ${txIndex + 1}:`);
          console.log(`           Kind: ${transaction.kind}`);
          console.log(`           Amount: $${transaction.amount}`);
          console.log(`           Status: ${transaction.status}`);
          
          if (transaction.kind === 'refund') {
            totalRefunded += parseFloat(transaction.amount || '0');
          }
        });
      });
      
      console.log(`\n📊 Total Refunded: $${totalRefunded}`);
      
      if (totalRefunded > 0) {
        console.log(`✅ Found actual refunds! Updating database...`);
        
        await prisma.shopifyOrder.update({
          where: { id: refundedOrder.id },
          data: { totalRefunds: totalRefunded }
        });
        
        console.log(`✅ Updated order ${refundedOrder.orderName} with $${totalRefunded} in refunds`);
      }
    } else {
      console.log(`⚠️  No refund transactions found despite 'refunded' status`);
      console.log(`   This might indicate the order was marked as refunded but transactions were processed elsewhere`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testRefundsAPI(); 