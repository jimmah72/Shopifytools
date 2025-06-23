import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAllProducts, getProductsCostData, getProductsVariantCostData } from '@/lib/shopify-api'
import { formatShopDomain } from '@/lib/shopify.config'

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  images: Array<{ src: string }>;
  variants: ShopifyVariant[];
  status: string;
  lastSyncedAt?: Date;
}

interface ShopifyVariant {
  id: string;
  price: string;
  cost_per_item?: string;
  sku?: string;
  inventory_quantity?: number;
  inventory_item_id?: string;
}

// Map Shopify status to our frontend format
function mapShopifyStatus(shopifyStatus: string): 'Active' | 'Draft' | 'Archived' {
  switch (shopifyStatus?.toUpperCase()) {
    case 'ACTIVE':
      return 'Active';
    case 'DRAFT':
      return 'Draft';
    case 'ARCHIVED':
      return 'Archived';
    default:
      return 'Active'; // Default fallback
  }
}

// ✅ NEW: Function to save cost data to database (unified sync approach)
async function saveCostDataToDatabase(
  storeId: string, 
  costData: Record<string, number>, 
  productIds: string[]
) {
  let savedCount = 0;
  
  console.log(`Products API - Saving cost data for ${productIds.length} products to database`);
  
  for (const productId of productIds) {
    const productCost = costData[productId];
    
    // Update ShopifyProduct timestamp for ANY product that was checked (even if no cost found)
    try {
      await (prisma as any).shopifyProduct.update({
        where: { id: productId },
        data: { lastSyncedAt: new Date() }
      });
      console.log(`Products API - Updated sync timestamp for product ${productId}`);
    } catch (error) {
      console.error(`Products API - Error updating sync timestamp for product ${productId}:`, error);
    }
    
    // If we found cost data, also try to save it
    if (productCost && productCost > 0) {
      try {
        // Try to save the cost to the main variant (first variant for the product)
        const productVariants = await (prisma as any).shopifyProductVariant.findMany({
          where: { productId },
          take: 1 // Get first variant as representative
        });
        
        if (productVariants.length > 0) {
          await (prisma as any).shopifyProductVariant.update({
            where: { id: productVariants[0].id },
            data: { costPerItem: productCost }
          });
          console.log(`Products API - Updated variant cost for product ${productId} with cost $${productCost}`);
        }
        
        savedCount++;
      } catch (error) {
        console.error(`Products API - Error updating variant cost for product ${productId}:`, error);
      }
    }
  }
  
  console.log(`Products API - Updated sync timestamps for ${productIds.length} products, saved costs for ${savedCount} products`);
}

// ✅ NEW: Function to save variant cost data to database (unified sync approach)
async function saveVariantCostDataToDatabase(
  storeId: string, 
  variantCostData: Record<string, Record<string, number>>, 
  productIds: string[]
) {
  let savedCount = 0;
  let totalVariantCosts = 0;
  
  console.log(`Products API - Saving variant cost data for ${productIds.length} products to database`);
  
  for (const productId of productIds) {
    // Update ShopifyProduct timestamp for ANY product that was checked
    try {
      await (prisma as any).shopifyProduct.update({
        where: { id: productId },
        data: { lastSyncedAt: new Date() }
      });
      console.log(`Products API - Updated sync timestamp for product ${productId}`);
    } catch (error) {
      console.error(`Products API - Error updating sync timestamp for product ${productId}:`, error);
    }
    
    const productVariantCosts = variantCostData[productId] || {};
    const variantIdsWithCosts = Object.keys(productVariantCosts);
    
    if (variantIdsWithCosts.length > 0) {
      // Save individual variant costs
      for (const variantId of variantIdsWithCosts) {
        const variantCost = productVariantCosts[variantId];
        
        if (variantCost && variantCost > 0) {
          try {
            await (prisma as any).shopifyProductVariant.update({
              where: { id: variantId },
              data: { costPerItem: variantCost }
            });
            console.log(`Products API - Updated variant ${variantId} with cost $${variantCost}`);
            totalVariantCosts++;
          } catch (error) {
            console.error(`Products API - Error updating variant ${variantId}:`, error);
          }
        }
      }
      
      savedCount++;
    }
  }
  
  console.log(`Products API - Updated sync timestamps for ${productIds.length} products, saved costs for ${totalVariantCosts} variants across ${savedCount} products`);
}

async function saveProductAndVariantDataToDatabase(storeId: string, shopifyProducts: any[]) {
  console.log(`Products API - Saving product and variant data for ${shopifyProducts.length} products to database`);
  
  let productsUpdated = 0;
  let variantsCreated = 0;
  
  for (const product of shopifyProducts) {
    try {
      const productId = product.id.includes('gid://shopify/Product/') 
        ? product.id.replace('gid://shopify/Product/', '')
        : product.id;

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

      // Handle variants - delete existing and create new ones
      await (prisma as any).shopifyProductVariant.deleteMany({
        where: { productId }
      });

      if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        const variantsData = product.variants.map((variant: any) => {
          const variantId = variant.id && typeof variant.id === 'string' && variant.id.includes('gid://shopify/ProductVariant/') 
            ? variant.id.replace('gid://shopify/ProductVariant/', '')
            : variant.id || `fallback-${Math.random().toString(36).substring(2, 8)}`;
          
          return {
            id: variantId,
            productId,
            title: variant.title || 'Default Title',
            sku: variant.sku || null,
            price: variant.price ? parseFloat(variant.price) || 0 : 0,
            compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
            costPerItem: variant.inventoryItem?.unitCost?.amount ? parseFloat(variant.inventoryItem.unitCost.amount) : null,
            inventoryQuantity: variant.inventoryQuantity || variant.inventory_quantity || 0,
            inventoryPolicy: variant.inventoryPolicy || null,
            inventoryManagement: variant.inventoryManagement || null,
            weight: variant.weight ? parseFloat(variant.weight) : null,
            weightUnit: variant.weightUnit || null,
            fulfillmentService: variant.fulfillmentService || null,
            requiresShipping: variant.requiresShipping !== false,
            taxable: variant.taxable !== false,
            options: variant.selectedOptions || variant.options || null
          };
        });

        if (variantsData.length > 0) {
          await (prisma as any).shopifyProductVariant.createMany({
            data: variantsData
          });
          variantsCreated += variantsData.length;
          
          // ✅ FIX: Update main Product table with default variant cost
          const defaultVariantCost = variantsData[0].costPerItem;
          if (defaultVariantCost && defaultVariantCost > 0) {
            try {
              await prisma.product.upsert({
                where: { shopifyId: productId },
                update: { 
                  costOfGoodsSold: defaultVariantCost,
                  costSource: 'SHOPIFY'
                },
                create: {
                  shopifyId: productId,
                  storeId: storeId,
                  title: product.title,
                  description: product.description || '',
                  price: variantsData[0].price,
                  cost: defaultVariantCost,
                  costOfGoodsSold: defaultVariantCost,
                  costSource: 'SHOPIFY',
                  sku: variantsData[0].sku || ''
                }
              });
              console.log(`Products API - Updated main Product ${productId} with default cost $${defaultVariantCost}`);
            } catch (error) {
              console.error(`Products API - Error updating main Product ${productId}:`, error);
            }
          }
        }
      }

      productsUpdated++;
    } catch (error) {
      console.error(`Products API - Error saving product ${product.id}:`, error);
    }
  }
  
  console.log(`Products API - Successfully updated ${productsUpdated} products and created ${variantsCreated} variants`);
}

// Function to calculate handling fees from additional costs (used in page-level sync)
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

export async function GET(request: NextRequest) {
  // ✅ ADD: Request tracking to identify duplicate calls
  const requestId = Math.random().toString(36).substring(2, 8);
  const requestStart = Date.now();
  const url = request.url;
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const referer = request.headers.get('referer') || 'unknown';
  
  console.log(`🚀 Products API - GET request received [${requestId}]`);
  console.log(`🚀 Request [${requestId}] Details:
    - URL: ${url}
    - User-Agent: ${userAgent}
    - Referer: ${referer}
    - Timestamp: ${new Date().toISOString()}`);
  
  try {
    // ✅ FIX: Use smart store selection (prioritize active stores with real tokens)
    console.log('Products API - Finding active store with real connection')
    
    // First, try to find an active store with a real access token (not placeholder)
    let store = await prisma.store.findFirst({
      where: {
        accessToken: {
          not: 'pending-setup'
        }
      },
      select: { 
        id: true, 
        domain: true, 
        accessToken: true 
      },
      orderBy: { updatedAt: 'desc' }
    })

    // If no active store with real token, fall back to any active store
    if (!store) {
      console.log('Products API - No active store with real token found, trying any active store')
      store = await prisma.store.findFirst({
        where: {
          accessToken: {
            not: 'pending-setup'
          }
        },
        select: { 
          id: true, 
          domain: true, 
          accessToken: true 
        },
        orderBy: { updatedAt: 'desc' }
      })
    }

    // Last resort: any store at all
    if (!store) {
      console.log('Products API - No active store found, trying any store')
      store = await prisma.store.findFirst({
        select: { 
          id: true, 
          domain: true, 
          accessToken: true 
        },
        orderBy: { updatedAt: 'desc' }
      })
    }

    console.log('Products API - Selected store:', { id: store?.id, domain: store?.domain })

    if (!store) {
      return NextResponse.json(
        { error: 'No store connected. Please connect a Shopify store first.' },
        { status: 404 }
      )
    }

    if (!store.domain || !store.accessToken) {
      return NextResponse.json(
        { error: 'Store configuration is incomplete. Please reconnect your Shopify store.' },
        { status: 500 }
      )
    }

    // Format the store domain
    const formattedDomain = formatShopDomain(store.domain)
    
    // Get query parameters with pagination support
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const fetchCosts = searchParams.get('fetchCosts') === 'true'
    const fetchVariantCosts = searchParams.get('fetchVariantCosts') === 'true'
    const forceSync = searchParams.get('forceSync') === 'true' // ✅ NEW: Force sync parameter
    
    // Sort and filter parameters
    const sortField = searchParams.get('sortField') || 'title'
    const sortDirection = searchParams.get('sortDirection') || 'asc'
    const statusFilter = searchParams.get('statusFilter') || ''
    const costSourceFilter = searchParams.get('costSourceFilter') || ''
    const costDataFilter = searchParams.get('costDataFilter') || ''
    
    console.log('Products API - Query params:', { 
      page, 
      limit, 
      search, 
      fetchCosts, 
      fetchVariantCosts,
      forceSync, // ✅ NEW: Log force sync parameter
      sortField, 
      sortDirection, 
      statusFilter, 
      costSourceFilter, 
      costDataFilter 
    })
    
    // ✅ PERFORMANCE: Load from database first for immediate page loading
    console.log(`📊 Request [${requestId}] - Loading products from database first for immediate response`);
    
    // Get existing product records and ShopifyProduct sync status
    const [existingProducts, shopifyProductSyncStatus] = await Promise.all([
      prisma.product.findMany({
        where: { storeId: store.id },
        select: { 
          shopifyId: true, 
          costOfGoodsSold: true, 
          handlingFees: true, 
          miscFees: true, 
          costSource: true, 
          lastEdited: true 
        }
      }),
      (prisma as any).shopifyProduct.findMany({
        where: { storeId: store.id },
        select: { 
          id: true, 
          title: true,
          handle: true,
          status: true,
          images: true,
          variants: {
            select: {
              id: true,
              price: true,
              sku: true,
              inventoryQuantity: true,
              costPerItem: true
            }
          },
          lastSyncedAt: true 
        }
      })
    ]);

    // Create maps for quick lookup
    const existingProductsMap = new Map(existingProducts.map((p: any) => [p.shopifyId, p]));
    const shopifyProductsMap = new Map(shopifyProductSyncStatus.map((p: any) => [p.id, p])) as Map<string, any>;

    console.log(`📊 Request [${requestId}] - Found ${existingProducts.length} existing database records for products`);
    console.log(`📊 Request [${requestId}] - Found ${shopifyProductSyncStatus.length} ShopifyProduct records in database`);

    // ✅ SMART SYNC: Only fetch from Shopify if we need fresh data or if forced
    let shouldFetchFromShopify = forceSync;
    
    if (!shouldFetchFromShopify && fetchCosts) {
      // Check if we have enough fresh data to skip Shopify API call
      const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
      const staleProducts = shopifyProductSyncStatus.filter((p: any) => 
        !p.lastSyncedAt || new Date(p.lastSyncedAt) < eightHoursAgo
      );
      
      shouldFetchFromShopify = staleProducts.length > 0;
      console.log(`📊 Request [${requestId}] - Stale products needing sync: ${staleProducts.length}`);
    }

    let shopifyProducts: any[] = [];
    
    if (shouldFetchFromShopify) {
      // ✅ FIX: For force sync (page-level), don't fetch ALL products, use cached data and sync later
      if (forceSync) {
        console.log(`📊 Request [${requestId}] - Force sync requested - will sync current page products only`);
        // Use cached database data, but transform it to Shopify API format for consistency
        shopifyProducts = shopifyProductSyncStatus.map((p: any) => ({
          id: p.id,
          title: p.title,
          handle: p.handle,
          status: p.status,
          images: p.images || [],
          variants: p.variants || []
        }));
      } else {
        // Full sync - fetch ALL products from Shopify using efficient pagination
        console.log(`📊 Request [${requestId}] - Fetching fresh data from Shopify API`);
        shopifyProducts = await getAllProducts(formattedDomain, store.accessToken);
        console.log(`📊 Request [${requestId}] - Total Shopify products fetched: ${shopifyProducts.length}`);
        
        // ✅ COMPLETE FIX: Save product and variant data to database when we have fresh data
        await saveProductAndVariantDataToDatabase(store.id, shopifyProducts);
        
        // ✅ REFRESH: Update our database maps with the fresh data we just saved
        const refreshedShopifyProducts = await (prisma as any).shopifyProduct.findMany({
          where: { storeId: store.id },
          select: { 
            id: true, 
            title: true,
            handle: true,
            status: true,
            images: true,
            variants: {
              select: {
                id: true,
                price: true,
                sku: true,
                inventoryQuantity: true,
                costPerItem: true
              }
            },
            lastSyncedAt: true 
          }
        });
        
        // Update the shopifyProductsMap with fresh data
        shopifyProductsMap.clear();
        refreshedShopifyProducts.forEach((p: any) => shopifyProductsMap.set(p.id, p));
        console.log(`📊 Request [${requestId}] - Refreshed database cache with ${refreshedShopifyProducts.length} products and their variants`);
      }
    } else {
      console.log(`📊 Request [${requestId}] - Using cached database data (no fresh sync needed)`);
      // Use cached database data, but transform it to Shopify API format for consistency
      shopifyProducts = shopifyProductSyncStatus.map((p: any) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        status: p.status,
        images: p.images || [],
        variants: p.variants || []
      }));
    }

    // Apply search filter if provided
    let filteredProducts = shopifyProducts;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = shopifyProducts.filter((product: ShopifyProduct) => 
        product.title.toLowerCase().includes(searchLower) ||
        product.handle.toLowerCase().includes(searchLower) ||
        product.variants.some(variant => 
          variant.sku?.toLowerCase().includes(searchLower)
        )
      );
      console.log('Products API - Filtered products by search:', filteredProducts.length);
    }

    // Only fetch cost data for ALL products if we need to filter by cost data availability
    // Otherwise, fetch cost data only for the current page to improve performance
    const needsCostDataForFiltering = costDataFilter && costDataFilter !== 'all';
    
    let allCostData: Record<string, number> = {};
    if (fetchCosts && filteredProducts.length > 0) {
      if (needsCostDataForFiltering) {
        console.log('Products API - Fetching cost data for all filtered products (needed for cost filtering)');
        const productIds = filteredProducts.map((product: ShopifyProduct) => product.id);
        allCostData = await getProductsCostData(formattedDomain, store.accessToken, productIds);
      } else {
        console.log('Products API - Will fetch cost data only for current page products (no cost filtering needed)');
        // We'll fetch cost data after pagination for better performance
      }
    }

    // Fetch existing database records for ALL filtered products
    const allNumericProductIds = filteredProducts.map((product: ShopifyProduct) => {
      return product.id.includes('gid://shopify/Product/') 
        ? product.id.replace('gid://shopify/Product/', '')
        : product.id;
    });

    // ✅ MOVED: Will pre-fetch variant costs AFTER pagination for better performance

    // Transform ALL products to our format (now async)
    const transformedProducts = await Promise.all(filteredProducts.map(async (shopifyProduct: ShopifyProduct) => {
      // Extract numeric ID from GraphQL ID format
      const numericId = shopifyProduct.id.includes('gid://shopify/Product/') 
        ? shopifyProduct.id.replace('gid://shopify/Product/', '')
        : shopifyProduct.id;

      // Get the main variant (first one) for pricing
      const variant = shopifyProduct.variants && shopifyProduct.variants.length > 0 
        ? shopifyProduct.variants[0] 
        : null;
      
      const price = variant ? parseFloat(variant.price) || 0 : 0;
      
      // ✅ DEBUG: Log when we encounter products without variants
      if (!variant) {
        console.log(`⚠️ Product ${numericId} "${shopifyProduct.title}" has no variants - using fallback price $0`);
      }

      // Check for existing database record using the new map
      const existingProduct = existingProductsMap.get(numericId);
      
      // Get sync status from ShopifyProduct table
      const cachedProduct = shopifyProductsMap.get(numericId);
      const lastSyncedAt = cachedProduct?.lastSyncedAt;

      // Determine cost source and values
      const costSource = existingProduct?.costSource || 'SHOPIFY';
      const costOfGoodsSold = existingProduct?.costOfGoodsSold || 0;
      const handlingFees = existingProduct?.handlingFees || 0; 
      const miscFees = existingProduct?.miscFees || 0;

      // ✅ FIX: Get Shopify inventory cost from variant data if available
      let shopifyInventoryCost = needsCostDataForFiltering && allCostData ? allCostData[numericId] : null;
      
      // ✅ FIX: If we have existing Product record with SHOPIFY source, use that cost
      if (!shopifyInventoryCost && existingProduct?.costSource === 'SHOPIFY' && existingProduct.costOfGoodsSold > 0) {
        shopifyInventoryCost = existingProduct.costOfGoodsSold;
        console.log(`💰 Product ${numericId} "${shopifyProduct.title}" - using saved cost: $${shopifyInventoryCost} from Product table`);
      }
      
      // If we still don't have cost data, try to get it from the first variant
      if (!shopifyInventoryCost && cachedProduct?.variants && cachedProduct.variants.length > 0) {
        const firstVariant = cachedProduct.variants[0];
        shopifyInventoryCost = firstVariant?.costPerItem || null;
        if (shopifyInventoryCost && shopifyInventoryCost > 0) {
          console.log(`💰 Product ${numericId} "${shopifyProduct.title}" - using cached variant cost: $${shopifyInventoryCost}`);
        }
      }
      
      // ✅ REMOVED: Will handle fresh variant costs after pagination to avoid rate limiting
      
      // ✅ FIX: For products with SHOPIFY cost source, use the Shopify cost as the main cost
      const displayCostOfGoodsSold = (costSource === 'SHOPIFY' && shopifyInventoryCost) 
        ? shopifyInventoryCost 
        : costOfGoodsSold;

      // ✅ PERFORMANCE: Skip handling fees calculation here - will do it after pagination for current page only
      const shopifyHandlingFees = 0; // Placeholder - calculated later for displayed products only

      // ✅ FIX: For products with SHOPIFY cost source, use calculated handling fees  
      const displayHandlingFees = costSource === 'SHOPIFY' 
        ? shopifyHandlingFees 
        : handlingFees;

      const totalCost = displayCostOfGoodsSold + displayHandlingFees + miscFees;
      const margin = price > 0 ? ((price - totalCost) / price) * 100 : 0;
      
      // ✅ DEBUG: Log cost data for main products to verify styling logic
      if (shopifyInventoryCost && shopifyInventoryCost > 0) {
        console.log(`💰 Product ${numericId} "${shopifyProduct.title}" - cost: $${shopifyInventoryCost}, source: ${costSource}`);
      }
      
      return {
        id: numericId,
        title: cachedProduct?.title || shopifyProduct.title,
        image: cachedProduct?.images?.[0]?.src || shopifyProduct.images?.[0]?.src || '',
        status: mapShopifyStatus(cachedProduct?.status || shopifyProduct.status),
        lastEdited: existingProduct?.lastEdited 
          ? existingProduct.lastEdited.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          : new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        sellingPrice: price,
        costOfGoodsSold: displayCostOfGoodsSold,
        handlingFees: displayHandlingFees,
        miscFees: miscFees,
        margin: margin,
        costSource: costSource,
        shopifyCostOfGoodsSold: shopifyInventoryCost || null,
        shopifyHandlingFees: shopifyHandlingFees,
        lastSyncedAt: lastSyncedAt && lastSyncedAt instanceof Date ? lastSyncedAt.toISOString() : null,
        sku: variant?.sku || '',
        inventoryQuantity: variant?.inventory_quantity || 0,
        variants: (cachedProduct?.variants || shopifyProduct.variants || []).map((v: any) => {
          // ✅ SAFETY: Handle malformed variant data
          if (!v) {
            console.log(`⚠️ Skipping null/undefined variant for product ${numericId}`);
            return null;
          }
          
          // Extract numeric variant ID from GraphQL ID format
          const numericVariantId = v.id && typeof v.id === 'string' && v.id.includes('gid://shopify/ProductVariant/') 
            ? v.id.replace('gid://shopify/ProductVariant/', '')
            : v.id || `fallback-${Math.random().toString(36).substring(2, 8)}`;
          
          return {
            id: numericVariantId,
            price: v.price ? parseFloat(v.price) || 0 : 0,
            inventory_cost: v.costPerItem || v.cost_per_item || 0, // Use cached cost from database or API
            cost: v.costPerItem || v.cost_per_item || 0,
            sku: v.sku || '',
            inventory_quantity: v.inventory_quantity || v.inventoryQuantity || 0,
            inventory_tracked: (v as any).inventory_tracked || false
          };
        }).filter(Boolean) // Remove any null entries
      };
    }));

    // Apply additional filters
    let filteredAndTransformedProducts = transformedProducts;
    
    // Filter by status
    if (statusFilter) {
      filteredAndTransformedProducts = filteredAndTransformedProducts.filter(product => 
        product.status === statusFilter
      );
      console.log('Products API - Filtered by status:', filteredAndTransformedProducts.length);
    }
    
    // Filter by cost source
    if (costSourceFilter) {
      filteredAndTransformedProducts = filteredAndTransformedProducts.filter(product => 
        product.costSource === costSourceFilter
      );
      console.log('Products API - Filtered by cost source:', filteredAndTransformedProducts.length);
    }
    
    // Filter by cost data availability
    if (costDataFilter) {
      if (costDataFilter === 'with-cost') {
        filteredAndTransformedProducts = filteredAndTransformedProducts.filter(product => 
          product.shopifyCostOfGoodsSold !== null && product.shopifyCostOfGoodsSold !== undefined
        );
      } else if (costDataFilter === 'without-cost') {
        filteredAndTransformedProducts = filteredAndTransformedProducts.filter(product => 
          product.shopifyCostOfGoodsSold === null || product.shopifyCostOfGoodsSold === undefined
        );
      }
      console.log('Products API - Filtered by cost data:', filteredAndTransformedProducts.length);
    }

    // Apply sorting
    filteredAndTransformedProducts.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'sellingPrice':
          aValue = a.sellingPrice;
          bValue = b.sellingPrice;
          break;
        case 'costOfGoodsSold':
          aValue = a.costOfGoodsSold;
          bValue = b.costOfGoodsSold;
          break;
        case 'margin':
          aValue = a.margin;
          bValue = b.margin;
          break;
        case 'lastEdited':
          aValue = new Date(a.lastEdited);
          bValue = new Date(b.lastEdited);
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    console.log('Products API - After all filters and sorting:', filteredAndTransformedProducts.length);

    // Now apply pagination
    const totalProducts = filteredAndTransformedProducts.length;
    const totalPages = Math.ceil(totalProducts / limit);
    
    // Client-side pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = filteredAndTransformedProducts.slice(startIndex, endIndex);

    // ✅ NEW: Pre-fetch fresh variant costs ONLY for paginated products (to avoid rate limiting)
    let freshVariantCostsForPageProducts: Record<string, Record<string, number>> = {};
    const pageProductsNeedingFreshCosts = paginatedProducts.filter((product: any) => {
      const existingProduct = existingProductsMap.get(product.id);
      const cachedProduct = shopifyProductsMap.get(product.id);
      
      // Only fetch for SHOPIFY products without good cached costs
      if (product.costSource === 'SHOPIFY') {
        const hasGoodSavedCost = existingProduct?.costOfGoodsSold && existingProduct.costOfGoodsSold > 0;
        const hasGoodVariantCost = cachedProduct?.variants?.[0]?.costPerItem && cachedProduct.variants[0].costPerItem > 0;
        const hasGoodDisplayCost = product.shopifyCostOfGoodsSold && product.shopifyCostOfGoodsSold > 0;
        return !hasGoodSavedCost && !hasGoodVariantCost && !hasGoodDisplayCost;
      }
      return false;
    }).map((product: any) => product.id);

    if (pageProductsNeedingFreshCosts.length > 0) {
      console.log(`💰 Fetching fresh variant costs for ${pageProductsNeedingFreshCosts.length} SHOPIFY products on current page (avoiding rate limits)`);
      try {
        freshVariantCostsForPageProducts = await getProductsVariantCostData(formattedDomain, store.accessToken, pageProductsNeedingFreshCosts);
        
        // Apply fresh variant costs to products that need them
        for (const product of paginatedProducts) {
          if (product.costSource === 'SHOPIFY' && pageProductsNeedingFreshCosts.includes(product.id)) {
            const productVariantCosts = freshVariantCostsForPageProducts[product.id];
            if (productVariantCosts && Object.keys(productVariantCosts).length > 0) {
              // Use the first variant cost as the product cost
              const firstVariantCost = Object.values(productVariantCosts)[0];
              if (firstVariantCost && firstVariantCost > 0) {
                product.costOfGoodsSold = firstVariantCost;
                product.shopifyCostOfGoodsSold = firstVariantCost;
                console.log(`💰 Product ${product.id} "${product.title}" - applied fresh variant cost: $${firstVariantCost}`);
                
                // Recalculate margin with the fresh cost
                const totalCost = product.costOfGoodsSold + product.handlingFees + product.miscFees;
                product.margin = product.sellingPrice > 0 ? ((product.sellingPrice - totalCost) / product.sellingPrice) * 100 : 0;
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error fetching variant costs for current page:', error);
      }
    }

    // ✅ PERFORMANCE: Use cached handling fees from database (calculated during sync)
    for (const product of paginatedProducts) {
      // ✅ DEBUG: Log all products to see what's different about Custom 3D Wedding Welcome Sign
      console.log(`🔍 Product ${product.id} "${product.title}" - Source: ${product.costSource}, Cost: $${product.costOfGoodsSold}, ShopifyCost: $${product.shopifyCostOfGoodsSold || 'null'}`);
      
      if (product.costSource === 'SHOPIFY') {
        // ✅ Use cached handling fees from database (calculated during sync)
        // No more per-request calculation - much more efficient!
        const cachedHandlingFees = product.handlingFees; // Already loaded from database
        product.shopifyHandlingFees = cachedHandlingFees;
        
        // Recalculate total cost and margin with cached handling fees
        const totalCost = product.costOfGoodsSold + cachedHandlingFees + product.miscFees;
        product.margin = product.sellingPrice > 0 ? ((product.sellingPrice - totalCost) / product.sellingPrice) * 100 : 0;
        
        console.log(`💰 Using cached handling fees for "${product.title}": $${cachedHandlingFees} (no calculation needed)`);
      }
    }

    console.log('Products API - Pagination:', {
      totalProducts,
      totalPages,
      currentPage: page,
      startIndex,
      endIndex,
      returnedProducts: paginatedProducts.length
    });

    // ✅ SMART COST SYNC: Only fetch cost data for products that need it
    let productsNeedingSync: string[] = []; // ✅ Declare in proper scope
    
    if (fetchCosts && paginatedProducts.length > 0) {
      const pageProductIds = paginatedProducts.map(product => product.id);
      
      // Determine which products need cost data refresh
      productsNeedingSync = pageProductIds;
      
      if (!forceSync) {
        // Filter to only products that haven't been synced recently
        const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
        productsNeedingSync = pageProductIds.filter(productId => {
          const shopifyProduct = shopifyProductsMap.get(productId);
          return !shopifyProduct?.lastSyncedAt || new Date(shopifyProduct.lastSyncedAt) < eightHoursAgo;
        });
      }

      if (productsNeedingSync.length > 0) {
        console.log(`Products API - Syncing cost data for ${productsNeedingSync.length} products (${pageProductIds.length - productsNeedingSync.length} already fresh)`);
        
        const pageCostData = await getProductsCostData(store.domain, store.accessToken, productsNeedingSync);
        
        // Save cost data to database
        await saveCostDataToDatabase(store.id, pageCostData, productsNeedingSync);
        
        // ✅ FIX: For page sync, also update main Product table with variant costs AND handling fees
        if (forceSync) {
          console.log(`Products API - Updating main Product table for ${productsNeedingSync.length} products with variant costs and handling fees`);
          for (const productId of productsNeedingSync) {
            const shopifyProduct = shopifyProductsMap.get(productId);
            if (shopifyProduct?.variants && shopifyProduct.variants.length > 0) {
              const firstVariant = shopifyProduct.variants[0];
              const variantCost = firstVariant?.costPerItem || pageCostData[productId];
              const variantPrice = firstVariant?.price || 0;
              
              // ✅ NEW: Calculate handling fees for this product during page sync
              const calculatedHandlingFees = await calculateHandlingFeesFromAdditionalCosts(store.id, variantPrice);
              
              if (variantCost && variantCost > 0) {
                try {
                  await prisma.product.upsert({
                    where: { shopifyId: productId },
                    update: { 
                      costOfGoodsSold: variantCost,
                      handlingFees: calculatedHandlingFees, // ✅ NEW: Update handling fees
                      costSource: 'SHOPIFY',
                      price: variantPrice,
                      sellingPrice: variantPrice,
                      title: shopifyProduct.title
                    },
                    create: {
                      shopifyId: productId,
                      storeId: store.id,
                      title: shopifyProduct.title || `Product ${productId}`,
                      description: '',
                      price: variantPrice,
                      sellingPrice: variantPrice,
                      cost: variantCost,
                      costOfGoodsSold: variantCost,
                      handlingFees: calculatedHandlingFees, // ✅ NEW: Set handling fees
                      costSource: 'SHOPIFY',
                      sku: firstVariant?.sku || ''
                    }
                  });
                  console.log(`Products API - Updated main Product ${productId} with variant cost $${variantCost} and handling fees $${calculatedHandlingFees}`);
                } catch (error) {
                  console.error(`Products API - Error updating main Product ${productId}:`, error);
                }
              }
            }
          }
        }
        
        // Refresh sync status after saving to get updated timestamps
        const updatedSyncStatus = await (prisma as any).shopifyProduct.findMany({
          where: { 
            storeId: store.id,
            id: { in: productsNeedingSync }
          },
          select: { 
            id: true, 
            lastSyncedAt: true 
          }
        });
        
        // Update the shopifyProductsMap with fresh timestamps
        updatedSyncStatus.forEach((syncStatus: any) => {
          const existing = shopifyProductsMap.get(syncStatus.id);
          if (existing) {
            existing.lastSyncedAt = syncStatus.lastSyncedAt;
          }
        });
        
        console.log(`Products API - Refreshed sync timestamps for ${updatedSyncStatus.length} products`);
        
        // Apply cost data to current page products
        for (const product of paginatedProducts) {
          const shopifyInventoryCost = pageCostData[product.id];
          
          // Update the transformed product's shopify cost data
          product.shopifyCostOfGoodsSold = shopifyInventoryCost || null;
          
          // Update lastSyncedAt with fresh timestamp from database
          const shopifyProduct = shopifyProductsMap.get(product.id);
          product.lastSyncedAt = shopifyProduct?.lastSyncedAt instanceof Date ? shopifyProduct.lastSyncedAt.toISOString() : null;
          
          // ✅ FIX: For SHOPIFY products, ensure we use FIRST variant cost for consistency with price
          if (product.costSource === 'SHOPIFY') {
            // Try to get first variant cost from cached data first (more reliable ordering)
            let firstVariantCost = null;
            if (shopifyProduct?.variants && shopifyProduct.variants.length > 0) {
              firstVariantCost = shopifyProduct.variants[0]?.costPerItem;
            }
            
            // Use first variant cost if available, otherwise fall back to pageCostData
            const consistentCost = firstVariantCost || shopifyInventoryCost || 0;
            product.costOfGoodsSold = consistentCost;
            product.shopifyCostOfGoodsSold = consistentCost;
            
            // ✅ NEW: If this product was just synced, get fresh handling fees from database
            if (forceSync && productsNeedingSync.includes(product.id)) {
              const freshProduct = await prisma.product.findUnique({
                where: { shopifyId: product.id },
                select: { handlingFees: true }
              });
              
              if (freshProduct) {
                product.handlingFees = freshProduct.handlingFees;
                product.shopifyHandlingFees = freshProduct.handlingFees;
                console.log(`💰 Updated handling fees for "${product.title}": $${freshProduct.handlingFees} (freshly calculated)`);
              }
            }
            
            // ✅ FIX: Recalculate margin with correct costs including handling fees
            const totalCost = product.costOfGoodsSold + product.handlingFees + product.miscFees;
            product.margin = product.sellingPrice > 0 ? ((product.sellingPrice - totalCost) / product.sellingPrice) * 100 : 0;
            
            console.log(`✅ Product ${product.id} consistency fix - Price: $${product.sellingPrice}, Cost: $${product.costOfGoodsSold}, Handling: $${product.handlingFees}, Margin: ${product.margin.toFixed(2)}%`);
          }
        }
      } else {
        console.log(`Products API - All ${pageProductIds.length} products already have fresh cost data`);
      }
    }

    console.log('Products API - Successfully transformed products')
    
    // ✅ DEBUG: Log sync timestamps being returned to frontend
    console.log(`🔍 API Response Debug - Products with sync timestamps:`);
    paginatedProducts.forEach((product: any, index: number) => {
      if (product.lastSyncedAt) {
        console.log(`  ${index + 1}. "${product.title}" - lastSyncedAt: ${product.lastSyncedAt}`);
      } else {
        console.log(`  ${index + 1}. "${product.title}" - lastSyncedAt: NULL`);
      }
    });
    
    const requestEnd = Date.now();
    const duration = requestEnd - requestStart;
    console.log(`✅ Request [${requestId}] - COMPLETED in ${duration}ms
      - Products returned: ${paginatedProducts.length}
      - Total products: ${totalProducts}
      - Page: ${page}/${totalPages}
      - Used database cache: ${!shouldFetchFromShopify}
      - Products synced: ${fetchCosts ? (productsNeedingSync?.length || 0) : 0}`);
    
    return NextResponse.json({ 
      products: paginatedProducts,
      total: totalProducts,
      page,
      totalPages,
      limit: limit
    })

  } catch (error) {
    const requestEnd = Date.now();
    const duration = requestEnd - requestStart;
    console.error(`❌ Request [${requestId}] - ERROR after ${duration}ms:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 