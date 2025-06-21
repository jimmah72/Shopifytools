#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showRefundedExample() {
  const refundedOrder = await prisma.shopifyOrder.findFirst({
    where: { totalRefunds: { gt: 0 } },
    select: { 
      orderName: true, 
      totalPrice: true, 
      totalDiscounts: true, 
      totalRefunds: true, 
      financialStatus: true 
    }
  });

  console.log('🔍 REFUNDED ORDER EXAMPLE:');
  console.log('Order:', refundedOrder.orderName, '(' + refundedOrder.financialStatus + ')');
  console.log('Customer originally paid:', '$' + refundedOrder.totalPrice.toFixed(2));
  console.log('Discounts applied:', '$' + refundedOrder.totalDiscounts.toFixed(2));
  console.log('Amount refunded:', '$' + refundedOrder.totalRefunds.toFixed(2));
  console.log('Net revenue impact:', '$' + (refundedOrder.totalPrice - refundedOrder.totalRefunds).toFixed(2));
  console.log('Gross order value was:', '$' + (refundedOrder.totalPrice + refundedOrder.totalDiscounts).toFixed(2));
  
  await prisma.$disconnect();
}

showRefundedExample(); 