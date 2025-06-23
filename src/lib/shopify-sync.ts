'use server'

import { prisma } from '@/lib/prisma'
import { getAllOrders, getAllProducts, getOrdersCount, getOrderRefunds } from '@/lib/shopify-api'
import { formatShopDomain } from '@/lib/shopify.config'

interface SyncResult {
  success: boolean
  ordersProcessed: number
  newOrders: number
  updatedOrders: number
  error?: string
  message?: string
}

// Rate limiting and circuit breaker configuration
const RATE_LIMIT_CONFIG = {
  MAX_CONCURRENT_REQUESTS: 3,
  REQUEST_DELAY_MS: 500, // Increased from previous values
  RATE_LIMIT_RETRY_DELAY_MS: 60000, // 1 minute
  MAX_RATE_LIMIT_RETRIES: 3,
  CIRCUIT_BREAKER_THRESHOLD: 5, // Number of failures before circuit opens
  CIRCUIT_BREAKER_RESET_TIME_MS: 300000, // 5 minutes
}

// Global circuit breaker state
let circuitBreakerState = {
  isOpen: false,
  failureCount: 0,
  lastFailureTime: null as Date | null,
  rateLimitCount: 0,
  lastRateLimitTime: null as Date | null,
}

// Rate limiting queue
let activeRequests = 0
const requestQueue: Array<() => Promise<void>> = []

async function processRequestQueue() {
  while (requestQueue.length > 0 && activeRequests < RATE_LIMIT_CONFIG.MAX_CONCURRENT_REQUESTS) {
    const request = requestQueue.shift()
    if (request) {
      activeRequests++
      try {
        await request()
      } finally {
        activeRequests--
      }
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.REQUEST_DELAY_MS))
    }
  }
}

function checkCircuitBreaker(): boolean {
  // If circuit is open, check if we should reset it
  if (circuitBreakerState.isOpen && circuitBreakerState.lastFailureTime) {
    const timeSinceLastFailure = Date.now() - circuitBreakerState.lastFailureTime.getTime()
    if (timeSinceLastFailure > RATE_LIMIT_CONFIG.CIRCUIT_BREAKER_RESET_TIME_MS) {
      console.log('🔄 Circuit breaker reset, attempting to resume sync')
      circuitBreakerState.isOpen = false
      circuitBreakerState.failureCount = 0
      circuitBreakerState.lastFailureTime = null
    }
  }
  
  return !circuitBreakerState.isOpen
}

function handleSyncFailure(error: any) {
  circuitBreakerState.failureCount++
  circuitBreakerState.lastFailureTime = new Date()
  
  const isRateLimit = error.message?.includes('Rate limited') || 
                      error.message?.includes('Too Many Requests') ||
                      error.status === 429
  
  if (isRateLimit) {
    circuitBreakerState.rateLimitCount++
    circuitBreakerState.lastRateLimitTime = new Date()
    console.log(`🚨 Rate limit hit (count: ${circuitBreakerState.rateLimitCount})`)
    
    if (circuitBreakerState.rateLimitCount >= RATE_LIMIT_CONFIG.MAX_RATE_LIMIT_RETRIES) {
      console.log('🛑 Max rate limit retries reached, opening circuit breaker')
      circuitBreakerState.isOpen = true
    }
  }
  
  if (circuitBreakerState.failureCount >= RATE_LIMIT_CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
    console.log('🛑 Circuit breaker threshold reached, opening circuit')
    circuitBreakerState.isOpen = true
  }
}

async function updateSyncHeartbeat(storeId: string, dataType: string) {
  try {
    await (prisma as any).syncStatus.updateMany({
      where: { storeId, dataType },
      data: { lastHeartbeat: new Date() }
    })
  } catch (error) {
    console.error('Failed to update sync heartbeat:', error)
  }
}

async function setSyncError(storeId: string, dataType: string, errorMessage: string) {
  try {
    await (prisma as any).syncStatus.updateMany({
      where: { storeId, dataType },
      data: { 
        errorMessage,
        syncInProgress: false,
        lastHeartbeat: null
      }
    })
  } catch (error) {
    console.error('Failed to set sync error:', error)
  }
}

// Helper function to detect payment method from order data
function detectPaymentMethod(order: any) {
  const paymentGateway = order.payment_gateway_names?.[0] || 'unknown'
  const paymentSource = order.source_name || 'unknown'
  const paymentMethod = `${paymentGateway}_${paymentSource}`
  const transactionGateway = order.payment_gateway_names?.[0] || null
  
  return {
    paymentGateway,
    paymentSource, 
    paymentMethod,
    transactionGateway
  }
}

// ✅ NEW: Function to calculate handling fees during sync
async function calculateHandlingFeesFromAdditionalCosts(storeId: string, productPrice: number): Promise<number> {
  try {
    // Fetch all active additional costs for the store
    const additionalCosts = await (prisma as any).additionalCost.findMany({
      where: { 
        storeId: storeId,
        isActive: true 
      }
    });

    if (!additionalCosts || additionalCosts.length === 0) {
      return 0;
    }

    let totalHandlingFees = 0;

    additionalCosts.forEach((cost: any) => {
      // Item-level fees (direct application)
      totalHandlingFees += cost.flatRatePerItem || 0;
      totalHandlingFees += (cost.percentagePerItem || 0) * productPrice / 100;

      // Order-level fees (applied per item - user requirement)
      totalHandlingFees += cost.flatRatePerOrder || 0;
      totalHandlingFees += (cost.percentagePerOrder || 0) * productPrice / 100;
    });

    return Math.round(totalHandlingFees * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error calculating handling fees from additional costs:', error);
    return 0;
  }
}

export async function syncShopifyOrders(storeId: string, timeframeDays: number = 30): Promise<SyncResult> {
  const syncStartTime = Date.now()
  const MAX_SYNC_TIME = 10 * 60 * 1000 // 10 minutes maximum
  
  console.log(`📅 Starting Shopify orders sync for ${timeframeDays} days`)
  console.log(`💰 NEW: Fetching refunds for new orders during sync (existing orders use cached data)`)
  console.log(`⏱️  Max sync time: ${MAX_SYNC_TIME / 1000 / 60} minutes`)

  const result: SyncResult = {
    success: false,
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
      throw new Error('Store not found')
    }

    // Update sync status to in-progress
    await (prisma as any).syncStatus.upsert({
      where: {
        storeId_dataType: { storeId, dataType: 'orders' }
      },
      update: {
        syncInProgress: true,
        lastHeartbeat: new Date(),
        timeframeDays: timeframeDays,
        errorMessage: null
      },
      create: {
        storeId,
        dataType: 'orders',
        syncInProgress: true,
        lastHeartbeat: new Date(),
        timeframeDays: timeframeDays
      }
    })

    console.log(`🛍️ Fetching orders from Shopify for last ${timeframeDays} days...`)
    
    const allOrders = await getAllOrders(store.domain, store.accessToken, timeframeDays)
    console.log(`📊 Retrieved ${allOrders.length} orders from Shopify`)

    // Get existing orders from database
    const existingOrderIds = new Set(
      (await (prisma as any).shopifyOrder.findMany({
        where: { storeId },
        select: { id: true }
      })).map((order: any) => order.id)
    )

    const newOrders = allOrders.filter(order => !existingOrderIds.has(order.id.toString()))
    const existingOrders = allOrders.filter(order => existingOrderIds.has(order.id.toString()))

    console.log(`➕ Found ${newOrders.length} new orders`)
    console.log(`🔄 Found ${existingOrders.length} existing orders to update`)

    let newOrdersCount = 0
    let updatedOrdersCount = 0
    const batchSize = 50 // Increased since we're not making refund API calls

    // Process new orders WITHOUT fetching refunds
    if (newOrders.length > 0) {
      console.log(`➕ Processing ${newOrders.length} new orders...`)
      
      for (let i = 0; i < newOrders.length; i += batchSize) {
        const batch = newOrders.slice(i, i + batchSize)
        console.log(`📦 Processing new orders batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(newOrders.length / batchSize)} (${batch.length} orders)`)

        const ordersData = []
        
        for (const order of batch) {
          // Detect payment method information
          const paymentMethodData = detectPaymentMethod(order)
          
          console.log(`💳 Payment method detected for ${order.name}: ${paymentMethodData.paymentMethod}`)

          // ✅ NEW: Fetch refunds for new orders
          let totalRefunds = 0
          try {
            if (order.refunds && Array.isArray(order.refunds) && order.refunds.length > 0) {
              totalRefunds = order.refunds.reduce((sum: number, refund: any) => {
                const refundAmount = parseFloat(refund.transactions?.[0]?.amount || '0')
                return sum + refundAmount
              }, 0)
              console.log(`💸 Found $${totalRefunds.toFixed(2)} in refunds for order ${order.name}`)
            } else {
              // If refunds aren't included in the order response, fetch them separately
              const refundsResponse = await fetch(
                `https://${store.domain}/admin/api/2025-04/orders/${order.id}/refunds.json`,
                {
                  headers: {
                    'X-Shopify-Access-Token': store.accessToken
                  }
                }
              )
              
              if (refundsResponse.ok) {
                const refundsData = await refundsResponse.json()
                if (refundsData.refunds && Array.isArray(refundsData.refunds)) {
                  totalRefunds = refundsData.refunds.reduce((sum: number, refund: any) => {
                    const refundAmount = parseFloat(refund.transactions?.[0]?.amount || '0')
                    return sum + refundAmount
                  }, 0)
                  if (totalRefunds > 0) {
                    console.log(`💸 Fetched $${totalRefunds.toFixed(2)} in refunds for order ${order.name}`)
                  }
                }
              }
            }
          } catch (error) {
            console.warn(`⚠️ Could not fetch refunds for order ${order.name}:`, error)
            totalRefunds = 0
          }

          ordersData.push({
            id: order.id.toString(),
            storeId,
            orderName: order.name,
            shopifyOrderNumber: order.order_number,
            email: order.email || null,
            subtotalPrice: parseFloat(order.subtotal_price || '0'),
            totalPrice: parseFloat(order.total_price || '0'),
            totalShipping: parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0'),
            totalTax: parseFloat(order.total_tax || '0'),
            totalDiscounts: parseFloat(order.total_discounts || '0'),
            totalRefunds: totalRefunds, // ✅ Now includes actual refunds for new orders
            currency: order.currency,
            financialStatus: order.financial_status,
            fulfillmentStatus: order.fulfillment_status,
            customerFirstName: order.customer?.first_name || null,
            customerLastName: order.customer?.last_name || null,
            customerEmail: order.customer?.email || null,
            paymentGateway: paymentMethodData.paymentGateway,
            paymentSource: paymentMethodData.paymentSource,
            paymentMethod: paymentMethodData.paymentMethod,
            transactionGateway: paymentMethodData.transactionGateway,
            createdAt: new Date(order.created_at),
            updatedAt: new Date(order.updated_at || order.created_at),
            lastSyncedAt: new Date()
          })
        }

        // Insert new orders
        if (ordersData.length > 0) {
          await (prisma as any).shopifyOrder.createMany({
            data: ordersData,
            skipDuplicates: true
          })

          // Insert line items for each order  
          for (const order of batch) {
            if (order.line_items && order.line_items.length > 0) {
              const lineItemsData = order.line_items.map((item: any) => ({
                id: item.id.toString(),
                orderId: order.id.toString(),
                productId: item.product_id?.toString() || null,
                variantId: item.variant_id?.toString() || null,
                title: item.title,
                variantTitle: item.variant_title || null,
                sku: item.sku || null,
                quantity: item.quantity,
                price: parseFloat(item.price || '0'),
                totalDiscount: parseFloat(item.total_discount || '0')
              }))

              await (prisma as any).shopifyLineItem.createMany({
                data: lineItemsData,
                skipDuplicates: true
              })
            }
          }

          newOrdersCount += ordersData.length
          console.log(`✅ Saved ${ordersData.length} new orders`)
        }
      }
    }

    // Process existing orders - only update basic info, NOT refunds
    if (existingOrders.length > 0) {
      console.log(`🔄 Processing ${existingOrders.length} existing orders for basic updates...`)
      
      let processedCount = 0
      let errorCount = 0
      const problematicOrders: string[] = []
      
              for (const order of existingOrders) {
        // ✅ TIMEOUT CHECK: Prevent infinite syncing
        if (Date.now() - syncStartTime > MAX_SYNC_TIME) {
          console.log(`⏱️  TIMEOUT: Sync has been running for ${MAX_SYNC_TIME / 1000 / 60} minutes, stopping to prevent hanging`)
          console.log(`   📊 Processed ${processedCount}/${existingOrders.length} orders before timeout`)
          break
        }
        
        try {
          // Detect payment method information for backfill (if missing)
          const paymentMethodData = detectPaymentMethod(order)
          
          await (prisma as any).shopifyOrder.update({
            where: { id: order.id.toString() },
            data: {
              // Update basic order info and payment method data if missing
              financialStatus: order.financial_status,
              fulfillmentStatus: order.fulfillment_status,
              paymentGateway: paymentMethodData.paymentGateway,
              paymentSource: paymentMethodData.paymentSource,
              paymentMethod: paymentMethodData.paymentMethod,
              transactionGateway: paymentMethodData.transactionGateway,
              lastSyncedAt: new Date()
              // NOTE: totalRefunds is NOT updated here - handled separately
            }
          })
          
          updatedOrdersCount++
          
        } catch (error) {
          errorCount++
          problematicOrders.push(order.name || order.id.toString())
          console.error(`❌ Error updating order ${order.name || order.id}:`, error)
          // Continue with next order - this is the key to not getting stuck
        }
        
        // ✅ FIX: Only increment once per order (not twice!)
        processedCount++
        
        // Progress logging every 100 orders
        if (processedCount % 100 === 0) {
          console.log(`🔄 Progress: ${processedCount}/${existingOrders.length} orders processed (${updatedOrdersCount} updated, ${errorCount} errors)`)
        }
      }
      
      console.log(`🔄 Existing orders processing complete:`)
      console.log(`   ✅ Successfully updated: ${updatedOrdersCount}`)
      console.log(`   ❌ Failed to update: ${errorCount}`)
      if (problematicOrders.length > 0) {
        console.log(`   🚨 Problematic orders: ${problematicOrders.slice(0, 10).join(', ')}${problematicOrders.length > 10 ? ` (and ${problematicOrders.length - 10} more)` : ''}`)
      }
    }

    const totalProcessed = newOrdersCount + updatedOrdersCount
    const totalAttempted = newOrders.length + existingOrders.length
    const totalErrors = totalAttempted - totalProcessed

    console.log(`✅ Sync completed:`)
    console.log(`   📊 Total orders attempted: ${totalAttempted}`)
    console.log(`   ✅ Total orders processed: ${totalProcessed}`)
    console.log(`   ➕ New orders: ${newOrdersCount} (includes refunds data)`)
    console.log(`   🔄 Updated orders: ${updatedOrdersCount} (preserves existing refunds data)`)
    if (totalErrors > 0) {
      console.log(`   ❌ Failed orders: ${totalErrors} (sync continues anyway)`)
    }
    console.log(`   💰 Refunds: New orders include fresh refunds data, existing orders use cached data`)

    // ✅ IMPORTANT: Mark as successful even if some orders failed - this prevents infinite stuck syncs
    result.success = true
    result.ordersProcessed = totalProcessed
    result.newOrders = newOrdersCount
    result.updatedOrders = updatedOrdersCount
    if (totalErrors > 0) {
      result.message = `${totalErrors} orders failed but sync completed`
    }

    // Update sync status to completed
    await (prisma as any).syncStatus.updateMany({
      where: { storeId, dataType: 'orders' },
      data: {
        syncInProgress: false,
        lastSyncAt: new Date(),
        lastHeartbeat: null,
        errorMessage: null
      }
    })

    // Reset rate limit count on successful completion
    circuitBreakerState.rateLimitCount = 0
    circuitBreakerState.lastRateLimitTime = null

  } catch (error) {
    console.error('❌ Orders sync failed:', error)
    
    handleSyncFailure(error)
    
    result.error = error instanceof Error ? error.message : 'Unknown error occurred'
    
    // Update sync status with error
    await setSyncError(storeId, 'orders', result.error)
  }

  return result
}

export async function syncShopifyProducts(storeId: string, triggerInfo?: { reason?: string, source?: string }): Promise<SyncResult> {
  const timestamp = new Date().toISOString()
  
  console.log('🔥 PRODUCTS SYNC FUNCTION CALLED')
  console.log(`📅 Timestamp: ${timestamp}`)
  console.log(`🏪 Store ID: ${storeId}`)
  console.log(`🎯 Trigger Reason: ${triggerInfo?.reason || 'not specified'}`)
  console.log(`📍 Trigger Source: ${triggerInfo?.source || 'not specified'}`)
  console.log(`Sync Service - Starting products sync for store: ${storeId}`)
  
  const result: SyncResult = {
    success: false,
    ordersProcessed: 0,
    newOrders: 0,
    updatedOrders: 0,
    message: ''
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
    let syncStatus = await (prisma as any).syncStatus.findUnique({
      where: {
        storeId_dataType: {
          storeId,
          dataType: 'products'
        }
      }
    })

    if (!syncStatus) {
      syncStatus = await (prisma as any).syncStatus.create({
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

    await (prisma as any).syncStatus.update({
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
          const existingProduct = await (prisma as any).shopifyProduct.findUnique({
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
            await (prisma as any).shopifyProduct.update({
              where: { id: productId },
              data: productData
            })
            result.updatedOrders++
          } else {
            await (prisma as any).shopifyProduct.create({
              data: productData
            })
            result.newOrders++
          }

          // Handle variants
          await (prisma as any).shopifyProductVariant.deleteMany({
            where: { productId }
          })

          let firstVariantPrice = 0
          let firstVariantCost = 0

          if (product.variants && Array.isArray(product.variants)) {
            const variantsData = product.variants.map((variant: any) => {
              const price = parseFloat(variant.price) || 0
              const cost = variant.inventoryItem?.unitCost?.amount ? parseFloat(variant.inventoryItem.unitCost.amount) : null
              
              // Track first variant for main product record
              if (firstVariantPrice === 0) {
                firstVariantPrice = price
                firstVariantCost = cost || 0
              }

              return {
                id: variant.id.replace('gid://shopify/ProductVariant/', ''),
                productId,
                title: variant.title || 'Default Title',
                sku: variant.sku,
                price: price,
                compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
                costPerItem: cost,
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
              await (prisma as any).shopifyProductVariant.createMany({
                data: variantsData
              })
            }
          }

          // ✅ OPTIMIZED: Only calculate handling fees for new products or those without handling fees
          if (firstVariantPrice > 0) {
            // Check if product already exists with handling fees
            const existingProduct = await prisma.product.findUnique({
              where: { shopifyId: productId },
              select: { handlingFees: true, costSource: true }
            });
            
            let calculatedHandlingFees = 0;
            const needsHandlingFeesCalculation = !existingProduct || 
                                               existingProduct.handlingFees === 0 || 
                                               existingProduct.handlingFees === null;
            
            if (needsHandlingFeesCalculation) {
              calculatedHandlingFees = await calculateHandlingFeesFromAdditionalCosts(storeId, firstVariantPrice);
              console.log(`💰 Sync - Calculated handling fees for "${product.title}": $${calculatedHandlingFees} (price: $${firstVariantPrice})`);
            } else {
              calculatedHandlingFees = existingProduct.handlingFees;
              console.log(`💰 Sync - Using existing handling fees for "${product.title}": $${calculatedHandlingFees} (skipped calculation)`);
            }
            
            await prisma.product.upsert({
              where: { shopifyId: productId },
              update: {
                title: product.title,
                price: firstVariantPrice,
                sellingPrice: firstVariantPrice,
                costOfGoodsSold: firstVariantCost,
                handlingFees: calculatedHandlingFees,
                costSource: 'SHOPIFY',
                lastEdited: new Date(),
                status: product.status?.toLowerCase() || 'active'
              },
              create: {
                shopifyId: productId,
                storeId,
                title: product.title,
                price: firstVariantPrice,
                sellingPrice: firstVariantPrice,
                cost: firstVariantCost,
                costOfGoodsSold: firstVariantCost,
                handlingFees: calculatedHandlingFees,
                costSource: 'SHOPIFY',
                status: product.status?.toLowerCase() || 'active',
                lastEdited: new Date()
              }
            })
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
    await (prisma as any).syncStatus.update({
      where: { id: syncStatus.id },
      data: {
        lastSyncAt: latestProductDate,
        syncInProgress: false,
        totalRecords: syncStatus.totalRecords + result.newOrders,
        errorMessage: result.message && result.message.length > 0 ? result.message : null
      }
    })

    result.success = true
    console.log(`Sync Service - Products sync completed. New: ${result.newOrders}, Updated: ${result.updatedOrders}, Errors: ${result.message?.length || 0}`)

  } catch (error) {
    console.error('Sync Service - Products sync failed:', error)
    result.message = `Sync failed: ${error}`
    
    try {
      await (prisma as any).syncStatus.updateMany({
        where: { storeId, dataType: 'products' },
        data: { syncInProgress: false, errorMessage: `Sync failed: ${error}` }
      })
    } catch (updateError) {
      console.error('Failed to update sync status after error:', updateError)
    }
  }

  return result
}

export async function syncAllData(storeId: string, timeframeDays: number = 30, options?: { skipProductsSync?: boolean, triggerReason?: string }) {
  console.log(`Sync Service - Starting ${options?.skipProductsSync ? 'orders-only' : 'full'} sync for store: ${storeId}`)
  console.log(`Sync Service - Trigger reason: ${options?.triggerReason || 'manual'}`)
  
  const results: any = {
    orders: await syncShopifyOrders(storeId, timeframeDays),
  }
  
  // ✅ OPTIMIZATION: Skip products sync for auto-detected new orders (prevents hanging)
  if (!options?.skipProductsSync) {
    console.log('🛍️ Including products sync in full sync...')
    results.products = await syncShopifyProducts(storeId, { reason: options?.triggerReason || 'manual', source: 'full_sync' })
  } else {
    console.log('⚡ Skipping products sync (auto-optimization for new orders only)')
    results.products = { success: true, ordersProcessed: 0, newOrders: 0, updatedOrders: 0, message: 'Skipped for auto-sync efficiency' }
  }
  
  console.log('Sync Service - Sync completed:', {
    orders: `${results.orders.newOrders} new, ${results.orders.updatedOrders} updated`,
    products: options?.skipProductsSync ? 'skipped' : `${results.products.newOrders} new, ${results.products.updatedOrders} updated`
  })
  
  return results
} 