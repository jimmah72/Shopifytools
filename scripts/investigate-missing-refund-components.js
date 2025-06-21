#!/usr/bin/env node

/**
 * Investigate Missing Refund Components
 * 
 * This script investigates what refund components we might be missing
 * compared to Shopify Analytics' "Net Returns" calculation
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateMissingComponents() {
  console.log('🔍 Investigating missing refund components...');
  
  try {
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });
    
    if (!store) {
      console.log('❌ No store found');
      return;
    }
    
    // Get a few orders that might have complex refunds
    const orders = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        OR: [
          { financialStatus: 'refunded' },
          { financialStatus: 'partially_refunded' }
        ]
      },
      select: { 
        id: true, 
        orderName: true, 
        totalRefunds: true,
        totalPrice: true,
        financialStatus: true
      },
      take: 5
    });
    
    console.log(`📊 Found ${orders.length} orders to investigate`);
    
    const shopDomain = store.domain.replace('.myshopify.com', '');
    
    for (const order of orders) {
      console.log(`\n📄 Order ${order.orderName} ($${order.totalPrice}) - ${order.financialStatus}`);
      console.log(`   Current DB refunds: $${order.totalRefunds}`);
      
      try {
        // Get detailed refunds data
        const refundsUrl = `https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${order.id}/refunds.json`;
        
        const response = await fetch(refundsUrl, {
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
        
        if (data.refunds && data.refunds.length > 0) {
          console.log(`   📊 Found ${data.refunds.length} refund records`);
          
          let totalFromTransactions = 0;
          let totalFromLineItems = 0;
          let totalShipping = 0;
          let totalAdjustments = 0;
          
          data.refunds.forEach((refund, i) => {
            console.log(`\n   🔄 Refund ${i + 1}:`);
            
            // 1. Check refund line items (product refunds)
            if (refund.refund_line_items && refund.refund_line_items.length > 0) {
              let lineItemsSubtotal = 0;
              refund.refund_line_items.forEach(item => {
                const subtotal = parseFloat(item.subtotal || '0');
                lineItemsSubtotal += subtotal;
                console.log(`     📦 Line Item: ${item.line_item?.title || 'Unknown'} - $${subtotal}`);
              });
              totalFromLineItems += lineItemsSubtotal;
              console.log(`     📦 Line Items Subtotal: $${lineItemsSubtotal.toFixed(2)}`);
            }
            
            // 2. Check shipping refunds
            if (refund.shipping && parseFloat(refund.shipping.amount || '0') > 0) {
              const shippingAmount = parseFloat(refund.shipping.amount);
              totalShipping += shippingAmount;
              console.log(`     🚚 Shipping Refund: $${shippingAmount.toFixed(2)}`);
            }
            
            // 3. Check order adjustments (fees, taxes, etc.)
            if (refund.order_adjustments && refund.order_adjustments.length > 0) {
              refund.order_adjustments.forEach(adj => {
                const amount = parseFloat(adj.amount || '0');
                totalAdjustments += amount;
                console.log(`     ⚖️  Order Adjustment (${adj.kind}): $${amount.toFixed(2)}`);
              });
            }
            
            // 4. Check transactions (what we currently capture)
            if (refund.transactions && refund.transactions.length > 0) {
              refund.transactions.forEach(tx => {
                const amount = parseFloat(tx.amount || '0');
                console.log(`     💳 Transaction: ${tx.kind} $${amount} (${tx.status})`);
                
                // This is what our current system captures
                if (tx.kind === 'refund' || tx.kind === 'void' || 
                    (tx.status === 'success' && amount > 0)) {
                  totalFromTransactions += amount;
                }
              });
            }
          });
          
          console.log(`\n   📊 BREAKDOWN:`);
          console.log(`     💳 Transactions (current system): $${totalFromTransactions.toFixed(2)}`);
          console.log(`     📦 Line Items: $${totalFromLineItems.toFixed(2)}`);
          console.log(`     🚚 Shipping: $${totalShipping.toFixed(2)}`);
          console.log(`     ⚖️  Adjustments: $${totalAdjustments.toFixed(2)}`);
          
          const calculatedTotal = totalFromLineItems + totalShipping + totalAdjustments;
          console.log(`     🧮 Calculated Total: $${calculatedTotal.toFixed(2)}`);
          console.log(`     🔍 DB vs Calculated: $${order.totalRefunds} vs $${calculatedTotal.toFixed(2)}`);
          
          if (Math.abs(calculatedTotal - order.totalRefunds) > 0.01) {
            console.log(`     ⚠️  DISCREPANCY: $${(calculatedTotal - order.totalRefunds).toFixed(2)}`);
          }
          
        } else {
          console.log(`   ⚪ No refund records found`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 400));
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n🎯 INVESTIGATION COMPLETE');
    console.log('   Key findings will help identify what components to add to our refunds calculation');
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateMissingComponents(); 