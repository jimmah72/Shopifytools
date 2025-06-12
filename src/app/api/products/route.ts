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

    // Get query parameters with pagination support
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    
    console.log('Products API - Query params:', { page, limit, search })
    
    // Cap limit for performance
    const actualLimit = Math.min(limit, 50)
    
    if (!store.domain || !store.accessToken) {
      return NextResponse.json(
        { error: 'Store configuration is incomplete. Please reconnect your Shopify store.' },
        { status: 500 }
      )
    }

    // Format the store domain
    const formattedDomain = formatShopDomain(store.domain)
    
    // Fetch products from Shopify
    const shopifyProducts = (await getProductsWithInventoryCosts(formattedDomain, store.accessToken, { 
      limit: 250 // Fetch a reasonable amount
    })) as ShopifyProduct[]

    console.log('Products API - Shopify products fetched:', shopifyProducts.length)

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
    }

    const totalProducts = filteredProducts.length;
    const totalPages = Math.ceil(totalProducts / actualLimit);
    const startIndex = (page - 1) * actualLimit;
    const endIndex = startIndex + actualLimit;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    // Transform products with default database values (no complex DB queries)
    const products = paginatedProducts.map((shopifyProduct: ShopifyProduct) => {
      return {
        ...shopifyProduct,
        dbCostOfGoodsSold: 0,
        dbHandlingFees: 0,
        dbMiscFees: 0,
        dbCostSource: 'SHOPIFY',
        dbLastEdited: new Date(),
        variants: shopifyProduct.variants.map((variant: ShopifyVariant) => {
          const inventoryCost = variant.inventory_cost ? parseFloat(variant.inventory_cost) : null
          const shopifyCost = variant.cost_per_item ? parseFloat(variant.cost_per_item) : null
          const finalShopifyCost = inventoryCost || shopifyCost
          
          if (finalShopifyCost !== null && !isNaN(finalShopifyCost) && finalShopifyCost > 0) {
            return {
              ...variant,
              cost: finalShopifyCost,
              costSource: 'SHOPIFY',
              costLastUpdated: new Date()
            }
          }
          
          return {
            ...variant,
            cost: 0,
            costSource: 'MANUAL',
            costLastUpdated: new Date()
          }
        })
      }
    })

    console.log('Products API - Returning Shopify data with', products.length, 'products')
    
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