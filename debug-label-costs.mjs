import { getBulkShippingCosts } from './src/lib/shipping-db.js';

async function debugLabelCosts() {
  console.log('=== DEBUGGING LABEL COSTS ===');
  
  // Test with a few recent orders
  const testOrders = ['#PG5818', '#PG5819', '#PG5820'];
  
  console.log('Testing with orders:', testOrders);
  
  const results = await getBulkShippingCosts(testOrders, 'fulfilled');
  
  console.log('\n=== RESULTS ===');
  console.log('Number of orders with costs:', Object.keys(results).length);
  console.log('Order results:', results);
  
  if (Object.keys(results).length > 0) {
    console.log('\n=== SUCCESS! ===');
    Object.entries(results).forEach(([orderName, costs]) => {
      console.log(`${orderName}: $${costs[0]?.shipping_cost || 0} from ${costs[0]?.carrier || 'Unknown'}`);
    });
  } else {
    console.log('\n=== NO COSTS FOUND ===');
  }
}

debugLabelCosts().catch(console.error); 