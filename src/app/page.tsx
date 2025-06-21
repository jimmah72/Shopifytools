'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SyncProgressIndicator } from '@/components/dashboard/SyncProgressIndicator';
import { Modal } from '@/components/ui/modal';
import { 
  FinancialBreakdown, 
  BreakdownType as ModalBreakdownType, 
  DashboardMetrics as ModalMetrics 
} from '@/components/dashboard/FinancialBreakdown';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Truck, 
  Receipt, 
  Target,
  TrendingDown,
  Calculator,
  CreditCard,
  Building,
  PackageX,
  RefreshCcw,
  AlertTriangle,
  Banknote,
  PiggyBank,
  Plus,
  Calendar
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const getTimeframeLabel = (timeframe: string): string => {
  const now = new Date();
  let daysBack = 30;
  
  switch (timeframe) {
    case '7d': daysBack = 7; break;
    case '30d': daysBack = 30; break;
    case '90d': daysBack = 90; break;
    case '1y': daysBack = 365; break;
  }
  
  const startDate = new Date();
  startDate.setDate(now.getDate() - daysBack);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };
  
  const baseLabelMap: Record<string, string> = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    '1y': 'Last year'
  };
  
  return `${baseLabelMap[timeframe]} (${formatDate(startDate)} - ${formatDate(now)})`;
};

interface DashboardMetrics {
  totalSales: number;
  totalOrders: number;
  totalItems: number;
  totalProducts: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalShippingRevenue: number;
  totalTaxes: number;
  adSpend: number;
  roas: number;
  poas: number;
  cog: number;
  fees: number;
  overheadCosts: number;
  shippingCosts: number;
  miscCosts: number;
  additionalCosts: number;  // NEW
  subscriptionCosts: number;  // NEW
  totalRefunds: number;
  chargebacks: number;
  paymentGatewayFees: number;
  processingFees: number;
  netRevenue: number;
  totalDiscounts: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    totalPrice: number;
    createdAt: string;
    customer?: {
      fullName: string;
    };
  }>;
  dataSource: string;
  lastSyncTime?: string;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState(() => {
    // Persist timeframe across page refreshes
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dashboard-timeframe') || '30d';
    }
    return '30d';
  });
  const [lastAutoRefresh, setLastAutoRefresh] = useState<Date | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalBreakdownType, setModalBreakdownType] = useState<ModalBreakdownType | null>(null);

  const openModal = (breakdownType: ModalBreakdownType) => {
    setModalBreakdownType(breakdownType);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalBreakdownType(null);
  };

  const getModalTitle = (type: ModalBreakdownType | null): string => {
    if (!type) return '';
    switch (type) {
      case 'netRevenue': return 'Net Revenue Breakdown';
      case 'paymentGatewayFees': return 'Payment Gateway Fees';
      case 'processingFees': return 'Processing Fees Breakdown';
      case 'cog': return 'Cost of Goods Breakdown';
      case 'totalRefunds': return 'Total Refunds Breakdown';
      case 'averageOrderValue': return 'Average Order Value Calculation';
      case 'totalItems': return 'Total Items & Average Per Order';
      case 'totalDiscounts': return 'Total Discounts Breakdown';
      case 'additionalCosts': return 'Additional Costs Breakdown';  // NEW
      case 'subscriptionCosts': return 'Subscription Costs Breakdown';  // NEW
      default: return 'Financial Breakdown';
    }
  };

  const fetchDashboardData = async (selectedTimeframe = timeframe) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/dashboard?timeframe=${selectedTimeframe}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to fetch dashboard data');
      }
      
      const data: DashboardMetrics = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    // Persist timeframe selection across page refreshes
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-timeframe', newTimeframe);
    }
    fetchDashboardData(newTimeframe);
  };

  const handleTriggerSync = async () => {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataType: 'all' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to trigger sync');
      }
      
      // Refresh dashboard data after triggering sync
      setTimeout(() => fetchDashboardData(), 1000);
    } catch (err) {
      console.error('Error triggering sync:', err);
    }
  };

  if (error) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-100 mb-6">
          Dashboard Overview ({getTimeframeLabel(timeframe)})
        </h1>
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
          <Button 
            onClick={() => fetchDashboardData()} 
            className="mt-2" 
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-100 mb-6">
        Dashboard Overview ({getTimeframeLabel(timeframe)})
      </h1>

      {/* Sync Progress Indicator */}
      <SyncProgressIndicator
        timeframe={timeframe}
        onTimeframeChange={handleTimeframeChange}
        onTriggerSync={handleTriggerSync}
        onSyncComplete={() => {
          console.log('Dashboard: Sync completed, auto-refreshing data...');
          setLastAutoRefresh(new Date());
          fetchDashboardData();
        }}
        className="mb-6"
      />

      {/* Data Source Indicator */}
      {metrics && (
        <div className="mb-4 text-sm text-gray-400">
          Data source: {metrics.dataSource === 'local_database' ? '🗄️ Local Database (Fast)' : '☁️  Shopify API (Slow)'}
          {metrics.lastSyncTime && (
            <span className="ml-2">
              • Last sync: {new Date(metrics.lastSyncTime).toLocaleString()}
            </span>
          )}
          {lastAutoRefresh && (
            <span className="ml-2 text-green-400">
              • ✨ Auto-refreshed: {lastAutoRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Revenue"
          value={metrics ? formatCurrency(metrics.totalRevenue) : '$0'}
          icon={DollarSign}
          loading={loading}
          variant="income"
        />
        <StatCard
          title="Total Orders / Total Items / Avg Items Per Order"
          value={metrics ? `${metrics.totalOrders.toLocaleString()} / ${metrics.totalItems.toLocaleString()} / ${metrics.totalOrders > 0 ? (metrics.totalItems / metrics.totalOrders).toFixed(1) : '0'}` : '0 / 0 / 0'}
          icon={ShoppingCart}
          loading={loading}
          clickable={true}
          onClick={() => openModal('totalItems')}
        />
        <StatCard
          title="Total Products"
          value={metrics ? metrics.totalProducts.toLocaleString() : '0'}
          icon={Package}
          loading={loading}
        />
        <StatCard
          title="Avg Order Value"
          value={metrics ? formatCurrency(metrics.averageOrderValue) : '$0'}
          icon={TrendingUp}
          loading={loading}
          clickable={true}
          onClick={() => openModal('averageOrderValue')}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <StatCard
          title="Shipping Revenue"
          value={metrics ? formatCurrency(metrics.totalShippingRevenue) : '$0'}
          icon={Truck}
          loading={loading}
          variant="income"
        />
        <StatCard
          title="Total Taxes"
          value={metrics ? formatCurrency(metrics.totalTaxes) : '$0'}
          icon={Receipt}
          loading={loading}
        />
      </div>

      {/* Discounts & Adjustments */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-200 mb-4">Discounts & Promotions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            title="Total Discounts"
            value={metrics ? formatCurrency(metrics.totalDiscounts || 0) : '$0'}
            icon={Receipt}
            loading={loading}
            variant="neutral"
            clickable={true}
            onClick={() => openModal('totalDiscounts')}
          />
          <StatCard
            title="Discount Rate"
            value={metrics ? `${metrics.totalRevenue > 0 ? ((metrics.totalDiscounts || 0) / metrics.totalRevenue * 100).toFixed(2) : '0'}%` : '0%'}
            icon={TrendingDown}
            loading={loading}
            variant="neutral"
          />
        </div>
      </div>

      {/* Marketing & Performance Metrics */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-200 mb-4">Marketing & Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Ad Spend"
            value={metrics ? formatCurrency(metrics.adSpend || 0) : '$0'}
            icon={Target}
            loading={loading}
            variant="expense"
          />
          <StatCard
            title="ROAS"
            value={metrics ? `${(metrics.roas || 0).toFixed(2)}x` : '0.00x'}
            icon={TrendingUp}
            loading={loading}
            variant="income"
          />
          <StatCard
            title="POAS"
            value={metrics ? `${(metrics.poas || 0).toFixed(2)}x` : '0.00x'}
            icon={TrendingUp}
            loading={loading}
            variant="income"
          />
          <StatCard
            title="Cost of Goods"
            value={metrics ? formatCurrency(metrics.cog || 0) : '$0'}
            icon={PackageX}
            loading={loading}
            variant="expense"
            clickable={true}
            onClick={() => openModal('cog')}
          />
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-200 mb-4">Cost Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Fees"
            value={metrics ? formatCurrency(metrics.fees || 0) : '$0'}
            icon={CreditCard}
            loading={loading}
            variant="expense"
          />
          <StatCard
            title="Additional Costs"
            value={metrics ? formatCurrency(metrics.additionalCosts || 0) : '$0'}
            icon={Plus}
            loading={loading}
            variant="expense"
            clickable={true}
            onClick={() => openModal('additionalCosts')}
          />
          <StatCard
            title="Subscription Costs"
            value={metrics ? formatCurrency(metrics.subscriptionCosts || 0) : '$0'}
            icon={Calendar}
            loading={loading}
            variant="expense"
            clickable={true}
            onClick={() => openModal('subscriptionCosts')}
          />
          <StatCard
            title="Shipping Costs"
            value={metrics ? formatCurrency(metrics.shippingCosts || 0) : '$0'}
            icon={Truck}
            loading={loading}
            variant="expense"
          />
        </div>
      </div>

      {/* Financial Impact & Adjustments */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-200 mb-4">Financial Impact & Adjustments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            title="Total Refunds"
            value={metrics ? formatCurrency(metrics.totalRefunds || 0) : '$0'}
            icon={RefreshCcw}
            loading={loading}
            variant="expense"
            clickable={true}
            onClick={() => openModal('totalRefunds')}
          />
          <StatCard
            title="Chargebacks"
            value={metrics ? formatCurrency(metrics.chargebacks || 0) : '$0'}
            icon={AlertTriangle}
            loading={loading}
            variant="expense"
          />
          <StatCard
            title="Gateway Fees"
            value={metrics ? formatCurrency(metrics.paymentGatewayFees || 0) : '$0'}
            icon={CreditCard}
            loading={loading}
            variant="expense"
            clickable={true}
            onClick={() => openModal('paymentGatewayFees')}
          />
          <StatCard
            title="Processing Fees"
            value={metrics ? formatCurrency(metrics.processingFees || 0) : '$0'}
            icon={Banknote}
            loading={loading}
            variant="expense"
            clickable={true}
            onClick={() => openModal('processingFees')}
          />
          <StatCard
            title="Net Revenue"
            value={metrics ? formatCurrency(metrics.netRevenue || metrics.totalRevenue || 0) : '$0'}
            icon={PiggyBank}
            loading={loading}
            variant="income"
            clickable={true}
            onClick={() => openModal('netRevenue')}
          />
        </div>
      </div>

      {loading && (
        <div className="flex justify-center mt-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      )}

      {/* Financial Breakdown Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={getModalTitle(modalBreakdownType)}
      >
        {modalBreakdownType && metrics && (
          <FinancialBreakdown
            type={modalBreakdownType}
            metrics={metrics as ModalMetrics}
          />
        )}
      </Modal>
    </div>
  );
}
