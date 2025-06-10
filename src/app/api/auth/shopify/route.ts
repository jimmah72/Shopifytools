import { NextRequest, NextResponse } from 'next/server';
import { generateInstallUrl, isValidShopDomain, formatShopDomain } from '@/lib/shopify';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      );
    }

    if (!isValidShopDomain(shop)) {
      return NextResponse.json(
        { error: 'Invalid shop domain' },
        { status: 400 }
      );
    }

    const installUrl = await generateInstallUrl(shop);
    
    return NextResponse.redirect(installUrl);
  } catch (error) {
    console.error('Error in Shopify auth:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initialize Shopify authentication',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 