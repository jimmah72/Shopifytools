import { createClient } from '@supabase/supabase-js'

// Second Supabase database for shipping costs and additional order data
const supabaseUrl = process.env.SHIPPING_SUPABASE_URL
const supabaseKey = process.env.SHIPPING_SUPABASE_ANON_KEY

// Make shipping database optional - if not configured, functions will return empty data
let shippingDb: any = null

if (supabaseUrl && supabaseKey) {
  shippingDb = createClient(supabaseUrl, supabaseKey)
  console.log('✅ Shipping database connected')
} else {
  console.warn('⚠️ Shipping database not configured - shipping costs will be $0')
}

export { shippingDb }

// Types for shipping data (adjust these based on your actual shipping database schema)
export interface ShippingCost {
  id: string
  order_id: string  // Maps to Shopify order ID
  shopify_order_name: string  // e.g., "#PG1001"
  shipping_cost: number
  carrier: string
  tracking_number?: string
  shipped_date?: string
  delivery_date?: string
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  zone?: string
  service_type?: string  // standard, express, overnight, etc.
  created_at: string
  updated_at: string
}

export interface OrderFulfillment {
  id: string
  order_id: string
  shopify_order_name: string
  fulfillment_status: 'unfulfilled' | 'partial' | 'fulfilled' | 'restocked'
  tracking_info?: {
    company: string
    number: string
    url?: string
  }
  line_items: Array<{
    id: string
    product_id: string
    variant_id: string
    quantity: number
    fulfilled_quantity: number
  }>
  created_at: string
  updated_at: string
}

// Helper functions to fetch data from shipping database
export async function getShippingCostsByOrderId(orderId: string): Promise<ShippingCost[]> {
  if (!shippingDb) {
    return []
  }
  
  try {
    // Remove # prefix if present (Shopify orders have # but shipping DB doesn't)
    const cleanOrderId = orderId.replace('#', '')
    
    const { data, error } = await shippingDb
      .from('orders')
      .select('order_number, raw_order_data')
      .eq('order_number', cleanOrderId)
    
    if (error) {
      console.error('Error fetching shipping costs:', error)
      return []
    }
    
    if (data && data.length > 0) {
      const order = data[0]
      const shippingAmount = order.raw_order_data?.shippingAmount || 0
      
      // Convert to our ShippingCost format
      return [{
        id: `${cleanOrderId}_shipping`,
        order_id: cleanOrderId,
        shopify_order_name: `#${cleanOrderId}`,
        shipping_cost: parseFloat(shippingAmount) || 0,
        carrier: order.raw_order_data?.requestedShippingService || 'Unknown',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]
    }
    
    return []
  } catch (error) {
    console.error('Error in getShippingCostsByOrderId:', error)
    return []
  }
}

export async function getShippingCostsByOrderName(orderName: string): Promise<ShippingCost[]> {
  if (!shippingDb) {
    return []
  }
  
  try {
    // Remove # prefix if present (Shopify orders have # but shipping DB doesn't)
    const cleanOrderName = orderName.replace('#', '')
    
    const { data, error } = await shippingDb
      .from('orders')
      .select('order_number, raw_order_data')
      .eq('order_number', cleanOrderName)
    
    if (error) {
      console.error('Error fetching shipping costs by order name:', error)
      return []
    }
    
    if (data && data.length > 0) {
      const order = data[0]
      const shippingAmount = order.raw_order_data?.shippingAmount || 0
      
      // Convert to our ShippingCost format
      return [{
        id: `${cleanOrderName}_shipping`,
        order_id: cleanOrderName,
        shopify_order_name: orderName, // Keep original format with #
        shipping_cost: parseFloat(shippingAmount) || 0,
        carrier: order.raw_order_data?.requestedShippingService || 'Unknown',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]
    }
    
    return []
  } catch (error) {
    console.error('Error in getShippingCostsByOrderName:', error)
    return []
  }
}

export async function getBulkShippingCosts(orderNames: string[], fulfillmentFilter?: string): Promise<Record<string, ShippingCost[]>> {
  if (!shippingDb) {
    return {}
  }
  
  try {
    if (orderNames.length === 0) return {}
    
    // Remove # prefix from all order names for querying
    const cleanOrderNames = orderNames.map(name => name.replace('#', ''))
    
    const { data, error } = await shippingDb
      .from('orders')
      .select('order_number, order_status, raw_order_data')
      .in('order_number', cleanOrderNames)
    
    if (error) {
      console.error('Error fetching bulk shipping costs:', error)
      return {}
    }
    
    // Group by original order name (with #)
    const grouped: Record<string, ShippingCost[]> = {}
    
    data?.forEach((order: any) => {
      const originalOrderName = `#${order.order_number}`
      const shippingAmount = order.raw_order_data?.shippingAmount || 0
      const shippingStatus = order.order_status
      
      // Apply fulfillment-based filtering
      let includeShippingCost = true
      
      if (fulfillmentFilter === 'unfulfilled') {
        // For unfulfilled filter, exclude shipping costs (labels created but not shipped)
        includeShippingCost = false
      } else if (fulfillmentFilter === 'fulfilled' || fulfillmentFilter === 'all') {
        // For both fulfilled and 'all' filters, only include costs for actually shipped orders
        includeShippingCost = shippingStatus === 'shipped' || shippingStatus === 'delivered'
      }
      
      if (includeShippingCost && (shippingAmount > 0 || orderNames.includes(originalOrderName))) {
        // Create shipping cost entry
        const shippingCost: ShippingCost = {
          id: `${order.order_number}_shipping`,
          order_id: order.order_number,
          shopify_order_name: originalOrderName,
          shipping_cost: parseFloat(shippingAmount) || 0,
          carrier: order.raw_order_data?.requestedShippingService || 'Unknown',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        if (!grouped[originalOrderName]) {
          grouped[originalOrderName] = []
        }
        grouped[originalOrderName].push(shippingCost)
      }
    })
    
    return grouped
  } catch (error) {
    console.error('Error in getBulkShippingCosts:', error)
    return {}
  }
}

export async function getFulfillmentData(orderNames: string[]): Promise<Record<string, OrderFulfillment>> {
  if (!shippingDb) {
    return {}
  }
  
  try {
    if (orderNames.length === 0) return {}
    
    const { data, error } = await shippingDb
      .from('order_fulfillments')
      .select('*')
      .in('shopify_order_name', orderNames)
    
    if (error) {
      console.error('Error fetching fulfillment data:', error)
      return {}
    }
    
    // Map by order name
    const mapped: Record<string, OrderFulfillment> = {}
    data?.forEach((fulfillment: OrderFulfillment) => {
      mapped[fulfillment.shopify_order_name] = fulfillment
    })
    
    return mapped
  } catch (error) {
    console.error('Error in getFulfillmentData:', error)
    return {}
  }
}

// Helper to calculate total shipping cost for an order
export function calculateTotalShippingCost(shippingCosts: ShippingCost[]): number {
  return shippingCosts.reduce((total, cost) => total + cost.shipping_cost, 0)
}

// Helper to get the most recent shipping cost for an order
export function getLatestShippingCost(shippingCosts: ShippingCost[]): ShippingCost | null {
  if (shippingCosts.length === 0) return null
  
  return shippingCosts.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0]
} 