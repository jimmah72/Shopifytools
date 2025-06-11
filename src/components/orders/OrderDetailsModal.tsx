'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Close as XMarkIcon } from '@mui/icons-material'
import { formatCurrency } from '@/lib/utils'

interface OrderItem {
  id: string
  quantity: number
  price: number
  product: {
    title: string
  }
}

interface Order {
  id: string
  orderNumber: string
  totalPrice: number
  subtotalPrice: number
  shippingCost: number
  transactionFees: number
  totalTax: number
  createdAt: string
  customer: {
    firstName: string
    lastName: string
    email: string
  } | null
  orderItems: OrderItem[]
}

interface OrderDetailsModalProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
}

export default function OrderDetailsModal({
  order,
  isOpen,
  onClose,
}: OrderDetailsModalProps) {
  if (!order) return null

  const profit = order.totalPrice - order.shippingCost - order.transactionFees
  const profitMargin = (profit / order.totalPrice) * 100

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon sx={{ fontSize: 24 }} aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900"
                    >
                      Order #{order.orderNumber}
                    </Dialog.Title>

                    {/* Customer Information */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        Customer Information
                      </h4>
                      <div className="mt-2 text-sm text-gray-500">
                        {order.customer ? (
                          <>
                            <p>
                              {order.customer.firstName} {order.customer.lastName}
                            </p>
                            <p>{order.customer.email}</p>
                          </>
                        ) : (
                          <p>No customer information available</p>
                        )}
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        Order Items
                      </h4>
                      <div className="mt-2">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead>
                            <tr>
                              <th className="py-2 text-left text-sm font-semibold text-gray-900">
                                Product
                              </th>
                              <th className="py-2 text-right text-sm font-semibold text-gray-900">
                                Quantity
                              </th>
                              <th className="py-2 text-right text-sm font-semibold text-gray-900">
                                Price
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {order.orderItems.map((item) => (
                              <tr key={item.id}>
                                <td className="py-2 text-sm text-gray-500">
                                  {item.product.title}
                                </td>
                                <td className="py-2 text-right text-sm text-gray-500">
                                  {item.quantity}
                                </td>
                                <td className="py-2 text-right text-sm text-gray-500">
                                  {formatCurrency(item.price)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        Order Summary
                      </h4>
                      <dl className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Subtotal</dt>
                          <dd className="text-sm text-gray-900">
                            {formatCurrency(order.subtotalPrice)}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Tax</dt>
                          <dd className="text-sm text-gray-900">
                            {formatCurrency(order.totalTax)}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Shipping</dt>
                          <dd className="text-sm text-gray-900">
                            {formatCurrency(order.shippingCost)}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">
                            Transaction Fees
                          </dt>
                          <dd className="text-sm text-gray-900">
                            {formatCurrency(order.transactionFees)}
                          </dd>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-2">
                          <dt className="text-sm font-medium text-gray-900">
                            Total
                          </dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {formatCurrency(order.totalPrice)}
                          </dd>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-2">
                          <dt className="text-sm font-medium text-gray-900">
                            Profit
                          </dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {formatCurrency(profit)} ({profitMargin.toFixed(1)}%)
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
} 