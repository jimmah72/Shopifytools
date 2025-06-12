'use client';

import { useEffect, useState } from 'react';
import { Paper, Typography, Box, CircularProgress, Alert } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import InventoryIcon from "@mui/icons-material/Inventory";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";

const StatCard = ({ title, value, icon: Icon, trend, loading }: { 
  title: string; 
  value: string; 
  icon: any; 
  trend?: string;
  loading?: boolean;
}) => (
  <Paper elevation={2} sx={{ p: 3 }}>
    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
      <Icon sx={{ fontSize: 40, color: "primary.main", mr: 2 }} />
      <Typography variant="h6" color="text.secondary">
        {title}
      </Typography>
    </Box>
    {loading ? (
      <CircularProgress size={24} sx={{ mb: 2 }} />
    ) : (
      <Typography variant="h4" component="div" sx={{ mb: 1 }}>
        {value}
      </Typography>
    )}
    {trend && !loading && (
      <Typography variant="body2" color="success.main" sx={{ display: "flex", alignItems: "center" }}>
        <TrendingUpIcon sx={{ mr: 0.5 }} fontSize="small" />
        {trend}
      </Typography>
    )}
  </Paper>
);

interface DashboardMetrics {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalShippingCosts: number;
  totalTaxes: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    totalPrice: number;
    createdAt: string;
    customer?: {
      fullName: string;
    };
  }>;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/dashboard');
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

    fetchDashboardData();
  }, []);

  if (error) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 4 }}>
          Dashboard Overview (Last 30 days)
        </Typography>
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Dashboard Overview (Last 30 days)
      </Typography>

      {/* Main Metrics Grid */}
      <Box sx={{ 
        display: "grid", 
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(4, 1fr)"
        },
        gap: 3,
        mb: 4
      }}>
        <StatCard
          title="Total Revenue"
          value={metrics ? formatCurrency(metrics.totalRevenue) : '$0'}
          icon={MonetizationOnIcon}
          loading={loading}
        />
        <StatCard
          title="Total Orders"
          value={metrics ? metrics.totalOrders.toString() : '0'}
          icon={ShoppingCartIcon}
          loading={loading}
        />
        <StatCard
          title="Total Products"
          value={metrics ? metrics.totalProducts.toString() : '0'}
          icon={InventoryIcon}
          loading={loading}
        />
        <StatCard
          title="Avg Order Value"
          value={metrics ? formatCurrency(metrics.averageOrderValue) : '$0'}
          icon={MonetizationOnIcon}
          loading={loading}
        />
      </Box>

      {/* Secondary Metrics */}
      <Box sx={{ 
        display: "grid", 
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)"
        },
        gap: 3
      }}>
        <StatCard
          title="Shipping Costs"
          value={metrics ? formatCurrency(metrics.totalShippingCosts) : '$0'}
          icon={TrendingUpIcon}
          loading={loading}
        />
        <StatCard
          title="Total Taxes"
          value={metrics ? formatCurrency(metrics.totalTaxes) : '$0'}
          icon={TrendingUpIcon}
          loading={loading}
        />
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}
