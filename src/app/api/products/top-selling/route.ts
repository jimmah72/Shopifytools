import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface TopSellingProduct {
  productId: string;
  title: string;
  image?: string;
  totalQuantitySold: number;
  totalRevenue: number;
  averagePrice: number;
  orderCount: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30d';
    const limit = parseInt(searchParams.get('limit') || '15');
    
    console.log(`Top Selling Products API - GET request for timeframe: ${timeframe}, limit: ${limit}`);

    // Get store (assuming single store for now)
    const store = await prisma.store.findFirst();
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Calculate date range
    const now = new Date();
    let daysAgo: number;
    
    switch (timeframe) {
      case '7d':
        daysAgo = 7;
        break;
      case '30d':
        daysAgo = 30;
        break;
      case '90d':
        daysAgo = 90;
        break;
      case '1y':
        daysAgo = 365;
        break;
      default:
        daysAgo = 30;
    }
    
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    
    console.log(`Top Selling Products API - Querying from ${startDate.toISOString()} to ${now.toISOString()}`);

    // Query line items with aggregations, joined with orders and products
    const topProducts = await prisma.shopifyLineItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          storeId: store.id,
          createdAt: {
            gte: startDate,
            lte: now
          }
        },
        productId: {
          not: null
        }
      },
      _sum: {
        quantity: true,
        price: true
      },
      _count: {
        orderId: true
      },
      _avg: {
        price: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: limit
    });

    console.log(`Top Selling Products API - Found ${topProducts.length} products with sales data`);

    // Get product details for the top products
    const productIds = topProducts.map(p => p.productId).filter(Boolean) as string[];
    
    const productDetails = await prisma.shopifyProduct.findMany({
      where: {
        id: {
          in: productIds
        }
      },
      select: {
        id: true,
        title: true,
        images: true,
        handle: true,
        status: true
      }
    });

    // Create a map for quick lookup
    const productMap = new Map(productDetails.map(p => [p.id, p]));

    // Combine the data
    const result: TopSellingProduct[] = topProducts.map(item => {
      const product = productMap.get(item.productId || '');
      const images = product?.images as any;
      const firstImage = Array.isArray(images) && images.length > 0 ? images[0]?.src : null;
      
      return {
        productId: item.productId || '',
        title: product?.title || 'Unknown Product',
        image: firstImage,
        totalQuantitySold: item._sum.quantity || 0,
        totalRevenue: item._sum.price || 0,
        averagePrice: item._avg.price || 0,
        orderCount: item._count.orderId || 0
      };
    }).filter(item => item.productId && item.totalQuantitySold > 0);

    console.log(`Top Selling Products API - Returning ${result.length} products`);

    return NextResponse.json({
      success: true,
      timeframe,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      totalProducts: result.length,
      products: result
    });

  } catch (error) {
    console.error('Top Selling Products API - Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch top selling products',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 