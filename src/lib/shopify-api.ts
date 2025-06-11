import { LATEST_API_VERSION } from '@shopify/shopify-api';

function validateEnvironmentVariables() {
  const requiredEnvVars = {
    SHOPIFY_APP_API_KEY: process.env.SHOPIFY_APP_API_KEY,
    SHOPIFY_APP_SECRET: process.env.SHOPIFY_APP_SECRET,
  };

  // Validate environment variables
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  });
}

export async function getProducts(shop: string, accessToken: string, options: { limit?: number } = {}) {
  // Only check environment variables when the function is actually called
  validateEnvironmentVariables();

  const url = new URL(`https://${shop}/admin/api/${LATEST_API_VERSION}/products.json`);
  
  if (options.limit) {
    url.searchParams.set('limit', options.limit.toString());
  }

  const response = await fetch(url.toString(), {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify API Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.products;
} 