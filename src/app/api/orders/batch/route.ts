import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(request: Request) {
  try {
    const { orderIds, action } = await request.json()

    if (!orderIds || !Array.isArray(orderIds) || !action) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      )
    }

    let result

    switch (action) {
      case 'markFulfilled':
        result = await prisma.order.updateMany({
          where: {
            id: {
              in: orderIds,
            },
          },
          data: {
            status: 'FULFILLED',
            updatedAt: new Date(),
          },
        })
        break

      case 'markUnfulfilled':
        result = await prisma.order.updateMany({
          where: {
            id: {
              in: orderIds,
            },
          },
          data: {
            status: 'UNFULFILLED',
            updatedAt: new Date(),
          },
        })
        break

      case 'archive':
        result = await prisma.order.updateMany({
          where: {
            id: {
              in: orderIds,
            },
          },
          data: {
            status: 'ARCHIVED',
            updatedAt: new Date(),
          },
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      message: `Successfully processed ${result.count} orders`,
      count: result.count,
    })
  } catch (error) {
    console.error('Error processing batch action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 