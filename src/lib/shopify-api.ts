import { LATEST_API_VERSION } from '@shopify/shopify-api';
import { formatShopDomain } from './shopify.config';

function validateEnvironmentVariables() {
  console.log('Shopify API - Validating environment variables')
  const requiredEnvVars = {
    SHOPIFY_APP_API_KEY: process.env.SHOPIFY_APP_API_KEY,
    SHOPIFY_APP_SECRET: process.env.SHOPIFY_APP_SECRET,
  };

  // Log environment variable status (without exposing values)
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    console.log(`Shopify API - Environment variable ${key}: ${value ? 'Present' : 'Missing'}`);
  });

  // Validate environment variables
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value) {
      console.error(`Shopify API - Missing required environment variable: ${key}`);
      throw new Error(`Missing required environment variable: ${key}`);
    }
  });

  console.log('Shopify API - Environment variables validated successfully')
}

export async function getProducts(shop: string, accessToken: string, options: { 
  limit?: number;
  fields?: string[];
  since_id?: string;
  page_info?: string;
} = {}) {
  console.log('Shopify API - Getting products for shop:', shop)
  
  try {
    // Only check environment variables when the function is actually called
    validateEnvironmentVariables();

    // Format the shop domain
    const formattedDomain = formatShopDomain(shop);
    console.log('Shopify API - Using formatted domain:', formattedDomain);

    const url = new URL(`https://${formattedDomain}/admin/api/${LATEST_API_VERSION}/products.json`);
    
    if (options.limit) {
      url.searchParams.set('limit', options.limit.toString());
    }
    
    if (options.since_id) {
      url.searchParams.set('since_id', options.since_id);
    }
    
    if (options.page_info) {
      url.searchParams.set('page_info', options.page_info);
    }
    
    if (options.fields) {
      url.searchParams.set('fields', options.fields.join(','));
    }

    console.log('Shopify API - Making request to:', url.toString())
    
    const response = await retryWithBackoff(async () => {
      const res = await fetch(url.toString(), {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      console.log('Shopify API - Response status:', res.status)

      if (!res.ok) {
        console.error('Shopify API - Error response:', res.statusText)
        throw new Error(`Shopify API Error: ${res.statusText}`);
      }
      
      return res;
    });

    const data = await response.json();
    
    // Enhanced logging to see all products
    console.log('Shopify API - Total products returned:', data.products.length);
    console.log('Shopify API - All products:');
    data.products.forEach((product: any, index: number) => {
      console.log(`  Product ${index + 1}: ${product.title} (ID: ${product.id})`);
      if (product.variants && product.variants.length > 0) {
        console.log(`    First variant cost_per_item: ${product.variants[0].cost_per_item}`);
      }
    });
    
    // Look for Liquid Snowboard specifically
    const liquidProduct = data.products.find((p: any) => 
      p.title.toLowerCase().includes('liquid') || 
      p.title.toLowerCase().includes('snowboard') ||
      p.title.toLowerCase().includes('collection')
    );
    
    if (liquidProduct) {
      console.log('Shopify API - FOUND LIQUID/SNOWBOARD PRODUCT:');
      console.log(`  Title: ${liquidProduct.title}`);
      console.log(`  ID: ${liquidProduct.id}`);
      console.log('  Variants with cost data:');
      liquidProduct.variants.forEach((variant: any, index: number) => {
        console.log(`    Variant ${index + 1} (${variant.id}): cost_per_item = ${variant.cost_per_item}`);
      });
    } else {
      console.log('Shopify API - NO LIQUID/SNOWBOARD PRODUCT FOUND');
    }
    
    console.log('Shopify API - Successfully fetched products')
    return data.products;
  } catch (error) {
    console.error('Shopify API - Error:', error)
    throw error;
  }
}

export async function getVariant(shop: string, accessToken: string, variantId: string) {
  console.log('Shopify API - Getting variant:', variantId)
  
  return retryWithBackoff(async () => {
    validateEnvironmentVariables();
    const formattedDomain = formatShopDomain(shop);
    
    const url = new URL(`https://${formattedDomain}/admin/api/${LATEST_API_VERSION}/variants/${variantId}.json`);
    url.searchParams.set('fields', 'id,title,price,inventory_quantity,cost_per_item,sku');
    
    console.log('Shopify API - Making request to:', url.toString())
    const response = await fetch(url.toString(), {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Shopify API - Error response:', response.statusText)
      throw new Error(`Shopify API Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Shopify API - Successfully fetched variant')
    return data.variant;
  });
}

// Rate limiting helper
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly timeWindow: number;

  constructor(maxRequests: number = 40, timeWindow: number = 1000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Remove requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    // If we're at the limit, wait
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest) + 50; // Add 50ms buffer
      console.log(`Shopify API - Rate limit approaching, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitIfNeeded(); // Check again after waiting
    }
    
    // Record this request
    this.requests.push(now);
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter(35, 1000); // 35 requests per second (safer than 40 limit)

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 500
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await rateLimiter.waitIfNeeded();
      return await fn();
    } catch (error: any) {
      const isRateLimit = error.message?.includes('Too Many Requests') || 
                         error.message?.includes('429');
      
      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        console.log(`Shopify API - Rate limited, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export async function getInventoryItem(shop: string, accessToken: string, inventoryItemId: string) {
  console.log('Shopify API - Getting inventory item:', inventoryItemId)
  
  return retryWithBackoff(async () => {
    validateEnvironmentVariables();
    const formattedDomain = formatShopDomain(shop);
    
    const url = new URL(`https://${formattedDomain}/admin/api/${LATEST_API_VERSION}/inventory_items/${inventoryItemId}.json`);
    
    console.log('Shopify API - Making inventory request to:', url.toString())
    const response = await fetch(url.toString(), {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Shopify API - Inventory error response:', response.statusText)
      throw new Error(`Shopify API Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Shopify API - Inventory item data:', {
      id: data.inventory_item?.id,
      cost: data.inventory_item?.cost,
      tracked: data.inventory_item?.tracked
    });
    return data.inventory_item;
  });
}

export async function getProductsWithInventoryCosts(shop: string, accessToken: string, options: { 
  limit?: number;
  fields?: string[];
  since_id?: string;
  page_info?: string;
} = {}) {
  console.log('Shopify API - Getting products with inventory costs for shop:', shop)
  
  try {
    // First get products with inventory_item_id
    validateEnvironmentVariables();
    const formattedDomain = formatShopDomain(shop);

    const url = new URL(`https://${formattedDomain}/admin/api/${LATEST_API_VERSION}/products.json`);
    
    // Set limit to maximum allowed (250) unless specified
    const limit = options.limit || 250;
    url.searchParams.set('limit', limit.toString());
    
    // Add pagination parameters
    if (options.since_id) {
      url.searchParams.set('since_id', options.since_id);
    }
    
    if (options.page_info) {
      url.searchParams.set('page_info', options.page_info);
    }
    
    // Include inventory_item_id in the fields
    const fields = [
      'id', 'title', 'handle', 'description', 'tags', 'images',
      'variants', 'variants.id', 'variants.price', 'variants.inventory_quantity',
      'variants.cost_per_item', 'variants.sku', 'variants.inventory_item_id'
    ];
    
    url.searchParams.set('fields', fields.join(','));

    console.log('Shopify API - Making products request to:', url.toString())
    
    const response = await retryWithBackoff(async () => {
      const res = await fetch(url.toString(), {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      console.log('Shopify API - Products response status:', res.status)

      if (!res.ok) {
        console.error('Shopify API - Products error response:', res.statusText)
        throw new Error(`Shopify API Error: ${res.statusText}`);
      }
      
      return res;
    });

    const data = await response.json();
    
    console.log('Shopify API - Total products returned:', data.products.length);
    
    // Now fetch inventory costs for each variant with robust rate limiting and retries
    const productsWithCosts = [];
    let totalVariants = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    
    for (const product of data.products) {
      const variantsWithCosts = [];
      
      for (const variant of product.variants) {
        totalVariants++;
        
        if (variant.inventory_item_id) {
          try {
            const inventoryItem = await getInventoryItem(shop, accessToken, variant.inventory_item_id);
            variantsWithCosts.push({
              ...variant,
              inventory_cost: inventoryItem?.cost,
              inventory_tracked: inventoryItem?.tracked
            });
            successfulRequests++;
          } catch (error) {
            console.error(`Failed to get inventory for variant ${variant.id}:`, error);
            variantsWithCosts.push({
              ...variant,
              inventory_cost: null,
              inventory_tracked: false
            });
            failedRequests++;
          }
        } else {
          variantsWithCosts.push({
            ...variant,
            inventory_cost: null,
            inventory_tracked: false
          });
        }
      }
      
      productsWithCosts.push({
        ...product,
        variants: variantsWithCosts
      });
    }
    
    console.log(`Shopify API - Inventory fetch summary: ${successfulRequests}/${totalVariants} successful, ${failedRequests} failed`);
    
    // Log results for Liquid Snowboard specifically
    const liquidProduct = productsWithCosts.find((p: any) => 
      p.title.toLowerCase().includes('liquid')
    );
    
    if (liquidProduct) {
      console.log('Shopify API - LIQUID SNOWBOARD INVENTORY COSTS:');
      console.log(`  Title: ${liquidProduct.title}`);
      console.log(`  ID: ${liquidProduct.id}`);
      liquidProduct.variants.forEach((variant: any, index: number) => {
        console.log(`    Variant ${index + 1} (${variant.id}):`);
        console.log(`      cost_per_item: ${variant.cost_per_item}`);
        console.log(`      inventory_cost: ${variant.inventory_cost}`);
        console.log(`      inventory_tracked: ${variant.inventory_tracked}`);
      });
    }
    
    console.log('Shopify API - Successfully fetched products with inventory costs')
    return {
      products: productsWithCosts,
      hasNextPage: response.headers.get('link')?.includes('rel="next"') || false,
      nextPageInfo: extractNextPageInfo(response.headers.get('link'))
    };
  } catch (error) {
    console.error('Shopify API - Error:', error)
    throw error;
  }
}

// Helper function to extract next page info from Link header
function extractNextPageInfo(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  
  const nextMatch = linkHeader.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/);
  return nextMatch ? nextMatch[1] : null;
}

// Function to get ALL products with pagination
export async function getAllProductsWithInventoryCosts(shop: string, accessToken: string): Promise<any[]> {
  console.log('Shopify API - Fetching ALL products with pagination...');
  
  let allProducts: any[] = [];
  let hasNextPage = true;
  let pageInfo: string | undefined;
  let pageCount = 0;
  
  while (hasNextPage) {
    pageCount++;
    console.log(`Shopify API - Fetching page ${pageCount}...`);
    
    try {
      const result = await getProductsWithInventoryCostsBulk(shop, accessToken, {
        limit: 250, // Maximum allowed by Shopify
        page_info: pageInfo
      });
      
             allProducts.push(...result.products);
       hasNextPage = result.hasNextPage;
       pageInfo = result.nextPageInfo || undefined;
      
      console.log(`Shopify API - Page ${pageCount}: ${result.products.length} products (Total: ${allProducts.length})`);
      
      // Add delay between pages to be respectful
      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error(`Shopify API - Error on page ${pageCount}:`, error);
      throw error;
    }
  }
  
  console.log(`Shopify API - Completed! Fetched ${allProducts.length} products across ${pageCount} pages`);
  return allProducts;
}

export async function getOrders(shop: string, accessToken: string, options: {
  limit?: number;
  status?: string;
  created_at_min?: string;
  created_at_max?: string;
  since_id?: string;
  financial_status?: string;
  fulfillment_status?: string;
} = {}) {
  console.log('Shopify API - Getting orders for shop:', shop)
  
  try {
    validateEnvironmentVariables();
    const formattedDomain = formatShopDomain(shop);

    const url = new URL(`https://${formattedDomain}/admin/api/${LATEST_API_VERSION}/orders.json`);
    
    // Set query parameters
    if (options.limit) {
      url.searchParams.set('limit', options.limit.toString());
    }
    if (options.status) {
      url.searchParams.set('status', options.status);
    }
    if (options.created_at_min) {
      url.searchParams.set('created_at_min', options.created_at_min);
    }
    if (options.created_at_max) {
      url.searchParams.set('created_at_max', options.created_at_max);
    }
    if (options.since_id) {
      url.searchParams.set('since_id', options.since_id);
    }
    if (options.financial_status) {
      url.searchParams.set('financial_status', options.financial_status);
    }
    if (options.fulfillment_status) {
      url.searchParams.set('fulfillment_status', options.fulfillment_status);
    }

    console.log('Shopify API - Making orders request to:', url.toString())
    
    const response = await retryWithBackoff(async () => {
      const res = await fetch(url.toString(), {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      console.log('Shopify API - Orders response status:', res.status)

      if (!res.ok) {
        console.error('Shopify API - Orders error response:', res.statusText)
        throw new Error(`Shopify API Error: ${res.statusText}`);
      }
      
      return res;
    });

    const data = await response.json();
    console.log('Shopify API - Total orders returned:', data.orders.length);
    console.log('Shopify API - Successfully fetched orders')
    return data.orders;
  } catch (error) {
    console.error('Shopify API - Orders error:', error)
    throw error;
  }
}

// Bulk fetch inventory costs using GraphQL
export async function getBulkInventoryCosts(shop: string, accessToken: string, inventoryItemIds: string[]) {
  console.log('Shopify API - Getting bulk inventory costs for', inventoryItemIds.length, 'items')
  
  if (inventoryItemIds.length === 0) {
    return {};
  }

  // GraphQL has a limit of 250 nodes per query, so we need to batch
  const batchSize = 250;
  const inventoryMap: Record<string, { cost: string, tracked: boolean }> = {};
  
  for (let i = 0; i < inventoryItemIds.length; i += batchSize) {
    const batch = inventoryItemIds.slice(i, i + batchSize);
    console.log(`Shopify API - Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(inventoryItemIds.length/batchSize)} (${batch.length} items)`);
    
    const batchResult = await retryWithBackoff(async () => {
      validateEnvironmentVariables();
      const formattedDomain = formatShopDomain(shop);
      
      // GraphQL query to fetch multiple inventory items
      const query = `
        query getBulkInventoryItems($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on InventoryItem {
              id
              unitCost {
                amount
              }
            }
          }
        }
      `;
      
      // Convert inventory item IDs to GraphQL format
      const graphqlIds = batch.map(id => `gid://shopify/InventoryItem/${id}`);
      
      const url = `https://${formattedDomain}/admin/api/${LATEST_API_VERSION}/graphql.json`;
      
      console.log('Shopify API - Making bulk GraphQL request to:', url, 'for', graphqlIds.length, 'items')
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { ids: graphqlIds }
        })
      });

      if (!response.ok) {
        console.error('Shopify API - Bulk inventory error response:', response.statusText)
        throw new Error(`Shopify API Error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        console.error('Shopify API - GraphQL errors:', data.errors)
        throw new Error(`GraphQL Error: ${data.errors[0]?.message || 'Unknown error'}`);
      }
      
      return data;
    });
    
    // Process batch results
    batchResult.data.nodes.forEach((node: any) => {
      if (node && node.id) {
        // Extract numeric ID from GraphQL ID
        const numericId = node.id.replace('gid://shopify/InventoryItem/', '');
        inventoryMap[numericId] = {
          cost: node.unitCost?.amount || '0.00',
          tracked: node.tracked || false
        };
      }
    });
    
    // Small delay between batches to be respectful
    if (i + batchSize < inventoryItemIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('Shopify API - Bulk inventory data fetched for', Object.keys(inventoryMap).length, 'items across', Math.ceil(inventoryItemIds.length/batchSize), 'batches');
  return inventoryMap;
}

// Optimized function to get products with inventory costs using bulk queries
export async function getProductsWithInventoryCostsBulk(shop: string, accessToken: string, options: { 
  limit?: number;
  fields?: string[];
  since_id?: string;
  page_info?: string;
} = {}) {
  console.log('Shopify API - Getting products with inventory costs (bulk) for shop:', shop)
  
  try {
    // First get products with inventory_item_id
    validateEnvironmentVariables();
    const formattedDomain = formatShopDomain(shop);

    const url = new URL(`https://${formattedDomain}/admin/api/${LATEST_API_VERSION}/products.json`);
    
    // Set limit to maximum allowed (250) unless specified
    const limit = options.limit || 250;
    url.searchParams.set('limit', limit.toString());
    
    // Add pagination parameters
    if (options.since_id) {
      url.searchParams.set('since_id', options.since_id);
    }
    
    if (options.page_info) {
      url.searchParams.set('page_info', options.page_info);
    }
    
    // Include inventory_item_id in the fields
    const fields = [
      'id', 'title', 'handle', 'description', 'tags', 'images',
      'variants', 'variants.id', 'variants.price', 'variants.inventory_quantity',
      'variants.cost_per_item', 'variants.sku', 'variants.inventory_item_id'
    ];
    
    url.searchParams.set('fields', fields.join(','));

    console.log('Shopify API - Making products request to:', url.toString())
    
    const response = await retryWithBackoff(async () => {
      const res = await fetch(url.toString(), {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      console.log('Shopify API - Products response status:', res.status)

      if (!res.ok) {
        console.error('Shopify API - Products error response:', res.statusText)
        throw new Error(`Shopify API Error: ${res.statusText}`);
      }
      
      return res;
    });

    const data = await response.json();
    
    console.log('Shopify API - Total products returned:', data.products.length);
    
    // Collect all unique inventory item IDs
    const inventoryItemIds = new Set<string>();
    
    data.products.forEach((product: any) => {
      product.variants.forEach((variant: any) => {
        if (variant.inventory_item_id) {
          inventoryItemIds.add(variant.inventory_item_id.toString());
        }
      });
    });
    
    const uniqueIds = Array.from(inventoryItemIds);
    console.log('Shopify API - Found', uniqueIds.length, 'unique inventory items to fetch');
    
    // Fetch all inventory costs in one bulk query
    const inventoryMap = await getBulkInventoryCosts(shop, accessToken, uniqueIds);
    
    // Apply inventory costs to products
    const productsWithCosts = data.products.map((product: any) => ({
      ...product,
      variants: product.variants.map((variant: any) => {
        const inventoryData = variant.inventory_item_id ? 
          inventoryMap[variant.inventory_item_id.toString()] : null;
        
        return {
          ...variant,
          inventory_cost: inventoryData?.cost || null,
          inventory_tracked: inventoryData?.tracked || false
        };
      })
    }));
    
    console.log('Shopify API - Successfully applied inventory costs to all products');
    
    return {
      products: productsWithCosts,
      hasNextPage: response.headers.get('link')?.includes('rel="next"') || false,
      nextPageInfo: extractNextPageInfo(response.headers.get('link'))
    };
  } catch (error) {
    console.error('Shopify API - Error:', error)
    throw error;
  }
}

// Simple version without inventory fetching for testing
export async function getProductsWithoutInventoryCosts(shop: string, accessToken: string, options: { 
  limit?: number;
  fields?: string[];
  since_id?: string;
  page_info?: string;
} = {}) {
  console.log('Shopify API - Getting products without inventory costs for shop:', shop)
  
  try {
    // First get products
    validateEnvironmentVariables();
    const formattedDomain = formatShopDomain(shop);

    const url = new URL(`https://${formattedDomain}/admin/api/${LATEST_API_VERSION}/products.json`);
    
    // Set limit to maximum allowed (250) unless specified
    const limit = options.limit || 250;
    url.searchParams.set('limit', limit.toString());
    
    // Add pagination parameters
    if (options.since_id) {
      url.searchParams.set('since_id', options.since_id);
    }
    
    if (options.page_info) {
      url.searchParams.set('page_info', options.page_info);
    }
    
    // Include inventory_item_id in the fields
    const fields = [
      'id', 'title', 'handle', 'description', 'tags', 'images',
      'variants', 'variants.id', 'variants.price', 'variants.inventory_quantity',
      'variants.cost_per_item', 'variants.sku', 'variants.inventory_item_id'
    ];
    
    url.searchParams.set('fields', fields.join(','));

    console.log('Shopify API - Making products request to:', url.toString())
    
    const response = await retryWithBackoff(async () => {
      const res = await fetch(url.toString(), {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      console.log('Shopify API - Products response status:', res.status)

      if (!res.ok) {
        console.error('Shopify API - Products error response:', res.statusText)
        throw new Error(`Shopify API Error: ${res.statusText}`);
      }
      
      return res;
    });

    const data = await response.json();
    
    console.log('Shopify API - Total products returned:', data.products.length);
    
    // Return products without fetching inventory costs
    const productsWithoutCosts = data.products.map((product: any) => ({
      ...product,
      variants: product.variants.map((variant: any) => ({
        ...variant,
        inventory_cost: null,
        inventory_tracked: false
      }))
    }));
    
    console.log('Shopify API - Successfully prepared products without inventory costs');
    
    return {
      products: productsWithoutCosts,
      hasNextPage: response.headers.get('link')?.includes('rel="next"') || false,
      nextPageInfo: extractNextPageInfo(response.headers.get('link'))
    };
  } catch (error) {
    console.error('Shopify API - Error:', error)
    throw error;
  }
}

// Function to get ALL orders with pagination (LAST 30 DAYS)
export async function getAllOrders(shop: string, accessToken: string): Promise<any[]> {
  console.log('Shopify API - Fetching orders for last 30 days using time-based pagination...');
  
  // Calculate date 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const createdAtMin = thirtyDaysAgo.toISOString();
  
  // Set created_at_max to today's date in ISO 8601 format
  const today = new Date();
  const createdAtMax = today.toISOString();
  
  console.log('Shopify API - Will fetch orders for last 30 days');
  console.log('Shopify API - created_at_min (30 days ago):', createdAtMin);
  console.log('Shopify API - created_at_max (today):', createdAtMax);
  
  let allOrders: any[] = [];
  let hasNextPage = true;
  let currentMaxDate = createdAtMax; // Start from today and work backwards
  let pageCount = 0;
  let totalProcessed = 0;
  let oldestOrderDate = '';
  
  while (hasNextPage && pageCount < 100) { // Increased limit to 100 pages to handle 3000+ orders
    pageCount++;
    console.log(`Shopify API - Fetching orders page ${pageCount} (TIME-BASED PAGINATION)...`);
    
    try {
      // Use time-based pagination instead of since_id
      const orders = await getOrders(shop, accessToken, {
        limit: 250,
        status: 'any',
        created_at_min: createdAtMin,
        created_at_max: currentMaxDate
        // NO since_id - this was causing the conflict!
      });
      
      totalProcessed += orders.length;
      console.log(`Shopify API - Page ${pageCount} returned ${orders.length} orders`);
      
      if (orders.length === 0) {
        console.log('Shopify API - No more orders returned, stopping pagination');
        hasNextPage = false;
      } else {
        allOrders.push(...orders);
        
        // Log date range for debugging
        if (orders.length > 0) {
          const firstOrder = orders[0];
          const lastOrder = orders[orders.length - 1];
          oldestOrderDate = lastOrder.created_at;
          console.log(`Shopify API - Page ${pageCount} date range: ${firstOrder.created_at} to ${lastOrder.created_at}`);
        }
        
        // Continue pagination - don't assume < 250 means last page
        if (orders.length < 250) {
          console.log(`Shopify API - Page ${pageCount} returned less than 250 orders (${orders.length}), checking if there are more...`);
        }
        
        // Set up next page by using the oldest order's date as the new max
        if (orders.length > 0) {
          const oldestOrderOnPage = orders[orders.length - 1];
          const oldestDate = new Date(oldestOrderOnPage.created_at);
          
          // Subtract 1 millisecond to avoid getting the same order again
          oldestDate.setMilliseconds(oldestDate.getMilliseconds() - 1);
          currentMaxDate = oldestDate.toISOString();
          
          console.log(`Shopify API - Next page will start before: ${currentMaxDate}`);
          
          // If the new max date is before our minimum date, we're done
          if (oldestDate <= new Date(createdAtMin)) {
            console.log('Shopify API - Reached the minimum date, stopping pagination');
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }
        
        console.log(`Shopify API - Orders page ${pageCount}: ${orders.length} orders (Total so far: ${allOrders.length})`);
      }
      
      // Add delay between pages
      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
    } catch (error) {
      console.error(`Shopify API - Error on orders page ${pageCount}:`, error);
      throw error;
    }
  }
  
  if (pageCount >= 100) {
    console.log('Shopify API - WARNING: Hit pagination safety limit (100 pages). There may be more orders.');
  }
  
  console.log(`Shopify API - RESULTS:`);
  console.log(`Shopify API - Total orders fetched for last 30 days: ${allOrders.length}`);
  console.log(`Shopify API - Pages processed: ${pageCount}`);
  console.log(`Shopify API - Date range: ${createdAtMin} to ${createdAtMax}`);
  if (oldestOrderDate) {
    console.log(`Shopify API - Actual date range in data: ${oldestOrderDate} to ${allOrders[0]?.created_at}`);
  }
  
  // Return all orders (already filtered by date parameters)
  return allOrders;
}

export async function getAllProducts(shop: string, accessToken: string): Promise<any[]> {
  console.log('Shopify API - Starting to fetch all products with basic data only');
  
  let allProducts: any[] = [];
  let hasNextPage = true;
  let endCursor: string | null = null;
  let pageCount = 0;

  while (hasNextPage) {
    pageCount++;
    console.log(`Shopify API - Fetching page ${pageCount}...`);

    const query = `
      query getProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              handle
              status
              createdAt
              updatedAt
              images(first: 1) {
                edges {
                  node {
                    src
                    altText
                  }
                }
              }
              variants(first: 250) {
                edges {
                  node {
                    id
                    price
                    sku
                    inventoryQuantity
                    inventoryItem {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables: { first: number; after: string | null } = {
      first: 250,
      after: endCursor
    };

    try {
      const result: any = await retryWithBackoff(async (): Promise<any> => {
        validateEnvironmentVariables();
        const formattedDomain = formatShopDomain(shop);
        
        const url = `https://${formattedDomain}/admin/api/${LATEST_API_VERSION}/graphql.json`;
        
        const response: Response = await fetch(url, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            variables
          })
        });

        if (!response.ok) {
          console.error('Shopify API - GraphQL error response:', response.statusText)
          throw new Error(`Shopify API Error: ${response.statusText}`);
        }

        return await response.json();
      });

      if (result.errors) {
        console.error('Shopify API - GraphQL errors:', result.errors);
        throw new Error(`GraphQL Error: ${result.errors.map((e: any) => e.message).join(', ')}`);
      }

      const products = result.data.products.edges.map((edge: any) => edge.node);
      allProducts = allProducts.concat(products);

      console.log(`Shopify API - Page ${pageCount}: ${products.length} products (Total: ${allProducts.length})`);

      hasNextPage = result.data.products.pageInfo.hasNextPage;
      endCursor = result.data.products.pageInfo.endCursor;

    } catch (error) {
      console.error(`Shopify API - Error fetching page ${pageCount}:`, error);
      throw error;
    }
  }

  console.log(`Shopify API - Completed! Fetched ${allProducts.length} products across ${pageCount} pages`);
  
  // Transform to include basic inventory_cost as 0 (will be fetched individually per page)
  const transformedProducts = allProducts.map((product: any) => {
    const transformedVariants = product.variants.edges.map((variantEdge: any) => {
      const variant = variantEdge.node;
      return {
        ...variant,
        inventory_cost: 0, // Default to 0, will be fetched individually
        inventory_tracked: false,
        cost_per_item: undefined // Legacy field
      };
    });

    return {
      ...product,
      variants: transformedVariants
    };
  });

  console.log('Shopify API - Successfully prepared products with basic data (cost data to be fetched per page)');
  return transformedProducts;
}

// New function to fetch cost data for specific products on a page
export async function getProductsCostData(shop: string, accessToken: string, productIds: string[]): Promise<Record<string, number>> {
  console.log(`Shopify API - Fetching cost data for ${productIds.length} products on current page`);
  
  const costMap: Record<string, number> = {};

  // Process products in small batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < productIds.length; i += batchSize) {
    const batch = productIds.slice(i, i + batchSize);
    console.log(`Shopify API - Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(productIds.length/batchSize)} (${batch.length} products)`);

    // Create individual queries for each product to get cost data
    const promises = batch.map(async (productId: string) => {
      const query = `
        query getProductCost($id: ID!) {
          product(id: $id) {
            id
            variants(first: 1) {
              edges {
                node {
                  id
                  inventoryItem {
                    id
                    unitCost {
                      amount
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const variables: { id: string } = { id: `gid://shopify/Product/${productId}` };

      try {
        const result: any = await retryWithBackoff(async (): Promise<any> => {
          validateEnvironmentVariables();
          const formattedDomain = formatShopDomain(shop);
          
          const url = `https://${formattedDomain}/admin/api/${LATEST_API_VERSION}/graphql.json`;
          
          const response: Response = await fetch(url, {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              variables
            })
          });

          if (!response.ok) {
            console.error(`Shopify API - GraphQL error for product ${productId}:`, response.statusText)
            throw new Error(`Shopify API Error: ${response.statusText}`);
          }

          return await response.json();
        });

        if (result.errors) {
          console.log(`Shopify API - GraphQL errors for product ${productId}:`, result.errors);
          return { productId, cost: 0 };
        }

        const product = result.data?.product;
        if (product && product.variants.edges.length > 0) {
          const firstVariant = product.variants.edges[0].node;
          const unitCost = firstVariant.inventoryItem?.unitCost?.amount || '0';
          const cost = parseFloat(unitCost) || 0;
          
          if (cost > 0) {
            console.log(`Shopify API - Product ${productId}: Found cost $${cost}`);
          }
          
          return { productId, cost };
        }

        return { productId, cost: 0 };

      } catch (error) {
        console.error(`Shopify API - Error fetching cost for product ${productId}:`, error);
        return { productId, cost: 0 };
      }
    });

    // Wait for batch to complete
    const batchResults = await Promise.all(promises);
    
    // Add results to cost map
    batchResults.forEach(({ productId, cost }: { productId: string, cost: number }) => {
      costMap[productId] = cost;
    });

    // Small delay between batches to be respectful to the API
    if (i + batchSize < productIds.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`Shopify API - Successfully fetched cost data for ${Object.keys(costMap).length} products`);
  return costMap;
}

// Function to get counts only (lighter weight for metrics)
export async function getCounts(shop: string, accessToken: string): Promise<{
  totalOrders: number;
  totalProducts: number;
}> {
  console.log('Shopify API - Getting total counts...');
  
  // Start both counts in parallel
  const [ordersCount, productsCount] = await Promise.all([
    getOrdersCount(shop, accessToken),
    getProductsCount(shop, accessToken)
  ]);
  
  return {
    totalOrders: ordersCount,
    totalProducts: productsCount
  };
}

// Helper function to count orders by fetching all pages (but only counting)
async function getOrdersCount(shop: string, accessToken: string): Promise<number> {
  let totalCount = 0;
  let hasNextPage = true;
  let sinceId: string | undefined;
  
  while (hasNextPage) {
    const orders = await getOrders(shop, accessToken, {
      limit: 250,
      status: 'any',
      since_id: sinceId
    });
    
    totalCount += orders.length;
    
    if (orders.length < 250) {
      hasNextPage = false;
    } else {
      sinceId = orders[orders.length - 1].id;
    }
    
    // Small delay between requests
    if (hasNextPage) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return totalCount;
}

// Helper function to count products by fetching all pages (but only counting)
async function getProductsCount(shop: string, accessToken: string): Promise<number> {
  let totalCount = 0;
  let hasNextPage = true;
  let sinceId: string | undefined;
  
  while (hasNextPage) {
    const products = await getProducts(shop, accessToken, {
      limit: 250,
      since_id: sinceId,
      fields: ['id'] // Only fetch ID to minimize data transfer
    });
    
    totalCount += products.length;
    
    if (products.length < 250) {
      hasNextPage = false;
    } else {
      sinceId = products[products.length - 1].id;
    }
    
    // Small delay between requests  
    if (hasNextPage) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return totalCount;
} 