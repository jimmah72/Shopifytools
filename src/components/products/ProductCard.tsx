import { Card, CardMedia, CardContent, Typography, Stack, Box } from '@mui/material';

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    description: string | null;
    images: Array<{ src: string; alt?: string }>;
    variants: Array<{
      price: string;
      price_currency?: string;
      inventory_quantity: number;
    }>;
  };
  onClick?: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[4],
        }
      }}
      onClick={onClick}
    >
      <Box sx={{ position: 'relative', pt: '75%', width: '100%' }}>
        {product.images?.[0] ? (
          <CardMedia
            component="img"
            image={product.images[0].src}
            alt={product.images[0].alt || product.title}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
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

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom component="h2" noWrap>
          {product.title}
        </Typography>
        
        <Typography 
          color="text.secondary" 
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 2,
            height: '3em',
          }}
        >
          {product.description || 'No description available'}
        </Typography>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" color="primary">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: product.variants[0]?.price_currency || 'USD',
            }).format(parseFloat(product.variants[0]?.price || '0'))}
          </Typography>
          
          <Typography 
            variant="body2" 
            color={product.variants[0]?.inventory_quantity > 0 ? 'success.main' : 'error.main'}
          >
            {product.variants[0]?.inventory_quantity > 0 
              ? `${product.variants[0].inventory_quantity} in stock`
              : 'Out of stock'
            }
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
} 