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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '250')
    console.log('Products API - Fetching products with limit:', limit)
    
    // Fetch products from Shopify with inventory costs
    console.log('Products API - Fetching products from Shopify with inventory costs')
    const shopifyProducts = (await getProductsWithInventoryCosts(formattedDomain, store.accessToken, { 
      limit
    })) as ShopifyProduct[]

    console.log('Products API - Total Shopify products fetched:', shopifyProducts.length)
    console.log('Products API - All products from Shopify:')
    shopifyProducts.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.title} (ID: ${product.id})`)
    })

    console.log('Products API - First Shopify product:', shopifyProducts[0] ? {
      id: shopifyProducts[0].id,
      title: shopifyProducts[0].title,
      variants: shopifyProducts[0].variants.map(v => ({
        id: v.id,
        cost_per_item: v.cost_per_item,
        parsed_cost: parseFloat(v.cost_per_item)
      }))
    } : null)

    // Fetch cost data from our database
    const dbProducts = await prisma.product.findMany({
      where: { storeId: store.id },
      select: {
        shopifyId: true,
        costOfGoodsSold: true,
        handlingFees: true,
        miscFees: true,
        costSource: true,
        lastEdited: true,
        variants: {
          select: {
            id: true,
            cost: true,
            costSource: true,
            costLastUpdated: true
          }
        }
      }
    })

    console.log('Products API - Database products found:', dbProducts.length)
    console.log('Products API - Database products:', dbProducts.map(p => ({
      shopifyId: p.shopifyId,
      miscFees: p.miscFees,
      costOfGoodsSold: p.costOfGoodsSold,
      handlingFees: p.handlingFees,
      costSource: p.costSource
    })))

    // Merge Shopify data with our cost data
    const products = shopifyProducts.map((shopifyProduct: ShopifyProduct) => {
      const dbProduct = dbProducts.find(p => p.shopifyId === shopifyProduct.id)
      console.log(`Products API - Looking for product ${shopifyProduct.id} in database:`, dbProduct ? 'FOUND' : 'NOT FOUND')
      if (dbProduct) {
        console.log(`Products API - Database product data:`, {
          miscFees: dbProduct.miscFees,
          costOfGoodsSold: dbProduct.costOfGoodsSold,
          handlingFees: dbProduct.handlingFees
        })
      }
      return {
        ...shopifyProduct,
        // Add database fields to the product
        dbCostOfGoodsSold: dbProduct?.costOfGoodsSold || 0,
        dbHandlingFees: dbProduct?.handlingFees || 0,
        dbMiscFees: dbProduct?.miscFees || 0,
        dbCostSource: dbProduct?.costSource || 'SHOPIFY',
        dbLastEdited: dbProduct?.lastEdited,
        variants: shopifyProduct.variants.map((variant: ShopifyVariant) => {
          const dbVariant = dbProduct?.variants?.find((v: any) => v.id === variant.id)
          // Try inventory cost first, then cost_per_item
          const inventoryCost = variant.inventory_cost ? parseFloat(variant.inventory_cost) : null
          const shopifyCost = variant.cost_per_item ? parseFloat(variant.cost_per_item) : null
          const finalShopifyCost = inventoryCost || shopifyCost
          
          console.log(`Processing variant ${variant.id}:`, {
            dbVariantCost: dbVariant?.cost,
            rawShopifyCost: variant.cost_per_item,
            inventoryCost: variant.inventory_cost,
            finalShopifyCost: finalShopifyCost,
            dbVariantSource: dbVariant?.costSource
          })
          
          // If we have a dbVariant with a cost and it's set to MANUAL, use that
          if (dbVariant?.cost !== null && dbVariant?.cost !== undefined && dbVariant?.costSource === 'MANUAL') {
            return {
              ...variant,
              cost: dbVariant.cost,
              costSource: 'MANUAL',
              costLastUpdated: dbVariant.costLastUpdated ?? new Date()
            }
          }
          
          // Try to use Shopify's cost (inventory or cost_per_item) if available and valid
          if (finalShopifyCost !== null && !isNaN(finalShopifyCost) && finalShopifyCost > 0) {
            return {
              ...variant,
              cost: finalShopifyCost,
              costSource: 'SHOPIFY',
              costLastUpdated: new Date()
            }
          }
          
          // If we have any dbVariant cost as a fallback, use that
          if (dbVariant?.cost !== null && dbVariant?.cost !== undefined) {
            return {
              ...variant,
              cost: dbVariant.cost,
              costSource: dbVariant.costSource ?? 'MANUAL',
              costLastUpdated: dbVariant.costLastUpdated ?? new Date()
            }
          }
          
          // If no cost data is available anywhere, default to MANUAL mode with 0 cost
          // This allows users to enter their own cost data
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
    return NextResponse.json({ products })
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