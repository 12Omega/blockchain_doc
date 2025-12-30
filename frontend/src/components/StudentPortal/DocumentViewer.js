import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Tooltip,
  IconButton,
  Divider,
  Alert,
} from '@mui/material';
import {
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Description as DocumentIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  DateRange as DateIcon,
  Security as SecurityIcon,
  CloudDownload as DownloadIcon,
  Link as LinkIcon,
  QrCode as QrCodeIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';

const DocumentViewer = ({ document, onDownload }) => {
  const [showQR, setShowQR] = useState(false);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'blockchain_stored':
        return <VerifiedIcon color="success" />;
      case 'uploaded':
        return <WarningIcon color="warning" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      default:
        return <DocumentIcon color="action" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'blockchain_stored':
        return 'success';
      case 'uploaded':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const generateVerificationUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/verify?hash=${document.documentHash}`;
  };

  const openBlockchainExplorer = () => {
    if (document.blockchain?.transactionHash) {
      const explorerUrl = document.blockchain.explorerUrl || 
        `https://sepolia.etherscan.io/tx/${document.blockchain.transactionHash}`;
      window.open(explorerUrl, '_blank');
    }
  };

  return (
    <Box>
      {/* Document Header */}
      <Box mb={3}>
        <Box display="flex" alignItems="center" mb={2}>
          {getStatusIcon(document.status)}
          <Typography variant="h5" component="h2" ml={1}>
            {document.metadata.documentType.charAt(0).toUpperCase() + 
             document.metadata.documentType.slice(1)}
          </Typography>
          <Box ml={2}>
            <Chip
              label={document.status.replace('_', ' ').toUpperCase()}
              color={getStatusColor(document.status)}
              size="small"
            />
          </Box>
        </Box>
        
        {document.status === 'blockchain_stored' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            This document is verified and stored on the blockchain
          </Alert>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Document Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Document Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Student Name"
                    secondary={document.metadata.studentName}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Student ID"
                    secondary={document.metadata.studentId}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <SchoolIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Institution"
                    secondary={document.metadata.institutionName}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <DateIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Issue Date"
                    secondary={formatDate(document.metadata.issueDate)}
                  />
                </ListItem>
                
                {document.metadata.expiryDate && (
                  <ListItem>
                    <ListItemIcon>
                      <DateIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Expiry Date"
                      secondary={formatDate(document.metadata.expiryDate)}
                    />
                  </ListItem>
                )}
                
                {document.metadata.course && (
                  <ListItem>
                    <ListItemIcon>
                      <SchoolIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Course"
                      secondary={document.metadata.course}
                    />
                  </ListItem>
                )}
                
                {document.metadata.grade && (
                  <ListItem>
                    <ListItemIcon>
                      <SchoolIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Grade"
                      secondary={document.metadata.grade}
                    />
                  </ListItem>
                )}

                {document.metadata.description && (
                  <ListItem>
                    <ListItemIcon>
                      <DocumentIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Description"
                      secondary={document.metadata.description}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Technical Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Technical Details
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Document Hash"
                    secondary={
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace', mr: 1, wordBreak: 'break-all' }}>
                          {document.documentHash.substring(0, 20)}...
                        </Typography>
                        <Tooltip title="Copy to clipboard">
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(document.documentHash)}
                          >
                            <LinkIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  />
                </ListItem>
                
                {document.ipfsHash && (
                  <ListItem>
                    <ListItemIcon>
                      <CloudDownload />
                    </ListItemIcon>
                    <ListItemText
                      primary="IPFS Hash"
                      secondary={
                        <Box display="flex" alignItems="center">
                          <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace', mr: 1, wordBreak: 'break-all' }}>
                            {document.ipfsHash.substring(0, 20)}...
                          </Typography>
                          <Tooltip title="Copy to clipboard">
                            <IconButton
                              size="small"
                              onClick={() => copyToClipboard(document.ipfsHash)}
                            >
                              <LinkIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                    />
                  </ListItem>
                )}
                
                <ListItem>
                  <ListItemIcon>
                    <DocumentIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="File Name"
                    secondary={document.fileInfo.originalName}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <DocumentIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="File Size"
                    secondary={formatFileSize(document.fileInfo.size)}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <DateIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Created"
                    secondary={formatDate(document.audit.createdAt)}
                  />
                </ListItem>
                
                {document.audit.verificationCount > 0 && (
                  <ListItem>
                    <ListItemIcon>
                      <VerifiedIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Verification Count"
                      secondary={`${document.audit.verificationCount} times`}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Blockchain Details */}
        {document.blockchain && document.blockchain.transactionHash && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Blockchain Verification
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Transaction Hash
                    </Typography>
                    <Box display="flex" alignItems="center">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', mr: 1 }}>
                        {document.blockchain.transactionHash}
                      </Typography>
                      <Tooltip title="View on blockchain explorer">
                        <IconButton
                          size="small"
                          onClick={openBlockchainExplorer}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Block Number
                    </Typography>
                    <Typography variant="body2">
                      {document.blockchain.blockNumber}
                    </Typography>
                  </Grid>
                  {document.blockchain.gasUsed && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Gas Used
                      </Typography>
                      <Typography variant="body2">
                        {document.blockchain.gasUsed}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                {document.status === 'blockchain_stored' && onDownload && (
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => onDownload(document)}
                  >
                    Download Document
                  </Button>
                )}
                
                <Button
                  variant="outlined"
                  startIcon={<QrCodeIcon />}
                  onClick={() => setShowQR(!showQR)}
                >
                  {showQR ? 'Hide' : 'Show'} QR Code
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<LinkIcon />}
                  onClick={() => copyToClipboard(generateVerificationUrl())}
                >
                  Copy Verification Link
                </Button>
              </Box>

              {/* QR Code Display */}
              {showQR && (
                <Box mt={3} textAlign="center">
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Verification QR Code
                  </Typography>
                  <Box display="flex" justifyContent="center" my={2}>
                    <QRCodeSVG
                      value={generateVerificationUrl()}
                      size={200}
                      level="M"
                      includeMargin={true}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Scan this QR code to verify the document
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DocumentViewer;
