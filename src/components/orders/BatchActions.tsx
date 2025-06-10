'use client'

import { useState } from 'react'
import { exportToCSV } from '@/lib/export'

interface BatchActionsProps {
  selectedOrders: any[]
  onMarkFulfilled: (orderIds: string[]) => Promise<void>
  onMarkUnfulfilled: (orderIds: string[]) => Promise<void>
  onArchive: (orderIds: string[]) => Promise<void>
}

export default function BatchActions({
  selectedOrders,
  onMarkFulfilled,
  onMarkUnfulfilled,
  onArchive,
}: BatchActionsProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleAction = async (
    action: (orderIds: string[]) => Promise<void>
  ) => {
    setIsLoading(true)
    try {
      await action(selectedOrders.map((order) => order.id))
    } catch (error) {
      console.error('Error performing batch action:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = () => {
    exportToCSV(selectedOrders, 'selected-orders')
  }

  if (selectedOrders.length === 0) {
    return null
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6 flex items-center justify-between">
      <div className="text-sm text-gray-600">
        {selectedOrders.length} orders selected
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleExport}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Export Selected
        </button>
        <button
          onClick={() => handleAction(onMarkFulfilled)}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Mark Fulfilled
        </button>
        <button
          onClick={() => handleAction(onMarkUnfulfilled)}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
        >
          Mark Unfulfilled
        </button>
        <button
          onClick={() => handleAction(onArchive)}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Archive
        </button>
      </div>
    </div>
  )
} 