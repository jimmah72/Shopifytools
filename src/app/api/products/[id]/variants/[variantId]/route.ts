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

    console.log('=== VARIANT PATCH DEBUG ===')
    console.log('productId:', productId)
    console.log('variantId:', variantId)
    console.log('data:', data)

    const store = await prisma.store.findFirst()
    if (!store) {
      console.log('ERROR: No store found')
      return NextResponse.json(
        { error: 'No store found' },
        { status: 404 }
      )
    }

    console.log('Store found:', store.id)

    // First find the product and its variant
    console.log('Looking for product with shopifyId:', productId, 'and storeId:', store.id)
    
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

    console.log('Product found:', product ? 'YES' : 'NO')
    if (product) {
      console.log('Product ID:', product.id)
      console.log('Product shopifyId:', product.shopifyId)
      console.log('Product variants count:', product.variants.length)
      console.log('Variants:', product.variants.map(v => ({ id: v.id, sku: v.sku })))
    }

    // Also check if there are ANY variants for this product
    const allVariants = await prisma.productVariant.findMany({
      where: {
        product: {
          shopifyId: productId,
          storeId: store.id
        }
      },
      select: {
        id: true,
        sku: true,
        productId: true
      }
    })
    
    console.log('All variants for this product:', allVariants)

    if (!product) {
      console.log('ERROR: Product not found')
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // If variant doesn't exist in database, create it
    let variant = product.variants[0]
    if (!variant) {
      console.log('Variant not found in database, creating new variant record')
      
      // Fetch variant details from Shopify to get basic info
      try {
        const shopifyVariant = await getVariant(store.domain, store.accessToken, variantId)
        console.log('Shopify variant data:', {
          id: shopifyVariant.id,
          sku: shopifyVariant.sku,
          price: shopifyVariant.price,
          title: shopifyVariant.title
        })
        
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
        
        console.log('Created new variant:', variant.id)
      } catch (error) {
        console.error('Error creating variant:', error)
        return NextResponse.json(
          { error: 'Failed to create variant' },
          { status: 500 }
        )
      }
    }

    // If we just created the variant, return it (it already has the cost)
    if (product.variants.length === 0) {
      console.log('Returning newly created variant')
      return NextResponse.json(variant)
    }

    // Otherwise, update the existing variant
    console.log('Updating existing variant')
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

    console.log('Updated variant:', updatedVariant.id)
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