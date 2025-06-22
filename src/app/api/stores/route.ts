import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    console.log('Stores API - GET request received');
    
    // Use the same logic as the working Store API to find available stores
    console.log('Stores API - Finding stores using the same logic as Store API');
    
    // Fetch all stores and then apply the same filtering logic as the Store API
    const allStores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        domain: true,
        accessToken: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: true,
            orders: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    console.log(`Stores API - Fetched ${allStores.length} total stores from database`);
    
    // Apply the same filtering logic as the Store API
    // First priority: active stores with real access tokens (not 'pending-setup')
    let stores = allStores.filter(store => 
      store.accessToken && store.accessToken !== 'pending-setup'
    );
    
    console.log(`Stores API - Found ${stores.length} stores with real access tokens`);
    
    // If none found, fall back to any stores (same as Store API fallback logic)
    if (stores.length === 0) {
      console.log('Stores API - No stores with real tokens, using all available stores');
      stores = allStores;
    }
    
    console.log(`Stores API - Final result: ${stores.length} available stores`);
    stores.forEach(store => {
      console.log(`Stores API - Store: ${store.name} (${store.domain}) - Products: ${store._count.products}, Token: ${store.accessToken ? (store.accessToken.substring(0, 10) + '...') : 'none'}`);
    });
    
    return NextResponse.json({
      success: true,
      stores
    });
    
  } catch (error) {
    console.error('Stores API - Error fetching stores:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
} 