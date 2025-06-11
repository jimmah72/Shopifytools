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
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material'
import { useStore } from '@/contexts/StoreContext'

interface Cost {
  id: string
  name: string
  category: string
  startDate: string
  endDate?: string | null
}

interface FixedCost extends Cost {
  amount: number
  frequency: string
}

interface VariableCost extends Cost {
  amountPerOrder: number
}

export default function CostManagement() {
  const { store } = useStore()
  const [tabValue, setTabValue] = useState(0)
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([])
  const [variableCosts, setVariableCosts] = useState<VariableCost[]>([])
  const [open, setOpen] = useState(false)
  const [editingCost, setEditingCost] = useState<(FixedCost | VariableCost) | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    amount: '',
    amountPerOrder: '',
    frequency: 'MONTHLY',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  })

  useEffect(() => {
    if (store?.id) {
      fetchCosts()
    }
  }, [store])

  const fetchCosts = async () => {
    if (!store?.id) return
    try {
      const [fixedResponse, variableResponse] = await Promise.all([
        fetch(`/api/costs?storeId=${store.id}&type=fixed`),
        fetch(`/api/costs?storeId=${store.id}&type=variable`),
      ])

      if (!fixedResponse.ok || !variableResponse.ok) {
        throw new Error('Failed to fetch costs')
      }

      const [fixedData, variableData] = await Promise.all([
        fixedResponse.json(),
        variableResponse.json(),
      ])

      setFixedCosts(fixedData)
      setVariableCosts(variableData)
    } catch (error) {
      console.error('Error fetching costs:', error)
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleOpen = (cost?: FixedCost | VariableCost) => {
    if (cost) {
      setEditingCost(cost)
      setFormData({
        name: cost.name,
        category: cost.category,
        amount: 'amount' in cost ? cost.amount.toString() : '',
        amountPerOrder: 'amountPerOrder' in cost ? cost.amountPerOrder.toString() : '',
        frequency: 'frequency' in cost ? cost.frequency : 'MONTHLY',
        startDate: new Date(cost.startDate).toISOString().split('T')[0],
        endDate: cost.endDate ? new Date(cost.endDate).toISOString().split('T')[0] : '',
      })
    } else {
      setEditingCost(null)
      setFormData({
        name: '',
        category: '',
        amount: '',
        amountPerOrder: '',
        frequency: 'MONTHLY',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
      })
    }
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditingCost(null)
    setFormData({
      name: '',
      category: '',
      amount: '',
      amountPerOrder: '',
      frequency: 'MONTHLY',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store?.id) return
    try {
      const isFixed = tabValue === 0
      const data = {
        storeId: store.id,
        type: isFixed ? 'fixed' : 'variable',
        name: formData.name,
        category: formData.category,
        ...(isFixed
          ? {
              amount: parseFloat(formData.amount),
              frequency: formData.frequency,
            }
          : {
              amountPerOrder: parseFloat(formData.amountPerOrder),
            }),
        startDate: formData.startDate,
        endDate: formData.endDate || null,
      }

      const url = '/api/costs'
      const method = editingCost ? 'PUT' : 'POST'
      const body = editingCost ? { ...data, id: editingCost.id } : data

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save cost')
      
      handleClose()
      fetchCosts()
    } catch (error) {
      console.error('Error saving cost:', error)
    }
  }

  const handleDelete = async (id: string, type: 'fixed' | 'variable') => {
    try {
      const response = await fetch(`/api/costs?id=${id}&type=${type}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete cost')
      fetchCosts()
    } catch (error) {
      console.error('Error deleting cost:', error)
    }
  }

  const renderCostCard = (cost: FixedCost | VariableCost, type: 'fixed' | 'variable') => (
    <Grid item xs={12} sm={6} md={4} key={cost.id}>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="h6" gutterBottom>
              {cost.name}
            </Typography>
            <Box>
              <IconButton size="small" onClick={() => handleOpen(cost)}>
                <EditIcon />
              </IconButton>
              <IconButton size="small" onClick={() => handleDelete(cost.id, type)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
          <Typography variant="body2" color="textSecondary">
            Category: {cost.category}
          </Typography>
          {'amount' in cost && (
            <>
              <Typography variant="body2" color="textSecondary">
                Amount: ${cost.amount.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Frequency: {cost.frequency.toLowerCase()}
              </Typography>
            </>
          )}
          {'amountPerOrder' in cost && (
            <Typography variant="body2" color="textSecondary">
              Amount per Order: ${cost.amountPerOrder.toFixed(2)}
            </Typography>
          )}
          <Typography variant="body2" color="textSecondary">
            Start Date: {new Date(cost.startDate).toLocaleDateString()}
          </Typography>
          {cost.endDate && (
            <Typography variant="body2" color="textSecondary">
              End Date: {new Date(cost.endDate).toLocaleDateString()}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grid>
  )

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Fixed Costs" />
          <Tab label="Variable Costs" />
        </Tabs>
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          {tabValue === 0 ? 'Fixed Costs' : 'Variable Costs'}
        </Typography>
        <Button variant="contained" color="primary" onClick={() => handleOpen()}>
          Add Cost
        </Button>
      </Box>

      <Grid container spacing={2}>
        {tabValue === 0
          ? fixedCosts.map((cost) => renderCostCard(cost, 'fixed'))
          : variableCosts.map((cost) => renderCostCard(cost, 'variable'))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCost
            ? `Edit ${tabValue === 0 ? 'Fixed' : 'Variable'} Cost`
            : `Add ${tabValue === 0 ? 'Fixed' : 'Variable'} Cost`}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Category"
              fullWidth
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
            {tabValue === 0 ? (
              <>
                <TextField
                  margin="dense"
                  label="Amount ($)"
                  type="number"
                  fullWidth
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
                <Select
                  fullWidth
                  value={formData.frequency}
                  onChange={(e) =>
                    setFormData({ ...formData, frequency: e.target.value })
                  }
                  sx={{ mt: 2 }}
                >
                  <MenuItem value="MONTHLY">Monthly</MenuItem>
                  <MenuItem value="YEARLY">Yearly</MenuItem>
                  <MenuItem value="QUARTERLY">Quarterly</MenuItem>
                </Select>
              </>
            ) : (
              <TextField
                margin="dense"
                label="Amount per Order ($)"
                type="number"
                fullWidth
                required
                value={formData.amountPerOrder}
                onChange={(e) =>
                  setFormData({ ...formData, amountPerOrder: e.target.value })
                }
              />
            )}
            <TextField
              margin="dense"
              label="Start Date"
              type="date"
              fullWidth
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <TextField
              margin="dense"
              label="End Date"
              type="date"
              fullWidth
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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