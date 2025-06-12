import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getProductsWithInventoryCosts } from '@/lib/shopify-api'
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
  inventory_cost?: string;
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
    
    console.log('Products API - Query params:', { page, limit, search })
    
    // For better performance, we'll use a smaller default limit
    const actualLimit = Math.min(limit, 50) // Cap at 50 products per request
    
    // Fetch products from Shopify with inventory costs
    console.log('Products API - Fetching products from Shopify with inventory costs')
    const shopifyProducts = (await getProductsWithInventoryCosts(formattedDomain, store.accessToken, { 
      limit: actualLimit,
      // Note: Shopify's REST API doesn't support offset pagination well
      // For now, we'll fetch a reasonable amount and implement client-side pagination
      // In production, consider using GraphQL API for better pagination
    })) as ShopifyProduct[]

    console.log('Products API - Total Shopify products fetched:', shopifyProducts.length)

    // Apply search filter if provided
    let filteredProducts = shopifyProducts;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = shopifyProducts.filter(product => 
        product.title.toLowerCase().includes(searchLower) ||
        product.handle.toLowerCase().includes(searchLower) ||
        product.variants.some(variant => 
          variant.sku?.toLowerCase().includes(searchLower)
        )
      );
      console.log('Products API - Filtered products by search:', filteredProducts.length);
    }

    // Implement client-side pagination
    const totalProducts = filteredProducts.length;
    const totalPages = Math.ceil(totalProducts / actualLimit);
    const startIndex = (page - 1) * actualLimit;
    const endIndex = startIndex + actualLimit;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    console.log('Products API - Pagination:', {
      totalProducts,
      totalPages,
      currentPage: page,
      startIndex,
      endIndex,
      returnedProducts: paginatedProducts.length
    });

    // Transform products with simple defaults (no database lookup)
    const products = paginatedProducts.map((shopifyProduct: ShopifyProduct) => {
      return {
        ...shopifyProduct,
        // Add simple default database fields
        dbCostOfGoodsSold: 0,
        dbHandlingFees: 0,
        dbMiscFees: 0,
        dbCostSource: 'MANUAL',
        dbLastEdited: new Date(),
        variants: shopifyProduct.variants.map((variant: ShopifyVariant) => {
          const inventoryCost = variant.inventory_cost ? parseFloat(variant.inventory_cost) : null
          const shopifyCost = variant.cost_per_item ? parseFloat(variant.cost_per_item) : null
          const finalShopifyCost = inventoryCost || shopifyCost
          
          // Try to use Shopify's cost if available and valid
          if (finalShopifyCost !== null && !isNaN(finalShopifyCost) && finalShopifyCost > 0) {
            return {
              ...variant,
              cost: finalShopifyCost,
              costSource: 'SHOPIFY',
              costLastUpdated: new Date()
            }
          }
          
          // Default to manual mode with 0 cost
          return {
            ...variant,
            cost: 0,
            costSource: 'MANUAL',
            costLastUpdated: new Date()
          }
        })
      }
    })

    console.log('Products API - Successfully fetched and transformed products')
    
    return NextResponse.json({ 
      products,
      total: totalProducts,
      page,
      totalPages,
      limit: actualLimit
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