import { LATEST_API_VERSION } from '@shopify/shopify-api';
import { formatShopDomain, isValidShopDomain, callShopifyApi } from './shopify.config';

// Re-export the utility functions
export { formatShopDomain, isValidShopDomain };

// Check required environment variables
const requiredEnvVars = {
  SHOPIFY_APP_API_KEY: process.env.SHOPIFY_APP_API_KEY,
  SHOPIFY_APP_SECRET: process.env.SHOPIFY_APP_SECRET,
  SHOPIFY_APP_HOST_NAME: process.env.SHOPIFY_APP_HOST_NAME || 'http://localhost:3000',
};

// Validate environment variables
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    console.warn(`Missing required environment variable: ${key}`);
  }
});

// Function to generate installation URL
export const generateInstallUrl = async (shop: string, request: Request) => {
  const domain = formatShopDomain(shop);
  if (!isValidShopDomain(domain)) {
    throw new Error('Invalid shop domain');
  }

  const scopes = [
    'read_products',
    'read_orders',
    'read_customers',
    'read_inventory',
    'read_shipping',
    'read_fulfillments',
    'read_assigned_fulfillment_orders',
    'read_merchant_managed_fulfillment_orders',
    'read_third_party_fulfillment_orders'
  ].join(',');

  // Get the protocol and host from the request URL
  const requestUrl = new URL(request.url);
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? requiredEnvVars.SHOPIFY_APP_HOST_NAME 
    : `${requestUrl.protocol}//${requestUrl.host}`;

  const redirectUri = `${baseUrl}/api/auth/callback`;
  const nonce = Math.random().toString(36).substring(2);

  const installUrl = new URL(`https://${domain}/admin/oauth/authorize`);
  installUrl.searchParams.set('client_id', requiredEnvVars.SHOPIFY_APP_API_KEY!);
  installUrl.searchParams.set('scope', scopes);
  installUrl.searchParams.set('redirect_uri', redirectUri);
  installUrl.searchParams.set('state', nonce);

  return installUrl.toString();
};

// Types for Shopify data
export interface ShopifyOrder {
  id: string;
  order_number: string;
  created_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_shipping_price_set: {
    shop_money: {
      amount: string;
    };
  };
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  line_items: Array<{
    id: string;
    product_id: string;
    variant_id: string;
    title: string;
    quantity: number;
    price: string;
  }>;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  tags: string[];
  images: Array<{
    src: string;
    alt?: string;
  }>;
  variants: Array<{
    id: string;
    price: string;
    inventory_quantity: number;
    cost_per_item: string;
    sku?: string;
  }>;
}

// Function to fetch orders with pagination
export const fetchOrders = async (shop: string, accessToken: string, params: { 
  limit?: number; 
  since_id?: string;
  created_at_min?: string;
  created_at_max?: string;
}) => {
  const queryString = new URLSearchParams(params as Record<string, string>).toString();
  return callShopifyApi(shop, accessToken, `/orders.json${queryString ? `?${queryString}` : ''}`);
};

// Function to fetch products with pagination
export const getProducts = async (shop: string, accessToken: string, params: {
  limit?: number;
  since_id?: string;
  fields?: string[];
  collection_id?: string;
  handle?: string;
} = {}) => {
  try {
    const queryParams: Record<string, string> = {};
    
    if (params.limit) queryParams.limit = params.limit.toString();
    if (params.since_id) queryParams.since_id = params.since_id;
    if (params.fields) queryParams.fields = params.fields.join(',');
    if (params.collection_id) queryParams.collection_id = params.collection_id;
    if (params.handle) queryParams.handle = params.handle;
    
    const queryString = new URLSearchParams(queryParams).toString();
    const response = await callShopifyApi(shop, accessToken, `/products.json${queryString ? `?${queryString}` : ''}`);
    
    return response.products;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// Function to get a single product by ID
export const getProductById = async (shop: string, accessToken: string, id: string) => {
  return callShopifyApi(shop, accessToken, `/products/${id}.json`);
};

// Function to get a single product by handle
export const getProductByHandle = async (shop: string, accessToken: string, handle: string) => {
  const response = await callShopifyApi(shop, accessToken, `/products.json?handle=${handle}`);
  return response.products[0] || null;
};

// Function to get a product by handle (alias for getProductByHandle)
export const getProduct = async (shop: string, accessToken: string, handle: string) => {
  return getProductByHandle(shop, accessToken, handle);
}; 