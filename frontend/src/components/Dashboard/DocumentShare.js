import React, { useState } from 'react';
import {
  Box,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Share as ShareIcon,
  QrCode as QrCodeIcon,
  Link as LinkIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';

const DocumentShare = ({ document, onClose }) => {
  const [newViewerAddress, setNewViewerAddress] = useState('');
  const [accessLevel, setAccessLevel] = useState('view');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [shareableLink, setShareableLink] = useState('');

  const handleAddViewer = async () => {
    if (!newViewerAddress.trim()) {
      setError('Please enter a valid wallet address');
      return;
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(newViewerAddress)) {
      setError('Invalid Ethereum address format');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/documents/${document.documentHash}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          viewerAddress: newViewerAddress,
          accessLevel: accessLevel,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Access granted successfully');
        setNewViewerAddress('');
        // Refresh document data would happen here in a real implementation
      } else {
        throw new Error(data.error || 'Failed to grant access');
      }
    } catch (err) {
      console.error('Error granting access:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveViewer = async (viewerAddress) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/documents/${document.documentHash}/share`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          viewerAddress: viewerAddress,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Access revoked successfully');
        // Refresh document data would happen here in a real implementation
      } else {
        throw new Error(data.error || 'Failed to revoke access');
      }
    } catch (err) {
      console.error('Error revoking access:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateShareableLink = () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/verify?hash=${document.documentHash}`;
    setShareableLink(link);
    return link;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
  };

  const handleGenerateQR = () => {
    const link = generateShareableLink();
    setQrDialogOpen(true);
  };

  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <Box>
      {/* Error and Success Messages */}
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

      {/* Document Info */}
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          Share: {document.metadata.documentType.charAt(0).toUpperCase() + 
                  document.metadata.documentType.slice(1)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {document.metadata.studentName} - {document.metadata.institutionName}
        </Typography>
      </Box>

      {/* Quick Share Options */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom>
          Quick Share
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={() => copyToClipboard(generateShareableLink())}
          >
            Copy Link
          </Button>
          <Button
            variant="outlined"
            startIcon={<QrCodeIcon />}
            onClick={handleGenerateQR}
          >
            QR Code
          </Button>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Add New Viewer */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom>
          Grant Access to Wallet
        </Typography>
        <Box display="flex" gap={2} alignItems="flex-end" mb={2}>
          <TextField
            fullWidth
            label="Wallet Address"
            placeholder="0x..."
            value={newViewerAddress}
            onChange={(e) => setNewViewerAddress(e.target.value)}
            error={!!error && error.includes('address')}
            helperText="Enter a valid Ethereum wallet address"
          />
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Access Level</InputLabel>
            <Select
              value={accessLevel}
              label="Access Level"
              onChange={(e) => setAccessLevel(e.target.value)}
            >
              <MenuItem value="view">View Only</MenuItem>
              <MenuItem value="download">View & Download</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={handleAddViewer}
            disabled={loading || !newViewerAddress.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
          >
            Grant
          </Button>
        </Box>
      </Box>

      {/* Current Access List */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom>
          Current Access
        </Typography>
        
        {/* Owner */}
        <List dense>
          <ListItem>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">
                    {formatAddress(document.access.owner)}
                  </Typography>
                  <Chip label="Owner" color="primary" size="small" />
                </Box>
              }
              secondary="Full access to document"
            />
          </ListItem>
          
          {/* Issuer (if different from owner) */}
          {document.access.issuer !== document.access.owner && (
            <ListItem>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2">
                      {formatAddress(document.access.issuer)}
                    </Typography>
                    <Chip label="Issuer" color="secondary" size="small" />
                  </Box>
                }
                secondary="Document issuer with full access"
              />
            </ListItem>
          )}
          
          {/* Authorized Viewers */}
          {document.access.authorizedViewers && document.access.authorizedViewers.map((viewer, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2">
                      {formatAddress(viewer)}
                    </Typography>
                    <Chip label="Viewer" color="default" size="small" />
                  </Box>
                }
                secondary="View and verify access"
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => handleRemoveViewer(viewer)}
                  disabled={loading}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>

        {(!document.access.authorizedViewers || document.access.authorizedViewers.length === 0) && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No additional viewers have been granted access
          </Typography>
        )}
      </Box>

      {/* Share Instructions */}
      <Box mb={2}>
        <Typography variant="subtitle2" gutterBottom>
          Sharing Instructions
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • <strong>Link Sharing:</strong> Anyone with the link can verify the document's authenticity
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • <strong>Wallet Access:</strong> Specific wallet addresses can view document details and metadata
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • <strong>QR Code:</strong> Generate a QR code for easy mobile verification
        </Typography>
      </Box>

      {/* QR Code Dialog */}
      <Dialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <QrCodeIcon />
            Document Verification QR Code
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
            {shareableLink && (
              <>
                <QRCodeSVG
                  value={shareableLink}
                  size={256}
                  level="M"
                  includeMargin={true}
                />
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Scan this QR code to verify the document
                </Typography>
                <Box display="flex" alignItems="center" gap={1} width="100%">
                  <TextField
                    fullWidth
                    label="Shareable Link"
                    value={shareableLink}
                    InputProps={{
                      readOnly: true,
                      style: { fontSize: '0.875rem' }
                    }}
                  />
                  <IconButton
                    onClick={() => copyToClipboard(shareableLink)}
                    title="Copy link"
                  >
                    <CopyIcon />
                  </IconButton>
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentShare;