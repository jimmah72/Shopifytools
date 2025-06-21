import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SYNC_TIMEOUT_MINUTES = 30; // If sync has been "in progress" for more than 30 minutes, consider it stuck

export async function POST(request: NextRequest) {
  console.log('Sync Cleanup - POST request received (manual cleanup)')
  
  try {
    const result = await cleanupStuckSyncs()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Sync Cleanup - Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to cleanup stuck syncs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  console.log('Sync Cleanup - GET request received (status check)')
  
  try {
    // Just check for stuck syncs without cleaning them
    const stuckSyncs = await findStuckSyncs()
    
    return NextResponse.json({
      stuckSyncs: stuckSyncs.length,
      syncs: stuckSyncs.map(sync => ({
        storeId: sync.storeId,
        dataType: sync.dataType,
        lastSyncAt: sync.lastSyncAt,
        lastHeartbeat: sync.lastHeartbeat,
        minutesStuck: Math.floor((Date.now() - sync.lastHeartbeat.getTime()) / (1000 * 60))
      }))
    })
  } catch (error) {
    console.error('Sync Cleanup - Error checking stuck syncs:', error)
    return NextResponse.json(
      { error: 'Failed to check stuck syncs' },
      { status: 500 }
    )
  }
}

async function findStuckSyncs() {
  const timeoutThreshold = new Date(Date.now() - SYNC_TIMEOUT_MINUTES * 60 * 1000)
  
  return await prisma.syncStatus.findMany({
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

async function cleanupStuckSyncs() {
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
  stuckSyncs.forEach(sync => {
    const minutesStuck = Math.floor((Date.now() - (sync.lastHeartbeat?.getTime() || sync.lastSyncAt.getTime())) / (1000 * 60))
    console.log(`   - ${sync.dataType} for store ${sync.storeId}: stuck for ${minutesStuck} minutes`)
  })
  
  // Reset all stuck syncs
  const resetResult = await prisma.syncStatus.updateMany({
    where: {
      id: {
        in: stuckSyncs.map(sync => sync.id)
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
    details: stuckSyncs.map(sync => ({
      storeId: sync.storeId,
      dataType: sync.dataType,
      minutesStuck: Math.floor((Date.now() - (sync.lastHeartbeat?.getTime() || sync.lastSyncAt.getTime())) / (1000 * 60))
    }))
  }
}

// Export the cleanup function for use by other modules
export { cleanupStuckSyncs } 