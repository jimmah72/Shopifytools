import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncAllData, syncShopifyOrders, syncShopifyProducts } from '@/lib/shopify-sync'

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  const requestHeaders = request.headers
  const userAgent = requestHeaders.get('user-agent') || 'unknown'
  const referer = requestHeaders.get('referer') || 'unknown'
  const origin = requestHeaders.get('origin') || 'unknown'
  
  console.log('🚀 SYNC TRIGGER DETECTED - Main Sync API')
  console.log(`📅 Timestamp: ${timestamp}`)
  console.log(`🌐 User-Agent: ${userAgent}`)
  console.log(`🔗 Referer: ${referer}`)
  console.log(`📍 Origin: ${origin}`)
  
  try {
    const body = await request.json()
    const { storeId, dataType = 'all', timeframeDays = 30, triggerReason, triggerSource } = body
    
    // Log detailed trigger information
    console.log('🔍 SYNC TRIGGER DETAILS:')
    console.log(`   📊 Data Type: ${dataType}`)
    console.log(`   📅 Timeframe: ${timeframeDays} days`)
    console.log(`   🎯 Trigger Reason: ${triggerReason || 'not specified'}`)
    console.log(`   📍 Trigger Source: ${triggerSource || 'not specified'}`)
    console.log(`   📦 Request Body:`, JSON.stringify(body, null, 2))

    // Get store ID if not provided
    let targetStoreId = storeId
    if (!targetStoreId) {
      const store = await prisma.store.findFirst({
        select: { id: true }
      })
      
      if (!store) {
        return NextResponse.json(
          { error: 'No store found' },
          { status: 404 }
        )
      }
      
      targetStoreId = store.id
    }

    console.log(`Sync API - Starting sync for store: ${targetStoreId}, dataType: ${dataType}`)

    let results
    
    switch (dataType) {
      case 'orders':
        results = { orders: await syncShopifyOrders(targetStoreId, timeframeDays) }
        break
      case 'products':
        console.log('🎯 PRODUCTS SYNC INITIATED via API')
        results = { products: await syncShopifyProducts(targetStoreId, { reason: triggerReason, source: triggerSource }) }
        break
      case 'all':
      default:
        // ✅ OPTIMIZATION: For auto-sync triggers, skip products sync to prevent hanging
        const isAutoSync = triggerReason === 'auto' || triggerSource === 'auto' || triggerReason?.includes('auto')
        if (isAutoSync) {
          console.log('⚡ Auto-sync detected - optimizing to orders-only to prevent hanging')
          results = await syncAllData(targetStoreId, timeframeDays, { 
            skipProductsSync: true, 
            triggerReason: `${triggerReason} (auto-optimized)` 
          })
        } else {
          console.log('🛍️ Manual sync - including full products sync')
          results = await syncAllData(targetStoreId, timeframeDays, { 
            skipProductsSync: false, 
            triggerReason: triggerReason || 'manual' 
          })
        }
        break
    }

    console.log('Sync API - Sync completed:', results)

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      results
    })

  } catch (error) {
    console.error('Sync API - Error:', error)
    return NextResponse.json(
      { 
        error: 'Sync failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  console.log('Sync API - GET request received (status check)')
  
  try {
    // Get store ID from query params or use first store
    const searchParams = request.nextUrl.searchParams
    let storeId = searchParams.get('storeId')
    
    if (!storeId) {
      const store = await prisma.store.findFirst({
        select: { id: true }
      })
      
      if (!store) {
        return NextResponse.json(
          { error: 'No store found' },
          { status: 404 }
        )
      }
      
      storeId = store.id
    }

    // Get sync status for all data types
    const syncStatuses = await (prisma as any).syncStatus.findMany({
      where: { storeId },
      orderBy: { lastSyncAt: 'desc' }
    })

    // Get total records in local storage
    const [orderCount, productCount] = await Promise.all([
      (prisma as any).shopifyOrder.count({ where: { storeId } }),
      (prisma as any).shopifyProduct.count({ where: { storeId } })
    ])

    return NextResponse.json({
      storeId,
      syncStatuses,
      localData: {
        orders: orderCount,
        products: productCount
      },
      lastSyncTimes: {
        orders: syncStatuses.find((s: any) => s.dataType === 'orders')?.lastSyncAt,
        products: syncStatuses.find((s: any) => s.dataType === 'products')?.lastSyncAt
      }
    })

  } catch (error) {
    console.error('Sync API - Status check error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 