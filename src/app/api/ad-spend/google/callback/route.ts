import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mark route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('Google Callback API - GET request received')
  
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    if (error) {
      console.log('Google Callback API - OAuth error:', error)
      return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?error=google_auth_denied`)
    }
    
    if (!code || !state) {
      console.log('Google Callback API - Missing code or state')
      return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?error=google_auth_invalid`)
    }
    
    // Exchange code for access token
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${request.nextUrl.origin}/api/ad-spend/google/callback`
    
    if (!clientId || !clientSecret) {
      console.log('Google Callback API - Missing Google credentials')
      return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?error=google_config_error`)
    }
    
    const tokenUrl = 'https://oauth2.googleapis.com/token'
    const tokenData = {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code: code
    }
    
    console.log('Google Callback API - Requesting access token')
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(tokenData)
    })
    
    if (!tokenResponse.ok) {
      console.error('Google Callback API - Token exchange failed:', tokenResponse.statusText)
      return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?error=google_token_error`)
    }
    
    const tokens = await tokenResponse.json()
    const accessToken = tokens.access_token
    const refreshToken = tokens.refresh_token
    
    if (!accessToken) {
      console.error('Google Callback API - No access token received')
      return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?error=google_token_missing`)
    }
    
    // Get user info
    const userResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`)
    const userData = await userResponse.json()
    
    // Get Google Ads accounts (this would require additional API calls to Google Ads API)
    // For now, we'll store the tokens and user info
    
    console.log('Google Callback API - User data:', userData)
    
    // Get the current store
    const store = await prisma.store.findFirst()
    
    if (!store) {
      console.log('Google Callback API - No store found')
      return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?error=no_store`)
    }
    
    // Save Google integration to database
    try {
      await prisma.adSpendIntegration.upsert({
        where: {
          storeId_platform: {
            storeId: store.id,
            platform: 'GOOGLE'
          }
        },
        update: {
          accessToken: accessToken,
          refreshToken: refreshToken,
          expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
          accountData: {
            user: userData,
            tokenType: tokens.token_type
          },
          isActive: true,
          lastSyncAt: new Date()
        },
        create: {
          storeId: store.id,
          platform: 'GOOGLE',
          accessToken: accessToken,
          refreshToken: refreshToken,
          expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
          accountData: {
            user: userData,
            tokenType: tokens.token_type
          },
          isActive: true,
          lastSyncAt: new Date()
        }
      })
      
      console.log('Google Callback API - Integration saved successfully')
      return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?success=google_connected`)
    } catch (dbError) {
      console.error('Google Callback API - Database error:', dbError)
      return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?error=database_error`)
    }
    
  } catch (error) {
    console.error('Google Callback API - Error:', error)
    return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?error=google_callback_error`)
  }
} 