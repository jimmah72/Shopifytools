import { NextRequest, NextResponse } from 'next/server'
import { cleanupStuckSyncs } from '@/lib/sync-cleanup'

// This endpoint can be called by external cron services (Vercel Cron, GitHub Actions, etc.)
// to automatically detect and recover stuck syncs

export async function GET(request: NextRequest) {
  console.log('Auto Recovery - Scheduled cleanup check started')
  
  try {
    // Check query parameter for authorization (simple protection)
    const searchParams = request.nextUrl.searchParams
    const authKey = searchParams.get('key')
    
    // Simple auth check (you should use a proper secret)
    if (authKey !== process.env.SYNC_RECOVERY_KEY && authKey !== 'auto-recovery-2025') {
      console.log('Auto Recovery - Unauthorized access attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.log('Auto Recovery - Running automatic sync cleanup...')
    
    // Use the existing cleanup function
    const result = await cleanupStuckSyncs()
    
    const response = {
      timestamp: new Date().toISOString(),
      status: 'completed',
      ...result
    }
    
    if (result.cleanedUp > 0) {
      console.log(`Auto Recovery - 🚨 Fixed ${result.cleanedUp} stuck sync(s) automatically!`)
    } else {
      console.log('Auto Recovery - ✅ No stuck syncs found, all good!')
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Auto Recovery - Error during automatic cleanup:', error)
    return NextResponse.json(
      { 
        timestamp: new Date().toISOString(),
        status: 'error',
        error: 'Auto recovery failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Same as GET but for webhook-style calls
  return GET(request)
} 