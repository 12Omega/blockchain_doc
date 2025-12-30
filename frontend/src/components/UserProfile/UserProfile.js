import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Chip,
  Avatar,
  Grid,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Person,
  Edit,
  Save,
  Cancel,
  AccountBalanceWallet,
} from '@mui/icons-material';
import authService from '../../services/authService';

const UserProfile = ({ user: initialUser, onProfileUpdate }) => {
  const [user, setUser] = useState(initialUser);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    institution: '',
    department: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.profile?.name || '',
        email: user.profile?.email || '',
        institution: user.profile?.institution || '',
        department: user.profile?.department || '',
      });
    }
  }, [user]);

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: user.profile?.name || '',
      email: user.profile?.email || '',
      institution: user.profile?.institution || '',
      department: user.profile?.department || '',
    });
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedUser = await authService.updateUserProfile({
        profile: formData,
      });

      setUser(updatedUser);
      setIsEditing(false);
      setSuccess('Profile updated successfully');
      onProfileUpdate?.(updatedUser);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'error';
      case 'issuer':
        return 'primary';
      case 'verifier':
        return 'secondary';
      case 'student':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPermissionsList = (permissions) => {
    if (!permissions) return [];
    
    const permissionList = [];
    if (permissions.canIssue) permissionList.push('Issue Documents');
    if (permissions.canVerify) permissionList.push('Verify Documents');
    if (permissions.canTransfer) permissionList.push('Transfer Documents');
    
    return permissionList;
  };

  if (!user) {
    return (
      <Card sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
        <CardContent>
          <Typography variant="h6" color="text.secondary" textAlign="center">
            No user profile available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center">
            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
              <Person />
            </Avatar>
            <Typography variant="h5">User Profile</Typography>
          </Box>
          {!isEditing && (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleEdit}
            >
              Edit Profile
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Wallet Information */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" mb={2}>
              <AccountBalanceWallet sx={{ mr: 1 }} />
              <Typography variant="h6">Wallet Information</Typography>
            </Box>
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                Wallet Address:
              </Typography>
              <Typography variant="body1" fontFamily="monospace">
                {user.walletAddress}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatAddress(user.walletAddress)}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Typography variant="body2" color="text.secondary">
                Role:
              </Typography>
              <Chip
                label={user.role}
                color={getRoleColor(user.role)}
                size="small"
              />
            </Box>
            {user.permissions && getPermissionsList(user.permissions).length > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Permissions:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {getPermissionsList(user.permissions).map((permission, index) => (
                    <Chip
                      key={index}
                      label={permission}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Profile Information */}
          <Grid item xs={12}>
            <Typography variant="h6" mb={2}>Profile Information</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Full Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              disabled={!isEditing}
              variant={isEditing ? 'outlined' : 'filled'}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              disabled={!isEditing}
              variant={isEditing ? 'outlined' : 'filled'}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Institution"
              value={formData.institution}
              onChange={handleInputChange('institution')}
              disabled={!isEditing}
              variant={isEditing ? 'outlined' : 'filled'}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Department"
              value={formData.department}
              onChange={handleInputChange('department')}
              disabled={!isEditing}
              variant={isEditing ? 'outlined' : 'filled'}
            />
          </Grid>

          {/* Session Information */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" mb={2}>Session Information</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Last Login:
            </Typography>
            <Typography variant="body1">
              {user.session?.lastLogin
                ? new Date(user.session.lastLogin).toLocaleString()
                : 'N/A'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Status:
            </Typography>
            <Chip
              label={user.session?.isActive ? 'Active' : 'Inactive'}
              color={user.session?.isActive ? 'success' : 'default'}
              size="small"
            />
          </Grid>

          {/* Action Buttons */}
          {isEditing && (
            <Grid item xs={12}>
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  startIcon={<Cancel />}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <Save />}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default UserProfile;