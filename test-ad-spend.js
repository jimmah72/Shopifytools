import { prisma } from './src/lib/prisma.ts'

async function testAdSpendData() {
  console.log('📊 Testing Ad Spend Data & Gmail Integration\n')
  
  try {
    // 1. Check current ad spend records
    const adSpendRecords = await prisma.adSpend.findMany({
      orderBy: { date: 'desc' },
      take: 10
    })
    
    console.log(`📈 Found ${adSpendRecords.length} recent ad spend records:`)
    
    if (adSpendRecords.length > 0) {
      console.table(adSpendRecords.map(record => ({
        Date: record.date.toISOString().split('T')[0],
        Platform: record.platform,
        Amount: `$${record.amount}`,
        Campaign: record.campaignId || 'No campaign',
        Account: record.accountId
      })))
      
      // Summary statistics
      const totalSpend = adSpendRecords.reduce((sum, r) => sum + r.amount, 0)
      const platforms = [...new Set(adSpendRecords.map(r => r.platform))]
      
      console.log(`\n💰 Total spend in recent records: $${totalSpend.toFixed(2)}`)
      console.log(`🏷️  Platforms: ${platforms.join(', ')}`)
      
      // Check date range
      const dates = adSpendRecords.map(r => r.date)
      const oldestDate = new Date(Math.min(...dates))
      const newestDate = new Date(Math.max(...dates))
      
      console.log(`📅 Date range: ${oldestDate.toISOString().split('T')[0]} to ${newestDate.toISOString().split('T')[0]}`)
    } else {
      console.log('⚠️  No ad spend records found')
      console.log('💡 This could mean:')
      console.log('   - Gmail automation hasn\'t run yet')
      console.log('   - No Google Ads emails with CSV attachments received')
      console.log('   - Webhook endpoint not receiving data')
    }
    
    // 2. Check ad spend integrations
    console.log('\n🔗 Checking Ad Spend Integrations:')
    
    const integrations = await prisma.adSpendIntegration.findMany({
      include: {
        store: true
      }
    })
    
    if (integrations.length > 0) {
      console.table(integrations.map(integration => ({
        Platform: integration.platform,
        Store: integration.store.domain,
        Active: integration.isActive ? '✅' : '❌',
        'Last Sync': integration.lastSyncAt ? integration.lastSyncAt.toISOString().split('T')[0] : 'Never'
      })))
    } else {
      console.log('⚠️  No ad spend integrations configured')
      console.log('💡 Set up OAuth integrations in the Ad Spend page')
    }
    
    // 3. Test webhook endpoint
    console.log('\n🔗 Testing webhook endpoint...')
    
    const testData = {
      apiKey: 'shopify-tools-webhook-2025',
      storeDomain: '25898e.myshopify.com',
      platform: 'google_ads',
      spend: 25.50,
      date: new Date().toISOString().split('T')[0],
      campaignId: 'test-campaign-123',
      campaignName: 'Test Campaign',
      impressions: 1000,
      clicks: 50,
      conversions: 2
    }
    
    try {
      const response = await fetch('http://localhost:3000/api/ad-spend/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Webhook test successful:', result.message)
      } else {
        const error = await response.json()
        console.log('❌ Webhook test failed:', error.error)
      }
    } catch (fetchError) {
      console.log('⚠️  Webhook test skipped (server not running locally)')
    }
    
    // 4. Gmail integration status
    console.log('\n📧 Gmail Integration Status:')
    console.log('  n8n Workflow: Google_Ads_Daily_Sync_Fixed.json')
    console.log('  🔍 Searches for: from:googleads-noreply@google.com has:attachment subject:"Daily Ad Spend"')
    console.log('  📊 Processes: CSV attachments from Google Ads emails')
    console.log('  🔗 Sends to: https://shopifytoolsprofit.netlify.app/api/ad-spend/webhook')
    console.log('')
    console.log('💡 To check if Gmail integration is working:')
    console.log('   1. Check your Gmail for Google Ads emails with CSV attachments')
    console.log('   2. Verify n8n workflow is active and running daily at 6 AM')
    console.log('   3. Check webhook logs for incoming data')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAdSpendData() 