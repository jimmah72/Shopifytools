'use client';

import { Suspense, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CostOfGoodsTable } from '@/components/products/CostOfGoodsTable';
import { ProductsSyncBanner } from '@/components/products/ProductsSyncBanner';
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
import { Search, FilterList, Sort, Refresh } from '@mui/icons-material';
import { useDebounce } from '@/hooks/useDebounce';

namespace ProductsPage {
  export interface Variant {
    id: string;
    price: number;
    inventory_cost: number;
    cost?: number;
    sku: string;
    inventory_quantity: number;
    inventory_tracked: boolean;
  }

  export interface Product {
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
    lastSyncedAt?: string | null;
    variants: Variant[];
  }
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
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [products, setProducts] = useState<ProductsPage.Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  
  // ✅ NEW: Auto-sync control and manual sync functionality
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    // Default to enabled, but allow user to disable
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('productsAutoSync');
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [manualSyncLoading, setManualSyncLoading] = useState(false);
  
  // ✅ FIX: Use ref for request deduplication to avoid TypeScript errors
  const lastRequestRef = useRef<{ key: string; time: number } | null>(null);
  
  // Initialize filters from URL params on mount, with smart defaults
  const [sortField, setSortField] = useState<SortField>(() => {
    const param = searchParams.get('sort');
    return (param as SortField) || 'title';
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    const param = searchParams.get('dir');
    return (param as SortDirection) || 'asc';
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const param = searchParams.get('status');
    // If no URL params exist (initial load), default to 'Active'
    // If URL params exist, respect them (including 'all')
    return (param as StatusFilter) || 'Active';
  });
  const [costSourceFilter, setCostSourceFilter] = useState<CostSourceFilter>(() => {
    const param = searchParams.get('source');
    return (param as CostSourceFilter) || 'all';
  });
  const [costDataFilter, setCostDataFilter] = useState<CostDataFilter>(() => {
    const param = searchParams.get('data');
    return (param as CostDataFilter) || 'all';
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Track if user has interacted with filters to maintain state
  const [hasUserInteracted, setHasUserInteracted] = useState(() => {
    // If any URL params exist, user has interacted
    return searchParams.toString().length > 0;
  });

  // Initialize search term from URL
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
    }
    const pageParam = searchParams.get('page');
    if (pageParam) {
      setCurrentPage(parseInt(pageParam, 10) || 1);
    }
  }, [searchParams]);

  // Function to update URL with current filter state
  const updateURL = useCallback((newParams: {
    search?: string;
    page?: number;
    sort?: SortField;
    dir?: SortDirection;
    status?: StatusFilter;
    source?: CostSourceFilter;
    data?: CostDataFilter;
  }) => {
    const params = new URLSearchParams();
    
    // Add non-default values to URL
    if (newParams.search && newParams.search.trim()) {
      params.set('search', newParams.search);
    }
    if (newParams.page && newParams.page > 1) {
      params.set('page', newParams.page.toString());
    }
    if (newParams.sort && newParams.sort !== 'title') {
      params.set('sort', newParams.sort);
    }
    if (newParams.dir && newParams.dir !== 'asc') {
      params.set('dir', newParams.dir);
    }
    if (newParams.status && newParams.status !== 'Active') {
      params.set('status', newParams.status);
    }
    if (newParams.source && newParams.source !== 'all') {
      params.set('source', newParams.source);
    }
    if (newParams.data && newParams.data !== 'all') {
      params.set('data', newParams.data);
    }

    const queryString = params.toString();
    const newUrl = queryString ? `/products?${queryString}` : '/products';
    
    // Use replace to avoid cluttering browser history for filter changes
    router.replace(newUrl, { scroll: false });
  }, [router]);

  // Variant expansion state (always start collapsed)
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  
  // Variant manual edits state with localStorage persistence
  const [variantManualEdits, setVariantManualEdits] = useState<Record<string, Record<string, { cost?: number; handling?: number; misc?: number }>>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('variantManualEdits');
        return saved ? JSON.parse(saved) : {};
      } catch (error) {
        console.warn('Failed to load variant manual edits from localStorage:', error);
        return {};
      }
    }
    return {};
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
    },
    forceSync: boolean = false
  ) => {
    // ✅ FIX: Simple request deduplication without state dependency
    const requestKey = JSON.stringify({ page, search, sort, filters, forceSync });
    const callId = Math.random().toString(36).substring(2, 8);
    
    // Use a ref for cache instead of state to avoid infinite loops
    const now = Date.now();
    if (lastRequestRef.current && 
        lastRequestRef.current.key === requestKey && 
        (now - lastRequestRef.current.time) < 1000) {
      console.log(`⚠️ Duplicate request blocked [${callId}]: Request made within 1 second`);
      return;
    }
    
    // Store last request info
    lastRequestRef.current = { key: requestKey, time: now };
    
    console.log(`🎯 fetchProducts called [${callId}]
      - Page: ${page}
      - Search: "${search}"
      - Sort: ${sort.field} ${sort.direction}
      - Filters: ${JSON.stringify(filters)}
      - Auto-sync: ${autoSyncEnabled}
      - Force sync: ${forceSync}
      - Timestamp: ${new Date().toISOString()}`);
    
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: PRODUCTS_PER_PAGE.toString(),
        fetchCosts: (autoSyncEnabled || forceSync) ? 'true' : 'false',
        sortField: sort.field,
        sortDirection: sort.direction,
        ...(search && { search }),
        ...(filters.status !== 'all' && { statusFilter: filters.status }),
        ...(filters.costSource !== 'all' && { costSourceFilter: filters.costSource }),
        ...(filters.costData !== 'all' && { costDataFilter: filters.costData }),
        ...(forceSync && { forceSync: 'true' })
      });
      
      console.log(`🌐 Making API request [${callId}]: /api/products?${params.toString()}`);
      
      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const data: ProductsResponse = await response.json();
      
      console.log(`✅ API response received [${callId}]: ${data.products.length} products`);
      
      // Transform products with a stable transform function
      const transformedProducts = data.products.map((product: any): ProductsPage.Product => ({
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
        lastSyncedAt: product.lastSyncedAt,
        variants: product.variants || []
      }));
      
      setProducts(transformedProducts);
      setTotalPages(data.totalPages || Math.ceil(data.products.length / PRODUCTS_PER_PAGE));
      setTotalProducts(data.total || data.products.length);
      
      // Reset expanded products when loading new page data
      setExpandedProducts(new Set());
      
      console.log(`🎯 fetchProducts completed [${callId}]: Updated state with ${transformedProducts.length} products`);
      
    } catch (err) {
      console.error(`❌ fetchProducts error [${callId}]:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [PRODUCTS_PER_PAGE, sortField, sortDirection, statusFilter, costSourceFilter, costDataFilter, autoSyncEnabled]);

  // Effect for initial load and search/filter/sort changes
  useEffect(() => {
    // ✅ FIXED: Simplified dependencies to avoid double requests and infinite loops
    // Only fetch if we have initialized from URL (avoid race conditions)
    
    const effectId = Math.random().toString(36).substring(2, 6);
    console.log(`🔄 useEffect triggered [${effectId}]
      - hasUserInteracted: ${hasUserInteracted}
      - searchParams.length: ${searchParams.toString().length}
      - currentPage: ${currentPage}
      - debouncedSearchTerm: "${debouncedSearchTerm}"
      - sortField: ${sortField}
      - sortDirection: ${sortDirection}
      - statusFilter: ${statusFilter}
      - costSourceFilter: ${costSourceFilter}
      - costDataFilter: ${costDataFilter}
      - Will fetch: ${hasUserInteracted || searchParams.toString().length === 0}`);
    
    if (hasUserInteracted || searchParams.toString().length === 0) {
      console.log(`🔄 useEffect [${effectId}] - Calling fetchProducts...`);
      fetchProducts(
        currentPage, 
        debouncedSearchTerm,
        { field: sortField, direction: sortDirection },
        { status: statusFilter, costSource: costSourceFilter, costData: costDataFilter },
        false // forceSync = false for normal page loads
      );
    } else {
      console.log(`🔄 useEffect [${effectId}] - SKIPPED fetchProducts (conditions not met)`);
    }
    // ✅ FIXED: Removed fetchProducts from dependencies to prevent infinite loops
  }, [currentPage, debouncedSearchTerm, sortField, sortDirection, statusFilter, costSourceFilter, costDataFilter, hasUserInteracted, searchParams]);

  // Save variant manual edits to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('variantManualEdits', JSON.stringify(variantManualEdits));
      } catch (error) {
        console.warn('Failed to save variant manual edits to localStorage:', error);
      }
    }
  }, [variantManualEdits]);

  // ✅ NEW: Save auto-sync preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('productsAutoSync', JSON.stringify(autoSyncEnabled));
      } catch (error) {
        console.warn('Failed to save auto-sync preference to localStorage:', error);
      }
    }
  }, [autoSyncEnabled]);

  // ✅ NEW: Manual sync function for current page
  const manualSyncCurrentPage = useCallback(async () => {
    if (manualSyncLoading) return;
    
    setManualSyncLoading(true);
    console.log('🔄 Manual sync triggered for current page');
    
    try {
      // Force sync current page by calling fetchProducts with forceSync=true
      await fetchProducts(
        currentPage, 
        debouncedSearchTerm,
        { field: sortField, direction: sortDirection },
        { status: statusFilter, costSource: costSourceFilter, costData: costDataFilter },
        true // forceSync = true
      );
      console.log('✅ Manual sync completed for current page');
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      setError('Failed to sync current page');
    } finally {
      setManualSyncLoading(false);
    }
  }, [manualSyncLoading, currentPage, debouncedSearchTerm, sortField, sortDirection, statusFilter, costSourceFilter, costDataFilter]);

  // Function to fetch variant costs for a specific product
  const fetchVariantCostsForProduct = useCallback(async (productId: string) => {
    try {
      // Use the existing getProductsVariantCostData function via a direct API call
      const response = await fetch(`/api/products/${productId}/variants/costs`);
      if (!response.ok) {
        throw new Error('Failed to fetch variant costs');
      }
      
      const variantCosts = await response.json();
      
      // Update the specific product's variants with cost data and apply any manual edits
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId 
            ? {
                ...product,
                variants: product.variants.map(variant => {
                  const shopifyCost = variantCosts[variant.id];
                  const manualEdits = variantManualEdits[productId]?.[variant.id];
                  
                  return {
                    ...variant,
                    inventory_cost: shopifyCost || variant.inventory_cost,
                    cost: manualEdits?.cost !== undefined ? manualEdits.cost : (shopifyCost || variant.cost)
                  };
                })
              }
            : product
        )
      );
    } catch (error) {
      console.error('Error fetching variant costs for product:', productId, error);
    }
  }, []);

  // Variant expansion handlers
  const toggleProductExpansion = useCallback((productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
        // Fetch variant costs when expanding
        const product = products.find(p => p.id === productId);
        if (product) {
          // Always fetch for SHOPIFY mode (fresh data) or if variants have no cost data
          const shouldFetch = product.costSource === 'SHOPIFY' || 
                            product.variants.some(v => v.inventory_cost === 0);
          if (shouldFetch) {
            fetchVariantCostsForProduct(productId);
          }
        }
      }
      return newSet;
    });
  }, [products, fetchVariantCostsForProduct]);

  const isProductExpanded = useCallback((productId: string) => {
    return expandedProducts.has(productId);
  }, [expandedProducts]);

  const expandAllProducts = useCallback(() => {
    setExpandedProducts(new Set(products.map(p => p.id)));
  }, [products]);

  const collapseAllProducts = useCallback(() => {
    setExpandedProducts(new Set());
  }, []);

  const recalculateMargin = useCallback((product: ProductsPage.Product) => {
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

  const handleVariantUpdate = useCallback((productId: string, variantId: string, updatedVariant: Partial<ProductsPage.Variant>) => {
    setProducts(prevProducts => 
      prevProducts.map(p => 
        p.id === productId 
          ? {
              ...p,
              variants: p.variants.map(v => 
                v.id === variantId 
                  ? { ...v, ...updatedVariant }
                  : v
              )
            }
          : p
      )
    );
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

      // If product is expanded and we switched modes, refetch variant costs to show correct data
      if (expandedProducts.has(productId)) {
        fetchVariantCostsForProduct(productId);
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
  }, [recalculateMargin, expandedProducts, fetchVariantCostsForProduct]);

  const handlePageChange = useCallback((_: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    setHasUserInteracted(true);
    updateURL({
      search: searchTerm,
      page,
      sort: sortField,
      dir: sortDirection,
      status: statusFilter,
      source: costSourceFilter,
      data: costDataFilter
    });
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchTerm, sortField, sortDirection, statusFilter, costSourceFilter, costDataFilter, updateURL]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);
    setCurrentPage(1);
    setHasUserInteracted(true);
    updateURL({
      search: newSearchTerm,
      page: 1,
      sort: sortField,
      dir: sortDirection,
      status: statusFilter,
      source: costSourceFilter,
      data: costDataFilter
    });
  }, [sortField, sortDirection, statusFilter, costSourceFilter, costDataFilter, updateURL]);

  // Sort and filter handlers with URL updates
  const handleSortChange = useCallback((field: SortField) => {
    let newDirection: SortDirection = 'asc';
    if (field === sortField) {
      // Toggle direction if same field
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    }
    setSortField(field);
    setSortDirection(newDirection);
    setCurrentPage(1);
    setHasUserInteracted(true);
    updateURL({
      search: searchTerm,
      page: 1,
      sort: field,
      dir: newDirection,
      status: statusFilter,
      source: costSourceFilter,
      data: costDataFilter
    });
  }, [searchTerm, sortField, sortDirection, statusFilter, costSourceFilter, costDataFilter, updateURL]);

  const handleStatusFilterChange = useCallback((newStatus: StatusFilter) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
    setHasUserInteracted(true);
    updateURL({
      search: searchTerm,
      page: 1,
      sort: sortField,
      dir: sortDirection,
      status: newStatus,
      source: costSourceFilter,
      data: costDataFilter
    });
  }, [searchTerm, sortField, sortDirection, costSourceFilter, costDataFilter, updateURL]);

  const handleCostSourceFilterChange = useCallback((newSource: CostSourceFilter) => {
    setCostSourceFilter(newSource);
    setCurrentPage(1);
    setHasUserInteracted(true);
    updateURL({
      search: searchTerm,
      page: 1,
      sort: sortField,
      dir: sortDirection,
      status: statusFilter,
      source: newSource,
      data: costDataFilter
    });
  }, [searchTerm, sortField, sortDirection, statusFilter, costDataFilter, updateURL]);

  const handleCostDataFilterChange = useCallback((newData: CostDataFilter) => {
    setCostDataFilter(newData);
    setCurrentPage(1);
    setHasUserInteracted(true);
    updateURL({
      search: searchTerm,
      page: 1,
      sort: sortField,
      dir: sortDirection,
      status: statusFilter,
      source: costSourceFilter,
      data: newData
    });
  }, [searchTerm, sortField, sortDirection, statusFilter, costSourceFilter, updateURL]);

  const handleFilterReset = useCallback(() => {
    setStatusFilter('Active');
    setCostSourceFilter('all');
    setCostDataFilter('all');
    setCurrentPage(1);
    setHasUserInteracted(true);
    updateURL({
      search: searchTerm,
      page: 1,
      sort: sortField,
      dir: sortDirection,
      status: 'Active',
      source: 'all',
      data: 'all'
    });
  }, [searchTerm, sortField, sortDirection, updateURL]);

  const getActiveFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'Active') count++;
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
      </Box>

      {/* Products Sync Banner */}
      <ProductsSyncBanner 
        onSyncStart={() => {
          // Optionally refresh products after sync
        }}
        onSyncComplete={() => {
          // ✅ FIXED: Refresh the current page to show updated cost data and sync timestamps
          console.log('ProductsPage - Sync completed, refreshing product data...');
          fetchProducts(
            currentPage, 
            debouncedSearchTerm,
            { field: sortField, direction: sortDirection },
            { status: statusFilter, costSource: costSourceFilter, costData: costDataFilter },
            true // forceSync = true after global sync completion
          ).then(() => {
            console.log('ProductsPage - Product data refreshed after sync completion');
          });
        }}
      />

      <Box sx={{ mb: 4 }}>

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
              
              {/* ✅ NEW: Auto-sync toggle */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Auto-sync:
                </Typography>
                <Button
                  variant={autoSyncEnabled ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                  sx={{ minWidth: 60 }}
                >
                  {autoSyncEnabled ? 'ON' : 'OFF'}
                </Button>
              </Box>
              
              {/* ✅ NEW: Manual sync button (only show when auto-sync is off) */}
              {!autoSyncEnabled && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={manualSyncCurrentPage}
                  disabled={manualSyncLoading}
                  startIcon={manualSyncLoading ? <CircularProgress size={16} /> : <Refresh />}
                  sx={{ minWidth: 120 }}
                >
                  {manualSyncLoading ? 'Syncing...' : 'Sync This Page'}
                </Button>
              )}
          
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
                  onChange={(e) => handleStatusFilterChange(e.target.value as StatusFilter)}
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
                  onChange={(e) => handleCostSourceFilterChange(e.target.value as CostSourceFilter)}
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
                  onChange={(e) => handleCostDataFilterChange(e.target.value as CostDataFilter)}
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
              {statusFilter !== 'Active' && (
                <Chip
                  label={`Status: ${statusFilter}`}
                  onDelete={() => handleStatusFilterChange('Active')}
                  size="small"
                />
              )}
              {costSourceFilter !== 'all' && (
                <Chip
                  label={`Source: ${costSourceFilter}`}
                  onDelete={() => handleCostSourceFilterChange('all')}
                  size="small"
                />
              )}
              {costDataFilter !== 'all' && (
                <Chip
                  label={`Cost: ${costDataFilter === 'with-cost' ? 'With Data' : 'Missing Data'}`}
                  onDelete={() => handleCostDataFilterChange('all')}
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
            onVariantUpdate={handleVariantUpdate}
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