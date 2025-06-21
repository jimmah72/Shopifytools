import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Enable caching for 5 minutes
export const revalidate = 300;

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
  totalRefunds: number;
  chargebacks: number;
  paymentGatewayFees: number;
  processingFees: number;
  netRevenue: number;
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
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      case '30d':
      default:
        startDate.setDate(endDate.getDate() - 30)
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
          totalDiscounts: true
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
    const totalDiscounts = orderMetrics._sum.totalDiscounts || 0
    const totalItems = totalItemsData._sum.quantity || 0
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Calculate financial metrics
    // For now, using placeholders for data not yet available from Shopify
    const adSpend = 0 // TODO: Integrate with ad platforms
    const totalRefunds = totalDiscounts // Using discounts as proxy for refunds for now
    const estimatedCOG = totalRevenue * 0.4 // Estimate 40% of revenue as COG
    const estimatedGatewayFees = totalRevenue * 0.029 // ~2.9% standard rate
    const estimatedProcessingFees = totalOrders * 0.30 // ~$0.30 per transaction
    const netRevenue = totalRevenue - totalRefunds - estimatedGatewayFees - estimatedProcessingFees

    // Log detailed net revenue calculations
    console.log('=== NET REVENUE CALCULATION ===')
    console.log(`📊 Total Revenue: $${totalRevenue.toFixed(2)}`)
    console.log(`📊 Total Orders: ${totalOrders}`)
    console.log(``)
    console.log(`🔻 DEDUCTIONS:`)
    console.log(`   💸 Total Refunds (discounts): $${totalRefunds.toFixed(2)}`)
    console.log(`   💳 Gateway Fees (2.9% of revenue): $${estimatedGatewayFees.toFixed(2)} (${totalRevenue.toFixed(2)} × 0.029)`)
    console.log(`   💰 Processing Fees ($0.30 per order): $${estimatedProcessingFees.toFixed(2)} (${totalOrders} × $0.30)`)
    console.log(``)
    console.log(`🧮 CALCULATION:`)
    console.log(`   Net Revenue = $${totalRevenue.toFixed(2)} - $${totalRefunds.toFixed(2)} - $${estimatedGatewayFees.toFixed(2)} - $${estimatedProcessingFees.toFixed(2)}`)
    console.log(`   Net Revenue = $${netRevenue.toFixed(2)}`)
    console.log(``)
    console.log(`📈 SUMMARY:`)
    console.log(`   💚 Net Revenue: $${netRevenue.toFixed(2)}`)
    console.log(`   📉 Total Fees & Refunds: $${(totalRefunds + estimatedGatewayFees + estimatedProcessingFees).toFixed(2)}`)
    console.log(`   📊 Net Margin: ${((netRevenue / totalRevenue) * 100).toFixed(2)}%`)
    console.log('=================================')

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
      overheadCosts: 0, // TODO: Add overhead cost tracking
      shippingCosts: 0, // TODO: Calculate actual shipping costs vs revenue
      miscCosts: 0, // TODO: Add misc cost tracking
      totalRefunds,
      chargebacks: 0, // TODO: Integrate with payment gateway APIs
      paymentGatewayFees: estimatedGatewayFees,
      processingFees: estimatedProcessingFees,
      netRevenue,
      recentOrders,
      dataSource: 'local_database',
      lastSyncTime: syncStatus?.lastSyncAt?.toISOString()
    }

    console.log('Dashboard API - Local metrics calculated:', {
      totalOrders: metrics.totalOrders,
      totalRevenue: metrics.totalRevenue,
      totalProducts: metrics.totalProducts,
      averageOrderValue: metrics.averageOrderValue,
      dataSource: metrics.dataSource,
      lastSyncTime: metrics.lastSyncTime
    })

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Dashboard API - Error:', error)
    
    // Fallback: suggest running a sync if no local data
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Local data not available. Please run an initial sync.',
          suggestion: 'POST to /api/sync to populate local data',
          details: errorMessage
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        details: errorMessage
      },
      { status: 500 }
    )
  }
} 