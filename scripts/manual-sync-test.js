#!/usr/bin/env node

async function manualSyncTest() {
  console.log('🔄 Testing manual sync to identify order sync issues...');
  
  try {
    console.log('📡 Calling sync API...');
    
    const response = await fetch('http://localhost:3000/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataType: 'orders',
        timeframeDays: 30
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Sync API call successful');
      console.log('📊 Results:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Sync API call failed');
      console.log('🚨 Error:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error calling sync API:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the Next.js server is running on http://localhost:3000');
    }
  }
}

manualSyncTest(); 