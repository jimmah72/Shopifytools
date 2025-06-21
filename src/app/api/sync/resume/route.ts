import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncShopifyOrders } from '@/lib/shopify-sync'

export async function POST() {
  console.log('Resume Sync API - POST request received')
  
  try {
    // Find stuck syncs (heartbeat older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    const stuckSyncs = await prisma.syncStatus.findMany({
      where: {
        syncInProgress: true,
        OR: [
          { lastHeartbeat: { lt: fiveMinutesAgo } },
          { lastHeartbeat: null }
        ]
      },
      include: {
        store: {
          select: { id: true, domain: true, accessToken: true }
        }
      }
    })

    console.log(`Resume Sync API - Found ${stuckSyncs.length} stuck syncs`)

    if (stuckSyncs.length === 0) {
      return NextResponse.json({ 
        message: 'No stuck syncs found',
        resumedSyncs: 0
      })
    }

    const results = []

    for (const stuckSync of stuckSyncs) {
      console.log(`Resume Sync API - Resuming sync for store ${stuckSync.storeId}, dataType: ${stuckSync.dataType}`)
      
      try {
        // Reset the sync status first
        await prisma.syncStatus.update({
          where: { id: stuckSync.id },
          data: {
            syncInProgress: false,
            lastHeartbeat: null,
            errorMessage: null
          }
        })

        // Resume the sync with the original timeframe
        if (stuckSync.dataType === 'orders') {
          const timeframeDays = stuckSync.timeframeDays || 30
          console.log(`Resume Sync API - Resuming orders sync with ${timeframeDays} days timeframe`)
          
          // Start sync in background (don't await)
          syncShopifyOrders(stuckSync.storeId, timeframeDays)
            .then(result => {
              console.log(`Resume Sync API - Background sync completed for store ${stuckSync.storeId}:`, result)
            })
            .catch(error => {
              console.error(`Resume Sync API - Background sync failed for store ${stuckSync.storeId}:`, error)
            })

          results.push({
            storeId: stuckSync.storeId,
            dataType: stuckSync.dataType,
            timeframeDays,
            status: 'resumed'
          })
        }
      } catch (error) {
        console.error(`Resume Sync API - Error resuming sync for store ${stuckSync.storeId}:`, error)
        results.push({
          storeId: stuckSync.storeId,
          dataType: stuckSync.dataType,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: `Resumed ${results.length} stuck syncs`,
      resumedSyncs: results.length,
      results
    })

  } catch (error) {
    console.error('Resume Sync API - Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to resume stuck syncs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 