# OAuth Setup Guide for Shopify Tools

## Overview

This guide explains how to set up OAuth integrations for ad spend tracking. There are two distinct phases:

1. **App Owner Setup** (Developer - One Time Only)
2. **End User Experience** (Merchants - Seamless Browser Flow)

---

## Phase 1: App Owner Setup (Developer Configuration)

This is done **once** by whoever hosts/maintains the Shopify Tools application.

### Google Ads OAuth App Setup

1. **Create Google Cloud Project**
   ```
   - Go to https://console.cloud.google.com/
   - Create new project: "Shopify Tools Ad Integrations"
   - Note the project ID
   ```

2. **Enable Google Ads API**
   ```
   - API Library → Search "Google Ads API" → Enable
   ```

3. **Create OAuth 2.0 Credentials**
   ```
   - Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Name: "Shopify Tools Google Ads Integration"
   
   Authorized redirect URIs:
   - https://shopifytoolsprofit.netlify.app/api/ad-spend/google/callback
   - http://localhost:3000/api/ad-spend/google/callback (dev)
   ```

4. **Get Developer Token**
   ```
   - Apply at: https://developers.google.com/google-ads/api/docs/first-call/dev-token
   - This requires Google approval (may take days/weeks)
   ```

5. **Set Environment Variables**
   ```bash
   GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
   GOOGLE_ADS_DEVELOPER_TOKEN=abc123def456ghi789
   ```

### Facebook Ads OAuth App Setup

1. **Create Facebook Developer App**
   ```
   - Go to https://developers.facebook.com/
   - Create App → Business type
   - App name: "Shopify Tools Ad Integrations"
   ```

2. **Add Marketing API Product**
   ```
   - App Dashboard → Add Product → Marketing API
   ```

3. **Configure OAuth Settings**
   ```
   App Settings → Basic:
   - Note App ID and App Secret
   - Privacy Policy URL: https://shopifytoolsprofit.netlify.app/privacy
   - Terms of Service URL: https://shopifytoolsprofit.netlify.app/terms (optional)
   
   Valid OAuth Redirect URIs:
   - https://shopifytoolsprofit.netlify.app/api/ad-spend/facebook/callback
   - http://localhost:3000/api/ad-spend/facebook/callback (dev)
   ```

4. **Request App Review**
   ```
   Submit for review requesting these permissions:
   - ads_read
   - ads_management  
   - business_management
   - read_insights
   
   ⚠️ IMPORTANT: Meta requires a publicly accessible privacy policy URL
   Make sure https://shopifytoolsprofit.netlify.app/privacy is accessible without login
   ```

5. **Set Environment Variables**
   ```bash
   FACEBOOK_APP_ID=123456789012345
   FACEBOOK_APP_SECRET=abc123def456ghi789jkl012mno345
   ```

### Final Environment Configuration

Create `.env` file (or set production environment variables):

```bash
# Database
DATABASE_URL=your_database_connection_string

# Shopify
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret

# Google Ads OAuth (App Owner Setup)
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
GOOGLE_ADS_DEVELOPER_TOKEN=abc123def456ghi789

# Facebook Ads OAuth (App Owner Setup)  
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=abc123def456ghi789jkl012mno345

# App Settings
NEXTAUTH_URL=https://shopifytoolsprofit.netlify.app
NEXTAUTH_SECRET=your_nextauth_secret
```

---

## Phase 2: End User Experience (Merchant Flow)

Once you've completed the app owner setup above, **merchants using your app experience this seamless flow**:

### For Merchants - No Technical Setup Required

1. **Navigate to Ad Spend Page**
   ```
   Merchant logs into your Shopify Tools app
   Goes to "Ad Spend" section
   ```

2. **Connect Google Ads (Example)**
   ```
   ✅ Merchant clicks "Connect" on Google Ads card
   ✅ Browser redirects to Google authorization page
   ✅ Merchant signs in with their Google account
   ✅ Google shows permission request for ad account access
   ✅ Merchant clicks "Allow"
   ✅ Browser redirects back to your app
   ✅ System automatically discovers their ad accounts
   ✅ Google Ads shows as "Connected" with account count
   ```

3. **Connect Facebook Ads (Example)**
   ```
   ✅ Merchant clicks "Connect" on Facebook Ads card  
   ✅ Browser redirects to Facebook authorization page
   ✅ Merchant signs in with their Facebook account
   ✅ Facebook shows permission request for ad account access
   ✅ Merchant clicks "Continue" 
   ✅ Browser redirects back to your app
   ✅ System automatically discovers their ad accounts
   ✅ Facebook Ads shows as "Connected" with account count
   ```

4. **Automatic Data Sync**
   ```
   ✅ System immediately starts syncing ad spend data
   ✅ Dashboard shows real-time ad spend summaries
   ✅ Profit calculations now include accurate ad costs
   ✅ Data refreshes automatically every 30 seconds
   ```

### What Merchants Never Have To Do

❌ **No manual credential entry**  
❌ **No OAuth app creation**  
❌ **No API key management**  
❌ **No technical configuration**  
❌ **No environment variable setup**

### What Merchants Experience

✅ **One-click OAuth connection**  
✅ **Automatic account discovery**  
✅ **Real-time ad spend tracking**  
✅ **Seamless authorization flow**  
✅ **Zero technical setup**

---

## Code Implementation Status

The codebase is already prepared for this flow:

### ✅ OAuth Flow APIs Ready
- `/api/ad-spend/google/auth` - Generates Google OAuth URL
- `/api/ad-spend/google/callback` - Handles Google authorization  
- `/api/ad-spend/facebook/auth` - Generates Facebook OAuth URL
- `/api/ad-spend/facebook/callback` - Handles Facebook authorization

### ✅ User Interface Ready  
- OAuth connection buttons on ad spend page
- Real-time connection status indicators
- Automatic ad spend summaries
- Manual sync capabilities

### ✅ Token Management Ready
- Automatic token refresh handling
- Secure token storage in database
- Error handling and recovery

### ✅ Data Synchronization Ready
- Multi-account ad spend fetching
- Campaign performance tracking
- Store-level data isolation

---

## Deployment Checklist

### Before Going Live:

1. **✅ Set Production Environment Variables**
   - All OAuth credentials configured
   - Redirect URIs point to https://shopifytoolsprofit.netlify.app
   - SSL certificate automatically provided by Netlify

2. **✅ Test OAuth Flows**  
   - Google Ads connection works end-to-end
   - Facebook Ads connection works end-to-end
   - Account discovery functions properly

3. **✅ Verify Data Sync**
   - Ad spend data fetches correctly
   - Dashboard displays accurate summaries  
   - Error handling works properly

4. **✅ Monitor Integration Health**
   - Set up alerts for OAuth failures
   - Monitor API rate limits
   - Track token expiration events

---

## Summary

**App Owner (You):** Set up OAuth apps and environment variables once  
**End Users (Merchants):** Enjoy seamless one-click OAuth connections

The codebase is fully prepared - merchants will experience zero technical setup and complete automation once you complete the initial OAuth app configuration. 