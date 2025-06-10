import { AdminApiClient } from '@shopify/admin-api-client';
import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';

// Initialize the Shopify API client
export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_APP_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_APP_SECRET!,
  scopes: [
    'read_products',
    'read_orders',
    'read_customers',
    'read_inventory',
    'read_shipping',
    'read_fulfillments',
    'read_assigned_fulfillment_orders',
    'read_merchant_managed_fulfillment_orders',
    'read_third_party_fulfillment_orders'
  ],
  hostName: process.env.SHOPIFY_APP_HOST_NAME || 'localhost:3000',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
});

// Create an admin client for a specific shop
export const createAdminClient = (shop: string, accessToken: string) => {
  return new AdminApiClient({
    accessToken,
    storeDomain: shop,
  });
};

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
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(domain);
};

// Function to generate installation URL
export const generateInstallUrl = (shop: string) => {
  const domain = formatShopDomain(shop);
  if (!isValidShopDomain(domain)) {
    throw new Error('Invalid shop domain');
  }

  return shopify.auth.begin({
    shop: domain,
    callbackPath: '/api/auth/callback',
    isOnline: true,
  });
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
  description: string;
  variants: Array<{
    id: string;
    price: string;
    inventory_quantity: number;
    cost_per_item: string;
  }>;
}

// Function to fetch orders with pagination
export const fetchOrders = async (client: AdminApiClient, params: { 
  limit?: number; 
  since_id?: string;
  created_at_min?: string;
  created_at_max?: string;
}) => {
  const response = await client.request(
    `query($limit: Int, $since_id: ID, $created_at_min: DateTime, $created_at_max: DateTime) {
      orders(first: $limit, since_id: $since_id, query: "created_at:>='$created_at_min' AND created_at:<='$created_at_max'") {
        edges {
          node {
            id
            name
            createdAt
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            subtotalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            totalShippingPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            totalTaxSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            customer {
              id
              firstName
              lastName
              email
            }
            lineItems(first: 50) {
              edges {
                node {
                  id
                  quantity
                  variant {
                    id
                    price
                    inventoryQuantity
                    product {
                      id
                      title
                    }
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`,
    {
      variables: {
        limit: params.limit || 50,
        since_id: params.since_id,
        created_at_min: params.created_at_min,
        created_at_max: params.created_at_max,
      },
    }
  );

  return response;
};

// Function to fetch products with pagination
export const fetchProducts = async (client: AdminApiClient, params: {
  limit?: number;
  since_id?: string;
}) => {
  const response = await client.request(
    `query($limit: Int, $since_id: ID) {
      products(first: $limit, since_id: $since_id) {
        edges {
          node {
            id
            title
            description
            variants(first: 1) {
              edges {
                node {
                  id
                  price
                  inventoryQuantity
                  inventoryItem {
                    unitCost {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`,
    {
      variables: {
        limit: params.limit || 50,
        since_id: params.since_id,
      },
    }
  );

  return response;
}; 