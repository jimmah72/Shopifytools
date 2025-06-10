import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  console.log('Received GET request to /api/orders')
  try {
    const searchParams = request.nextUrl.searchParams
    const sortField = searchParams.get('sortField') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const skip = (page - 1) * limit

    console.log('Query parameters:', {
      sortField,
      sortOrder,
      page,
      limit,
      search,
      startDate,
      endDate,
    })

    // Get the first store (for now, later we'll handle multi-store)
    const store = await prisma.store.findFirst()
    console.log('Found store:', store)

    if (!store) {
      console.log('No store found')
      return NextResponse.json(
        { error: 'No store found' },
        { status: 404 }
      )
    }

    // Build where clause for filtering
    const where: any = {
      storeId: store.id,
      status: 'ACTIVE', // Only show active orders by default
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customer: { firstName: { contains: search } } },
        { customer: { lastName: { contains: search } } },
        { customer: { email: { contains: search } } },
      ]
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    console.log('Query where clause:', where)

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        take: limit,
        skip,
        orderBy: {
          [sortField]: sortOrder,
        },
        include: {
          customer: true,
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ])

    console.log(`Found ${orders.length} orders out of ${total} total`)

    return NextResponse.json({
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error in /api/orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 