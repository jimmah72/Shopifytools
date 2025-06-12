'use client'

import { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Stack, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Chip, 
  CircularProgress, 
  Alert,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material'
import styled from '@emotion/styled'
import Card from '@/components/ui/Card'
import { 
  MonetizationOn as MonetizationOnIcon,
  ShoppingCart as ShoppingCartIcon,
  LocalShipping as LocalShippingIcon,
  AccountBalance as AccountBalanceIcon
} from '@mui/icons-material'

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 24px;
  
  @media (min-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: 1200px) {
    grid-template-columns: repeat(4, 1fr);
  }
`

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalPrice: number;
  currency: string;
  financialStatus: string;
  fulfillmentStatus: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    fullName: string;
  } | null;
  itemsCount: number;
  shippingCost: number;
  totalTax: number;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
  metrics: {
    totalRevenue: number;
    totalShippingCosts: number;
    totalTaxes: number;
    totalOrdersCount: number;
    averageOrderValue: number;
  };
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid':
    case 'fulfilled':
    case 'shipped':
      return 'success'
    case 'pending':
    case 'partially_fulfilled':
      return 'warning'
    case 'refunded':
    case 'cancelled':
      return 'error'
    default:
      return 'default'
  }
}

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [metrics, setMetrics] = useState<OrdersResponse['metrics'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState('any')
  const [financialStatus, setFinancialStatus] = useState('')
  const [fulfillmentStatus, setFulfillmentStatus] = useState('')

  const fetchOrders = async (currentPage: number = 1) => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        status,
      })
      
      if (financialStatus) params.append('financial_status', financialStatus)
      if (fulfillmentStatus) params.append('fulfillment_status', fulfillmentStatus)

      const response = await fetch(`/api/orders?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Failed to fetch orders')
      }

      const data: OrdersResponse = await response.json()
      setOrders(data.orders)
      setMetrics(data.metrics)
      setPage(data.page)
      setTotalPages(data.totalPages)
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders(1)
  }, [status, financialStatus, fulfillmentStatus])

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    fetchOrders(value)
  }

  const handleStatusChange = (event: any) => {
    setStatus(event.target.value)
    setPage(1)
  }

  const handleFinancialStatusChange = (event: any) => {
    setFinancialStatus(event.target.value)
    setPage(1)
  }

  const handleFulfillmentStatusChange = (event: any) => {
    setFulfillmentStatus(event.target.value)
    setPage(1)
  }

  if (loading && !orders.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading orders...
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Orders
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1">
          Orders
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track and manage your store's orders
        </Typography>
      </Stack>

      {metrics && (
        <GridContainer style={{ marginBottom: '2rem' }}>
          <Card>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <MonetizationOnIcon sx={{ fontSize: 24, color: 'primary.main', mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Total Revenue
                </Typography>
              </Box>
              <Typography variant="h5" component="span">
                {formatCurrency(metrics.totalRevenue)}
              </Typography>
            </Stack>
          </Card>

          <Card>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ShoppingCartIcon sx={{ fontSize: 24, color: 'primary.main', mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Total Orders
                </Typography>
              </Box>
              <Typography variant="h5" component="span">
                {metrics.totalOrdersCount}
              </Typography>
            </Stack>
          </Card>

          <Card>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocalShippingIcon sx={{ fontSize: 24, color: 'primary.main', mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Shipping Costs
                </Typography>
              </Box>
              <Typography variant="h5" component="span">
                {formatCurrency(metrics.totalShippingCosts)}
              </Typography>
            </Stack>
          </Card>

          <Card>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccountBalanceIcon sx={{ fontSize: 24, color: 'primary.main', mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Average Order Value
                </Typography>
              </Box>
              <Typography variant="h5" component="span">
                {formatCurrency(metrics.averageOrderValue)}
              </Typography>
            </Stack>
          </Card>
        </GridContainer>
      )}

      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={handleStatusChange}
              >
                <MenuItem value="any">Any Status</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Financial Status</InputLabel>
              <Select
                value={financialStatus}
                label="Financial Status"
                onChange={handleFinancialStatusChange}
              >
                <MenuItem value="">Any Financial Status</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="authorized">Authorized</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="partially_paid">Partially Paid</MenuItem>
                <MenuItem value="refunded">Refunded</MenuItem>
                <MenuItem value="voided">Voided</MenuItem>
                <MenuItem value="partially_refunded">Partially Refunded</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Fulfillment Status</InputLabel>
              <Select
                value={fulfillmentStatus}
                label="Fulfillment Status"
                onChange={handleFulfillmentStatusChange}
              >
                <MenuItem value="">Any Fulfillment Status</MenuItem>
                <MenuItem value="fulfilled">Fulfilled</MenuItem>
                <MenuItem value="null">Unfulfilled</MenuItem>
                <MenuItem value="partial">Partially Fulfilled</MenuItem>
                <MenuItem value="restocked">Restocked</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      <Card>
        <Typography variant="h6" component="h2" sx={{ mb: 2, p: 2, pb: 0 }}>
          Recent Orders
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Financial Status</TableCell>
                <TableCell>Fulfillment Status</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {order.orderNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(order.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {order.customer ? (
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {order.customer.fullName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.customer.email}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Guest
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.itemsCount} items
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={order.financialStatus}
                      color={getStatusColor(order.financialStatus) as any}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={order.fulfillmentStatus || 'Unfulfilled'}
                      color={getStatusColor(order.fulfillmentStatus || 'unfulfilled') as any}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(order.totalPrice, order.currency)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {orders.length === 0 && !loading && (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="text.secondary">
              No orders found
            </Typography>
          </Box>
        )}

        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" p={2}>
            <Pagination 
              count={totalPages} 
              page={page} 
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </Card>
    </Box>
  )
} 