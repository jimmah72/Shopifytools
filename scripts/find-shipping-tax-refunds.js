#!/usr/bin/env node

/**
 * Find Shipping and Tax Refunds
 * 
 * Look for orders that have shipping ($230.46) or tax ($4.26) refunds
 * to understand where these components come from
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findShippingTaxRefunds() {
  console.log('🔍 Looking for shipping and tax refunds...');
  console.log('Target components: Shipping returned ($230.46) + Taxes returned ($4.26)');
  
  try {
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });
    
    if (!store) {
      console.log('❌ No store found');
      return;
    }
    
    // Get orders with refunds in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const ordersWithRefunds = await prisma.shopifyOrder.findMany({
      where: {
        storeId: store.id,
        createdAt: { gte: thirtyDaysAgo },
        totalRefunds: { gt: 0 }
      },
      select: { 
        id: true, 
        orderName: true, 
        totalRefunds: true 
      }
    });
    
    console.log(`📊 Found ${ordersWithRefunds.length} orders with refunds in 30-day period`);
    
    const shopDomain = store.domain.replace('.myshopify.com', '');
    let totalShippingFound = 0;
    let totalTaxFound = 0;
    let totalTransactions = 0;
    let ordersWithShipping = 0;
    let ordersWithTax = 0;
    
    console.log('\n🔍 Scanning all refunded orders for shipping/tax components...');
    
    for (let i = 0; i < ordersWithRefunds.length; i++) {
      const order = ordersWithRefunds[i];
      
      try {
        const url = `https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${order.id}/refunds.json`;
        
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': store.accessToken,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.log(`   ❌ ${order.orderName}: API call failed (${response.status})`);
          continue;
        }
        
        const data = await response.json();
        
        if (data.refunds && data.refunds.length > 0) {
          let orderShipping = 0;
          let orderTax = 0;
          let orderTransactions = 0;
          
          data.refunds.forEach(refund => {
            // Check transactions
            if (refund.transactions) {
              refund.transactions.forEach(tx => {
                if (tx.kind === 'refund' || tx.kind === 'void') {
                  orderTransactions += parseFloat(tx.amount || '0');
                }
              });
            }
            
            // Check shipping refunds
            if (refund.shipping && parseFloat(refund.shipping.amount || '0') > 0) {
              orderShipping += parseFloat(refund.shipping.amount);
            }
            
            // Check for tax adjustments or shipping adjustments
            if (refund.order_adjustments) {
              refund.order_adjustments.forEach(adj => {
                const amount = parseFloat(adj.amount || '0');
                
                if (adj.kind === 'tax_adjustment') {
                  orderTax += Math.abs(amount);
                } else if (adj.kind === 'shipping_refund') {
                  orderShipping += Math.abs(amount);
                }
              });
            }
          });
          
          totalShippingFound += orderShipping;
          totalTaxFound += orderTax;
          totalTransactions += orderTransactions;
          
          if (orderShipping > 0) {
            ordersWithShipping++;
            console.log(`📦 ${order.orderName}: $${orderShipping.toFixed(2)} shipping refund`);
          }
          
          if (orderTax > 0) {
            ordersWithTax++;
            console.log(`🏛️  ${order.orderName}: $${orderTax.toFixed(2)} tax refund`);
          }
          
          // Show progress for every 5 orders
          if ((i + 1) % 5 === 0) {
            console.log(`   📊 Progress: ${i + 1}/${ordersWithRefunds.length} orders scanned`);
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 250));
        
      } catch (error) {
        console.log(`   ❌ ${order.orderName}: Error - ${error.message}`);
      }
    }
    
    console.log(`\n📊 SHIPPING & TAX REFUNDS SUMMARY:`);
    console.log(`   🧮 Total transactions: $${totalTransactions.toFixed(2)}`);
    console.log(`   📦 Total shipping refunds: $${totalShippingFound.toFixed(2)}`);
    console.log(`   🏛️  Total tax refunds: $${totalTaxFound.toFixed(2)}`);
    console.log(`   📈 Combined shipping + tax: $${(totalShippingFound + totalTaxFound).toFixed(2)}`);
    console.log(`   📊 Orders with shipping refunds: ${ordersWithShipping}`);
    console.log(`   📊 Orders with tax refunds: ${ordersWithTax}`);
    
    console.log(`\n🎯 COMPARISON TO SHOPIFY ANALYTICS:`);
    console.log(`   Target shipping returned: $230.46`);
    console.log(`   Found shipping refunds: $${totalShippingFound.toFixed(2)}`);
    console.log(`   Shipping gap: $${(230.46 - totalShippingFound).toFixed(2)}`);
    console.log(`   Target taxes returned: $4.26`);
    console.log(`   Found tax refunds: $${totalTaxFound.toFixed(2)}`);
    console.log(`   Tax gap: $${(4.26 - totalTaxFound).toFixed(2)}`);
    
    const projectedTotal = totalTransactions + totalShippingFound + totalTaxFound;
    console.log(`\n🧮 PROJECTED TOTAL WITH SHIPPING/TAX:`);
    console.log(`   Base transactions: $${totalTransactions.toFixed(2)}`);
    console.log(`   + Shipping: $${totalShippingFound.toFixed(2)}`);
    console.log(`   + Tax: $${totalTaxFound.toFixed(2)}`);
    console.log(`   = Projected total: $${projectedTotal.toFixed(2)}`);
    console.log(`   Target (Total returns): $1,514.88`);
    console.log(`   Gap: $${(1514.88 - projectedTotal).toFixed(2)}`);
    console.log(`   Accuracy: ${((projectedTotal / 1514.88) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Search failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findShippingTaxRefunds(); 