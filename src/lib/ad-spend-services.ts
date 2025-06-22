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

export interface GoogleAdsAccount {
  id: string
  name: string
  customerId: string
  descriptiveName: string
  currencyCode: string
  timeZone: string
}

export interface FacebookAdAccount {
  id: string
  name: string
  accountId: string
  accountStatus: string
  currency: string
  timezone: string
}

export class AdSpendService {
  
  /**
   * Refresh expired access token using refresh token
   */
  static async refreshAccessToken(integrationId: string): Promise<string | null> {
    try {
      const integration = await prisma.adSpendIntegration.findUnique({
        where: { id: integrationId }
      })

      if (!integration || !integration.refreshToken) {
        console.error('Ad Spend Service - No integration or refresh token found')
        return null
      }

      let tokenUrl: string
      let clientId: string | undefined
      let clientSecret: string | undefined

      if (integration.platform === 'GOOGLE') {
        tokenUrl = 'https://oauth2.googleapis.com/token'
        clientId = process.env.GOOGLE_CLIENT_ID
        clientSecret = process.env.GOOGLE_CLIENT_SECRET
      } else if (integration.platform === 'FACEBOOK') {
        tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token'
        clientId = process.env.FACEBOOK_APP_ID
        clientSecret = process.env.FACEBOOK_APP_SECRET
      } else {
        console.error('Ad Spend Service - Unsupported platform:', integration.platform)
        return null
      }

      if (!clientId || !clientSecret) {
        console.error('Ad Spend Service - Missing OAuth credentials for', integration.platform)
        return null
      }

      const tokenData = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: integration.refreshToken,
        grant_type: 'refresh_token'
      })

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenData
      })

      if (!response.ok) {
        console.error('Ad Spend Service - Token refresh failed:', response.statusText)
        return null
      }

      const tokens = await response.json()
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
   * Get Google Ads accounts for the authenticated user
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
        console.log('Google Ads Service - Token expired, attempting refresh')
        const refreshedToken = await this.refreshAccessToken(integration.id)
        if (refreshedToken) {
          accessToken = refreshedToken
        } else {
          throw new Error('Failed to refresh expired token')
        }
      }

      // Fetch accessible customers (Google Ads accounts)
      const customersUrl = 'https://googleads.googleapis.com/v14/customers:listAccessibleCustomers'
      const customersResponse = await fetch(customersUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || ''
        }
      })

      if (!customersResponse.ok) {
        throw new Error(`Failed to fetch Google Ads customers: ${customersResponse.statusText}`)
      }

      const customersData = await customersResponse.json()
      const accounts: GoogleAdsAccount[] = []

      // Get detailed info for each customer
      for (const customer of customersData.resourceNames || []) {
        const customerId = customer.replace('customers/', '')
        
        try {
          const accountUrl = `https://googleads.googleapis.com/v14/customers/${customerId}`
          const accountResponse = await fetch(accountUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || ''
            }
          })

          if (accountResponse.ok) {
            const accountData = await accountResponse.json()
            accounts.push({
              id: customerId,
              name: accountData.descriptiveName || `Account ${customerId}`,
              customerId: customerId,
              descriptiveName: accountData.descriptiveName || '',
              currencyCode: accountData.currencyCode || 'USD',
              timeZone: accountData.timeZone || 'UTC'
            })
          }
        } catch (error) {
          console.warn('Google Ads Service - Failed to fetch account details for', customerId, error)
        }
      }

      return accounts
    } catch (error) {
      console.error('Google Ads Service - Error fetching accounts:', error)
      await this.updateIntegrationError(storeId, 'GOOGLE', error instanceof Error ? error.message : 'Unknown error')
      return []
    }
  }

  /**
   * Get Facebook Ad accounts for the authenticated user
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

      // Facebook tokens typically don't expire as quickly, but we should still check
      if (integration.expiresAt && integration.expiresAt < new Date()) {
        console.log('Facebook Ads Service - Token expired, attempting refresh')
        const refreshedToken = await this.refreshAccessToken(integration.id)
        if (refreshedToken) {
          accessToken = refreshedToken
        } else {
          throw new Error('Failed to refresh expired token')
        }
      }

      // Fetch ad accounts
      const adAccountsUrl = `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${accessToken}&fields=id,name,account_id,account_status,currency,timezone_name`
      const response = await fetch(adAccountsUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch Facebook ad accounts: ${response.statusText}`)
      }

      const data = await response.json()
      const accounts: FacebookAdAccount[] = (data.data || []).map((account: any) => ({
        id: account.id,
        name: account.name,
        accountId: account.account_id,
        accountStatus: account.account_status || 'UNKNOWN',
        currency: account.currency || 'USD',
        timezone: account.timezone_name || 'UTC'
      }))

      return accounts
    } catch (error) {
      console.error('Facebook Ads Service - Error fetching accounts:', error)
      await this.updateIntegrationError(storeId, 'FACEBOOK', error instanceof Error ? error.message : 'Unknown error')
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
        try {
          // Google Ads Reporting API query
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

          const reportUrl = `https://googleads.googleapis.com/v14/customers/${account.customerId}/googleAds:search`
          const response = await fetch(reportUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
          })

          if (!response.ok) {
            console.warn('Google Ads Service - Failed to fetch data for account', account.customerId, response.statusText)
            continue
          }

          const data = await response.json()
          
          for (const row of data.results || []) {
            allAdSpendData.push({
              date: row.segments.date,
              platform: 'GOOGLE',
              campaignId: row.campaign.id,
              campaignName: row.campaign.name,
              spend: (row.metrics.costMicros || 0) / 1000000, // Convert micros to dollars
              impressions: row.metrics.impressions || 0,
              clicks: row.metrics.clicks || 0,
              conversions: row.metrics.conversions || 0
            })
          }
        } catch (error) {
          console.warn('Google Ads Service - Failed to fetch data for account', account.customerId, error)
        }
      }

      return allAdSpendData
    } catch (error) {
      console.error('Google Ads Service - Error fetching ad spend data:', error)
      await this.updateIntegrationError(storeId, 'GOOGLE', error instanceof Error ? error.message : 'Unknown error')
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
          // Fetch campaigns for this ad account
          const campaignsUrl = `https://graph.facebook.com/v18.0/${account.id}/campaigns?access_token=${accessToken}&fields=id,name&limit=100`
          const campaignsResponse = await fetch(campaignsUrl)

          if (!campaignsResponse.ok) {
            console.warn('Facebook Ads Service - Failed to fetch campaigns for account', account.accountId)
            continue
          }

          const campaignsData = await campaignsResponse.json()

          for (const campaign of campaignsData.data || []) {
            // Fetch insights for each campaign
            const insightsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/insights?access_token=${accessToken}&time_range={"since":"${startDate}","until":"${endDate}"}&fields=campaign_id,campaign_name,date_start,spend,impressions,clicks,actions&time_increment=1&level=campaign`
            const insightsResponse = await fetch(insightsUrl)

            if (!insightsResponse.ok) {
              console.warn('Facebook Ads Service - Failed to fetch insights for campaign', campaign.id)
              continue
            }

            const insightsData = await insightsResponse.json()

            for (const insight of insightsData.data || []) {
              const conversions = insight.actions?.find((action: any) => 
                action.action_type === 'purchase' || action.action_type === 'offsite_conversion.fb_pixel_purchase'
              )?.value || 0

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
          }
        } catch (error) {
          console.warn('Facebook Ads Service - Failed to fetch data for account', account.accountId, error)
        }
      }

      return allAdSpendData
    } catch (error) {
      console.error('Facebook Ads Service - Error fetching ad spend data:', error)
      await this.updateIntegrationError(storeId, 'FACEBOOK', error instanceof Error ? error.message : 'Unknown error')
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

      // Save to database - need to update schema for this composite key
      for (const adSpend of allAdSpendData) {
        await prisma.adSpend.upsert({
          where: {
            // For now, using id-based approach since composite key needs schema update
            id: `${storeId}_${adSpend.platform}_${adSpend.date}_${adSpend.campaignId}`
          },
          update: {
            amount: adSpend.spend,
            description: `Impressions: ${adSpend.impressions}, Clicks: ${adSpend.clicks}, Conversions: ${adSpend.conversions}`
          },
          create: {
            id: `${storeId}_${adSpend.platform}_${adSpend.date}_${adSpend.campaignId}`,
            storeId,
            platform: adSpend.platform,
            date: new Date(adSpend.date),
            campaign: adSpend.campaignName,
            amount: adSpend.spend,
            description: `Impressions: ${adSpend.impressions}, Clicks: ${adSpend.clicks}, Conversions: ${adSpend.conversions}`
          }
        })
      }

      // Update sync timestamps
      await prisma.adSpendIntegration.updateMany({
        where: {
          storeId,
          isActive: true
        },
        data: {
          lastSyncAt: new Date(),
          errorMessage: null
        }
      })

      console.log(`Ad Spend Service - Successfully synced ${allAdSpendData.length} records`)
    } catch (error) {
      console.error('Ad Spend Service - Error during sync:', error)
      throw error
    }
  }

  /**
   * Update integration error message
   */
  private static async updateIntegrationError(storeId: string, platform: string, errorMessage: string): Promise<void> {
    try {
      await prisma.adSpendIntegration.update({
        where: {
          storeId_platform: {
            storeId,
            platform
          }
        },
        data: {
          errorMessage,
          updatedAt: new Date()
        }
      })
    } catch (error) {
      console.error('Ad Spend Service - Failed to update error message:', error)
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

      const totalSpend = adSpendData.reduce((sum, record) => sum + record.amount, 0)

      const platformBreakdown = adSpendData.reduce((acc, record) => {
        const existing = acc.find(p => p.platform === record.platform)
        if (existing) {
          existing.spend += record.amount
          existing.campaigns += 1
        } else {
          acc.push({
            platform: record.platform,
            spend: record.amount,
            campaigns: 1
          })
        }
        return acc
      }, [] as Array<{ platform: string; spend: number; campaigns: number }>)

      const dailySpend = adSpendData.reduce((acc, record) => {
        const dateStr = record.date.toISOString().split('T')[0]
        const existing = acc.find(d => d.date === dateStr)
        if (existing) {
          existing.spend += record.amount
        } else {
          acc.push({
            date: dateStr,
            spend: record.amount
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