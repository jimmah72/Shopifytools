import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mark route as dynamic
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Expected webhook data structure
interface AdSpendWebhookData {
  // Authentication
  apiKey: string
  
  // Store identification
  storeDomain: string
  
  // Platform and account info
  platform: 'google_ads' | 'facebook_ads' | 'tiktok_ads' | 'snapchat_ads'
  accountId?: string
  accountName?: string
  
  // Campaign hierarchy
  campaignId?: string
  campaignName?: string
  adsetId?: string
  adsetName?: string
  adId?: string
  adName?: string
  
  // Performance metrics (required)
  spend: number
  date: string // YYYY-MM-DD format
  
  // Performance metrics (optional)
  impressions?: number
  clicks?: number
  conversions?: number
  conversionValue?: number
  
  // Attribution tracking (UTM parameters)
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
  
  // Metadata
  currency?: string
  timezone?: string
  
  // Raw data from platform (optional, for debugging)
  rawData?: any
}

// Calculate derived metrics
function calculateMetrics(data: AdSpendWebhookData) {
  const metrics: any = {}
  
  // Cost per click
  if (data.clicks && data.clicks > 0) {
    metrics.cpc = data.spend / data.clicks
  }
  
  // Cost per mille (impressions)
  if (data.impressions && data.impressions > 0) {
    metrics.cpm = (data.spend / data.impressions) * 1000
  }
  
  // Click-through rate
  if (data.impressions && data.clicks && data.impressions > 0) {
    metrics.ctr = data.clicks / data.impressions
  }
  
  // Return on ad spend
  if (data.conversionValue && data.spend > 0) {
    metrics.roas = data.conversionValue / data.spend
  }
  
  return metrics
}

export async function POST(request: NextRequest) {
  try {
    const data: AdSpendWebhookData = await request.json()
    
    console.log('🔗 Ad Spend Webhook received data:', {
      platform: data.platform,
      storeDomain: data.storeDomain,
      spend: data.spend,
      date: data.date,
      campaignName: data.campaignName
    })
    
    // 1. Validate API key
    const expectedApiKey = process.env.N8N_WEBHOOK_API_KEY || 'shopify-tools-webhook-2025'
    if (!data.apiKey || data.apiKey !== expectedApiKey) {
      console.error('❌ Invalid API key provided')
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }
    
    // 2. Validate required fields
    if (!data.storeDomain || !data.platform || !data.spend || !data.date) {
      console.error('❌ Missing required fields:', { 
        storeDomain: !!data.storeDomain,
        platform: !!data.platform,
        spend: !!data.spend,
        date: !!data.date
      })
      return NextResponse.json(
        { error: 'Missing required fields: storeDomain, platform, spend, date' },
        { status: 400 }
      )
    }
    
    // 3. Find store by domain
    const store = await prisma.store.findUnique({
      where: { domain: data.storeDomain }
    })
    
    if (!store) {
      console.error('❌ Store not found:', data.storeDomain)
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }
    
    // 4. Parse and validate date
    let parsedDate: Date
    try {
      parsedDate = new Date(data.date + 'T00:00:00.000Z') // Ensure UTC
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date')
      }
    } catch (error) {
      console.error('❌ Invalid date format:', data.date)
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }
    
    // 5. Calculate derived metrics
    const calculatedMetrics = calculateMetrics(data)
    
    // 6. Prepare upsert data
    const adSpendData = {
      storeId: store.id,
      platform: data.platform,
      accountId: data.accountId || undefined,
      accountName: data.accountName || undefined,
      campaignId: data.campaignId || undefined,
      campaignName: data.campaignName || undefined,
      adsetId: data.adsetId || undefined,
      adsetName: data.adsetName || undefined,
      adId: data.adId || undefined,
      adName: data.adName || undefined,
      spend: data.spend,
      impressions: data.impressions || 0,
      clicks: data.clicks || 0,
      conversions: data.conversions || 0,
      conversionValue: data.conversionValue || 0,
      utmSource: data.utmSource || undefined,
      utmMedium: data.utmMedium || undefined,
      utmCampaign: data.utmCampaign || undefined,
      utmTerm: data.utmTerm || undefined,
      utmContent: data.utmContent || undefined,
      cpc: calculatedMetrics.cpc || undefined,
      cpm: calculatedMetrics.cpm || undefined,
      ctr: calculatedMetrics.ctr || undefined,
      roas: calculatedMetrics.roas || undefined,
      date: parsedDate,
      currency: data.currency || 'USD',
      timezone: data.timezone || undefined,
      dataSource: 'n8n_webhook',
      rawData: data.rawData || undefined,
    }
    
    // 7. Upsert ad spend record (prevent duplicates)
    const adSpend = await prisma.adSpend.upsert({
      where: {
        storeId_platform_campaignId_adsetId_date: {
          storeId: store.id,
          platform: data.platform,
          campaignId: data.campaignId || '',
          adsetId: data.adsetId || '',
          date: parsedDate
        }
      },
      update: {
        spend: data.spend,
        impressions: data.impressions || 0,
        clicks: data.clicks || 0,
        conversions: data.conversions || 0,
        conversionValue: data.conversionValue || 0,
        accountId: data.accountId,
        accountName: data.accountName,
        campaignName: data.campaignName,
        adsetName: data.adsetName,
        adId: data.adId,
        adName: data.adName,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        utmTerm: data.utmTerm,
        utmContent: data.utmContent,
        cpc: calculatedMetrics.cpc,
        cpm: calculatedMetrics.cpm,
        ctr: calculatedMetrics.ctr,
        roas: calculatedMetrics.roas,
        currency: data.currency || 'USD',
        timezone: data.timezone,
        rawData: data.rawData,
        updatedAt: new Date()
      },
      create: adSpendData
    })
    
    console.log('✅ Ad spend data saved:', {
      id: adSpend.id,
      platform: adSpend.platform,
      spend: adSpend.spend,
      campaignName: adSpend.campaignName,
      isNew: !adSpend.updatedAt || adSpend.createdAt.getTime() === adSpend.updatedAt.getTime()
    })
    
    // 8. Return success response
    return NextResponse.json({
      success: true,
      message: 'Ad spend data processed successfully',
      data: {
        id: adSpend.id,
        platform: adSpend.platform,
        spend: adSpend.spend,
        date: adSpend.date.toISOString().split('T')[0],
        campaignName: adSpend.campaignName,
        calculatedMetrics: {
          cpc: adSpend.cpc,
          cpm: adSpend.cpm,
          ctr: adSpend.ctr,
          roas: adSpend.roas
        }
      }
    })
    
  } catch (error) {
    console.error('💥 Webhook processing error:', error)
    
    // Handle specific Prisma errors
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Duplicate ad spend record detected' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 }
    )
  }
}

// GET method for webhook validation/testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge')
  
  // Simple webhook validation
  if (challenge) {
    return NextResponse.json({ challenge })
  }
  
  return NextResponse.json({
    service: 'Shopify Tools Ad Spend Webhook',
    status: 'active',
    version: '1.0.0',
    acceptedMethods: ['POST'],
    expectedFormat: {
      apiKey: 'string (required)',
      storeDomain: 'string (required, e.g., "25898e.myshopify.com")',
      platform: 'string (required: google_ads, facebook_ads, etc.)',
      spend: 'number (required)',
      date: 'string (required, YYYY-MM-DD format)',
      campaignId: 'string (optional)',
      campaignName: 'string (optional)',
      impressions: 'number (optional)',
      clicks: 'number (optional)',
      conversions: 'number (optional)',
      conversionValue: 'number (optional)',
      utmCampaign: 'string (optional, for attribution)',
      rawData: 'object (optional, for debugging)'
    }
  })
} 