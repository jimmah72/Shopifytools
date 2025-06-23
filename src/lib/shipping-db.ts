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
    
    console.log(`🚚 Shipping DB - Processing ${orderNames.length} orders for ACTUAL carrier costs...`);
    
    // Remove # prefix from all order names for querying
    const cleanOrderNames = orderNames.map(name => name.replace('#', ''))
    
    // ✅ FIXED: Get ACTUAL carrier costs from shipments table, not shipping revenue from orders
    const BATCH_SIZE = 500;
    const grouped: Record<string, ShippingCost[]> = {}
    
    // Process orders in batches
    for (let i = 0; i < cleanOrderNames.length; i += BATCH_SIZE) {
      const batch = cleanOrderNames.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(cleanOrderNames.length / BATCH_SIZE);
      
      console.log(`🚚 Shipping DB - Processing batch ${batchNumber}/${totalBatches} (${batch.length} orders) - looking for ACTUAL carrier costs`);
      
      try {
        // ✅ NEW: Query shipments table for actual carrier costs, not orders table for revenue
        const { data: shipmentsData, error: shipmentsError } = await shippingDb
          .from('shipments')
          .select('*')
          .in('order_number', batch)
          .not('shipment_cost', 'is', null)
          .gt('shipment_cost', 0)
        
        if (shipmentsError) {
          console.error(`🚚 Shipping DB - Error getting shipments in batch ${batchNumber}:`, shipmentsError)
        }
        
        // Process shipments data (actual carrier costs)
        shipmentsData?.forEach((shipment: any) => {
          const originalOrderName = `#${shipment.order_number}`
          const actualCarrierCost = parseFloat(shipment.shipment_cost) || 0
          const insuranceCost = parseFloat(shipment.insurance_cost) || 0
          const fulfillmentFee = parseFloat(shipment.fulfillment_fee) || 0
          const totalShippingCost = actualCarrierCost + insuranceCost + fulfillmentFee
          
          // Apply fulfillment filtering if needed
          let includeShippingCost = true
          if (fulfillmentFilter === 'unfulfilled') {
            includeShippingCost = false // Unfulfilled orders shouldn't have shipping costs
          }
          
          if (includeShippingCost && totalShippingCost > 0) {
            const shippingCost: ShippingCost = {
              id: `${shipment.order_number}_actual_cost`,
              order_id: shipment.order_number,
              shopify_order_name: originalOrderName,
              shipping_cost: totalShippingCost,
              carrier: shipment.carrier_code || 'Unknown',
              created_at: shipment.created_at || new Date().toISOString(),
              updated_at: shipment.updated_at || new Date().toISOString()
            }
            
            if (!grouped[originalOrderName]) {
              grouped[originalOrderName] = []
            }
            grouped[originalOrderName].push(shippingCost)
          }
        })
        
        // ✅ FALLBACK: Check label_ledger for additional cost data
        try {
          const { data: labelData, error: labelError } = await shippingDb
            .from('label_ledger')
            .select('*')
            .in('order_number', batch)
            .not('cost', 'is', null)
            .gt('cost', 0)
          
          if (!labelError && labelData) {
            labelData.forEach((label: any) => {
              const originalOrderName = `#${label.order_number}`
              
              // Only add if we don't already have cost data from shipments
              if (!grouped[originalOrderName]) {
                const labelCost = parseFloat(label.cost) || parseFloat(label.postage_cost) || 0
                
                if (labelCost > 0) {
                  const shippingCost: ShippingCost = {
                    id: `${label.order_number}_label_cost`,
                    order_id: label.order_number,
                    shopify_order_name: originalOrderName,
                    shipping_cost: labelCost,
                    carrier: label.carrier || 'Unknown',
                    created_at: label.created_at || new Date().toISOString(),
                    updated_at: label.updated_at || new Date().toISOString()
                  }
                  
                  grouped[originalOrderName] = [shippingCost]
                }
              }
            })
          }
        } catch (labelError) {
          console.log(`🚚 Shipping DB - No label_ledger data available in batch ${batchNumber}`)
        }
        
        // Small delay between batches
        if (i + BATCH_SIZE < cleanOrderNames.length) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
        
      } catch (batchError) {
        console.error(`🚚 Shipping DB - Batch ${batchNumber} failed:`, batchError)
        continue
      }
    }
    
    console.log(`🚚 Shipping DB - Completed! Found ACTUAL carrier costs for ${Object.keys(grouped).length} orders`);
    return grouped
    
  } catch (error) {
    console.error('🚚 Shipping DB - Fatal error in getBulkShippingCosts:', error)
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