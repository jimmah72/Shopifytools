'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
  TruckIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline'

const metrics = [
  {
    name: 'Total Orders',
    value: '1,234',
    change: '+5.4%',
    icon: ShoppingBagIcon,
    color: 'text-blue-600',
  },
  {
    name: 'Total Revenue',
    value: '$123,456',
    change: '+12.3%',
    icon: CurrencyDollarIcon,
    color: 'text-green-600',
  },
  {
    name: 'Shipping Costs',
    value: '$12,345',
    change: '-2.1%',
    icon: TruckIcon,
    color: 'text-purple-600',
  },
  {
    name: 'Transaction Fees',
    value: '$4,567',
    change: '+1.8%',
    icon: CreditCardIcon,
    color: 'text-indigo-600',
  },
]

const orders = [
  {
    id: '#12345',
    date: '2024-02-20',
    customer: 'John Doe',
    total: '$123.45',
    status: 'Completed',
    items: 3,
  },
  {
    id: '#12346',
    date: '2024-02-19',
    customer: 'Jane Smith',
    total: '$234.56',
    status: 'Processing',
    items: 2,
  },
  {
    id: '#12347',
    date: '2024-02-18',
    customer: 'Bob Johnson',
    total: '$345.67',
    status: 'Completed',
    items: 4,
  },
  {
    id: '#12348',
    date: '2024-02-17',
    customer: 'Alice Brown',
    total: '$456.78',
    status: 'Shipped',
    items: 1,
  },
  {
    id: '#12349',
    date: '2024-02-16',
    customer: 'Charlie Wilson',
    total: '$567.89',
    status: 'Completed',
    items: 5,
  },
]

export default function OrdersPage() {
  const [dateRange, setDateRange] = useState('7d')
  const [status, setStatus] = useState('all')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Orders</h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Manage and track your store's orders
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="dateRange" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Time Period:
            </label>
            <select
              id="dateRange"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 pl-3 pr-10 text-sm text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status:
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 pl-3 pr-10 text-sm text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.name}>
            <div className="relative overflow-hidden rounded-lg p-4">
              <dt>
                <div className="absolute rounded-md bg-gray-50 dark:bg-gray-800 p-3">
                  <metric.icon
                    className={`h-6 w-6 ${metric.color}`}
                    aria-hidden="true"
                  />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                  {metric.name}
                </p>
              </dt>
              <dd className="ml-16 flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {metric.value}
                </p>
                <p
                  className={`ml-2 flex items-baseline text-sm font-semibold ${
                    metric.change.startsWith('+')
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {metric.change}
                </p>
              </dd>
            </div>
          </Card>
        ))}
      </div>

      {/* Orders Table */}
      <Card>
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {order.id}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-300">{order.date}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-300">{order.customer}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-300">{order.items}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-300">{order.total}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          order.status === 'Completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : order.status === 'Processing'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  )
} 