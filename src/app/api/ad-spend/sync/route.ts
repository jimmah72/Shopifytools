import { NextRequest, NextResponse } from 'next/server'
import { AdSpendService } from '@/lib/ad-spend-services'
import { prisma } from '@/lib/prisma'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.log('Ad Spend Sync API - POST request received')
  
  try {
    const { days = 30 } = await request.json().catch(() => ({}))
    
    // Get the current store using smart selection logic
    const store = await prisma.store.findFirst({
      where: {
        accessToken: {
          not: 'pending-setup'
        }
      },
      orderBy: [
        { updatedAt: 'desc' }
      ]
    })
    
    if (!store) {
      console.log('Ad Spend Sync API - No active store found')
      return NextResponse.json(
        { error: 'No active store found' },
        { status: 404 }
      )
    }
    
    console.log(`Ad Spend Sync API - Starting sync for store ${store.id}, ${days} days`)
    
    // Check for active integrations
    const integrations = await prisma.adSpendIntegration.findMany({
      where: {
        storeId: store.id,
        isActive: true
      }
    })
    
    if (integrations.length === 0) {
      console.log('Ad Spend Sync API - No active integrations found')
      return NextResponse.json(
        { 
          message: 'No active ad spend integrations found',
          totalIntegrations: 0,
          syncedRecords: 0
        },
        { status: 200 }
      )
    }
    
    console.log(`Ad Spend Sync API - Found ${integrations.length} active integrations`)
    
    // Sync ad spend data
    await AdSpendService.syncAdSpendData(store.id, days)
    
    // Get summary after sync
    const summary = await AdSpendService.getAdSpendSummary(store.id, days)
    
    console.log('Ad Spend Sync API - Sync completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Ad spend data synced successfully',
      totalIntegrations: integrations.length,
      platforms: integrations.map(i => i.platform),
      summary: {
        totalSpend: summary.totalSpend,
        platformBreakdown: summary.platformBreakdown,
        recordCount: summary.dailySpend.length
      }
    })
    
  } catch (error) {
    console.error('Ad Spend Sync API - Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync ad spend data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  console.log('Ad Spend Sync API - GET request received')
  
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    
    // Get the current store using smart selection logic
    const store = await prisma.store.findFirst({
      where: {
        accessToken: {
          not: 'pending-setup'
        }
      },
      orderBy: [
        { updatedAt: 'desc' }
      ]
    })
    
    if (!store) {
      console.log('Ad Spend Sync API - No active store found')
      return NextResponse.json(
        { error: 'No active store found' },
        { status: 404 }
      )
    }
    
    // Get current summary and integration status
    const [summary, integrations] = await Promise.all([
      AdSpendService.getAdSpendSummary(store.id, days),
      prisma.adSpendIntegration.findMany({
        where: {
          storeId: store.id
        },
        select: {
          id: true,
          platform: true,
          isActive: true,
          lastSyncAt: true,
          createdAt: true
        }
      })
    ])
    
    return NextResponse.json({
      summary,
      integrations: integrations.map(integration => ({
        ...integration,
        status: integration.isActive ? 'active' : 'inactive',
        lastSync: integration.lastSyncAt?.toISOString() || null,
        hasError: false // Will be available after Prisma client regeneration
      }))
    })
    
  } catch (error) {
    console.error('Ad Spend Sync API - Error:', error)
    return NextResponse.json(
      { error: 'Failed to get ad spend status' },
      { status: 500 }
    )
  }
} 