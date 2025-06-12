import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  console.log('Store API - GET request received')
  try {
    console.log('Store API - Attempting to find first store')
    const store = await prisma.store.findFirst({
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
    })

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
    console.log('Store API - Attempting to find and delete store')
    
    const store = await prisma.store.findFirst()
    
    if (!store) {
      console.log('Store API - No store found to delete')
      return NextResponse.json(
        { message: 'No store found to disconnect' },
        { status: 404 }
      )
    }

    console.log('Store API - Deleting store:', store.id)
    
    // Delete the store - this will cascade delete related data
    await prisma.store.delete({
      where: { id: store.id }
    })

    console.log('Store API - Store disconnected successfully')
    return NextResponse.json({ 
      message: 'Store disconnected successfully',
      deletedStoreId: store.id 
    })
  } catch (error) {
    console.error('Store API - Error disconnecting store:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect store' },
      { status: 500 }
    )
  }
} 