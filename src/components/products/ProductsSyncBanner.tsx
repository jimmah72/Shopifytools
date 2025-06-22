'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface ProductsSyncStatus {
  syncInProgress: boolean;
  syncType: 'manual' | 'auto' | 'initial' | null;
  totalProducts: number;
  processedProducts: number;
  currentProduct?: string;
  lastSyncAt?: string;
  nextAutoSync?: string;
  errorMessage?: string;
  costDataUpdated: number;
  productsWithCostData: number;
}

interface ProductsSyncBannerProps {
  onSyncStart?: () => void;
  onSyncComplete?: () => void;
}

export function ProductsSyncBanner({ onSyncStart, onSyncComplete }: ProductsSyncBannerProps) {
  const [syncStatus, setSyncStatus] = useState<ProductsSyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previousSyncInProgress, setPreviousSyncInProgress] = useState(false);

  // Poll sync status
  useEffect(() => {
    const fetchSyncStatus = async () => {
      try {
        const response = await fetch('/api/products/sync/status');
        if (response.ok) {
          const status = await response.json();
          setSyncStatus(status);
        }
      } catch (error) {
        console.error('Error fetching sync status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSyncStatus();
    
    // ✅ FIXED: Poll every 3 seconds during sync, every 5 seconds otherwise (faster detection)
    const interval = setInterval(fetchSyncStatus, 
      syncStatus?.syncInProgress ? 3000 : 5000
    );

    return () => clearInterval(interval);
  }, [syncStatus?.syncInProgress]);

  // Detect sync completion and trigger callback
  useEffect(() => {
    if (previousSyncInProgress && syncStatus && !syncStatus.syncInProgress) {
      // Sync just completed
      console.log('Products sync completed, triggering onSyncComplete callback');
      onSyncComplete?.();
    }
    if (syncStatus) {
      setPreviousSyncInProgress(syncStatus.syncInProgress);
    }
  }, [syncStatus?.syncInProgress, previousSyncInProgress, onSyncComplete]);

  const handleManualSync = async () => {
    if (syncStatus?.syncInProgress) return;
    
    try {
      setIsLoading(true);
      onSyncStart?.();
      
      const response = await fetch('/api/products/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'manual' })
      });

      if (!response.ok) {
        throw new Error('Failed to start sync');
      }

      // Status will be updated by polling
    } catch (error) {
      console.error('Error starting sync:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatNextSync = (dateString: string) => {
    const now = new Date();
    const next = new Date(dateString);
    const diffHours = Math.round((next.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `in ${diffHours}h`;
    } else {
      return formatDate(dateString);
    }
  };

  if (isLoading || !syncStatus) {
    return (
      <div className="border-b border-gray-700 bg-gray-800/50 px-6 py-3">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
          <span className="text-sm text-gray-400">Loading sync status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-700 bg-gray-800/50 px-6 py-4">
      {syncStatus.syncInProgress ? (
        // Sync in progress
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
              <div>
                <h3 className="text-sm font-medium text-gray-200">
                  Syncing Product Cost Data {syncStatus.syncType === 'auto' && '(Auto Sync)'}
                </h3>
                <p className="text-xs text-gray-400">
                  {syncStatus.currentProduct ? `Processing: ${syncStatus.currentProduct}` : 'Fetching cost data from Shopify...'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-200">
                {syncStatus.processedProducts} / {syncStatus.totalProducts}
              </div>
              <div className="text-xs text-gray-400">
                {syncStatus.costDataUpdated} costs updated
              </div>
            </div>
          </div>
          
          <Progress 
            value={(syncStatus.processedProducts / syncStatus.totalProducts) * 100} 
            className="h-2 bg-gray-700"
          />
        </div>
      ) : syncStatus.errorMessage ? (
        // Error state
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div>
              <h3 className="text-sm font-medium text-red-400">Sync Failed</h3>
              <p className="text-xs text-gray-400">{syncStatus.errorMessage}</p>
            </div>
          </div>
          <Button 
            onClick={handleManualSync}
            variant="outline" 
            size="sm"
            className="border-red-600 text-red-400 hover:bg-red-600/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Sync
          </Button>
        </div>
      ) : (
        // Success/idle state
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div>
              <h3 className="text-sm font-medium text-gray-200">
                Product Costs Synced
              </h3>
              <p className="text-xs text-gray-400">
                {syncStatus.productsWithCostData} of {syncStatus.totalProducts} products have cost data
                {syncStatus.lastSyncAt && ` • Last synced ${formatDate(syncStatus.lastSyncAt)}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {syncStatus.nextAutoSync && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                <span>Next auto sync {formatNextSync(syncStatus.nextAutoSync)}</span>
              </div>
            )}
            
            <Button 
              onClick={handleManualSync}
              variant="outline" 
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 