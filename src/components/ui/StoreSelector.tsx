'use client'

import { useState, useEffect } from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  CircularProgress,
  useTheme
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme as useAppTheme } from '@/contexts/ThemeContext';
import StoreIcon from '@mui/icons-material/Store';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

interface Store {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    products: number;
    orders: number;
  };
}

interface StoreSelectorProps {
  onStoreChange?: (storeId: string) => void;
}

export default function StoreSelector({ onStoreChange }: StoreSelectorProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const theme = useTheme();
  const { theme: appTheme } = useAppTheme();

  // Load persisted store selection on mount
  useEffect(() => {
    const savedStoreId = localStorage.getItem('selectedStoreId');
    if (savedStoreId) {
      setSelectedStoreId(savedStoreId);
    }
  }, []);

  // Fetch available stores
  useEffect(() => {
    fetchStores();
  }, [user]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      console.log('StoreSelector - Fetching stores for user:', user?.username, 'Role:', user?.role, 'StoreId:', user?.storeId);
      
      const response = await fetch('/api/stores');
      const data = await response.json();
      
      console.log('StoreSelector - API response:', data);
      
      if (data.success) {
        let availableStores = data.stores || [];
        console.log(`StoreSelector - Received ${availableStores.length} stores from API`);
        
        // Filter stores based on user role
        if (user?.role !== 'ADMIN') {
          console.log('StoreSelector - Non-admin user, filtering to user\'s store only');
          // For non-admin users, only show their assigned store
          availableStores = data.stores.filter((store: Store) => 
            store.id === user?.storeId
          );
          console.log(`StoreSelector - Filtered to ${availableStores.length} stores for non-admin user`);
        } else {
          console.log('StoreSelector - Admin user, showing all available stores');
        }
        
        setStores(availableStores);
        console.log(`StoreSelector - Set ${availableStores.length} stores in state`);
        
        // Auto-select if only one store or if no selection exists
        if (availableStores.length === 1 && !selectedStoreId) {
          const autoSelectedId = availableStores[0].id;
          console.log('StoreSelector - Auto-selecting single store:', autoSelectedId);
          setSelectedStoreId(autoSelectedId);
          localStorage.setItem('selectedStoreId', autoSelectedId);
          onStoreChange?.(autoSelectedId);
        } else if (selectedStoreId && availableStores.some((s: Store) => s.id === selectedStoreId)) {
          console.log('StoreSelector - Current selection is valid, triggering callback');
          onStoreChange?.(selectedStoreId);
        } else if (availableStores.length > 0 && !selectedStoreId) {
          console.log('StoreSelector - Multiple stores available but no selection, user needs to choose');
        }
      } else {
        console.error('StoreSelector - API returned error:', data.error);
      }
    } catch (error) {
      console.error('StoreSelector - Failed to fetch stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId);
    localStorage.setItem('selectedStoreId', storeId);
    onStoreChange?.(storeId);
    
    // Reload the page to refresh all data with new store context
    window.location.reload();
  };

  const selectedStore = stores.find(store => store.id === selectedStoreId);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading stores...
        </Typography>
      </Box>
    );
  }

  if (stores.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <StoreIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="body2" color="text.secondary">
          No stores available
        </Typography>
      </Box>
    );
  }

  if (stores.length === 1) {
    // Show store info instead of dropdown for single store
    const store = stores[0];
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <StoreIcon sx={{ fontSize: 16, color: 'primary.main' }} />
        <Typography variant="body2" color="text.primary">
          {store.name}
        </Typography>
        {user?.role === 'ADMIN' && (
          <Chip
            icon={<AdminPanelSettingsIcon />}
            label="Admin"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: '20px' }}
          />
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
      <StoreIcon sx={{ fontSize: 16, color: 'primary.main' }} />
      
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <Select
          value={selectedStoreId}
          onChange={(e) => handleStoreChange(e.target.value)}
          displayEmpty
          sx={{
            fontSize: '0.875rem',
            color: theme.palette.text.primary,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.divider,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary.main,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary.main,
            },
            '& .MuiSelect-select': {
              py: 0.5,
            },
            bgcolor: appTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
          }}
        >
          {!selectedStoreId && (
            <MenuItem value="" disabled>
              <Typography variant="body2" color="text.secondary">
                Select Store
              </Typography>
            </MenuItem>
          )}
          
          {stores.map((store) => (
            <MenuItem key={store.id} value={store.id}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 0.5 }}>
                <Typography variant="body2" color="text.primary">
                  {store.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {store.domain}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    •
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {store._count.products} products
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {user?.role === 'ADMIN' && (
        <Chip
          icon={<AdminPanelSettingsIcon />}
          label="Admin"
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontSize: '0.7rem', height: '20px' }}
        />
      )}
      
      {selectedStore && (
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
          {selectedStore._count.products} products
        </Typography>
      )}
    </Box>
  );
} 