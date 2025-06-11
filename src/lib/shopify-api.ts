import { LATEST_API_VERSION } from '@shopify/shopify-api';

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

export async function getProducts(shop: string, accessToken: string, options: { limit?: number } = {}) {
  console.log('Shopify API - Getting products for shop:', shop)
  
  try {
    // Only check environment variables when the function is actually called
    validateEnvironmentVariables();

    const url = new URL(`https://${shop}/admin/api/${LATEST_API_VERSION}/products.json`);
    
    if (options.limit) {
      url.searchParams.set('limit', options.limit.toString());
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
    console.log('Shopify API - Successfully fetched products')
    return data.products;
  } catch (error) {
    console.error('Shopify API - Error:', error)
    throw error;
  }
} 