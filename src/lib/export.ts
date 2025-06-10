import { formatCurrency } from './utils'

export function exportToCSV(data: any[], filename: string) {
  if (!data.length) return

  // Convert orders to CSV format
  const headers = [
    'Order Number',
    'Date',
    'Customer Name',
    'Customer Email',
    'Total',
    'Subtotal',
    'Tax',
    'Shipping',
    'Fees',
    'Items',
    'Profit',
    'Profit Margin',
  ]

  const rows = data.map((order) => {
    const profit = order.totalPrice - order.shippingCost - order.transactionFees
    const profitMargin = ((profit / order.totalPrice) * 100).toFixed(2)
    const items = order.orderItems
      .map(
        (item: any) =>
          `${item.product.title} (${item.quantity}x @ ${formatCurrency(
            item.price
          )})`
      )
      .join('; ')

    return [
      order.orderNumber,
      new Date(order.createdAt).toLocaleDateString(),
      order.customer
        ? `${order.customer.firstName} ${order.customer.lastName}`
        : 'N/A',
      order.customer?.email || 'N/A',
      formatCurrency(order.totalPrice),
      formatCurrency(order.subtotalPrice),
      formatCurrency(order.totalTax),
      formatCurrency(order.shippingCost),
      formatCurrency(order.transactionFees),
      items,
      formatCurrency(profit),
      `${profitMargin}%`,
    ]
  })

  const csvContent =
    headers.join(',') +
    '\n' +
    rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      )
      .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
} 