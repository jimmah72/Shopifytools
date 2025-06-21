import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrdersCount } from '@/lib/shopify-api'
import { formatShopDomain } from '@/lib/shopify.config'

export async function GET(request: NextRequest) {
  console.log('Sync Status API - GET request received')
  
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    let storeId = searchParams.get('storeId')
    const timeframe = searchParams.get('timeframe') || '30d' // Default to 30 days
    
    // Get store ID if not provided
    if (!storeId) {
      const store = await prisma.store.findFirst({
        select: { id: true, domain: true, accessToken: true }
      })
      
      if (!store) {
        return NextResponse.json(
          { error: 'No store found' },
          { status: 404 }
        )
      }
      
      storeId = store.id
    } else {
      // Validate store exists
      const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, domain: true, accessToken: true }
      })
      
      if (!store) {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404 }
        )
      }
    }

    // Check if sync is currently active and get its timeframe
    const activeOrdersSync = await prisma.syncStatus.findFirst({
      where: {
        storeId,
        dataType: 'orders',
        syncInProgress: true
      }
    })

    // Use sync's stored timeframe if active, otherwise use UI timeframe
    const effectiveTimeframe = activeOrdersSync?.timeframeDays 
      ? `${activeOrdersSync.timeframeDays}d`
      : timeframe

    // Calculate date range based on effective timeframe
    const now = new Date()
    const startDate = new Date()
    
    const days = activeOrdersSync?.timeframeDays || (() => {
      switch (timeframe) {
        case '7d': return 7
        case '90d': return 90
        case '1y': return 365
        case '30d':
        default: return 30
      }
    })()
    
    startDate.setDate(now.getDate() - days)

    console.log(`Sync Status API - Getting sync status for ${timeframe} (${startDate.toISOString()} to ${now.toISOString()})`)

    // Get store info for API calls
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, domain: true, accessToken: true }
    })

    if (!store || !store.domain || !store.accessToken) {
      return NextResponse.json(
        { error: 'Store configuration incomplete' },
        { status: 500 }
      )
    }

    // Get sync status and counts in parallel
    const [syncStatuses, localOrdersCount, totalOrdersFromShopify] = await Promise.all([
      // Get sync status for all data types
      prisma.syncStatus.findMany({
        where: { storeId },
        orderBy: { lastSyncAt: 'desc' }
      }),
      
      // Get count of synced orders in the timeframe
      prisma.shopifyOrder.count({
        where: {
          storeId,
          createdAt: {
            gte: startDate,
            lte: now
          }
        }
      }),
      
      // Get total orders count from Shopify for the timeframe
      getOrdersCount(formatShopDomain(store.domain), store.accessToken, {
        created_at_min: startDate.toISOString(),
        created_at_max: now.toISOString(),
        status: 'any'
      })
    ])

    // Calculate sync progress
    const syncProgress = totalOrdersFromShopify > 0 
      ? Math.round((localOrdersCount / totalOrdersFromShopify) * 100 * 100) / 100 // Round to 2 decimal places
      : 0

    // Simple logic: sync is active if progress < 100%
    const isSyncActive = syncProgress < 100

    // Get sync status records for reference
    const ordersSyncStatus = syncStatuses.find(s => s.dataType === 'orders')
    const productsSyncStatus = syncStatuses.find(s => s.dataType === 'products')

    // Get product counts
    const localProductsCount = await prisma.shopifyProduct.count({
      where: { storeId }
    })

    const result = {
      storeId,
      timeframe,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      orders: {
        total: totalOrdersFromShopify,
        synced: localOrdersCount,
        progress: syncProgress,
        remaining: Math.max(0, totalOrdersFromShopify - localOrdersCount)
      },
      products: {
        synced: localProductsCount
      },
      sync: {
        isActive: isSyncActive,
        orders: {
          lastSyncAt: ordersSyncStatus?.lastSyncAt?.toISOString(),
          inProgress: ordersSyncStatus?.syncInProgress || false,
          errorMessage: ordersSyncStatus?.errorMessage
        },
        products: {
          lastSyncAt: productsSyncStatus?.lastSyncAt?.toISOString(),
          inProgress: productsSyncStatus?.syncInProgress || false,
          errorMessage: productsSyncStatus?.errorMessage
        }
      }
    }

    console.log('Sync Status API - Status calculated:', {
      timeframe,
      ordersProgress: `${localOrdersCount}/${totalOrdersFromShopify} (${syncProgress}%)`,
      isSyncActive
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Sync Status API - Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 