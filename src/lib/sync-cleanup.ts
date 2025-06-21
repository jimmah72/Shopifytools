import { prisma } from '@/lib/prisma'

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

export async function cleanupStuckSyncs() {
  console.log('🔧 Sync Cleanup - Searching for stuck syncs...')
  
  const stuckSyncs = await findStuckSyncs()
  
  if (stuckSyncs.length === 0) {
    console.log('✅ No stuck syncs found')
    return {
      success: true,
      message: 'No stuck syncs found',
      cleanedUp: 0
    }
  }
  
  console.log(`🚨 Found ${stuckSyncs.length} stuck sync(s):`)
  stuckSyncs.forEach((sync: any) => {
    const minutesStuck = Math.floor((Date.now() - (sync.lastHeartbeat?.getTime() || sync.lastSyncAt.getTime())) / (1000 * 60))
    console.log(`   - ${sync.dataType} for store ${sync.storeId}: stuck for ${minutesStuck} minutes`)
  })
  
  // Reset all stuck syncs
  const resetResult = await (prisma as any).syncStatus.updateMany({
    where: {
      id: {
        in: stuckSyncs.map((sync: any) => sync.id)
      }
    },
    data: {
      syncInProgress: false,
      errorMessage: 'Sync was automatically reset due to timeout (likely crashed)',
      lastHeartbeat: null
    }
  })
  
  console.log(`✅ Reset ${resetResult.count} stuck sync(s)`)
  
  return {
    success: true,
    message: `Successfully reset ${resetResult.count} stuck sync(s)`,
    cleanedUp: resetResult.count,
    details: stuckSyncs.map((sync: any) => ({
      storeId: sync.storeId,
      dataType: sync.dataType,
      minutesStuck: Math.floor((Date.now() - (sync.lastHeartbeat?.getTime() || sync.lastSyncAt.getTime())) / (1000 * 60))
    }))
  }
} 