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
        shopifyId: productId,
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
      console.error('Variant PATCH: No store found')
      return NextResponse.json(
        { error: 'No store found' },
        { status: 404 }
      )
    }

    // First find the product and its variant
    
    const product = await prisma.product.findFirst({
      where: {
        shopifyId: productId,
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

    if (!product) {
      console.error(`Variant PATCH: Product not found - shopifyId: ${productId}`)
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // If variant doesn't exist in database, create it
    let variant = product.variants[0]
    if (!variant) {
      // Fetch variant details from Shopify to get basic info
      try {
        const shopifyVariant = await getVariant(store.domain, store.accessToken, variantId)
        
        // Create the variant in database
        variant = await prisma.productVariant.create({
          data: {
            id: variantId, // Use Shopify variant ID as database ID
            productId: product.id,
            title: shopifyVariant.title || 'Variant',
            sku: shopifyVariant.sku || '',
            price: parseFloat(shopifyVariant.price) || 0,
            cost: data.cost,
            costSource: 'MANUAL',
            costLastUpdated: new Date()
          }
        })
        
        console.log(`Variant PATCH: Created new variant ${variant.id} for product ${productId}`)
      } catch (error) {
        console.error('Variant PATCH: Error creating variant:', error)
        return NextResponse.json(
          { error: 'Failed to create variant' },
          { status: 500 }
        )
      }
    }

    // If we just created the variant, return it (it already has the cost)
    if (product.variants.length === 0) {
      return NextResponse.json(variant)
    }

    // Otherwise, update the existing variant
    const cost = data.cost
    const source = 'MANUAL' // Always save manual edits as MANUAL source

    // Update the variant directly
    const updatedVariant = await prisma.productVariant.update({
      where: {
        id: variantId
      },
      data: {
        cost,
        costSource: source,
        costLastUpdated: new Date()
      }
    })

    return NextResponse.json(updatedVariant)
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