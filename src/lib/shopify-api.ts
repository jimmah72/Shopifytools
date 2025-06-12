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
    
    if (options.fields) {
      url.searchParams.set('fields', options.fields.join(','));
    }

    console.log('Shopify API - Making request to:', url.toString())
    const response = await fetch(url.toString(), {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    console.log('Shopify API - Response status:', response.status)

    if (!response.ok) {
      console.error('Shopify API - Error response:', response.statusText)
      throw new Error(`Shopify API Error: ${response.statusText}`);
    }

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
  
  try {
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
  } catch (error) {
    console.error('Shopify API - Error:', error)
    throw error;
  }
}

export async function getInventoryItem(shop: string, accessToken: string, inventoryItemId: string) {
  console.log('Shopify API - Getting inventory item:', inventoryItemId)
  
  try {
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
  } catch (error) {
    console.error('Shopify API - Inventory error:', error)
    throw error;
  }
}

export async function getProductsWithInventoryCosts(shop: string, accessToken: string, options: { 
  limit?: number;
  fields?: string[];
} = {}) {
  console.log('Shopify API - Getting products with inventory costs for shop:', shop)
  
  try {
    // First get products with inventory_item_id
    validateEnvironmentVariables();
    const formattedDomain = formatShopDomain(shop);

    const url = new URL(`https://${formattedDomain}/admin/api/${LATEST_API_VERSION}/products.json`);
    
    if (options.limit) {
      url.searchParams.set('limit', options.limit.toString());
    }
    
    // Include inventory_item_id in the fields
    const fields = [
      'id', 'title', 'handle', 'description', 'tags', 'images',
      'variants', 'variants.id', 'variants.price', 'variants.inventory_quantity',
      'variants.cost_per_item', 'variants.sku', 'variants.inventory_item_id'
    ];
    
    url.searchParams.set('fields', fields.join(','));

    console.log('Shopify API - Making products request to:', url.toString())
    const response = await fetch(url.toString(), {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    console.log('Shopify API - Products response status:', response.status)

    if (!response.ok) {
      console.error('Shopify API - Products error response:', response.statusText)
      throw new Error(`Shopify API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('Shopify API - Total products returned:', data.products.length);
    
    // Now fetch inventory costs for each variant with rate limiting
    const productsWithCosts = [];
    
    for (const product of data.products) {
      const variantsWithCosts = [];
      
      for (const variant of product.variants) {
        if (variant.inventory_item_id) {
          try {
            const inventoryItem = await getInventoryItem(shop, accessToken, variant.inventory_item_id);
            variantsWithCosts.push({
              ...variant,
              inventory_cost: inventoryItem?.cost,
              inventory_tracked: inventoryItem?.tracked
            });
            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Failed to get inventory for variant ${variant.id}:`, error);
            variantsWithCosts.push({
              ...variant,
              inventory_cost: null,
              inventory_tracked: false
            });
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
    return productsWithCosts;
  } catch (error) {
    console.error('Shopify API - Error:', error)
    throw error;
  }
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
    const response = await fetch(url.toString(), {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    console.log('Shopify API - Orders response status:', response.status)

    if (!response.ok) {
      console.error('Shopify API - Orders error response:', response.statusText)
      throw new Error(`Shopify API Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Shopify API - Total orders returned:', data.orders.length);
    console.log('Shopify API - Successfully fetched orders')
    return data.orders;
  } catch (error) {
    console.error('Shopify API - Orders error:', error)
    throw error;
  }
} 