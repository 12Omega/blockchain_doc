import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  AccountBalance as AccountBalanceIcon,
  Description as DescriptionIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  CalendarToday as CalendarTodayIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';

const VerificationResult = ({ result }) => {
  const {
    isValid,
    documentHash,
    timestamp,
    verifier,
    document,
    blockchain,
    fileIntegrity,
    verificationId
  } = result;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusColor = (status) => {
    return status ? 'success' : 'error';
  };

  const getStatusIcon = (status) => {
    return status ? <CheckCircleIcon /> : <CancelIcon />;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Verification Result
      </Typography>

      {/* Overall Status */}
      <Alert 
        severity={isValid ? 'success' : 'error'} 
        icon={getStatusIcon(isValid)}
        sx={{ mb: 3, fontSize: '1.1rem' }}
      >
        <Typography variant="h6" component="div">
          {isValid ? 'Document is AUTHENTIC' : 'Document verification FAILED'}
        </Typography>
        <Typography variant="body2">
          {isValid 
            ? 'This document has been verified as authentic and has not been tampered with.'
            : 'This document could not be verified or may have been tampered with.'
          }
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Verification Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Verification Summary
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <VerifiedIcon color={getStatusColor(isValid)} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Overall Status"
                    secondary={
                      <Chip
                        label={isValid ? 'VALID' : 'INVALID'}
                        color={getStatusColor(isValid)}
                        size="small"
                      />
                    }
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <CalendarTodayIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Verification Time"
                    secondary={formatDate(timestamp)}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Verified By"
                    secondary={formatAddress(verifier)}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Verification ID"
                    secondary={verificationId}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Technical Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Technical Details
              </Typography>

              <List dense>
                {blockchain && (
                  <ListItem>
                    <ListItemIcon>
                      <AccountBalanceIcon color={getStatusColor(blockchain.isValid)} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Blockchain Status"
                      secondary={
                        <Chip
                          label={blockchain.isValid ? 'VERIFIED' : 'NOT FOUND'}
                          color={getStatusColor(blockchain.isValid)}
                          size="small"
                        />
                      }
                    />
                  </ListItem>
                )}

                {fileIntegrity && (
                  <ListItem>
                    <ListItemIcon>
                      <DescriptionIcon color={getStatusColor(fileIntegrity.isValid)} />
                    </ListItemIcon>
                    <ListItemText
                      primary="File Integrity"
                      secondary={
                        <Chip
                          label={fileIntegrity.hashesMatch ? 'INTACT' : 'MODIFIED'}
                          color={getStatusColor(fileIntegrity.isValid)}
                          size="small"
                        />
                      }
                    />
                  </ListItem>
                )}

                <ListItem>
                  <ListItemText
                    primary="Document Hash"
                    secondary={
                      <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                        {documentHash}
                      </Typography>
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Document Information */}
        {document && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <DescriptionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Document Information
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Student Name
                    </Typography>
                    <Typography variant="body1">
                      {document.metadata?.studentName || 'N/A'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Student ID
                    </Typography>
                    <Typography variant="body1">
                      {document.metadata?.studentId || 'N/A'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Institution
                    </Typography>
                    <Typography variant="body1">
                      {document.metadata?.institutionName || 'N/A'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Document Type
                    </Typography>
                    <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                      {document.metadata?.documentType || 'N/A'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Issue Date
                    </Typography>
                    <Typography variant="body1">
                      {document.metadata?.issueDate 
                        ? new Date(document.metadata.issueDate).toLocaleDateString()
                        : 'N/A'
                      }
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Issued By
                    </Typography>
                    <Typography variant="body1">
                      {formatAddress(document.issuer)}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Document Owner
                    </Typography>
                    <Typography variant="body1">
                      {formatAddress(document.owner)}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Verification Count
                    </Typography>
                    <Typography variant="body1">
                      {document.verificationCount || 0} times
                    </Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Document Created
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(document.createdAt)}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      label={document.status?.toUpperCase() || 'UNKNOWN'}
                      color={document.status === 'blockchain_stored' ? 'success' : 'default'}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Blockchain Details */}
        {blockchain && blockchain.transactionHash && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <AccountBalanceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Blockchain Details
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Transaction Hash
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {blockchain.transactionHash}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Block Number
                    </Typography>
                    <Typography variant="body1">
                      {blockchain.blockNumber || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Additional Information */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          This verification result is cryptographically secured and can be independently verified 
          on the blockchain. The verification ID can be used for audit purposes.
        </Typography>
      </Alert>
    </Box>
  );
};

export default VerificationResult;