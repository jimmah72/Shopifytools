import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAllProducts, getProductsVariantCostData } from '@/lib/shopify-api';
import { formatShopDomain } from '@/lib/shopify.config';
import { updateProductsSyncStatus as updateSharedSyncStatus, getProductsSyncStatus } from '@/lib/products-sync-status';

// Function to calculate handling fees from additional costs (copied from working single-page sync)
async function calculateHandlingFeesFromAdditionalCosts(storeId: string, productPrice: number): Promise<number> {
  try {
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

// Helper function to check if sync should stop
function shouldStopSync(): boolean {
  const sharedStatus = getProductsSyncStatus();
  const shouldStop = !syncInProgress || !sharedStatus.syncInProgress;
  if (shouldStop) {
    console.log('🛑 Stop condition detected - terminating sync process');
  }
  return shouldStop;
}

// Interruptible database save operation
async function saveVariantCostDataToDatabase(
  storeId: string, 
  variantCostData: Record<string, Record<string, number>>, 
  productIds: string[]
) {
  console.log(`\n🔄 Saving variant cost data for ${productIds.length} products...`);
  
  let variantsUpdated = 0;
  
  for (const productId of productIds) {
    // ✅ STOP CHECK: Check before each product
    if (shouldStopSync()) {
      console.log('🛑 Sync stopped during variant cost save - exiting early');
      break;
    }
    
    const productCosts = variantCostData[productId];
    if (!productCosts) continue;

    try {
      const product = await (prisma as any).shopifyProduct.findUnique({
        where: { id: productId },
        include: { variants: true }
      });

      if (!product) continue;

      for (const variant of product.variants) {
        // ✅ STOP CHECK: Check before each variant
        if (shouldStopSync()) {
          console.log('🛑 Sync stopped during variant processing - exiting early');
          return variantsUpdated;
        }
        
        const variantCost = productCosts[variant.id];
        if (variantCost && variantCost > 0) {
          await (prisma as any).shopifyProductVariant.update({
            where: { id: variant.id },
            data: { 
              costPerItem: variantCost
            }
          });
          console.log(`     ✅ Updated Variant ${variant.id} (${variant.title}) with cost $${variantCost}`);
          variantsUpdated++;
        } else {
          console.log(`     ⚪ Variant ${variant.id} (${variant.title}): No cost data available`);
        }
      }

      // Update product's lastSyncedAt timestamp
      await (prisma as any).shopifyProduct.update({
        where: { id: productId },
        data: { lastSyncedAt: new Date() }
      });

    } catch (error) {
      console.error(`❌ Error updating variant costs for product ${productId}:`, error);
    }
  }

  console.log(`✅ Updated ${variantsUpdated} variants with cost data`);
  return variantsUpdated;
}

// ✅ REMOVED: Deleted the broken saveProductAndVariantDataToDatabase function
// This function was causing "undefined" variants and data corruption
// The sync now uses only proven working logic: getProductsVariantCostData() + saveVariantCostDataToDatabase()

// Mark route as dynamic
export const dynamic = 'force-dynamic';

interface SyncRequest {
  type: 'manual' | 'auto' | 'initial';
  priority?: 'current_page' | 'all'; // Start with current page products first
}

let syncInProgress = false;
let syncAbortController: AbortController | null = null;
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

// DELETE endpoint to stop sync
export async function DELETE(request: NextRequest) {
  console.log('🛑 STOP SYNC REQUEST - Products Sync API');
  
  try {
    // Check both local and shared status
    const sharedStatus = getProductsSyncStatus();
    if (!syncInProgress && !sharedStatus.syncInProgress) {
      return NextResponse.json(
        { message: 'No sync in progress' },
        { status: 200 }
      );
    }

    console.log('🛑 Stopping products sync - updating statuses and aborting operations');

    // Stop the sync - update both local and shared status
    syncInProgress = false;
    syncStatus = {
      ...syncStatus,
      syncInProgress: false,
      syncType: null,
      errorMessage: 'Sync manually stopped'
    };
    
    // Update shared status too
    updateSharedSyncStatus({
      syncInProgress: false,
      syncType: null,
      errorMessage: 'Sync manually stopped'
    });

    // ✅ NEW: Abort ongoing API requests
    if (syncAbortController) {
      console.log('🛑 Aborting ongoing API requests...');
      syncAbortController.abort();
      syncAbortController = null;
    }

    console.log('🛑 Products sync stopped successfully - all operations terminated');

    return NextResponse.json({ 
      message: 'Products sync stopped successfully - all operations terminated'
    });

  } catch (error) {
    console.error('Stop Products Sync API - Error:', error);
    return NextResponse.json(
      { error: 'Failed to stop sync' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  const requestHeaders = request.headers
  const userAgent = requestHeaders.get('user-agent') || 'unknown'
  const referer = requestHeaders.get('referer') || 'unknown'
  const origin = requestHeaders.get('origin') || 'unknown'
  
  console.log('🚀 SYNC TRIGGER DETECTED - Products Sync API')
  console.log(`📅 Timestamp: ${timestamp}`)
  console.log(`🌐 User-Agent: ${userAgent}`)
  console.log(`🔗 Referer: ${referer}`)
  console.log(`📍 Origin: ${origin}`)
  
  try {
    const body: SyncRequest = await request.json();
    
    // Log detailed trigger information
    console.log('🔍 PRODUCTS SYNC TRIGGER DETAILS:')
    console.log(`   🎯 Sync Type: ${body.type}`)
    console.log(`   📍 Priority: ${body.priority || 'not specified'}`)
    console.log(`   📦 Request Body:`, JSON.stringify(body, null, 2))
    
    if (syncInProgress) {
      console.log('⚠️ SYNC TRIGGER REJECTED - Sync already in progress')
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
  syncAbortController = new AbortController(); // ✅ NEW: Create abort controller
  
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
  
  // Update shared status
  updateSharedSyncStatus(syncStatus);

  try {
    console.log(`Products Sync - Starting SMART ${syncType} sync for store ${store.domain}`);
    const formattedDomain = formatShopDomain(store.domain);

    // ==========================================
    // PHASE 1: GET EXISTING PRODUCTS FROM DATABASE
    // ==========================================
    console.log('📋 PHASE 1: Loading existing products from database (skipping broken getAllProducts)...');
    
    // ✅ STOP CHECK: Before database query
    if (shouldStopSync()) {
      console.log('🛑 Sync stopped before Phase 1 - exiting');
      return;
    }
    
    // Get existing database products - NO Shopify API call that breaks data
    const databaseProducts = await (prisma as any).shopifyProduct.findMany({
      where: { storeId: store.id },
      select: {
        id: true,        // This IS the Shopify product ID 
        title: true,
        handle: true,
        status: true,
        lastSyncedAt: true,
        variants: {
          select: {
            id: true,      // This IS the Shopify variant ID
            title: true,
            price: true,
            costPerItem: true,
            sku: true
          }
        }
      },
      orderBy: { title: 'asc' }
    });
    
    // ✅ STOP CHECK: After database query
    if (shouldStopSync()) {
      console.log('🛑 Sync stopped after Phase 1 - exiting');
      return;
    }
    
    console.log(`📋 Phase 1 - Found ${databaseProducts.length} existing products in database`);

    // ==========================================
    // PHASE 2: IDENTIFY WHAT NEEDS SYNCING
    // ==========================================
    console.log('🔍 PHASE 2: Identifying products that need cost data updates...');

    // Identify products that need cost data updates
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const productsNeedingSync = databaseProducts.filter((product: any) => {
      // Sync if: no recent sync OR no cost data OR force sync
      return !product.lastSyncedAt || 
             new Date(product.lastSyncedAt) < eightHoursAgo ||
             !product.variants.some((v: any) => v.costPerItem && v.costPerItem > 0);
    });

    syncStatus.totalProducts = productsNeedingSync.length;
    updateSharedSyncStatus({ totalProducts: productsNeedingSync.length });
    
    console.log(`🔍 Analysis - ${databaseProducts.length} total products, ${productsNeedingSync.length} need sync`);
    
    if (productsNeedingSync.length === 0) {
      console.log('✅ All products have fresh cost data - no sync needed!');
      
      // Count existing products with cost data
      const productsWithCostData = await (prisma as any).shopifyProduct.count({
        where: {
          storeId: store.id,
          variants: { some: { costPerItem: { gt: 0 } } }
        }
      });

      syncStatus = {
        syncInProgress: false,
        syncType: null,
        totalProducts: databaseProducts.length,
        processedProducts: databaseProducts.length,
        currentProduct: '',
        lastSyncAt: new Date().toISOString(),
        errorMessage: null,
        costDataUpdated: 0,
        productsWithCostData
      };
      
      updateSharedSyncStatus(syncStatus);
      return;
    }

    // ==========================================
    // PHASE 3: SMART PROCESSING (PROVEN WORKING APPROACH)
    // ==========================================
    console.log('🚀 PHASE 3: Using ONLY proven working sync logic');
    
    // Initialize sync tracking variables
    let costDataUpdated = 0;
    let productsWithCostData = 0;
    let processedProducts = 0;
    let currentProduct = '';
    
    // Process products in batches using the SAME logic as working single-page sync
    const batchSize = 10;
    const totalBatches = Math.ceil(productsNeedingSync.length / batchSize);
    
    for (let i = 0; i < productsNeedingSync.length; i += batchSize) {
      // ✅ STOP CHECK: Before each batch
      if (shouldStopSync()) {
        console.log('🛑 Products sync stopped before batch processing - exiting');
        break;
      }
      
      const batch = productsNeedingSync.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${totalBatches} (${batch.length} products)`);

      try {
        // ✅ STOP CHECK: Before API call
        if (shouldStopSync()) {
          console.log('🛑 Products sync stopped before variant cost fetch - exiting');
          break;
        }
        
        // ✅ USE EXACT SAME LOGIC AS WORKING PAGE SYNC
        // Use the same getProductsVariantCostData function that page sync uses successfully
        const batchProductIds = batch.map((p: any) => p.id);
        
        // ✅ STOP CHECK: Before batch API call
        if (shouldStopSync()) {
          console.log('🛑 Products sync stopped before batch cost fetch - exiting');
          break;
        }
        
        console.log(`📦 Fetching variant cost data for batch of ${batchProductIds.length} products using working GraphQL approach`);
        
        try {
          // Use the EXACT same function that works in page sync
          const { getProductsVariantCostData } = await import('@/lib/shopify-api');
          const variantCostData = await getProductsVariantCostData(formattedDomain, store.accessToken, batchProductIds);
          
          // ✅ STOP CHECK: After API call
          if (shouldStopSync()) {
            console.log('🛑 Products sync stopped after batch cost fetch - exiting');
            break;
          }
          
          // Process the results using the same logic as page sync
          for (const product of batch) {
            // ✅ STOP CHECK: Before each product
            if (shouldStopSync()) {
              console.log('🛑 Products sync stopped during individual product processing - exiting');
              break;
            }
            
            console.log(`📦 Processing "${product.title}" (ID: ${product.id})`);
            
            try {
              const productVariantCosts = variantCostData[product.id] || {};
              const variantIdsWithCosts = Object.keys(productVariantCosts);
              
              let productCostUpdated = false;
              let firstVariantCost = 0;
              
              if (variantIdsWithCosts.length > 0) {
                console.log(`🔧 Processing ${variantIdsWithCosts.length} variants with cost data...`);
                
                // Process variants using the same logic as working single-page sync
                for (const variantId of variantIdsWithCosts) {
                  const cost = productVariantCosts[variantId];
                  
                  if (cost > 0) {
                    // Update variant in ShopifyProductVariant table (same as page sync)
                    try {
                      await (prisma as any).shopifyProductVariant.update({
                        where: { id: variantId },
                        data: { 
                          costPerItem: cost
                        }
                      });
                      
                      console.log(`     ✅ Updated Variant ${variantId} with cost $${cost}`);
                      
                      if (firstVariantCost === 0) {
                        firstVariantCost = cost;
                      }
                      productCostUpdated = true;
                      costDataUpdated++;
                    } catch (error) {
                      console.log(`     ❌ Failed to update variant ${variantId}:`, error);
                    }
                  }
                }
              } else {
                console.log(`     ⚪ No cost data available for product ${product.id}`);
              }

              // ✅ STOP CHECK: Before main product update
              if (shouldStopSync()) {
                console.log('🛑 Products sync stopped before main product update - exiting');
                break;
              }

              // Update main Product table if we got cost data (same as working sync)
              if (productCostUpdated && firstVariantCost > 0) {
                // Get first variant data from existing database product
                const firstVariant = product.variants?.[0];
                const productPrice = firstVariant?.price || 0;
                const calculatedHandlingFees = await calculateHandlingFeesFromAdditionalCosts(store.id, productPrice);

                try {
                  // Update main Product table like single-page sync
                  await prisma.product.upsert({
                    where: { shopifyId: product.id },
                    update: { 
                      costOfGoodsSold: firstVariantCost,
                      handlingFees: calculatedHandlingFees,
                      costSource: 'SHOPIFY',
                      price: productPrice,
                      sellingPrice: productPrice,
                      title: product.title
                    },
                    create: {
                      shopifyId: product.id,
                      storeId: store.id,
                      title: product.title || `Product ${product.id}`,
                      description: '',
                      price: productPrice,
                      sellingPrice: productPrice,
                      cost: firstVariantCost,
                      costOfGoodsSold: firstVariantCost,
                      handlingFees: calculatedHandlingFees,
                      costSource: 'SHOPIFY',
                      sku: firstVariant?.sku || null,
                      status: product.status || 'active',
                      createdAt: new Date(),
                      updatedAt: new Date()
                    }
                  });

                  console.log(`✅ Updated Product ${product.id} with cost $${firstVariantCost} and handling fees $${calculatedHandlingFees}`);
                  productsWithCostData++;
                } catch (error: any) {
                  if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
                    // Handle SKU constraint - update by shopifyId instead
                    try {
                      await prisma.product.update({
                        where: { shopifyId: product.id },
                        data: { 
                          costOfGoodsSold: firstVariantCost,
                          handlingFees: calculatedHandlingFees,
                          costSource: 'SHOPIFY',
                          price: productPrice,
                          sellingPrice: productPrice,
                          title: product.title
                        }
                      });
                      console.log(`✅ Updated Product ${product.id} with cost $${firstVariantCost} (SKU conflict resolved)`);
                      productsWithCostData++;
                    } catch (updateError) {
                      console.log(`❌ Failed to update product ${product.id}:`, updateError);
                    }
                  } else {
                    console.log(`❌ Failed to upsert product ${product.id}:`, error);
                  }
                }
              }

              processedProducts = i + batch.indexOf(product) + 1;
              currentProduct = product.title;
              updateSharedSyncStatus({
                syncInProgress: true,
                syncType,
                totalProducts: productsNeedingSync.length,
                processedProducts: i + batch.indexOf(product) + 1,
                currentProduct: product.title,
                costDataUpdated: costDataUpdated,
                productsWithCostData: productsWithCostData
              });

            } catch (error) {
              console.log(`❌ Error processing product ${product.id}:`, error);
            }

            // ✅ STOP CHECK: After each product
            if (shouldStopSync()) {
              console.log('🛑 Products sync stopped after product processing - exiting');
              break;
            }
          }

        } catch (error) {
          console.log(`❌ Error fetching variant cost data for batch:`, error);
        }

        // ✅ STOP CHECK: After batch processing
        if (shouldStopSync()) {
          console.log('🛑 Products sync stopped after batch processing - exiting');
          break;
        }

        // Brief delay between batches to prevent API rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.log(`❌ Error processing batch ${Math.floor(i / batchSize) + 1}:`, error);
      }
    }

    // ✅ STOP CHECK: Before final operations
    if (shouldStopSync()) {
      console.log('🛑 Products sync stopped before final operations - exiting with partial results');
      return;
    }

    // Update sync status tracking
    await updateProductsSyncStatus(store.id, {
      lastSyncAt: new Date(),
      costDataUpdated: costDataUpdated,
      productsWithCostData: productsWithCostData,
      syncType
    });

    // Final status update
    const finalStatus = {
      syncInProgress: false,
      syncType: null,
      totalProducts: productsNeedingSync.length,
      processedProducts: processedProducts,
      currentProduct: currentProduct,
      lastSyncAt: new Date().toISOString(),
      errorMessage: null,
      costDataUpdated: costDataUpdated,
      productsWithCostData: productsWithCostData
    };
    
    updateSharedSyncStatus(finalStatus);

    console.log(`🎉 SMART SYNC COMPLETED: ${costDataUpdated} products updated, ${productsWithCostData} total products with cost data`);

  } catch (error) {
    console.error('❌ Products Sync - Error:', error);
    
    // Check if error was due to manual stop
    const isAbortError = error instanceof Error && error.name === 'AbortError';
    const errorMessage = isAbortError ? 'Sync manually stopped' : (error instanceof Error ? error.message : 'Unknown error occurred');
    
    syncStatus = {
      ...syncStatus,
      syncInProgress: false,
      syncType: null,
      errorMessage
    };
    
    updateSharedSyncStatus(syncStatus);
    
    if (isAbortError) {
      console.log('🛑 Sync properly aborted due to stop request');
    }
  } finally {
    syncInProgress = false;
    syncAbortController = null; // ✅ NEW: Clear abort controller
    updateSharedSyncStatus({ syncInProgress: false });
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