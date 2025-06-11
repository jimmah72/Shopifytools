import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const storeId = searchParams.get('storeId')

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    const shippingRules = await prisma.shippingRule.findMany({
      where: { storeId },
      include: {
        products: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    return NextResponse.json(shippingRules)
  } catch (error) {
    console.error('Error fetching shipping rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shipping rules' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storeId, name, baseRate, perItemRate, weightRate } = body

    if (!storeId || !name || baseRate === undefined || perItemRate === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const shippingRule = await prisma.shippingRule.create({
      data: {
        storeId,
        name,
        baseRate,
        perItemRate,
        weightRate,
      },
    })

    return NextResponse.json(shippingRule)
  } catch (error) {
    console.error('Error creating shipping rule:', error)
    return NextResponse.json(
      { error: 'Failed to create shipping rule' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, baseRate, perItemRate, weightRate } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Shipping rule ID is required' },
        { status: 400 }
      )
    }

    const shippingRule = await prisma.shippingRule.update({
      where: { id },
      data: {
        name,
        baseRate,
        perItemRate,
        weightRate,
      },
    })

    return NextResponse.json(shippingRule)
  } catch (error) {
    console.error('Error updating shipping rule:', error)
    return NextResponse.json(
      { error: 'Failed to update shipping rule' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Shipping rule ID is required' },
        { status: 400 }
      )
    }

    await prisma.shippingRule.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting shipping rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete shipping rule' },
      { status: 500 }
    )
  }
} 