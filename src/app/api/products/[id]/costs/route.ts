import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Function to calculate handling fees from additional costs
async function calculateHandlingFeesFromAdditionalCosts(storeId: string, productPrice: number): Promise<number> {
  try {
    // Fetch all active additional costs for the store
    const additionalCosts = await (prisma as any).additionalCost.findMany({
      where: { 
        storeId: storeId,
        isActive: true 
      }
    });

    if (!additionalCosts || additionalCosts.length === 0) {
      return 0;
    }

    let totalHandlingFees = 0;

    additionalCosts.forEach((cost: any) => {
      // Item-level fees (direct application)
      totalHandlingFees += cost.flatRatePerItem || 0;
      totalHandlingFees += (cost.percentagePerItem || 0) * productPrice / 100;

      // Order-level fees (applied per item - user requirement)
      totalHandlingFees += cost.flatRatePerOrder || 0;
      totalHandlingFees += (cost.percentagePerOrder || 0) * productPrice / 100;
    });

    return Math.round(totalHandlingFees * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error calculating handling fees from additional costs:', error);
    return 0;
  }
}

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

    // ✅ NEW: If switching to SHOPIFY mode, fetch and populate Shopify cost data
    if (costSource === 'SHOPIFY') {
      console.log('Product Costs API - Switching to SHOPIFY mode, fetching Shopify data...');
      
      // Get Shopify product data
      const shopifyProduct = await (prisma as any).shopifyProduct.findUnique({
        where: { id: shopifyProductId },
        include: {
          variants: {
            orderBy: { id: 'asc' }, // Get consistent first variant
            take: 1 // Just get the first variant for cost
          }
        }
      });

      if (shopifyProduct && shopifyProduct.variants.length > 0) {
        const firstVariant = shopifyProduct.variants[0];
        const shopifyPrice = firstVariant.price || 0;
        const shopifyCost = firstVariant.costPerItem || 0;
        
        // Calculate handling fees based on Shopify price
        const calculatedHandlingFees = await calculateHandlingFeesFromAdditionalCosts(store.id, shopifyPrice);
        
        // Update data with Shopify values
        updateData.price = shopifyPrice;
        updateData.sellingPrice = shopifyPrice;
        updateData.costOfGoodsSold = shopifyCost;
        updateData.handlingFees = calculatedHandlingFees;
        updateData.title = shopifyProduct.title;
        updateData.status = shopifyProduct.status || 'active';
        
        console.log('Product Costs API - Populated Shopify data:', {
          price: shopifyPrice,
          cost: shopifyCost,
          handlingFees: calculatedHandlingFees,
          title: shopifyProduct.title
        });
      } else {
        console.log('Product Costs API - No Shopify product/variant data found, using defaults');
        // Calculate handling fees based on current price if available
        const existingProduct = await prisma.product.findUnique({
          where: { shopifyId: shopifyProductId }
        });
        
        if (existingProduct && existingProduct.sellingPrice > 0) {
          const calculatedHandlingFees = await calculateHandlingFeesFromAdditionalCosts(store.id, existingProduct.sellingPrice);
          updateData.handlingFees = calculatedHandlingFees;
          console.log('Product Costs API - Calculated handling fees for existing price:', calculatedHandlingFees);
        }
      }
    }

    console.log('Product Costs API - Final update data prepared:', updateData);

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