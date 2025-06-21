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
  Divider,
  InputAdornment,
  Stack,
} from '@mui/material';
import { useStore } from '@/contexts/StoreContext';

interface FeeConfig {
  id: string;
  storeId: string;
  paymentGatewayRate: number;
  processingFeePerOrder: number;
  defaultCogRate: number;
  overheadCostRate: number;
  overheadCostPerOrder: number;
  overheadCostPerItem: number;
  miscCostRate: number;
  miscCostPerOrder: number;
  miscCostPerItem: number;
  chargebackRate: number;
  returnRate: number;
}

export default function FeeConfiguration() {
  const { store } = useStore();
  const [config, setConfig] = useState<FeeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Local state for input values to preserve user typing
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (store?.id) {
      fetchConfig();
    }
  }, [store]);

  // Initialize input values when config loads
  useEffect(() => {
    if (config) {
      setInputValues({
        paymentGatewayRate: formatPercentage(config.paymentGatewayRate),
        processingFeePerOrder: config.processingFeePerOrder.toFixed(2),
        defaultCogRate: formatPercentage(config.defaultCogRate),
        overheadCostRate: formatPercentage(config.overheadCostRate),
        overheadCostPerOrder: config.overheadCostPerOrder.toFixed(2),
        overheadCostPerItem: config.overheadCostPerItem.toFixed(2),
        miscCostRate: formatPercentage(config.miscCostRate),
        miscCostPerOrder: config.miscCostPerOrder.toFixed(2),
        miscCostPerItem: config.miscCostPerItem.toFixed(2),
        chargebackRate: formatPercentage(config.chargebackRate),
        returnRate: formatPercentage(config.returnRate),
      });
    }
  }, [config]);

  const fetchConfig = async () => {
    if (!store?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/fee-configuration?storeId=${store.id}`);
      if (!response.ok) throw new Error('Failed to fetch configuration');
      
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching fee configuration:', error);
      setMessage({ type: 'error', text: 'Failed to load fee configuration' });
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
      setMessage({ type: 'success', text: 'Fee configuration saved successfully!' });
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

  const handleReset = async () => {
    if (!store?.id) return;

    try {
      setSaving(true);
      const response = await fetch('/api/fee-configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: store.id }),
      });

      if (!response.ok) throw new Error('Failed to reset configuration');

      const resetConfig = await response.json();
      setConfig(resetConfig);
      setMessage({ type: 'success', text: 'Fee configuration reset to defaults!' });
    } catch (error) {
      console.error('Error resetting fee configuration:', error);
      setMessage({ type: 'error', text: 'Failed to reset configuration' });
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
    // Remove unnecessary trailing zeros after decimal point
    return percentage % 1 === 0 ? percentage.toString() : percentage.toFixed(2).replace(/\.?0+$/, '');
  };
  
  const parsePercentage = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num / 100;
  };

  if (loading) {
    return <Typography>Loading fee configuration...</Typography>;
  }

  if (!config) {
    return <Alert severity="error">Failed to load fee configuration</Alert>;
  }

  return (
    <Box>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Fee Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure the rates and fees used in dashboard calculations. These settings affect how 
            profits, margins, and financial metrics are calculated.
          </Typography>
        </Box>

        {message && (
          <Alert 
            severity={message.type} 
            onClose={() => setMessage(null)}
            sx={{ mb: 2 }}
          >
            {message.text}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Payment Processing Fees */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Payment Processing Fees
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
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
                      helperText="Typical: 2.9% (Stripe, PayPal standard rate)"
                      inputProps={{ step: '0.01', min: '0', max: '100' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
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
                      helperText="Flat fee per transaction (typical: $0.30)"
                      inputProps={{ step: '0.01', min: '0' }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Cost of Goods */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Cost of Goods Sold
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
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
                      helperText="Used when product-specific costs aren't available"
                      inputProps={{ step: '1', min: '0', max: '100' }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Additional Costs */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Overhead Costs
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Configure overhead costs using percentage of revenue, fixed amount per order, or fixed amount per item.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Overhead Rate (% of Revenue)"
                      type="number"
                      fullWidth
                      value={inputValues.overheadCostRate || ''}
                      onChange={(e) => {
                        setInputValues({ ...inputValues, overheadCostRate: e.target.value });
                      }}
                      onBlur={(e) => {
                        const value = parsePercentage(e.target.value);
                        updateConfig('overheadCostRate', value);
                        setInputValues({ ...inputValues, overheadCostRate: formatPercentage(value) });
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      helperText="Percentage of total revenue"
                      inputProps={{ step: '0.1', min: '0', max: '100' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Overhead Per Order"
                      type="number"
                      fullWidth
                      value={inputValues.overheadCostPerOrder || ''}
                      onChange={(e) => {
                        setInputValues({ ...inputValues, overheadCostPerOrder: e.target.value });
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateConfig('overheadCostPerOrder', value);
                        setInputValues({ ...inputValues, overheadCostPerOrder: value.toFixed(2) });
                      }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      helperText="Fixed overhead cost per order"
                      inputProps={{ step: '0.01', min: '0' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Overhead Per Item"
                      type="number"
                      fullWidth
                      value={inputValues.overheadCostPerItem || ''}
                      onChange={(e) => {
                        setInputValues({ ...inputValues, overheadCostPerItem: e.target.value });
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateConfig('overheadCostPerItem', value);
                        setInputValues({ ...inputValues, overheadCostPerItem: value.toFixed(2) });
                      }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      helperText="Fixed overhead cost per item sold"
                      inputProps={{ step: '0.01', min: '0' }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Miscellaneous Costs */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Miscellaneous Costs
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Configure miscellaneous costs using percentage of revenue, fixed amount per order, or fixed amount per item.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Misc Rate (% of Revenue)"
                      type="number"
                      fullWidth
                      value={inputValues.miscCostRate || ''}
                      onChange={(e) => {
                        setInputValues({ ...inputValues, miscCostRate: e.target.value });
                      }}
                      onBlur={(e) => {
                        const value = parsePercentage(e.target.value);
                        updateConfig('miscCostRate', value);
                        setInputValues({ ...inputValues, miscCostRate: formatPercentage(value) });
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      helperText="Percentage of total revenue"
                      inputProps={{ step: '0.1', min: '0', max: '100' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Misc Cost Per Order"
                      type="number"
                      fullWidth
                      value={inputValues.miscCostPerOrder || ''}
                      onChange={(e) => {
                        setInputValues({ ...inputValues, miscCostPerOrder: e.target.value });
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateConfig('miscCostPerOrder', value);
                        setInputValues({ ...inputValues, miscCostPerOrder: value.toFixed(2) });
                      }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      helperText="Fixed misc cost per order"
                      inputProps={{ step: '0.01', min: '0' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Misc Cost Per Item"
                      type="number"
                      fullWidth
                      value={inputValues.miscCostPerItem || ''}
                      onChange={(e) => {
                        setInputValues({ ...inputValues, miscCostPerItem: e.target.value });
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateConfig('miscCostPerItem', value);
                        setInputValues({ ...inputValues, miscCostPerItem: value.toFixed(2) });
                      }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      helperText="Fixed misc cost per item sold"
                      inputProps={{ step: '0.01', min: '0' }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Risk and Return Rates */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Risk and Return Rates
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
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
                      helperText="Expected chargeback rate (typical: 0.1%)"
                      inputProps={{ step: '0.01', min: '0', max: '10' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
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
                      helperText="Expected product return rate (typical: 5%)"
                      inputProps={{ step: '0.1', min: '0', max: '100' }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider />

        <Box display="flex" gap={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={handleReset}
            disabled={saving}
          >
            Reset to Defaults
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Box>

        <Alert severity="info">
          <Typography variant="body2">
            <strong>Note:</strong> These settings only affect dashboard calculations and estimates. 
            They do not change your actual payment processor rates or modify any external fees.
            Changes will be reflected in your dashboard metrics after saving.
          </Typography>
        </Alert>
      </Stack>
    </Box>
  );
} 