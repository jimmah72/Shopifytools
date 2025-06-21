import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Disable caching for testing refunds data
// export const revalidate = 300;

interface DashboardMetrics {
  totalSales: number;
  totalOrders: number;
  totalItems: number;
  totalProducts: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalShippingRevenue: number;
  totalTaxes: number;
  // New financial fields
  adSpend: number;
  roas: number;
  poas: number;
  cog: number;
  fees: number;
  overheadCosts: number;
  shippingCosts: number;
  miscCosts: number;
  additionalCosts: number;  // NEW: Dynamic additional costs
  subscriptionCosts: number;  // NEW: Daily subscription costs
  totalRefunds: number;
  chargebacks: number;
  paymentGatewayFees: number;
  processingFees: number;
  netRevenue: number;
  totalDiscounts: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    totalPrice: number;
    createdAt: string;
    customer?: {
      fullName: string;
    };
  }>;
  dataSource: string;
  lastSyncTime?: string;
}

export async function GET(request: NextRequest) {
  console.log('Dashboard API - GET request received (using local data)')
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const timeframe = searchParams.get('timeframe') || '30d'
    
    // Get the first store from the database
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    })

    if (!store) {
      return NextResponse.json(
        { error: 'No store connected. Please connect a Shopify store first.' },
        { status: 404 }
      )
    }

    console.log(`Dashboard API - Querying local Shopify data from database for timeframe: ${timeframe}`)

    // Calculate date range based on timeframe
    const endDate = new Date()
    const startDate = new Date()
    let timeframeDays = 30; // Default for calculations
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        timeframeDays = 7;
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        timeframeDays = 90;
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        timeframeDays = 365;
        break
      case '30d':
      default:
        startDate.setDate(endDate.getDate() - 30)
        timeframeDays = 30;
        break
    }

    // Create date filter for orders
    const dateFilter = {
      storeId: store.id,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }

    // Get fee configuration for this store
    let feeConfig = await (prisma as any).feeConfiguration.findUnique({
      where: { storeId: store.id }
    })

    // Create default fee configuration if none exists
    if (!feeConfig) {
      feeConfig = await (prisma as any).feeConfiguration.create({
        data: {
          storeId: store.id,
          paymentGatewayRate: 0.029,
          processingFeePerOrder: 0.30,
          defaultCogRate: 0.40,
          overheadCostRate: 0.00,
          overheadCostPerOrder: 0.00,
          overheadCostPerItem: 0.00,
          miscCostRate: 0.00,
          miscCostPerOrder: 0.00,
          miscCostPerItem: 0.00,
          chargebackRate: 0.001,
          returnRate: 0.05,
        }
      })
    }

    // Get active additional costs and subscription fees
    const [additionalCostsData, subscriptionFeesData] = await Promise.all([
      (prisma as any).additionalCost.findMany({
        where: { 
          storeId: store.id,
          isActive: true 
        }
      }),
      (prisma as any).subscriptionFee.findMany({
        where: { 
          storeId: store.id,
          isActive: true 
        }
      })
    ]);

    // Get metrics from local database (MUCH faster!)
    const [orderMetrics, productCount, totalItemsData, recentOrdersData, syncStatus] = await Promise.all([
      // Calculate order metrics from local data with date filtering
      (prisma as any).shopifyOrder.aggregate({
        where: dateFilter,
        _count: { id: true },
        _sum: {
          totalPrice: true,
          totalShipping: true,
          totalTax: true,
          totalDiscounts: true,
          totalRefunds: true  // NEW: Get actual refunds
        }
      }),
      
      // Get product count
      (prisma as any).shopifyProduct.count({
        where: { storeId: store.id }
      }),
      
      // Get total items (sum of quantities from line items)
      (prisma as any).shopifyLineItem.aggregate({
        where: {
          order: dateFilter
        },
        _sum: {
          quantity: true
        }
      }),
      
      // Get recent orders (last 5)
      (prisma as any).shopifyOrder.findMany({
        where: { storeId: store.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          orderName: true,
          totalPrice: true,
          createdAt: true,
          customerFirstName: true,
          customerLastName: true
        }
      }),
      
      // Get last sync time for orders
      (prisma as any).syncStatus.findUnique({
        where: {
          storeId_dataType: {
            storeId: store.id,
            dataType: 'orders'
          }
        },
        select: { lastSyncAt: true }
      })
    ])

    // Calculate metrics
    const totalOrders = orderMetrics._count.id
    const totalRevenue = orderMetrics._sum.totalPrice || 0
    const totalShippingRevenue = orderMetrics._sum.totalShipping || 0
    const totalTaxes = orderMetrics._sum.totalTax || 0
    const totalDiscounts = orderMetrics._sum.totalDiscounts || 0  // Keep as separate metric
    const totalRefunds = orderMetrics._sum.totalRefunds || 0      // NEW: Actual refunds
    const totalItems = totalItemsData._sum.quantity || 0
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Calculate financial metrics using configured rates
    const adSpend = 0 // TODO: Integrate with ad platforms
    const estimatedCOG = totalRevenue * feeConfig.defaultCogRate
    const estimatedGatewayFees = totalRevenue * feeConfig.paymentGatewayRate
    const estimatedProcessingFees = totalOrders * feeConfig.processingFeePerOrder
    
    // DEPRECATED: Old overhead/misc costs (still keep for backward compatibility but set to 0)
    const overheadCosts = 0;
    const miscCosts = 0;
    
    // NEW: Calculate dynamic additional costs
    let additionalCosts = 0;
    for (const cost of additionalCostsData) {
      // Percentage-based costs
      additionalCosts += totalRevenue * (cost.percentagePerOrder / 100);
      additionalCosts += totalItems * totalRevenue * (cost.percentagePerItem / 100);
      
      // Flat rate costs
      additionalCosts += totalOrders * cost.flatRatePerOrder;
      additionalCosts += totalItems * cost.flatRatePerItem;
    }
    
    // NEW: Calculate subscription costs for timeframe
    const subscriptionCosts = subscriptionFeesData.reduce((total: number, fee: any) => {
      return total + (fee.dailyRate * timeframeDays);
    }, 0);
    
    const estimatedChargebacks = totalRevenue * feeConfig.chargebackRate
    const netRevenue = totalRevenue - totalRefunds - estimatedGatewayFees - estimatedProcessingFees

    // Log detailed net revenue calculations
    console.log('=== NET REVENUE CALCULATION (Using Configured Rates + Dynamic Costs) ===')
    console.log(`📊 Total Revenue: $${totalRevenue.toFixed(2)}`)
    console.log(`📊 Total Orders: ${totalOrders}`)
    console.log(`📊 Total Items: ${totalItems}`)
    console.log(`📊 Timeframe: ${timeframeDays} days`)
    console.log(`📊 Total Discounts (coupons/promos): $${totalDiscounts.toFixed(2)}`)
    console.log(``)
    console.log(`⚙️  CONFIGURED RATES:`)
    console.log(`   💳 Gateway Rate: ${(feeConfig.paymentGatewayRate * 100).toFixed(2)}%`)
    console.log(`   💰 Processing Fee: $${feeConfig.processingFeePerOrder}`)
    console.log(`   📦 COG Rate: ${(feeConfig.defaultCogRate * 100).toFixed(1)}%`)
    console.log(``)
    console.log(`🔧 DYNAMIC COSTS:`)
    console.log(`   📊 Additional Costs (${additionalCostsData.length} active): $${additionalCosts.toFixed(2)}`)
    additionalCostsData.forEach((cost: any) => {
      const costTotal = (totalRevenue * cost.percentagePerOrder / 100) + 
                       (totalItems * totalRevenue * cost.percentagePerItem / 100) +
                       (totalOrders * cost.flatRatePerOrder) + 
                       (totalItems * cost.flatRatePerItem);
      console.log(`     - ${cost.name}: $${costTotal.toFixed(2)}`)
    });
    console.log(`   💼 Subscription Costs (${subscriptionFeesData.length} active): $${subscriptionCosts.toFixed(2)}`)
    subscriptionFeesData.forEach((fee: any) => {
      const feeCost = fee.dailyRate * timeframeDays;
      console.log(`     - ${fee.name}: $${feeCost.toFixed(2)} (${fee.billingType}: $${fee.dailyRate.toFixed(2)}/day × ${timeframeDays} days)`)
    });
    console.log(``)
    console.log(`🔻 DEDUCTIONS:`)
    console.log(`   💸 Total Refunds (actual): $${totalRefunds.toFixed(2)}`)
    console.log(`   💳 Gateway Fees (${(feeConfig.paymentGatewayRate * 100).toFixed(2)}%): $${estimatedGatewayFees.toFixed(2)}`)
    console.log(`   💰 Processing Fees ($${feeConfig.processingFeePerOrder} × ${totalOrders}): $${estimatedProcessingFees.toFixed(2)}`)
    console.log(``)
    console.log(`🧮 CALCULATION:`)
    console.log(`   Net Revenue = $${totalRevenue.toFixed(2)} - $${totalRefunds.toFixed(2)} - $${estimatedGatewayFees.toFixed(2)} - $${estimatedProcessingFees.toFixed(2)}`)
    console.log(`   Net Revenue = $${netRevenue.toFixed(2)}`)
    console.log(``)
    console.log(`📈 SUMMARY:`)
    console.log(`   💚 Net Revenue: $${netRevenue.toFixed(2)}`)
    console.log(`   📉 Total Fees & Refunds: $${(totalRefunds + estimatedGatewayFees + estimatedProcessingFees).toFixed(2)}`)
    console.log(`   📊 Net Margin: ${((netRevenue / totalRevenue) * 100).toFixed(2)}%`)
    console.log(`   📦 Estimated COG: $${estimatedCOG.toFixed(2)} (${(feeConfig.defaultCogRate * 100).toFixed(1)}%)`)
    console.log(`   🏗️  Additional Costs: $${additionalCosts.toFixed(2)}`)
    console.log(`   💼 Subscription Costs: $${subscriptionCosts.toFixed(2)}`)
    console.log(`   🎟️  Total Discounts (not deducted): $${totalDiscounts.toFixed(2)}`)
    console.log('========================================================')

    // Calculate ROAS and POAS (require ad spend data)
    const roas = adSpend > 0 ? totalRevenue / adSpend : 0
    const poas = adSpend > 0 ? (totalRevenue - estimatedCOG - estimatedGatewayFees - estimatedProcessingFees) / adSpend : 0

    // Format recent orders
    const recentOrders = recentOrdersData.map((order: any) => ({
      id: order.id,
      orderNumber: order.orderName,
      totalPrice: order.totalPrice,
      createdAt: order.createdAt.toISOString(),
      customer: (order.customerFirstName || order.customerLastName) ? {
        fullName: `${order.customerFirstName || ''} ${order.customerLastName || ''}`.trim()
      } : undefined
    }))

    const metrics: DashboardMetrics = {
      totalSales: totalRevenue,
      totalOrders,
      totalItems,
      totalProducts: productCount,
      totalRevenue,
      averageOrderValue,
      totalShippingRevenue,
      totalTaxes,
      // New financial fields
      adSpend,
      roas,
      poas,
      cog: estimatedCOG,
      fees: estimatedGatewayFees + estimatedProcessingFees,
      overheadCosts, // DEPRECATED - now always 0
      shippingCosts: 0, // REMOVED - will be handled by shipping API integration
      miscCosts, // DEPRECATED - now always 0
      additionalCosts, // NEW: Dynamic additional costs
      subscriptionCosts, // NEW: Daily subscription costs for timeframe
      totalRefunds,  // NOW USING ACTUAL REFUNDS
      chargebacks: estimatedChargebacks, // NOW USING CONFIGURED RATE
      paymentGatewayFees: estimatedGatewayFees,
      processingFees: estimatedProcessingFees,
      netRevenue,
      totalDiscounts,  // NEW: Include discounts in response
      recentOrders,
      dataSource: 'local_database',
      lastSyncTime: syncStatus?.lastSyncAt?.toISOString()
    }

    console.log('Dashboard API - Local metrics calculated:', {
      totalOrders,
      totalRevenue,
      totalProducts: productCount,
      averageOrderValue,
      dataSource: 'local_database',
      lastSyncTime: syncStatus?.lastSyncAt?.toISOString()
    })

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Dashboard API - Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    )
  }
} 