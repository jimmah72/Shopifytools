'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import Card from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'

interface Order {
  totalPrice: number
  shippingCost: number
  transactionFees: number
  createdAt: string
}

interface OrderAnalyticsProps {
  orders: Order[]
}

export default function OrderAnalytics({ orders }: OrderAnalyticsProps) {
  // Prepare data for revenue chart
  const revenueData = orders.reduce((acc: any[], order) => {
    const date = new Date(order.createdAt).toLocaleDateString()
    const existingDay = acc.find((d) => d.date === date)

    if (existingDay) {
      existingDay.revenue += order.totalPrice
      existingDay.profit +=
        order.totalPrice - order.shippingCost - order.transactionFees
    } else {
      acc.push({
        date,
        revenue: order.totalPrice,
        profit: order.totalPrice - order.shippingCost - order.transactionFees,
      })
    }

    return acc
  }, [])

  // Calculate cost breakdown
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0)
  const totalShipping = orders.reduce((sum, order) => sum + order.shippingCost, 0)
  const totalFees = orders.reduce((sum, order) => sum + order.transactionFees, 0)
  const totalProfit = totalRevenue - totalShipping - totalFees

  const costBreakdown = [
    { name: 'Profit', value: totalProfit },
    { name: 'Shipping', value: totalShipping },
    { name: 'Fees', value: totalFees },
  ]

  return (
    <div className="space-y-6">
      {/* Revenue Over Time */}
      <Card title="Revenue & Profit Over Time">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={revenueData}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis
                tickFormatter={(value) =>
                  new Intl.NumberFormat('en-US', {
                    notation: 'compact',
                    compactDisplay: 'short',
                    style: 'currency',
                    currency: 'USD',
                  }).format(value)
                }
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stackId="1"
                stroke="#4F46E5"
                fill="#4F46E5"
                fillOpacity={0.3}
                name="Revenue"
              />
              <Area
                type="monotone"
                dataKey="profit"
                stackId="2"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.3}
                name="Profit"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Cost Breakdown */}
      <Card title="Revenue Breakdown">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={costBreakdown}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis
                tickFormatter={(value) =>
                  new Intl.NumberFormat('en-US', {
                    notation: 'compact',
                    compactDisplay: 'short',
                    style: 'currency',
                    currency: 'USD',
                  }).format(value)
                }
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Category: ${label}`}
              />
              <Legend />
              <Bar
                dataKey="value"
                fill="#6366F1"
                name="Amount"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Total Revenue</h3>
            <p className="mt-2 text-3xl font-semibold text-blue-600">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Total Profit</h3>
            <p className="mt-2 text-3xl font-semibold text-green-600">
              {formatCurrency(totalProfit)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Profit Margin</h3>
            <p className="mt-2 text-3xl font-semibold text-purple-600">
              {((totalProfit / totalRevenue) * 100).toFixed(1)}%
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Total Orders</h3>
            <p className="mt-2 text-3xl font-semibold text-indigo-600">
              {orders.length}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
} 