'use client'

import { useState } from 'react'
import { Box, Typography, Stack } from '@mui/material'
import styled from '@emotion/styled'
import Card from '@/components/ui/Card'
import { 
  MonetizationOn as MonetizationOnIcon,
  ShoppingCart as ShoppingCartIcon,
  LocalShipping as LocalShippingIcon,
  CreditCard as CreditCardIcon
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

const metrics = [
  {
    label: 'Total Revenue',
    value: '$124,563.45',
    change: '+12%',
    isPositive: true,
    icon: MonetizationOnIcon,
  },
  {
    label: 'Orders',
    value: '456',
    change: '-2.5%',
    isPositive: false,
    icon: ShoppingCartIcon,
  },
  {
    label: 'Shipping Costs',
    value: '$3,456.78',
    change: '+5%',
    isPositive: true,
    icon: LocalShippingIcon,
  },
  {
    label: 'Transaction Fees',
    value: '$1,234.56',
    change: '0%',
    isPositive: true,
    icon: CreditCardIcon,
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
    <Box>
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1">
          Orders
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track and manage your store's orders
        </Typography>
      </Stack>

      <GridContainer>
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <metric.icon sx={{ fontSize: 24, color: 'primary.main', mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {metric.label}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                <Typography variant="h5" component="span">
                  {metric.value}
                </Typography>
                {metric.change !== '0%' && (
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{
                      ml: 1,
                      color: metric.isPositive ? 'success.main' : 'error.main',
                    }}
                  >
                    {metric.change}
                  </Typography>
                )}
              </Box>
            </Stack>
          </Card>
        ))}
      </GridContainer>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          Recent Orders
        </Typography>
        <Card>
          <Typography variant="body2" color="text.secondary">
            Order data will be displayed here
          </Typography>
        </Card>
      </Box>
    </Box>
  )
} 