import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const storeId = searchParams.get('storeId')
    const type = searchParams.get('type') // 'fixed' or 'variable'

    if (!storeId || !type) {
      return NextResponse.json(
        { error: 'Store ID and cost type are required' },
        { status: 400 }
      )
    }

    if (type === 'fixed') {
      const fixedCosts = await prisma.fixedCost.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(fixedCosts)
    } else if (type === 'variable') {
      const variableCosts = await prisma.variableCost.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(variableCosts)
    } else {
      return NextResponse.json(
        { error: 'Invalid cost type' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error fetching costs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch costs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      storeId, 
      type,
      name, 
      amount, 
      category, 
      frequency,
      amountPerOrder,
      startDate,
      endDate 
    } = body

    if (!storeId || !type || !name || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (type === 'fixed') {
      if (amount === undefined || !frequency) {
        return NextResponse.json(
          { error: 'Amount and frequency are required for fixed costs' },
          { status: 400 }
        )
      }

      const fixedCost = await prisma.fixedCost.create({
        data: {
          storeId,
          name,
          amount,
          category,
          frequency,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : null,
        },
      })
      return NextResponse.json(fixedCost)
    } else if (type === 'variable') {
      if (amountPerOrder === undefined) {
        return NextResponse.json(
          { error: 'Amount per order is required for variable costs' },
          { status: 400 }
        )
      }

      const variableCost = await prisma.variableCost.create({
        data: {
          storeId,
          name,
          amountPerOrder,
          category,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : null,
        },
      })
      return NextResponse.json(variableCost)
    } else {
      return NextResponse.json(
        { error: 'Invalid cost type' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error creating cost:', error)
    return NextResponse.json(
      { error: 'Failed to create cost' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id,
      type,
      name, 
      amount, 
      category, 
      frequency,
      amountPerOrder,
      startDate,
      endDate 
    } = body

    if (!id || !type) {
      return NextResponse.json(
        { error: 'Cost ID and type are required' },
        { status: 400 }
      )
    }

    if (type === 'fixed') {
      const fixedCost = await prisma.fixedCost.update({
        where: { id },
        data: {
          name,
          amount,
          category,
          frequency,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : null,
        },
      })
      return NextResponse.json(fixedCost)
    } else if (type === 'variable') {
      const variableCost = await prisma.variableCost.update({
        where: { id },
        data: {
          name,
          amountPerOrder,
          category,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : null,
        },
      })
      return NextResponse.json(variableCost)
    } else {
      return NextResponse.json(
        { error: 'Invalid cost type' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error updating cost:', error)
    return NextResponse.json(
      { error: 'Failed to update cost' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const type = searchParams.get('type')

    if (!id || !type) {
      return NextResponse.json(
        { error: 'Cost ID and type are required' },
        { status: 400 }
      )
    }

    if (type === 'fixed') {
      await prisma.fixedCost.delete({
        where: { id },
      })
    } else if (type === 'variable') {
      await prisma.variableCost.delete({
        where: { id },
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid cost type' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting cost:', error)
    return NextResponse.json(
      { error: 'Failed to delete cost' },
      { status: 500 }
    )
  }
} 