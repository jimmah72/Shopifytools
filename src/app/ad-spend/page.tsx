'use client'

import React, { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Card as MuiCard,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  TextField,
  Container,
  Avatar,
  Stack,
  Chip
} from '@mui/material'
import { 
  Facebook as FacebookIcon,
  Google as GoogleIcon,
  Pinterest as PinterestIcon
} from '@mui/icons-material'
import styled from '@emotion/styled'
import { styled as muiStyled } from '@mui/material/styles'

const PageContainer = styled(Box)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 2rem;
`

const ContentContainer = styled(Box)`
  max-width: 1200px;
  margin: 0 auto;
`

const HeaderSection = styled(Box)`
  color: white;
  margin-bottom: 3rem;
  text-align: center;
`

const ChannelCard = styled(MuiCard)`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
  height: 280px;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  }
`

const ConnectButton = styled(Button)`
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
  border-radius: 25px;
  padding: 8px 24px;
  font-weight: 600;
  text-transform: none;
  
  &:hover {
    background: linear-gradient(45deg, #45a049, #4CAF50);
    transform: scale(1.05);
  }
`

const ManageButton = styled(Button)`
  background: linear-gradient(45deg, #2196F3, #1976D2);
  color: white;
  border-radius: 25px;
  padding: 8px 24px;
  font-weight: 600;
  text-transform: none;
  
  &:hover {
    background: linear-gradient(45deg, #1976D2, #2196F3);
    transform: scale(1.05);
  }
`

interface MarketingChannel {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  connected: boolean;
  accountCount: number;
  totalAccounts: number;
  color: string;
  comingSoon?: boolean;
  description?: string;
}

interface ChannelCredentials {
  [key: string]: string;
}

interface CredentialsConfig {
  [key: string]: {
    fields: {
      name: string;
      label: string;
      type: string;
      required: boolean;
    }[];
  };
}

// Custom icon components for platforms without Material-UI icons
const TikTokIcon = (props: any) => (
  <Avatar {...props} sx={{ bgcolor: '#000000', width: 32, height: 32, fontSize: 14, fontWeight: 'bold' }}>
    TT
  </Avatar>
)

const SnapchatIcon = (props: any) => (
  <Avatar {...props} sx={{ bgcolor: '#FFFC00', color: '#000', width: 32, height: 32, fontSize: 14, fontWeight: 'bold' }}>
    SC
  </Avatar>
)

const AmazonIcon = (props: any) => (
  <Avatar {...props} sx={{ bgcolor: '#FF9900', width: 32, height: 32, fontSize: 14, fontWeight: 'bold' }}>
    A
  </Avatar>
)

const TwitterIcon = (props: any) => (
  <Avatar {...props} sx={{ bgcolor: '#000000', color: '#fff', width: 32, height: 32, fontSize: 14, fontWeight: 'bold' }}>
    X
  </Avatar>
)

const marketingChannels: MarketingChannel[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: FacebookIcon,
    connected: false,
    accountCount: 0,
    totalAccounts: 2,
    color: '#1877F2',
    description: 'Connect Facebook Ads Manager to track ad spend and performance'
  },
  {
    id: 'google',
    name: 'Google',
    icon: GoogleIcon,
    connected: false,
    accountCount: 0,
    totalAccounts: 2,
    color: '#4285F4',
    description: 'Connect Google Ads to import campaign data and spending'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: TikTokIcon,
    connected: false,
    accountCount: 0,
    totalAccounts: 2,
    color: '#000000',
    comingSoon: true,
    description: 'TikTok Ads integration coming soon'
  },
  {
    id: 'taboola',
    name: 'Taboola',
    icon: (props: any) => <Avatar {...props} sx={{ bgcolor: '#0066CC', width: 32, height: 32, fontSize: 14, fontWeight: 'bold' }}>T</Avatar>,
    connected: false,
    accountCount: 0,
    totalAccounts: 2,
    color: '#0066CC',
    comingSoon: true,
    description: 'Taboola native advertising integration coming soon'
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    icon: (props: any) => <Avatar {...props} sx={{ bgcolor: '#00BCF2', width: 32, height: 32, fontSize: 14, fontWeight: 'bold' }}>M</Avatar>,
    connected: false,
    accountCount: 0,
    totalAccounts: 2,
    color: '#00BCF2',
    comingSoon: true,
    description: 'Microsoft Advertising (Bing Ads) integration coming soon'
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: PinterestIcon,
    connected: false,
    accountCount: 0,
    totalAccounts: 2,
    color: '#BD081C',
    comingSoon: true,
    description: 'Pinterest Ads integration coming soon'
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    icon: SnapchatIcon,
    connected: false,
    accountCount: 0,
    totalAccounts: 2,
    color: '#FFFC00',
    comingSoon: true,
    description: 'Snapchat Ads integration coming soon'
  },
  {
    id: 'amazon',
    name: 'Amazon',
    icon: AmazonIcon,
    connected: false,
    accountCount: 0,
    totalAccounts: 2,
    color: '#FF9900',
    comingSoon: true,
    description: 'Amazon Advertising integration coming soon'
  },
  {
    id: 'twitter',
    name: 'X (formerly Twitter)',
    icon: TwitterIcon,
    connected: false,
    accountCount: 0,
    totalAccounts: 2,
    color: '#000000',
    comingSoon: true,
    description: 'X Ads integration coming soon'
  }
]

export default function AdSpendPage() {
  const [channels, setChannels] = useState<MarketingChannel[]>(marketingChannels)
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<MarketingChannel | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [loadingChannels, setLoadingChannels] = useState<string[]>([])
  const [credentialsModal, setCredentialsModal] = useState<{
    open: boolean
    channel: MarketingChannel | null
  }>({ open: false, channel: null })
  const [credentials, setCredentials] = useState<ChannelCredentials>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const credentialsConfig: CredentialsConfig = {
    facebook: {
      fields: [
        { name: 'appId', label: 'App ID', type: 'text', required: true },
        { name: 'appSecret', label: 'App Secret', type: 'password', required: true },
        { name: 'accessToken', label: 'Access Token', type: 'password', required: true }
      ]
    },
    google: {
      fields: [
        { name: 'clientId', label: 'Client ID', type: 'text', required: true },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
        { name: 'refreshToken', label: 'Refresh Token', type: 'password', required: true }
      ]
    },
    tiktok: {
      fields: [
        { name: 'appId', label: 'App ID', type: 'text', required: true },
        { name: 'secret', label: 'Secret', type: 'password', required: true },
        { name: 'accessToken', label: 'Access Token', type: 'password', required: true }
      ]
    },
    taboola: {
      fields: [
        { name: 'clientId', label: 'Client ID', type: 'text', required: true },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
      ]
    },
    microsoft: {
      fields: [
        { name: 'customerId', label: 'Customer ID', type: 'text', required: true },
        { name: 'developerToken', label: 'Developer Token', type: 'password', required: true }
      ]
    },
    pinterest: {
      fields: [
        { name: 'appId', label: 'App ID', type: 'text', required: true },
        { name: 'appSecret', label: 'App Secret', type: 'password', required: true }
      ]
    },
    snapchat: {
      fields: [
        { name: 'clientId', label: 'Client ID', type: 'text', required: true },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
      ]
    },
    amazon: {
      fields: [
        { name: 'clientId', label: 'Client ID', type: 'text', required: true },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
      ]
    },
    x: {
      fields: [
        { name: 'apiKey', label: 'API Key', type: 'text', required: true },
        { name: 'apiSecret', label: 'API Secret', type: 'password', required: true },
        { name: 'accessToken', label: 'Access Token', type: 'password', required: true },
        { name: 'accessTokenSecret', label: 'Access Token Secret', type: 'password', required: true }
      ]
    }
  }

  // Handle URL parameters for connection status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    
    if (success === 'facebook_connected') {
      setStatusMessage({ type: 'success', message: 'Facebook successfully connected!' })
      // Update Facebook channel status
      setChannels(prev => prev.map(channel => 
        channel.id === 'facebook' 
          ? { ...channel, connected: true, accountCount: channel.totalAccounts }
          : channel
      ))
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (success === 'google_connected') {
      setStatusMessage({ type: 'success', message: 'Google successfully connected!' })
      // Update Google channel status
      setChannels(prev => prev.map(channel => 
        channel.id === 'google' 
          ? { ...channel, connected: true, accountCount: channel.totalAccounts }
          : channel
      ))
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (error) {
      const errorMessages: Record<string, string> = {
        facebook_auth_denied: 'Facebook authorization was denied',
        facebook_auth_invalid: 'Facebook authorization failed - invalid parameters',
        facebook_config_error: 'Facebook integration is not properly configured',
        facebook_token_error: 'Failed to get Facebook access token',
        facebook_token_missing: 'No Facebook access token received',
        google_auth_denied: 'Google authorization was denied',
        google_auth_invalid: 'Google authorization failed - invalid parameters',
        google_config_error: 'Google integration is not properly configured',
        google_token_error: 'Failed to get Google access token',
        google_token_missing: 'No Google access token received',
        no_store: 'No store found - please connect your Shopify store first',
        database_error: 'Database error occurred while saving integration'
      }
      
      setStatusMessage({ 
        type: 'error', 
        message: errorMessages[error] || 'An unknown error occurred during connection' 
      })
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
    
    // Clear status message after 5 seconds
    if (success || error) {
      setTimeout(() => setStatusMessage(null), 5000)
    }
  }, [])

  const handleConnect = (channel: MarketingChannel) => {
    setCredentialsModal({ open: true, channel })
    setCredentials({})
    setError(null)
  }

  const handleCredentialChange = (fieldName: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const handleSaveCredentials = async () => {
    if (!credentialsModal.channel) return

    const config = credentialsConfig[credentialsModal.channel.id]
    if (!config) return

    // Validate required fields
    for (const field of config.fields) {
      if (field.required && !credentials[field.name]) {
        setError(`${field.label} is required`)
        return
      }
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/ad-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: credentialsModal.channel.id,
          credentials: credentials
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save credentials')
      }

      setCredentialsModal({ open: false, channel: null })
      setStatusMessage({ 
        type: 'success', 
        message: `${credentialsModal.channel.name} credentials saved successfully!` 
      })
      
      // Update the channel connection status
      // You might want to refresh the channel data here
      
    } catch (error) {
      console.error('Error saving credentials:', error)
      setError('Failed to save credentials. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCloseCredentialsModal = () => {
    setCredentialsModal({ open: false, channel: null })
    setCredentials({})
    setError(null)
  }

  const handleManage = (channel: MarketingChannel) => {
    // TODO: Implement manage functionality
    console.log('Managing channel:', channel.name)
  }

  const handleConfirmConnect = async () => {
    if (!selectedChannel) return
    
    setConnecting(true)
    
    try {
      if (selectedChannel.id === 'facebook') {
        // Redirect to Facebook OAuth
        const response = await fetch('/api/ad-spend/facebook/auth')
        const data = await response.json()
        
        if (data.authUrl) {
          window.location.href = data.authUrl
          return
        } else {
          throw new Error(data.error || 'Failed to generate Facebook auth URL')
        }
      } else if (selectedChannel.id === 'google') {
        // Redirect to Google OAuth
        const response = await fetch('/api/ad-spend/google/auth')
        const data = await response.json()
        
        if (data.authUrl) {
          window.location.href = data.authUrl
          return
        } else {
          throw new Error(data.error || 'Failed to generate Google auth URL')
        }
      }
      
      // For other platforms, simulate connection for now
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Update channel status
      setChannels(prev => prev.map(channel => 
        channel.id === selectedChannel.id 
          ? { ...channel, connected: true, accountCount: channel.totalAccounts }
          : channel
      ))
      
      setConnectDialogOpen(false)
    } catch (error) {
      console.error('Connection failed:', error)
      alert(`Failed to connect to ${selectedChannel.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setConnecting(false)
    }
  }

  const getStatusChip = (channel: MarketingChannel) => {
    if (channel.comingSoon) {
      return <Chip label="Coming Soon" size="small" color="default" variant="outlined" />
    }
    
    if (channel.connected) {
      return <Chip label={`${channel.accountCount}/${channel.totalAccounts} accounts`} size="small" color="success" />
    }
    
    return <Chip label={`${channel.accountCount}/${channel.totalAccounts} accounts`} size="small" color="warning" />
  }

  const getActionButton = (channel: MarketingChannel) => {
    if (channel.comingSoon) {
      return (
        <Button variant="outlined" disabled size="small">
          Coming Soon
        </Button>
      )
    }
    
    if (channel.connected) {
      return (
        <ManageButton size="small" onClick={() => handleManage(channel)}>
          Manage
        </ManageButton>
      )
    }
    
    return (
      <ConnectButton size="small" onClick={() => handleConnect(channel)}>
        Connect
      </ConnectButton>
    )
  }

  return (
    <PageContainer>
      <ContentContainer>
        <HeaderSection>
          <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>
            Integrate marketing channels
          </Typography>
          <Typography variant="h6" component="p" sx={{ opacity: 0.9, maxWidth: 800, margin: '0 auto' }}>
            Connect the ad channels you are using to auto sync ad spend and get precise Net Profit calculations.{' '}
            <Typography component="span" sx={{ color: '#4CAF50', fontWeight: 600 }}>
              See how to integrate a marketing channel
            </Typography>
          </Typography>
        </HeaderSection>

        {/* Status Message */}
        {statusMessage && (
          <Box sx={{ mb: 3 }}>
            <Alert 
              severity={statusMessage.type} 
              sx={{ borderRadius: 2, maxWidth: 600, margin: '0 auto' }}
              onClose={() => setStatusMessage(null)}
            >
              {statusMessage.message}
            </Alert>
          </Box>
        )}

        <Grid container spacing={3}>
          {channels.map((channel) => {
            const IconComponent = channel.icon
            return (
              <Grid item xs={12} md={6} lg={4} key={channel.id}>
                <ChannelCard>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 2, 
                      backgroundColor: channel.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2
                    }}>
                      <IconComponent sx={{ color: 'white', fontSize: 24 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                        {channel.name}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: channel.connected ? '#4caf50' : '#666',
                          fontWeight: 500
                        }}
                      >
                        {channel.accountCount}/{channel.totalAccounts} accounts
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
                      {channel.description}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 'auto' }}>
                    {channel.comingSoon ? (
                      <Button
                        variant="outlined"
                        disabled
                        sx={{ 
                          width: '100%',
                          textTransform: 'none',
                          borderRadius: 2,
                          py: 1
                        }}
                      >
                        Coming Soon
                      </Button>
                    ) : (
                      <Button
                        variant={channel.connected ? "outlined" : "contained"}
                        onClick={() => channel.connected ? handleManage(channel) : handleConnect(channel)}
                        disabled={loadingChannels.includes(channel.id)}
                        sx={{ 
                          width: '100%',
                          backgroundColor: channel.connected ? 'transparent' : channel.color,
                          borderColor: channel.color,
                          color: channel.connected ? channel.color : 'white',
                          textTransform: 'none',
                          borderRadius: 2,
                          py: 1,
                          '&:hover': {
                            backgroundColor: channel.connected 
                              ? `${channel.color}15` 
                              : `${channel.color}dd`,
                            borderColor: channel.color
                          }
                        }}
                      >
                        {loadingChannels.includes(channel.id) ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          channel.connected ? 'Manage' : 'Connect'
                        )}
                      </Button>
                    )}
                  </Box>
                </ChannelCard>
              </Grid>
            )
          })}
        </Grid>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Alert severity="info" sx={{ display: 'inline-flex', borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>Custom Rules</strong> - Need help with advanced attribution or custom tracking? 
              Contact support for custom integration solutions.
            </Typography>
          </Alert>
        </Box>
      </ContentContainer>

      {/* Connection Dialog */}
      <Dialog 
        open={connectDialogOpen} 
        onClose={() => !connecting && setConnectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            {selectedChannel && (
              <>
                {React.createElement(selectedChannel.icon, { sx: { color: selectedChannel.color, fontSize: 32 } })}
                <Typography variant="h6">
                  Connect {selectedChannel.name}
                </Typography>
              </>
            )}
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            You're about to connect your {selectedChannel?.name} account to automatically sync ad spend data.
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              This will redirect you to {selectedChannel?.name} to authorize access to your advertising accounts.
            </Typography>
          </Alert>
          
          {selectedChannel?.id === 'facebook' && (
            <Typography variant="body2" color="text.secondary">
              We'll request access to your Facebook Ads Manager data including campaign performance and spend metrics.
            </Typography>
          )}
          
          {selectedChannel?.id === 'google' && (
            <Typography variant="body2" color="text.secondary">
              We'll request access to your Google Ads data including campaign performance, keywords, and spend metrics.
            </Typography>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setConnectDialogOpen(false)} 
            disabled={connecting}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmConnect} 
            disabled={connecting}
            variant="contained"
            startIcon={connecting ? <CircularProgress size={16} /> : null}
          >
            {connecting ? 'Connecting...' : `Connect ${selectedChannel?.name}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Credentials Modal */}
      <Dialog 
        open={credentialsModal.open} 
        onClose={handleCloseCredentialsModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {credentialsModal.channel && (
              <>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 2, 
                  backgroundColor: credentialsModal.channel.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {React.createElement(credentialsModal.channel.icon, { sx: { color: 'white', fontSize: 20 } })}
                </Box>
                Connect {credentialsModal.channel.name}
              </>
            )}
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
            Enter your API credentials to connect your {credentialsModal.channel?.name} account.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {credentialsModal.channel && credentialsConfig[credentialsModal.channel.id] && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {credentialsConfig[credentialsModal.channel.id].fields.map((field) => (
                <TextField
                  key={field.name}
                  label={field.label}
                  type={field.type}
                  value={credentials[field.name] || ''}
                  onChange={(e) => handleCredentialChange(field.name, e.target.value)}
                  required={field.required}
                  fullWidth
                  variant="outlined"
                />
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={handleCloseCredentialsModal}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveCredentials}
            variant="contained"
            disabled={saving}
            sx={{
              backgroundColor: credentialsModal.channel?.color,
              '&:hover': {
                backgroundColor: credentialsModal.channel ? `${credentialsModal.channel.color}dd` : undefined
              }
            }}
          >
            {saving ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Saving...
              </>
            ) : (
              'Save Credentials'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  )
} 