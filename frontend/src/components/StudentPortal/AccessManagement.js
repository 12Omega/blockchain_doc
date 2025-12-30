import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Visibility as ViewIcon,
  SwapHoriz as TransferIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import documentService from '../../services/documentService';

const AccessManagement = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [newViewerAddress, setNewViewerAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferAddress, setTransferAddress] = useState('');

  useEffect(() => {
    loadOwnedDocuments();
  }, []);

  const loadOwnedDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await documentService.getUserDocuments({
        page: 1,
        limit: 100,
      });
      
      if (response.success) {
        // Filter to only show documents where user is the owner
        const ownedDocs = response.data.documents.filter(
          doc => doc.access.owner === user.walletAddress
        );
        setDocuments(ownedDocs);
        if (ownedDocs.length > 0 && !selectedDocument) {
          setSelectedDocument(ownedDocs[0]);
        }
      } else {
        throw new Error(response.error || 'Failed to load documents');
      }
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!newViewerAddress.trim()) {
      setError('Please enter a valid wallet address');
      return;
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(newViewerAddress)) {
      setError('Invalid Ethereum address format');
      return;
    }

    if (!selectedDocument) {
      setError('Please select a document');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch(
        `/api/documents/${selectedDocument.documentHash}/access/grant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({
            userAddress: newViewerAddress,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Access granted successfully');
        setNewViewerAddress('');
        await loadOwnedDocuments();
      } else {
        throw new Error(data.error || 'Failed to grant access');
      }
    } catch (err) {
      console.error('Error granting access:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAccess = async (viewerAddress) => {
    if (!selectedDocument) {
      setError('Please select a document');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch(
        `/api/documents/${selectedDocument.documentHash}/access/revoke`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({
            userAddress: viewerAddress,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Access revoked successfully');
        await loadOwnedDocuments();
      } else {
        throw new Error(data.error || 'Failed to revoke access');
      }
    } catch (err) {
      console.error('Error revoking access:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferAddress.trim()) {
      setError('Please enter a valid wallet address');
      return;
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(transferAddress)) {
      setError('Invalid Ethereum address format');
      return;
    }

    if (!selectedDocument) {
      setError('Please select a document');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch(
        `/api/documents/${selectedDocument.documentHash}/transfer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({
            newOwner: transferAddress,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Ownership transferred successfully');
        setTransferAddress('');
        setTransferDialogOpen(false);
        await loadOwnedDocuments();
      } else {
        throw new Error(data.error || 'Failed to transfer ownership');
      }
    } catch (err) {
      console.error('Error transferring ownership:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (documents.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <SecurityIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No documents to manage
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You don't own any documents yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Error and Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Document Selection */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Document
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Document</InputLabel>
                <Select
                  value={selectedDocument?._id || ''}
                  label="Document"
                  onChange={(e) => {
                    const doc = documents.find(d => d._id === e.target.value);
                    setSelectedDocument(doc);
                  }}
                >
                  {documents.map((doc) => (
                    <MenuItem key={doc._id} value={doc._id}>
                      {doc.metadata.documentType.charAt(0).toUpperCase() + 
                       doc.metadata.documentType.slice(1)} - {doc.metadata.studentName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedDocument && (
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Student ID:</strong> {selectedDocument.metadata.studentId}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Institution:</strong> {selectedDocument.metadata.institutionName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Status:</strong>{' '}
                    <Chip
                      label={selectedDocument.status.replace('_', ' ').toUpperCase()}
                      size="small"
                      color={selectedDocument.status === 'blockchain_stored' ? 'success' : 'default'}
                    />
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Access Management */}
        <Grid item xs={12} md={8}>
          {selectedDocument && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Access Management
                </Typography>

                {/* Grant Access Section */}
                <Box mb={3}>
                  <Typography variant="subtitle1" gutterBottom>
                    Grant Access to Wallet
                  </Typography>
                  <Box display="flex" gap={2} alignItems="flex-end">
                    <TextField
                      fullWidth
                      label="Wallet Address"
                      placeholder="0x..."
                      value={newViewerAddress}
                      onChange={(e) => setNewViewerAddress(e.target.value)}
                      error={!!error && error.includes('address')}
                      helperText="Enter a valid Ethereum wallet address"
                    />
                    <Button
                      variant="contained"
                      onClick={handleGrantAccess}
                      disabled={actionLoading || !newViewerAddress.trim()}
                      startIcon={actionLoading ? <CircularProgress size={20} /> : <AddIcon />}
                    >
                      Grant
                    </Button>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Current Access List */}
                <Typography variant="subtitle1" gutterBottom>
                  Current Access
                </Typography>
                
                <List dense>
                  {/* Owner */}
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <PersonIcon fontSize="small" />
                          <Typography variant="body2">
                            {formatAddress(selectedDocument.access.owner)}
                          </Typography>
                          <Chip label="Owner (You)" color="primary" size="small" />
                        </Box>
                      }
                      secondary="Full access to document"
                    />
                  </ListItem>
                  
                  {/* Issuer (if different from owner) */}
                  {selectedDocument.access.issuer !== selectedDocument.access.owner && (
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <PersonIcon fontSize="small" />
                            <Typography variant="body2">
                              {formatAddress(selectedDocument.access.issuer)}
                            </Typography>
                            <Chip label="Issuer" color="secondary" size="small" />
                          </Box>
                        }
                        secondary="Document issuer with full access"
                      />
                    </ListItem>
                  )}
                  
                  {/* Authorized Viewers */}
                  {selectedDocument.access.authorizedViewers && 
                   selectedDocument.access.authorizedViewers.length > 0 ? (
                    selectedDocument.access.authorizedViewers.map((viewer, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <ViewIcon fontSize="small" />
                              <Typography variant="body2">
                                {formatAddress(viewer)}
                              </Typography>
                              <Chip label="Viewer" color="default" size="small" />
                            </Box>
                          }
                          secondary="View and verify access"
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Revoke access">
                            <IconButton
                              edge="end"
                              onClick={() => handleRevokeAccess(viewer)}
                              disabled={actionLoading}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText
                        secondary="No additional viewers have been granted access"
                      />
                    </ListItem>
                  )}
                </List>

                <Divider sx={{ my: 2 }} />

                {/* Transfer Ownership */}
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Transfer Ownership
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Transfer ownership of this document to another wallet address. This action cannot be undone.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<TransferIcon />}
                    onClick={() => setTransferDialogOpen(true)}
                    disabled={actionLoading}
                  >
                    Transfer Ownership
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Transfer Ownership Dialog */}
      <Dialog
        open={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Transfer Document Ownership</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Warning: This action cannot be undone. You will lose ownership of this document.
          </Alert>
          
          {selectedDocument && (
            <Box mb={2}>
              <Typography variant="body2" gutterBottom>
                <strong>Document:</strong> {selectedDocument.metadata.documentType} - {selectedDocument.metadata.studentName}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Current Owner:</strong> {formatAddress(selectedDocument.access.owner)}
              </Typography>
            </Box>
          )}

          <TextField
            fullWidth
            label="New Owner Wallet Address"
            placeholder="0x..."
            value={transferAddress}
            onChange={(e) => setTransferAddress(e.target.value)}
            helperText="Enter the Ethereum wallet address of the new owner"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleTransferOwnership}
            color="warning"
            variant="contained"
            disabled={actionLoading || !transferAddress.trim()}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <TransferIcon />}
          >
            Transfer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccessManagement;
