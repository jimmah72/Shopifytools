'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Clock, Database, AlertCircle } from 'lucide-react';

interface SyncStatus {
  storeId: string;
  timeframe: string;
  dateRange: {
    start: string;
    end: string;
  };
  orders: {
    total: number;
    synced: number;
    progress: number;
    remaining: number;
  };
  products: {
    synced: number;
  };
  sync: {
    isActive: boolean;
    orders: {
      lastSyncAt?: string;
      inProgress: boolean;
      errorMessage?: string;
    };
    products: {
      lastSyncAt?: string;
      inProgress: boolean;
      errorMessage?: string;
    };
  };
}

interface SyncProgressIndicatorProps {
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  onTriggerSync: () => void;
  onSyncComplete?: () => void; // New callback for when sync finishes
  className?: string;
}

const timeframeOptions = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' }
];

export function SyncProgressIndicator({
  timeframe,
  onTimeframeChange,
  onTriggerSync,
  onSyncComplete,
  className = ''
}: SyncProgressIndicatorProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wasSyncActive, setWasSyncActive] = useState(false);
  const [lastAutoSyncTimeframe, setLastAutoSyncTimeframe] = useState<string | null>(null);
  const [hasUserChangedTimeframe, setHasUserChangedTimeframe] = useState(false);

  const fetchSyncStatus = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/sync/status?timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sync status: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Check if sync just completed (was active, now inactive)
      if (wasSyncActive && !data.sync.isActive) {
        console.log('Sync completed! Triggering dashboard refresh...');
        onSyncComplete?.();
      }
      
      // Update sync status and track if it was active
      setWasSyncActive(data.sync.isActive);
      setSyncStatus(data);
    } catch (err) {
      console.error('Error fetching sync status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    
    // On component mount, check for and resume any stuck syncs
    resumeStuckSyncs();
    
    // Auto-refresh every 5 seconds if sync is active
    const interval = setInterval(() => {
      if (syncStatus?.sync.isActive) {
        fetchSyncStatus();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [timeframe, syncStatus?.sync.isActive]);

  // Function to automatically resume stuck syncs
  const resumeStuckSyncs = async () => {
    try {
      console.log('SyncProgressIndicator: Checking for stuck syncs...');
      const response = await fetch('/api/sync/resume', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.resumedSyncs > 0) {
          console.log(`SyncProgressIndicator: Resumed ${result.resumedSyncs} stuck syncs`);
          // Refresh status to show resumed syncs
          setTimeout(() => fetchSyncStatus(), 2000);
        } else {
          console.log('SyncProgressIndicator: No stuck syncs found');
        }
      }
    } catch (error) {
      console.error('SyncProgressIndicator: Error checking for stuck syncs:', error);
    }
  };

  // Simple auto-sync: Always sync when progress < 100%
  useEffect(() => {
    if (syncStatus && 
        syncStatus.sync.isActive && 
        syncStatus.orders.remaining > 0 &&
        !loading) {
      
      console.log(`Auto-triggering sync for ${timeframe}: Missing ${syncStatus.orders.remaining} orders (${syncStatus.orders.progress}% complete)`);
      handleAutoSync();
    }
  }, [syncStatus, timeframe]);

  // Track when user manually changes timeframe (not from re-renders)
  const handleTimeframeChange = (newTimeframe: string) => {
    if (newTimeframe !== timeframe) {
      setHasUserChangedTimeframe(true);
      onTimeframeChange(newTimeframe);
    }
  };

  const handleAutoSync = async () => {
    try {
      const timeframeDays = getTimeframeDays(timeframe);
      console.log(`Auto-triggering sync for ${timeframeDays} days...`);
      
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dataType: 'orders',
          timeframeDays: timeframeDays
        })
      });
      
      if (response.ok) {
        console.log('Auto-sync triggered successfully');
        // Refresh status after triggering
        setTimeout(() => fetchSyncStatus(), 1000);
      }
    } catch (error) {
      console.error('Failed to auto-trigger sync:', error);
    }
  };

  const getTimeframeDays = (timeframe: string): number => {
    switch (timeframe) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  };

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
          <span className="text-sm text-gray-400">Loading sync status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-900/20 border border-red-600 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">Error: {error}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchSyncStatus}
            className="ml-auto h-6 text-xs"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!syncStatus) return null;

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-medium text-gray-200">Data Sync Status</h3>
          {syncStatus.sync.isActive && (
            <Badge variant="outline" className="bg-blue-900/50 border-blue-500 text-blue-300">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Syncing
            </Badge>
          )}
        </div>
        
        {/* Time frame selector */}
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-gray-400" />
          <select
            value={timeframe}
            onChange={(e) => handleTimeframeChange(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {timeframeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress Section */}
      <div className="space-y-3">
        {/* Orders Progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Orders</span>
            <span className="text-xs text-gray-300">
              {syncStatus.orders.synced.toLocaleString()} / {syncStatus.orders.total.toLocaleString()}
              {syncStatus.orders.total > 0 && (
                <span className="text-gray-400 ml-1">
                  ({syncStatus.orders.progress}%)
                </span>
              )}
            </span>
          </div>
          <Progress 
            value={syncStatus.orders.progress} 
            className="h-2 bg-gray-700"
          />
          {syncStatus.orders.remaining > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {syncStatus.orders.remaining.toLocaleString()} remaining
            </div>
          )}
        </div>

        {/* Products Count */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Products synced:</span>
          <span className="text-gray-300">{syncStatus.products.synced.toLocaleString()}</span>
        </div>

        {/* Last Sync Times */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-700">
          <div className="flex items-center gap-4">
            <span className="text-gray-400">
              Last sync: {formatLastSync(syncStatus.sync.orders.lastSyncAt)}
            </span>
            {syncStatus.sync.orders.errorMessage && (
              <span className="text-red-400 text-xs">
                Error: {syncStatus.sync.orders.errorMessage}
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onTriggerSync}
              disabled={syncStatus.sync.isActive}
              className="h-6 px-2 text-xs"
            >
              {syncStatus.sync.isActive ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Sync Now
                </>
              )}
            </Button>
            
            {/* Recovery button - only show if sync seems stuck */}
            {syncStatus.sync.isActive && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await fetch('/api/sync/cleanup', { method: 'POST' });
                    // Refresh status after cleanup
                    setTimeout(() => window.location.reload(), 1000);
                  } catch (error) {
                    console.error('Failed to cleanup stuck sync:', error);
                  }
                }}
                className="h-6 px-2 text-xs bg-yellow-600 hover:bg-yellow-700 border-yellow-500"
                title="Reset stuck sync if it appears frozen"
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 