import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProductsSyncStatus } from '@/lib/products-sync-status';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const store = await prisma.store.findFirst();
    if (!store) {
      return NextResponse.json({ error: 'No store found' }, { status: 404 });
    }

    // Get the shared products sync status
    const sharedSyncStatus = getProductsSyncStatus();
    
    // Also check database sync status for fallback
    const dbSyncStatus = await (prisma as any).syncStatus.findUnique({
      where: {
        storeId_dataType: {
          storeId: store.id,
          dataType: 'products_costs'
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

    // Use the shared sync status if sync is in progress, otherwise use database/calculated values
    const status = {
      syncInProgress: sharedSyncStatus.syncInProgress,
      syncType: sharedSyncStatus.syncType,
      totalProducts: sharedSyncStatus.syncInProgress ? sharedSyncStatus.totalProducts : totalProducts,
      processedProducts: sharedSyncStatus.processedProducts,
      currentProduct: sharedSyncStatus.currentProduct,
      lastSyncAt: sharedSyncStatus.lastSyncAt || dbSyncStatus?.lastSyncAt?.toISOString() || null,
      nextAutoSync: nextSync.toISOString(),
      errorMessage: sharedSyncStatus.errorMessage || dbSyncStatus?.errorMessage || null,
      costDataUpdated: sharedSyncStatus.costDataUpdated,
      productsWithCostData: sharedSyncStatus.syncInProgress ? sharedSyncStatus.productsWithCostData : productsWithCostData
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