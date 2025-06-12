'use client';

import { Suspense, useEffect, useState } from 'react';
import { CostOfGoodsTable } from '@/components/products/CostOfGoodsTable';
import { Box, Typography, CircularProgress } from '@mui/material';

interface Product {
  id: string;
  title: string;
  image?: string;
  status: 'Active' | 'Draft' | 'Archived';
  lastEdited: string;
  sellingPrice: number;
  costOfGoodsSold: number;
  handlingFees: number;
  margin: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchProducts() {
    try {
      setLoading(true);
      const response = await fetch('/api/products?limit=250');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      
      // Transform Shopify products into our format
      const transformedProducts = data.products.map((product: any) => {
        const variant = product.variants[0] || {};
        const cost = variant.cost || 0;
        const price = parseFloat(variant.price) || 0;
        const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
        
        // Format the date to be more readable
        const lastEdited = new Date(variant.costLastUpdated || new Date());
        const formattedDate = lastEdited.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        
        return {
          id: product.id,
          title: product.title,
          image: product.images?.[0]?.src,
          status: 'Active' as const, // We can enhance this later
          lastEdited: formattedDate,
          sellingPrice: price,
          costOfGoodsSold: cost,
          handlingFees: 0, // This can be enhanced later
          margin: margin
        };
      });

      setProducts(transformedProducts);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCostUpdate = async (productId: string, newCost: number) => {
    try {
      // Find the variant ID from the product
      const product = products.find(p => p.id === productId);
      if (!product) return;

      // Update the product in the UI optimistically
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === productId 
            ? {
                ...p,
                costOfGoodsSold: newCost,
                margin: p.sellingPrice > 0 
                  ? ((p.sellingPrice - newCost) / p.sellingPrice) * 100 
                  : 0
              }
            : p
        )
      );

      // Update the cost in the backend
      const response = await fetch(`/api/products/${productId}/variants/${productId}/cost`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cost: newCost,
          source: 'MANUAL'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update cost');
      }
    } catch (err) {
      console.error('Error updating cost:', err);
      // Revert the optimistic update on error
      fetchProducts();
    }
  };

  const handleHandlingFeesUpdate = async (productId: string, newFees: number) => {
    // For now, just update the UI since we don't have a backend endpoint for handling fees yet
    setProducts(prevProducts => 
      prevProducts.map(p => 
        p.id === productId 
          ? {
              ...p,
              handlingFees: newFees,
              margin: p.sellingPrice > 0 
                ? ((p.sellingPrice - p.costOfGoodsSold - newFees) / p.sellingPrice) * 100 
                : 0
            }
          : p
      )
    );
  };

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>Cost Of Goods</Typography>
        <Typography color="text.secondary">
          Set up and manage your Cost of Goods Sold (COGS) to ensure precise Net Profit calculations.{' '}
          <a href="#" className="text-blue-500 hover:underline">See how to set up COGS</a>
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <CostOfGoodsTable 
          products={products}
          onCostUpdate={handleCostUpdate}
          onHandlingFeesUpdate={handleHandlingFeesUpdate}
        />
      )}
    </Box>
  );
} 