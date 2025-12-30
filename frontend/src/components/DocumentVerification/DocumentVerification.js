import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import FileUploadVerification from './FileUploadVerification';
import QRCodeVerification from './QRCodeVerification';
import VerificationResult from './VerificationResult';
import VerificationHistory from './VerificationHistory';
import documentService from '../../services/documentService';

const DocumentVerification = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Clear previous results when switching tabs
    setVerificationResult(null);
    setError(null);
    setSuccess(null);
  };

  const handleVerificationStart = useCallback(() => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setVerificationResult(null);
  }, []);

  const handleVerificationSuccess = useCallback((result) => {
    setLoading(false);
    setVerificationResult(result);
    setSuccess('Document verification completed');
    setError(null);
  }, []);

  const handleVerificationError = useCallback((errorMessage) => {
    setLoading(false);
    setError(errorMessage);
    setSuccess(null);
    setVerificationResult(null);
  }, []);

  const handleFileVerification = useCallback(async (file) => {
    handleVerificationStart();
    
    try {
      const result = await documentService.verifyDocument(file);
      handleVerificationSuccess(result.data.verification);
    } catch (err) {
      handleVerificationError(err.message);
    }
  }, [handleVerificationStart, handleVerificationSuccess, handleVerificationError]);

  const handleHashVerification = useCallback(async (documentHash) => {
    handleVerificationStart();
    
    try {
      // Use the GET endpoint for hash-only verification
      const result = await documentService.api.get(`/documents/verify/${documentHash}`);
      handleVerificationSuccess(result.data.data.verification);
    } catch (err) {
      handleVerificationError(err.response?.data?.error || err.message);
    }
  }, [handleVerificationStart, handleVerificationSuccess, handleVerificationError]);

  if (!user) {
    return (
      <Alert severity="warning">
        Please connect and authenticate your wallet to access document verification.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Document Verification
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Verify the authenticity of academic documents using blockchain technology.
          You can upload a document file or scan a QR code for quick verification.
        </Typography>

        {/* Status Messages */}
        {success && (
          <Alert 
            severity="success" 
            sx={{ mb: 2 }}
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Loading Indicator */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2, alignSelf: 'center' }}>
              Verifying document...
            </Typography>
          </Box>
        )}

        {/* Verification Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="verification methods">
            <Tab label="File Upload" />
            <Tab label="QR Code Scanner" />
            <Tab label="Verification History" />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        {activeTab === 0 && (
          <FileUploadVerification
            onVerify={handleFileVerification}
            loading={loading}
          />
        )}

        {activeTab === 1 && (
          <QRCodeVerification
            onVerify={handleHashVerification}
            loading={loading}
          />
        )}

        {activeTab === 2 && (
          <VerificationHistory />
        )}

        {/* Verification Result */}
        {verificationResult && (
          <>
            <Divider sx={{ my: 3 }} />
            <VerificationResult result={verificationResult} />
          </>
        )}
      </Paper>
    </Box>
  );
};

export default DocumentVerification;