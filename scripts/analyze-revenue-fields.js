#!/usr/bin/env node

/**
 * Analyze Revenue Fields
 * 
 * This script examines sample orders to understand exactly what Shopify's
 * total_price and total_discounts fields represent in relation to refunds
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeRevenueFields() {
  console.log('🔍 Analyzing revenue fields in Shopify orders...');
  
  try {
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });

    if (!store) {
      console.error('❌ No store found');
      return;
    }

    // Get sample orders with different statuses and discount/refund scenarios
    console.log('\n📄 SAMPLE ORDERS ANALYSIS:');
    
    const sampleOrders = await prisma.shopifyOrder.findMany({
      where: { storeId: store.id },
      select: { 
        id: true, 
        orderName: true, 
        financialStatus: true,
        totalPrice: true,
        totalDiscounts: true,
        totalRefunds: true,
        totalTax: true,
        totalShipping: true
      },
      orderBy: { orderName: 'desc' },
      take: 10
    });

    sampleOrders.forEach((order) => {
      console.log(`\n📋 Order ${order.orderName} (${order.financialStatus}):`);
      console.log(`   💰 Total Price: $${order.totalPrice.toFixed(2)}`);
      console.log(`   🎟️  Total Discounts: $${order.totalDiscounts.toFixed(2)}`);
      console.log(`   💸 Total Refunds: $${order.totalRefunds.toFixed(2)}`);
      console.log(`   🚚 Total Shipping: $${order.totalShipping.toFixed(2)}`);
      console.log(`   📊 Total Tax: $${order.totalTax.toFixed(2)}`);
      
      // Calculate what the gross order value would be if total_price excludes discounts
      const grossIfPriceExcludesDiscounts = order.totalPrice + order.totalDiscounts;
      console.log(`   🧮 IF total_price excludes discounts, gross = $${grossIfPriceExcludesDiscounts.toFixed(2)}`);
      
      // Calculate net revenue under different scenarios
      const netRevenueScenario1 = order.totalPrice - order.totalRefunds; // If total_price already net of discounts
      const netRevenueScenario2 = (order.totalPrice + order.totalDiscounts) - order.totalDiscounts - order.totalRefunds; // If total_price is gross
      
      console.log(`   📈 Net Revenue (Scenario 1 - price already net): $${netRevenueScenario1.toFixed(2)}`);
      console.log(`   📈 Net Revenue (Scenario 2 - price is gross): $${netRevenueScenario2.toFixed(2)}`);
    });

    // Now let's fetch a few orders directly from Shopify to compare
    console.log('\n🔍 DIRECT SHOPIFY API COMPARISON:');
    
    const shopDomain = store.domain.replace('.myshopify.com', '');
    const testOrder = sampleOrders[0];
    
    if (testOrder) {
      console.log(`\n📡 Fetching order ${testOrder.orderName} directly from Shopify...`);
      
      const url = `https://${shopDomain}.myshopify.com/admin/api/2025-04/orders/${testOrder.id}.json`;
      
      try {
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': store.accessToken,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const order = data.order;
          
          console.log(`\n📊 SHOPIFY RAW DATA for ${testOrder.orderName}:`);
          console.log(`   total_price: $${parseFloat(order.total_price).toFixed(2)}`);
          console.log(`   subtotal_price: $${parseFloat(order.subtotal_price || '0').toFixed(2)}`);
          console.log(`   total_discounts: $${parseFloat(order.total_discounts || '0').toFixed(2)}`);
          console.log(`   total_tax: $${parseFloat(order.total_tax || '0').toFixed(2)}`);
          console.log(`   total_shipping: $${parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0').toFixed(2)}`);
          console.log(`   financial_status: ${order.financial_status}`);
          
          // Check line items for more detail
          if (order.line_items && order.line_items.length > 0) {
            console.log(`\n📦 LINE ITEMS BREAKDOWN:`);
            let lineItemTotal = 0;
            let lineItemDiscounts = 0;
            
            order.line_items.forEach((item, i) => {
              const itemTotal = parseFloat(item.price) * item.quantity;
              const itemDiscount = parseFloat(item.total_discount || '0');
              lineItemTotal += itemTotal;
              lineItemDiscounts += itemDiscount;
              
              console.log(`   ${i + 1}. ${item.title}`);
              console.log(`      Price: $${parseFloat(item.price).toFixed(2)} × ${item.quantity} = $${itemTotal.toFixed(2)}`);
              console.log(`      Discount: $${itemDiscount.toFixed(2)}`);
              console.log(`      Net: $${(itemTotal - itemDiscount).toFixed(2)}`);
            });
            
            console.log(`\n🧮 CALCULATION VERIFICATION:`);
            console.log(`   Line items total: $${lineItemTotal.toFixed(2)}`);
            console.log(`   Line items discounts: $${lineItemDiscounts.toFixed(2)}`);
            console.log(`   Line items net: $${(lineItemTotal - lineItemDiscounts).toFixed(2)}`);
            console.log(`   + Tax: $${parseFloat(order.total_tax || '0').toFixed(2)}`);
            console.log(`   + Shipping: $${parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0').toFixed(2)}`);
            console.log(`   = Expected total_price: $${(lineItemTotal - lineItemDiscounts + parseFloat(order.total_tax || '0') + parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0')).toFixed(2)}`);
            console.log(`   Actual total_price: $${parseFloat(order.total_price).toFixed(2)}`);
            
            // Determine the relationship
            const expectedTotal = lineItemTotal - lineItemDiscounts + parseFloat(order.total_tax || '0') + parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0');
            const actualTotal = parseFloat(order.total_price);
            const difference = Math.abs(expectedTotal - actualTotal);
            
            if (difference < 0.01) {
              console.log(`\n✅ CONCLUSION: total_price = line_items_net + tax + shipping`);
              console.log(`   This means total_price ALREADY EXCLUDES discounts!`);
              console.log(`   Discounts are applied before calculating total_price.`);
            } else {
              console.log(`\n❓ DISCREPANCY: Expected ${expectedTotal.toFixed(2)}, got ${actualTotal.toFixed(2)}`);
            }
          }
        }
      } catch (error) {
        console.log(`   ❌ Error fetching from Shopify: ${error.message}`);
      }
    }

    // Summary of implications
    console.log(`\n📋 ACCOUNTING IMPLICATIONS:`);
    console.log(`\n🔍 If total_price EXCLUDES discounts (likely):`);
    console.log(`   ✅ Our current calculation is CORRECT`);
    console.log(`   ✅ Total Revenue = sum of total_price (already net of discounts)`);
    console.log(`   ✅ Show total_discounts separately for transparency`);
    console.log(`   ✅ Subtract refunds from total_price for net revenue`);
    console.log(`   ✅ For canceled orders: original sale amount - refund amount = $0 net`);
    
    console.log(`\n🔍 If total_price INCLUDES discounts (unlikely):`);
    console.log(`   ❌ We would need to subtract discounts from revenue`);
    console.log(`   ❌ Risk of double-counting discounts`);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeRevenueFields(); 