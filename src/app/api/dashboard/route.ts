import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAllOrders, getAllProducts } from '@/lib/shopify-api'
import { formatShopDomain } from '@/lib/shopify.config'

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface DashboardMetrics {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalShippingCosts: number;
  totalTaxes: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    totalPrice: number;
    createdAt: string;
    customer?: {
      fullName: string;
    };
  }>;
}

export async function GET(request: NextRequest) {
  console.log('Dashboard API - GET request received')
  try {
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

    if (!store.domain || !store.accessToken) {
      return NextResponse.json(
        { error: 'Store configuration is incomplete. Please reconnect your Shopify store.' },
        { status: 500 }
      )
    }

    // Format the store domain
    const formattedDomain = formatShopDomain(store.domain)

    // Fetch orders and products in parallel for better performance
    console.log('Dashboard API - Fetching orders and products from Shopify')
    
    const [ordersData, productsData] = await Promise.all([
      getAllOrders(formattedDomain, store.accessToken),
      getAllProducts(formattedDomain, store.accessToken)
    ])

    console.log('Dashboard API - Orders fetched:', ordersData.length)
    console.log('Dashboard API - Products fetched:', productsData.length)

    // Calculate metrics from orders
    const totalOrders = ordersData.length
    const totalRevenue = ordersData.reduce((sum: number, order: any) => sum + parseFloat(order.total_price), 0)
    const totalShippingCosts = ordersData.reduce((sum: number, order: any) => {
      const shipping = order.total_shipping_price_set?.shop_money?.amount;
      return sum + (shipping ? parseFloat(shipping) : 0);
    }, 0)
    const totalTaxes = ordersData.reduce((sum: number, order: any) => sum + parseFloat(order.total_tax), 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Format recent orders (last 5)
    const recentOrders = ordersData
      .slice(0, 5)
      .map((order: any) => ({
        id: order.id,
        orderNumber: order.name,
        totalPrice: parseFloat(order.total_price),
        createdAt: order.created_at,
        customer: order.customer ? {
          fullName: `${order.customer.first_name} ${order.customer.last_name}`.trim()
        } : undefined
      }))

    const metrics: DashboardMetrics = {
      totalSales: totalRevenue, // Same as revenue for now
      totalOrders,
      totalProducts: productsData.length,
      totalRevenue,
      averageOrderValue,
      totalShippingCosts,
      totalTaxes,
      recentOrders
    }

    console.log('Dashboard API - Metrics calculated:', {
      totalOrders: metrics.totalOrders,
      totalRevenue: metrics.totalRevenue,
      totalProducts: metrics.totalProducts,
      averageOrderValue: metrics.averageOrderValue
    })

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Dashboard API - Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 