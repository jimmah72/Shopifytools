import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { costOfGoodsSold, handlingFees, miscFees } = await request.json();
    const shopifyProductId = params.id; // This is the Shopify product ID

    // Get the store to associate with the product
    const store = await prisma.store.findFirst();
    if (!store) {
      return NextResponse.json(
        { error: 'No store found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (costOfGoodsSold !== undefined) updateData.costOfGoodsSold = costOfGoodsSold;
    if (handlingFees !== undefined) updateData.handlingFees = handlingFees;
    if (miscFees !== undefined) updateData.miscFees = miscFees;
    updateData.lastEdited = new Date();

    // Use upsert to either update existing product or create new one
    const updatedProduct = await prisma.product.upsert({
      where: { shopifyId: shopifyProductId },
      update: updateData,
      create: {
        shopifyId: shopifyProductId,
        storeId: store.id,
        title: 'Unknown Product', // Will be updated when we sync with Shopify
        description: null,
        price: 0, // Default price, will be updated when we sync
        cost: 0, // Default cost, will be updated when we sync
        status: 'ACTIVE',
        ...updateData
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Failed to update product costs:', error);
    return NextResponse.json(
      { error: 'Failed to update product costs' },
      { status: 500 }
    );
  }
} 