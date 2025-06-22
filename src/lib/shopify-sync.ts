'use server'

import { prisma } from '@/lib/prisma'
import { getAllOrders, getAllProducts, getOrdersCount, getOrderRefunds } from '@/lib/shopify-api'
import { formatShopDomain } from '@/lib/shopify.config'

export interface SyncResult {
  success: boolean
  message: string
  ordersProcessed: number
  newOrders: number
  updatedOrders: number
}

// Helper function to detect payment method from order data
function detectPaymentMethod(order: any): {
  paymentGateway: string | null;
  paymentSource: string | null;
  paymentMethod: string | null;
  transactionGateway: string | null;
} {
  // Get payment gateway from payment_gateway_names array
  const paymentGateway = order.payment_gateway_names?.[0] || order.gateway || null;
  
  // Get source (web, pos, mobile, etc.)
  const paymentSource = order.source_name || null;
  
  // Get transaction gateway if transactions exist
  let transactionGateway = null;
  if (order.transactions && order.transactions.length > 0) {
    // Get the gateway from the first successful transaction
    const successfulTransaction = order.transactions.find((tx: any) => 
      tx.status === 'success' && (tx.kind === 'sale' || tx.kind === 'authorization')
    );
    transactionGateway = successfulTransaction?.gateway || null;
  }
  
  // Create composite payment method identifier
  let paymentMethod = null;
  if (paymentGateway && paymentSource) {
    paymentMethod = `${paymentGateway}_${paymentSource}`;
  } else if (paymentGateway) {
    paymentMethod = `${paymentGateway}_unknown`;
  }
  
  return {
    paymentGateway,
    paymentSource,
    paymentMethod,
    transactionGateway
  };
}

export async function syncShopifyOrders(storeId: string, timeframeDays: number = 30): Promise<SyncResult> {
  console.log(`📦 Starting Shopify order sync for store ${storeId} (${timeframeDays} days)`)
  
  const result: SyncResult = {
    success: false,
    message: '',
    ordersProcessed: 0,
    newOrders: 0,
    updatedOrders: 0
  }

  try {
    // Get store information
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, domain: true, accessToken: true }
    })

    if (!store) {
      throw new Error(`Store not found: ${storeId}`)
    }

    console.log(`🏪 Found store: ${store.domain}`)

    // Fetch orders from Shopify with enhanced fields including payment method data
    console.log(`📡 Fetching orders from Shopify for last ${timeframeDays} days...`)
    const shopifyOrders = await getAllOrders(store.domain, store.accessToken, timeframeDays)
    
    console.log(`📊 Retrieved ${shopifyOrders.length} orders from Shopify`)

    if (shopifyOrders.length === 0) {
      return result
    }

    // Get existing orders from database
    const existingOrderIds = new Set(
      (await prisma.shopifyOrder.findMany({
        where: { storeId },
        select: { id: true }
      })).map(order => order.id)
    )

    console.log(`🗄️ Found ${existingOrderIds.size} existing orders in database`)

    // Process orders in batches
    const batchSize = 50
    const newOrders = shopifyOrders.filter(order => !existingOrderIds.has(order.id.toString()))
    const existingOrders = shopifyOrders.filter(order => existingOrderIds.has(order.id.toString()))
    
    console.log(`📋 Processing ${newOrders.length} new orders and ${existingOrders.length} existing orders`)

    let newOrdersCount = 0
    let updatedOrdersCount = 0

    // Process new orders
    if (newOrders.length > 0) {
      console.log(`➕ Processing ${newOrders.length} new orders...`)
      
      for (let i = 0; i < newOrders.length; i += batchSize) {
        const batch = newOrders.slice(i, i + batchSize)
        console.log(`📦 Processing new orders batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(newOrders.length / batchSize)} (${batch.length} orders)`)

        // Fetch refunds for each order in the batch
        const ordersWithRefunds = []
        
        for (const order of batch) {
          console.log(`💸 Fetching refunds for order ${order.name}...`)
          const totalRefunds = await getOrderRefunds(store.domain, store.accessToken, order.id.toString())
          
          // Detect payment method information
          const paymentMethodData = detectPaymentMethod(order);
          
          console.log(`💳 Payment method detected for ${order.name}:`, {
            gateway: paymentMethodData.paymentGateway,
            source: paymentMethodData.paymentSource,
            method: paymentMethodData.paymentMethod
          });

          const orderData = {
            id: order.id.toString(),
            storeId,
            shopifyOrderNumber: order.order_number,
            orderName: order.name,
            email: order.email,
            createdAt: new Date(order.created_at),
            updatedAt: new Date(order.updated_at),
            closedAt: order.closed_at ? new Date(order.closed_at) : null,
            processedAt: order.processed_at ? new Date(order.processed_at) : null,
            currency: order.currency,
            totalPrice: parseFloat(order.total_price || '0'),
            subtotalPrice: parseFloat(order.subtotal_price || '0'),
            totalTax: parseFloat(order.total_tax || '0'),
            totalDiscounts: parseFloat(order.total_discounts || '0'),
            totalShipping: parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0'),
            totalRefunds: totalRefunds, // Use the fetched refunds data
            financialStatus: order.financial_status || 'pending',
            fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
            customerFirstName: order.customer?.first_name || null,
            customerLastName: order.customer?.last_name || null,
            customerEmail: order.customer?.email || null,
            shippingFirstName: order.shipping_address?.first_name,
            shippingLastName: order.shipping_address?.last_name,
            shippingAddress1: order.shipping_address?.address1,
            shippingCity: order.shipping_address?.city,
            shippingProvince: order.shipping_address?.province,
            shippingCountry: order.shipping_address?.country,
            shippingZip: order.shipping_address?.zip,
            gateway: order.gateway,
            processingMethod: order.processing_method,
            // NEW: Enhanced payment method tracking
            paymentGateway: paymentMethodData.paymentGateway,
            paymentSource: paymentMethodData.paymentSource,
            paymentMethod: paymentMethodData.paymentMethod,
            transactionGateway: paymentMethodData.transactionGateway,
            tags: order.tags,
            note: order.note,
            lastSyncedAt: new Date()
          }

          ordersWithRefunds.push(orderData)
        }

        // Batch insert new orders
        await prisma.shopifyOrder.createMany({
          data: ordersWithRefunds,
          skipDuplicates: true
        })

        newOrdersCount += ordersWithRefunds.length
        console.log(`✅ Created ${ordersWithRefunds.length} new orders in batch`)

        // Process line items for the batch
        for (const order of batch) {
          const lineItemsData = order.line_items?.map((item: any) => ({
            id: item.id.toString(),
            orderId: order.id.toString(),
            productId: item.product_id?.toString() || null,
            variantId: item.variant_id?.toString() || null,
            title: item.title || 'Unknown Product',
            quantity: item.quantity || 0,
            price: parseFloat(item.price || '0'),
            totalDiscount: parseFloat(item.total_discount || '0'),
            vendor: item.vendor || null,
            sku: item.sku || null,
            fulfillmentStatus: item.fulfillment_status || 'unfulfilled',
          })) || []

          if (lineItemsData.length > 0) {
            await prisma.shopifyLineItem.createMany({
              data: lineItemsData,
              skipDuplicates: true
            })
          }
        }

        // Small delay to be respectful to the API
        if (i + batchSize < newOrders.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }

    // Process existing orders (for refunds updates and payment method backfill)
    if (existingOrders.length > 0) {
      console.log(`🔄 Processing ${existingOrders.length} existing orders for updates...`)
      
      for (const order of existingOrders) {
        try {
          console.log(`💸 Updating refunds for existing order ${order.name}...`)
          const totalRefunds = await getOrderRefunds(store.domain, store.accessToken, order.id.toString())
          
          // Detect payment method information for backfill
          const paymentMethodData = detectPaymentMethod(order);
          
          await prisma.shopifyOrder.update({
            where: { id: order.id.toString() },
            data: {
              totalRefunds,
              // Update payment method data if missing
              paymentGateway: paymentMethodData.paymentGateway,
              paymentSource: paymentMethodData.paymentSource,
              paymentMethod: paymentMethodData.paymentMethod,
              transactionGateway: paymentMethodData.transactionGateway,
              lastSyncedAt: new Date()
            }
          })
          
          updatedOrdersCount++
          
          // Small delay between updates
          await new Promise(resolve => setTimeout(resolve, 50))
        } catch (error) {
          console.error(`Error updating order ${order.name}:`, error)
          // Continue with next order
        }
      }
    }

    const totalProcessed = newOrdersCount + updatedOrdersCount

    console.log(`✅ Sync completed successfully:`)
    console.log(`   📊 Total orders processed: ${totalProcessed}`)
    console.log(`   ➕ New orders: ${newOrdersCount}`)
    console.log(`   🔄 Updated orders: ${updatedOrdersCount}`)

    result.success = true
    result.ordersProcessed = totalProcessed
    result.newOrders = newOrdersCount
    result.updatedOrders = updatedOrdersCount
    result.message = `Successfully synced ${totalProcessed} orders (${newOrdersCount} new, ${updatedOrdersCount} updated)`

  } catch (error) {
    console.error('❌ Error during order sync:', error)
    result.message = `Sync failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
    
    // Mark sync as not in progress even if it failed
    try {
      await prisma.syncStatus.updateMany({
        where: { storeId, dataType: 'orders' },
        data: { 
          syncInProgress: false, 
          lastHeartbeat: null,
          errorMessage: `Sync failed: ${error}` 
        }
      })
    } catch (updateError) {
      console.error('Failed to update sync status after error:', updateError)
    }
  }

  return result
}

export async function syncShopifyProducts(storeId: string): Promise<SyncResult> {
  console.log(`Sync Service - Starting products sync for store: ${storeId}`)
  
  const result: SyncResult = {
    success: false,
    message: '',
    ordersProcessed: 0,
    newOrders: 0,
    updatedOrders: 0
  }

  try {
    // Get store info
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, domain: true, accessToken: true }
    })

    if (!store) {
      result.message = 'Store not found'
      return result
    }

    // Get or create sync status
    let syncStatus = await prisma.syncStatus.findUnique({
      where: {
        storeId_dataType: {
          storeId,
          dataType: 'products'
        }
      }
    })

    if (!syncStatus) {
      syncStatus = await prisma.syncStatus.create({
        data: {
          storeId,
          dataType: 'products',
          lastSyncAt: new Date('2023-01-01'),
          totalRecords: 0
        }
      })
    }

    if (syncStatus.syncInProgress) {
      result.message = 'Sync already in progress'
      return result
    }

    await prisma.syncStatus.update({
      where: { id: syncStatus.id },
      data: { syncInProgress: true, errorMessage: null }
    })

    // Fetch products from Shopify
    const formattedDomain = formatShopDomain(store.domain)
    const shopifyProducts = await getAllProducts(formattedDomain, store.accessToken)

    console.log(`Sync Service - Fetched ${shopifyProducts.length} products from Shopify`)

    // Process products in batches
    const batchSize = 50
    let latestProductDate = syncStatus.lastSyncAt

    for (let i = 0; i < shopifyProducts.length; i += batchSize) {
      const batch = shopifyProducts.slice(i, i + batchSize)
      
      for (const product of batch) {
        try {
          const productId = product.id.replace('gid://shopify/Product/', '')
          const productDate = new Date(product.updatedAt)
          
          if (productDate > latestProductDate) {
            latestProductDate = productDate
          }

          // Check if product exists
          const existingProduct = await prisma.shopifyProduct.findUnique({
            where: { id: productId }
          })

          const productData = {
            id: productId,
            storeId,
            title: product.title,
            handle: product.handle,
            description: product.description,
            productType: product.productType,
            vendor: product.vendor,
            tags: product.tags?.join(','),
            status: product.status?.toLowerCase() || 'active',
            createdAt: new Date(product.createdAt),
            updatedAt: new Date(product.updatedAt),
            publishedAt: product.publishedAt ? new Date(product.publishedAt) : null,
            images: product.images || null,
            lastSyncedAt: new Date()
          }

          if (existingProduct) {
            await prisma.shopifyProduct.update({
              where: { id: productId },
              data: productData
            })
            result.updatedOrders++
          } else {
            await prisma.shopifyProduct.create({
              data: productData
            })
            result.newOrders++
          }

          // Handle variants
          await prisma.shopifyProductVariant.deleteMany({
            where: { productId }
          })

          if (product.variants?.edges) {
            const variantsData = product.variants.edges.map((edge: any) => {
              const variant = edge.node
              return {
                id: variant.id.replace('gid://shopify/ProductVariant/', ''),
                productId,
                title: variant.title || 'Default Title',
                sku: variant.sku,
                price: parseFloat(variant.price) || 0,
                compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
                costPerItem: variant.inventoryItem?.unitCost?.amount ? parseFloat(variant.inventoryItem.unitCost.amount) : null,
                inventoryQuantity: variant.inventoryQuantity || 0,
                inventoryPolicy: variant.inventoryPolicy,
                inventoryManagement: variant.inventoryManagement,
                weight: variant.weight ? parseFloat(variant.weight) : null,
                weightUnit: variant.weightUnit,
                fulfillmentService: variant.fulfillmentService,
                requiresShipping: variant.requiresShipping !== false,
                taxable: variant.taxable !== false,
                options: variant.selectedOptions || null
              }
            })

            if (variantsData.length > 0) {
              await prisma.shopifyProductVariant.createMany({
                data: variantsData
              })
            }
          }

          result.ordersProcessed++
        } catch (error) {
          console.error(`Sync Service - Error processing product ${product.id}:`, error)
          result.message = `Product ${product.id}: ${error}`
        }
      }

      console.log(`Sync Service - Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(shopifyProducts.length / batchSize)}`)
    }

    // Update sync status
    await prisma.syncStatus.update({
      where: { id: syncStatus.id },
      data: {
        lastSyncAt: latestProductDate,
        syncInProgress: false,
        totalRecords: syncStatus.totalRecords + result.newOrders,
        errorMessage: result.message.length > 0 ? result.message : null
      }
    })

    result.success = true
    console.log(`Sync Service - Products sync completed. New: ${result.newOrders}, Updated: ${result.updatedOrders}, Errors: ${result.message.length}`)

  } catch (error) {
    console.error('Sync Service - Products sync failed:', error)
    result.message = `Sync failed: ${error}`
    
    try {
      await prisma.syncStatus.updateMany({
        where: { storeId, dataType: 'products' },
        data: { syncInProgress: false, errorMessage: `Sync failed: ${error}` }
      })
    } catch (updateError) {
      console.error('Failed to update sync status after error:', updateError)
    }
  }

  return result
}

export async function syncAllData(storeId: string, timeframeDays: number = 30) {
  console.log(`Sync Service - Starting full sync for store: ${storeId}`)
  
  const results = {
    orders: await syncShopifyOrders(storeId, timeframeDays),
    products: await syncShopifyProducts(storeId)
  }
  
  console.log('Sync Service - Full sync completed:', {
    orders: `${results.orders.newOrders} new, ${results.orders.updatedOrders} updated`,
    products: `${results.products.newOrders} new, ${results.products.updatedOrders} updated`
  })
  
  return results
} 