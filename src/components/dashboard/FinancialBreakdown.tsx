'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Calculator, DollarSign, RefreshCcw, Plus, Calendar } from 'lucide-react';

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
  additionalCosts: number;
  subscriptionCosts: number;
  totalRefunds: number;
  chargebacks: number;
  paymentGatewayFees: number;
  processingFees: number;
  netRevenue: number;
  netProfit: number;
  totalDiscounts?: number;
}

export type BreakdownType = 
  | 'netRevenue'
  | 'netProfit'
  | 'paymentGatewayFees' 
  | 'processingFees'
  | 'cog'
  | 'totalRefunds'
  | 'roas'
  | 'poas'
  | 'averageOrderValue'
  | 'totalItems'
  | 'totalDiscounts'
  | 'additionalCosts'
  | 'subscriptionCosts'
  | 'fees';

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
        
      case 'netProfit':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Net profit represents the final profit after all costs including fees, COG, and expenses.
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-600/30">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Total Revenue</span>
                </div>
                <span className="font-medium text-green-400">{formatCurrency(metrics.totalRevenue)}</span>
              </div>
              
              <div className="text-sm text-gray-500 px-3">Less all costs:</div>
              
              <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">Refunds</span>
                </div>
                <span className="font-medium text-red-400">-{formatCurrency(metrics.totalRefunds)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">Gateway Fees</span>
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
              
              <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">Cost of Goods</span>
                </div>
                <span className="font-medium text-red-400">-{formatCurrency(metrics.cog)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">Additional Costs</span>
                </div>
                <span className="font-medium text-red-400">-{formatCurrency(metrics.additionalCosts)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">Subscription Costs</span>
                </div>
                <span className="font-medium text-red-400">-{formatCurrency(metrics.subscriptionCosts)}</span>
              </div>
              
              <div className="border-t border-gray-600 pt-3">
                <div className="flex items-center justify-between p-3 bg-blue-900/20 rounded-lg border border-blue-600/30">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-medium">Net Profit</span>
                  </div>
                  <span className="font-bold text-blue-400">{formatCurrency(metrics.netProfit)}</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-800 p-3 rounded-lg">
                <div className="font-medium mb-1">Calculation:</div>
                <div className="break-words">{formatCurrency(metrics.totalRevenue)} - {formatCurrency(metrics.totalRefunds)} - {formatCurrency(metrics.paymentGatewayFees)} - {formatCurrency(metrics.processingFees)} - {formatCurrency(metrics.cog)} - {formatCurrency(metrics.additionalCosts)} - {formatCurrency(metrics.subscriptionCosts)} = {formatCurrency(metrics.netProfit)}</div>
                <div className="mt-2">
                  <span className="font-medium">Profit Margin:</span> {((metrics.netProfit / metrics.totalRevenue) * 100).toFixed(2)}%
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
                <span className="font-medium">{((metrics.paymentGatewayFees / metrics.totalRevenue) * 100).toFixed(2)}%</span>
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
                <div>{formatCurrency(metrics.totalRevenue)} × {((metrics.paymentGatewayFees / metrics.totalRevenue) * 100).toFixed(2)}% = {formatCurrency(metrics.paymentGatewayFees)}</div>
                <div className="mt-2 text-green-400">
                  ✅ Using your configured payment gateway rate
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
                <span className="font-medium">${(metrics.processingFees / metrics.totalOrders).toFixed(2)}</span>
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
                <div>{formatNumber(metrics.totalOrders)} orders × ${(metrics.processingFees / metrics.totalOrders).toFixed(2)} = {formatCurrency(metrics.processingFees)}</div>
                <div className="mt-2 text-green-400">
                  ✅ Using your configured processing fee rate
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
                <span>Configured COG Rate</span>
                <span className="font-medium">{((metrics.cog / metrics.totalRevenue) * 100).toFixed(1)}%</span>
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
                <div>{formatCurrency(metrics.totalRevenue)} × {((metrics.cog / metrics.totalRevenue) * 100).toFixed(1)}% = {formatCurrency(metrics.cog)}</div>
                <div className="mt-2 text-blue-400">
                  ℹ️ Using your configured default COG rate. Update individual product costs for more accuracy.
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'totalRefunds':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Total refunds represent actual money returned to customers, not promotional discounts.
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Data Source</span>
                <span className="font-medium text-blue-400">Shopify Refunds API</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                <div className="flex items-center gap-2">
                  <RefreshCcw className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 font-medium">Total Refunds</span>
                </div>
                <span className="font-bold text-red-400">{formatCurrency(metrics.totalRefunds)}</span>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-800 p-3 rounded-lg">
                <div className="font-medium mb-1">What this includes:</div>
                <div>• Money refunded to customers</div>
                <div>• Partial refunds on returned items</div>
                <div>• Full order refunds</div>
                <div className="mt-2 text-green-400">
                  ✅ This is actual refund data from Shopify, not discount codes
                </div>
              </div>
              
              <div className="text-xs text-orange-400 bg-orange-900/20 border border-orange-600/30 p-3 rounded-lg">
                <div className="font-medium mb-1">⚠️ Important Note:</div>
                <div>Refunds are grouped by <strong>order date</strong>, not refund processing date. This means refunds appear in the same timeframe as their original orders, even if the refund was processed later.</div>
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
        
      case 'totalDiscounts':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Total discounts represent coupon codes, promotional discounts, and manual adjustments applied to orders.
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Data Source</span>
                <span className="font-medium text-blue-400">Shopify Order Data</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-900/20 rounded-lg border border-gray-600/30">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400 font-medium">Total Discounts</span>
                </div>
                <span className="font-bold text-gray-400">{formatCurrency(metrics.totalDiscounts || 0)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Discount Rate</span>
                <span className="font-medium">{metrics.totalRevenue > 0 ? ((metrics.totalDiscounts || 0) / metrics.totalRevenue * 100).toFixed(2) : '0'}%</span>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-800 p-3 rounded-lg">
                <div className="font-medium mb-1">What this includes:</div>
                <div>• Coupon codes applied by customers</div>
                <div>• Promotional discounts (% off, $ off)</div>
                <div>• Manual discounts applied by admin</div>
                <div>• Bulk/wholesale pricing adjustments</div>
                <div className="mt-2 text-blue-400">
                  💡 Note: Discounts reduce revenue but are tracked separately from refunds
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'additionalCosts':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Additional costs are custom fees and expenses configured in your fee settings that apply to orders and items.
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
              
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Total Items</span>
                <span className="font-medium">{formatNumber(metrics.totalItems)}</span>
              </div>
              
              <div className="border-t border-gray-600 pt-3">
                <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 font-medium">Additional Costs</span>
                  </div>
                  <span className="font-bold text-red-400">{formatCurrency(metrics.additionalCosts)}</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-800 p-3 rounded-lg">
                <div className="font-medium mb-1">How this is calculated:</div>
                <div>• Percentage costs applied to revenue and items</div>
                <div>• Flat rate costs per order and per item</div>
                <div>• Only active additional costs are included</div>
                <div className="mt-2 text-green-400">
                  ✅ Configured in your fee settings - includes packaging, labor, marketing, etc.
                </div>
                <div className="mt-2 text-blue-400">
                  💡 Manage these costs in Settings → Fees to add custom expenses
                </div>
              </div>
            </div>
          </div>
        );

      case 'subscriptionCosts':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Subscription costs are monthly/yearly fees converted to daily rates and calculated for your selected timeframe.
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Selected Timeframe</span>
                <span className="font-medium">
                  {metrics.totalOrders > 0 ? 
                    (metrics.subscriptionCosts / (metrics.subscriptionCosts > 0 ? 1 : 1)).toFixed(0) + ' days' : 
                    'Current period'}
                </span>
              </div>
              
              <div className="border-t border-gray-600 pt-3">
                <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 font-medium">Subscription Costs</span>
                  </div>
                  <span className="font-bold text-red-400">{formatCurrency(metrics.subscriptionCosts)}</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-800 p-3 rounded-lg">
                <div className="font-medium mb-1">How this works:</div>
                <div>• Monthly subscriptions: (Monthly × 12) ÷ 365 = Daily rate</div>
                <div>• Yearly subscriptions: Yearly ÷ 365 = Daily rate</div>
                <div>• Daily rate × Selected timeframe days = Period cost</div>
                <div className="mt-2 text-green-400">
                  ✅ Includes active subscriptions: Shopify Plus, apps, software licenses, etc.
                </div>
                <div className="mt-2 text-blue-400">
                  💡 Manage subscriptions in Settings → Fees to track all recurring costs
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'fees':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Total fees include all payment processing fees charged by gateways and processors.
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
              
              <div className="space-y-2 mt-4">
                <div className="text-sm text-gray-500 px-3">Fee Breakdown:</div>
                
                <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <span className="text-red-400">Gateway Fees</span>
                  </div>
                  <span className="font-medium text-red-400">{formatCurrency(metrics.paymentGatewayFees)}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <span className="text-red-400">Processing Fees</span>
                  </div>
                  <span className="font-medium text-red-400">{formatCurrency(metrics.processingFees)}</span>
                </div>
              </div>
              
              <div className="border-t border-gray-600 pt-3">
                <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 font-medium">Total Fees</span>
                  </div>
                  <span className="font-bold text-red-400">{formatCurrency(metrics.fees)}</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-800 p-3 rounded-lg">
                <div className="font-medium mb-1">Calculation:</div>
                <div>{formatCurrency(metrics.paymentGatewayFees)} + {formatCurrency(metrics.processingFees)} = {formatCurrency(metrics.fees)}</div>
                <div className="mt-2">
                  <span className="font-medium">Fee Rate:</span> {((metrics.fees / metrics.totalRevenue) * 100).toFixed(2)}% of revenue
                </div>
                <div className="mt-2 text-green-400">
                  ✅ Based on your configured payment gateway and processing fee rates
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