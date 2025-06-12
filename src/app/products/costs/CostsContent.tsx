'use client';

import { useEffect, useState } from 'react';
import { CostOfGoodsTable } from '@/components/products/CostOfGoodsTable';

interface ShopifyProduct {
  id: string;
  title: string;
  images?: Array<{ src: string; alt?: string }>;
  variants: Array<{
    price: string;
    cost?: number;
    cost_per_item?: string;
  }>;
}

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

interface ApiResponse {
  products?: ShopifyProduct[];
  error?: string;
  details?: string;
}

export default function CostsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products');
        const data: ApiResponse = await response.json();
        
        // Debug logs
        console.log('API Response:', data);
        
        // Check for API errors
        if (data.error) {
          throw new Error(data.details || data.error);
        }

        // Ensure we have products to work with
        if (!data.products || !Array.isArray(data.products)) {
          throw new Error('Invalid products data received from API');
        }

        // Transform the Shopify products data to our format
        const transformedProducts: Product[] = data.products.map((product): Product => {
          const mainVariant = product.variants[0] || {};
          const price = parseFloat(mainVariant.price || '0');
          const cost = mainVariant.cost || parseFloat(mainVariant.cost_per_item || '0');
          const margin = price > 0 ? ((price - cost) / price) * 100 : 0;

          return {
            id: product.id,
            title: product.title,
            image: product.images?.[0]?.src,
            status: 'Active' as const,
            lastEdited: new Date().toLocaleDateString(),
            sellingPrice: price,
            costOfGoodsSold: cost,
            handlingFees: 0,
            margin: margin
          };
        });

        console.log('Transformed products:', transformedProducts);
        setProducts(transformedProducts);
      } catch (error: unknown) {
        console.error('Error fetching products:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          setError(error.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const handleCostUpdate = async (productId: string, newCost: number) => {
    try {
      const response = await fetch(`/api/products/${productId}/variants/cost`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cost: newCost }),
      });

      if (!response.ok) {
        throw new Error('Failed to update cost');
      }

      // Update local state
      setProducts(products.map(product => {
        if (product.id === productId) {
          const margin = product.sellingPrice > 0 
            ? ((product.sellingPrice - newCost) / product.sellingPrice) * 100 
            : 0;
          return { 
            ...product, 
            costOfGoodsSold: newCost,
            margin: margin
          };
        }
        return product;
      }));
    } catch (error) {
      console.error('Failed to update cost:', error);
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  };

  const handleHandlingFeesUpdate = async (productId: string, newFees: number) => {
    try {
      const response = await fetch(`/api/products/${productId}/handling-fees`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fees: newFees }),
      });

      if (!response.ok) {
        throw new Error('Failed to update handling fees');
      }

      // Update local state
      setProducts(products.map(product => {
        if (product.id === productId) {
          const margin = product.sellingPrice > 0 
            ? ((product.sellingPrice - product.costOfGoodsSold - newFees) / product.sellingPrice) * 100 
            : 0;
          return { 
            ...product, 
            handlingFees: newFees,
            margin: margin
          };
        }
        return product;
      }));
    } catch (error) {
      console.error('Failed to update handling fees:', error);
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading products...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <CostOfGoodsTable
      products={products}
      onCostUpdate={handleCostUpdate}
      onHandlingFeesUpdate={handleHandlingFeesUpdate}
    />
  );
} 