'use client';

import React from 'react'
import { Box, Container, Typography, Stack } from '@mui/material'
import ShopifyConnection from '@/components/settings/ShopifyConnection'
import UserManagement from '@/components/settings/UserManagement'
import { useAuth } from '@/contexts/AuthContext'

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <Container maxWidth="lg">
      <Stack spacing={4}>
        <Box>
          <Typography variant="h4" gutterBottom>Settings</Typography>
          <Typography color="text.secondary">
            Configure your store settings and manage user accounts
          </Typography>
        </Box>

        <ShopifyConnection />

        {/* Only show user management to admins */}
        {user?.role === 'ADMIN' && <UserManagement />}

        {user?.role !== 'ADMIN' && (
          <Box>
            <Typography color="text.secondary">
              Contact your administrator to manage users and additional settings.
            </Typography>
          </Box>
        )}
      </Stack>
    </Container>
  )
} 