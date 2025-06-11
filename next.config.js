/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable edge runtime where needed
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        process.env.RENDER_EXTERNAL_URL || '',
      ],
    },
  },
  // Add Shopify CDN domain for images
  images: {
    domains: ['cdn.shopify.com'],
    unoptimized: true, // For Render deployment
  },
  // Ensure proper environment for Shopify API
  env: {
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_STOREFRONT_ACCESS_TOKEN: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
  },
  // Configure for Netlify deployment
  output: 'standalone',
  sassOptions: {
    includePaths: ['./src/styles'],
  },
};

module.exports = nextConfig; 