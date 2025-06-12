import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAllOrders } from '@/lib/shopify-api'
import { formatShopDomain } from '@/lib/shopify.config'

// Cache for 5 minutes
export const revalidate = 300;

interface ShopifyOrder {
  id: string;
  total_price: string;
  total_tax: string;
  total_shipping_price_set?: {
    shop_money: {
      amount: string;
    };
  };
}

export async function GET(request: NextRequest) {
  console.log('Orders Metrics API - GET request received')
  
  try {
    // Get the store from the database
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

    // Fetch ALL orders for accurate metrics (this endpoint is cached)
    console.log('Orders Metrics API - Fetching ALL orders for accurate metrics calculation')
    const shopifyOrders = (await getAllOrders(formattedDomain, store.accessToken)) as ShopifyOrder[]

    // Calculate comprehensive metrics
    const totalRevenue = shopifyOrders.reduce((sum, order) => sum + parseFloat(order.total_price), 0)
    const totalShippingCosts = shopifyOrders.reduce((sum, order) => {
      const shipping = order.total_shipping_price_set?.shop_money?.amount 
        ? parseFloat(order.total_shipping_price_set.shop_money.amount)
        : 0
      return sum + shipping
    }, 0)
    const totalTaxes = shopifyOrders.reduce((sum, order) => sum + parseFloat(order.total_tax), 0)
    const totalOrdersCount = shopifyOrders.length

    console.log('Orders Metrics API - Calculated comprehensive metrics:', {
      totalRevenue,
      totalShippingCosts,
      totalTaxes,
      totalOrdersCount
    })

    return NextResponse.json({
      metrics: {
        totalRevenue,
        totalShippingCosts,
        totalTaxes,
        totalOrdersCount,
        averageOrderValue: totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0,
        lastUpdated: new Date().toISOString(),
        note: 'Comprehensive metrics calculated from all orders (last 30 days)'
      }
    })
  } catch (error) {
    console.error('Orders Metrics API - Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to calculate metrics', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
} 