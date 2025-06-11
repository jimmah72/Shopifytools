import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Stack, Grid, Chip } from '@mui/material';
import Image from 'next/image';

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
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h5" component="h2">
          {product.title}
        </Typography>
        {product.vendor && (
          <Typography variant="subtitle1" color="text.secondary">
            by {product.vendor}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
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

              <Box>
                <Typography variant="h6" gutterBottom>Variants</Typography>
                <Stack spacing={2}>
                  {product.variants.map((variant) => (
                    <Box
                      key={variant.id}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle1">{variant.title}</Typography>
                          {variant.sku && (
                            <Typography variant="body2" color="text.secondary">
                              SKU: {variant.sku}
                            </Typography>
                          )}
                        </Box>
                        <Stack alignItems="flex-end">
                          <Typography variant="h6" color="primary">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: variant.price_currency || 'USD',
                            }).format(parseFloat(variant.price || '0'))}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color={variant.inventory_quantity > 0 ? 'success.main' : 'error.main'}
                          >
                            {variant.inventory_quantity > 0 
                              ? `${variant.inventory_quantity} in stock`
                              : 'Out of stock'
                            }
                          </Typography>
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Box>

              {/* Product Metadata */}
              {(product.product_type || product.tags?.length > 0) && (
                <Box>
                  <Typography variant="h6" gutterBottom>Details</Typography>
                  {product.product_type && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Type: {product.product_type}
                    </Typography>
                  )}
                  {product.tags && product.tags.length > 0 && (
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
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
} 