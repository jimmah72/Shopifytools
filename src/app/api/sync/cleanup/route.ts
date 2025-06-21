import { NextRequest, NextResponse } from 'next/server'
import { cleanupStuckSyncs, findStuckSyncs } from '@/lib/sync-cleanup'

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
      syncs: stuckSyncs.map((sync: any) => ({
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



// Note: cleanupStuckSyncs function is used internally by the POST handler above
// This file exports only HTTP method handlers (GET, POST) as required by Next.js App Router 