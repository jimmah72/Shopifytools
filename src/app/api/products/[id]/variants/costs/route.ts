import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getProductsVariantCostData } from '@/lib/shopify-api'
import { formatShopDomain } from '@/lib/shopify.config'

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface RouteParams {
  id: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id: productId } = params;

    // Get the first store from the database
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });

    if (!store) {
      return NextResponse.json(
        { error: 'No store connected. Please connect a Shopify store first.' },
        { status: 404 }
      );
    }

    if (!store.domain || !store.accessToken) {
      return NextResponse.json(
        { error: 'Store configuration is incomplete. Please reconnect your Shopify store.' },
        { status: 500 }
      );
    }

    // Format the store domain
    const formattedDomain = formatShopDomain(store.domain);
    
    console.log(`Variant Costs API - Fetching variant costs for product: ${productId}`);
    
    // First, check the product's cost source to determine display logic
    const savedProduct = await prisma.product.findFirst({
      where: {
        shopifyId: productId,
        storeId: store.id
      },
      select: {
        costSource: true,
        variants: {
          select: {
            id: true,
            cost: true,
            costSource: true
          }
        }
      }
    });
    
    const finalVariantCosts: Record<string, number> = {};
    
    if (savedProduct) {
      console.log(`Variant Costs API - Product cost source: ${savedProduct.costSource}`);
      
      if (savedProduct.costSource === 'MANUAL') {
        // MANUAL mode: Use saved database values for variants
        savedProduct.variants.forEach(variant => {
          if (variant.cost !== null) {
            finalVariantCosts[variant.id] = variant.cost;
            console.log(`Variant Costs API - Using saved manual cost for variant ${variant.id}: $${variant.cost}`);
          }
        });
      } else {
        // SHOPIFY mode: Always fetch fresh Shopify data for display (ignore saved manual values)
        console.log(`Variant Costs API - Product in SHOPIFY mode - fetching fresh Shopify costs for display`);
        const shopifyVariantCosts = await getProductsVariantCostData(
          formattedDomain, 
          store.accessToken, 
          [productId]
        );
        
        const productShopifyCosts = shopifyVariantCosts[productId] || {};
        Object.assign(finalVariantCosts, productShopifyCosts);
        console.log(`Variant Costs API - Using fresh Shopify costs for ${Object.keys(productShopifyCosts).length} variants (ignoring any saved manual values)`);
      }
    } else {
      // No saved product, fetch from Shopify
      console.log(`Variant Costs API - No saved product found, fetching all costs from Shopify`);
      const shopifyVariantCosts = await getProductsVariantCostData(
        formattedDomain, 
        store.accessToken, 
        [productId]
      );
      
      const productShopifyCosts = shopifyVariantCosts[productId] || {};
      Object.assign(finalVariantCosts, productShopifyCosts);
    }
    
    console.log(`Variant Costs API - Returning costs for ${Object.keys(finalVariantCosts).length} variants`);
    
    return NextResponse.json(finalVariantCosts);

  } catch (error) {
    console.error('Variant Costs API - Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch variant costs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 