# ShopifyTools - Profit Analytics Dashboard

A Next.js application for tracking and analyzing Shopify store profits, including orders, products, shipping costs, transaction fees, and ad spend across multiple platforms.

## Features

- 📊 Comprehensive profit tracking
- 🏪 Shopify integration
- 💰 Ad spend tracking (Facebook, Google, TikTok)
- 📈 Advanced analytics and reporting
- 🌓 Dark mode support
- 🔐 Secure authentication

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Next Auth
- Shopify Admin API

## Prerequisites

- Node.js 20.11.0 or later
- npm 10.2.4 or later
- PostgreSQL database
- Shopify Partner account
- Ad platform developer accounts (for ad spend tracking)

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/shopifytools.git
   cd shopifytools
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/shopifytools"

   # Next Auth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-nextauth-secret"

   # Shopify
   SHOPIFY_APP_API_KEY="your-app-api-key"
   SHOPIFY_APP_SECRET="your-app-secret"
   SHOPIFY_APP_HOST_NAME="localhost:3000"
   ```

4. Initialize the database:
   ```bash
   npx prisma db push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

### Render Deployment

1. Fork this repository
2. Create a new Web Service in Render
3. Connect your GitHub repository
4. Add the following environment variables in Render dashboard:
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `SHOPIFY_APP_API_KEY`
   - `SHOPIFY_APP_SECRET`
   - `SHOPIFY_APP_HOST_NAME`
5. Deploy

### Netlify Deployment

1. Fork this repository
2. Create a new site in Netlify
3. Connect your GitHub repository
4. Add the following environment variables in Netlify dashboard:
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `SHOPIFY_APP_API_KEY`
   - `SHOPIFY_APP_SECRET`
   - `SHOPIFY_APP_HOST_NAME`
5. Deploy

## Database Schema

The application uses a comprehensive data model including:
- Stores
- Orders
- Products
- Customers
- Order Items
- Ad Spend tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For support, please open an issue in the GitHub repository.
