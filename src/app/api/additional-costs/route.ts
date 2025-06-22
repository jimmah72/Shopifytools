import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch all additional costs for a store
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    const additionalCosts = await (prisma as any).additionalCost.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ additionalCosts });
  } catch (error) {
    console.error('Error fetching additional costs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new additional cost
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      storeId, 
      name, 
      percentagePerOrder, 
      percentagePerItem, 
      flatRatePerOrder, 
      flatRatePerItem, 
      isActive 
    } = body;

    if (!storeId || !name) {
      return NextResponse.json({ error: 'Store ID and name are required' }, { status: 400 });
    }

    // Validate numeric values
    const data = {
      storeId,
      name: name.trim(),
      percentagePerOrder: parseFloat(percentagePerOrder) || 0,
      percentagePerItem: parseFloat(percentagePerItem) || 0,
      flatRatePerOrder: parseFloat(flatRatePerOrder) || 0,
      flatRatePerItem: parseFloat(flatRatePerItem) || 0,
      isActive: Boolean(isActive)
    };

    // Basic validation
    for (const [key, value] of Object.entries(data)) {
      if (key.includes('percentage') && typeof value === 'number' && (value < 0 || value > 100)) {
        return NextResponse.json({ error: `Invalid ${key}: must be between 0-100%` }, { status: 400 });
      }
      if (key.includes('flatRate') && typeof value === 'number' && value < 0) {
        return NextResponse.json({ error: `Invalid ${key}: must be positive` }, { status: 400 });
      }
    }

    const additionalCost = await (prisma as any).additionalCost.create({
      data
    });

    return NextResponse.json(additionalCost);
  } catch (error) {
    console.error('Error creating additional cost:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update an existing additional cost
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      name, 
      percentagePerOrder, 
      percentagePerItem, 
      flatRatePerOrder, 
      flatRatePerItem, 
      isActive 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const data = {
      name: name?.trim(),
      percentagePerOrder: percentagePerOrder !== undefined ? parseFloat(percentagePerOrder) : undefined,
      percentagePerItem: percentagePerItem !== undefined ? parseFloat(percentagePerItem) : undefined,
      flatRatePerOrder: flatRatePerOrder !== undefined ? parseFloat(flatRatePerOrder) : undefined,
      flatRatePerItem: flatRatePerItem !== undefined ? parseFloat(flatRatePerItem) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined
    };

    // Remove undefined values
    Object.keys(data).forEach(key => (data as any)[key] === undefined && delete (data as any)[key]);

    const additionalCost = await (prisma as any).additionalCost.update({
      where: { id },
      data
    });

    return NextResponse.json(additionalCost);
  } catch (error) {
    console.error('Error updating additional cost:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete an additional cost
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await (prisma as any).additionalCost.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting additional cost:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 