import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBulkShippingCosts, calculateTotalShippingCost } from '@/lib/shipping-db'

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
  netProfit: number;  // NEW: Net profit after all costs
  totalDiscounts: number;
  // NEW: Shipping calculation metadata
  shippingCalculationMethod?: string;
  shippingCoverage?: number;
  averageShippingCost?: number;
  ordersWithShippingData?: number;
  ordersMissingShippingData?: number;
  // COG calculation metadata
  itemsWithCostData?: number;
  totalLineItems?: number;
  cogCoveragePercent?: number;
  // Ad spend metadata
  adSpendPlatforms?: string[];
  adSpendCampaigns?: number;
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
    const fulfillmentStatus = searchParams.get('fulfillmentStatus') || 'all'
    
    // ✅ FIX: Use smart store selection (prioritize active stores with real tokens)
    console.log('Dashboard API - Finding store with real connection')
    
    // First, try to find a store with a real access token (not placeholder)
    let store = await prisma.store.findFirst({
      where: {
        accessToken: {
          not: 'pending-setup'
        }
      },
      select: { id: true, domain: true, accessToken: true },
      orderBy: {
        updatedAt: 'desc' // Get the most recently updated store
      }
    })

    // Last resort: any store at all
    if (!store) {
      console.log('Dashboard API - No store with real token found, trying any store')
      store = await prisma.store.findFirst({
        select: { id: true, domain: true, accessToken: true },
        orderBy: {
          updatedAt: 'desc'
        }
      })
    }

    console.log('Dashboard API - Selected store:', { id: store?.id, domain: store?.domain })

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

    // Create date filter for orders with optional fulfillment status filtering
    const dateFilter: any = {
      storeId: store.id,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }

    // Add fulfillment status filter if specified
    if (fulfillmentStatus !== 'all') {
      // Map frontend filter values to actual database values
      if (fulfillmentStatus === 'unfulfilled') {
        dateFilter.fulfillmentStatus = null  // Database stores unfulfilled as actual null
      } else {
        dateFilter.fulfillmentStatus = fulfillmentStatus
      }
    }

    console.log(`Dashboard API - Filtering by fulfillment status: ${fulfillmentStatus}`)

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

    // Get additional costs and subscription fees
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

    // ✅ NEW: Get actual ad spend data for the timeframe
    console.log('Dashboard API - Fetching ad spend data for timeframe...');
    const adSpendData = await prisma.adSpend.findMany({
      where: {
        storeId: store.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const totalAdSpend = adSpendData.reduce((sum, record) => sum + record.amount, 0);
    const adSpendPlatforms = [...new Set(adSpendData.map(record => record.platform))];
    const adSpendCampaigns = [...new Set(adSpendData.map((record: any) => record.campaign).filter(Boolean))].length;

    console.log(`Dashboard API - Ad spend calculation:`);
    console.log(`   💰 Total ad spend: $${totalAdSpend.toFixed(2)}`);
    console.log(`   📱 Platforms: ${adSpendPlatforms.join(', ') || 'none'}`);
    console.log(`   📊 Campaigns: ${adSpendCampaigns}`);
    console.log(`   📅 Records found: ${adSpendData.length}`);

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
      
      // Get recent orders (last 5 from filtered dataset)
      (prisma as any).shopifyOrder.findMany({
        where: dateFilter,
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

    // ✅ NEW: Get actual shipping costs from second database for filtered orders
    console.log('Dashboard API - Fetching shipping costs from second database...');
    let actualShippingCosts = 0;
    let shippingCostsCoverage = 0;
    let averageShippingCost = 0;
    let shippingCalculationMethod = 'none';
    let ordersWithShippingData = 0;
    let ordersMissingShippingData = 0;
    
    try {
      // Get order names for the filtered period
      const ordersForShipping = await (prisma as any).shopifyOrder.findMany({
        where: dateFilter,
        select: { orderName: true }
      });
      
      const orderNames = ordersForShipping.map((order: any) => order.orderName);
      
      if (orderNames.length > 0) {
        // Fetch shipping costs in bulk from second database (filtered by fulfillment status)
        const shippingCostsData = await getBulkShippingCosts(orderNames, fulfillmentStatus);
        
        // Calculate actual shipping costs from available data
        const shippingCostsArray: number[] = [];
        Object.values(shippingCostsData).forEach(shippingCosts => {
          const orderShippingCost = calculateTotalShippingCost(shippingCosts);
          if (orderShippingCost > 0) {
            shippingCostsArray.push(orderShippingCost);
          }
          actualShippingCosts += orderShippingCost;
        });
        
        // Calculate coverage and average
        ordersWithShippingData = Object.keys(shippingCostsData).length;
        ordersMissingShippingData = orderNames.length - ordersWithShippingData;
        shippingCostsCoverage = orderNames.length > 0 ? (ordersWithShippingData / orderNames.length) * 100 : 0;
        
        // Calculate average shipping cost from available data for fallback
        if (shippingCostsArray.length > 0) {
          averageShippingCost = shippingCostsArray.reduce((sum, cost) => sum + cost, 0) / shippingCostsArray.length;
          
          // Apply average to orders missing shipping data (for display purposes only)
          if (ordersMissingShippingData > 0) {
            const estimatedMissingCosts = ordersMissingShippingData * averageShippingCost;
            actualShippingCosts += estimatedMissingCosts;
            shippingCalculationMethod = 'hybrid';
            
            console.log(`Dashboard API - Shipping cost calculation:`);
            console.log(`   📦 Orders with actual data: ${ordersWithShippingData} ($${(actualShippingCosts - estimatedMissingCosts).toFixed(2)})`);
            console.log(`   📊 Orders missing data: ${ordersMissingShippingData}`);
            console.log(`   🧮 Average cost per order: $${averageShippingCost.toFixed(2)}`);
            console.log(`   📈 Estimated missing costs: $${estimatedMissingCosts.toFixed(2)}`);
            console.log(`   💰 Total shipping costs: $${actualShippingCosts.toFixed(2)} (${shippingCostsCoverage.toFixed(1)}% actual data + ${((ordersMissingShippingData / orderNames.length) * 100).toFixed(1)}% estimated)`);
          } else {
            shippingCalculationMethod = 'actual';
            console.log(`Dashboard API - Shipping costs: $${actualShippingCosts.toFixed(2)} (100% actual data from 2nd DB)`);
          }
        } else {
          shippingCalculationMethod = 'none';
          console.log(`Dashboard API - No shipping cost data available for timeframe`);
        }
      }
    } catch (shippingError) {
      console.warn('Dashboard API - Could not fetch shipping costs from second database:', shippingError);
      actualShippingCosts = 0;
      shippingCostsCoverage = 0;
      shippingCalculationMethod = 'error';
    }

    // ✅ FIXED: Calculate ACTUAL COG from our synced product data using efficient join
    console.log('Dashboard API - Calculating actual COG from local product cost data...');
    
    // Use raw SQL for efficient calculation with proper filtering
    let cogCalculation;
    if (fulfillmentStatus !== 'all') {
      // Map fulfillment status for SQL query
      const sqlFulfillmentStatus = fulfillmentStatus === 'unfulfilled' ? null : fulfillmentStatus;
      
      cogCalculation = await (prisma as any).$queryRaw`
        SELECT 
          SUM(li.quantity * COALESCE(spv."costPerItem", 0)) as actual_cog,
          COUNT(*) as total_line_items,
          COUNT(CASE WHEN spv."costPerItem" > 0 THEN 1 END) as items_with_costs
        FROM "ShopifyLineItem" li
        INNER JOIN "ShopifyOrder" so ON li."orderId" = so.id  
        LEFT JOIN "ShopifyProductVariant" spv ON li."variantId" = spv.id
        WHERE so."storeId" = ${store.id}
          AND so."createdAt" >= ${startDate}
          AND so."createdAt" <= ${endDate}
          AND so."fulfillmentStatus" = ${sqlFulfillmentStatus}
      `;
    } else {
      cogCalculation = await (prisma as any).$queryRaw`
        SELECT 
          SUM(li.quantity * COALESCE(spv."costPerItem", 0)) as actual_cog,
          COUNT(*) as total_line_items,
          COUNT(CASE WHEN spv."costPerItem" > 0 THEN 1 END) as items_with_costs
        FROM "ShopifyLineItem" li
        INNER JOIN "ShopifyOrder" so ON li."orderId" = so.id  
        LEFT JOIN "ShopifyProductVariant" spv ON li."variantId" = spv.id
        WHERE so."storeId" = ${store.id}
          AND so."createdAt" >= ${startDate}
          AND so."createdAt" <= ${endDate}
      `;
    }
    
    const result = cogCalculation[0];
    const actualCOG = parseFloat(result.actual_cog || '0');
    const totalLineItems = parseInt(result.total_line_items || '0');
    const itemsWithCosts = parseInt(result.items_with_costs || '0');
    const cogCoveragePercent = totalLineItems > 0 ? (itemsWithCosts / totalLineItems) * 100 : 0;
    
    const estimatedCOG = totalRevenue * feeConfig.defaultCogRate; // Keep as fallback
    
    // Use actual COG if we have cost data, otherwise fall back to estimate
    const finalCOG = actualCOG > 0 ? actualCOG : estimatedCOG;
    
    console.log('Dashboard API - COG calculation:', {
      actualCOG: actualCOG.toFixed(2),
      estimatedCOG: estimatedCOG.toFixed(2), 
      finalCOG: finalCOG.toFixed(2),
      itemsWithCosts: itemsWithCosts,
      totalLineItems: totalLineItems,
      coveragePercent: cogCoveragePercent.toFixed(1) + '%',
      usingActual: actualCOG > 0,
      dataSource: actualCOG > 0 ? 'local_database_actual_costs' : 'estimated_cog_rate'
    });

    // Calculate financial metrics using configured rates and ACTUAL ad spend
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
    
    // ✅ FIXED: Calculate net profit including ad spend in deductions
    const netProfit = totalRevenue - totalRefunds - estimatedGatewayFees - estimatedProcessingFees - finalCOG - additionalCosts - subscriptionCosts - actualShippingCosts - totalAdSpend

    // Log detailed net revenue calculations
    console.log('=== NET REVENUE CALCULATION (Using Configured Rates + Dynamic Costs + Ad Spend) ===')
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
    console.log(`   📱 Ad Spend (${adSpendPlatforms.length} platforms): $${totalAdSpend.toFixed(2)}`)
    adSpendPlatforms.forEach(platform => {
      const platformSpend = adSpendData.filter(record => record.platform === platform).reduce((sum, record) => sum + record.amount, 0);
      console.log(`     - ${platform}: $${platformSpend.toFixed(2)}`)
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
    console.log(`   Net Profit = Net Revenue - COG - Additional Costs - Subscription Costs - Shipping - Ad Spend`)
    console.log(`   Net Profit = $${netRevenue.toFixed(2)} - $${finalCOG.toFixed(2)} - $${additionalCosts.toFixed(2)} - $${subscriptionCosts.toFixed(2)} - $${actualShippingCosts.toFixed(2)} - $${totalAdSpend.toFixed(2)}`)
    console.log(`   Net Profit = $${netProfit.toFixed(2)}`)
    console.log(``)
    console.log(`📈 SUMMARY:`)
    console.log(`   💚 Net Revenue: $${netRevenue.toFixed(2)}`)
    console.log(`   💰 Net Profit: $${netProfit.toFixed(2)}`)
    console.log(`   📉 Total Fees & Refunds: $${(totalRefunds + estimatedGatewayFees + estimatedProcessingFees).toFixed(2)}`)
    console.log(`   📊 Net Margin: ${((netRevenue / totalRevenue) * 100).toFixed(2)}%`)
    console.log(`   🎯 Profit Margin: ${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0}%`)
    console.log(`   📦 ${actualCOG > 0 ? 'Actual' : 'Estimated'} COG: $${finalCOG.toFixed(2)} ${actualCOG > 0 ? '(from local database)' : `(${(feeConfig.defaultCogRate * 100).toFixed(1)}% estimate)`}`)
    console.log(`   🏗️  Additional Costs: $${additionalCosts.toFixed(2)}`)
    console.log(`   💼 Subscription Costs: $${subscriptionCosts.toFixed(2)}`)
    console.log(`   🚚 Shipping Costs: $${actualShippingCosts.toFixed(2)} (${
      shippingCalculationMethod === 'actual' ? '100% actual data from 2nd DB' :
      shippingCalculationMethod === 'hybrid' ? `${shippingCostsCoverage.toFixed(1)}% actual + ${(100 - shippingCostsCoverage).toFixed(1)}% estimated from avg` :
      shippingCalculationMethod === 'none' ? 'no data available' :
      'error fetching data'
    })`)
    console.log(`   📱 Ad Spend: $${totalAdSpend.toFixed(2)} (${adSpendData.length} records from ${adSpendPlatforms.length} platforms)`)
    console.log(`   📋 Fulfillment Filter: ${fulfillmentStatus}`)
    console.log(`   🎟️  Total Discounts (not deducted): $${totalDiscounts.toFixed(2)}`)
    console.log('========================================================')

    // Calculate ROAS and POAS (now with actual ad spend data)
    const roas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0
    const poas = totalAdSpend > 0 ? netProfit / totalAdSpend : 0

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
      // Updated financial fields with actual ad spend
      adSpend: totalAdSpend,
      roas,
      poas,
      cog: finalCOG,
      fees: estimatedGatewayFees + estimatedProcessingFees,
      overheadCosts,
      shippingCosts: actualShippingCosts,
      miscCosts,
      additionalCosts,
      subscriptionCosts,
      totalRefunds,
      chargebacks: estimatedChargebacks,
      paymentGatewayFees: estimatedGatewayFees,
      processingFees: estimatedProcessingFees,
      netRevenue,
      netProfit,
      totalDiscounts,
      // Shipping metadata
      shippingCalculationMethod,
      shippingCoverage: shippingCostsCoverage,
      averageShippingCost,
      ordersWithShippingData,
      ordersMissingShippingData,
      // COG metadata
      itemsWithCostData: itemsWithCosts,
      totalLineItems,
      cogCoveragePercent,
      // Ad spend metadata  
      adSpendPlatforms,
      adSpendCampaigns,
      recentOrders,
      dataSource: 'local_database',
      lastSyncTime: syncStatus?.lastSyncAt?.toISOString()
    }

    console.log('Dashboard API - Local metrics calculated:', {
      totalOrders,
      totalRevenue,
      totalProducts: productCount,
      averageOrderValue,
      adSpend: totalAdSpend,
      roas: roas.toFixed(2),
      poas: poas.toFixed(2),
      netProfit,
      dataSource: 'local_database',
      lastSyncTime: syncStatus?.lastSyncAt?.toISOString()
    })

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Dashboard API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 