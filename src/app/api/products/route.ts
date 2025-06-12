import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAllProducts, getProductsCostData } from '@/lib/shopify-api'
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

export async function GET(request: NextRequest) {
  console.log('Products API - GET request received')
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
      sortField, 
      sortDirection, 
      statusFilter, 
      costSourceFilter, 
      costDataFilter 
    })
    
    // Fetch ALL products from Shopify using efficient pagination
    console.log('Products API - Fetching ALL products from Shopify with basic data')
    const shopifyProducts = await getAllProducts(formattedDomain, store.accessToken);

    console.log('Products API - Total Shopify products fetched:', shopifyProducts.length)

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

    // Fetch cost data for ALL filtered products if requested (needed for filtering by cost data)
    let costData: Record<string, number> = {};
    if (fetchCosts && filteredProducts.length > 0) {
      console.log('Products API - Fetching cost data for all filtered products');
      const productIds = filteredProducts.map((product: ShopifyProduct) => product.id);
      costData = await getProductsCostData(formattedDomain, store.accessToken, productIds);
    }

    // Fetch existing database records for ALL filtered products
    const allNumericProductIds = filteredProducts.map((product: ShopifyProduct) => {
      return product.id.includes('gid://shopify/Product/') 
        ? product.id.replace('gid://shopify/Product/', '')
        : product.id;
    });

    const existingProducts = await prisma.product.findMany({
      where: {
        shopifyId: { in: allNumericProductIds },
        storeId: store.id
      },
      select: {
        shopifyId: true,
        costSource: true,
        costOfGoodsSold: true,
        handlingFees: true,
        miscFees: true,
        lastEdited: true
      }
    });

    const existingProductMap = new Map(
      existingProducts.map(p => [p.shopifyId, p])
    );

    console.log('Products API - Found', existingProducts.length, 'existing database records for products');

    // Transform ALL products to our format
    const transformedProducts = filteredProducts.map((shopifyProduct: ShopifyProduct) => {
      const variant = shopifyProduct.variants[0] || {};
      const price = parseFloat(variant.price) || 0;
      
      // Extract numeric ID from GraphQL ID format (gid://shopify/Product/123 -> 123)
      const numericId = shopifyProduct.id.includes('gid://shopify/Product/') 
        ? shopifyProduct.id.replace('gid://shopify/Product/', '')
        : shopifyProduct.id;
      
      // Get Shopify inventory cost - use fetched cost data if available
      const shopifyInventoryCost = fetchCosts ? costData[numericId] : undefined;
      
      // Check if we have existing database record for this product
      const existingProduct = existingProductMap.get(numericId);
      
      // Use database values if they exist, otherwise default to SHOPIFY
      const costSource = existingProduct?.costSource || 'SHOPIFY';
      const costOfGoodsSold = existingProduct?.costSource === 'MANUAL' 
        ? (existingProduct.costOfGoodsSold || 0)
        : (shopifyInventoryCost !== undefined ? shopifyInventoryCost : 0);
      const handlingFees = existingProduct?.costSource === 'MANUAL' 
        ? (existingProduct.handlingFees || 0)
        : 0; // Shopify doesn't have handling fees
      const miscFees = existingProduct?.miscFees || 0;
      
      // Calculate margin
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
        shopifyCostOfGoodsSold: shopifyInventoryCost,
        shopifyHandlingFees: 0,
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
            inventory_cost: fetchCosts ? (costData[numericId] || 0) : 0,
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

    console.log('Products API - Successfully transformed products')
    
    return NextResponse.json({ 
      products: paginatedProducts,
      total: totalProducts,
      page,
      totalPages,
      limit: limit
    })

  } catch (error) {
    console.error('Products API - Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 