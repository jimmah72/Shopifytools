import { NextRequest, NextResponse } from 'next/server';
import { generateInstallUrl, isValidShopDomain, formatShopDomain } from '@/lib/shopify';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  console.log('Shopify Auth API - GET request received')
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');
    console.log('Shopify Auth API - Shop parameter:', shop)

    if (!shop) {
      console.log('Shopify Auth API - Missing shop parameter')
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      );
    }

    const formattedDomain = formatShopDomain(shop);
    console.log('Shopify Auth API - Formatted domain:', formattedDomain)

    if (!isValidShopDomain(formattedDomain)) {
      console.log('Shopify Auth API - Invalid shop domain')
      return NextResponse.json(
        { error: 'Invalid shop domain' },
        { status: 400 }
      );
    }

    // Generate the installation URL
    console.log('Shopify Auth API - Generating install URL')
    const authUrl = await generateInstallUrl(formattedDomain, request);
    console.log('Shopify Auth API - Generated auth URL:', authUrl)

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Shopify Auth API - Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
} 