'use client'

import React from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Button,
  Link,
  Chip
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Launch as LaunchIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material'

interface EnvironmentVariable {
  name: string
  required: boolean
  description: string
  example?: string
}

const environmentVariables: EnvironmentVariable[] = [
  {
    name: 'GOOGLE_CLIENT_ID',
    required: true,
    description: 'Google OAuth Client ID for Google Ads API access',
    example: '123456789-abcdef.apps.googleusercontent.com'
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    required: true,
    description: 'Google OAuth Client Secret for Google Ads API access',
    example: 'GOCSPX-abcdef123456'
  },
  {
    name: 'GOOGLE_ADS_DEVELOPER_TOKEN',
    required: true,
    description: 'Google Ads API Developer Token',
    example: 'abcdef123456'
  },
  {
    name: 'FACEBOOK_APP_ID',
    required: true,
    description: 'Facebook App ID for Meta Ads API access',
    example: '123456789012345'
  },
  {
    name: 'FACEBOOK_APP_SECRET',
    required: true,
    description: 'Facebook App Secret for Meta Ads API access',
    example: 'abcdef1234567890abcdef1234567890'
  }
]

export default function AdSpendSettings() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Ad Spend Integration Setup
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            To enable OAuth-based ad spend integrations, you need to configure environment variables with your API credentials.
            These should be added to your <code>.env</code> file.
          </Typography>
        </Alert>

        <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, mb: 2 }}>
          Required Environment Variables
        </Typography>

        {environmentVariables.map((envVar, index) => (
          <Box key={envVar.name} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                {envVar.name}
              </Typography>
              {envVar.required ? (
                <Chip label="Required" size="small" color="error" />
              ) : (
                <Chip label="Optional" size="small" color="default" />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {envVar.description}
            </Typography>
            {envVar.example && (
              <Typography variant="caption" sx={{ fontFamily: 'monospace', background: '#f5f5f5', p: 1, borderRadius: 1, display: 'block' }}>
                Example: {envVar.example}
              </Typography>
            )}
          </Box>
        ))}

        <Typography variant="subtitle1" gutterBottom sx={{ mt: 4, mb: 2 }}>
          Setup Instructions
        </Typography>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Google Ads Setup</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              <ListItem>
                <ListItemText
                  primary="1. Create Google Cloud Project"
                  secondary={
                    <Box>
                      Go to{' '}
                      <Link href="https://console.cloud.google.com/" target="_blank" rel="noopener">
                        Google Cloud Console <LaunchIcon sx={{ fontSize: 14, ml: 0.5 }} />
                      </Link>{' '}
                      and create a new project.
                    </Box>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="2. Enable Google Ads API"
                  secondary="In the API Library, search for and enable the Google Ads API."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="3. Create OAuth 2.0 Credentials"
                  secondary="Go to Credentials → Create Credentials → OAuth 2.0 Client ID. Choose 'Web application' and add your domain to authorized redirect URIs."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="4. Get Developer Token"
                  secondary={
                    <Box>
                      Apply for a developer token at{' '}
                      <Link href="https://developers.google.com/google-ads/api/docs/first-call/dev-token" target="_blank" rel="noopener">
                        Google Ads Developer Token <LaunchIcon sx={{ fontSize: 14, ml: 0.5 }} />
                      </Link>
                    </Box>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="5. Add Redirect URI"
                  secondary="Add this redirect URI to your OAuth settings: https://yourdomain.com/api/ad-spend/google/callback"
                />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Facebook Ads Setup</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              <ListItem>
                <ListItemText
                  primary="1. Create Facebook App"
                  secondary={
                    <Box>
                      Go to{' '}
                      <Link href="https://developers.facebook.com/" target="_blank" rel="noopener">
                        Facebook Developers <LaunchIcon sx={{ fontSize: 14, ml: 0.5 }} />
                      </Link>{' '}
                      and create a new app.
                    </Box>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="2. Add Marketing API Product"
                  secondary="In your app dashboard, add the Marketing API product to your app."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="3. Configure OAuth Settings"
                  secondary="In App Settings → Basic, note your App ID and App Secret."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="4. Add Redirect URI"
                  secondary="Add this redirect URI to your OAuth settings: https://yourdomain.com/api/ad-spend/facebook/callback"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="5. Request Permissions"
                  secondary="Request ads_read and ads_management permissions for your app."
                />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>

        <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Example .env Configuration
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
{`# Google Ads OAuth
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdef123456
GOOGLE_ADS_DEVELOPER_TOKEN=abcdef123456

# Facebook Ads OAuth  
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=abcdef1234567890abcdef1234567890`}
          </Typography>
        </Box>

        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Security Note:</strong> Never commit your .env file to version control. 
            Add .env to your .gitignore file and use environment variables in production.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  )
} 