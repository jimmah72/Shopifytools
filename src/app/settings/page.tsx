'use client';

import React from 'react'
import { Box, Container, Tab, Tabs } from '@mui/material'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import ShippingRules from '@/components/settings/ShippingRules'
import PaymentGateways from '@/components/settings/PaymentGateways'
import CostManagement from '@/components/settings/CostManagement'

export default function SettingsPage() {
  const [value, setValue] = React.useState('1')

  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue)
  }

  return (
    <Container maxWidth="lg">
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
    </Container>
  )
} 