import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Product Costs API - PATCH request received for product ID:', params.id);
    
    const { costOfGoodsSold, handlingFees, miscFees, costSource } = await request.json();
    console.log('Product Costs API - Request data:', { costOfGoodsSold, handlingFees, miscFees, costSource });
    
    const shopifyProductId = params.id; // This is the Shopify product ID

    // Get the store to associate with the product
    const store = await prisma.store.findFirst();
    if (!store) {
      console.log('Product Costs API - No store found');
      return NextResponse.json(
        { error: 'No store found' },
        { status: 404 }
      );
    }

    console.log('Product Costs API - Store found:', store.id);

    const updateData: any = {};
    if (costOfGoodsSold !== undefined) updateData.costOfGoodsSold = costOfGoodsSold;
    if (handlingFees !== undefined) updateData.handlingFees = handlingFees;
    if (miscFees !== undefined) updateData.miscFees = miscFees;
    if (costSource !== undefined) updateData.costSource = costSource;
    updateData.lastEdited = new Date();

    console.log('Product Costs API - Update data prepared:', updateData);

    // Check if product already exists
    const existingProduct = await prisma.product.findUnique({
      where: { shopifyId: shopifyProductId }
    });

    console.log('Product Costs API - Existing product found:', existingProduct ? 'YES' : 'NO');
    if (existingProduct) {
      console.log('Product Costs API - Existing product details:', {
        id: existingProduct.id,
        title: existingProduct.title,
        currentMiscFees: existingProduct.miscFees
      });
    }

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
        costSource: costSource || 'SHOPIFY', // Default to SHOPIFY mode
        ...updateData
      },
    });

    console.log('Product Costs API - Product upserted successfully:', {
      id: updatedProduct.id,
      shopifyId: updatedProduct.shopifyId,
      miscFees: updatedProduct.miscFees,
      costOfGoodsSold: updatedProduct.costOfGoodsSold,
      handlingFees: updatedProduct.handlingFees,
      costSource: updatedProduct.costSource
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Product Costs API - Failed to update product costs:', error);
    return NextResponse.json(
      { error: 'Failed to update product costs' },
      { status: 500 }
    );
  }
} 