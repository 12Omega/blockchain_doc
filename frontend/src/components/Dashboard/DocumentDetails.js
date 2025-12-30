import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Chip,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  CircularProgress,
  Button,
  Tooltip,
  IconButton,
  Collapse,
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
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import documentService from '../../services/documentService';

const DocumentDetails = ({ document }) => {
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [auditTrail, setAuditTrail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [showBlockchainDetails, setShowBlockchainDetails] = useState(false);

  useEffect(() => {
    if (document) {
      loadDocumentDetails();
    }
  }, [document]);

  const loadDocumentDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load verification status
      const verificationResponse = await fetch(
        `/api/documents/verify/${document.documentHash}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      if (verificationResponse.ok) {
        const verificationData = await verificationResponse.json();
        setVerificationStatus(verificationData.data.verification);
      }

      // Load audit trail
      const auditResponse = await fetch(
        `/api/documents/audit/${document.documentHash}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      if (auditResponse.ok) {
        const auditData = await auditResponse.json();
        setAuditTrail(auditData.data.audit);
      }

    } catch (err) {
      console.error('Error loading document details:', err);
      setError('Failed to load document details');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

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
        
        {verificationStatus && (
          <Alert 
            severity={verificationStatus.isValid ? 'success' : 'warning'}
            sx={{ mb: 2 }}
          >
            {verificationStatus.isValid 
              ? 'Document is verified and authentic'
              : 'Document verification status unclear'
            }
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
                        <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace', mr: 1 }}>
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
                
                <ListItem>
                  <ListItemIcon>
                    <DownloadIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="IPFS Hash"
                    secondary={
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace', mr: 1 }}>
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

        {/* Access Control */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Access Control
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Owner
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {document.access.owner}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Issuer
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {document.access.issuer}
                  </Typography>
                </Grid>
                {document.access.authorizedViewers && document.access.authorizedViewers.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Authorized Viewers
                    </Typography>
                    {document.access.authorizedViewers.map((viewer, index) => (
                      <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {viewer}
                      </Typography>
                    ))}
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Blockchain Details */}
        {document.blockchain && document.blockchain.transactionHash && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6">
                    Blockchain Details
                  </Typography>
                  <Button
                    onClick={() => setShowBlockchainDetails(!showBlockchainDetails)}
                    endIcon={showBlockchainDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  >
                    {showBlockchainDetails ? 'Hide' : 'Show'} Details
                  </Button>
                </Box>
                
                <Collapse in={showBlockchainDetails}>
                  <Box mt={2}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Transaction Hash
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {document.blockchain.transactionHash}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Block Number
                        </Typography>
                        <Typography variant="body2">
                          {document.blockchain.blockNumber}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Gas Used
                        </Typography>
                        <Typography variant="body2">
                          {document.blockchain.gasUsed}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Audit Trail */}
        {auditTrail && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6">
                    Audit Trail
                  </Typography>
                  <Button
                    onClick={() => setShowAuditTrail(!showAuditTrail)}
                    endIcon={showAuditTrail ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  >
                    {showAuditTrail ? 'Hide' : 'Show'} Trail
                  </Button>
                </Box>
                
                <Collapse in={showAuditTrail}>
                  <Box mt={2}>
                    <List>
                      {auditTrail.events.map((event, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={event.type.replace('_', ' ').toUpperCase()}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {formatDate(event.timestamp)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Actor: {event.actor}
                                </Typography>
                                {event.details && (
                                  <Typography variant="body2" color="text.secondary">
                                    {JSON.stringify(event.details, null, 2)}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Statistics
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">
                          Verification Count
                        </Typography>
                        <Typography variant="h6">
                          {auditTrail.statistics.verificationCount}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">
                          Age (days)
                        </Typography>
                        <Typography variant="h6">
                          {auditTrail.statistics.age}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">
                          Status
                        </Typography>
                        <Typography variant="h6">
                          {auditTrail.statistics.status}
                        </Typography>
                      </Grid>
                      {auditTrail.statistics.lastVerified && (
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            Last Verified
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(auditTrail.statistics.lastVerified)}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default DocumentDetails;