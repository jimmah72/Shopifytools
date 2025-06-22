import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const store = await prisma.store.findFirst();
    if (!store) {
      return NextResponse.json({ error: 'No store found' }, { status: 404 });
    }

    // ✅ FIXED: Check orders sync status since that's what actually updates product costs
    const dbSyncStatus = await (prisma as any).syncStatus.findUnique({
      where: {
        storeId_dataType: {
          storeId: store.id,
          dataType: 'orders'
        }
      }
    });

    // Count current products with cost data
    const [totalProducts, productsWithCostData] = await Promise.all([
      (prisma as any).shopifyProduct.count({
        where: { storeId: store.id }
      }),
      (prisma as any).shopifyProduct.count({
        where: {
          storeId: store.id,
          variants: {
            some: {
              costPerItem: { gt: 0 }
            }
          }
        }
      })
    ]);

    // Calculate next auto sync time (6am CST = 12pm UTC)
    const now = new Date();
    const nextSync = new Date();
    nextSync.setUTCHours(12, 0, 0, 0); // 6am CST = 12pm UTC
    if (nextSync <= now) {
      nextSync.setDate(nextSync.getDate() + 1);
    }

        const status = {
      syncInProgress: dbSyncStatus?.syncInProgress || false,
      syncType: dbSyncStatus?.syncInProgress ? 'orders_sync_updating_costs' : null,
      totalProducts,
      processedProducts: totalProducts,
      currentProduct: dbSyncStatus?.syncInProgress ? 'Updating product costs from orders sync...' : '',
      lastSyncAt: dbSyncStatus?.lastSyncAt?.toISOString() || null,
      nextAutoSync: nextSync.toISOString(),
      errorMessage: dbSyncStatus?.errorMessage || null,
      costDataUpdated: 0,
      productsWithCostData
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error('Products Sync Status API - Error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
} 