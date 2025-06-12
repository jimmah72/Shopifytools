'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { CostOfGoodsTable } from '@/components/products/CostOfGoodsTable';
import { Box, Typography, CircularProgress, Pagination, TextField, InputAdornment, Skeleton } from '@mui/material';
import { Search } from '@mui/icons-material';
import { useDebounce } from '@/hooks/useDebounce';

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

interface ProductsResponse {
  products: any[];
  total: number;
  page: number;
  totalPages: number;
}

// Skeleton loader component
const ProductsTableSkeleton = () => (
  <Box sx={{ mt: 4 }}>
    {[...Array(10)].map((_, index) => (
      <Box key={index} sx={{ display: 'flex', alignItems: 'center', py: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Skeleton variant="rectangular" width={40} height={40} sx={{ mr: 2 }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="40%" height={16} />
        </Box>
        <Skeleton variant="text" width={80} height={20} sx={{ mx: 2 }} />
        <Skeleton variant="text" width={80} height={20} sx={{ mx: 2 }} />
        <Skeleton variant="text" width={80} height={20} sx={{ mx: 2 }} />
      </Box>
    ))}
  </Box>
);

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const PRODUCTS_PER_PAGE = 20;

  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // The API now returns products in the correct format, so just ensure proper typing
  const transformProduct = useCallback((product: any): Product => {
    return {
      id: product.id.toString(),
      title: product.title,
      image: product.image,
      status: product.status || 'Active',
      lastEdited: product.lastEdited,
      sellingPrice: product.sellingPrice,
      costOfGoodsSold: product.costOfGoodsSold,
      handlingFees: product.handlingFees,
      miscFees: product.miscFees,
      margin: product.margin,
      costSource: product.costSource,
      shopifyCostOfGoodsSold: product.shopifyCostOfGoodsSold || 0,
      shopifyHandlingFees: product.shopifyHandlingFees || 0
    };
  }, []);

  const fetchProducts = useCallback(async (page: number = 1, search: string = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: PRODUCTS_PER_PAGE.toString(),
        fetchCosts: 'true', // Always fetch cost data for current page
        ...(search && { search })
      });
      
      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const data: ProductsResponse = await response.json();
      
      // Transform products
      const transformedProducts = data.products.map(transformProduct);
      
      setProducts(transformedProducts);
      setTotalPages(data.totalPages || Math.ceil(data.products.length / PRODUCTS_PER_PAGE));
      setTotalProducts(data.total || data.products.length);
      
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [transformProduct, PRODUCTS_PER_PAGE]);

  // Effect for initial load and search
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when search changes
    fetchProducts(1, debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchProducts]);

  // Effect for page changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchProducts(currentPage, debouncedSearchTerm);
    }
  }, [currentPage, fetchProducts, debouncedSearchTerm]);

  const recalculateMargin = useCallback((product: Product) => {
    const currentCost = product.costSource === 'SHOPIFY' 
      ? (product.shopifyCostOfGoodsSold || 0) 
      : product.costOfGoodsSold;
    const currentHandling = product.costSource === 'SHOPIFY' 
      ? (product.shopifyHandlingFees || 0) 
      : product.handlingFees;
    const totalCost = currentCost + currentHandling + product.miscFees;
    return product.sellingPrice > 0 ? ((product.sellingPrice - totalCost) / product.sellingPrice) * 100 : 0;
  }, []);

  // Optimized handlers with useCallback to prevent unnecessary re-renders
  const handleCostUpdate = useCallback((productId: string, newCost: number) => {
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
  }, [recalculateMargin]);

  const handleHandlingFeesUpdate = useCallback((productId: string, newFees: number) => {
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
  }, [recalculateMargin]);

  const handleMiscFeesUpdate = useCallback((productId: string, newFees: number) => {
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
  }, [recalculateMargin]);

  const handleSave = useCallback(async (productId: string, costs: { 
    costOfGoodsSold: number; 
    handlingFees: number; 
    miscFees: number; 
    costSource: string 
  }) => {
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
      throw err;
    }
  }, []);

  const handleCostSourceToggle = useCallback(async (productId: string, newSource: 'SHOPIFY' | 'MANUAL') => {
    // Update local state immediately for responsive UI
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

    // Save the cost source change to the database
    try {
      const product = products.find(p => p.id === productId);
      if (product) {
        await handleSave(productId, {
          costOfGoodsSold: product.costOfGoodsSold,
          handlingFees: product.handlingFees,
          miscFees: product.miscFees,
          costSource: newSource
        });
      }
    } catch (error) {
      console.error('Failed to save cost source change:', error);
      // Revert the local state change if save failed
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === productId 
            ? {
                ...p,
                costSource: newSource === 'SHOPIFY' ? 'MANUAL' : 'SHOPIFY',
                margin: recalculateMargin({ ...p, costSource: newSource === 'SHOPIFY' ? 'MANUAL' : 'SHOPIFY' })
              }
            : p
        )
      );
    }
  }, [recalculateMargin, products, handleSave]);

  const handlePageChange = useCallback((_: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error" variant="h6">Error loading products</Typography>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Cost Of Goods
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Set up and manage your Cost of Goods Sold (COGS) to ensure precise Net Profit calculations.{' '}
          <a href="#" className="text-blue-500 hover:underline">
            See how to set up COGS
          </a>
        </Typography>

        {/* Search and Stats */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <TextField
            placeholder="Search products..."
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          
          <Typography variant="body2" color="text.secondary">
            {loading ? 'Loading...' : `Showing ${products.length} of ${totalProducts} products`}
          </Typography>
        </Box>
      </Box>

      {/* Products Table */}
      <Suspense fallback={<ProductsTableSkeleton />}>
        {loading ? (
          <ProductsTableSkeleton />
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
      </Suspense>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
} 