import { NextRequest, NextResponse } from 'next/server'

// Mark route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('Facebook Auth API - GET request received')
  
  try {
    const searchParams = request.nextUrl.searchParams
    const redirectUri = searchParams.get('redirect_uri') || `${request.nextUrl.origin}/api/ad-spend/facebook/callback`
    
    // Facebook OAuth configuration
    const clientId = process.env.FACEBOOK_APP_ID
    
    if (!clientId) {
      console.log('Facebook Auth API - Missing Facebook App ID')
      return NextResponse.json(
        { error: 'Facebook integration not configured' },
        { status: 500 }
      )
    }
    
    // Facebook OAuth permissions for Ads API
    const scopes = [
      'ads_read',
      'ads_management',
      'business_management',
      'read_insights'
    ].join(',')
    
    // Generate state parameter for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('response_type', 'code')
    
    console.log('Facebook Auth API - Generated auth URL:', authUrl.toString())
    
    return NextResponse.json({
      authUrl: authUrl.toString(),
      state
    })
  } catch (error) {
    console.error('Facebook Auth API - Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate Facebook auth URL' },
      { status: 500 }
    )
  }
} 