import { NextRequest, NextResponse } from 'next/server';
import { formatShopDomain, isValidShopDomain } from '@/lib/shopify.config';
import { prisma } from '@/lib/prisma';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!shop || !code || !state) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (!isValidShopDomain(shop)) {
      return NextResponse.json(
        { error: 'Invalid shop domain' },
        { status: 400 }
      );
    }

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

    if (!accessTokenResponse.ok) {
      throw new Error('Failed to get access token');
    }

    const { access_token } = await accessTokenResponse.json();

    // Store the access token in the database
    const formattedDomain = formatShopDomain(shop);
    
    // Check if store already exists
    const existingStore = await prisma.store.findUnique({
      where: { domain: formattedDomain }
    });

    if (existingStore) {
      // Update existing store
      await prisma.store.update({
        where: { domain: formattedDomain },
        data: {
          accessToken: access_token,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new store
      await prisma.store.create({
        data: {
          name: formattedDomain.split('.')[0], // Use the subdomain as the store name
          domain: formattedDomain,
          accessToken: access_token
        }
      });
    }

    // Redirect to the app with success message
    const appUrl = new URL('/settings', request.url);
    appUrl.searchParams.set('shop', shop);
    appUrl.searchParams.set('success', 'true');
    
    return NextResponse.redirect(appUrl);
  } catch (error) {
    console.error('Error in auth callback:', error);
    
    // Redirect to settings with error
    const errorUrl = new URL('/settings', request.url);
    errorUrl.searchParams.set('error', 'Authentication failed. Please try again.');
    
    return NextResponse.redirect(errorUrl);
  }
} 