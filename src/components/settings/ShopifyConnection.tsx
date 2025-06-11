import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Paper, Typography, TextField, Button, Box, Alert } from '@mui/material';
import { formatShopDomain, isValidShopDomain } from '@/lib/shopify';

export default function ShopifyConnection() {
  const [shopDomain, setShopDomain] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const formattedDomain = formatShopDomain(shopDomain);
      
      if (!isValidShopDomain(formattedDomain)) {
        setError('Please enter a valid Shopify store domain');
        return;
      }

      // Redirect to Shopify auth endpoint
      router.push(`/api/auth/shopify?shop=${encodeURIComponent(formattedDomain)}`);
    } catch (error) {
      console.error('Error connecting to Shopify:', error);
      setError('Failed to connect to Shopify. Please try again.');
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Connect your Shopify Store
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Connect your Shopify store to start tracking your profits and analytics.
        We'll need access to your orders, products, and inventory data.
      </Typography>
      
      <Box component="form" onSubmit={handleConnect} sx={{ display: 'flex', gap: 2 }}>
        <TextField
          id="shop"
          fullWidth
          size="small"
          value={shopDomain}
          onChange={(e) => setShopDomain(e.target.value)}
          placeholder="your-store.myshopify.com"
          label="Shopify Store Domain"
          variant="outlined"
        />
        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
          sx={{ whiteSpace: 'nowrap' }}
        >
          Connect Store
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Paper>
  );
} 