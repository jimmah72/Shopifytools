'use client';

import React from 'react'
import { Box, Container, Tab, Tabs, Typography, Stack } from '@mui/material'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import ShippingRules from '@/components/settings/ShippingRules'
import PaymentGateways from '@/components/settings/PaymentGateways'
import CostManagement from '@/components/settings/CostManagement'
import ShopifyConnection from '@/components/settings/ShopifyConnection'
import { useStore } from '@/contexts/StoreContext'

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
          </TabContext>
        </Box>
      </Stack>
    </Container>
  )
} 