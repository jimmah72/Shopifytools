import { NextRequest, NextResponse } from 'next/server'

// Mark route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('Google Auth API - GET request received')
  
  try {
    const searchParams = request.nextUrl.searchParams
    const redirectUri = searchParams.get('redirect_uri') || `${request.nextUrl.origin}/api/ad-spend/google/callback`
    
    // Google OAuth configuration
    const clientId = process.env.GOOGLE_CLIENT_ID
    
    if (!clientId) {
      console.log('Google Auth API - Missing Google Client ID')
      return NextResponse.json(
        { error: 'Google integration not configured' },
        { status: 500 }
      )
    }
    
    // Google OAuth scopes for Google Ads API
    const scopes = [
      'https://www.googleapis.com/auth/adwords',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ')
    
    // Generate state parameter for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    
    console.log('Google Auth API - Generated auth URL:', authUrl.toString())
    
    return NextResponse.json({
      authUrl: authUrl.toString(),
      state
    })
  } catch (error) {
    console.error('Google Auth API - Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate Google auth URL' },
      { status: 500 }
    )
  }
} 