import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

interface RouteParams {
  shopifyProductId: string
  shopifyVariantId: string
}

interface VariantCostUpdate {
  cost?: number
  handling?: number
  misc?: number
  source?: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { shopifyProductId, shopifyVariantId } = params
    const data: VariantCostUpdate = await request.json()

    console.log(`Variant Cost Update - Product: ${shopifyProductId}, Variant: ${shopifyVariantId}`, data)

    const store = await prisma.store.findFirst()
    if (!store) {
      return NextResponse.json(
        { error: 'No store found' },
        { status: 404 }
      )
    }

    // Find the product by Shopify ID
    const product = await prisma.product.findFirst({
      where: {
        shopifyId: shopifyProductId,
        storeId: store.id
      },
      include: {
        variants: true
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Find the variant by Shopify ID (stored in the id field for variants)
    const variant = product.variants.find(v => v.id === shopifyVariantId)
    
    if (!variant) {
      // If variant doesn't exist in database, create it
      console.log(`Creating new variant ${shopifyVariantId} for product ${shopifyProductId}`)
      
      const newVariant = await prisma.productVariant.create({
        data: {
          id: shopifyVariantId,
          productId: product.id,
          title: `Variant ${shopifyVariantId}`,
          sku: '',
          price: 0,
          cost: data.cost || 0,
          costSource: 'MANUAL',
          costLastUpdated: new Date()
        }
      })
      
      console.log(`Created variant:`, newVariant)
      return NextResponse.json(newVariant)
    }

    // Update the existing variant
    const updateData: any = {
      costLastUpdated: new Date(),
      costSource: 'MANUAL' // Always save manual edits as MANUAL
    }

    if (data.cost !== undefined) {
      updateData.cost = data.cost
    }

    const updatedVariant = await prisma.productVariant.update({
      where: {
        id: variant.id
      },
      data: updateData
    })

    console.log(`Updated variant:`, updatedVariant)
    return NextResponse.json(updatedVariant)

  } catch (error) {
    console.error('Error updating variant cost:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 