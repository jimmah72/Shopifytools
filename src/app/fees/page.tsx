'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useStore } from '@/contexts/StoreContext';

interface FeeConfig {
  id: string;
  storeId: string;
  paymentGatewayRate: number;
  processingFeePerOrder: number;
  defaultCogRate: number;
  chargebackRate: number;
  returnRate: number;
}

interface AdditionalCost {
  id: string;
  storeId: string;
  name: string;
  percentagePerOrder: number;
  percentagePerItem: number;
  flatRatePerOrder: number;
  flatRatePerItem: number;
  isActive: boolean;
}

interface SubscriptionFee {
  id: string;
  storeId: string;
  name: string;
  billingType: 'MONTHLY' | 'YEARLY';
  monthlyAmount: number;
  yearlyAmount: number;
  dailyRate: number;
  isActive: boolean;
}

export default function FeesPage() {
  const { store } = useStore();
  const [config, setConfig] = useState<FeeConfig | null>(null);
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>([]);
  const [subscriptionFees, setSubscriptionFees] = useState<SubscriptionFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Local state for input values to preserve user typing
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // Modal states
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<AdditionalCost | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionFee | null>(null);

  // Form states for modals
  const [costForm, setCostForm] = useState({
    name: '',
    percentagePerOrder: '',
    percentagePerItem: '',
    flatRatePerOrder: '',
    flatRatePerItem: '',
    isActive: true
  });

  const [subscriptionForm, setSubscriptionForm] = useState({
    name: '',
    billingType: 'MONTHLY' as 'MONTHLY' | 'YEARLY',
    monthlyAmount: '',
    yearlyAmount: '',
    isActive: true
  });

  useEffect(() => {
    if (store?.id) {
      fetchAllData();
    }
  }, [store]);

  // Initialize input values when config loads
  useEffect(() => {
    if (config) {
      setInputValues({
        paymentGatewayRate: formatPercentage(config.paymentGatewayRate),
        processingFeePerOrder: config.processingFeePerOrder.toFixed(2),
        defaultCogRate: formatPercentage(config.defaultCogRate),
        chargebackRate: formatPercentage(config.chargebackRate),
        returnRate: formatPercentage(config.returnRate),
      });
    }
  }, [config]);

  const fetchAllData = async () => {
    if (!store?.id) return;
    
    try {
      setLoading(true);
      const [configResponse, costsResponse, subscriptionsResponse] = await Promise.all([
        fetch(`/api/fee-configuration?storeId=${store.id}`),
        fetch(`/api/additional-costs?storeId=${store.id}`),
        fetch(`/api/subscription-fees?storeId=${store.id}`),
      ]);
      
      if (!configResponse.ok) throw new Error('Failed to fetch configuration');
      
      const [configData, costsData, subscriptionsData] = await Promise.all([
        configResponse.json(),
        costsResponse.ok ? costsResponse.json() : [],
        subscriptionsResponse.ok ? subscriptionsResponse.json() : [],
      ]);
      
      setConfig(configData);
      setAdditionalCosts(costsData);
      setSubscriptionFees(subscriptionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Failed to load fee data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config || !store?.id) return;

    try {
      setSaving(true);
      const response = await fetch('/api/fee-configuration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save configuration');
      }

      const updatedConfig = await response.json();
      setConfig(updatedConfig);
      setMessage({ type: 'success', text: 'Basic fee configuration saved successfully!' });
    } catch (error) {
      console.error('Error saving fee configuration:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save configuration'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field: keyof Omit<FeeConfig, 'id' | 'storeId'>, value: number) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const formatPercentage = (value: number) => {
    const percentage = value * 100;
    return percentage % 1 === 0 ? percentage.toString() : percentage.toFixed(2).replace(/\.?0+$/, '');
  };
  
  const parsePercentage = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num / 100;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const calculateAdditionalCostsTotal = () => {
    return additionalCosts
      .filter(cost => cost.isActive)
      .reduce((total, cost) => {
        return total + cost.percentagePerOrder + cost.percentagePerItem + cost.flatRatePerOrder + cost.flatRatePerItem;
      }, 0);
  };

  const calculateSubscriptionsTotal = () => {
    return subscriptionFees
      .filter(fee => fee.isActive)
      .reduce((total, fee) => total + fee.dailyRate, 0);
  };

  // Modal handlers
  const openCostModal = (cost?: AdditionalCost) => {
    if (cost) {
      setEditingCost(cost);
      setCostForm({
        name: cost.name,
        percentagePerOrder: cost.percentagePerOrder.toString(),
        percentagePerItem: cost.percentagePerItem.toString(),
        flatRatePerOrder: cost.flatRatePerOrder.toString(),
        flatRatePerItem: cost.flatRatePerItem.toString(),
        isActive: cost.isActive
      });
    } else {
      setEditingCost(null);
      setCostForm({
        name: '',
        percentagePerOrder: '0',
        percentagePerItem: '0',
        flatRatePerOrder: '0',
        flatRatePerItem: '0',
        isActive: true
      });
    }
    setCostModalOpen(true);
  };

  const openSubscriptionModal = (subscription?: SubscriptionFee) => {
    if (subscription) {
      setEditingSubscription(subscription);
      setSubscriptionForm({
        name: subscription.name,
        billingType: subscription.billingType,
        monthlyAmount: subscription.monthlyAmount.toString(),
        yearlyAmount: subscription.yearlyAmount.toString(),
        isActive: subscription.isActive
      });
    } else {
      setEditingSubscription(null);
      setSubscriptionForm({
        name: '',
        billingType: 'MONTHLY',
        monthlyAmount: '0',
        yearlyAmount: '0',
        isActive: true
      });
    }
    setSubscriptionModalOpen(true);
  };

  const handleCostSave = async () => {
    if (!store?.id || !costForm.name.trim()) return;

    try {
      const method = editingCost ? 'PUT' : 'POST';
      const data = {
        ...(editingCost && { id: editingCost.id }),
        storeId: store.id,
        name: costForm.name.trim(),
        percentagePerOrder: parseFloat(costForm.percentagePerOrder) || 0,
        percentagePerItem: parseFloat(costForm.percentagePerItem) || 0,
        flatRatePerOrder: parseFloat(costForm.flatRatePerOrder) || 0,
        flatRatePerItem: parseFloat(costForm.flatRatePerItem) || 0,
        isActive: costForm.isActive
      };

      const response = await fetch('/api/additional-costs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save cost');

      setCostModalOpen(false);
      setMessage({ type: 'success', text: `Additional cost ${editingCost ? 'updated' : 'created'} successfully!` });
      fetchAllData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save additional cost' });
    }
  };

  const handleSubscriptionSave = async () => {
    if (!store?.id || !subscriptionForm.name.trim()) return;

    try {
      const method = editingSubscription ? 'PUT' : 'POST';
      const data = {
        ...(editingSubscription && { id: editingSubscription.id }),
        storeId: store.id,
        name: subscriptionForm.name.trim(),
        billingType: subscriptionForm.billingType,
        monthlyAmount: parseFloat(subscriptionForm.monthlyAmount) || 0,
        yearlyAmount: parseFloat(subscriptionForm.yearlyAmount) || 0,
        isActive: subscriptionForm.isActive
      };

      const response = await fetch('/api/subscription-fees', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save subscription');

      setSubscriptionModalOpen(false);
      setMessage({ type: 'success', text: `Subscription fee ${editingSubscription ? 'updated' : 'created'} successfully!` });
      fetchAllData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save subscription fee' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading fee configuration...</Typography>
      </Box>
    );
  }

  if (!config) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load fee configuration</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Fee Configuration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure all fees, rates, and costs used in dashboard and product calculations.
          </Typography>
        </Box>

        {message && (
          <Alert 
            severity={message.type} 
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Basic Fee Configuration */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Basic Fee Configuration
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      label="Payment Gateway Rate"
                      type="number"
                      fullWidth
                      value={inputValues.paymentGatewayRate || ''}
                      onChange={(e) => {
                        setInputValues({ ...inputValues, paymentGatewayRate: e.target.value });
                      }}
                      onBlur={(e) => {
                        const value = parsePercentage(e.target.value);
                        updateConfig('paymentGatewayRate', value);
                        setInputValues({ ...inputValues, paymentGatewayRate: formatPercentage(value) });
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      helperText="Typical: 2.9% (Stripe, PayPal)"
                      inputProps={{ step: '0.01', min: '0', max: '100' }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      label="Processing Fee Per Order"
                      type="number"
                      fullWidth
                      value={inputValues.processingFeePerOrder || ''}
                      onChange={(e) => {
                        setInputValues({ ...inputValues, processingFeePerOrder: e.target.value });
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateConfig('processingFeePerOrder', value);
                        setInputValues({ ...inputValues, processingFeePerOrder: value.toFixed(2) });
                      }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      helperText="Flat fee per transaction"
                      inputProps={{ step: '0.01', min: '0' }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      label="Default COG Rate"
                      type="number"
                      fullWidth
                      value={inputValues.defaultCogRate || ''}
                      onChange={(e) => {
                        setInputValues({ ...inputValues, defaultCogRate: e.target.value });
                      }}
                      onBlur={(e) => {
                        const value = parsePercentage(e.target.value);
                        updateConfig('defaultCogRate', value);
                        setInputValues({ ...inputValues, defaultCogRate: formatPercentage(value) });
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      helperText="Used when product costs aren't set"
                      inputProps={{ step: '1', min: '0', max: '100' }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      label="Chargeback Rate"
                      type="number"
                      fullWidth
                      value={inputValues.chargebackRate || ''}
                      onChange={(e) => {
                        setInputValues({ ...inputValues, chargebackRate: e.target.value });
                      }}
                      onBlur={(e) => {
                        const value = parsePercentage(e.target.value);
                        updateConfig('chargebackRate', value);
                        setInputValues({ ...inputValues, chargebackRate: formatPercentage(value) });
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      helperText="Expected chargeback rate"
                      inputProps={{ step: '0.01', min: '0', max: '10' }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      label="Return Rate"
                      type="number"
                      fullWidth
                      value={inputValues.returnRate || ''}
                      onChange={(e) => {
                        setInputValues({ ...inputValues, returnRate: e.target.value });
                      }}
                      onBlur={(e) => {
                        const value = parsePercentage(e.target.value);
                        updateConfig('returnRate', value);
                        setInputValues({ ...inputValues, returnRate: formatPercentage(value) });
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      helperText="Expected return rate"
                      inputProps={{ step: '0.1', min: '0', max: '100' }}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Basic Configuration'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Additional Costs Section */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom color="primary">
                      Additional Costs
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Custom fees and costs that apply to orders and items. Total active costs: {formatCurrency(calculateAdditionalCostsTotal())}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openCostModal()}
                  >
                    Add Cost
                  </Button>
                </Box>
                
                {additionalCosts.length > 0 ? (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell align="center">% Per Order</TableCell>
                        <TableCell align="center">% Per Item</TableCell>
                        <TableCell align="center">$ Per Order</TableCell>
                        <TableCell align="center">$ Per Item</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {additionalCosts.map((cost) => (
                        <TableRow key={cost.id}>
                          <TableCell>{cost.name}</TableCell>
                          <TableCell align="center">{(cost.percentagePerOrder * 100).toFixed(2)}%</TableCell>
                          <TableCell align="center">{(cost.percentagePerItem * 100).toFixed(2)}%</TableCell>
                          <TableCell align="center">{formatCurrency(cost.flatRatePerOrder)}</TableCell>
                          <TableCell align="center">{formatCurrency(cost.flatRatePerItem)}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={cost.isActive ? 'Active' : 'Inactive'} 
                              color={cost.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" onClick={() => openCostModal(cost)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton 
                              size="small"
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this cost?')) {
                                  try {
                                    await fetch(`/api/additional-costs?id=${cost.id}`, { method: 'DELETE' });
                                    fetchAllData();
                                  } catch (error) {
                                    setMessage({ type: 'error', text: 'Failed to delete cost' });
                                  }
                                }
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography color="text.secondary">
                      No additional costs configured. Click "Add Cost" to get started.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Subscription Fees Section */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom color="primary">
                      Subscription Fees
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Monthly/yearly subscriptions converted to daily rates. Total daily rate: {formatCurrency(calculateSubscriptionsTotal())}/day
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openSubscriptionModal()}
                  >
                    Add Subscription
                  </Button>
                </Box>
                
                {subscriptionFees.length > 0 ? (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell align="center">Billing Type</TableCell>
                        <TableCell align="center">Monthly Amount</TableCell>
                        <TableCell align="center">Yearly Amount</TableCell>
                        <TableCell align="center">Daily Rate</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {subscriptionFees.map((fee) => (
                        <TableRow key={fee.id}>
                          <TableCell>{fee.name}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={fee.billingType} 
                              color={fee.billingType === 'MONTHLY' ? 'primary' : 'secondary'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            {fee.billingType === 'MONTHLY' ? formatCurrency(fee.monthlyAmount) : '-'}
                          </TableCell>
                          <TableCell align="center">
                            {fee.billingType === 'YEARLY' ? formatCurrency(fee.yearlyAmount) : '-'}
                          </TableCell>
                          <TableCell align="center">{formatCurrency(fee.dailyRate)}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={fee.isActive ? 'Active' : 'Inactive'} 
                              color={fee.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" onClick={() => openSubscriptionModal(fee)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton 
                              size="small"
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this subscription?')) {
                                  try {
                                    await fetch(`/api/subscription-fees?id=${fee.id}`, { method: 'DELETE' });
                                    fetchAllData();
                                  } catch (error) {
                                    setMessage({ type: 'error', text: 'Failed to delete subscription' });
                                  }
                                }
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography color="text.secondary">
                      No subscription fees configured. Click "Add Subscription" to get started.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Alert severity="info">
          <Typography variant="body2">
            <strong>Note:</strong> These settings affect dashboard calculations and product profit analysis.
            Additional costs are applied to orders/items, while subscription fees are prorated daily based on selected timeframes.
          </Typography>
        </Alert>
      </Stack>

      {/* Additional Cost Modal */}
      <Dialog open={costModalOpen} onClose={() => setCostModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingCost ? 'Edit Additional Cost' : 'Add Additional Cost'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Cost Name"
              fullWidth
              value={costForm.name}
              onChange={(e) => setCostForm({ ...costForm, name: e.target.value })}
              placeholder="e.g., Packaging, Labor, Marketing"
            />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Percentage Per Order"
                  type="number"
                  fullWidth
                  value={costForm.percentagePerOrder}
                  onChange={(e) => setCostForm({ ...costForm, percentagePerOrder: e.target.value })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  helperText="Applied as % of order total"
                  inputProps={{ step: '0.01', min: '0' }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Percentage Per Item"
                  type="number"
                  fullWidth
                  value={costForm.percentagePerItem}
                  onChange={(e) => setCostForm({ ...costForm, percentagePerItem: e.target.value })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  helperText="Applied as % per item in order"
                  inputProps={{ step: '0.01', min: '0' }}
                />
              </Grid>
            </Grid>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Flat Rate Per Order"
                  type="number"
                  fullWidth
                  value={costForm.flatRatePerOrder}
                  onChange={(e) => setCostForm({ ...costForm, flatRatePerOrder: e.target.value })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  helperText="Fixed cost per order"
                  inputProps={{ step: '0.01', min: '0' }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Flat Rate Per Item"
                  type="number"
                  fullWidth
                  value={costForm.flatRatePerItem}
                  onChange={(e) => setCostForm({ ...costForm, flatRatePerItem: e.target.value })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  helperText="Fixed cost per item"
                  inputProps={{ step: '0.01', min: '0' }}
                />
              </Grid>
            </Grid>
            
            <FormControlLabel
              control={
                <Switch
                  checked={costForm.isActive}
                  onChange={(e) => setCostForm({ ...costForm, isActive: e.target.checked })}
                />
              }
              label="Active (apply to dashboard calculations)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCostModalOpen(false)}>Cancel</Button>
          <Button onClick={handleCostSave} variant="contained" disabled={!costForm.name.trim()}>
            {editingCost ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Subscription Fee Modal */}
      <Dialog open={subscriptionModalOpen} onClose={() => setSubscriptionModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSubscription ? 'Edit Subscription Fee' : 'Add Subscription Fee'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Subscription Name"
              fullWidth
              value={subscriptionForm.name}
              onChange={(e) => setSubscriptionForm({ ...subscriptionForm, name: e.target.value })}
              placeholder="e.g., Shopify Plus, Analytics Tool, Software License"
            />
            
            <FormControl fullWidth>
              <InputLabel>Billing Type</InputLabel>
              <Select
                value={subscriptionForm.billingType}
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, billingType: e.target.value as 'MONTHLY' | 'YEARLY' })}
                label="Billing Type"
              >
                <MenuItem value="MONTHLY">Monthly</MenuItem>
                <MenuItem value="YEARLY">Yearly</MenuItem>
              </Select>
            </FormControl>
            
            {subscriptionForm.billingType === 'MONTHLY' && (
              <TextField
                label="Monthly Amount"
                type="number"
                fullWidth
                value={subscriptionForm.monthlyAmount}
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, monthlyAmount: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                helperText="Monthly subscription cost"
                inputProps={{ step: '0.01', min: '0' }}
              />
            )}
            
            {subscriptionForm.billingType === 'YEARLY' && (
              <TextField
                label="Yearly Amount"
                type="number"
                fullWidth
                value={subscriptionForm.yearlyAmount}
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, yearlyAmount: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                helperText="Yearly subscription cost"
                inputProps={{ step: '0.01', min: '0' }}
              />
            )}
            
            <FormControlLabel
              control={
                <Switch
                  checked={subscriptionForm.isActive}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, isActive: e.target.checked })}
                />
              }
              label="Active (apply to dashboard calculations)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubscriptionModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSubscriptionSave} variant="contained" disabled={!subscriptionForm.name.trim()}>
            {editingSubscription ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 