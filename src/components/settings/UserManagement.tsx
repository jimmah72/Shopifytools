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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  MenuItem,
  Alert,
  Stack,
  Avatar,
  Switch,
  FormControlLabel,
} from '@mui/material'
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Store as StoreIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'
import { useStore } from '@/contexts/StoreContext'
import { useAuth } from '@/contexts/AuthContext'

interface User {
  id: string
  username: string
  email?: string
  firstName?: string
  lastName?: string
  role: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  createdBy?: string
}

const roleIcons = {
  ADMIN: AdminIcon,
  SELLER: StoreIcon,
  VIEWER: ViewIcon,
}

const roleColors = {
  ADMIN: '#e91e63',
  SELLER: '#2196f3',
  VIEWER: '#4caf50',
}

export default function UserManagement() {
  const { store } = useStore()
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [open, setOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'VIEWER',
    isActive: true,
  })

  useEffect(() => {
    if (store?.id) {
      fetchUsers()
    }
  }, [store])

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const fetchUsers = async () => {
    if (!store?.id) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/users?storeId=${store.id}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        username: user.username,
        password: '', // Don't populate password for editing
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role,
        isActive: user.isActive,
      })
    } else {
      setEditingUser(null)
      setFormData({
        username: '',
        password: '',
        email: '',
        firstName: '',
        lastName: '',
        role: 'VIEWER',
        isActive: true,
      })
    }
    setOpen(true)
    setError(null)
  }

  const handleClose = () => {
    setOpen(false)
    setEditingUser(null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store?.id) return

    // Validation
    if (!formData.username.trim()) {
      setError('Username is required')
      return
    }

    if (!editingUser && !formData.password.trim()) {
      setError('Password is required for new users')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const data = {
        ...formData,
        storeId: store.id,
        createdBy: currentUser?.id,
      }

      // Remove password from data if it's empty during edit
      if (editingUser && !formData.password.trim()) {
        delete (data as any).password
      }

      const url = '/api/users'
      const method = editingUser ? 'PUT' : 'POST'
      const body = editingUser ? { ...data, id: editingUser.id } : data

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save user')
      }

      handleClose()
      fetchUsers()
      setSuccess(editingUser ? 'User updated successfully' : 'User created successfully')
    } catch (error) {
      console.error('Error saving user:', error)
      setError(error instanceof Error ? error.message : 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return

    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      fetchUsers()
      setSuccess('User deleted successfully')
    } catch (error) {
      console.error('Error deleting user:', error)
      setError('Failed to delete user')
    }
  }

  const handleToggleStatus = async (user: User) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          isActive: !user.isActive,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update user status')
      }

      fetchUsers()
      setSuccess(`User ${!user.isActive ? 'activated' : 'deactivated'} successfully`)
    } catch (error) {
      console.error('Error updating user status:', error)
      setError('Failed to update user status')
    }
  }

  const getRoleIcon = (role: string) => {
    const IconComponent = roleIcons[role as keyof typeof roleIcons] || PersonIcon
    return <IconComponent sx={{ fontSize: 16, color: roleColors[role as keyof typeof roleColors] }} />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatLastLogin = (lastLoginAt?: string) => {
    if (!lastLoginAt) return 'Never'
    return new Date(lastLoginAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Typography>Loading users...</Typography>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h6" gutterBottom>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage user accounts and their permissions
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          disabled={currentUser?.role !== 'ADMIN'}
        >
          Add User
        </Button>
      </Box>

      {/* Alerts */}
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

      {/* Users Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No users found. Create your first user to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: roleColors[user.role as keyof typeof roleColors] }}>
                          {getRoleIcon(user.role)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            @{user.username}
                          </Typography>
                          {user.email && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {user.email}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getRoleIcon(user.role)}
                        label={user.role}
                        size="small"
                        sx={{
                          bgcolor: `${roleColors[user.role as keyof typeof roleColors]}20`,
                          color: roleColors[user.role as keyof typeof roleColors],
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={user.isActive}
                            onChange={() => handleToggleStatus(user)}
                            size="small"
                            disabled={currentUser?.role !== 'ADMIN' || user.id === currentUser?.id}
                          />
                        }
                        label={user.isActive ? 'Active' : 'Inactive'}
                        sx={{ m: 0 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatLastLogin(user.lastLoginAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(user.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleOpen(user)}
                        disabled={currentUser?.role !== 'ADMIN'}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(user.id, user.username)}
                        disabled={currentUser?.role !== 'ADMIN' || user.id === currentUser?.id}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* User Form Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingUser ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                fullWidth
                disabled={!!editingUser} // Can't change username for existing users
                helperText={editingUser ? "Username cannot be changed" : ""}
              />
              
              <TextField
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
                fullWidth
                helperText={editingUser ? "Leave blank to keep current password" : ""}
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="First Name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    fullWidth
                  />
                </Grid>
              </Grid>

              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                fullWidth
              />

              <TextField
                label="Role"
                select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                fullWidth
                required
              >
                <MenuItem value="ADMIN">
                  <Box display="flex" alignItems="center" gap={1}>
                    {getRoleIcon('ADMIN')}
                    Admin - Full access to all features
                  </Box>
                </MenuItem>
                <MenuItem value="SELLER">
                  <Box display="flex" alignItems="center" gap={1}>
                    {getRoleIcon('SELLER')}
                    Seller - Can manage products and orders
                  </Box>
                </MenuItem>
                <MenuItem value="VIEWER">
                  <Box display="flex" alignItems="center" gap={1}>
                    {getRoleIcon('VIEWER')}
                    Viewer - Read-only access
                  </Box>
                </MenuItem>
              </TextField>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Account Active"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving...' : editingUser ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
} 