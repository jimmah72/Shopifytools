# Ad Spend OAuth Integration

This document describes the comprehensive Ad Spend OAuth Integration system that enables automatic synchronization of advertising spend data from Google Ads and Facebook Ads platforms using secure OAuth authentication.

## Overview

The Ad Spend OAuth Integration replaces manual API credential input with proper OAuth flows, providing:

- **Secure Authentication**: OAuth 2.0 flows for Google Ads and Facebook Ads
- **Automatic Token Refresh**: Handles token expiration and renewal
- **Multi-Account Support**: Discovers and manages multiple ad accounts per platform
- **Real-time Sync**: Fetches campaign performance and spend data
- **Store-Level Integration**: Properly scoped to individual stores in multi-store architecture

## Architecture

### Database Schema

Enhanced `AdSpendIntegration` model:
```prisma
model AdSpendIntegration {
  id           String    @id @default(uuid())
  storeId      String
  platform     String    // GOOGLE, FACEBOOK, TIKTOK, etc.
  accessToken  String
  refreshToken String?
  expiresAt    DateTime?
  accountData  Json?     // Store user info, ad accounts, etc.
  isActive     Boolean   @default(true)
  lastSyncAt   DateTime?
  errorMessage String?   // Store last sync error if any
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  store        Store     @relation(fields: [storeId], references: [id])

  @@unique([storeId, platform])
  @@index([storeId])
  @@index([platform])
  @@index([isActive])
}
```

### Core Components

1. **AdSpendService** (`src/lib/ad-spend-services.ts`)
   - Token management and refresh
   - Account discovery
   - Data fetching from APIs
   - Error handling and logging

2. **OAuth Flow APIs**
   - Google: `/api/ad-spend/google/auth` → `/api/ad-spend/google/callback`
   - Facebook: `/api/ad-spend/facebook/auth` → `/api/ad-spend/facebook/callback`

3. **Sync Management API**
   - Manual sync: `POST /api/ad-spend/sync`
   - Status check: `GET /api/ad-spend/sync`

4. **Enhanced UI** (`src/app/ad-spend/page.tsx`)
   - OAuth connection flows
   - Real-time sync status
   - Ad spend summaries
   - Platform management

## Environment Variables

Required environment variables for OAuth integration:

```bash
# Google Ads OAuth
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdef123456
GOOGLE_ADS_DEVELOPER_TOKEN=abcdef123456

# Facebook Ads OAuth  
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=abcdef1234567890abcdef1234567890
```

## Setup Instructions

### Google Ads Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Google Ads API**
   - Navigate to API Library
   - Search for "Google Ads API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to Credentials → Create Credentials → OAuth 2.0 Client ID
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `https://shopifytoolsprofit.netlify.app/api/ad-spend/google/callback`
     - `http://localhost:3000/api/ad-spend/google/callback` (for development)

4. **Get Developer Token**
   - Apply at [Google Ads Developer Token](https://developers.google.com/google-ads/api/docs/first-call/dev-token)
   - This may require approval process

5. **Configure Scopes**
   - The system requests these scopes:
     - `https://www.googleapis.com/auth/adwords`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`

### Facebook Ads Setup

1. **Create Facebook App**
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create new app → "Business" type

2. **Add Marketing API Product**
   - In app dashboard, add "Marketing API"
   - Configure basic settings

3. **Configure OAuth Settings**
   - In App Settings → Basic, note App ID and App Secret
   - Add authorized redirect URIs:
     - `https://shopifytoolsprofit.netlify.app/api/ad-spend/facebook/callback`
     - `http://localhost:3000/api/ad-spend/facebook/callback` (for development)

4. **Request Permissions**
   - Submit app for review with these permissions:
     - `ads_read`
     - `ads_management`
     - `business_management`
     - `read_insights`

## API Endpoints

### OAuth Authentication

#### Google Ads OAuth Initiation
```http
GET /api/ad-spend/google/auth
```
Returns Google OAuth URL for user authorization.

#### Google Ads OAuth Callback
```http
GET /api/ad-spend/google/callback?code=<auth_code>&state=<state>
```
Handles Google OAuth callback, exchanges code for tokens.

#### Facebook Ads OAuth Initiation
```http
GET /api/ad-spend/facebook/auth
```
Returns Facebook OAuth URL for user authorization.

#### Facebook Ads OAuth Callback
```http
GET /api/ad-spend/facebook/callback?code=<auth_code>&state=<state>
```
Handles Facebook OAuth callback, exchanges code for tokens.

### Data Synchronization

#### Manual Sync Trigger
```http
POST /api/ad-spend/sync
Content-Type: application/json

{
  "days": 30
}
```

Response:
```json
{
  "success": true,
  "message": "Ad spend data synced successfully",
  "totalIntegrations": 2,
  "platforms": ["GOOGLE", "FACEBOOK"],
  "summary": {
    "totalSpend": 1250.75,
    "platformBreakdown": [
      {
        "platform": "GOOGLE",
        "spend": 800.50,
        "campaigns": 5
      },
      {
        "platform": "FACEBOOK", 
        "spend": 450.25,
        "campaigns": 3
      }
    ],
    "recordCount": 240
  }
}
```

#### Sync Status Check
```http
GET /api/ad-spend/sync?days=30
```

Response:
```json
{
  "summary": {
    "totalSpend": 1250.75,
    "platformBreakdown": [...],
    "dailySpend": [...]
  },
  "integrations": [
    {
      "id": "uuid",
      "platform": "GOOGLE",
      "status": "active",
      "lastSync": "2025-06-22T20:30:00.000Z",
      "hasError": false,
      "createdAt": "2025-06-20T10:00:00.000Z"
    }
  ]
}
```

## Data Fetching

### Google Ads Data Fetching

The system uses Google Ads API v14 to fetch:
- Campaign performance data
- Daily spend metrics
- Impressions, clicks, conversions
- Account-level information

```typescript
// Example query structure
const query = `
  SELECT 
    segments.date,
    campaign.id,
    campaign.name,
    metrics.cost_micros,
    metrics.impressions,
    metrics.clicks,
    metrics.conversions
  FROM campaign 
  WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
`
```

### Facebook Ads Data Fetching

The system uses Facebook Marketing API v18.0 to fetch:
- Campaign insights
- Daily spend data
- Performance metrics
- Ad account information

```typescript
// Example API calls
const campaignsUrl = `https://graph.facebook.com/v18.0/${account.id}/campaigns`
const insightsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/insights`
```

## Token Management

### Automatic Token Refresh

The system automatically handles token expiration:

1. **Check Expiration**: Before each API call, check if token is expired
2. **Refresh Token**: Use refresh token to get new access token
3. **Update Database**: Store new token and expiration time
4. **Retry Request**: Continue with original API request

### Error Handling

- **Invalid Tokens**: Automatically attempt refresh
- **Insufficient Permissions**: Log error and mark integration as inactive
- **Rate Limiting**: Implement exponential backoff
- **Network Errors**: Retry with appropriate delays

## UI Components

### Enhanced Ad Spend Page

The ad spend page (`/ad-spend`) now includes:

- **Real-time OAuth Status**: Shows connection status for each platform
- **Ad Spend Summary**: Displays total spend and platform breakdown
- **Manual Sync Button**: Trigger immediate data synchronization
- **Connection Management**: Easy OAuth flow initiation
- **Error Reporting**: Clear error messages and resolution steps

### Connection Flow

1. User clicks "Connect" on platform card
2. System generates OAuth URL with proper scopes
3. User authorizes on platform (Google/Facebook)
4. Callback handler exchanges code for tokens
5. System discovers and stores ad accounts
6. Platform marked as connected with account count

## Security Considerations

### Token Storage
- Access tokens encrypted in database
- Refresh tokens stored securely
- Environment variables for client secrets
- No sensitive data in frontend

### OAuth Security
- State parameter for CSRF protection
- Secure redirect URI validation
- Token expiration handling
- Scope limitation to required permissions

### Data Protection
- Store-level data isolation
- Role-based access control
- Audit logging for all operations
- Secure API communication (HTTPS)

## Testing

### Development Testing

1. **Set up test accounts**:
   - Google Ads test account
   - Facebook Ads test account

2. **Configure development environment**:
   - Add localhost redirect URIs
   - Use development API credentials
   - Enable debug logging

3. **Test OAuth flows**:
   - Authorization flow completion
   - Token exchange and storage
   - Account discovery
   - Data fetching

### Production Deployment

1. **Environment Variables**: Set production OAuth credentials
2. **Redirect URIs**: Update to production domain
3. **SSL Certificate**: Ensure HTTPS for OAuth callbacks
4. **Rate Limiting**: Monitor API usage and limits
5. **Error Monitoring**: Set up alerts for integration failures

## Monitoring and Maintenance

### Health Checks
- Monitor token expiration dates
- Check integration active status
- Verify data sync frequency
- Track API rate limit usage

### Troubleshooting

Common issues and solutions:

1. **"Integration not configured" error**
   - Check environment variables are set
   - Verify OAuth app configuration

2. **"Token expired" errors**
   - Check refresh token validity
   - Verify refresh mechanism working

3. **"No data synced" issues**
   - Check ad account permissions
   - Verify date range parameters
   - Check API rate limits

4. **"Callback failed" errors**
   - Verify redirect URI configuration
   - Check network connectivity
   - Validate OAuth app settings

## Future Enhancements

Planned improvements:

1. **Additional Platforms**: TikTok Ads, Microsoft Ads, Pinterest Ads
2. **Advanced Attribution**: Cross-platform campaign attribution
3. **Automated Insights**: AI-powered spend optimization recommendations
4. **Custom Reporting**: Configurable dashboard and exports
5. **Webhook Integration**: Real-time data updates from platforms

## API Reference

### AdSpendService Methods

```typescript
class AdSpendService {
  // Token management
  static async refreshAccessToken(integrationId: string): Promise<string | null>
  
  // Account discovery
  static async getGoogleAdsAccounts(storeId: string): Promise<GoogleAdsAccount[]>
  static async getFacebookAdAccounts(storeId: string): Promise<FacebookAdAccount[]>
  
  // Data fetching
  static async fetchGoogleAdsData(storeId: string, startDate: string, endDate: string): Promise<AdSpendData[]>
  static async fetchFacebookAdsData(storeId: string, startDate: string, endDate: string): Promise<AdSpendData[]>
  
  // Synchronization
  static async syncAdSpendData(storeId: string, days: number): Promise<void>
  
  // Analytics
  static async getAdSpendSummary(storeId: string, days: number): Promise<AdSpendSummary>
}
```

### Data Types

```typescript
interface AdSpendData {
  date: string
  platform: string
  campaignId: string
  campaignName: string
  spend: number
  impressions?: number
  clicks?: number
  conversions?: number
}

interface GoogleAdsAccount {
  id: string
  name: string
  customerId: string
  descriptiveName: string
  currencyCode: string
  timeZone: string
}

interface FacebookAdAccount {
  id: string
  name: string
  accountId: string
  accountStatus: string
  currency: string
  timezone: string
}
```

---

This comprehensive Ad Spend OAuth Integration provides a secure, scalable solution for automatic advertising spend tracking, enabling more accurate profit calculations and business insights. 