'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Calculator, DollarSign } from 'lucide-react';

export interface DashboardMetrics {
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
  totalRefunds: number;
  chargebacks: number;
  paymentGatewayFees: number;
  processingFees: number;
  netRevenue: number;
}

export type BreakdownType = 
  | 'netRevenue'
  | 'paymentGatewayFees' 
  | 'processingFees'
  | 'cog'
  | 'totalRefunds'
  | 'roas'
  | 'poas'
  | 'averageOrderValue'
  | 'totalItems';

interface FinancialBreakdownProps {
  type: BreakdownType;
  metrics: DashboardMetrics;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

export function FinancialBreakdown({ type, metrics }: FinancialBreakdownProps) {
  const renderBreakdown = () => {
    switch (type) {
      case 'netRevenue':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Net revenue represents the actual money retained after all fees and refunds.
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-600/30">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Total Revenue</span>
                </div>
                <span className="font-medium text-green-400">{formatCurrency(metrics.totalRevenue)}</span>
              </div>
              
              <div className="text-sm text-gray-500 px-3">Less deductions:</div>
              
              <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">Total Refunds</span>
                </div>
                <span className="font-medium text-red-400">-{formatCurrency(metrics.totalRefunds)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">Gateway Fees (2.9%)</span>
                </div>
                <span className="font-medium text-red-400">-{formatCurrency(metrics.paymentGatewayFees)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">Processing Fees</span>
                </div>
                <span className="font-medium text-red-400">-{formatCurrency(metrics.processingFees)}</span>
              </div>
              
              <div className="border-t border-gray-600 pt-3">
                <div className="flex items-center justify-between p-3 bg-blue-900/20 rounded-lg border border-blue-600/30">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-medium">Net Revenue</span>
                  </div>
                  <span className="font-bold text-blue-400">{formatCurrency(metrics.netRevenue)}</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-800 p-3 rounded-lg">
                <div className="font-medium mb-1">Calculation:</div>
                <div>{formatCurrency(metrics.totalRevenue)} - {formatCurrency(metrics.totalRefunds)} - {formatCurrency(metrics.paymentGatewayFees)} - {formatCurrency(metrics.processingFees)} = {formatCurrency(metrics.netRevenue)}</div>
                <div className="mt-2">
                  <span className="font-medium">Net Margin:</span> {((metrics.netRevenue / metrics.totalRevenue) * 100).toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'paymentGatewayFees':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Payment gateway fees are typically charged by processors like Stripe, PayPal, etc.
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Total Revenue</span>
                <span className="font-medium">{formatCurrency(metrics.totalRevenue)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Gateway Fee Rate</span>
                <span className="font-medium">2.9%</span>
              </div>
              
              <div className="border-t border-gray-600 pt-3">
                <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 font-medium">Gateway Fees</span>
                  </div>
                  <span className="font-bold text-red-400">{formatCurrency(metrics.paymentGatewayFees)}</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-800 p-3 rounded-lg">
                <div className="font-medium mb-1">Calculation:</div>
                <div>{formatCurrency(metrics.totalRevenue)} × 0.029 = {formatCurrency(metrics.paymentGatewayFees)}</div>
                <div className="mt-2 text-yellow-400">
                  ⚠️ This is an estimate based on industry standard rates
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'processingFees':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Processing fees are per-transaction charges applied by payment processors.
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Total Orders</span>
                <span className="font-medium">{formatNumber(metrics.totalOrders)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Fee Per Transaction</span>
                <span className="font-medium">$0.30</span>
              </div>
              
              <div className="border-t border-gray-600 pt-3">
                <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 font-medium">Processing Fees</span>
                  </div>
                  <span className="font-bold text-red-400">{formatCurrency(metrics.processingFees)}</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-800 p-3 rounded-lg">
                <div className="font-medium mb-1">Calculation:</div>
                <div>{formatNumber(metrics.totalOrders)} orders × $0.30 = {formatCurrency(metrics.processingFees)}</div>
                <div className="mt-2 text-yellow-400">
                  ⚠️ This is an estimate based on typical processing fees
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'cog':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Cost of Goods Sold represents the direct costs of producing/purchasing your products.
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Total Revenue</span>
                <span className="font-medium">{formatCurrency(metrics.totalRevenue)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Estimated COG Rate</span>
                <span className="font-medium">40%</span>
              </div>
              
              <div className="border-t border-gray-600 pt-3">
                <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 font-medium">Cost of Goods</span>
                  </div>
                  <span className="font-bold text-red-400">{formatCurrency(metrics.cog)}</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-800 p-3 rounded-lg">
                <div className="font-medium mb-1">Calculation:</div>
                <div>{formatCurrency(metrics.totalRevenue)} × 0.40 = {formatCurrency(metrics.cog)}</div>
                <div className="mt-2 text-yellow-400">
                  ⚠️ This is an estimate. Update your product costs for accurate tracking.
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'totalRefunds':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Currently using discount data as a proxy for refunds. This will be updated when actual refund data is available.
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Data Source</span>
                <span className="font-medium text-yellow-400">Shopify Discounts</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 font-medium">Total Refunds</span>
                </div>
                <span className="font-bold text-red-400">{formatCurrency(metrics.totalRefunds)}</span>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-800 p-3 rounded-lg">
                <div className="font-medium mb-1">Current Implementation:</div>
                <div>Using Shopify discount amounts as a proxy for refund tracking</div>
                <div className="mt-2 text-blue-400">
                  💡 Future enhancement: Connect to actual refund data from Shopify
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'averageOrderValue':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Average Order Value shows how much customers spend per transaction on average.
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Total Revenue</span>
                <span className="font-medium">{formatCurrency(metrics.totalRevenue)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Total Orders</span>
                <span className="font-medium">{formatNumber(metrics.totalOrders)}</span>
              </div>
              
              <div className="border-t border-gray-600 pt-3">
                <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-600/30">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-medium">Average Order Value</span>
                  </div>
                  <span className="font-bold text-green-400">{formatCurrency(metrics.averageOrderValue)}</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-800 p-3 rounded-lg">
                <div className="font-medium mb-1">Calculation:</div>
                <div>{formatCurrency(metrics.totalRevenue)} ÷ {formatNumber(metrics.totalOrders)} = {formatCurrency(metrics.averageOrderValue)}</div>
              </div>
            </div>
          </div>
        );
        
      case 'totalItems':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Total items and average items per order help understand customer purchasing behavior.
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Total Orders</span>
                <span className="font-medium">{formatNumber(metrics.totalOrders)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Total Items Sold</span>
                <span className="font-medium">{formatNumber(metrics.totalItems)}</span>
              </div>
              
              <div className="border-t border-gray-600 pt-3">
                <div className="flex items-center justify-between p-3 bg-blue-900/20 rounded-lg border border-blue-600/30">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-medium">Avg Items Per Order</span>
                  </div>
                  <span className="font-bold text-blue-400">{(metrics.totalItems / metrics.totalOrders).toFixed(1)}</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-800 p-3 rounded-lg">
                <div className="font-medium mb-1">Calculation:</div>
                <div>{formatNumber(metrics.totalItems)} items ÷ {formatNumber(metrics.totalOrders)} orders = {(metrics.totalItems / metrics.totalOrders).toFixed(1)} items/order</div>
                <div className="mt-2">
                  This metric helps identify cross-selling opportunities and customer behavior patterns.
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="text-center text-gray-400">
            <Calculator className="w-8 h-8 mx-auto mb-2" />
            <div>Breakdown not yet implemented for this metric</div>
            <div className="text-sm mt-1">Coming soon...</div>
          </div>
        );
    }
  };

  return (
    <div>
      {renderBreakdown()}
    </div>
  );
} 