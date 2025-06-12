import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mark route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('Facebook Callback API - GET request received')
  
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    if (error) {
      console.log('Facebook Callback API - OAuth error:', error)
      return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?error=facebook_auth_denied`)
    }
    
    if (!code || !state) {
      console.log('Facebook Callback API - Missing code or state')
      return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?error=facebook_auth_invalid`)
    }
    
    // Exchange code for access token
    const clientId = process.env.FACEBOOK_APP_ID
    const clientSecret = process.env.FACEBOOK_APP_SECRET
    const redirectUri = `${request.nextUrl.origin}/api/ad-spend/facebook/callback`
    
    if (!clientId || !clientSecret) {
      console.log('Facebook Callback API - Missing Facebook credentials')
      return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?error=facebook_config_error`)
    }
    
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', clientId)
    tokenUrl.searchParams.set('client_secret', clientSecret)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('code', code)
    
    console.log('Facebook Callback API - Requesting access token')
    const tokenResponse = await fetch(tokenUrl.toString())
    
    if (!tokenResponse.ok) {
      console.error('Facebook Callback API - Token exchange failed:', tokenResponse.statusText)
      return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?error=facebook_token_error`)
    }
    
    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    
    if (!accessToken) {
      console.error('Facebook Callback API - No access token received')
      return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?error=facebook_token_missing`)
    }
    
    // Get user info and ad accounts
    const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${accessToken}&fields=id,name,email`)
    const userData = await userResponse.json()
    
    const adAccountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${accessToken}&fields=id,name,account_id,account_status`)
    const adAccountsData = await adAccountsResponse.json()
    
    console.log('Facebook Callback API - User data:', userData)
    console.log('Facebook Callback API - Ad accounts:', adAccountsData.data?.length || 0)
    
    // Get the current store
    const store = await prisma.store.findFirst()
    
    if (!store) {
      console.log('Facebook Callback API - No store found')
      return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?error=no_store`)
    }
    
    // Save Facebook integration to database
    try {
      await prisma.adSpendIntegration.upsert({
        where: {
          storeId_platform: {
            storeId: store.id,
            platform: 'FACEBOOK'
          }
        },
        update: {
          accessToken: accessToken,
          refreshToken: tokenData.refresh_token,
          expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
          accountData: {
            user: userData,
            adAccounts: adAccountsData.data || []
          },
          isActive: true,
          lastSyncAt: new Date()
        },
        create: {
          storeId: store.id,
          platform: 'FACEBOOK',
          accessToken: accessToken,
          refreshToken: tokenData.refresh_token,
          expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
          accountData: {
            user: userData,
            adAccounts: adAccountsData.data || []
          },
          isActive: true,
          lastSyncAt: new Date()
        }
      })
      
      console.log('Facebook Callback API - Integration saved successfully')
      return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?success=facebook_connected`)
    } catch (dbError) {
      console.error('Facebook Callback API - Database error:', dbError)
      return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?error=database_error`)
    }
    
  } catch (error) {
    console.error('Facebook Callback API - Error:', error)
    return NextResponse.redirect(`${request.nextUrl.origin}/ad-spend?error=facebook_callback_error`)
  }
} 