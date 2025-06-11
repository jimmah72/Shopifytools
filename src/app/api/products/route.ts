import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getProducts } from '@/lib/shopify-api'

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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    console.log('Products API - Fetching products with limit:', limit)
    
    // Check environment variables
    console.log('Products API - Checking environment variables')
    if (!process.env.SHOPIFY_APP_API_KEY || !process.env.SHOPIFY_APP_SECRET) {
      console.error('Products API - Missing required environment variables')
      return NextResponse.json(
        { error: 'Server configuration error. Please check environment variables.' },
        { status: 500 }
      )
    }

    // Fetch products from Shopify
    console.log('Products API - Fetching products from Shopify')
    const products = await getProducts(store.domain, store.accessToken, { limit })
    console.log('Products API - Successfully fetched products')

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Products API - Error:', error)
    
    // Check if it's an environment variable error
    if (error instanceof Error && error.message.includes('Missing required environment variable')) {
      return NextResponse.json(
        { error: 'Server configuration error. Please check environment variables.' },
        { status: 500 }
      )
    }

    // Check if it's a Shopify API error
    if (error instanceof Error && error.message.includes('Shopify API Error')) {
      return NextResponse.json(
        { error: 'Failed to fetch products from Shopify. Please check your store connection.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
} 