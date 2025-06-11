'use client'

import React, { useState } from 'react'
import { Box, Button, Paper, TextField, Typography, Alert } from '@mui/material'
import { useStore } from '@/contexts/StoreContext'

export default function ShopifyConnection() {
  const { store } = useStore()
  const [shopDomain, setShopDomain] = useState('')
  const [error, setError] = useState('')

  console.log('ShopifyConnection - Current store:', store)

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('ShopifyConnection - Connecting to shop:', shopDomain)
    
    try {
      const response = await fetch(`/api/auth/shopify?shop=${shopDomain}`)
      console.log('ShopifyConnection - Auth response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('ShopifyConnection - Auth response data:', data)
        
        if (data.authUrl) {
          console.log('ShopifyConnection - Redirecting to auth URL:', data.authUrl)
          window.location.href = data.authUrl
        } else {
          console.error('ShopifyConnection - No auth URL in response')
          setError('Failed to get authentication URL')
        }
      } else {
        const errorData = await response.json()
        console.error('ShopifyConnection - Auth error:', errorData)
        setError(errorData.error || 'Failed to connect to Shopify')
      }
    } catch (error) {
      console.error('ShopifyConnection - Connection error:', error)
      setError('Failed to connect to Shopify')
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Connect your Shopify Store
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Connect your Shopify store to start tracking your profits and analytics.
        We'll need access to your orders, products, and inventory data.
      </Typography>
      
      {store ? (
        <Box>
          <Typography variant="body1" gutterBottom>
            Connected to: <strong>{store.domain}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your store is connected and syncing data.
          </Typography>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleConnect} sx={{ display: 'flex', gap: 2 }}>
          <TextField
            id="shop"
            fullWidth
            size="small"
            value={shopDomain}
            onChange={(e) => {
              console.log('ShopifyConnection - Shop domain changed:', e.target.value)
              setShopDomain(e.target.value)
            }}
            placeholder="your-store.myshopify.com"
            label="Shopify Store Domain"
            variant="outlined"
          />
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            sx={{ whiteSpace: 'nowrap' }}
          >
            Connect Store
          </Button>
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Paper>
  )
} 