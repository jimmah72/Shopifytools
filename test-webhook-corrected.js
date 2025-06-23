const fetch = require('node-fetch');

// Test data matching the actual database structure
const testData = {
  apiKey: 'shopify-tools-webhook-2025',
  storeDomain: '25898e.myshopify.com',
  platform: 'google_ads',
  accountId: 'test-account-123',
  campaignId: 'campaign-123',
  campaignName: 'Test Campaign',
  spend: 25.50,
  date: '2025-01-23',
  impressions: 1000,
  clicks: 50,
  conversions: 3,
  conversionValue: 150.00,
  currency: 'USD'
};

async function testWebhook() {
  console.log('🧪 Testing corrected webhook with actual database structure...');
  console.log('📊 Test data:', JSON.stringify(testData, null, 2));
  
  try {
    // Test local webhook
    console.log('\n🏠 Testing local webhook...');
    const localResponse = await fetch('http://localhost:3000/api/ad-spend/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const localResult = await localResponse.json();
    console.log(`✅ Local Status: ${localResponse.status}`);
    console.log('📝 Local Response:', JSON.stringify(localResult, null, 2));
    
    if (localResponse.ok && localResult.success) {
      console.log('\n🎉 SUCCESS: Local webhook is working with corrected database structure!');
      console.log(`💰 Saved spend amount: ${localResult.data.amount}`);
      console.log(`📅 Date: ${localResult.data.date}`);
      console.log(`🏪 Platform: ${localResult.data.platform}`);
    } else {
      console.log('\n❌ Local webhook failed');
    }
    
  } catch (error) {
    console.error('💥 Error testing webhook:', error.message);
  }
}

// Run the test
testWebhook(); 