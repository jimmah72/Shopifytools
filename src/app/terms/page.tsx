import React from 'react'
import { 
  Container, 
  Typography, 
  Box, 
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material'

export const metadata = {
  title: 'Terms of Service - Shopify Tools',
  description: 'Terms of Service for Shopify Tools ad spend integration platform'
}

export default function TermsOfService() {
  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#f5f5f5',
      py: 4
    }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
            Terms of Service
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Last updated: {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Typography>

          <Typography variant="body1" paragraph>
            These Terms of Service ("Terms") govern your access to and use of Shopify Tools ("Service") 
            operated by Shopify Tools ("us", "we", or "our").
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Acceptance of Terms
          </Typography>
          
          <Typography variant="body1" paragraph>
            By accessing and using this service, you accept and agree to be bound by the terms and provision 
            of this agreement. If you do not agree to abide by the above, please do not use this service.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Description of Service
          </Typography>
          
          <Typography variant="body1" paragraph>
            Shopify Tools is a profit analysis platform that integrates with Shopify stores and advertising 
            platforms to provide comprehensive business analytics including:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText primary="Shopify store data synchronization and analysis" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Advertising spend tracking from Google Ads and Facebook Ads" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Profit margin calculations and reporting" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Cost tracking and fee management" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Multi-store and multi-user management" />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            User Accounts and Responsibilities
          </Typography>
          
          <Typography variant="body1" paragraph>
            To use certain features of the Service, you must register for an account. You agree to:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText primary="Provide accurate and complete registration information" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Maintain the security of your account credentials" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Notify us immediately of any unauthorized use of your account" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Accept responsibility for all activities under your account" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Use the Service only for lawful business purposes" />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Data and Privacy
          </Typography>
          
          <Typography variant="body1" paragraph>
            Your privacy is important to us. Please review our Privacy Policy, which also governs your use 
            of the Service, to understand our practices. By using the Service, you consent to the collection 
            and use of your information as described in our Privacy Policy.
          </Typography>
          
          <Typography variant="body1" paragraph>
            You retain ownership of your business data. We provide the Service to analyze and present your 
            data but do not claim ownership of your store information, sales data, or advertising data.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Third-Party Integrations
          </Typography>
          
          <Typography variant="body1" paragraph>
            The Service integrates with third-party platforms including Shopify, Google Ads, and Facebook Ads. 
            Your use of these integrations is subject to:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText primary="The respective platform's terms of service and policies" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Your authorization and consent for data access" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Compliance with platform-specific usage requirements" />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Service Availability and Limitations
          </Typography>
          
          <Typography variant="body1" paragraph>
            We strive to provide reliable service but do not guarantee:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText primary="Uninterrupted or error-free operation" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Compatibility with all devices or browsers" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Continuous availability of third-party integrations" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Complete accuracy of calculated metrics" />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Prohibited Uses
          </Typography>
          
          <Typography variant="body1" paragraph>
            You may not use the Service to:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText primary="Violate any applicable laws or regulations" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Transmit malicious code or attempt to breach security" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Interfere with or disrupt the Service or servers" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Access another user's account without permission" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Use automated tools to access or scrape the Service" />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Intellectual Property
          </Typography>
          
          <Typography variant="body1" paragraph>
            The Service and its original content, features, and functionality are owned by Shopify Tools 
            and are protected by international copyright, trademark, patent, trade secret, and other 
            intellectual property laws.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Limitation of Liability
          </Typography>
          
          <Typography variant="body1" paragraph>
            To the maximum extent permitted by applicable law, Shopify Tools shall not be liable for any 
            indirect, incidental, special, consequential, or punitive damages, or any loss of profits or 
            revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other 
            intangible losses.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Termination
          </Typography>
          
          <Typography variant="body1" paragraph>
            We may terminate or suspend your account and access to the Service immediately, without prior 
            notice, for any reason, including if you breach these Terms. Upon termination, your right to 
            use the Service will cease immediately.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Changes to Terms
          </Typography>
          
          <Typography variant="body1" paragraph>
            We reserve the right to modify these Terms at any time. We will notify users of any changes 
            by posting the new Terms on this page and updating the "Last updated" date. Your continued 
            use of the Service after changes constitutes acceptance of the new Terms.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Contact Information
          </Typography>
          
          <Typography variant="body1" paragraph>
            If you have questions about these Terms of Service, please contact us:
          </Typography>
          
          <Box sx={{ ml: 2 }}>
            <Typography variant="body1" paragraph>
              <strong>Email:</strong> legal@shopifytools.com
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Mailing Address:</strong><br />
              Shopify Tools Legal Team<br />
              [Your Business Address]<br />
              [City, State, ZIP Code]<br />
              [Country]
            </Typography>
          </Box>

          <Box sx={{ mt: 4, p: 3, bgcolor: '#f0f7ff', borderRadius: 2, border: '1px solid #e3f2fd' }}>
            <Typography variant="body2" color="text.secondary">
              These Terms of Service are effective as of the date listed above. By using Shopify Tools, 
              you acknowledge that you have read, understood, and agree to be bound by these Terms.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
} 