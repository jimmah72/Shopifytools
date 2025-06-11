'use client';

import { useState, useEffect } from 'react';
import { Box, Grid, Typography, Stack, Pagination, Skeleton } from '@mui/material';
import ProductCard from '@/components/products/ProductCard';
import ProductDetailsModal from '@/components/products/ProductDetailsModal';
import ProductFilters from '@/components/products/ProductFilters';

const ITEMS_PER_PAGE = 12;

export default function ProductsPage() {
  // State
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('title_asc');
  const [stockFilter, setStockFilter] = useState('all');

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/products?limit=250');
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch products');
        }

        const data = await response.json();
        setProducts(data.products);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products. Please try again later.');
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Filter and sort products
  const filteredProducts = products.filter(product => {
    // Search filter
    const searchMatch = search === '' || 
      product.title.toLowerCase().includes(search.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(search.toLowerCase()));

    // Stock filter
    let stockMatch = true;
    switch (stockFilter) {
      case 'in_stock':
        stockMatch = (product.variants[0]?.inventory_quantity || 0) > 0;
        break;
      case 'out_of_stock':
        stockMatch = (product.variants[0]?.inventory_quantity || 0) === 0;
        break;
      case 'low_stock':
        stockMatch = (product.variants[0]?.inventory_quantity || 0) > 0 && 
                    (product.variants[0]?.inventory_quantity || 0) < 10;
        break;
    }

    return searchMatch && stockMatch;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'title_asc':
        return a.title.localeCompare(b.title);
      case 'title_desc':
        return b.title.localeCompare(a.title);
      case 'price_asc':
        return parseFloat(a.variants[0]?.price || '0') - parseFloat(b.variants[0]?.price || '0');
      case 'price_desc':
        return parseFloat(b.variants[0]?.price || '0') - parseFloat(a.variants[0]?.price || '0');
      case 'inventory_asc':
        return (a.variants[0]?.inventory_quantity || 0) - (b.variants[0]?.inventory_quantity || 0);
      case 'inventory_desc':
        return (b.variants[0]?.inventory_quantity || 0) - (a.variants[0]?.inventory_quantity || 0);
      default:
        return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Loading state
  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" gutterBottom>Products</Typography>
            <Typography color="text.secondary" gutterBottom>
              Manage and track your store's inventory
            </Typography>
          </Box>

          <ProductFilters
            search={search}
            onSearchChange={setSearch}
            sortBy={sortBy}
            onSortChange={setSortBy}
            stockFilter={stockFilter}
            onStockFilterChange={setStockFilter}
          />

          <Grid container spacing={3}>
            {[...Array(ITEMS_PER_PAGE)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>Products</Typography>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom>Products</Typography>
          <Typography color="text.secondary" gutterBottom>
            Manage and track your store's inventory
          </Typography>
        </Box>

        <ProductFilters
          search={search}
          onSearchChange={setSearch}
          sortBy={sortBy}
          onSortChange={setSortBy}
          stockFilter={stockFilter}
          onStockFilterChange={setStockFilter}
        />

        <Grid container spacing={3}>
          {paginatedProducts.map((product) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
              <ProductCard
                product={product}
                onClick={() => setSelectedProduct(product)}
              />
            </Grid>
          ))}
        </Grid>

        {filteredProducts.length > ITEMS_PER_PAGE && (
          <Stack alignItems="center" sx={{ mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Stack>
        )}

        {filteredProducts.length === 0 && (
          <Typography color="text.secondary" align="center">
            No products found matching your criteria.
          </Typography>
        )}
      </Stack>

      <ProductDetailsModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </Box>
  );
} 