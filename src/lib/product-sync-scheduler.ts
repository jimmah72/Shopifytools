// Product Sync Scheduler
// Handles daily auto-sync of product costs at 6am CST

interface SchedulerState {
  isRunning: boolean;
  nextScheduledSync: Date | null;
  timeoutId: NodeJS.Timeout | null;
}

class ProductSyncScheduler {
  private state: SchedulerState = {
    isRunning: false,
    nextScheduledSync: null,
    timeoutId: null
  };

  constructor() {
    this.scheduleNextSync();
  }

  private calculateNextSyncTime(): Date {
    const now = new Date();
    const next = new Date();
    
    // Set to 6am CST (12pm UTC)
    next.setUTCHours(12, 0, 0, 0);
    
    // If it's already past 6am CST today, schedule for tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    
    return next;
  }

  private async triggerAutoSync(): Promise<void> {
    const timestamp = new Date().toISOString()
    
    try {
      console.log('🚀 SYNC TRIGGER DETECTED - Auto Scheduler (6am CST)')
      console.log(`📅 Timestamp: ${timestamp}`)
      console.log('🔍 SCHEDULER TRIGGER DETAILS:')
      console.log('   🎯 Trigger Reason: Daily auto-sync at 6am CST')
      console.log('   📍 Trigger Source: ProductSyncScheduler')
      console.log('   🤖 Trigger Type: Automated')
      
      // Check if changes were made in the last 24 hours
      const hasChanges = await this.checkForRecentChanges();
      
      if (!hasChanges) {
        console.log('❌ SCHEDULER SYNC SKIPPED - No recent changes detected in last 24 hours');
        this.scheduleNextSync();
        return;
      }
      
      console.log('✅ SCHEDULER SYNC PROCEEDING - Recent changes detected, triggering sync');
      
      // Trigger the sync via API call
      const response = await fetch('/api/products/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'ProductSyncScheduler/1.0 (auto-scheduler)',
          'X-Trigger-Source': 'scheduler',
          'X-Trigger-Reason': 'daily-auto-sync'
        },
        body: JSON.stringify({ 
          type: 'auto',
          triggerReason: 'Daily auto-sync at 6am CST',
          triggerSource: 'ProductSyncScheduler'
        })
      });
      
      if (response.ok) {
        console.log('Product Sync Scheduler - Auto sync started successfully');
      } else {
        console.error('Product Sync Scheduler - Failed to start auto sync:', response.statusText);
      }
      
    } catch (error) {
      console.error('Product Sync Scheduler - Error triggering auto sync:', error);
    } finally {
      // Schedule the next sync regardless of outcome
      this.scheduleNextSync();
    }
  }

  private async checkForRecentChanges(): Promise<boolean> {
    try {
      // Check if any products were modified in the last 24 hours
      const response = await fetch('/api/products/changes/check');
      if (response.ok) {
        const { hasChanges } = await response.json();
        return hasChanges;
      }
      
      // If we can't check, assume there are changes to be safe
      return true;
      
    } catch (error) {
      console.error('Product Sync Scheduler - Error checking for changes:', error);
      // If we can't check, assume there are changes to be safe
      return true;
    }
  }

  private scheduleNextSync(): void {
    // Clear any existing timeout
    if (this.state.timeoutId) {
      clearTimeout(this.state.timeoutId);
    }
    
    const nextSync = this.calculateNextSyncTime();
    const msUntilSync = nextSync.getTime() - Date.now();
    
    console.log(`Product Sync Scheduler - Next auto sync scheduled for: ${nextSync.toISOString()} (in ${Math.round(msUntilSync / (1000 * 60 * 60))} hours)`);
    
    this.state.nextScheduledSync = nextSync;
    this.state.timeoutId = setTimeout(() => {
      this.triggerAutoSync();
    }, msUntilSync);
  }

  public start(): void {
    if (this.state.isRunning) {
      console.log('Product Sync Scheduler - Already running');
      return;
    }
    
    this.state.isRunning = true;
    console.log('Product Sync Scheduler - Started');
    this.scheduleNextSync();
  }

  public stop(): void {
    if (this.state.timeoutId) {
      clearTimeout(this.state.timeoutId);
      this.state.timeoutId = null;
    }
    
    this.state.isRunning = false;
    this.state.nextScheduledSync = null;
    console.log('Product Sync Scheduler - Stopped');
  }

  public getNextScheduledTime(): Date | null {
    return this.state.nextScheduledSync;
  }

  public isRunning(): boolean {
    return this.state.isRunning;
  }
}

// Export singleton instance
export const productSyncScheduler = new ProductSyncScheduler();

// Auto-start the scheduler in production
if (process.env.NODE_ENV === 'production') {
  productSyncScheduler.start();
  console.log('Product Sync Scheduler - Auto-started for production environment');
} 