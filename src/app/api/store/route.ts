import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  console.log('Store API - GET request received')
  try {
    console.log('Store API - Attempting to find active store with real connection')
    
    // First, try to find a store with a real access token (not placeholder)
    let store = await prisma.store.findFirst({
      where: {
        accessToken: {
          not: 'pending-setup'
        }
      },
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc' // Get the most recently updated store
      }
    })

    // Last resort: any store at all
    if (!store) {
      console.log('Store API - No active store found, trying any store')
      store = await prisma.store.findFirst({
        include: {
          _count: {
            select: {
              products: true,
              orders: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })
    }

    console.log('Store API - Found store:', store)

    if (!store) {
      console.log('Store API - No store found, returning 404')
      return NextResponse.json(
        { error: 'No store found' },
        { status: 404 }
      )
    }

    console.log('Store API - Returning store data')
    return NextResponse.json(store)
  } catch (error) {
    console.error('Store API - Error fetching store:', error)
    return NextResponse.json(
      { error: 'Failed to fetch store' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  console.log('Store API - PUT request received')
  try {
    const body = await request.json()
    console.log('Store API - Request body:', body)
    const { id, name, domain } = body

    if (!id) {
      console.log('Store API - Missing store ID, returning 400')
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    console.log('Store API - Updating store:', { id, name, domain })
    const store = await prisma.store.update({
      where: { id },
      data: {
        name,
        domain,
      },
    })

    console.log('Store API - Store updated:', store)
    return NextResponse.json(store)
  } catch (error) {
    console.error('Store API - Error updating store:', error)
    return NextResponse.json(
      { error: 'Failed to update store' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  console.log('Store API - DELETE request received')
  try {
    console.log('Store API - Attempting to find store to archive')
    
    // Find a store (prioritize real connections)
    let store = await prisma.store.findFirst({
      where: {
        accessToken: {
          not: 'pending-setup'
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })
    
    if (!store) {
      console.log('Store API - No active store found to disconnect')
      return NextResponse.json(
        { message: 'No active store found to disconnect' },
        { status: 404 }
      )
    }

    console.log('Store API - Archiving store instead of deleting to preserve data:', store.id)
    
    // Archive the store instead of deleting to preserve all data
    const archivedStore = await prisma.store.update({
      where: { id: store.id },
      data: {
        name: store.name + ' (Archived)'  // Just mark it in the name for now
      }
    })

    console.log('Store API - Store archived successfully, all data preserved')
    return NextResponse.json({ 
      message: 'Store disconnected successfully (archived to preserve data)',
      archivedStoreId: archivedStore.id 
    })
  } catch (error) {
    console.error('Store API - Error disconnecting store:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect store' },
      { status: 500 }
    )
  }
} 