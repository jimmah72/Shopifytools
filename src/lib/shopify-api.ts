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
    console.log('Shopify API - Product data sample:', {
      firstProduct: data.products[0] ? {
        id: data.products[0].id,
        title: data.products[0].title,
        firstVariant: data.products[0].variants[0] ? {
          id: data.products[0].variants[0].id,
          cost_per_item: data.products[0].variants[0].cost_per_item
        } : null
      } : null
    });
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