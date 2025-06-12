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
    const forceSync = searchParams.get('sync') === 'true'
    
    console.log('Products API - Query params:', { page, limit, search, forceSync })
    
    // Cap limit for performance
    const actualLimit = Math.min(limit, 50)

    // STRATEGY 1: Load from database first for instant response
    let dbProductsQuery = prisma.product.findMany({
      where: { 
        storeId: store.id,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } }
          ]
        })
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * actualLimit,
      take: actualLimit
    })

    let dbTotalQuery = prisma.product.count({
      where: { 
        storeId: store.id,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } }
          ]
        })
      }
    })

    const [dbProducts, dbTotal] = await Promise.all([dbProductsQuery, dbTotalQuery])
    const totalPages = Math.ceil(dbTotal / actualLimit)

    console.log('Products API - Database products found:', dbProducts.length, 'of', dbTotal)

    // If we have cached data, return it immediately
    if (dbProducts.length > 0 && !forceSync) {
      // Transform database products to API format
      const products = dbProducts.map(dbProduct => ({
        id: dbProduct.shopifyId || dbProduct.id,
        title: dbProduct.title,
        handle: dbProduct.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        images: dbProduct.image ? [{ src: dbProduct.image }] : [],
        variants: [{
          id: dbProduct.id,
          price: dbProduct.price.toString(),
          cost_per_item: dbProduct.cost?.toString() || '0',
          sku: dbProduct.sku,
          inventory_cost: dbProduct.cost?.toString() || '0'
        }],
        // Add our database fields
        dbCostOfGoodsSold: dbProduct.costOfGoodsSold,
        dbHandlingFees: dbProduct.handlingFees,
        dbMiscFees: dbProduct.miscFees,
        dbCostSource: dbProduct.costSource,
        dbLastEdited: dbProduct.lastEdited
      }))

      console.log('Products API - Returning cached data')
      
      // Trigger background sync (don't await)
      if (!search) { // Only sync when not searching
        backgroundSync(store)
          .catch(error => console.error('Background sync failed:', error))
      }

      return NextResponse.json({ 
        products,
        total: dbTotal,
        page,
        totalPages,
        limit: actualLimit,
        cached: true,
        lastSync: dbProducts[0]?.updatedAt
      })
    }

    // STRATEGY 2: If no cached data or force sync, fetch from Shopify
    console.log('Products API - No cached data or force sync, fetching from Shopify')
    
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
      limit: 250 // Fetch more for initial cache
    })) as ShopifyProduct[]

    console.log('Products API - Shopify products fetched:', shopifyProducts.length)

    // Cache products in database (upsert)
    await cacheProductsInDatabase(shopifyProducts, store.id)

    // Apply search and pagination to Shopify data
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
    const totalPagesShopify = Math.ceil(totalProducts / actualLimit);
    const startIndex = (page - 1) * actualLimit;
    const endIndex = startIndex + actualLimit;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    // Get database data for the products we're returning
    const productIds = paginatedProducts.map(p => p.id);
    const dbProductsForMerge = await prisma.product.findMany({
      where: { 
        storeId: store.id,
        shopifyId: { in: productIds }
      }
    })

    // Create lookup map
    const dbProductMap = new Map(
      dbProductsForMerge.map(p => [p.shopifyId, p])
    );

    // Merge Shopify data with our database data
    const products = paginatedProducts.map((shopifyProduct: ShopifyProduct) => {
      const dbProduct = dbProductMap.get(shopifyProduct.id);
      
      return {
        ...shopifyProduct,
        dbCostOfGoodsSold: dbProduct?.costOfGoodsSold || 0,
        dbHandlingFees: dbProduct?.handlingFees || 0,
        dbMiscFees: dbProduct?.miscFees || 0,
        dbCostSource: dbProduct?.costSource || 'SHOPIFY',
        dbLastEdited: dbProduct?.lastEdited,
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

    console.log('Products API - Returning fresh Shopify data')
    
    return NextResponse.json({ 
      products,
      total: totalProducts,
      page,
      totalPages: totalPagesShopify,
      limit: actualLimit,
      cached: false,
      synced: true
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

// Background sync function
async function backgroundSync(store: { id: string; domain: string; accessToken: string }) {
  try {
    console.log('Background sync - Starting for store:', store.domain)
    
    const formattedDomain = formatShopDomain(store.domain)
    const shopifyProducts = (await getProductsWithInventoryCosts(formattedDomain, store.accessToken, { 
      limit: 250
    })) as ShopifyProduct[]

    console.log('Background sync - Fetched', shopifyProducts.length, 'products from Shopify')
    
    await cacheProductsInDatabase(shopifyProducts, store.id)
    
    console.log('Background sync - Completed successfully')
  } catch (error) {
    console.error('Background sync - Error:', error)
  }
}

// Function to cache products in database
async function cacheProductsInDatabase(shopifyProducts: ShopifyProduct[], storeId: string) {
  console.log('Caching', shopifyProducts.length, 'products in database')
  
  for (const shopifyProduct of shopifyProducts) {
    const variant = shopifyProduct.variants[0]
    if (!variant) continue

    const inventoryCost = variant.inventory_cost ? parseFloat(variant.inventory_cost) : null
    const shopifyCost = variant.cost_per_item ? parseFloat(variant.cost_per_item) : null
    const cost = inventoryCost || shopifyCost || 0

    try {
      await prisma.product.upsert({
        where: { 
          shopifyId: shopifyProduct.id 
        },
        update: {
          title: shopifyProduct.title,
          price: parseFloat(variant.price) || 0,
          cost: cost,
          sku: variant.sku,
          image: shopifyProduct.images?.[0]?.src,
          updatedAt: new Date()
        },
        create: {
          shopifyId: shopifyProduct.id,
          storeId: storeId,
          title: shopifyProduct.title,
          price: parseFloat(variant.price) || 0,
          cost: cost,
          sku: variant.sku,
          image: shopifyProduct.images?.[0]?.src,
          costOfGoodsSold: 0,
          handlingFees: 0,
          miscFees: 0,
          costSource: 'SHOPIFY'
        }
      })
    } catch (error) {
      console.error('Error caching product:', shopifyProduct.id, error)
    }
  }
  
  console.log('Finished caching products in database')
} 