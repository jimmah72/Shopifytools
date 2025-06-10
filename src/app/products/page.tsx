'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import { formatCurrency } from '@/lib/utils'

interface Product {
  id: string
  title: string
  price: number
  cost: number
  totalSales: number
  totalRevenue: number
  totalProfit: number
  profitMargin: number
  adSpend: number
  netProfit: number
}

interface Column<T> {
  header: string
  accessorKey: keyof T
  cell?: (item: T) => React.ReactNode
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortField, setSortField] = useState('totalProfit')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        sortField,
        sortOrder,
        page: page.toString(),
        search,
      })

      const response = await fetch(`/api/products?${params}`)
      const data = await response.json()
      setProducts(data.products)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [sortField, sortOrder, page, search])

  const columns: Column<Product>[] = [
    {
      header: 'Product',
      accessorKey: 'title',
    },
    {
      header: 'Price',
      accessorKey: 'price',
      cell: (product) => formatCurrency(product.price),
    },
    {
      header: 'COGS',
      accessorKey: 'cost',
      cell: (product) => formatCurrency(product.cost),
    },
    {
      header: 'Total Sales',
      accessorKey: 'totalSales',
    },
    {
      header: 'Revenue',
      accessorKey: 'totalRevenue',
      cell: (product) => formatCurrency(product.totalRevenue),
    },
    {
      header: 'Ad Spend',
      accessorKey: 'adSpend',
      cell: (product) => formatCurrency(product.adSpend),
    },
    {
      header: 'Profit',
      accessorKey: 'totalProfit',
      cell: (product) => formatCurrency(product.totalProfit),
    },
    {
      header: 'Net Profit',
      accessorKey: 'netProfit',
      cell: (product) => formatCurrency(product.netProfit),
    },
    {
      header: 'Margin',
      accessorKey: 'profitMargin',
      cell: (product) => `${product.profitMargin.toFixed(1)}%`,
    },
  ]

  const calculateTotal = (key: keyof Product) => {
    if (isLoading || !products?.length) return 0
    return products.reduce((sum, product) => sum + (product[key] as number), 0)
  }

  const analyticsCards = [
    {
      title: 'Total Revenue',
      value: calculateTotal('totalRevenue'),
      color: 'text-blue-600',
    },
    {
      title: 'Total Profit',
      value: calculateTotal('totalProfit'),
      color: 'text-green-600',
    },
    {
      title: 'Net Profit',
      value: calculateTotal('netProfit'),
      color: 'text-purple-600',
    },
    {
      title: 'Total Ad Spend',
      value: calculateTotal('adSpend'),
      color: 'text-red-600',
    },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Search Bar */}
      <Card>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </Card>

      {/* Product Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {analyticsCards.map((card) => (
          <Card key={card.title}>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">{card.title}</h3>
              <p className={`mt-2 text-3xl font-semibold ${card.color}`}>
                {isLoading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : (
                  formatCurrency(card.value)
                )}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Products Table */}
      <Card>
        <Table
          data={products}
          columns={columns}
          isLoading={isLoading}
          onSort={(field, order) => {
            setSortField(field as keyof Product)
            setSortOrder(order)
          }}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>
    </div>
  )
} 