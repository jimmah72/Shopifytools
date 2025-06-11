import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getProducts } from '@/lib/shopify-api'
import { formatShopDomain } from '@/lib/shopify.config'

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
      select: { domain: true, accessToken: true }
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
    const limit = parseInt(searchParams.get('limit') || '50')
    console.log('Products API - Fetching products with limit:', limit)
    
    // Fetch products from Shopify
    console.log('Products API - Fetching products from Shopify')
    const products = await getProducts(formattedDomain, store.accessToken, { limit })
    console.log('Products API - Successfully fetched products')

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