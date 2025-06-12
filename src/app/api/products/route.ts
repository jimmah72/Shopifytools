import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getProducts, getProductsWithInventoryCosts } from '@/lib/shopify-api'
import { formatShopDomain } from '@/lib/shopify.config'
import { Prisma } from '@prisma/client'

interface ShopifyVariant {
  id: string
  price: string
  inventory_quantity: number
  cost_per_item: string
  sku?: string
  inventory_cost?: string
  inventory_tracked?: boolean
  inventory_item_id?: string
}

interface ShopifyProduct {
  id: string
  title: string
  handle: string
  description: string
  tags: string[]
  images: Array<{ src: string; alt?: string }>
  variants: ShopifyVariant[]
}

interface DbVariant {
  id: string
  cost: number | null
  costSource: string | null
  costLastUpdated: Date | null
}

interface DbProduct {
  id: string
  variants: DbVariant[]
}

interface TransformedProduct {
  id: string
  title: string
  price: number
  cost: number
  totalSales: number
  totalRevenue: number
  totalProfit: number
  profitMargin: number
  adSpend: number
  netProfit: number
}

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type DbQueryResult = Prisma.PromiseReturnType<typeof prisma.product.findMany>

type ProductWithVariants = {
  id: string;
  variants: Array<{
    id: string;
    cost: number | null;
    costSource: string | null;
    costLastUpdated: Date | null;
  }>;
};

type PrismaProductSelect = Prisma.ProductGetPayload<{
  select: {
    id: true
    variants: {
      select: {
        id: true
        cost: true
        costSource: true
        costLastUpdated: true
      }
    }
  }
}>

export async function GET(request: NextRequest) {
  console.log('Products API - GET request received')
  try {
    // Check environment variables first
    console.log('Products API - Checking environment variables')
    const envVars = {
      SHOPIFY_APP_API_KEY: process.env.SHOPIFY_APP_API_KEY,
      SHOPIFY_APP_SECRET: process.env.SHOPIFY_APP_SECRET,
      SUPABASE_DIRECT_URL: process.env.SUPABASE_DIRECT_URL,
    };

    const missingVars = Object.entries(envVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error('Products API - Missing environment variables:', missingVars)
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: `Missing environment variables: ${missingVars.join(', ')}. Please check your Netlify environment variables.`
        },
        { status: 500 }
      )
    }

    // Get the first store from the database
    console.log('Products API - Fetching store from database')
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true }
    })

    console.log('Products API - Store found:', store ? { domain: store.domain } : null)

    if (!store) {
      console.log('Products API - No store found')
      return NextResponse.json(
        { error: 'No store connected. Please connect a Shopify store first.' },
        { status: 404 }
      )
    }

    if (!store.domain || !store.accessToken) {
      console.error('Products API - Store missing domain or access token')
      return NextResponse.json(
        { error: 'Store configuration is incomplete. Please reconnect your Shopify store.' },
        { status: 500 }
      )
    }

    // Format the store domain
    const formattedDomain = formatShopDomain(store.domain)
    console.log('Products API - Formatted domain:', formattedDomain)

    // Get query parameters with pagination support
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    
    console.log('Products API - Query params:', { page, limit, search })
    
    // For better performance, we'll use a smaller default limit
    const actualLimit = Math.min(limit, 50) // Cap at 50 products per request
    
    // Fetch products from Shopify with pagination
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

    // Fetch cost data from our database (simplified for performance)
    const dbProducts = await prisma.product.findMany({
      where: { 
        storeId: store.id
      }
    })

    console.log('Products API - Database products found:', dbProducts.length)

    // Create a lookup map for better performance
    const dbProductMap = new Map(dbProducts.map(p => [p.shopifyId, p]));

    // Merge Shopify data with our cost data (only for paginated products)
    const products = paginatedProducts.map((shopifyProduct: ShopifyProduct) => {
      const dbProduct = dbProductMap.get(shopifyProduct.id)
      
      return {
        ...shopifyProduct,
        // Add database fields to the product
        dbCostOfGoodsSold: dbProduct?.costOfGoodsSold || 0,
        dbHandlingFees: dbProduct?.handlingFees || 0,
        dbMiscFees: dbProduct?.miscFees || 0,
        dbCostSource: dbProduct?.costSource || 'SHOPIFY',
        dbLastEdited: dbProduct?.lastEdited,
        variants: shopifyProduct.variants.map((variant: ShopifyVariant) => {
          // For now, we'll use a simpler approach for variants
          // In production, you'd want to properly join variant data
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

    console.log('Products API - Successfully fetched and merged products')
    
    return NextResponse.json({ 
      products,
      total: totalProducts,
      page,
      totalPages,
      limit: actualLimit
    })
  } catch (error) {
    console.error('Products API - Error:', error)
    
    // Check if it's an environment variable error
    if (error instanceof Error && error.message.includes('Missing required environment variable')) {
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: error.message
        },
        { status: 500 }
      )
    }

    // Check if it's a Shopify API error
    if (error instanceof Error && error.message.includes('Shopify API Error')) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch products from Shopify',
          details: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 