import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProductsVariantCostData } from '@/lib/shopify-api';
import { formatShopDomain } from '@/lib/shopify.config';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

interface SyncRequest {
  type: 'manual' | 'auto' | 'initial';
  priority?: 'current_page' | 'all'; // Start with current page products first
}

let syncInProgress = false;
let syncStatus = {
  syncInProgress: false,
  syncType: null as 'manual' | 'auto' | 'initial' | null,
  totalProducts: 0,
  processedProducts: 0,
  currentProduct: '',
  lastSyncAt: null as string | null,
  errorMessage: null as string | null,
  costDataUpdated: 0,
  productsWithCostData: 0
};

export async function POST(request: NextRequest) {
  try {
    const body: SyncRequest = await request.json();
    
    if (syncInProgress) {
      return NextResponse.json(
        { error: 'Sync already in progress' },
        { status: 409 }
      );
    }

    // Get store
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    });

    if (!store) {
      return NextResponse.json(
        { error: 'No store connected' },
        { status: 404 }
      );
    }

    console.log(`Products Sync API - Starting ${body.type} sync`);

    // Start sync in background
    startProductsSyncBackground(store, body.type);

    return NextResponse.json({ 
      message: 'Products sync started',
      type: body.type
    });

  } catch (error) {
    console.error('Products Sync API - Error:', error);
    return NextResponse.json(
      { error: 'Failed to start sync' },
      { status: 500 }
    );
  }
}

async function startProductsSyncBackground(
  store: { id: string; domain: string; accessToken: string },
  syncType: 'manual' | 'auto' | 'initial'
) {
  syncInProgress = true;
  syncStatus = {
    syncInProgress: true,
    syncType,
    totalProducts: 0,
    processedProducts: 0,
    currentProduct: '',
    lastSyncAt: null,
    errorMessage: null,
    costDataUpdated: 0,
    productsWithCostData: 0
  };

  try {
    console.log(`Products Sync - Starting ${syncType} sync for store ${store.domain}`);

    // Get all ShopifyProducts for this store
    const shopifyProducts = await (prisma as any).shopifyProduct.findMany({
      where: { storeId: store.id },
      include: {
        variants: true
      },
      orderBy: { title: 'asc' }
    });

    syncStatus.totalProducts = shopifyProducts.length;
    console.log(`Products Sync - Found ${shopifyProducts.length} products to sync`);

    const formattedDomain = formatShopDomain(store.domain);
    let costDataUpdated = 0;

    // Process products in batches to respect rate limits
    const batchSize = 10; // Conservative batch size for API calls
    
    for (let i = 0; i < shopifyProducts.length; i += batchSize) {
      const batch = shopifyProducts.slice(i, i + batchSize);
      const productIds = batch.map((p: any) => p.id);

      console.log(`Products Sync - Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(shopifyProducts.length / batchSize)} (${batch.length} products)`);

      try {
        // Fetch cost data for this batch
        const costData = await getProductsVariantCostData(
          formattedDomain, 
          store.accessToken, 
          productIds
        );

        // Update database with cost data
        for (const product of batch) {
          syncStatus.currentProduct = product.title;
          syncStatus.processedProducts = i + batch.indexOf(product) + 1;

          const productCostData = costData[product.id] || {};
          
          // Update variants with cost data
          for (const variant of product.variants) {
            const variantCost = productCostData[variant.id];
            
            if (variantCost !== undefined && variantCost > 0) {
              try {
                // First check if variant exists
                const existingVariant = await (prisma as any).shopifyProductVariant.findUnique({
                  where: { id: variant.id }
                });
                
                if (existingVariant) {
                  await (prisma as any).shopifyProductVariant.update({
                    where: { id: variant.id },
                    data: { 
                      costPerItem: variantCost
                    }
                  });
                  costDataUpdated++;
                  console.log(`Products Sync - Updated variant ${variant.id} with cost $${variantCost}`);
                } else {
                  console.log(`Products Sync - Variant ${variant.id} not found in database, skipping cost update`);
                }
              } catch (variantError) {
                console.error(`Products Sync - Error updating variant ${variant.id}:`, variantError);
              }
            }
          }
          
          // Update the ShopifyProduct's lastSyncedAt timestamp
          try {
            await (prisma as any).shopifyProduct.update({
              where: { id: product.id },
              data: { lastSyncedAt: new Date() }
            });
          } catch (productUpdateError) {
            console.error(`Products Sync - Error updating product sync timestamp ${product.id}:`, productUpdateError);
          }
        }

        // Small delay between batches to be respectful to API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (batchError) {
        console.error(`Products Sync - Error processing batch starting at ${i}:`, batchError);
        // Continue with next batch rather than failing entire sync
      }
    }

    // Count products with cost data
    const productsWithCostData = await (prisma as any).shopifyProduct.count({
      where: {
        storeId: store.id,
        variants: {
          some: {
            costPerItem: { gt: 0 }
          }
        }
      }
    });

    // Update sync status tracking
    await updateProductsSyncStatus(store.id, {
      lastSyncAt: new Date(),
      costDataUpdated,
      productsWithCostData,
      syncType
    });

    syncStatus = {
      syncInProgress: false,
      syncType: null,
      totalProducts: shopifyProducts.length,
      processedProducts: shopifyProducts.length,
      currentProduct: '',
      lastSyncAt: new Date().toISOString(),
      errorMessage: null,
      costDataUpdated,
      productsWithCostData
    };

    console.log(`Products Sync - Completed successfully: ${costDataUpdated} cost updates, ${productsWithCostData} products with cost data`);

  } catch (error) {
    console.error('Products Sync - Error:', error);
    syncStatus = {
      ...syncStatus,
      syncInProgress: false,
      syncType: null,
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  } finally {
    syncInProgress = false;
  }
}

async function updateProductsSyncStatus(
  storeId: string, 
  data: {
    lastSyncAt: Date;
    costDataUpdated: number;
    productsWithCostData: number;
    syncType: string;
  }
) {
  try {
    // Use or create a sync status record for products
    await (prisma as any).syncStatus.upsert({
      where: {
        storeId_dataType: {
          storeId,
          dataType: 'products_costs'
        }
      },
      update: {
        lastSyncAt: data.lastSyncAt,
        errorMessage: null,
        syncInProgress: false
      },
      create: {
        storeId,
        dataType: 'products_costs',
        lastSyncAt: data.lastSyncAt,
        syncInProgress: false,
        totalRecords: data.productsWithCostData
      }
    });
  } catch (error) {
    console.error('Products Sync - Error updating sync status:', error);
  }
}

// GET endpoint to retrieve current sync status
export async function GET() {
  try {
    const store = await prisma.store.findFirst();
    if (!store) {
      return NextResponse.json({ error: 'No store found' }, { status: 404 });
    }

    // Get sync status from database
    const dbSyncStatus = await (prisma as any).syncStatus.findUnique({
      where: {
        storeId_dataType: {
          storeId: store.id,
          dataType: 'products_costs'
        }
      }
    });

    // Count current products with cost data
    const [totalProducts, productsWithCostData] = await Promise.all([
      (prisma as any).shopifyProduct.count({
        where: { storeId: store.id }
      }),
      (prisma as any).shopifyProduct.count({
        where: {
          storeId: store.id,
          variants: {
            some: {
              costPerItem: { gt: 0 }
            }
          }
        }
      })
    ]);

    // Calculate next auto sync time (6am CST = 12pm UTC)
    const now = new Date();
    const nextSync = new Date();
    nextSync.setUTCHours(12, 0, 0, 0); // 6am CST = 12pm UTC
    if (nextSync <= now) {
      nextSync.setDate(nextSync.getDate() + 1);
    }

    const status = {
      syncInProgress: syncStatus.syncInProgress,
      syncType: syncStatus.syncType,
      totalProducts: syncStatus.syncInProgress ? syncStatus.totalProducts : totalProducts,
      processedProducts: syncStatus.processedProducts,
      currentProduct: syncStatus.currentProduct,
      lastSyncAt: dbSyncStatus?.lastSyncAt?.toISOString() || null,
      nextAutoSync: nextSync.toISOString(),
      errorMessage: syncStatus.errorMessage,
      costDataUpdated: syncStatus.costDataUpdated,
      productsWithCostData: syncStatus.syncInProgress ? syncStatus.productsWithCostData : productsWithCostData
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error('Products Sync Status API - Error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
} 