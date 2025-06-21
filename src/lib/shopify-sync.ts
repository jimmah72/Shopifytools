'use server'

import { prisma } from '@/lib/prisma'
import { getAllOrders, getAllProducts, getOrdersCount, getOrderRefunds } from '@/lib/shopify-api'
import { formatShopDomain } from '@/lib/shopify.config'

interface SyncResult {
  success: boolean
  dataType: string
  recordsProcessed: number
  newRecords: number
  updatedRecords: number
  errors: string[]
}

export async function syncShopifyOrders(storeId: string, timeframeDays: number = 30): Promise<SyncResult> {
  console.log(`Sync Service - Starting INCREMENTAL orders sync for store: ${storeId}`)
  
  const result: SyncResult = {
    success: false,
    dataType: 'orders',
    recordsProcessed: 0,
    newRecords: 0,
    updatedRecords: 0,
    errors: []
  }

  try {
    // Get store info
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, domain: true, accessToken: true }
    })

    if (!store) {
      result.errors.push('Store not found')
      return result
    }

    // Get or create sync status
    let syncStatus = await prisma.syncStatus.findUnique({
      where: {
        storeId_dataType: {
          storeId,
          dataType: 'orders'
        }
      }
    })

    if (!syncStatus) {
      // First time sync - create sync status
      syncStatus = await prisma.syncStatus.create({
        data: {
          storeId,
          dataType: 'orders',
          lastSyncAt: new Date('2023-01-01'), // Start from a reasonable date
          totalRecords: 0
        }
      })
    }

    // Check if sync is already in progress
    if (syncStatus.syncInProgress) {
      // If sync is already running for a different timeframe, use the stored timeframe
      if (syncStatus.timeframeDays && syncStatus.timeframeDays !== timeframeDays) {
        console.log(`Sync Service - Using stored timeframe ${syncStatus.timeframeDays} days instead of requested ${timeframeDays} days`)
        timeframeDays = syncStatus.timeframeDays
      } else {
        result.errors.push('Sync already in progress')
        return result
      }
    }

    // Mark sync as in progress and update heartbeat
    await prisma.syncStatus.update({
      where: { id: syncStatus.id },
      data: { 
        syncInProgress: true, 
        errorMessage: null,
        lastHeartbeat: new Date(),
        timeframeDays: timeframeDays // Store the timeframe this sync is running for
      }
    })

    // **SMART INCREMENTAL SYNC**
    // Instead of fetching ALL orders, first check what we're missing
    const formattedDomain = formatShopDomain(store.domain)
    
    // Calculate the date filter for the timeframe
    const timeframeStartDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000)
    
    // Step 1: Get total order count from Shopify (fast API call)
    const totalOrdersInShopify = await getOrdersCount(formattedDomain, store.accessToken, {
      created_at_min: timeframeStartDate.toISOString(),
      status: 'any'
    })
    
    // Step 2: Get count of orders we already have locally FOR THE SAME TIMEFRAME
    const localOrdersCount = await prisma.shopifyOrder.count({
      where: { 
        storeId,
        createdAt: {
          gte: timeframeStartDate
        }
      }
    })
    
    console.log(`Sync Service - Shopify has ${totalOrdersInShopify} orders (${timeframeDays}d), we have ${localOrdersCount} locally (${timeframeDays}d)`)
    
    // If we have all orders, skip the sync
    if (localOrdersCount >= totalOrdersInShopify) {
      console.log('Sync Service - All orders already synced!')
      await prisma.syncStatus.update({
        where: { id: syncStatus.id },
        data: { 
          syncInProgress: false,
          lastHeartbeat: null,
          lastSyncAt: new Date()
        }
      })
      result.success = true
      return result
    }
    
    // Step 3: Get existing order IDs to avoid refetching (within timeframe)
    const existingOrderIds = await prisma.shopifyOrder.findMany({
      where: { 
        storeId,
        createdAt: {
          gte: timeframeStartDate
        }
      },
      select: { id: true }
    })
    const existingOrderIdSet = new Set(existingOrderIds.map(o => o.id))
    
    console.log(`Sync Service - Need to fetch ${totalOrdersInShopify - localOrdersCount} missing orders`)

    // Step 4: Fetch ALL orders for the specified timeframe (we'll filter out existing ones)
    const shopifyOrders = await getAllOrders(formattedDomain, store.accessToken, timeframeDays)
    
    // Update heartbeat
    await prisma.syncStatus.update({
      where: { id: syncStatus.id },
      data: { lastHeartbeat: new Date() }
    })

    // Step 5: Filter to only orders we don't have yet
    const newOrders = shopifyOrders.filter(order => 
      !existingOrderIdSet.has(order.id.toString())
    )

    console.log(`Sync Service - Processing ${newOrders.length} truly NEW orders (was ${shopifyOrders.length} total)`)

    // Process orders in batches
    const batchSize = 100
    let latestOrderDate = syncStatus.lastSyncAt

    for (let i = 0; i < newOrders.length; i += batchSize) {
      const batch = newOrders.slice(i, i + batchSize)
      
      // Update heartbeat every batch
      await prisma.syncStatus.update({
        where: { id: syncStatus.id },
        data: { lastHeartbeat: new Date() }
      })
      
      for (const order of batch) {
        try {
          const orderDate = new Date(order.updated_at)
          if (orderDate > latestOrderDate) {
            latestOrderDate = orderDate
          }

          // Fetch refunds for this order - ALWAYS fetch, regardless of status
          console.log(`Sync Service - Fetching refunds for order ${order.id} (status: ${order.financial_status})`);
          const totalRefunds = await getOrderRefunds(formattedDomain, store.accessToken, order.id.toString());

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
            tags: order.tags,
            note: order.note,
            lastSyncedAt: new Date()
          }

          await prisma.shopifyOrder.upsert({
            where: { id: order.id.toString() },
            update: {
              ...orderData,
              // Always update refunds data on upsert to catch any new refunds
              totalRefunds: totalRefunds,
              updatedAt: new Date(order.updated_at)
            },
            create: orderData,
          })

          // Process line items
          if (order.line_items && order.line_items.length > 0) {
            for (const lineItem of order.line_items) {
              const lineItemData = {
                id: lineItem.id.toString(),
                orderId: order.id.toString(),
                storeId,
                productId: lineItem.product_id?.toString() || null,
                variantId: lineItem.variant_id?.toString() || null,
                title: lineItem.title,
                quantity: lineItem.quantity,
                price: parseFloat(lineItem.price || '0'),
                totalDiscount: parseFloat(lineItem.total_discount || '0'),
                sku: lineItem.sku || null,
              }

              await prisma.shopifyLineItem.upsert({
                where: { id: lineItem.id.toString() },
                update: lineItemData,
                create: lineItemData,
              })
            }
          }

          result.newRecords++
          
          // Log progress with refunds info
          if (totalRefunds > 0) {
            console.log(`Sync Service - Order ${order.name} synced with $${totalRefunds.toFixed(2)} in refunds`);
          }
          
        } catch (error) {
          console.error(`Sync Service - Error processing order ${order.id}:`, error)
          result.errors.push(`Order ${order.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      console.log(`Sync Service - Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(newOrders.length / batchSize)} (${result.newRecords} new orders so far)`)
    }

    // Update sync status
    await prisma.syncStatus.update({
      where: { id: syncStatus.id },
      data: {
        lastSyncAt: latestOrderDate,
        syncInProgress: false,
        lastHeartbeat: null,
        totalRecords: syncStatus.totalRecords + result.newRecords,
        errorMessage: result.errors.length > 0 ? result.errors.join('; ') : null
      }
    })

    result.success = true
    console.log(`Sync Service - INCREMENTAL orders sync completed. NEW: ${result.newRecords}, Errors: ${result.errors.length}`)
    console.log(`Sync Service - Database now has ${localOrdersCount + result.newRecords}/${totalOrdersInShopify} orders`)

  } catch (error) {
    console.error('Sync Service - Orders sync failed:', error)
    result.errors.push(`Sync failed: ${error}`)
    
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
    dataType: 'products',
    recordsProcessed: 0,
    newRecords: 0,
    updatedRecords: 0,
    errors: []
  }

  try {
    // Get store info
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, domain: true, accessToken: true }
    })

    if (!store) {
      result.errors.push('Store not found')
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
      result.errors.push('Sync already in progress')
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
            result.updatedRecords++
          } else {
            await prisma.shopifyProduct.create({
              data: productData
            })
            result.newRecords++
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

          result.recordsProcessed++
        } catch (error) {
          console.error(`Sync Service - Error processing product ${product.id}:`, error)
          result.errors.push(`Product ${product.id}: ${error}`)
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
        totalRecords: syncStatus.totalRecords + result.newRecords,
        errorMessage: result.errors.length > 0 ? result.errors.join('; ') : null
      }
    })

    result.success = true
    console.log(`Sync Service - Products sync completed. New: ${result.newRecords}, Updated: ${result.updatedRecords}, Errors: ${result.errors.length}`)

  } catch (error) {
    console.error('Sync Service - Products sync failed:', error)
    result.errors.push(`Sync failed: ${error}`)
    
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
    orders: `${results.orders.newRecords} new, ${results.orders.updatedRecords} updated`,
    products: `${results.products.newRecords} new, ${results.products.updatedRecords} updated`
  })
  
  return results
} 