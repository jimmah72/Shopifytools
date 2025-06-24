/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable edge runtime where needed
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        process.env.RENDER_EXTERNAL_URL || '',
        process.env.URL || '', // Netlify URL
        process.env.DEPLOY_PRIME_URL || '', // Netlify deploy preview URL
      ],
    },
  },
  // Add Shopify CDN domain for images
  images: {
    domains: ['cdn.shopify.com'],
    unoptimized: process.env.NETLIFY === 'true' || true, // Support both Netlify and Render
  },
  // Ensure proper environment for Shopify API
  env: {
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN || 'your-store.myshopify.com',
    SHOPIFY_STOREFRONT_ACCESS_TOKEN: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || 'your-storefront-access-token',
  },
  // Configure for Netlify deployment
  // Remove standalone for Netlify - let the plugin handle it
  sassOptions: {
    includePaths: ['./src/styles'],
  },
  // Disable static page generation for API routes and dynamic pages
  staticPageGenerationTimeout: 1000,
};

module.exports = nextConfig; 