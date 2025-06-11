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

    const paymentGateways = await prisma.paymentGateway.findMany({
      where: { storeId },
    })

    return NextResponse.json(paymentGateways)
  } catch (error) {
    console.error('Error fetching payment gateways:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment gateways' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storeId, name, fixedFee, percentageFee, externalFee } = body

    if (!storeId || !name || fixedFee === undefined || percentageFee === undefined || externalFee === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const paymentGateway = await prisma.paymentGateway.create({
      data: {
        storeId,
        name,
        fixedFee,
        percentageFee,
        externalFee,
      },
    })

    return NextResponse.json(paymentGateway)
  } catch (error) {
    console.error('Error creating payment gateway:', error)
    return NextResponse.json(
      { error: 'Failed to create payment gateway' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, fixedFee, percentageFee, externalFee } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Payment gateway ID is required' },
        { status: 400 }
      )
    }

    const paymentGateway = await prisma.paymentGateway.update({
      where: { id },
      data: {
        name,
        fixedFee,
        percentageFee,
        externalFee,
      },
    })

    return NextResponse.json(paymentGateway)
  } catch (error) {
    console.error('Error updating payment gateway:', error)
    return NextResponse.json(
      { error: 'Failed to update payment gateway' },
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
        { error: 'Payment gateway ID is required' },
        { status: 400 }
      )
    }

    await prisma.paymentGateway.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting payment gateway:', error)
    return NextResponse.json(
      { error: 'Failed to delete payment gateway' },
      { status: 500 }
    )
  }
} 