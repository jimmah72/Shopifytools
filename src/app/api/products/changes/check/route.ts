import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const store = await prisma.store.findFirst();
    if (!store) {
      return NextResponse.json({ error: 'No store found' }, { status: 404 });
    }

    // Check for products modified in the last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Check for recent changes in Product table (manual cost updates)
    const recentProductChanges = await prisma.product.count({
      where: {
        storeId: store.id,
        updatedAt: {
          gte: twentyFourHoursAgo
        }
      }
    });

    // Check for recent changes in ProductVariant table (variant cost updates)
    const recentVariantChanges = await (prisma as any).productVariant.count({
      where: {
        product: {
          storeId: store.id
        },
        updatedAt: {
          gte: twentyFourHoursAgo
        }
      }
    });

    // Check for recent changes in ShopifyProduct table (product data sync)
    const recentShopifyProductChanges = await (prisma as any).shopifyProduct.count({
      where: {
        storeId: store.id,
        updatedAt: {
          gte: twentyFourHoursAgo
        }
      }
    });

    const hasChanges = recentProductChanges > 0 || 
                     recentVariantChanges > 0 || 
                     recentShopifyProductChanges > 0;

    console.log(`Products Changes Check - Recent changes in last 24h:`, {
      productChanges: recentProductChanges,
      variantChanges: recentVariantChanges,
      shopifyProductChanges: recentShopifyProductChanges,
      hasChanges
    });

    return NextResponse.json({
      hasChanges,
      details: {
        productChanges: recentProductChanges,
        variantChanges: recentVariantChanges,
        shopifyProductChanges: recentShopifyProductChanges,
        checkTime: new Date().toISOString(),
        checkPeriod: '24 hours'
      }
    });

  } catch (error) {
    console.error('Products Changes Check API - Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check for changes',
        hasChanges: true // Default to true if we can't check
      },
      { status: 500 }
    );
  }
} 