import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Upload as UploadIcon,
  List as ListIcon,
  QueuePlayNext as BatchIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import DocumentUploadForm from './DocumentUploadForm';
import RegistrationProgress from './RegistrationProgress';
import QRCodeDisplay from './QRCodeDisplay';
import DocumentList from './DocumentList';
import BatchUploadModal from './BatchUploadModal';

const IssuerDashboard = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Check if user has issuer role
  if (!user || (user.role !== 'issuer' && user.role !== 'admin')) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">
          You need issuer permissions to access this dashboard. Please contact an administrator.
        </Alert>
      </Container>
    );
  }

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setError(null);
    setSuccess(null);
  };

  const handleDocumentSubmit = async (file, metadata, setProgress) => {
    try {
      setUploading(true);
      setError(null);
      setRegistrationStatus({ currentStep: 'hashing', message: 'Computing document hash...' });

      const formData = new FormData();
      formData.append('document', file);
      
      // Append metadata fields
      Object.keys(metadata).forEach(key => {
        if (metadata[key]) {
          formData.append(key, metadata[key]);
        }
      });

      setRegistrationStatus({ currentStep: 'encrypting', message: 'Encrypting document...' });

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/documents/register', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Registration failed');
      }

      setRegistrationStatus({ currentStep: 'completed', message: 'Registration completed!' });
      setRegistrationResult(data);
      setSuccess('Document registered successfully!');
      
      // Switch to results view after a short delay
      setTimeout(() => {
        setCurrentTab(2); // Switch to results tab
      }, 1000);

    } catch (err) {
      console.error('Document registration error:', err);
      setError(err.message);
      setRegistrationStatus({ 
        currentStep: 'error', 
        error: true,
        message: err.message 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBatchUpload = async (file, metadata, setProgress) => {
    const formData = new FormData();
    formData.append('document', file);
    
    Object.keys(metadata).forEach(key => {
      if (metadata[key]) {
        formData.append(key, metadata[key]);
      }
    });

    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/documents/register', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || 'Upload failed');
    }

    return data;
  };

  const handleViewDetails = (document) => {
    setSelectedDocument(document);
    setDetailsDialogOpen(true);
  };

  const handleViewQRCode = (document) => {
    setSelectedDocument(document);
    setQrDialogOpen(true);
  };

  const handleNewRegistration = () => {
    setRegistrationResult(null);
    setRegistrationStatus(null);
    setError(null);
    setSuccess(null);
    setCurrentTab(0);
  };

  const getBatchCommonMetadata = () => {
    return {
      institutionName: user?.profile?.institution || '',
      documentType: 'certificate',
      issueDate: new Date().toISOString().split('T')[0],
    };
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Issuer Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Register and manage academic documents on the blockchain
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<BatchIcon />}
          onClick={() => setBatchModalOpen(true)}
        >
          Batch Upload
        </Button>
      </Box>

      {/* Success/Error Messages */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab icon={<UploadIcon />} label="Register Document" />
          <Tab icon={<ListIcon />} label="My Documents" />
          {registrationResult && <Tab label="Registration Result" />}
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <Box>
        {/* Register Document Tab */}
        {currentTab === 0 && (
          <Box>
            {!uploading && !registrationStatus ? (
              <DocumentUploadForm
                onSubmit={handleDocumentSubmit}
                loading={uploading}
              />
            ) : (
              <RegistrationProgress
                status={registrationStatus}
                error={error}
              />
            )}
          </Box>
        )}

        {/* My Documents Tab */}
        {currentTab === 1 && (
          <DocumentList
            onViewDetails={handleViewDetails}
            onViewQRCode={handleViewQRCode}
          />
        )}

        {/* Registration Result Tab */}
        {currentTab === 2 && registrationResult && (
          <QRCodeDisplay
            registrationResult={registrationResult}
            onClose={handleNewRegistration}
          />
        )}
      </Box>

      {/* Batch Upload Modal */}
      <BatchUploadModal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        onBatchUpload={handleBatchUpload}
        commonMetadata={getBatchCommonMetadata()}
      />

      {/* Document Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Document Details</DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Student Name:</strong> {selectedDocument.metadata.studentName}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Student ID:</strong> {selectedDocument.metadata.studentId}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Institution:</strong> {selectedDocument.metadata.institutionName}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Document Type:</strong> {selectedDocument.metadata.documentType}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Issue Date:</strong> {new Date(selectedDocument.metadata.issueDate).toLocaleDateString()}
              </Typography>
              {selectedDocument.blockchain && (
                <>
                  <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
                    <strong>Transaction Hash:</strong>
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                    {selectedDocument.blockchain.transactionHash}
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Document QR Code</DialogTitle>
        <DialogContent>
          {selectedDocument && selectedDocument.blockchain && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Scan this QR code to verify the document
              </Typography>
              {/* QR code would be generated here */}
              <Typography variant="caption" color="text.secondary">
                QR Code generation coming soon
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default IssuerDashboard;
