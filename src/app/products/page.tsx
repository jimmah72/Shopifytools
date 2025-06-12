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
  miscFees: number;
  margin: number;
  costSource: 'SHOPIFY' | 'MANUAL';
  shopifyCostOfGoodsSold?: number;
  shopifyHandlingFees?: number;
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
        const shopifyCost = variant.cost || 0;
        const price = parseFloat(variant.price) || 0;
        
        // Get database values if they exist, otherwise use Shopify values
        const dbCostOfGoodsSold = product.dbCostOfGoodsSold || 0;
        const dbHandlingFees = product.dbHandlingFees || 0;
        const dbMiscFees = product.dbMiscFees || 0;
        const costSource = product.dbCostSource || 'MANUAL'; // Default to MANUAL if no Shopify cost available
        
        // Calculate margin based on current source
        const currentCost = costSource === 'SHOPIFY' ? shopifyCost : dbCostOfGoodsSold;
        const currentHandling = costSource === 'SHOPIFY' ? 0 : dbHandlingFees; // Shopify doesn't have handling fees
        const totalCost = currentCost + currentHandling + dbMiscFees; // Misc is always from our DB
        const margin = price > 0 ? ((price - totalCost) / price) * 100 : 0;
        
        // Format the date to be more readable
        const lastEdited = new Date(product.dbLastEdited || variant.costLastUpdated || new Date());
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
          costOfGoodsSold: dbCostOfGoodsSold,
          handlingFees: dbHandlingFees,
          miscFees: dbMiscFees,
          margin: margin,
          costSource: costSource as 'SHOPIFY' | 'MANUAL',
          shopifyCostOfGoodsSold: shopifyCost,
          shopifyHandlingFees: 0 // Shopify doesn't have handling fees
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

  const recalculateMargin = (product: Product) => {
    const currentCost = product.costSource === 'SHOPIFY' 
      ? (product.shopifyCostOfGoodsSold || 0) 
      : product.costOfGoodsSold;
    const currentHandling = product.costSource === 'SHOPIFY' 
      ? (product.shopifyHandlingFees || 0) 
      : product.handlingFees;
    const totalCost = currentCost + currentHandling + product.miscFees;
    return product.sellingPrice > 0 ? ((product.sellingPrice - totalCost) / product.sellingPrice) * 100 : 0;
  };

  // Local state updates (don't persist until save)
  const handleCostUpdate = (productId: string, newCost: number) => {
    setProducts(prevProducts => 
      prevProducts.map(p => 
        p.id === productId 
          ? {
              ...p,
              costOfGoodsSold: newCost,
              margin: recalculateMargin({ ...p, costOfGoodsSold: newCost })
            }
          : p
      )
    );
  };

  const handleHandlingFeesUpdate = (productId: string, newFees: number) => {
    setProducts(prevProducts => 
      prevProducts.map(p => 
        p.id === productId 
          ? {
              ...p,
              handlingFees: newFees,
              margin: recalculateMargin({ ...p, handlingFees: newFees })
            }
          : p
      )
    );
  };

  const handleMiscFeesUpdate = (productId: string, newFees: number) => {
    setProducts(prevProducts => 
      prevProducts.map(p => 
        p.id === productId 
          ? {
              ...p,
              miscFees: newFees,
              margin: recalculateMargin({ ...p, miscFees: newFees })
            }
          : p
      )
    );
  };

  const handleCostSourceToggle = (productId: string, newSource: 'SHOPIFY' | 'MANUAL') => {
    setProducts(prevProducts => 
      prevProducts.map(p => 
        p.id === productId 
          ? {
              ...p,
              costSource: newSource,
              margin: recalculateMargin({ ...p, costSource: newSource })
            }
          : p
      )
    );
  };

  // Save to our database only
  const handleSave = async (productId: string, costs: { costOfGoodsSold: number; handlingFees: number; miscFees: number; costSource: string }) => {
    try {
      const response = await fetch(`/api/products/${productId}/costs`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(costs),
      });

      if (!response.ok) {
        throw new Error('Failed to save costs');
      }

      // Update the lastEdited date for this product
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === productId 
            ? {
                ...p,
                lastEdited: new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })
              }
            : p
        )
      );
    } catch (err) {
      console.error('Error saving costs:', err);
      setError(err instanceof Error ? err.message : 'Failed to save costs');
      throw err; // Re-throw so the component can handle the error
    }
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
          onMiscFeesUpdate={handleMiscFeesUpdate}
          onCostSourceToggle={handleCostSourceToggle}
          onSave={handleSave}
        />
      )}
    </Box>
  );
} 