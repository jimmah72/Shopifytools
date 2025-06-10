'use client'

import { useState } from 'react'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

export interface Column<T> {
  header: string
  accessorKey: keyof T
  cell?: (item: T) => React.ReactNode
}

export interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  onSort?: (field: keyof T, order: 'asc' | 'desc') => void
  totalItems?: number
  currentPage?: number
  itemsPerPage?: number
  onPageChange?: (page: number) => void
  onRowClick?: (item: T) => void
  isLoading?: boolean
}

export default function Table<T>({
  data = [],
  columns,
  onSort,
  totalItems = 0,
  currentPage = 1,
  itemsPerPage = 10,
  onPageChange,
  onRowClick,
  isLoading = false,
}: TableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    field: keyof T | null
    order: 'asc' | 'desc'
  }>({
    field: null,
    order: 'asc',
  })

  const handleSort = (field: keyof T) => {
    const order =
      sortConfig.field === field && sortConfig.order === 'asc' ? 'desc' : 'asc'
    setSortConfig({ field, order })
    onSort?.(field, order)
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">No data available</div>
      </div>
    )
  }

  return (
    <div className="flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    scope="col"
                    className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 cursor-pointer"
                    onClick={() => handleSort(column.accessorKey)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.header}</span>
                      {sortConfig.field === column.accessorKey && (
                        <span className="inline-block w-4 h-4">
                          {sortConfig.order === 'asc' ? (
                            <ChevronUpIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {data.map((item, index) => (
                <tr
                  key={index}
                  onClick={() => onRowClick?.(item)}
                  className={clsx(
                    'hover:bg-gray-50 dark:hover:bg-gray-800',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300"
                    >
                      {column.cell
                        ? column.cell(item)
                        : String(item[column.accessorKey] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => onPageChange?.(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => onPageChange?.(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, totalItems)}
                    </span>{' '}
                    of <span className="font-medium">{totalItems}</span> results
                  </p>
                </div>
                <div>
                  <nav
                    className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() => onPageChange?.(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => onPageChange?.(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </nav>
          )}
        </div>
      </div>
    </div>
  )
} 