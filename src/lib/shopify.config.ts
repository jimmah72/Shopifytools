import { LATEST_API_VERSION } from '@shopify/shopify-api';

// Helper function to format shop domain
export const formatShopDomain = (shop: string) => {
  // Remove protocol if present
  let domain = shop.replace(/^https?:\/\//, '');
  
  // Add .myshopify.com if not present
  if (!domain.includes('myshopify.com')) {
    domain = `${domain}.myshopify.com`;
  }
  
  return domain;
};

// Function to validate shop domain
export const isValidShopDomain = (shop: string) => {
  const domain = formatShopDomain(shop);
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify.com$/.test(domain);
};

// Helper function for making REST API calls
export async function callShopifyApi(shop: string, accessToken: string, endpoint: string, method = 'GET', data?: any) {
  const formattedDomain = formatShopDomain(shop);
  const url = `https://${formattedDomain}/admin/api/${LATEST_API_VERSION}${endpoint}`;
  
  console.log('Shopify API - Making request to:', url);
  
  const options: RequestInit = {
    method,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    console.error('Shopify API - Error response:', response.statusText);
    throw new Error(`Shopify API Error: ${response.statusText}`);
  }

  return response.json();
}

// Helper function for making GraphQL queries
export async function queryShopify(shop: string, accessToken: string, query: string, variables = {}) {
  const response = await callShopifyApi(
    shop,
    accessToken,
    '/graphql.json',
    'POST',
    { query, variables }
  );

  if (response.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(response.errors)}`);
  }

  return response.data;
} 