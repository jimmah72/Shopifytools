'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function updateVariantCost(variantId: string, newCost: number, source: 'MANUAL' | 'SHOPIFY' = 'SHOPIFY') {
  try {
    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        cost: newCost,
        costSource: source,
        costLastUpdated: new Date()
      }
    })

    // Revalidate the product page
    revalidatePath(`/products/${variant.productId}`)
    return variant
  } catch (error) {
    console.error('Error updating variant cost:', error)
    throw new Error('Failed to update variant cost')
  }
}

export async function bulkUpdateVariantCosts(updates: { variantId: string; cost: number; source: 'MANUAL' }[]) {
  try {
    const results = await Promise.all(
      updates.map(({ variantId, cost, source }) =>
        prisma.productVariant.update({
          where: { id: variantId },
          data: {
            cost,
            costSource: source,
            costLastUpdated: new Date()
          }
        })
      )
    )

    // Revalidate the product page (using the first variant's product ID)
    if (results.length > 0) {
      revalidatePath(`/products/${results[0].productId}`)
    }
    
    return results
  } catch (error) {
    console.error('Error bulk updating variant costs:', error)
    throw new Error('Failed to bulk update variant costs')
  }
} 