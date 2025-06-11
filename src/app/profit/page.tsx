'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import {
  AttachMoney as CurrencyDollarIcon,
  ShoppingBag as ShoppingBagIcon,
  LocalOffer as TagIcon,
  BarChart as ChartBarIcon,
} from '@mui/icons-material'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface ProfitMetrics {
  totalRevenue: number
  totalCost: number
  grossProfit: number
  netProfit: number
  totalOrders: number
  totalProductsSold: number
  adSpend: number
  profitMargin: number
}

interface TimeSeriesData {
  date: string
  revenue: number
  cost: number
  adSpend: number
  profit: number
}

interface TopProduct {
  id: string
  title: string
  totalRevenue: number
  totalCost: number
  totalProfit: number
  adSpend: number
  profitMargin: number
}

export default function ProfitPage() {
  const [dateRange, setDateRange] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<ProfitMetrics | null>(null)
  const [changes, setChanges] = useState<Record<string, number>>({})
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/profit?period=${dateRange}`)
        const data = await response.json()
        setMetrics(data.metrics || null)
        setChanges(data.changes || {})
        setTimeSeriesData(data.timeSeriesData || [])
        setTopProducts(data.topProducts || [])
      } catch (error) {
        console.error('Error fetching profit data:', error)
        // Set default values on error
        setMetrics(null)
        setChanges({})
        setTimeSeriesData([])
        setTopProducts([])
      }
      setLoading(false)
    }

    fetchData()
  }, [dateRange])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100)
  }

  const getMetricCards = () => {
    if (!metrics) return []

    return [
      {
        name: 'Total Revenue',
        value: formatCurrency(metrics.totalRevenue || 0),
        change: changes.totalRevenue || 0,
        icon: CurrencyDollarIcon,
        color: 'text-blue-600',
      },
      {
        name: 'Net Profit',
        value: formatCurrency(metrics.netProfit || 0),
        change: changes.netProfit || 0,
        icon: ChartBarIcon,
        color: 'text-green-600',
      },
      {
        name: 'Total Orders',
        value: (metrics.totalOrders || 0).toString(),
        change: changes.totalOrders || 0,
        icon: ShoppingBagIcon,
        color: 'text-purple-600',
      },
      {
        name: 'Products Sold',
        value: (metrics.totalProductsSold || 0).toString(),
        change: changes.totalProductsSold || 0,
        icon: TagIcon,
        color: 'text-indigo-600',
      },
    ]
  }

  const chartData = {
    labels: timeSeriesData?.map(d => d.date) || [],
    datasets: [
      {
        label: 'Revenue',
        data: timeSeriesData?.map(d => d.revenue) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: false,
      },
      {
        label: 'Profit',
        data: timeSeriesData?.map(d => d.profit) || [],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: false,
      },
      {
        label: 'Ad Spend',
        data: timeSeriesData?.map(d => d.adSpend) || [],
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: false,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(tickValue: number | string) {
            if (typeof tickValue === 'number') {
              return formatCurrency(tickValue)
            }
            return tickValue
          }
        },
      },
    },
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Profit Analytics</h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Track your store's profitability and performance metrics
        </p>
      </div>

      {/* Date Range Filter */}
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
              className="rounded-md border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {getMetricCards().map((metric) => (
          <Card key={metric.name}>
            <div className="relative overflow-hidden rounded-lg p-4">
              <dt>
                <div className="absolute rounded-md bg-gray-50 p-3 dark:bg-gray-800">
                  <metric.icon
                    className={`h-5 w-5 ${metric.color}`}
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
                    metric.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {metric.change >= 0 ? '+' : ''}
                  {metric.change.toFixed(1)}%
                </p>
              </dd>
            </div>
          </Card>
        ))}
      </div>

      {/* Profit Chart */}
      <Card>
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Profit Over Time</h2>
          <div className="h-80 w-full">
            {timeSeriesData.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">No data available for the selected period</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Top Products by Profit */}
      <Card>
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Top Products by Profit
          </h2>
          <div className="overflow-x-auto">
            {topProducts.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Margin
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {topProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">{product.title}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatCurrency(product.totalRevenue)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatCurrency(product.totalCost)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatCurrency(product.totalProfit)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatPercent(product.profitMargin)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                No products data available
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
} 