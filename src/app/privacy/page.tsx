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
  title: 'Privacy Policy - Shopify Tools',
  description: 'Privacy Policy for Shopify Tools ad spend integration platform'
}

export default function PrivacyPolicy() {
  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#f5f5f5',
      py: 4
    }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
            Privacy Policy
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Last updated: {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Typography>

          <Typography variant="body1" paragraph>
            This Privacy Policy describes how Shopify Tools ("we", "our", or "us") collects, uses, and protects 
            your information when you use our advertising spend integration service.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Information We Collect
          </Typography>
          
          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            1. Shopify Store Data
          </Typography>
          <Typography variant="body1" paragraph>
            When you connect your Shopify store, we collect:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Store information (name, domain, currency)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Product data (names, prices, costs, inventory)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Order information (sales data, customer details, fulfillment status)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Financial data (revenue, taxes, discounts, refunds)" />
            </ListItem>
          </List>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            2. Advertising Platform Data
          </Typography>
          <Typography variant="body1" paragraph>
            When you connect advertising platforms (Google Ads, Facebook Ads), we collect:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Ad account information and access permissions" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Campaign performance data (impressions, clicks, conversions)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Ad spend data and budget information" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Account metadata (account names, IDs, currency settings)" />
            </ListItem>
          </List>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            3. User Account Information
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Username and encrypted passwords" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Email address and contact information" />
            </ListItem>
            <ListItem>
              <ListItemText primary="User role and access permissions" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Login activity and usage analytics" />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            How We Use Your Information
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText 
                primary="Profit Analysis" 
                secondary="Calculate accurate profit margins by combining Shopify sales data with advertising spend"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Data Synchronization" 
                secondary="Automatically sync data from connected platforms to provide real-time insights"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Dashboard Analytics" 
                secondary="Generate reports and visualizations of your business performance"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Account Management" 
                secondary="Manage user access, store connections, and platform integrations"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Service Improvement" 
                secondary="Analyze usage patterns to improve our platform features and performance"
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Data Security and Storage
          </Typography>
          
          <Typography variant="body1" paragraph>
            We implement industry-standard security measures to protect your data:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText 
                primary="Encryption" 
                secondary="All data is encrypted in transit (HTTPS/TLS) and at rest in our secure databases"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Access Controls" 
                secondary="Role-based access controls ensure only authorized users can access specific data"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="OAuth Security" 
                secondary="We use OAuth 2.0 for secure API connections and never store your platform passwords"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Data Isolation" 
                secondary="Each store's data is isolated and not accessible to other users or stores"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Regular Backups" 
                secondary="Automated backups ensure data recovery capabilities"
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Third-Party Integrations
          </Typography>
          
          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            Shopify Integration
          </Typography>
          <Typography variant="body1" paragraph>
            We connect to your Shopify store using official Shopify APIs with your explicit permission. 
            We only access data necessary for profit calculation and analysis.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            Google Ads Integration
          </Typography>
          <Typography variant="body1" paragraph>
            When you connect Google Ads, we access your advertising data through Google's official APIs. 
            We request read-only permissions and do not modify your ad campaigns or settings.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            Facebook/Meta Ads Integration
          </Typography>
          <Typography variant="body1" paragraph>
            Our Facebook integration uses Meta's Marketing API with your authorization. We access campaign 
            performance data and ad spend information in read-only mode to provide accurate profit calculations.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Data Sharing and Disclosure
          </Typography>
          
          <Typography variant="body1" paragraph>
            We do not sell, trade, or rent your personal information to third parties. We may share data only in these circumstances:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText 
                primary="Legal Requirements" 
                secondary="When required by law, court order, or government request"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Service Providers" 
                secondary="With trusted service providers who assist in platform operations (hosting, analytics)"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Business Transfer" 
                secondary="In the event of a merger, acquisition, or sale of business assets"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Consent" 
                secondary="When you explicitly consent to data sharing for specific purposes"
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Your Rights and Choices
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText 
                primary="Access and Portability" 
                secondary="Request a copy of your data in a commonly used format"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Correction" 
                secondary="Request correction of inaccurate or incomplete data"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Deletion" 
                secondary="Request deletion of your account and associated data"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Disconnect Integrations" 
                secondary="Revoke access to connected platforms at any time through your account settings"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Data Processing Restriction" 
                secondary="Request limitation of data processing for specific purposes"
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Cookies and Analytics
          </Typography>
          
          <Typography variant="body1" paragraph>
            We use cookies and similar technologies to:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText primary="Maintain your login session and user preferences" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Analyze platform usage and performance" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Improve user experience and platform functionality" />
            </ListItem>
          </List>

          <Typography variant="body1" paragraph>
            You can control cookie settings through your browser preferences.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Data Retention
          </Typography>
          
          <Typography variant="body1" paragraph>
            We retain your data for as long as your account is active or as needed to provide services. 
            Specific retention periods:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText 
                primary="Account Data" 
                secondary="Retained until account deletion or 90 days after last login"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Business Data" 
                secondary="Shopify and advertising data retained for analytical purposes"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Audit Logs" 
                secondary="Security and access logs retained for 1 year"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Legal Requirements" 
                secondary="Some data may be retained longer if required by applicable laws"
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            International Data Transfers
          </Typography>
          
          <Typography variant="body1" paragraph>
            Your data may be processed and stored in countries other than your own. We ensure appropriate 
            safeguards are in place when transferring data internationally, including:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText primary="Adherence to applicable data protection frameworks" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Implementation of appropriate technical and organizational measures" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Compliance with relevant privacy laws and regulations" />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Children's Privacy
          </Typography>
          
          <Typography variant="body1" paragraph>
            Our service is not intended for individuals under the age of 18. We do not knowingly collect 
            personal information from children under 18. If we become aware that we have collected personal 
            information from a child under 18, we will take steps to delete such information.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Changes to This Privacy Policy
          </Typography>
          
          <Typography variant="body1" paragraph>
            We may update this Privacy Policy from time to time. We will notify you of any changes by:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText primary="Posting the new Privacy Policy on this page" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Updating the 'Last updated' date at the top of this policy" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Sending email notifications for significant changes" />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Contact Information
          </Typography>
          
          <Typography variant="body1" paragraph>
            If you have questions about this Privacy Policy or our data practices, please contact us:
          </Typography>
          
          <Box sx={{ ml: 2 }}>
            <Typography variant="body1" paragraph>
              <strong>Email:</strong> privacy@shopifytools.com
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Mailing Address:</strong><br />
              Shopify Tools Privacy Team<br />
              [Your Business Address]<br />
              [City, State, ZIP Code]<br />
              [Country]
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 4 }}>
            Compliance and Certifications
          </Typography>
          
          <Typography variant="body1" paragraph>
            Our platform complies with applicable privacy laws and regulations, including:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText primary="General Data Protection Regulation (GDPR)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="California Consumer Privacy Act (CCPA)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Shopify Partner Program Requirements" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Google Ads API Terms of Service" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Facebook/Meta Platform Policies" />
            </ListItem>
          </List>

          <Box sx={{ mt: 4, p: 3, bgcolor: '#f0f7ff', borderRadius: 2, border: '1px solid #e3f2fd' }}>
            <Typography variant="body2" color="text.secondary">
              This Privacy Policy is effective as of the date listed above and applies to all users of the Shopify Tools platform. 
              By using our service, you acknowledge that you have read and understood this Privacy Policy.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
} 