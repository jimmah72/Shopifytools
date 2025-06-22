'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Clock, Database, AlertCircle, StopCircle, Pause, Play } from 'lucide-react';

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
  onSyncComplete?: () => void;
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
  
  // Circuit breaker state
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitRetryCount, setRateLimitRetryCount] = useState(0);
  const [lastRateLimitTime, setLastRateLimitTime] = useState<Date | null>(null);
  const [autoSyncPaused, setAutoSyncPaused] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  
  // Refs for cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const rateLimitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Constants for circuit breaker
  const MAX_RATE_LIMIT_RETRIES = 3;
  const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
  const POLLING_INTERVAL_MS = 8000; // Increased from 5 seconds

  const fetchSyncStatus = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/sync/status?timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sync status: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Check for rate limiting indicators
      const hasRateLimitError = data.sync.orders.errorMessage?.includes('Rate limited') || 
                               data.sync.orders.errorMessage?.includes('Too Many Requests');
      
      if (hasRateLimitError) {
        handleRateLimit();
      } else {
        // Reset rate limit state if sync is working
        if (isRateLimited && !hasRateLimitError) {
          console.log('✅ Rate limiting resolved, resuming normal operation');
          setIsRateLimited(false);
          setRateLimitRetryCount(0);
          setLastRateLimitTime(null);
        }
      }
      
      // Check if sync just completed (was active, now inactive)
      if (wasSyncActive && !data.sync.isActive) {
        console.log('✅ Sync completed! Triggering dashboard refresh...');
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

  const handleRateLimit = () => {
    console.log('🚨 Rate limiting detected, implementing circuit breaker');
    setIsRateLimited(true);
    setRateLimitRetryCount(prev => prev + 1);
    setLastRateLimitTime(new Date());
    
    if (rateLimitRetryCount >= MAX_RATE_LIMIT_RETRIES) {
      console.log('🛑 Max rate limit retries reached, pausing auto-sync');
      setAutoSyncPaused(true);
      
      // Auto-resume after cooldown
      if (rateLimitTimeoutRef.current) {
        clearTimeout(rateLimitTimeoutRef.current);
      }
      rateLimitTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Rate limit cooldown complete, resuming auto-sync');
        setIsRateLimited(false);
        setRateLimitRetryCount(0);
        setAutoSyncPaused(false);
        setLastRateLimitTime(null);
      }, RATE_LIMIT_COOLDOWN_MS);
    }
  };

  const stopSync = async () => {
    try {
      console.log('🛑 Manually stopping sync...');
      const response = await fetch('/api/sync/cleanup', { method: 'POST' });
      if (response.ok) {
        setManuallyPaused(true);
        // Refresh status after stopping
        setTimeout(() => fetchSyncStatus(), 1000);
      }
    } catch (error) {
      console.error('Failed to stop sync:', error);
    }
  };

  const resumeSync = () => {
    console.log('▶️ Manually resuming sync...');
    setManuallyPaused(false);
    setAutoSyncPaused(false);
    setIsRateLimited(false);
    setRateLimitRetryCount(0);
  };

  useEffect(() => {
    fetchSyncStatus();
    
    // Clear any existing intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Set up polling with circuit breaker logic
    intervalRef.current = setInterval(() => {
      if (syncStatus?.sync.isActive && !manuallyPaused) {
        fetchSyncStatus();
      }
    }, POLLING_INTERVAL_MS);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (rateLimitTimeoutRef.current) {
        clearTimeout(rateLimitTimeoutRef.current);
      }
    };
  }, [timeframe, syncStatus?.sync.isActive, manuallyPaused]);

  // DISABLED: Removed auto-sync logic to prevent loops
  // The auto-sync was causing infinite loops with rate limiting
  // Users must manually trigger syncs now

  // Track when user manually changes timeframe
  const handleTimeframeChange = (newTimeframe: string) => {
    if (newTimeframe !== timeframe) {
      onTimeframeChange(newTimeframe);
    }
  };

  const handleManualSync = async () => {
    if (isRateLimited && rateLimitRetryCount >= MAX_RATE_LIMIT_RETRIES) {
      alert('Sync is rate limited. Please wait for the cooldown period to complete.');
      return;
    }
    
    onTriggerSync();
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

  const formatRateLimitStatus = () => {
    if (!isRateLimited) return null;
    
    const timeRemaining = lastRateLimitTime 
      ? Math.max(0, RATE_LIMIT_COOLDOWN_MS - (Date.now() - lastRateLimitTime.getTime()))
      : 0;
    
    const minutesRemaining = Math.ceil(timeRemaining / (1000 * 60));
    
    return (
      <div className="text-xs text-yellow-400 mt-1">
        ⚠️ Rate limited - Cooldown: {minutesRemaining > 0 ? `${minutesRemaining}m remaining` : 'Ending soon'}
      </div>
    );
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

  const isStuck = syncStatus.sync.isActive && syncStatus.orders.remaining > 0 && isRateLimited;

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
          {isRateLimited && (
            <Badge variant="outline" className="bg-yellow-900/50 border-yellow-500 text-yellow-300">
              <AlertCircle className="w-3 h-3 mr-1" />
              Rate Limited
            </Badge>
          )}
          {manuallyPaused && (
            <Badge variant="outline" className="bg-gray-600/50 border-gray-500 text-gray-300">
              <Pause className="w-3 h-3 mr-1" />
              Paused
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
          {formatRateLimitStatus()}
        </div>

        {/* Products Count */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Products synced:</span>
          <span className="text-gray-300">{syncStatus.products.synced.toLocaleString()}</span>
        </div>

        {/* Controls and Status */}
        <div className="border-t border-gray-700 pt-3">
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-xs">
              Last sync: {formatLastSync(syncStatus.sync.orders.lastSyncAt)}
            </span>
            {syncStatus.sync.orders.errorMessage && (
              <span className="text-red-400 text-xs">
                Error: {syncStatus.sync.orders.errorMessage}
              </span>
            )}
          </div>
          
          <div className="flex gap-2 mt-2">
            {!syncStatus.sync.isActive ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualSync}
                disabled={isRateLimited && rateLimitRetryCount >= MAX_RATE_LIMIT_RETRIES}
                className="h-6 px-2 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Sync Now
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={stopSync}
                className="h-6 px-2 text-xs bg-red-600 hover:bg-red-700 border-red-500"
              >
                <StopCircle className="w-3 h-3 mr-1" />
                Stop Sync
              </Button>
            )}
            
            {manuallyPaused && (
              <Button
                size="sm"
                variant="outline"
                onClick={resumeSync}
                className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700 border-green-500"
              >
                <Play className="w-3 h-3 mr-1" />
                Resume
              </Button>
            )}
            
            {/* Emergency Reset button */}
            {isStuck && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await fetch('/api/sync/cleanup', { method: 'POST' });
                    setIsRateLimited(false);
                    setRateLimitRetryCount(0);
                    setAutoSyncPaused(false);
                    setTimeout(() => window.location.reload(), 1000);
                  } catch (error) {
                    console.error('Failed to cleanup stuck sync:', error);
                  }
                }}
                className="h-6 px-2 text-xs bg-yellow-600 hover:bg-yellow-700 border-yellow-500"
                title="Emergency reset for stuck/rate-limited sync"
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