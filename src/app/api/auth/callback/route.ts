import { NextRequest, NextResponse } from 'next/server';
import { formatShopDomain, isValidShopDomain } from '@/lib/shopify.config';
import { prisma } from '@/lib/prisma';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  console.log('Shopify Callback API - GET request received')
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    console.log('Shopify Callback API - Parameters:', { shop, code: code ? '[REDACTED]' : null, state })

    if (!shop || !code || !state) {
      console.log('Shopify Callback API - Missing required parameters')
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (!isValidShopDomain(shop)) {
      console.log('Shopify Callback API - Invalid shop domain')
      return NextResponse.json(
        { error: 'Invalid shop domain' },
        { status: 400 }
      );
    }

    console.log('Shopify Callback API - Exchanging code for access token')
    // Exchange the authorization code for an access token
    const accessTokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_APP_API_KEY,
        client_secret: process.env.SHOPIFY_APP_SECRET,
        code,
      }),
    });

    console.log('Shopify Callback API - Access token response status:', accessTokenResponse.status)

    if (!accessTokenResponse.ok) {
      console.error('Shopify Callback API - Failed to get access token')
      throw new Error('Failed to get access token');
    }

    const { access_token } = await accessTokenResponse.json();
    console.log('Shopify Callback API - Successfully obtained access token')

    // Store the access token in the database
    const formattedDomain = formatShopDomain(shop);
    console.log('Shopify Callback API - Formatted domain:', formattedDomain)
    
    // Check if store already exists
    console.log('Shopify Callback API - Checking if store exists')
    const existingStore = await prisma.store.findUnique({
      where: { domain: formattedDomain }
    });

    if (existingStore) {
      console.log('Shopify Callback API - Updating existing store')
      // Update existing store
      await prisma.store.update({
        where: { domain: formattedDomain },
        data: {
          accessToken: access_token,
          updatedAt: new Date()
        }
      });
    } else {
      console.log('Shopify Callback API - Creating new store')
      // Create new store
      await prisma.store.create({
        data: {
          name: formattedDomain.split('.')[0], // Use the subdomain as the store name
          domain: formattedDomain,
          accessToken: access_token
        }
      });
    }

    console.log('Shopify Callback API - Redirecting to app')
    // Redirect to the app with success message
    const appUrl = new URL('/settings', request.url);
    appUrl.searchParams.set('success', 'true');
    return NextResponse.redirect(appUrl);
  } catch (error) {
    console.error('Shopify Callback API - Error:', error)
    // Redirect to the app with error message
    const appUrl = new URL('/settings', request.url);
    appUrl.searchParams.set('error', 'Failed to authenticate with Shopify');
    return NextResponse.redirect(appUrl);
  }
} 