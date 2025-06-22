import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProductsVariantCostData } from '@/lib/shopify-api';
import { formatShopDomain } from '@/lib/shopify.config';

// Helper function to save product and variant data to database
async function saveProductAndVariantDataToDatabase(storeId: string, shopifyProducts: any[]) {
  console.log(`\n🔄 Products Sync - Starting database save for ${shopifyProducts.length} products`);
  
  let productsCreated = 0;
  let productsUpdated = 0;
  let variantsCreated = 0;
  let variantsUpdated = 0;
  let costDataPreserved = 0;
  let costDataUpdated = 0;
  let processingErrors = 0;
  
  for (let i = 0; i < shopifyProducts.length; i++) {
    const product = shopifyProducts[i];
    try {
      const productId = product.id.includes('gid://shopify/Product/') 
        ? product.id.replace('gid://shopify/Product/', '')
        : product.id;

      console.log(`\n📦 [${i + 1}/${shopifyProducts.length}] Processing "${product.title}" (ID: ${productId})`);

      // Check if product exists
      const existingProduct = await (prisma as any).shopifyProduct.findUnique({
        where: { id: productId }
      });

      // Update or create the ShopifyProduct record
      const productData = {
        id: productId,
        storeId,
        title: product.title,
        handle: product.handle,
        description: product.description || null,
        productType: product.productType || null,
        vendor: product.vendor || null,
        tags: product.tags?.join(',') || null,
        status: product.status?.toLowerCase() || 'active',
        createdAt: new Date(product.createdAt || new Date()),
        updatedAt: new Date(product.updatedAt || new Date()),
        publishedAt: product.publishedAt ? new Date(product.publishedAt) : null,
        images: product.images || null,
        lastSyncedAt: new Date()
      };

      await (prisma as any).shopifyProduct.upsert({
        where: { id: productId },
        update: productData,
        create: productData
      });

      if (existingProduct) {
        productsUpdated++;
        console.log(`   ✅ Product UPDATED in database`);
      } else {
        productsCreated++;
        console.log(`   🆕 Product CREATED in database`);
      }

      // ✅ FIXED: Handle variants with upsert to preserve existing data
      if (product.variants && Array.isArray(product.variants)) {
        console.log(`   🔧 Processing ${product.variants.length} variants...`);
        
        for (const variant of product.variants) {
          const variantId = variant.id.includes('gid://shopify/ProductVariant/') 
            ? variant.id.replace('gid://shopify/ProductVariant/', '')
            : variant.id;

          const newCostPerItem = variant.inventoryItem?.unitCost?.amount ? parseFloat(variant.inventoryItem.unitCost.amount) : null;

          try {
            // Check if variant exists and get current cost
            const existingVariant = await (prisma as any).shopifyProductVariant.findUnique({
              where: { id: variantId },
              select: { id: true, costPerItem: true, title: true }
            });

            const shouldUpdateCost = newCostPerItem && newCostPerItem > 0;
            const existingCost = existingVariant?.costPerItem || 0;
            
            await (prisma as any).shopifyProductVariant.upsert({
              where: { id: variantId },
              update: {
                // ✅ SAFE: Update basic product info from Shopify
                title: variant.title || 'Default Title',
                sku: variant.sku || null,
                price: parseFloat(variant.price) || 0,
                compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
                inventoryQuantity: variant.inventoryQuantity || 0,
                inventoryPolicy: variant.inventoryPolicy || null,
                inventoryManagement: variant.inventoryManagement || null,
                weight: variant.weight ? parseFloat(variant.weight) : null,
                weightUnit: variant.weightUnit || null,
                fulfillmentService: variant.fulfillmentService || null,
                requiresShipping: variant.requiresShipping !== false,
                taxable: variant.taxable !== false,
                options: variant.selectedOptions || null,
                // ✅ PRESERVE: Only update costPerItem if we have new data AND existing is null/zero
                ...(shouldUpdateCost ? { costPerItem: newCostPerItem } : {})
              },
              create: {
                id: variantId,
                productId,
                title: variant.title || 'Default Title',
                sku: variant.sku || null,
                price: parseFloat(variant.price) || 0,
                compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
                costPerItem: newCostPerItem,
                inventoryQuantity: variant.inventoryQuantity || 0,
                inventoryPolicy: variant.inventoryPolicy || null,
                inventoryManagement: variant.inventoryManagement || null,
                weight: variant.weight ? parseFloat(variant.weight) : null,
                weightUnit: variant.weightUnit || null,
                fulfillmentService: variant.fulfillmentService || null,
                requiresShipping: variant.requiresShipping !== false,
                taxable: variant.taxable !== false,
                options: variant.selectedOptions || null
              }
            });

            // Logging logic
            if (existingVariant) {
              variantsUpdated++;
              if (existingCost > 0 && shouldUpdateCost) {
                if (Math.abs(existingCost - newCostPerItem) > 0.01) {
                  costDataUpdated++;
                  console.log(`     💰 Variant "${variant.title}": Cost UPDATED $${existingCost} → $${newCostPerItem}`);
                } else {
                  costDataPreserved++;
                  console.log(`     ✅ Variant "${variant.title}": Cost unchanged ($${existingCost})`);
                }
              } else if (existingCost > 0 && !shouldUpdateCost) {
                costDataPreserved++;
                console.log(`     🛡️  Variant "${variant.title}": Cost PRESERVED ($${existingCost}) - no new Shopify data`);
              } else if (shouldUpdateCost) {
                costDataUpdated++;
                console.log(`     🆕 Variant "${variant.title}": Cost ADDED $${newCostPerItem}`);
              } else {
                console.log(`     ⚪ Variant "${variant.title}": No cost data available`);
              }
            } else {
              variantsCreated++;
              if (shouldUpdateCost) {
                costDataUpdated++;
                console.log(`     🆕 Variant "${variant.title}": CREATED with cost $${newCostPerItem}`);
              } else {
                console.log(`     🆕 Variant "${variant.title}": CREATED (no cost data)`);
              }
            }
          } catch (error) {
            processingErrors++;
            console.error(`     ❌ Error upserting variant ${variantId}:`, error);
          }
        }
      } else {
        console.log(`   ⚠️  No variants found for this product`);
      }

    } catch (error) {
      processingErrors++;
      console.error(`❌ Error processing product ${product.id}:`, error);
    }
  }

  console.log(`\n📊 Products Sync - Database Save Summary:`);
  console.log(`   Products: ${productsCreated} created, ${productsUpdated} updated`);
  console.log(`   Variants: ${variantsCreated} created, ${variantsUpdated} updated`);
  console.log(`   Cost Data: ${costDataUpdated} updated, ${costDataPreserved} preserved`);
  console.log(`   Errors: ${processingErrors}`);
  console.log(`   Total processed: ${productsCreated + productsUpdated} products, ${variantsCreated + variantsUpdated} variants\n`);
}

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

    // ✅ FIX: First fetch ALL products from Shopify (not just database products)
    const formattedDomain = formatShopDomain(store.domain);
    console.log('Products Sync - Fetching fresh product data from Shopify...');
    
    // Import the function we need
    const { getAllProducts } = await import('@/lib/shopify-api');
    const freshShopifyProducts = await getAllProducts(formattedDomain, store.accessToken);
    
    console.log(`Products Sync - Fetched ${freshShopifyProducts.length} products from Shopify`);
    
    // Save fresh product data to database using the existing function
    await saveProductAndVariantDataToDatabase(store.id, freshShopifyProducts);
    
    // Now get all ShopifyProducts from database (including any newly saved ones)
    const shopifyProducts = await (prisma as any).shopifyProduct.findMany({
      where: { storeId: store.id },
      include: {
        variants: true
      },
      orderBy: { title: 'asc' }
    });

    syncStatus.totalProducts = shopifyProducts.length;
    console.log(`Products Sync - Found ${shopifyProducts.length} products to sync (${freshShopifyProducts.length} from Shopify, ${shopifyProducts.length} in database)`);
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
          
          // ✅ OPTIMIZED: Get all variants for this product at once
          const variantIds = product.variants.map((v: any) => v.id);
          let existingVariants: any[] = [];
          
          if (variantIds.length > 0) {
            try {
              existingVariants = await (prisma as any).shopifyProductVariant.findMany({
                where: { id: { in: variantIds } },
                select: { id: true, costPerItem: true }
              });
            } catch (error) {
              console.error(`Products Sync - Error fetching variants for product ${product.id}:`, error);
              continue; // Skip this product if we can't fetch variants
            }
          }
          
          const existingVariantsMap = new Map(existingVariants.map(v => [v.id, v.costPerItem || 0]));
          
          // Update variants with cost data (only if changed)
          for (const variant of product.variants) {
            const variantCost = productCostData[variant.id];
            
            if (variantCost !== undefined && variantCost > 0 && existingVariantsMap.has(variant.id)) {
              try {
                // ✅ NEW: Only update if cost has actually changed
                const currentCost = existingVariantsMap.get(variant.id) || 0;
                const newCost = Math.round(variantCost * 100) / 100; // Round to 2 decimal places for comparison
                const currentCostRounded = Math.round(currentCost * 100) / 100;
                
                if (Math.abs(newCost - currentCostRounded) > 0.001) { // Small tolerance for floating point comparison
                  await (prisma as any).shopifyProductVariant.update({
                    where: { id: variant.id },
                    data: { 
                      costPerItem: newCost
                    }
                  });
                  costDataUpdated++;
                  console.log(`Products Sync - Updated variant ${variant.id}: $${currentCostRounded} → $${newCost}`);
                } else {
                  console.log(`Products Sync - Variant ${variant.id} cost unchanged ($${currentCostRounded}), skipping update`);
                }
              } catch (variantError) {
                console.error(`Products Sync - Error updating variant ${variant.id}:`, variantError);
              }
            } else if (variantCost !== undefined && variantCost > 0) {
              console.log(`Products Sync - Variant ${variant.id} not found in database, skipping cost update`);
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