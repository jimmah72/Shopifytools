'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material'
import { useStore } from '@/contexts/StoreContext'

interface PaymentGateway {
  id: string
  name: string
  fixedFee: number
  percentageFee: number
  externalFee: number
}

export default function PaymentGateways() {
  const { store } = useStore()
  const [gateways, setGateways] = useState<PaymentGateway[]>([])
  const [open, setOpen] = useState(false)
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    fixedFee: '',
    percentageFee: '',
    externalFee: '',
  })

  useEffect(() => {
    if (store?.id) {
      fetchGateways()
    }
  }, [store])

  const fetchGateways = async () => {
    try {
      if (!store?.id) return
      const response = await fetch(`/api/payment-gateways?storeId=${store.id}`)
      if (!response.ok) throw new Error('Failed to fetch payment gateways')
      const data = await response.json()
      setGateways(data)
    } catch (error) {
      console.error('Error fetching payment gateways:', error)
    }
  }

  const handleOpen = (gateway?: PaymentGateway) => {
    if (gateway) {
      setEditingGateway(gateway)
      setFormData({
        name: gateway.name,
        fixedFee: gateway.fixedFee.toString(),
        percentageFee: gateway.percentageFee.toString(),
        externalFee: gateway.externalFee.toString(),
      })
    } else {
      setEditingGateway(null)
      setFormData({
        name: '',
        fixedFee: '',
        percentageFee: '',
        externalFee: '',
      })
    }
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditingGateway(null)
    setFormData({
      name: '',
      fixedFee: '',
      percentageFee: '',
      externalFee: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!store?.id) return
      const data = {
        storeId: store.id,
        name: formData.name,
        fixedFee: parseFloat(formData.fixedFee),
        percentageFee: parseFloat(formData.percentageFee),
        externalFee: parseFloat(formData.externalFee),
      }

      const url = '/api/payment-gateways'
      const method = editingGateway ? 'PUT' : 'POST'
      const body = editingGateway ? { ...data, id: editingGateway.id } : data

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save payment gateway')
      
      handleClose()
      fetchGateways()
    } catch (error) {
      console.error('Error saving payment gateway:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/payment-gateways?id=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete payment gateway')
      fetchGateways()
    } catch (error) {
      console.error('Error deleting payment gateway:', error)
    }
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Payment Gateways</Typography>
        <Button variant="contained" color="primary" onClick={() => handleOpen()}>
          Add Gateway
        </Button>
      </Box>

      <Grid container spacing={2}>
        {gateways.map((gateway) => (
          <Grid item xs={12} sm={6} md={4} key={gateway.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="h6" gutterBottom>
                    {gateway.name}
                  </Typography>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpen(gateway)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(gateway.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Fixed Fee: ${gateway.fixedFee.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Percentage Fee: {gateway.percentageFee.toFixed(2)}%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  External Fee: ${gateway.externalFee.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingGateway ? 'Edit Payment Gateway' : 'Add Payment Gateway'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Gateway Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Fixed Fee ($)"
              type="number"
              fullWidth
              required
              value={formData.fixedFee}
              onChange={(e) => setFormData({ ...formData, fixedFee: e.target.value })}
              inputProps={{ step: '0.01', min: '0' }}
              helperText="e.g., 0.30 for $0.30 per transaction"
            />
            <TextField
              margin="dense"
              label="Percentage Fee (%)"
              type="number"
              fullWidth
              required
              value={formData.percentageFee}
              onChange={(e) => setFormData({ ...formData, percentageFee: e.target.value })}
              inputProps={{ step: '0.01', min: '0', max: '100' }}
              helperText="e.g., 2.95 for 2.95%"
            />
            <TextField
              margin="dense"
              label="External Fee ($)"
              type="number"
              fullWidth
              required
              value={formData.externalFee}
              onChange={(e) => setFormData({ ...formData, externalFee: e.target.value })}
              inputProps={{ step: '0.01', min: '0' }}
              helperText="e.g., 0.25 for $0.25 external fee"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
} 