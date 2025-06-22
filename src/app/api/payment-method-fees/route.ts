import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Default payment method configurations
const DEFAULT_PAYMENT_METHODS = [
  {
    paymentMethod: 'shopify_payments_web',
    displayName: 'Shopify Payments (Online)',
    percentageRate: 0.029,
    fixedFee: 0.30,
  },
  {
    paymentMethod: 'shopify_payments_pos',
    displayName: 'Shopify Payments (In-Person)',
    percentageRate: 0.027,
    fixedFee: 0.30,
  },
  {
    paymentMethod: 'paypal_web',
    displayName: 'PayPal (Online)',
    percentageRate: 0.0349,
    fixedFee: 0.49,
  },
  {
    paymentMethod: 'stripe_web',
    displayName: 'Stripe (Online)',
    percentageRate: 0.029,
    fixedFee: 0.30,
  },
  {
    paymentMethod: 'manual_unknown',
    displayName: 'Manual Payment',
    percentageRate: 0.00,
    fixedFee: 0.00,
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 })
    }

    // Get existing payment method fees
    const paymentMethodFees = await prisma.paymentMethodFee.findMany({
      where: { storeId },
      orderBy: { paymentMethod: 'asc' }
    })

    // If no payment method fees exist, create defaults
    if (paymentMethodFees.length === 0) {
      console.log('📊 Creating default payment method fees for store:', storeId)
      
      const defaultFees = DEFAULT_PAYMENT_METHODS.map(method => ({
        ...method,
        storeId
      }))

      await prisma.paymentMethodFee.createMany({
        data: defaultFees
      })

      // Fetch the newly created fees
      const newPaymentMethodFees = await prisma.paymentMethodFee.findMany({
        where: { storeId },
        orderBy: { paymentMethod: 'asc' }
      })

      return NextResponse.json({ paymentMethodFees: newPaymentMethodFees })
    }

    return NextResponse.json({ paymentMethodFees })
  } catch (error) {
    console.error('Error fetching payment method fees:', error)
    return NextResponse.json({ error: 'Failed to fetch payment method fees' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storeId, paymentMethod, displayName, percentageRate, fixedFee, isActive } = body

    if (!storeId || !paymentMethod || !displayName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate rates
    if (percentageRate < 0 || percentageRate > 1) {
      return NextResponse.json({ error: 'Percentage rate must be between 0 and 1' }, { status: 400 })
    }

    if (fixedFee < 0) {
      return NextResponse.json({ error: 'Fixed fee must be non-negative' }, { status: 400 })
    }

    // Check if payment method already exists
    const existingFee = await prisma.paymentMethodFee.findUnique({
      where: { 
        storeId_paymentMethod: {
          storeId,
          paymentMethod
        }
      }
    })

    if (existingFee) {
      return NextResponse.json({ error: 'Payment method already exists' }, { status: 409 })
    }

    const newPaymentMethodFee = await prisma.paymentMethodFee.create({
      data: {
        storeId,
        paymentMethod,
        displayName,
        percentageRate: parseFloat(percentageRate),
        fixedFee: parseFloat(fixedFee),
        isActive: isActive !== undefined ? isActive : true
      }
    })

    console.log('✅ Created payment method fee:', newPaymentMethodFee)
    return NextResponse.json({ paymentMethodFee: newPaymentMethodFee })
  } catch (error) {
    console.error('Error creating payment method fee:', error)
    return NextResponse.json({ error: 'Failed to create payment method fee' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, displayName, percentageRate, fixedFee, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'Payment method fee ID is required' }, { status: 400 })
    }

    // Validate rates if provided
    if (percentageRate !== undefined && (percentageRate < 0 || percentageRate > 1)) {
      return NextResponse.json({ error: 'Percentage rate must be between 0 and 1' }, { status: 400 })
    }

    if (fixedFee !== undefined && fixedFee < 0) {
      return NextResponse.json({ error: 'Fixed fee must be non-negative' }, { status: 400 })
    }

    const updateData: any = {}
    if (displayName !== undefined) updateData.displayName = displayName
    if (percentageRate !== undefined) updateData.percentageRate = parseFloat(percentageRate)
    if (fixedFee !== undefined) updateData.fixedFee = parseFloat(fixedFee)
    if (isActive !== undefined) updateData.isActive = isActive

    const updatedPaymentMethodFee = await prisma.paymentMethodFee.update({
      where: { id },
      data: updateData
    })

    console.log('✅ Updated payment method fee:', updatedPaymentMethodFee)
    return NextResponse.json({ paymentMethodFee: updatedPaymentMethodFee })
  } catch (error) {
    console.error('Error updating payment method fee:', error)
    return NextResponse.json({ error: 'Failed to update payment method fee' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Payment method fee ID is required' }, { status: 400 })
    }

    await prisma.paymentMethodFee.delete({
      where: { id }
    })

    console.log('✅ Deleted payment method fee:', id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting payment method fee:', error)
    return NextResponse.json({ error: 'Failed to delete payment method fee' }, { status: 500 })
  }
} 