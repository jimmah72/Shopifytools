import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch fee configuration for a store
export async function GET(request: NextRequest) {
  try {
    // Get store ID automatically (same logic as dashboard API)
    let store = await prisma.store.findFirst({
      where: {
        accessToken: {
          not: 'pending-setup'
        }
      },
      select: { id: true, domain: true },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Fallback to any store
    if (!store) {
      store = await prisma.store.findFirst({
        select: { id: true, domain: true },
        orderBy: {
          updatedAt: 'desc'
        }
      });
    }

    if (!store) {
      return NextResponse.json({ error: 'No store connected. Please connect a Shopify store first.' }, { status: 404 });
    }

    const storeId = store.id;

    let feeConfiguration = await (prisma as any).feeConfiguration.findUnique({
      where: { storeId }
    });

    // Create default configuration if none exists
    if (!feeConfiguration) {
      console.log('📊 Creating default fee configuration for store:', storeId);
      
      feeConfiguration = await (prisma as any).feeConfiguration.create({
        data: {
          storeId,
          paymentGatewayRate: 0.029,     // 2.9%
          processingFeePerOrder: 0.30,   // $0.30
          defaultCogRate: 0.30,          // 30%
          chargebackRate: 0.006,         // 0.6%
          returnProcessingRate: 0.005,   // 0.5%
          overheadCostPerOrder: 0.00,
          overheadCostPerItem: 0.00,
          miscCostPerOrder: 0.00,
          miscCostPerItem: 0.00,
          usePaymentMethodFees: false,   // Default to basic mode
        }
      });
      console.log('✅ Created default fee configuration');
    }

    return NextResponse.json({ feeConfiguration });
  } catch (error) {
    console.error('Error fetching fee configuration:', error);
    return NextResponse.json({ error: 'Failed to fetch fee configuration' }, { status: 500 });
  }
}

// PUT - Update fee configuration
export async function PUT(request: NextRequest) {
  try {
    // Get store ID automatically (same logic as GET method)
    let store = await prisma.store.findFirst({
      where: {
        accessToken: {
          not: 'pending-setup'
        }
      },
      select: { id: true, domain: true },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Fallback to any store
    if (!store) {
      store = await prisma.store.findFirst({
        select: { id: true, domain: true },
        orderBy: {
          updatedAt: 'desc'
        }
      });
    }

    if (!store) {
      return NextResponse.json({ error: 'No store connected. Please connect a Shopify store first.' }, { status: 404 });
    }

    const storeId = store.id;

    const body = await request.json();
    const { 
      paymentGatewayRate, 
      processingFeePerOrder, 
      defaultCogRate,
      chargebackRate,
      returnProcessingRate,
      overheadCostPerOrder,
      overheadCostPerItem,
      miscCostPerOrder,
      miscCostPerItem,
      usePaymentMethodFees  // NEW: Toggle for payment method-specific fees
    } = body;

    // Validate rates (0-100% for percentages)
    const percentageFields = [
      { name: 'paymentGatewayRate', value: paymentGatewayRate },
      { name: 'defaultCogRate', value: defaultCogRate },
      { name: 'chargebackRate', value: chargebackRate },
      { name: 'returnProcessingRate', value: returnProcessingRate }
    ];

    for (const field of percentageFields) {
      if (field.value !== undefined && (field.value < 0 || field.value > 1)) {
        return NextResponse.json({ 
          error: `${field.name} must be between 0 and 1 (0% to 100%)` 
        }, { status: 400 });
      }
    }

    // Validate fixed fees (non-negative)
    const fixedFeeFields = [
      { name: 'processingFeePerOrder', value: processingFeePerOrder },
      { name: 'overheadCostPerOrder', value: overheadCostPerOrder },
      { name: 'overheadCostPerItem', value: overheadCostPerItem },
      { name: 'miscCostPerOrder', value: miscCostPerOrder },
      { name: 'miscCostPerItem', value: miscCostPerItem }
    ];

    for (const field of fixedFeeFields) {
      if (field.value !== undefined && field.value < 0) {
        return NextResponse.json({ 
          error: `${field.name} must be non-negative` 
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (paymentGatewayRate !== undefined) updateData.paymentGatewayRate = parseFloat(paymentGatewayRate);
    if (processingFeePerOrder !== undefined) updateData.processingFeePerOrder = parseFloat(processingFeePerOrder);
    if (defaultCogRate !== undefined) updateData.defaultCogRate = parseFloat(defaultCogRate);
    if (chargebackRate !== undefined) updateData.chargebackRate = parseFloat(chargebackRate);
    if (returnProcessingRate !== undefined) updateData.returnProcessingRate = parseFloat(returnProcessingRate);
    if (overheadCostPerOrder !== undefined) updateData.overheadCostPerOrder = parseFloat(overheadCostPerOrder);
    if (overheadCostPerItem !== undefined) updateData.overheadCostPerItem = parseFloat(overheadCostPerItem);
    if (miscCostPerOrder !== undefined) updateData.miscCostPerOrder = parseFloat(miscCostPerOrder);
    if (miscCostPerItem !== undefined) updateData.miscCostPerItem = parseFloat(miscCostPerItem);
    if (usePaymentMethodFees !== undefined) updateData.usePaymentMethodFees = Boolean(usePaymentMethodFees);

    const feeConfiguration = await (prisma as any).feeConfiguration.upsert({
      where: { storeId },
      create: {
        storeId,
        paymentGatewayRate: parseFloat(paymentGatewayRate || '0.029'),
        processingFeePerOrder: parseFloat(processingFeePerOrder || '0.30'),
        defaultCogRate: parseFloat(defaultCogRate || '0.30'),
        chargebackRate: parseFloat(chargebackRate || '0.006'),
        returnProcessingRate: parseFloat(returnProcessingRate || '0.005'),
        overheadCostPerOrder: parseFloat(overheadCostPerOrder || '0.00'),
        overheadCostPerItem: parseFloat(overheadCostPerItem || '0.00'),
        miscCostPerOrder: parseFloat(miscCostPerOrder || '0.00'),
        miscCostPerItem: parseFloat(miscCostPerItem || '0.00'),
        usePaymentMethodFees: Boolean(usePaymentMethodFees || false),
      },
      update: updateData
    });

    console.log('✅ Updated fee configuration:', {
      storeId,
      usePaymentMethodFees: feeConfiguration.usePaymentMethodFees,
      paymentGatewayRate: feeConfiguration.paymentGatewayRate
    });

    return NextResponse.json({ feeConfiguration });
  } catch (error) {
    console.error('Error updating fee configuration:', error);
    return NextResponse.json({ error: 'Failed to update fee configuration' }, { status: 500 });
  }
}

// POST - Create or reset fee configuration to defaults
export async function POST(request: NextRequest) {
  try {
    // Get store ID automatically (same logic as GET method)
    let store = await prisma.store.findFirst({
      where: {
        accessToken: {
          not: 'pending-setup'
        }
      },
      select: { id: true, domain: true },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Fallback to any store
    if (!store) {
      store = await prisma.store.findFirst({
        select: { id: true, domain: true },
        orderBy: {
          updatedAt: 'desc'
        }
      });
    }

    if (!store) {
      return NextResponse.json({ error: 'No store connected. Please connect a Shopify store first.' }, { status: 404 });
    }

    const storeId = store.id;

    const body = await request.json();
    const { 
      paymentGatewayRate = 0.029,
      processingFeePerOrder = 0.30,
      defaultCogRate = 0.30,
      chargebackRate = 0.006,
      returnProcessingRate = 0.005,
      overheadCostPerOrder = 0.00,
      overheadCostPerItem = 0.00,
      miscCostPerOrder = 0.00,
      miscCostPerItem = 0.00,
      usePaymentMethodFees = false
    } = body;

    const feeConfiguration = await (prisma as any).feeConfiguration.create({
      data: {
        storeId,
        paymentGatewayRate: parseFloat(paymentGatewayRate),
        processingFeePerOrder: parseFloat(processingFeePerOrder),
        defaultCogRate: parseFloat(defaultCogRate),
        chargebackRate: parseFloat(chargebackRate),
        returnProcessingRate: parseFloat(returnProcessingRate),
        overheadCostPerOrder: parseFloat(overheadCostPerOrder),
        overheadCostPerItem: parseFloat(overheadCostPerItem),
        miscCostPerOrder: parseFloat(miscCostPerOrder),
        miscCostPerItem: parseFloat(miscCostPerItem),
        usePaymentMethodFees: Boolean(usePaymentMethodFees),
      }
    });

    console.log('✅ Created fee configuration:', feeConfiguration);
    return NextResponse.json({ feeConfiguration });
  } catch (error) {
    console.error('Error creating fee configuration:', error);
    return NextResponse.json({ error: 'Failed to create fee configuration' }, { status: 500 });
  }
} 