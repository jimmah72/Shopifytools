import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncAllData, syncShopifyOrders, syncShopifyProducts } from '@/lib/shopify-sync'

export async function POST(request: NextRequest) {
  console.log('Sync API - POST request received')
  
  try {
    const body = await request.json()
    const { storeId, dataType = 'all', timeframeDays = 30 } = body

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
        results = { products: await syncShopifyProducts(targetStoreId) }
        break
      case 'all':
      default:
        results = await syncAllData(targetStoreId, timeframeDays)
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
    const syncStatuses = await prisma.syncStatus.findMany({
      where: { storeId },
      orderBy: { lastSyncAt: 'desc' }
    })

    // Get total records in local storage
    const [orderCount, productCount] = await Promise.all([
      prisma.shopifyOrder.count({ where: { storeId } }),
      prisma.shopifyProduct.count({ where: { storeId } })
    ])

    return NextResponse.json({
      storeId,
      syncStatuses,
      localData: {
        orders: orderCount,
        products: productCount
      },
      lastSyncTimes: {
        orders: syncStatuses.find(s => s.dataType === 'orders')?.lastSyncAt,
        products: syncStatuses.find(s => s.dataType === 'products')?.lastSyncAt
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