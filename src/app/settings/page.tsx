'use client';

import { useState } from 'react';
import { Box, Tabs, Tab, Typography, Paper, Button } from '@mui/material';
import { Settings as SettingsIcon, ShoppingBag as ShoppingBagIcon, Campaign as CampaignIcon } from '@mui/icons-material';
import ShopifyConnection from '@/components/settings/ShopifyConnection';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const tabs = [
  { name: 'General', icon: <SettingsIcon /> },
  { name: 'Shopify', icon: <ShoppingBagIcon /> },
  { name: 'Ad Platforms', icon: <CampaignIcon /> },
];

export default function SettingsPage() {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <Box sx={{ maxWidth: 'lg', mx: 'auto', px: 3 }}>
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your store connections and preferences
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={selectedTab}
          onChange={handleChange}
          aria-label="settings tabs"
          variant="fullWidth"
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.name}
              icon={tab.icon}
              label={tab.name}
              id={`settings-tab-${index}`}
              aria-controls={`settings-tabpanel-${index}`}
            />
          ))}
        </Tabs>
      </Box>

      <TabPanel value={selectedTab} index={0}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Account Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Manage your account preferences and settings.
          </Typography>
          {/* Add account settings form here */}
        </Paper>
      </TabPanel>

      <TabPanel value={selectedTab} index={1}>
        <ShopifyConnection />
      </TabPanel>

      <TabPanel value={selectedTab} index={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Ad Platform Connections
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Connect your advertising accounts to track ad spend and ROI.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Facebook Ads */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1">Facebook Ads</Typography>
                <Typography variant="body2" color="text.secondary">
                  Connect your Facebook Ads account
                </Typography>
              </Box>
              <Button variant="contained" color="primary">
                Connect
              </Button>
            </Box>

            {/* Google Ads */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1">Google Ads</Typography>
                <Typography variant="body2" color="text.secondary">
                  Connect your Google Ads account
                </Typography>
              </Box>
              <Button variant="contained" color="primary">
                Connect
              </Button>
            </Box>

            {/* TikTok Ads */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1">TikTok Ads</Typography>
                <Typography variant="body2" color="text.secondary">
                  Connect your TikTok Ads account
                </Typography>
              </Box>
              <Button variant="contained" color="primary">
                Connect
              </Button>
            </Box>
          </Box>
        </Paper>
      </TabPanel>
    </Box>
  );
} 