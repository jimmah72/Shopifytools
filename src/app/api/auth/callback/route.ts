import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const shop = searchParams.get('shop');
    const code = searchParams.get('code');

    if (!shop || !code) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Complete OAuth process
    const { accessToken, scope } = await shopify.auth.callback({
      rawRequest: request,
    });

    // Store or update the shop in the database
    const store = await prisma.store.upsert({
      where: { domain: shop },
      update: { 
        accessToken,
        updatedAt: new Date()
      },
      create: {
        domain: shop,
        name: shop.split('.')[0],
        accessToken,
      },
    });

    // Redirect to the dashboard with success message
    const redirectUrl = new URL('/dashboard', request.url);
    redirectUrl.searchParams.set('success', 'true');
    redirectUrl.searchParams.set('shop', shop);
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in Shopify callback:', error);
    
    // Redirect to the dashboard with error message
    const redirectUrl = new URL('/dashboard', request.url);
    redirectUrl.searchParams.set('error', 'Failed to authenticate with Shopify');
    
    return NextResponse.redirect(redirectUrl);
  }
} 