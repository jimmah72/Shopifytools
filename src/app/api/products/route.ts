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
    // Get the first store from the database
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    })

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
      sortField, 
      sortDirection, 
      statusFilter, 
      costSourceFilter, 
      costDataFilter 
    })
    
    // Fetch ALL products from Shopify using efficient pagination
    console.log(`📊 Request [${requestId}] - Fetching ALL products from Shopify with basic data`)
    const shopifyProducts = await getAllProducts(formattedDomain, store.accessToken);

    console.log(`📊 Request [${requestId}] - Total Shopify products fetched: ${shopifyProducts.length}`);
    console.log(`📊 Request [${requestId}] - Will fetch cost data only for current page products (no cost filtering needed)`);

    // Get existing product records and ShopifyProduct sync status
    const existingProducts = await prisma.product.findMany({
      where: { storeId: store.id },
      select: { 
        shopifyId: true, 
        costOfGoodsSold: true, 
        handlingFees: true, 
        miscFees: true, 
        costSource: true, 
        lastEdited: true 
      }
    });

    // Get sync status from ShopifyProduct table  
    const shopifyProductSyncStatus = await (prisma as any).shopifyProduct.findMany({
      where: { storeId: store.id },
      select: { 
        id: true, 
        lastSyncedAt: true 
      }
    });

    // Create maps for quick lookup
    const existingProductsMap = new Map(existingProducts.map((p: any) => [p.shopifyId, p]));
    const syncStatusMap = new Map(shopifyProductSyncStatus.map((p: any) => [p.id, p.lastSyncedAt]));

    console.log(`Products API - Found ${existingProducts.length} existing database records for products`);
    console.log(`Products API - Found ${shopifyProductSyncStatus.length} ShopifyProduct sync records`);

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

    // Transform ALL products to our format
    const transformedProducts = filteredProducts.map((shopifyProduct: ShopifyProduct) => {
      // Extract numeric ID from GraphQL ID format
      const numericId = shopifyProduct.id.includes('gid://shopify/Product/') 
        ? shopifyProduct.id.replace('gid://shopify/Product/', '')
        : shopifyProduct.id;

      // Get the main variant (first one) for pricing
      const variant = shopifyProduct.variants[0];
      const price = parseFloat(variant.price) || 0;

      // Check for existing database record using the new map
      const existingProduct = existingProductsMap.get(numericId);
      
      // Get sync status from ShopifyProduct table
      const lastSyncedAt = syncStatusMap.get(numericId);

      // Determine cost source and values
      const costSource = existingProduct?.costSource || 'SHOPIFY';
      const costOfGoodsSold = existingProduct?.costOfGoodsSold || 0;
      const handlingFees = existingProduct?.handlingFees || 0; 
      const miscFees = existingProduct?.miscFees || 0;

      // Get Shopify inventory cost if available
      const shopifyInventoryCost = needsCostDataForFiltering && allCostData ? allCostData[numericId] : null;

      const totalCost = costOfGoodsSold + handlingFees + miscFees;
      const margin = price > 0 ? ((price - totalCost) / price) * 100 : 0;
      
      return {
        id: numericId,
        title: shopifyProduct.title,
        image: shopifyProduct.images?.[0]?.src || '',
        status: mapShopifyStatus(shopifyProduct.status),
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
        costOfGoodsSold: costOfGoodsSold,
        handlingFees: handlingFees,
        miscFees: miscFees,
        margin: margin,
        costSource: costSource,
        shopifyCostOfGoodsSold: shopifyInventoryCost || null,
        shopifyHandlingFees: 0,
        lastSyncedAt: lastSyncedAt && lastSyncedAt instanceof Date ? lastSyncedAt.toISOString() : null,
        sku: variant.sku || '',
        inventoryQuantity: variant.inventory_quantity || 0,
        variants: shopifyProduct.variants.map(v => {
          // Extract numeric variant ID from GraphQL ID format
          const numericVariantId = v.id.includes('gid://shopify/ProductVariant/') 
            ? v.id.replace('gid://shopify/ProductVariant/', '')
            : v.id;
          
          return {
            id: numericVariantId,
            price: parseFloat(v.price) || 0,
            inventory_cost: 0, // Will be populated with variant-specific costs when needed
            cost: v.cost_per_item !== undefined ? parseFloat(v.cost_per_item) || 0 : 0,
            sku: v.sku || '',
            inventory_quantity: v.inventory_quantity || 0,
            inventory_tracked: (v as any).inventory_tracked || false
          };
        })
      };
    });

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

    console.log('Products API - Pagination:', {
      totalProducts,
      totalPages,
      currentPage: page,
      startIndex,
      endIndex,
      returnedProducts: paginatedProducts.length
    });

    // If we didn't fetch cost data for all products (no cost filtering), fetch it now for current page only
    if (fetchCosts && !needsCostDataForFiltering && paginatedProducts.length > 0) {
      console.log('Products API - Fetching cost data for current page products only');
      const pageProductIds = paginatedProducts.map(product => 
        product.id.includes('gid://shopify/Product/') 
          ? product.id.replace('gid://shopify/Product/', '')
          : product.id
      );
      
      console.log('Products API - Fetching cost data for page product IDs:', pageProductIds);
      const pageCostData = await getProductsCostData(store.domain, store.accessToken, pageProductIds);
      
      // ✅ NEW: Save cost data to database (unified sync approach)
      await saveCostDataToDatabase(store.id, pageCostData, pageProductIds);
      
      // ✅ FIXED: Refresh sync status after saving to get updated timestamps
      const updatedSyncStatus = await (prisma as any).shopifyProduct.findMany({
        where: { 
          storeId: store.id,
          id: { in: pageProductIds }
        },
        select: { 
          id: true, 
          lastSyncedAt: true 
        }
      });
      
      // Update the syncStatusMap with fresh timestamps
      updatedSyncStatus.forEach((syncStatus: any) => {
        syncStatusMap.set(syncStatus.id, syncStatus.lastSyncedAt);
      });
      
      console.log(`Products API - Refreshed sync timestamps for ${updatedSyncStatus.length} products`);
      
      // Apply cost data to current page products
      paginatedProducts.forEach((product: any) => {
        const numericId = product.id.includes('gid://shopify/Product/') 
          ? product.id.replace('gid://shopify/Product/', '')
          : product.id;
        
        const shopifyInventoryCost = pageCostData[numericId];
        
        // Update the transformed product's shopify cost data
        product.shopifyCostOfGoodsSold = shopifyInventoryCost || null;
        
        // ✅ FIXED: Update lastSyncedAt with fresh timestamp from database
        const updatedSyncTime = syncStatusMap.get(numericId);
        product.lastSyncedAt = updatedSyncTime && updatedSyncTime instanceof Date ? updatedSyncTime.toISOString() : null;
        
        // If cost source is SHOPIFY, update the cost of goods sold
        if (product.costSource === 'SHOPIFY') {
          product.costOfGoodsSold = shopifyInventoryCost || 0;
          const totalCost = product.costOfGoodsSold + product.handlingFees + product.miscFees;
          product.margin = product.sellingPrice > 0 ? ((product.sellingPrice - totalCost) / product.sellingPrice) * 100 : 0;
        }
      });
    }

    // If variant costs are requested, fetch them for current page only
    if (fetchVariantCosts && paginatedProducts.length > 0) {
      console.log('Products API - Fetching variant-specific cost data for current page products');
      const pageProductIds = paginatedProducts.map(product => 
        product.id.includes('gid://shopify/Product/') 
          ? product.id.replace('gid://shopify/Product/', '')
          : product.id
      );
      
      const variantCostData = await getProductsVariantCostData(store.domain, store.accessToken, pageProductIds);
      
      // ✅ NEW: Save variant cost data to database (unified sync approach)
      await saveVariantCostDataToDatabase(store.id, variantCostData, pageProductIds);
      
      // ✅ FIXED: Refresh sync status after saving variant costs to get updated timestamps
      const updatedSyncStatus = await (prisma as any).shopifyProduct.findMany({
        where: { 
          storeId: store.id,
          id: { in: pageProductIds }
        },
        select: { 
          id: true, 
          lastSyncedAt: true 
        }
      });
      
      // Update the syncStatusMap with fresh timestamps
      updatedSyncStatus.forEach((syncStatus: any) => {
        syncStatusMap.set(syncStatus.id, syncStatus.lastSyncedAt);
      });
      
      console.log(`Products API - Refreshed sync timestamps for variant costs on ${updatedSyncStatus.length} products`);
      
      // Apply variant cost data to current page products
      paginatedProducts.forEach((product: any) => {
        const numericId = product.id.includes('gid://shopify/Product/') 
          ? product.id.replace('gid://shopify/Product/', '')
          : product.id;
        
        const productVariantCosts = variantCostData[numericId] || {};
        
        // ✅ FIXED: Update lastSyncedAt with fresh timestamp from database
        const updatedSyncTime = syncStatusMap.get(numericId);
        product.lastSyncedAt = updatedSyncTime && updatedSyncTime instanceof Date ? updatedSyncTime.toISOString() : null;
        
        // Update each variant with its specific cost
        product.variants.forEach((variant: any) => {
          const variantCost = productVariantCosts[variant.id];
          if (variantCost !== undefined) {
            variant.inventory_cost = variantCost;
            variant.cost = variantCost;
          }
        });
      });
    }

    console.log('Products API - Successfully transformed products')
    
    const requestEnd = Date.now();
    const duration = requestEnd - requestStart;
    console.log(`✅ Request [${requestId}] - COMPLETED in ${duration}ms
      - Products returned: ${paginatedProducts.length}
      - Total products: ${totalProducts}
      - Page: ${page}/${totalPages}`);
    
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