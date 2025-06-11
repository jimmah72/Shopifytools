/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable edge runtime where needed
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        process.env.NEXT_PUBLIC_VERCEL_URL || '',
      ],
    },
  },
  // Add Shopify CDN domain for images
  images: {
    domains: ['cdn.shopify.com'],
  },
  // Ensure proper environment for Shopify API
  env: {
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN || 'your-store.myshopify.com',
    SHOPIFY_STOREFRONT_ACCESS_TOKEN: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || 'your-storefront-access-token',
  },
  // Enable static export for Netlify
  target: process.env.NETLIFY ? 'serverless' : 'server',
  sassOptions: {
    includePaths: ['./src/styles'],
  },
};

module.exports = nextConfig; 