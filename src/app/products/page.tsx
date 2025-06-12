'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { CostOfGoodsTable } from '@/components/products/CostOfGoodsTable';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Pagination, 
  TextField, 
  InputAdornment, 
  Skeleton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Button
} from '@mui/material';
import { Search, FilterList, Sort } from '@mui/icons-material';
import { useDebounce } from '@/hooks/useDebounce';

interface Variant {
  id: string;
  price: number;
  inventory_cost: number;
  sku: string;
  inventory_quantity: number;
  inventory_tracked: boolean;
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
  miscFees: number;
  margin: number;
  costSource: 'SHOPIFY' | 'MANUAL';
  shopifyCostOfGoodsSold?: number | null;
  shopifyHandlingFees?: number;
  variants: Variant[];
}

interface ProductsResponse {
  products: any[];
  total: number;
  page: number;
  totalPages: number;
}

type SortField = 'title' | 'status' | 'sellingPrice' | 'costOfGoodsSold' | 'margin' | 'lastEdited';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'Active' | 'Draft' | 'Archived';
type CostSourceFilter = 'all' | 'SHOPIFY' | 'MANUAL';
type CostDataFilter = 'all' | 'with-cost' | 'without-cost';

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
  
  // Sort and filter state
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [costSourceFilter, setCostSourceFilter] = useState<CostSourceFilter>('all');
  const [costDataFilter, setCostDataFilter] = useState<CostDataFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Variant expansion state with localStorage persistence
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('expandedProducts');
        return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch (error) {
        console.warn('Failed to load expanded products from localStorage:', error);
        return new Set();
      }
    }
    return new Set();
  });

  const PRODUCTS_PER_PAGE = 20;

  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchProducts = useCallback(async (
    page: number = 1, 
    search: string = '',
    sort: { field: SortField; direction: SortDirection } = { field: sortField, direction: sortDirection },
    filters: { status: StatusFilter; costSource: CostSourceFilter; costData: CostDataFilter } = { 
      status: statusFilter, 
      costSource: costSourceFilter, 
      costData: costDataFilter 
    }
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: PRODUCTS_PER_PAGE.toString(),
        fetchCosts: 'true', // Always fetch cost data for current page
        sortField: sort.field,
        sortDirection: sort.direction,
        ...(search && { search }),
        ...(filters.status !== 'all' && { statusFilter: filters.status }),
        ...(filters.costSource !== 'all' && { costSourceFilter: filters.costSource }),
        ...(filters.costData !== 'all' && { costDataFilter: filters.costData })
      });
      
      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const data: ProductsResponse = await response.json();
      
      // Transform products with a stable transform function
      const transformedProducts = data.products.map((product: any): Product => ({
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
        shopifyCostOfGoodsSold: product.shopifyCostOfGoodsSold, // Preserve null values - don't default to 0
        shopifyHandlingFees: product.shopifyHandlingFees || 0,
        variants: product.variants || []
      }));
      
      // Temporary: Log first product's variants to verify data flow
      if (transformedProducts.length > 0) {
        console.log('VARIANT DEBUG - First product variants:', transformedProducts[0].variants);
      }
      
      setProducts(transformedProducts);
      setTotalPages(data.totalPages || Math.ceil(data.products.length / PRODUCTS_PER_PAGE));
      setTotalProducts(data.total || data.products.length);
      
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [PRODUCTS_PER_PAGE, sortField, sortDirection, statusFilter, costSourceFilter, costDataFilter]);

  // Effect for initial load and search/filter/sort changes
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when search or filters change
    fetchProducts(
      1, 
      debouncedSearchTerm,
      { field: sortField, direction: sortDirection },
      { status: statusFilter, costSource: costSourceFilter, costData: costDataFilter }
    );
  }, [debouncedSearchTerm, sortField, sortDirection, statusFilter, costSourceFilter, costDataFilter, fetchProducts]);

  // Effect for page changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchProducts(
        currentPage, 
        debouncedSearchTerm,
        { field: sortField, direction: sortDirection },
        { status: statusFilter, costSource: costSourceFilter, costData: costDataFilter }
      );
    }
  }, [currentPage, debouncedSearchTerm, sortField, sortDirection, statusFilter, costSourceFilter, costDataFilter, fetchProducts]);

  // Save expanded products to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('expandedProducts', JSON.stringify([...expandedProducts]));
      } catch (error) {
        console.warn('Failed to save expanded products to localStorage:', error);
      }
    }
  }, [expandedProducts]);

  // Variant expansion handlers
  const toggleProductExpansion = useCallback((productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
        console.log('EXPANSION DEBUG - Collapsed product:', productId);
      } else {
        newSet.add(productId);
        console.log('EXPANSION DEBUG - Expanded product:', productId);
      }
      return newSet;
    });
  }, []);

  const isProductExpanded = useCallback((productId: string) => {
    return expandedProducts.has(productId);
  }, [expandedProducts]);

  const expandAllProducts = useCallback(() => {
    setExpandedProducts(new Set(products.map(p => p.id)));
    console.log('EXPANSION DEBUG - Expanded all products');
  }, [products]);

  const collapseAllProducts = useCallback(() => {
    setExpandedProducts(new Set());
    console.log('EXPANSION DEBUG - Collapsed all products');
  }, []);

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
      const response = await fetch(`/api/products/${productId}/costs`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ costSource: newSource }),
      });

      if (!response.ok) {
        throw new Error('Failed to save cost source');
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
  }, [recalculateMargin]);

  const handlePageChange = useCallback((_: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  // Sort and filter handlers
  const handleSortChange = useCallback((field: SortField) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handleFilterReset = useCallback(() => {
    setStatusFilter('all');
    setCostSourceFilter('all');
    setCostDataFilter('all');
  }, []);

  const getActiveFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (costSourceFilter !== 'all') count++;
    if (costDataFilter !== 'all') count++;
    return count;
  }, [statusFilter, costSourceFilter, costDataFilter]);

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

        {/* Search, Sort, and Filter Controls */}
        <Box sx={{ mb: 3 }}>
          {/* Top row: Search, Sort, Filters toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
              
              {/* Sort Control */}
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Sort by</InputLabel>
                <Select
                  value={`${sortField}-${sortDirection}`}
                  label="Sort by"
                  onChange={(e) => {
                    const [field, direction] = e.target.value.split('-') as [SortField, SortDirection];
                    setSortField(field);
                    setSortDirection(direction);
                  }}
                >
                  <MenuItem value="title-asc">Title A-Z</MenuItem>
                  <MenuItem value="title-desc">Title Z-A</MenuItem>
                  <MenuItem value="status-asc">Status A-Z</MenuItem>
                  <MenuItem value="status-desc">Status Z-A</MenuItem>
                  <MenuItem value="sellingPrice-desc">Price High-Low</MenuItem>
                  <MenuItem value="sellingPrice-asc">Price Low-High</MenuItem>
                  <MenuItem value="costOfGoodsSold-desc">Cost High-Low</MenuItem>
                  <MenuItem value="costOfGoodsSold-asc">Cost Low-High</MenuItem>
                  <MenuItem value="margin-desc">Margin High-Low</MenuItem>
                  <MenuItem value="margin-asc">Margin Low-High</MenuItem>
                  <MenuItem value="lastEdited-desc">Recently Edited</MenuItem>
                  <MenuItem value="lastEdited-asc">Oldest Edited</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => setShowFilters(!showFilters)}
                color={getActiveFilterCount > 0 ? "primary" : "inherit"}
              >
                Filters {getActiveFilterCount > 0 && `(${getActiveFilterCount})`}
              </Button>
              
              <Typography variant="body2" color="text.secondary">
                {loading ? 'Loading...' : `Showing ${products.length} of ${totalProducts} products`}
              </Typography>
            </Box>
          </Box>

          {/* Filter Controls (Collapsible) */}
          {showFilters && (
            <Box sx={{ 
              p: 2, 
              border: '1px solid', 
              borderColor: 'divider', 
              borderRadius: 1, 
              bgcolor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap'
            }}>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Draft">Draft</MenuItem>
                  <MenuItem value="Archived">Archived</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Cost Source</InputLabel>
                <Select
                  value={costSourceFilter}
                  label="Cost Source"
                  onChange={(e) => setCostSourceFilter(e.target.value as CostSourceFilter)}
                >
                  <MenuItem value="all">All Sources</MenuItem>
                  <MenuItem value="SHOPIFY">Shopify</MenuItem>
                  <MenuItem value="MANUAL">Manual</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Cost Data</InputLabel>
                <Select
                  value={costDataFilter}
                  label="Cost Data"
                  onChange={(e) => setCostDataFilter(e.target.value as CostDataFilter)}
                >
                  <MenuItem value="all">All Products</MenuItem>
                  <MenuItem value="with-cost">With Cost Data</MenuItem>
                  <MenuItem value="without-cost">Missing Cost Data</MenuItem>
                </Select>
              </FormControl>

              {getActiveFilterCount > 0 && (
                <Button
                  variant="text"
                  onClick={handleFilterReset}
                  size="small"
                >
                  Clear Filters
                </Button>
              )}
            </Box>
          )}

          {/* Active Filter Chips */}
          {getActiveFilterCount > 0 && (
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              {statusFilter !== 'all' && (
                <Chip
                  label={`Status: ${statusFilter}`}
                  onDelete={() => setStatusFilter('all')}
                  size="small"
                />
              )}
              {costSourceFilter !== 'all' && (
                <Chip
                  label={`Source: ${costSourceFilter}`}
                  onDelete={() => setCostSourceFilter('all')}
                  size="small"
                />
              )}
              {costDataFilter !== 'all' && (
                <Chip
                  label={`Cost: ${costDataFilter === 'with-cost' ? 'With Data' : 'Missing Data'}`}
                  onDelete={() => setCostDataFilter('all')}
                  size="small"
                />
              )}
            </Box>
          )}
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
            expandedProducts={expandedProducts}
            onToggleExpansion={toggleProductExpansion}
            onExpandAll={expandAllProducts}
            onCollapseAll={collapseAllProducts}
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