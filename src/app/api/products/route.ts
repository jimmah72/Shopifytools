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
}

interface ShopifyVariant {
  id: string;
  price: string;
  cost_per_item?: string;
  sku?: string;
  inventory_quantity?: number;
  inventory_item_id?: string;
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
    const fetchCosts = searchParams.get('fetchCosts') === 'true' // New parameter
    
    console.log('Products API - Query params:', { page, limit, search, fetchCosts })
    
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

    // Now we have exact totals since we fetched all products
    const totalProducts = filteredProducts.length;
    const totalPages = Math.ceil(totalProducts / limit);
    
    // Client-side pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    console.log('Products API - Pagination:', {
      totalProducts,
      totalPages,
      currentPage: page,
      startIndex,
      endIndex,
      returnedProducts: paginatedProducts.length
    });

    // Fetch cost data for products on current page if requested
    let costData: Record<string, number> = {};
    if (fetchCosts && paginatedProducts.length > 0) {
      console.log('Products API - Fetching cost data for current page products');
      const productIds = paginatedProducts.map((product: ShopifyProduct) => product.id);
      costData = await getProductsCostData(formattedDomain, store.accessToken, productIds);
    }

    // Transform products to our format with SHOPIFY as default source
    const products = paginatedProducts.map((shopifyProduct: ShopifyProduct) => {
      const variant = shopifyProduct.variants[0] || {};
      const price = parseFloat(variant.price) || 0;
      
      // Get Shopify inventory cost - use fetched cost data if available
      const shopifyInventoryCost = fetchCosts ? (costData[shopifyProduct.id] || 0) : 0;
      
      // Default ALL products to SHOPIFY source as requested
      const costSource = 'SHOPIFY';
      const costOfGoodsSold = shopifyInventoryCost;
      const handlingFees = 0; // Shopify doesn't have handling fees
      const miscFees = 0; // Start with 0, user can edit
      
      // Calculate margin
      const totalCost = costOfGoodsSold + handlingFees + miscFees;
      const margin = price > 0 ? ((price - totalCost) / price) * 100 : 0;
      
      return {
        id: shopifyProduct.id,
        title: shopifyProduct.title,
        image: shopifyProduct.images?.[0]?.src || '',
        status: 'Active' as const,
        lastEdited: new Date().toLocaleDateString('en-US', {
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
        shopifyCostOfGoodsSold: shopifyInventoryCost, // Always include Shopify cost for reference
        shopifyHandlingFees: 0, // Shopify doesn't have handling fees
        sku: variant.sku || '',
        inventoryQuantity: variant.inventory_quantity || 0,
        variants: shopifyProduct.variants.map(v => ({
          id: v.id,
          price: parseFloat(v.price) || 0,
          inventory_cost: fetchCosts ? (costData[shopifyProduct.id] || 0) : 0,
          sku: v.sku || '',
          inventory_quantity: v.inventory_quantity || 0,
          inventory_tracked: (v as any).inventory_tracked || false
        }))
      };
    });

    console.log('Products API - Successfully transformed products')
    
    return NextResponse.json({ 
      products,
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