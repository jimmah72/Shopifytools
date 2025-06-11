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
  try {
    // Get the first store from the database
    const store = await prisma.store.findFirst({
      select: { domain: true, accessToken: true }
    })

    if (!store) {
      return NextResponse.json(
        { error: 'No store connected. Please connect a Shopify store first.' },
        { status: 404 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Fetch products from Shopify
    const products = await getProducts(store.domain, store.accessToken, { limit })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
} 