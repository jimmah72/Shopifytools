import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getVariant } from '@/lib/shopify-api'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

interface RouteParams {
  id: string
  variantId: string
}

interface VariantCostUpdate {
  cost: number
  source: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id: productId, variantId } = params

    // Get the first store (for now, later we'll handle multi-store)
    const store = await prisma.store.findFirst()
    if (!store) {
      return NextResponse.json(
        { error: 'No store found' },
        { status: 404 }
      )
    }

    const variant = await prisma.product.findFirst({
      where: {
        id: productId,
        storeId: store.id,
        variants: {
          some: {
            id: variantId
          }
        }
      },
      select: {
        variants: {
          where: {
            id: variantId
          },
          select: {
            id: true,
            title: true,
            sku: true,
            price: true,
            cost: true,
            costSource: true,
            costLastUpdated: true,
            inventoryQty: true
          }
        }
      }
    })

    if (!variant || !variant.variants[0]) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(variant.variants[0])
  } catch (error) {
    console.error('Error fetching variant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id: productId, variantId } = params
    const data: VariantCostUpdate = await request.json()

    const store = await prisma.store.findFirst()
    if (!store) {
      return NextResponse.json(
        { error: 'No store found' },
        { status: 404 }
      )
    }

    // First find the product and its variant
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        storeId: store.id
      },
      include: {
        variants: {
          where: {
            id: variantId
          }
        }
      }
    })

    if (!product || !product.variants[0]) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      )
    }

    // Always try to get Shopify cost first
    let cost = data.cost
    let source = data.source
    
    try {
      const shopifyVariant = await getVariant(store.domain, store.accessToken, variantId)
      const shopifyCost = parseFloat(shopifyVariant.cost_per_item)
      
      // If we have a valid Shopify cost, use it
      if (!isNaN(shopifyCost) && shopifyCost > 0) {
        cost = shopifyCost
        source = 'SHOPIFY'
      } else if (source !== 'MANUAL') {
        // If no valid Shopify cost and not explicitly manual, default to manual with provided cost
        source = 'MANUAL'
      }
    } catch (error) {
      console.error('Error fetching Shopify variant cost:', error)
      // If Shopify fetch fails and source wasn't explicitly set to MANUAL,
      // fall back to manual with provided cost
      if (source !== 'MANUAL') {
        source = 'MANUAL'
      }
    }

    // Update the product's variant
    const updatedProduct = await prisma.product.update({
      where: {
        id: productId
      },
      data: {
        variants: {
          update: {
            where: {
              id: variantId
            },
            data: {
              cost,
              costSource: source,
              costLastUpdated: new Date()
            }
          }
        }
      },
      include: {
        variants: {
          where: {
            id: variantId
          }
        }
      }
    })

    if (!updatedProduct.variants[0]) {
      return NextResponse.json(
        { error: 'Failed to update variant' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedProduct.variants[0])
  } catch (error) {
    console.error('Error updating variant cost:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Variant not found' },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 