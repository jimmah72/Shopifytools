import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch all subscription fees for a store
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    const subscriptionFees = await (prisma as any).subscriptionFee.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(subscriptionFees);
  } catch (error) {
    console.error('Error fetching subscription fees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new subscription fee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      storeId, 
      name, 
      billingType, 
      monthlyAmount, 
      yearlyAmount, 
      isActive 
    } = body;

    if (!storeId || !name) {
      return NextResponse.json({ error: 'Store ID and name are required' }, { status: 400 });
    }

    const monthly = parseFloat(monthlyAmount) || 0;
    const yearly = parseFloat(yearlyAmount) || 0;
    const billing = billingType || 'MONTHLY';

    // Calculate daily rate based on billing type
    let dailyRate = 0;
    if (billing === 'MONTHLY' && monthly > 0) {
      dailyRate = (monthly * 12) / 365; // Convert monthly to daily
    } else if (billing === 'YEARLY' && yearly > 0) {
      dailyRate = yearly / 365; // Convert yearly to daily
    }

    const data = {
      storeId,
      name: name.trim(),
      billingType: billing,
      monthlyAmount: monthly,
      yearlyAmount: yearly,
      dailyRate,
      isActive: Boolean(isActive)
    };

    // Validation
    if (monthly < 0 || yearly < 0) {
      return NextResponse.json({ error: 'Amounts must be positive' }, { status: 400 });
    }

    if (!['MONTHLY', 'YEARLY'].includes(billing)) {
      return NextResponse.json({ error: 'Billing type must be MONTHLY or YEARLY' }, { status: 400 });
    }

    const subscriptionFee = await (prisma as any).subscriptionFee.create({
      data
    });

    return NextResponse.json(subscriptionFee);
  } catch (error) {
    console.error('Error creating subscription fee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update an existing subscription fee
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      name, 
      billingType, 
      monthlyAmount, 
      yearlyAmount, 
      isActive 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const monthly = monthlyAmount !== undefined ? parseFloat(monthlyAmount) : undefined;
    const yearly = yearlyAmount !== undefined ? parseFloat(yearlyAmount) : undefined;
    const billing = billingType || 'MONTHLY';

    // Calculate daily rate if amounts are provided
    let dailyRate = undefined;
    if (monthly !== undefined || yearly !== undefined || billingType !== undefined) {
      // Get current values if not provided
      const current = await (prisma as any).subscriptionFee.findUnique({
        where: { id }
      });
      
      if (!current) {
        return NextResponse.json({ error: 'Subscription fee not found' }, { status: 404 });
      }

      const finalMonthly = monthly !== undefined ? monthly : current.monthlyAmount;
      const finalYearly = yearly !== undefined ? yearly : current.yearlyAmount;
      const finalBilling = billingType || current.billingType;

      if (finalBilling === 'MONTHLY' && finalMonthly > 0) {
        dailyRate = (finalMonthly * 12) / 365;
      } else if (finalBilling === 'YEARLY' && finalYearly > 0) {
        dailyRate = finalYearly / 365;
      } else {
        dailyRate = 0;
      }
    }

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (billingType !== undefined) data.billingType = billing;
    if (monthly !== undefined) data.monthlyAmount = monthly;
    if (yearly !== undefined) data.yearlyAmount = yearly;
    if (dailyRate !== undefined) data.dailyRate = dailyRate;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const subscriptionFee = await (prisma as any).subscriptionFee.update({
      where: { id },
      data
    });

    return NextResponse.json(subscriptionFee);
  } catch (error) {
    console.error('Error updating subscription fee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a subscription fee
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await (prisma as any).subscriptionFee.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subscription fee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 