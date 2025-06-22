// Initialize all schedulers
import { productSyncScheduler } from './product-sync-scheduler';

export function initializeSchedulers() {
  console.log('🚀 Initializing schedulers...');
  
  try {
    // Start the product sync scheduler
    productSyncScheduler.start();
    console.log('✅ Product sync scheduler initialized');
    
    // Log next scheduled sync time
    const nextSync = productSyncScheduler.getNextScheduledTime();
    if (nextSync) {
      console.log(`📅 Next product auto-sync scheduled for: ${nextSync.toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })} CST`);
    }
    
  } catch (error) {
    console.error('❌ Error initializing schedulers:', error);
  }
}

// Auto-initialize in development mode for testing
if (process.env.NODE_ENV === 'development') {
  initializeSchedulers();
} 