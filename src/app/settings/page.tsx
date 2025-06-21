'use client';

import React from 'react'
import { Box, Container, Tab, Tabs, Typography, Stack, Alert, Button, Card, CardContent } from '@mui/material'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import ShippingRules from '@/components/settings/ShippingRules'
import PaymentGateways from '@/components/settings/PaymentGateways'
import CostManagement from '@/components/settings/CostManagement'
import ShopifyConnection from '@/components/settings/ShopifyConnection'
import { useStore } from '@/contexts/StoreContext'
import { useRouter } from 'next/navigation'
import { Settings as SettingsIcon } from '@mui/icons-material'

const FeeConfigurationNotice = () => {
  const router = useRouter();

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Box sx={{ textAlign: 'center' }}>
            <SettingsIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Fee Configuration Has Moved
            </Typography>
            <Typography color="text.secondary">
              Fee configuration is now available as a dedicated page with enhanced features for managing all your costs and subscriptions.
            </Typography>
          </Box>

          <Alert severity="info">
            <Typography variant="body2">
              <strong>New Features Available:</strong>
              <br />• Dynamic additional costs with flexible pricing options
              <br />• Subscription fee management with automatic daily rate calculation
              <br />• Professional interface with modal-based editing
              <br />• Real-time cost totals and breakdowns
            </Typography>
          </Alert>

          <Box sx={{ textAlign: 'center' }}>
            <Button 
              variant="contained" 
              size="large"
              onClick={() => router.push('/fees')}
              sx={{ minWidth: 200 }}
            >
              Go to Fee Configuration
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            All your existing fee settings have been preserved and are available in the new interface.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default function SettingsPage() {
  const { store, loading } = useStore()
  const [value, setValue] = React.useState('1')

  console.log('Settings page - Store:', store)
  console.log('Settings page - Loading:', loading)

  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue)
  }

  return (
    <Container maxWidth="lg">
      <Stack spacing={4}>
        <Box>
          <Typography variant="h4" gutterBottom>Settings</Typography>
          <Typography color="text.secondary">
            Configure your store settings and integrations
          </Typography>
        </Box>

        <ShopifyConnection />

        <Box sx={{ width: '100%', typography: 'body1' }}>
          <TabContext value={value}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={value}
                onChange={handleChange}
                textColor="primary"
                indicatorColor="primary"
              >
                <Tab label="Shipping Rules" value="1" />
                <Tab label="Payment Gateways" value="2" />
                <Tab label="Cost Management" value="3" />
                <Tab label="Fee Configuration" value="4" />
              </Tabs>
            </Box>
            <TabPanel value="1">
              <ShippingRules />
            </TabPanel>
            <TabPanel value="2">
              <PaymentGateways />
            </TabPanel>
            <TabPanel value="3">
              <CostManagement />
            </TabPanel>
            <TabPanel value="4">
              <FeeConfigurationNotice />
            </TabPanel>
          </TabContext>
        </Box>
      </Stack>
    </Container>
  )
} 