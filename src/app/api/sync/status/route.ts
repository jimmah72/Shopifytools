import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrdersCount } from '@/lib/shopify-api'
import { formatShopDomain } from '@/lib/shopify.config'
import { cleanupStuckSyncs } from '@/lib/sync-cleanup'

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
    const activeOrdersSync = await (prisma as any).syncStatus.findFirst({
      where: {
        storeId,
        dataType: 'orders',
        syncInProgress: true
      }
    })

    // ✅ DEBUG: Log what we found in the database
    if (activeOrdersSync) {
      console.log(`🔍 SYNC STATUS DEBUG - Found active sync in database:`)
      console.log(`   ID: ${activeOrdersSync.id}`)
      console.log(`   Store ID: ${activeOrdersSync.storeId}`)
      console.log(`   Sync In Progress: ${activeOrdersSync.syncInProgress}`)
      console.log(`   Last Heartbeat: ${activeOrdersSync.lastHeartbeat}`)
      console.log(`   Last Sync At: ${activeOrdersSync.lastSyncAt}`)
      console.log(`   Timeframe Days: ${activeOrdersSync.timeframeDays}`)
      console.log(`   Error Message: ${activeOrdersSync.errorMessage}`)
      
      // Check if this is a "ghost" sync (marked active but no recent heartbeat)
      const now = new Date()
      const heartbeatAge = activeOrdersSync.lastHeartbeat ? 
        (now.getTime() - new Date(activeOrdersSync.lastHeartbeat).getTime()) / 1000 / 60 : // minutes
        null
      
      if (heartbeatAge && heartbeatAge > 15) {
        console.log(`🚨 GHOST SYNC DETECTED: Last heartbeat was ${heartbeatAge.toFixed(1)} minutes ago!`)
        console.log(`   This sync is marked active but appears to be dead`)
        console.log(`   💀 AUTO-FIXING: Marking ghost sync as completed`)
        
        // Automatically fix ghost syncs
        await (prisma as any).syncStatus.update({
          where: { id: activeOrdersSync.id },
          data: {
            syncInProgress: false,
            lastHeartbeat: null,
            errorMessage: `Auto-completed ghost sync (stale heartbeat: ${heartbeatAge.toFixed(1)}min)`
          }
        })
        
        console.log(`✅ Ghost sync cleaned up automatically`)
      } else if (!activeOrdersSync.lastHeartbeat) {
        console.log(`🚨 GHOST SYNC DETECTED: No heartbeat recorded!`)
        console.log(`   💀 AUTO-FIXING: Marking sync without heartbeat as completed`)
        
        // Automatically fix syncs with no heartbeat
        await (prisma as any).syncStatus.update({
          where: { id: activeOrdersSync.id },
          data: {
            syncInProgress: false,
            lastHeartbeat: null,
            errorMessage: 'Auto-completed ghost sync (no heartbeat)'
          }
        })
        
        console.log(`✅ Ghost sync cleaned up automatically`)
      } else {
        console.log(`✅ Heartbeat is recent: ${heartbeatAge?.toFixed(1)} minutes ago`)
      }
    } else {
      console.log(`🔍 SYNC STATUS DEBUG - No active sync found in database`)
    }

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
      (prisma as any).syncStatus.findMany({
        where: { storeId },
        orderBy: { lastSyncAt: 'desc' }
      }),
      
      // Get count of synced orders in the timeframe
      (prisma as any).shopifyOrder.count({
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

    // Get sync status records for reference
    const ordersSyncStatus = syncStatuses.find((s: any) => s.dataType === 'orders')
    const productsSyncStatus = syncStatuses.find((s: any) => s.dataType === 'products')

    // ✅ AUTO-CLEANUP: Check if sync is complete but stuck with syncInProgress=true
    let isSyncActive = ordersSyncStatus?.syncInProgress || false
    
    // If sync shows as active but progress is 100%, it's likely stuck - clean it up
    if (isSyncActive && syncProgress >= 100 && totalOrdersFromShopify > 0) {
      console.log(`🔧 Sync Status API - Detected completed but stuck sync (${syncProgress}%), triggering cleanup...`)
      try {
        const cleanupResult = await cleanupStuckSyncs()
        console.log(`✅ Sync Status API - Cleanup result:`, cleanupResult)
        
        // Refresh sync status after cleanup
        const refreshedOrdersSync = await (prisma as any).syncStatus.findFirst({
          where: {
            storeId,
            dataType: 'orders',
            syncInProgress: true
          }
        })
        
        isSyncActive = refreshedOrdersSync?.syncInProgress || false
        console.log(`🔄 Sync Status API - After cleanup, isSyncActive: ${isSyncActive}`)
      } catch (cleanupError) {
        console.error('❌ Sync Status API - Cleanup failed:', cleanupError)
        // Continue with original status if cleanup fails
      }
    }
    
    const syncNeeded = syncProgress < 100 && !isSyncActive

    // Get product counts
    const localProductsCount = await (prisma as any).shopifyProduct.count({
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
        isActive: isSyncActive,        // ✅ Now correctly reflects actual sync running
        isNeeded: syncNeeded,          // ✅ New field for when sync is needed but not running
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