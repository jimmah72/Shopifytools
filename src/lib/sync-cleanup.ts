import { prisma } from '@/lib/prisma'
import { getOrdersCount } from '@/lib/shopify-api'
import { formatShopDomain } from '@/lib/shopify.config'

const SYNC_TIMEOUT_MINUTES = 30; // If sync has been "in progress" for more than 30 minutes, consider it stuck

export async function findStuckSyncs() {
  const timeoutThreshold = new Date(Date.now() - SYNC_TIMEOUT_MINUTES * 60 * 1000)
  
  return await (prisma as any).syncStatus.findMany({
    where: {
      syncInProgress: true,
      OR: [
        // No heartbeat for more than timeout period
        {
          lastHeartbeat: {
            lt: timeoutThreshold
          }
        },
        // No heartbeat at all but sync marked as in progress
        {
          lastHeartbeat: null,
          lastSyncAt: {
            lt: timeoutThreshold
          }
        }
      ]
    }
  })
}

// NEW: Find completed syncs that are stuck with syncInProgress=true
export async function findCompletedButStuckSyncs() {
  const stuckSyncs = []
  
  try {
    // Get all syncs marked as in progress
    const syncsInProgress = await (prisma as any).syncStatus.findMany({
      where: {
        syncInProgress: true,
        dataType: 'orders'
      },
      include: {
        store: {
          select: { id: true, domain: true, accessToken: true }
        }
      }
    })

    console.log(`🔍 Checking ${syncsInProgress.length} syncs marked as in progress...`)

    for (const sync of syncsInProgress) {
      if (!sync.store || !sync.store.domain || !sync.store.accessToken) {
        console.log(`⚠️ Skipping sync ${sync.id} - missing store data`)
        continue
      }

      try {
        // Calculate date range for this sync
        const now = new Date()
        const startDate = new Date()
        const days = sync.timeframeDays || 30
        startDate.setDate(now.getDate() - days)

        // Get counts to check if sync is actually complete
        const [localOrdersCount, totalOrdersFromShopify] = await Promise.all([
          (prisma as any).shopifyOrder.count({
            where: {
              storeId: sync.storeId,
              createdAt: {
                gte: startDate,
                lte: now
              }
            }
          }),
          getOrdersCount(formatShopDomain(sync.store.domain), sync.store.accessToken, {
            created_at_min: startDate.toISOString(),
            created_at_max: now.toISOString(),
            status: 'any'
          })
        ])

        const syncProgress = totalOrdersFromShopify > 0 
          ? Math.round((localOrdersCount / totalOrdersFromShopify) * 100 * 100) / 100
          : 0

        console.log(`📊 Sync ${sync.id}: ${localOrdersCount}/${totalOrdersFromShopify} (${syncProgress}%)`)

        // If sync is 100% complete but still marked as in progress, it's stuck
        if (syncProgress >= 100 && totalOrdersFromShopify > 0) {
          console.log(`🎯 Found completed but stuck sync: ${sync.id}`)
          stuckSyncs.push(sync)
        }
      } catch (error) {
        console.error(`❌ Error checking sync ${sync.id}:`, error)
        // If we can't check, assume it might be stuck
        stuckSyncs.push(sync)
      }
    }
  } catch (error) {
    console.error('❌ Error finding completed but stuck syncs:', error)
  }

  return stuckSyncs
}

export async function cleanupStuckSyncs() {
  console.log('🔧 Sync Cleanup - Searching for stuck syncs...')
  
  // Find both types of stuck syncs
  const [timeoutStuckSyncs, completedStuckSyncs] = await Promise.all([
    findStuckSyncs(),
    findCompletedButStuckSyncs()
  ])

  // Combine and deduplicate
  const allStuckSyncs = [...timeoutStuckSyncs]
  for (const completedSync of completedStuckSyncs) {
    if (!allStuckSyncs.find(s => s.id === completedSync.id)) {
      allStuckSyncs.push(completedSync)
    }
  }
  
  if (allStuckSyncs.length === 0) {
    console.log('✅ No stuck syncs found')
    return {
      success: true,
      message: 'No stuck syncs found',
      cleanedUp: 0
    }
  }
  
  console.log(`🚨 Found ${allStuckSyncs.length} stuck sync(s):`)
  allStuckSyncs.forEach((sync: any) => {
    const isCompleted = completedStuckSyncs.find(s => s.id === sync.id)
    if (isCompleted) {
      console.log(`   - ${sync.dataType} for store ${sync.storeId}: COMPLETED but stuck with syncInProgress=true`)
    } else {
      const minutesStuck = Math.floor((Date.now() - (sync.lastHeartbeat?.getTime() || sync.lastSyncAt.getTime())) / (1000 * 60))
      console.log(`   - ${sync.dataType} for store ${sync.storeId}: stuck for ${minutesStuck} minutes`)
    }
  })
  
  // Reset all stuck syncs
  const resetResult = await (prisma as any).syncStatus.updateMany({
    where: {
      id: {
        in: allStuckSyncs.map((sync: any) => sync.id)
      }
    },
    data: {
      syncInProgress: false,
      errorMessage: null,
      lastHeartbeat: null
    }
  })
  
  console.log(`✅ Reset ${resetResult.count} stuck sync(s)`)
  
  return {
    success: true,
    message: `Successfully reset ${resetResult.count} stuck sync(s)`,
    cleanedUp: resetResult.count,
    details: allStuckSyncs.map((sync: any) => {
      const isCompleted = completedStuckSyncs.find(s => s.id === sync.id)
      return {
        storeId: sync.storeId,
        dataType: sync.dataType,
        reason: isCompleted ? 'completed_but_stuck' : 'timeout_stuck',
        minutesStuck: isCompleted ? 0 : Math.floor((Date.now() - (sync.lastHeartbeat?.getTime() || sync.lastSyncAt.getTime())) / (1000 * 60))
      }
    })
  }
} 