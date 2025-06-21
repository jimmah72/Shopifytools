import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch fee configuration for a store
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    // Find existing fee configuration or create default one
    let feeConfig = await (prisma as any).feeConfiguration.findUnique({
      where: { storeId }
    });

    if (!feeConfig) {
      // Create default fee configuration
      feeConfig = await (prisma as any).feeConfiguration.create({
        data: {
          storeId,
          paymentGatewayRate: 0.029,
          processingFeePerOrder: 0.30,
          defaultCogRate: 0.40,
          overheadCostRate: 0.00,
          overheadCostPerOrder: 0.00,
          overheadCostPerItem: 0.00,
          miscCostRate: 0.00,
          miscCostPerOrder: 0.00,
          miscCostPerItem: 0.00,
          chargebackRate: 0.001,
          returnRate: 0.05,
        }
      });
    }

    return NextResponse.json(feeConfig);
  } catch (error) {
    console.error('Error fetching fee configuration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update fee configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      storeId, 
      paymentGatewayRate, 
      processingFeePerOrder, 
      defaultCogRate,
      overheadCostRate,
      overheadCostPerOrder,
      overheadCostPerItem,
      miscCostRate,
      miscCostPerOrder,
      miscCostPerItem,
      chargebackRate,
      returnRate
    } = body;

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    // Validate rates are numbers and within reasonable ranges
    const rates = {
      paymentGatewayRate: parseFloat(paymentGatewayRate),
      processingFeePerOrder: parseFloat(processingFeePerOrder),
      defaultCogRate: parseFloat(defaultCogRate),
      overheadCostRate: parseFloat(overheadCostRate),
      overheadCostPerOrder: parseFloat(overheadCostPerOrder),
      overheadCostPerItem: parseFloat(overheadCostPerItem),
      miscCostRate: parseFloat(miscCostRate),
      miscCostPerOrder: parseFloat(miscCostPerOrder),
      miscCostPerItem: parseFloat(miscCostPerItem),
      chargebackRate: parseFloat(chargebackRate),
      returnRate: parseFloat(returnRate),
    };

    // Basic validation
    for (const [key, value] of Object.entries(rates)) {
      if (isNaN(value) || value < 0) {
        return NextResponse.json({ error: `Invalid ${key}: must be a positive number` }, { status: 400 });
      }
      if (key.includes('Rate') && key !== 'processingFeePerOrder' && value > 1) {
        return NextResponse.json({ error: `Invalid ${key}: rate cannot exceed 100%` }, { status: 400 });
      }
    }

    // Upsert fee configuration
    const feeConfig = await (prisma as any).feeConfiguration.upsert({
      where: { storeId },
      update: rates,
      create: {
        storeId,
        ...rates
      }
    });

    return NextResponse.json(feeConfig);
  } catch (error) {
    console.error('Error updating fee configuration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create or reset fee configuration to defaults
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId } = body;

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    // Create or reset to default configuration
    const feeConfig = await (prisma as any).feeConfiguration.upsert({
      where: { storeId },
      update: {
        paymentGatewayRate: 0.029,
        processingFeePerOrder: 0.30,
        defaultCogRate: 0.40,
        overheadCostRate: 0.00,
        overheadCostPerOrder: 0.00,
        overheadCostPerItem: 0.00,
        miscCostRate: 0.00,
        miscCostPerOrder: 0.00,
        miscCostPerItem: 0.00,
        chargebackRate: 0.001,
        returnRate: 0.05,
      },
      create: {
        storeId,
        paymentGatewayRate: 0.029,
        processingFeePerOrder: 0.30,
        defaultCogRate: 0.40,
        overheadCostRate: 0.00,
        overheadCostPerOrder: 0.00,
        overheadCostPerItem: 0.00,
        miscCostRate: 0.00,
        miscCostPerOrder: 0.00,
        miscCostPerItem: 0.00,
        chargebackRate: 0.001,
        returnRate: 0.05,
      }
    });

    return NextResponse.json(feeConfig);
  } catch (error) {
    console.error('Error creating/resetting fee configuration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 