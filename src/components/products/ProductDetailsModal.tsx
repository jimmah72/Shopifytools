import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Stack, Grid, Chip } from '@mui/material';
import Image from 'next/image';
import { VariantCosts } from '@/components/products/VariantCosts';

interface ProductDetailsModalProps {
  product: {
    id: string;
    title: string;
    description: string | null;
    images: Array<{ src: string; alt?: string }>;
    variants: Array<{
      id: string;
      title: string;
      price: string;
      price_currency?: string;
      inventory_quantity: number;
      sku?: string;
      cost: number;
      costSource: 'MANUAL' | 'SHOPIFY';
      costLastUpdated: string | null;
    }>;
    vendor?: string;
    product_type?: string;
    tags?: string[];
  } | null;
  open: boolean;
  onClose: () => void;
}

export default function ProductDetailsModal({ product, open, onClose }: ProductDetailsModalProps) {
  if (!product) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h5" component="div">
          {product.title}
        </Typography>
        {product.vendor && (
          <Typography variant="subtitle1" color="text.secondary">
            by {product.vendor}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={4}>
          <Grid container spacing={3}>
            {/* Product Images */}
            <Grid item xs={12} md={6}>
              <Box sx={{ position: 'relative', width: '100%', height: 400 }}>
                {product.images?.[0] ? (
                  <Image
                    src={product.images[0].src}
                    alt={product.images[0].alt || product.title}
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      bgcolor: 'grey.100',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography color="text.secondary">No image</Typography>
                  </Box>
                )}
              </Box>

              {/* Thumbnail Gallery */}
              {product.images?.length > 1 && (
                <Stack direction="row" spacing={1} sx={{ mt: 2, overflowX: 'auto', pb: 1 }}>
                  {product.images.map((image, index) => (
                    <Box
                      key={index}
                      sx={{
                        position: 'relative',
                        width: 60,
                        height: 60,
                        flexShrink: 0,
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: index === 0 ? 'primary.main' : 'transparent',
                        borderRadius: 1,
                        overflow: 'hidden',
                      }}
                    >
                      <Image
                        src={image.src}
                        alt={image.alt || `Product image ${index + 1}`}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </Grid>

            {/* Product Details */}
            <Grid item xs={12} md={6}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h6" gutterBottom>Description</Typography>
                  <Typography color="text.secondary">
                    {product.description || 'No description available'}
                  </Typography>
                </Box>

                {/* Product Metadata */}
                {(product.product_type || (product.tags && product.tags.length > 0)) && (
                  <Box>
                    <Typography variant="h6" gutterBottom>Details</Typography>
                    {product.product_type && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Type: {product.product_type}
                      </Typography>
                    )}
                    {Array.isArray(product.tags) && product.tags.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Tags:
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {product.tags.map((tag) => (
                            <Chip key={tag} label={tag} size="small" />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                )}
              </Stack>
            </Grid>
          </Grid>

          {/* Variant Costs */}
          <Box>
            <Typography variant="h6" gutterBottom>Variant Costs</Typography>
            <VariantCosts
              variants={product.variants.map(variant => ({
                id: variant.id,
                title: variant.title,
                sku: variant.sku || null,
                price: parseFloat(variant.price),
                cost: variant.cost,
                inventoryQty: variant.inventory_quantity,
                costSource: variant.costSource,
                costLastUpdated: variant.costLastUpdated
              }))}
              onCostUpdate={async (variantId, newCost, source) => {
                const response = await fetch(`/api/products/${product.id}/variants/${variantId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ cost: newCost, source })
                });
                if (!response.ok) {
                  throw new Error('Failed to update variant cost');
                }
              }}
              onBulkUpdate={async (updates) => {
                await Promise.all(
                  updates.map(({ variantId, cost, source }) =>
                    fetch(`/api/products/${product.id}/variants/${variantId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ cost, source })
                    })
                  )
                );
              }}
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
} 