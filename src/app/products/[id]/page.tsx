import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { VariantCosts } from '@/components/products/VariantCosts'
import { updateVariantCost, bulkUpdateVariantCosts } from '@/app/actions/variants'

interface ProductPageProps {
  params: {
    id: string
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      variants: true
    }
  })

  if (!product) {
    notFound()
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{product.title}</h1>
        {product.description && (
          <p className="text-muted-foreground">{product.description}</p>
        )}
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Variant Costs</h2>
          <VariantCosts
            variants={product.variants.map(variant => ({
              id: variant.id,
              title: variant.title,
              sku: variant.sku,
              price: variant.price,
              cost: variant.cost,
              inventoryQty: variant.inventoryQty,
              costSource: (variant.costSource || 'SHOPIFY') as 'MANUAL' | 'SHOPIFY',
              costLastUpdated: variant.costLastUpdated?.toISOString() || null
            }))}
            onCostUpdate={updateVariantCost}
            onBulkUpdate={bulkUpdateVariantCosts}
          />
        </div>
      </div>
    </div>
  )
} 