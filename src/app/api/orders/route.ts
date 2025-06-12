import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrders } from '@/lib/shopify-api'
import { formatShopDomain } from '@/lib/shopify.config'

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface ShopifyOrder {
  id: string;
  order_number: string;
  name: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  shipping_address: {
    first_name: string;
    last_name: string;
    address1: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  } | null;
  line_items: Array<{
    id: string;
    product_id: string | null;
    variant_id: string | null;
    title: string;
    quantity: number;
    price: string;
    total_discount: string;
  }>;
  total_shipping_price_set?: {
    shop_money: {
      amount: string;
      currency_code: string;
    };
  };
  gateway?: string;
  processing_method?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('Orders API - GET request received')
  
  // Add timeout protection
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout - orders taking too long to fetch')), 25000) // 25 second timeout
  });

  try {
    const result = await Promise.race([
      fetchOrdersWithTimeout(request),
      timeoutPromise
    ]);
    
    return result;
  } catch (error) {
    console.error('Orders API - Error or timeout:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch orders', 
        details: error instanceof Error ? error.message : 'Request timeout or server error',
        isTimeout: error instanceof Error && error.message.includes('timeout')
      },
      { status: 500 }
    )
  }
}

async function fetchOrdersWithTimeout(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20') // Reduced default limit
  const status = searchParams.get('status') || 'any'
  const financial_status = searchParams.get('financial_status') || ''
  const fulfillment_status = searchParams.get('fulfillment_status') || ''
  const created_at_min = searchParams.get('created_at_min') || ''
  const created_at_max = searchParams.get('created_at_max') || ''

  console.log('Orders API - Query parameters:', {
    page,
    limit,
    status,
    financial_status,
    fulfillment_status,
    created_at_min,
    created_at_max,
  })

  // Get the store from the database
  console.log('Orders API - Fetching store from database')
  const store = await prisma.store.findFirst({
    select: { id: true, domain: true, accessToken: true }
  })

  console.log('Orders API - Store found:', store ? { domain: store.domain } : null)

  if (!store) {
    console.log('Orders API - No store found')
    return NextResponse.json(
      { error: 'No store connected. Please connect a Shopify store first.' },
      { status: 404 }
    )
  }

  if (!store.domain || !store.accessToken) {
    console.error('Orders API - Store missing domain or access token')
    return NextResponse.json(
      { error: 'Store configuration is incomplete. Please reconnect your Shopify store.' },
      { status: 500 }
    )
  }

  // Format the store domain
  const formattedDomain = formatShopDomain(store.domain)
  console.log('Orders API - Formatted domain:', formattedDomain)

  // Calculate date range for last 30 days if not provided
  const now = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const effectiveCreatedAtMin = created_at_min || thirtyDaysAgo.toISOString()
  const effectiveCreatedAtMax = created_at_max || now.toISOString()

  // Fetch orders using pagination - only get what we need for current page
  console.log('Orders API - Fetching orders for current page only')
  
  // For now, we'll fetch a larger batch and do client-side pagination
  // This is a compromise between performance and accuracy
  const fetchLimit = Math.min(limit * 5, 250) // Fetch 5 pages worth or max 250
  
  const shopifyOrders = (await getOrders(formattedDomain, store.accessToken, {
    limit: fetchLimit,
    status: status !== 'any' ? status : undefined,
    financial_status: financial_status || undefined,
    fulfillment_status: fulfillment_status || undefined,
    created_at_min: effectiveCreatedAtMin,
    created_at_max: effectiveCreatedAtMax,
  })) as ShopifyOrder[]

  console.log('Orders API - Shopify orders fetched:', shopifyOrders.length)

  // Transform Shopify orders to our format
  const orders = shopifyOrders.map((order: ShopifyOrder) => {
    const shippingCost = order.total_shipping_price_set?.shop_money?.amount 
      ? parseFloat(order.total_shipping_price_set.shop_money.amount)
      : 0

    return {
      id: order.id,
      orderNumber: order.name, // Shopify uses 'name' for the display order number like #1001
      shopifyOrderId: order.id,
      shopifyOrderNumber: order.order_number.toString(),
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at),
      totalPrice: parseFloat(order.total_price),
      subtotalPrice: parseFloat(order.subtotal_price),
      totalTax: parseFloat(order.total_tax),
      shippingCost,
      currency: order.currency,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
      customer: order.customer ? {
        id: order.customer.id,
        firstName: order.customer.first_name,
        lastName: order.customer.last_name,
        email: order.customer.email,
        fullName: `${order.customer.first_name} ${order.customer.last_name}`.trim()
      } : null,
      shippingAddress: order.shipping_address ? {
        firstName: order.shipping_address.first_name,
        lastName: order.shipping_address.last_name,
        address1: order.shipping_address.address1,
        city: order.shipping_address.city,
        province: order.shipping_address.province,
        country: order.shipping_address.country,
        zip: order.shipping_address.zip
      } : null,
      lineItems: order.line_items.map(item => ({
        id: item.id,
        productId: item.product_id,
        variantId: item.variant_id,
        title: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price),
        totalDiscount: parseFloat(item.total_discount)
      })),
      itemsCount: order.line_items.reduce((sum, item) => sum + item.quantity, 0),
      gateway: order.gateway || 'unknown',
      processingMethod: order.processing_method || 'unknown'
    }
  })

  // Calculate metrics for returned orders
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0)
  const totalShippingCosts = orders.reduce((sum, order) => sum + order.shippingCost, 0)
  const totalTaxes = orders.reduce((sum, order) => sum + order.totalTax, 0)
  const totalOrdersCount = orders.length

  console.log('Orders API - Calculated metrics:', {
    totalRevenue,
    totalShippingCosts,
    totalTaxes,
    totalOrdersCount
  })

  // Client-side pagination on the fetched batch
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedOrders = orders.slice(startIndex, endIndex)
  
  // Estimate total pages (this is approximate since we're not fetching all orders)
  const estimatedTotalPages = Math.ceil(orders.length / limit)
  const hasMorePages = orders.length === fetchLimit // If we got the full batch, there might be more

  console.log(`Orders API - Returning ${paginatedOrders.length} orders out of ${orders.length} fetched`)

  return NextResponse.json({
    orders: paginatedOrders,
    total: orders.length,
    page,
    totalPages: estimatedTotalPages,
    hasMorePages,
    isPartialData: true, // Indicate this is not complete data
    metrics: {
      totalRevenue,
      totalShippingCosts,
      totalTaxes,
      totalOrdersCount,
      averageOrderValue: totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0,
      note: 'Metrics calculated from current batch only'
    }
  })
} 