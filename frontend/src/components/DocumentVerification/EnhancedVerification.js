import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  QrCode,
  CloudUpload,
  Search,
  CheckCircle,
  Cancel,
  Info,
  Verified,
  Warning,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { useDropzone } from 'react-dropzone';
import documentService from '../../services/documentService';

const EnhancedVerification = () => {
  const [tabValue, setTabValue] = useState(0);
  const [documentHash, setDocumentHash] = useState('');
  const [qrData, setQrData] = useState('');
  const [file, setFile] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleVerifyHash = async () => {
    if (!documentHash) {
      setError('Please enter a document hash');
      return;
    }

    setVerifying(true);
    setError(null);
    setResult(null);

    try {
      const response = await documentService.verifyDocument(documentHash);
      setResult(response);
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyFile = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setVerifying(true);
    setError(null);
    setResult(null);

    try {
      const response = await documentService.verifyDocument(file);
      setResult(response);
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyQR = async () => {
    if (!qrData) {
      setError('Please scan a QR code or enter data');
      return;
    }

    setVerifying(true);
    setError(null);
    setResult(null);

    try {
      // Extract hash from QR data (could be URL or direct hash)
      const hash = qrData.includes('verify/') 
        ? qrData.split('verify/')[1] 
        : qrData;
      
      const response = await documentService.verifyDocument(hash);
      setResult(response);
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const renderVerificationResult = () => {
    if (!result) return null;

    const isValid = result.isValid || result.verified;
    const document = result.document || result.data;

    return (
      <Card sx={{ mt: 3 }} elevation={3}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            {isValid ? (
              <>
                <CheckCircle sx={{ fontSize: 48, color: 'success.main' }} />
                <Box>
                  <Typography variant="h5" color="success.main">
                    Document Verified
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This document is authentic and registered on the blockchain
                  </Typography>
                </Box>
              </>
            ) : (
              <>
                <Cancel sx={{ fontSize: 48, color: 'error.main' }} />
                <Box>
                  <Typography variant="h5" color="error.main">
                    Verification Failed
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This document could not be verified or has been tampered with
                  </Typography>
                </Box>
              </>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {isValid && document && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Document Title
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {document.metadata?.title || 'N/A'}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Document Type
                </Typography>
                <Chip 
                  label={document.documentType || 'Unknown'} 
                  size="small" 
                  color="primary"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Issuer
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {document.metadata?.issuer || document.issuer || 'N/A'}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Issue Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {document.metadata?.issueDate 
                    ? new Date(document.metadata.issueDate).toLocaleDateString()
                    : 'N/A'}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Recipient
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {document.recipientAddress 
                    ? `${document.recipientAddress.slice(0, 6)}...${document.recipientAddress.slice(-4)}`
                    : 'N/A'}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Registration Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {document.createdAt 
                    ? new Date(document.createdAt).toLocaleString()
                    : 'N/A'}
                </Typography>
              </Grid>

              {document.documentHash && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Document Hash
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      wordBreak: 'break-all',
                      bgcolor: 'grey.100',
                      p: 1,
                      borderRadius: 1,
                    }}
                  >
                    {document.documentHash}
                  </Typography>
                </Grid>
              )}

              {document.transactionHash && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Blockchain Transaction
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                      bgcolor: 'grey.100',
                      p: 1,
                      borderRadius: 1,
                    }}
                  >
                    {document.transactionHash}
                  </Typography>
                </Grid>
              )}

              {document.description && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {document.metadata?.description || document.description}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}

          {!isValid && result.message && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {result.message}
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Verified /> Verify Document
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Verify the authenticity of documents registered on the blockchain
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
          <Tab icon={<Search />} label="By Hash" />
          <Tab icon={<CloudUpload />} label="By File" />
          <Tab icon={<QrCode />} label="By QR Code" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Verify by Hash */}
        {tabValue === 0 && (
          <Box>
            <TextField
              fullWidth
              label="Document Hash"
              value={documentHash}
              onChange={(e) => setDocumentHash(e.target.value)}
              placeholder="Enter document hash (0x...)"
              helperText="Enter the unique hash of the document you want to verify"
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              onClick={handleVerifyHash}
              disabled={verifying}
              startIcon={verifying ? <CircularProgress size={20} /> : <Search />}
              fullWidth
            >
              {verifying ? 'Verifying...' : 'Verify Document'}
            </Button>
          </Box>
        )}

        {/* Verify by File */}
        {tabValue === 1 && (
          <Box>
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                mb: 2,
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop file here' : 'Drag & drop file here'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or click to browse
              </Typography>
            </Box>

            {file && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </Alert>
            )}

            <Button
              variant="contained"
              onClick={handleVerifyFile}
              disabled={verifying || !file}
              startIcon={verifying ? <CircularProgress size={20} /> : <Search />}
              fullWidth
            >
              {verifying ? 'Verifying...' : 'Verify Document'}
            </Button>
          </Box>
        )}

        {/* Verify by QR Code */}
        {tabValue === 2 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Scan the QR code from the document or enter the verification data manually
              </Typography>
            </Alert>
            
            <TextField
              fullWidth
              label="QR Code Data"
              value={qrData}
              onChange={(e) => setQrData(e.target.value)}
              placeholder="Paste QR code data or URL"
              helperText="Enter the data from the QR code"
              sx={{ mb: 2 }}
              multiline
              rows={3}
            />
            
            <Button
              variant="contained"
              onClick={handleVerifyQR}
              disabled={verifying}
              startIcon={verifying ? <CircularProgress size={20} /> : <Search />}
              fullWidth
            >
              {verifying ? 'Verifying...' : 'Verify Document'}
            </Button>
          </Box>
        )}

        {renderVerificationResult()}
      </Paper>
    </Box>
  );
};

export default EnhancedVerification;
