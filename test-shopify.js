import dotenv from 'dotenv';
dotenv.config();

async function testShopifyCredentials() {
  const { SHOPIFY_APP_API_KEY, SHOPIFY_APP_SECRET } = process.env;
  
  console.log('Testing Shopify API Credentials:');
  console.log('--------------------------------');
  
  // Check if credentials exist
  if (!SHOPIFY_APP_API_KEY || !SHOPIFY_APP_SECRET) {
    console.error('❌ Missing Shopify credentials in .env file');
    return;
  }

  // Validate credential formats
  const isValidKey = /^[a-f0-9]{32}$/.test(SHOPIFY_APP_API_KEY);
  const isValidSecret = /^[a-f0-9]{32}$/.test(SHOPIFY_APP_SECRET);

  console.log('API Key format:', isValidKey ? '✅ Valid' : '❌ Invalid');
  console.log('API Secret format:', isValidSecret ? '✅ Valid' : '❌ Invalid');

  // Test API key length
  console.log('API Key length:', SHOPIFY_APP_API_KEY.length === 32 ? '✅ Correct (32)' : '❌ Incorrect');
  console.log('API Secret length:', SHOPIFY_APP_SECRET.length === 32 ? '✅ Correct (32)' : '❌ Incorrect');
}

testShopifyCredentials(); 