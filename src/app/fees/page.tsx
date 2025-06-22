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
  Paper,
  Divider,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { useStore } from '@/contexts/StoreContext';

interface FeeConfig {
  id: string;
  storeId: string;
  paymentGatewayRate: number;
  processingFeePerOrder: number;
  defaultCogRate: number;
  chargebackRate: number;
  returnProcessingRate: number;
  overheadCostPerOrder: number;
  overheadCostPerItem: number;
  miscCostPerOrder: number;
  miscCostPerItem: number;
  usePaymentMethodFees: boolean;
}

interface PaymentMethodFee {
  id: string;
  storeId: string;
  paymentMethod: string;
  displayName: string;
  percentageRate: number;
  fixedFee: number;
  isActive: boolean;
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
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null);
  const [paymentMethodFees, setPaymentMethodFees] = useState<PaymentMethodFee[]>([]);
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>([]);
  const [subscriptionFees, setSubscriptionFees] = useState<SubscriptionFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Local state for input values to preserve user typing
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // Modal states
  const [paymentMethodModal, setPaymentMethodModal] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethodFee | null>(null);
  const [additionalCostModal, setAdditionalCostModal] = useState(false);
  const [editingAdditionalCost, setEditingAdditionalCost] = useState<AdditionalCost | null>(null);
  const [subscriptionFeeModal, setSubscriptionFeeModal] = useState(false);
  const [editingSubscriptionFee, setEditingSubscriptionFee] = useState<SubscriptionFee | null>(null);

  // Form states for modals
  const [paymentMethodForm, setPaymentMethodForm] = useState({
    paymentMethod: '',
    displayName: '',
    percentageRate: '',
    fixedFee: '',
    isActive: true
  });

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
      fetchData();
    }
  }, [store?.id]);

  // Initialize input values when config loads
  useEffect(() => {
    if (feeConfig) {
      setInputValues({
        paymentGatewayRate: formatPercentage(feeConfig.paymentGatewayRate),
        processingFeePerOrder: feeConfig.processingFeePerOrder.toFixed(2),
        defaultCogRate: formatPercentage(feeConfig.defaultCogRate),
        chargebackRate: formatPercentage(feeConfig.chargebackRate),
        returnProcessingRate: formatPercentage(feeConfig.returnProcessingRate),
      });
    }
  }, [feeConfig]);

  const fetchData = async () => {
    if (!store?.id) return;
    
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [feeConfigRes, paymentMethodFeesRes, additionalCostsRes, subscriptionFeesRes] = await Promise.all([
        fetch(`/api/fee-configuration?storeId=${store.id}`),
        fetch(`/api/payment-method-fees?storeId=${store.id}`),
        fetch(`/api/additional-costs?storeId=${store.id}`),
        fetch(`/api/subscription-fees?storeId=${store.id}`)
      ]);

      if (feeConfigRes.ok) {
        const { feeConfiguration } = await feeConfigRes.json();
        setFeeConfig(feeConfiguration);
      }

      if (paymentMethodFeesRes.ok) {
        const { paymentMethodFees } = await paymentMethodFeesRes.json();
        setPaymentMethodFees(paymentMethodFees || []);
      }

      if (additionalCostsRes.ok) {
        const { additionalCosts } = await additionalCostsRes.json();
        setAdditionalCosts(additionalCosts || []);
      } else {
        // Set empty array if request fails
        setAdditionalCosts([]);
      }

      if (subscriptionFeesRes.ok) {
        const { subscriptionFees } = await subscriptionFeesRes.json();
        setSubscriptionFees(subscriptionFees || []);
      } else {
        // Set empty array if request fails
        setSubscriptionFees([]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load fee configuration');
      // Set empty arrays on error to prevent undefined errors
      setAdditionalCosts([]);
      setSubscriptionFees([]);
      setPaymentMethodFees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBasicFeeUpdate = async (field: string, value: number | boolean) => {
    if (!feeConfig || !store?.id) return;

    try {
      setSaving(true);
      const updatedConfig = { ...feeConfig, [field]: value };
      
      const response = await fetch('/api/fee-configuration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });

      if (response.ok) {
        const { feeConfiguration } = await response.json();
        setFeeConfig(feeConfiguration);
        setSuccess('Fee configuration updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to update fee configuration');
      }
    } catch (error) {
      console.error('Error updating fee configuration:', error);
      setError('Failed to update fee configuration');
    } finally {
      setSaving(false);
    }
  };

  // Payment method fee handlers
  const handlePaymentMethodSave = async () => {
    if (!store?.id) return;

    try {
      setSaving(true);
      const method = editingPaymentMethod ? 'PUT' : 'POST';
      const url = '/api/payment-method-fees';
      
      const payload = editingPaymentMethod 
        ? { 
            id: editingPaymentMethod.id,
            ...paymentMethodForm,
            percentageRate: parseFloat(paymentMethodForm.percentageRate) / 100,
            fixedFee: parseFloat(paymentMethodForm.fixedFee)
          }
        : { 
            storeId: store.id,
            ...paymentMethodForm,
            percentageRate: parseFloat(paymentMethodForm.percentageRate) / 100,
            fixedFee: parseFloat(paymentMethodForm.fixedFee)
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchData();
        setPaymentMethodModal(false);
        resetPaymentMethodForm();
        setSuccess(editingPaymentMethod ? 'Payment method updated' : 'Payment method added');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to save payment method');
      }
    } catch (error) {
      console.error('Error saving payment method:', error);
      setError('Failed to save payment method');
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentMethodDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    try {
      const response = await fetch(`/api/payment-method-fees?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchData();
        setSuccess('Payment method deleted');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to delete payment method');
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
      setError('Failed to delete payment method');
    }
  };

  const resetPaymentMethodForm = () => {
    setPaymentMethodForm({
      paymentMethod: '',
      displayName: '',
      percentageRate: '',
      fixedFee: '',
      isActive: true
    });
    setEditingPaymentMethod(null);
  };

  const openPaymentMethodModal = (paymentMethod?: PaymentMethodFee) => {
    if (paymentMethod) {
      setEditingPaymentMethod(paymentMethod);
      setPaymentMethodForm({
        paymentMethod: paymentMethod.paymentMethod,
        displayName: paymentMethod.displayName,
        percentageRate: (paymentMethod.percentageRate * 100).toString(),
        fixedFee: paymentMethod.fixedFee.toString(),
        isActive: paymentMethod.isActive
      });
    } else {
      resetPaymentMethodForm();
    }
    setPaymentMethodModal(true);
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
    if (!additionalCosts || additionalCosts.length === 0) return 0;
    return additionalCosts
      .filter(cost => cost.isActive)
      .reduce((total, cost) => {
        return total + cost.percentagePerOrder + cost.percentagePerItem + cost.flatRatePerOrder + cost.flatRatePerItem;
      }, 0);
  };

  const calculateSubscriptionFeesTotal = () => {
    if (!subscriptionFees || subscriptionFees.length === 0) return 0;
    return subscriptionFees
      .filter(fee => fee.isActive)
      .reduce((total, fee) => total + fee.dailyRate, 0);
  };

  // Modal handlers
  const openCostModal = (cost?: AdditionalCost) => {
    if (cost) {
      setEditingAdditionalCost(cost);
      setCostForm({
        name: cost.name,
        percentagePerOrder: cost.percentagePerOrder.toString(),
        percentagePerItem: cost.percentagePerItem.toString(),
        flatRatePerOrder: cost.flatRatePerOrder.toString(),
        flatRatePerItem: cost.flatRatePerItem.toString(),
        isActive: cost.isActive
      });
    } else {
      setEditingAdditionalCost(null);
      setCostForm({
        name: '',
        percentagePerOrder: '0',
        percentagePerItem: '0',
        flatRatePerOrder: '0',
        flatRatePerItem: '0',
        isActive: true
      });
    }
    setAdditionalCostModal(true);
  };

  const openSubscriptionModal = (subscription?: SubscriptionFee) => {
    if (subscription) {
      setEditingSubscriptionFee(subscription);
      setSubscriptionForm({
        name: subscription.name,
        billingType: subscription.billingType,
        monthlyAmount: subscription.monthlyAmount.toString(),
        yearlyAmount: subscription.yearlyAmount.toString(),
        isActive: subscription.isActive
      });
    } else {
      setEditingSubscriptionFee(null);
      setSubscriptionForm({
        name: '',
        billingType: 'MONTHLY',
        monthlyAmount: '0',
        yearlyAmount: '0',
        isActive: true
      });
    }
    setSubscriptionFeeModal(true);
  };

  const handleCostSave = async () => {
    if (!store?.id || !costForm.name.trim()) return;

    try {
      setSaving(true);
      const method = editingAdditionalCost ? 'PUT' : 'POST';
      const data = {
        ...(editingAdditionalCost && { id: editingAdditionalCost.id }),
        storeId: store.id,
        name: costForm.name.trim(),
        percentagePerOrder: parseFloat(costForm.percentagePerOrder) || 0,
        percentagePerItem: parseFloat(costForm.percentagePerItem) || 0,
        flatRatePerOrder: parseFloat(costForm.flatRatePerOrder) || 0,
        flatRatePerItem: parseFloat(costForm.flatRatePerItem) || 0,
        isActive: costForm.isActive,
      };

      const response = await fetch('/api/additional-costs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save cost');

      setAdditionalCostModal(false);
      setSuccess(`Additional cost ${editingAdditionalCost ? 'updated' : 'created'} successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (error) {
      setError('Failed to save additional cost');
    } finally {
      setSaving(false);
    }
  };

  const handleSubscriptionSave = async () => {
    if (!store?.id || !subscriptionForm.name.trim()) return;

    try {
      setSaving(true);
      const method = editingSubscriptionFee ? 'PUT' : 'POST';
      const data = {
        ...(editingSubscriptionFee && { id: editingSubscriptionFee.id }),
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

      setSubscriptionFeeModal(false);
      setSuccess(`Subscription fee ${editingSubscriptionFee ? 'updated' : 'created'} successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (error) {
      setError('Failed to save subscription fee');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography>Loading fee configuration...</Typography>
      </Box>
    );
  }

  if (!feeConfig) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load fee configuration</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsIcon /> Fee Configuration
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Basic Fee Configuration */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Typography variant="h6">Payment Processing Fees</Typography>
                
                {/* Payment Method Toggle */}
                <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={feeConfig.usePaymentMethodFees}
                        onChange={(e) => handleBasicFeeUpdate('usePaymentMethodFees', e.target.checked)}
                        disabled={saving}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Use Payment Method-Specific Fees
                        </Typography>
                        <Typography variant="body2">
                          {feeConfig.usePaymentMethodFees 
                            ? 'Fees will be calculated based on actual payment methods (Shopify Payments, PayPal, etc.)'
                            : 'Uses basic fee configuration for all payment types'
                          }
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>

                {!feeConfig.usePaymentMethodFees ? (
                  // Basic Fee Configuration (when payment method fees are disabled)
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Payment Gateway Rate"
                        type="number"
                        value={(feeConfig.paymentGatewayRate * 100).toFixed(2)}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) / 100;
                          handleBasicFeeUpdate('paymentGatewayRate', value);
                        }}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        }}
                        helperText="Standard payment processing rate"
                        disabled={saving}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Processing Fee Per Order"
                        type="number"
                        value={feeConfig.processingFeePerOrder.toFixed(2)}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          handleBasicFeeUpdate('processingFeePerOrder', value);
                        }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                        helperText="Fixed fee per transaction"
                        disabled={saving}
                      />
                    </Grid>
                  </Grid>
                ) : (
                  // Payment Method-Specific Configuration (when enabled)
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">Payment Method Fees</Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => openPaymentMethodModal()}
                        size="small"
                      >
                        Add Payment Method
                      </Button>
                    </Stack>

                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Payment Method</TableCell>
                          <TableCell>Rate</TableCell>
                          <TableCell>Fixed Fee</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paymentMethodFees.map((fee) => (
                          <TableRow key={fee.id}>
                            <TableCell>{fee.displayName}</TableCell>
                            <TableCell>{(fee.percentageRate * 100).toFixed(2)}%</TableCell>
                            <TableCell>${fee.fixedFee.toFixed(2)}</TableCell>
                            <TableCell>
                              <Chip
                                label={fee.isActive ? 'Active' : 'Inactive'}
                                color={fee.isActive ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => openPaymentMethodModal(fee)}
                                color="primary"
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handlePaymentMethodDelete(fee.id)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {paymentMethodFees.length === 0 && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        No payment methods configured. Add payment methods to enable specific fee rates.
                      </Alert>
                    )}
                  </Box>
                )}

                <Divider />

                {/* Other Basic Configuration Fields */}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Default COG Rate"
                      type="number"
                      value={(feeConfig.defaultCogRate * 100).toFixed(1)}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) / 100;
                        handleBasicFeeUpdate('defaultCogRate', value);
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      helperText="Default cost of goods sold rate"
                      disabled={saving}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Chargeback Rate"
                      type="number"
                      value={(feeConfig.chargebackRate * 100).toFixed(2)}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) / 100;
                        handleBasicFeeUpdate('chargebackRate', value);
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      helperText="Expected chargeback rate"
                      disabled={saving}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Return Processing Rate"
                      type="number"
                      value={(feeConfig.returnProcessingRate * 100).toFixed(2)}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) / 100;
                        handleBasicFeeUpdate('returnProcessingRate', value);
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      helperText="Return processing fee rate"
                      disabled={saving}
                    />
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Additional Costs Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" color="primary">
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
                    size="small"
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
                            <IconButton
                              size="small"
                              onClick={() => openCostModal(cost)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this additional cost?')) {
                                  try {
                                    await fetch(`/api/additional-costs?id=${cost.id}`, { method: 'DELETE' });
                                    fetchData();
                                    setSuccess('Additional cost deleted');
                                    setTimeout(() => setSuccess(null), 3000);
                                  } catch (error) {
                                    setError('Failed to delete additional cost');
                                  }
                                }
                              }}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Alert severity="info">
                    No additional costs configured. Add custom costs that apply to your business operations.
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Subscription Fees Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" color="primary">
                      Subscription Fees
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Monthly/yearly subscriptions converted to daily rates. Total daily rate: {formatCurrency(calculateSubscriptionFeesTotal())}/day
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openSubscriptionModal()}
                    size="small"
                  >
                    Add Subscription
                  </Button>
                </Box>

                {subscriptionFees.length > 0 ? (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell align="center">Billing</TableCell>
                        <TableCell align="center">Monthly</TableCell>
                        <TableCell align="center">Yearly</TableCell>
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
                              variant="outlined"
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
                            <IconButton
                              size="small"
                              onClick={() => openSubscriptionModal(fee)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this subscription fee?')) {
                                  try {
                                    await fetch(`/api/subscription-fees?id=${fee.id}`, { method: 'DELETE' });
                                    fetchData();
                                    setSuccess('Subscription fee deleted');
                                    setTimeout(() => setSuccess(null), 3000);
                                  } catch (error) {
                                    setError('Failed to delete subscription fee');
                                  }
                                }
                              }}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Alert severity="info">
                    No subscription fees configured. Add recurring monthly or yearly costs.
                  </Alert>
                )}
              </Stack>
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

      {/* Payment Method Modal */}
      <Dialog open={paymentMethodModal} onClose={() => setPaymentMethodModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPaymentMethod ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Payment Method Key"
              value={paymentMethodForm.paymentMethod}
              onChange={(e) => setPaymentMethodForm({...paymentMethodForm, paymentMethod: e.target.value})}
              helperText="e.g., shopify_payments_web, paypal_web"
              disabled={editingPaymentMethod !== null}
            />
            <TextField
              fullWidth
              label="Display Name"
              value={paymentMethodForm.displayName}
              onChange={(e) => setPaymentMethodForm({...paymentMethodForm, displayName: e.target.value})}
              helperText="e.g., Shopify Payments (Online)"
            />
            <TextField
              fullWidth
              label="Percentage Rate"
              type="number"
              value={paymentMethodForm.percentageRate}
              onChange={(e) => setPaymentMethodForm({...paymentMethodForm, percentageRate: e.target.value})}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="e.g., 2.9 for 2.9%"
            />
            <TextField
              fullWidth
              label="Fixed Fee"
              type="number"
              value={paymentMethodForm.fixedFee}
              onChange={(e) => setPaymentMethodForm({...paymentMethodForm, fixedFee: e.target.value})}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              helperText="e.g., 0.30 for $0.30 per transaction"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={paymentMethodForm.isActive}
                  onChange={(e) => setPaymentMethodForm({...paymentMethodForm, isActive: e.target.checked})}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentMethodModal(false)}>Cancel</Button>
          <Button onClick={handlePaymentMethodSave} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Additional Cost Modal */}
      <Dialog open={additionalCostModal} onClose={() => setAdditionalCostModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingAdditionalCost ? 'Edit Additional Cost' : 'Add Additional Cost'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Cost Name"
              value={costForm.name}
              onChange={(e) => setCostForm({...costForm, name: e.target.value})}
              helperText="e.g., 'Marketing Tools', 'Processing Fees'"
            />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Percentage Per Order"
                  type="number"
                  value={costForm.percentagePerOrder}
                  onChange={(e) => setCostForm({...costForm, percentagePerOrder: e.target.value})}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  helperText="Applied to total order value"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Percentage Per Item"
                  type="number"
                  value={costForm.percentagePerItem}
                  onChange={(e) => setCostForm({...costForm, percentagePerItem: e.target.value})}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  helperText="Applied to each item value"
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Fixed Rate Per Order"
                  type="number"
                  value={costForm.flatRatePerOrder}
                  onChange={(e) => setCostForm({...costForm, flatRatePerOrder: e.target.value})}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  helperText="Fixed cost per order"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Fixed Rate Per Item"
                  type="number"
                  value={costForm.flatRatePerItem}
                  onChange={(e) => setCostForm({...costForm, flatRatePerItem: e.target.value})}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  helperText="Fixed cost per item"
                />
              </Grid>
            </Grid>

            <FormControlLabel
              control={
                <Switch
                  checked={costForm.isActive}
                  onChange={(e) => setCostForm({...costForm, isActive: e.target.checked})}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdditionalCostModal(false)}>Cancel</Button>
          <Button onClick={handleCostSave} variant="contained" disabled={!costForm.name.trim()}>
            {editingAdditionalCost ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Subscription Fee Modal */}
      <Dialog open={subscriptionFeeModal} onClose={() => setSubscriptionFeeModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSubscriptionFee ? 'Edit Subscription Fee' : 'Add Subscription Fee'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Subscription Name"
              value={subscriptionForm.name}
              onChange={(e) => setSubscriptionForm({...subscriptionForm, name: e.target.value})}
              helperText="e.g., 'Shopify Plan', 'Email Marketing', 'Analytics Tool'"
            />
            
            <FormControl fullWidth>
              <InputLabel>Billing Type</InputLabel>
              <Select
                value={subscriptionForm.billingType}
                label="Billing Type"
                onChange={(e) => setSubscriptionForm({...subscriptionForm, billingType: e.target.value as 'MONTHLY' | 'YEARLY'})}
              >
                <MenuItem value="MONTHLY">Monthly</MenuItem>
                <MenuItem value="YEARLY">Yearly</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label={subscriptionForm.billingType === 'MONTHLY' ? 'Monthly Amount' : 'Yearly Amount'}
              type="number"
              value={subscriptionForm.billingType === 'MONTHLY' ? subscriptionForm.monthlyAmount : subscriptionForm.yearlyAmount}
              onChange={(e) => {
                if (subscriptionForm.billingType === 'MONTHLY') {
                  setSubscriptionForm({...subscriptionForm, monthlyAmount: e.target.value});
                } else {
                  setSubscriptionForm({...subscriptionForm, yearlyAmount: e.target.value});
                }
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              helperText="Will be converted to daily rate for calculations"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={subscriptionForm.isActive}
                  onChange={(e) => setSubscriptionForm({...subscriptionForm, isActive: e.target.checked})}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubscriptionFeeModal(false)}>Cancel</Button>
          <Button onClick={handleSubscriptionSave} variant="contained" disabled={!subscriptionForm.name.trim()}>
            {editingSubscriptionFee ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 