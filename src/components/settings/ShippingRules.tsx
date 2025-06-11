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

interface ShippingRule {
  id: string
  name: string
  baseRate: number
  perItemRate: number
  weightRate?: number
}

export default function ShippingRules() {
  const { store } = useStore()
  const [rules, setRules] = useState<ShippingRule[]>([])
  const [open, setOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ShippingRule | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    baseRate: '',
    perItemRate: '',
    weightRate: '',
  })

  useEffect(() => {
    if (store?.id) {
      fetchRules()
    }
  }, [store])

  const fetchRules = async () => {
    try {
      if (!store?.id) return
      const response = await fetch(`/api/shipping-rules?storeId=${store.id}`)
      if (!response.ok) throw new Error('Failed to fetch shipping rules')
      const data = await response.json()
      setRules(data)
    } catch (error) {
      console.error('Error fetching shipping rules:', error)
    }
  }

  const handleOpen = (rule?: ShippingRule) => {
    if (rule) {
      setEditingRule(rule)
      setFormData({
        name: rule.name,
        baseRate: rule.baseRate.toString(),
        perItemRate: rule.perItemRate.toString(),
        weightRate: rule.weightRate?.toString() || '',
      })
    } else {
      setEditingRule(null)
      setFormData({
        name: '',
        baseRate: '',
        perItemRate: '',
        weightRate: '',
      })
    }
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditingRule(null)
    setFormData({
      name: '',
      baseRate: '',
      perItemRate: '',
      weightRate: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!store?.id) return
      const data = {
        storeId: store.id,
        name: formData.name,
        baseRate: parseFloat(formData.baseRate),
        perItemRate: parseFloat(formData.perItemRate),
        weightRate: formData.weightRate ? parseFloat(formData.weightRate) : null,
      }

      const url = '/api/shipping-rules'
      const method = editingRule ? 'PUT' : 'POST'
      const body = editingRule ? { ...data, id: editingRule.id } : data

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save shipping rule')
      
      handleClose()
      fetchRules()
    } catch (error) {
      console.error('Error saving shipping rule:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/shipping-rules?id=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete shipping rule')
      fetchRules()
    } catch (error) {
      console.error('Error deleting shipping rule:', error)
    }
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Shipping Rules</Typography>
        <Button variant="contained" color="primary" onClick={() => handleOpen()}>
          Add Rule
        </Button>
      </Box>

      <Grid container spacing={2}>
        {rules.map((rule) => (
          <Grid item xs={12} sm={6} md={4} key={rule.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="h6" gutterBottom>
                    {rule.name}
                  </Typography>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpen(rule)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(rule.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Base Rate: ${rule.baseRate.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Per Item: ${rule.perItemRate.toFixed(2)}
                </Typography>
                {rule.weightRate && (
                  <Typography variant="body2" color="textSecondary">
                    Per lb: ${rule.weightRate.toFixed(2)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRule ? 'Edit Shipping Rule' : 'Add Shipping Rule'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Rule Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Base Rate ($)"
              type="number"
              fullWidth
              required
              value={formData.baseRate}
              onChange={(e) => setFormData({ ...formData, baseRate: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Per Item Rate ($)"
              type="number"
              fullWidth
              required
              value={formData.perItemRate}
              onChange={(e) => setFormData({ ...formData, perItemRate: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Weight Rate ($ per lb)"
              type="number"
              fullWidth
              value={formData.weightRate}
              onChange={(e) => setFormData({ ...formData, weightRate: e.target.value })}
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