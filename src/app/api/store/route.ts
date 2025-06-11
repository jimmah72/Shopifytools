import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // For now, we'll just return the first store
    // In a real app, you'd get the store based on the user's session
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

    if (!store) {
      return NextResponse.json(
        { error: 'No store found' },
        { status: 404 }
      )
    }

    return NextResponse.json(store)
  } catch (error) {
    console.error('Error fetching store:', error)
    return NextResponse.json(
      { error: 'Failed to fetch store' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, domain } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    const store = await prisma.store.update({
      where: { id },
      data: {
        name,
        domain,
      },
    })

    return NextResponse.json(store)
  } catch (error) {
    console.error('Error updating store:', error)
    return NextResponse.json(
      { error: 'Failed to update store' },
      { status: 500 }
    )
  }
} 