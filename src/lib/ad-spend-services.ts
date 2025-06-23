import { prisma } from '@/lib/prisma'

export interface AdSpendData {
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
  resourceName: string
  id: string
  name: string
  currency: string
  timezone: string
}

interface FacebookAdAccount {
  id: string
  name: string
  account_status: number
  currency: string
  timezone_name: string
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string
}

export class AdSpendService {
  /**
   * Refresh an expired access token
   */
  static async refreshAccessToken(integrationId: string): Promise<string | null> {
    try {
      console.log(`Ad Spend Service - Refreshing token for integration ${integrationId}`)

      const integration = await prisma.adSpendIntegration.findUnique({
        where: { id: integrationId }
      })

      if (!integration || !integration.refreshToken) {
        console.error('Ad Spend Service - No integration or refresh token found')
        return null
      }

      let tokenEndpoint: string
      let clientId: string
      let clientSecret: string

      // Configure endpoint and credentials based on platform
      switch (integration.platform) {
        case 'GOOGLE':
          tokenEndpoint = 'https://oauth2.googleapis.com/token'
          clientId = process.env.GOOGLE_CLIENT_ID!
          clientSecret = process.env.GOOGLE_CLIENT_SECRET!
          break
        case 'FACEBOOK':
          tokenEndpoint = 'https://graph.facebook.com/oauth/access_token'
          clientId = process.env.FACEBOOK_APP_ID!
          clientSecret = process.env.FACEBOOK_APP_SECRET!
          break
        default:
          console.error('Ad Spend Service - Unsupported platform:', integration.platform)
          return null
      }

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: integration.refreshToken,
          client_id: clientId,
          client_secret: clientSecret
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Ad Spend Service - Token refresh failed:', response.status, errorText)
        return null
      }

      const tokens: TokenResponse = await response.json()
      const newAccessToken = tokens.access_token

      if (!newAccessToken) {
        console.error('Ad Spend Service - No new access token received')
        return null
      }

      // Update the integration with new token
      await prisma.adSpendIntegration.update({
        where: { id: integrationId },
        data: {
          accessToken: newAccessToken,
          expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
          updatedAt: new Date()
        }
      })

      return newAccessToken
    } catch (error) {
      console.error('Ad Spend Service - Error refreshing token:', error)
      return null
    }
  }

  /**
   * Fetch Google Ads accounts for a store
   */
  static async getGoogleAdsAccounts(storeId: string): Promise<GoogleAdsAccount[]> {
    try {
      const integration = await prisma.adSpendIntegration.findUnique({
        where: {
          storeId_platform: {
            storeId,
            platform: 'GOOGLE'
          }
        }
      })

      if (!integration || !integration.isActive) {
        console.log('Google Ads Service - No active integration found')
        return []
      }

      let accessToken = integration.accessToken

      // Check if token is expired and refresh if needed
      if (integration.expiresAt && integration.expiresAt < new Date()) {
        const refreshedToken = await this.refreshAccessToken(integration.id)
        if (refreshedToken) {
          accessToken = refreshedToken
        } else {
          throw new Error('Failed to refresh expired token')
        }
      }

      // Fetch accessible accounts
      const response = await fetch('https://googleads.googleapis.com/v14/customers:listAccessibleCustomers', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Google Ads Service - API error:', response.status, errorText)
        throw new Error(`Google Ads API error: ${response.status}`)
      }

      const data = await response.json()
      const resourceNames = data.resourceNames || []

      // Get detailed account info for each accessible customer
      const accounts: GoogleAdsAccount[] = []
      for (const resourceName of resourceNames) {
        const customerId = resourceName.split('/')[1]
        
        try {
          const accountResponse = await fetch(`https://googleads.googleapis.com/v14/customers/${customerId}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
              'Content-Type': 'application/json'
            }
          })

          if (accountResponse.ok) {
            const accountData = await accountResponse.json()
            accounts.push({
              resourceName,
              id: customerId,
              name: accountData.descriptiveName || `Account ${customerId}`,
              currency: accountData.currencyCode || 'USD',
              timezone: accountData.timeZone || 'America/New_York'
            })
          }
        } catch (accountError) {
          console.warn(`Failed to fetch details for account ${customerId}:`, accountError)
        }
      }

      // Update integration with account data (cast as any to avoid JSON type issues)
      await prisma.adSpendIntegration.update({
        where: { id: integration.id },
        data: {
          accountData: { accounts } as any,
          updatedAt: new Date()
        }
      })

      console.log(`Google Ads Service - Found ${accounts.length} accessible accounts`)
      return accounts
    } catch (error) {
      console.error('Google Ads Service - Error fetching accounts:', error instanceof Error ? error.message : String(error))
      return []
    }
  }

  /**
   * Fetch Facebook Ad accounts for a store
   */
  static async getFacebookAdAccounts(storeId: string): Promise<FacebookAdAccount[]> {
    try {
      const integration = await prisma.adSpendIntegration.findUnique({
        where: {
          storeId_platform: {
            storeId,
            platform: 'FACEBOOK'
          }
        }
      })

      if (!integration || !integration.isActive) {
        console.log('Facebook Ads Service - No active integration found')
        return []
      }

      let accessToken = integration.accessToken

      // Check if token is expired and refresh if needed
      if (integration.expiresAt && integration.expiresAt < new Date()) {
        const refreshedToken = await this.refreshAccessToken(integration.id)
        if (refreshedToken) {
          accessToken = refreshedToken
        } else {
          throw new Error('Failed to refresh expired token')
        }
      }

      // Fetch ad accounts
      const response = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${accessToken}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Facebook Ads Service - API error:', response.status, errorText)
        throw new Error(`Facebook Ads API error: ${response.status}`)
      }

      const data = await response.json()
      const accounts = data.data || []

      // Update integration with account data (cast as any to avoid JSON type issues)
      await prisma.adSpendIntegration.update({
        where: { id: integration.id },
        data: {
          accountData: { accounts } as any,
          updatedAt: new Date()
        }
      })

      console.log(`Facebook Ads Service - Found ${accounts.length} ad accounts`)
      return accounts

    } catch (error) {
      console.error('Facebook Ads Service - Error fetching accounts:', error instanceof Error ? error.message : String(error))
      return []
    }
  }

  /**
   * Fetch Google Ads spend data for a date range
   */
  static async fetchGoogleAdsData(storeId: string, startDate: string, endDate: string): Promise<AdSpendData[]> {
    try {
      const integration = await prisma.adSpendIntegration.findUnique({
        where: {
          storeId_platform: {
            storeId,
            platform: 'GOOGLE'
          }
        }
      })

      if (!integration || !integration.isActive) {
        console.log('Google Ads Service - No active integration found')
        return []
      }

      let accessToken = integration.accessToken

      // Check if token is expired and refresh if needed
      if (integration.expiresAt && integration.expiresAt < new Date()) {
        const refreshedToken = await this.refreshAccessToken(integration.id)
        if (refreshedToken) {
          accessToken = refreshedToken
        } else {
          throw new Error('Failed to refresh expired token')
        }
      }

      const accounts = await this.getGoogleAdsAccounts(storeId)
      const allAdSpendData: AdSpendData[] = []

      for (const account of accounts) {
        const customerId = account.id

        const query = `
          SELECT 
            campaign.id,
            campaign.name,
            segments.date,
            metrics.cost_micros,
            metrics.impressions,
            metrics.clicks,
            metrics.conversions
          FROM campaign 
          WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        `

        try {
          const response = await fetch(`https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:searchStream`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
          })

          if (!response.ok) {
            console.warn(`Failed to fetch data for account ${customerId}:`, response.status)
            continue
          }

          const data = await response.json()
          const results = data.results || []

          for (const result of results) {
            const campaign = result.campaign
            const segments = result.segments
            const metrics = result.metrics

            allAdSpendData.push({
              date: segments.date,
              platform: 'GOOGLE',
              campaignId: campaign.id,
              campaignName: campaign.name,
              spend: (metrics.costMicros || 0) / 1000000, // Convert micros to dollars
              impressions: metrics.impressions || 0,
              clicks: metrics.clicks || 0,
              conversions: metrics.conversions || 0
            })
          }
        } catch (accountError) {
          console.warn(`Error fetching data for Google Ads account ${customerId}:`, accountError)
        }
      }

      console.log(`Google Ads Service - Fetched ${allAdSpendData.length} records`)
      return allAdSpendData

    } catch (error) {
      console.error('Google Ads Service - Error fetching data:', error instanceof Error ? error.message : String(error))
      return []
    }
  }

  /**
   * Fetch Facebook Ads spend data for a date range
   */
  static async fetchFacebookAdsData(storeId: string, startDate: string, endDate: string): Promise<AdSpendData[]> {
    try {
      const integration = await prisma.adSpendIntegration.findUnique({
        where: {
          storeId_platform: {
            storeId,
            platform: 'FACEBOOK'
          }
        }
      })

      if (!integration || !integration.isActive) {
        console.log('Facebook Ads Service - No active integration found')
        return []
      }

      let accessToken = integration.accessToken

      // Check if token is expired and refresh if needed
      if (integration.expiresAt && integration.expiresAt < new Date()) {
        const refreshedToken = await this.refreshAccessToken(integration.id)
        if (refreshedToken) {
          accessToken = refreshedToken
        } else {
          throw new Error('Failed to refresh expired token')
        }
      }

      const accounts = await this.getFacebookAdAccounts(storeId)
      const allAdSpendData: AdSpendData[] = []

      for (const account of accounts) {
        try {
          const response = await fetch(
            `https://graph.facebook.com/v18.0/${account.id}/insights?` +
            `fields=campaign_id,campaign_name,date_start,spend,impressions,clicks,actions&` +
            `time_range={'since':'${startDate}','until':'${endDate}'}&` +
            `level=campaign&` +
            `access_token=${accessToken}`
          )

          if (!response.ok) {
            console.warn(`Failed to fetch data for Facebook account ${account.id}:`, response.status)
            continue
          }

          const data = await response.json()
          const insights = data.data || []

          for (const insight of insights) {
            // Type the actions properly to avoid any type error
            const conversions = insight.actions ? 
              insight.actions.find((action: { action_type: string; value?: string }) => action.action_type === 'purchase')?.value || 0 : 0

            allAdSpendData.push({
              date: insight.date_start,
              platform: 'FACEBOOK',
              campaignId: insight.campaign_id,
              campaignName: insight.campaign_name,
              spend: parseFloat(insight.spend || '0'),
              impressions: parseInt(insight.impressions || '0'),
              clicks: parseInt(insight.clicks || '0'),
              conversions: parseInt(conversions)
            })
          }
        } catch (accountError) {
          console.warn(`Error fetching data for Facebook account ${account.id}:`, accountError)
        }
      }

      console.log(`Facebook Ads Service - Fetched ${allAdSpendData.length} records`)
      return allAdSpendData

    } catch (error) {
      console.error('Facebook Ads Service - Error fetching data:', error instanceof Error ? error.message : String(error))
      return []
    }
  }

  /**
   * Sync ad spend data for all active integrations
   */
  static async syncAdSpendData(storeId: string, days: number = 30): Promise<void> {
    try {
      console.log(`Ad Spend Service - Starting sync for store ${storeId}, last ${days} days`)

      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      // Fetch data from all platforms
      const [googleData, facebookData] = await Promise.all([
        this.fetchGoogleAdsData(storeId, startDateStr, endDateStr),
        this.fetchFacebookAdsData(storeId, startDateStr, endDateStr)
      ])

      const allAdSpendData = [...googleData, ...facebookData]

      console.log(`Ad Spend Service - Found ${allAdSpendData.length} ad spend records`)

      // Save to database using actual database fields
      for (const adSpend of allAdSpendData) {
        await prisma.adSpend.create({
          data: {
            storeId,
            platform: adSpend.platform,
            campaignId: adSpend.campaignId,
            accountId: 'api-sync', // Required field
            amount: adSpend.spend, // Database uses 'amount' not 'spend'
            date: new Date(adSpend.date),
            lastSync: new Date() // Required field
          }
        })
      }

      // Update sync timestamps (removed errorMessage field reference)
      await prisma.adSpendIntegration.updateMany({
        where: {
          storeId,
          isActive: true
        },
        data: {
          lastSyncAt: new Date()
        }
      })

      console.log(`Ad Spend Service - Successfully synced ${allAdSpendData.length} records`)
    } catch (error) {
      console.error('Ad Spend Service - Error during sync:', error)
      throw error
    }
  }

  /**
   * Get ad spend summary for dashboard
   */
  static async getAdSpendSummary(storeId: string, days: number = 30): Promise<{
    totalSpend: number
    platformBreakdown: Array<{ platform: string; spend: number; campaigns: number }>
    dailySpend: Array<{ date: string; spend: number }>
  }> {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const adSpendData = await prisma.adSpend.findMany({
        where: {
          storeId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          date: 'asc'
        }
      })

      const totalSpend = adSpendData.reduce((sum, record) => sum + record.amount, 0) // Using 'amount' field

      const platformBreakdown = adSpendData.reduce((acc, record) => {
        const existing = acc.find(p => p.platform === record.platform)
        if (existing) {
          existing.spend += record.amount // Using 'amount' field
          existing.campaigns += 1
        } else {
          acc.push({
            platform: record.platform,
            spend: record.amount, // Using 'amount' field
            campaigns: 1
          })
        }
        return acc
      }, [] as Array<{ platform: string; spend: number; campaigns: number }>)

      const dailySpend = adSpendData.reduce((acc, record) => {
        const dateStr = record.date.toISOString().split('T')[0]
        const existing = acc.find(d => d.date === dateStr)
        if (existing) {
          existing.spend += record.amount // Using 'amount' field
        } else {
          acc.push({
            date: dateStr,
            spend: record.amount // Using 'amount' field
          })
        }
        return acc
      }, [] as Array<{ date: string; spend: number }>)

      return {
        totalSpend,
        platformBreakdown,
        dailySpend
      }
    } catch (error) {
      console.error('Ad Spend Service - Error getting summary:', error)
      return {
        totalSpend: 0,
        platformBreakdown: [],
        dailySpend: []
      }
    }
  }
} 