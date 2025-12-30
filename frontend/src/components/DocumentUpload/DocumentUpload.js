import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  Divider
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Close,
  Description,
  Info
} from '@mui/icons-material';
import documentService from '../../services/documentService';

const DocumentUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [uploadError, setUploadError] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  
  // Form data
  const [metadata, setMetadata] = useState({
    studentId: '',
    studentName: '',
    institutionName: '',
    documentType: '',
    issueDate: '',
    expiryDate: '',
    department: '',
    description: ''
  });

  const documentTypes = [
    'Degree Certificate',
    'Diploma Certificate',
    'Transcript',
    'Mark Sheet',
    'Character Certificate',
    'Migration Certificate',
    'Provisional Certificate',
    'Other'
  ];

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setValidationErrors([]);
    setUploadError('');
    setUploadStatus('idle');

    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(file => 
        file.errors.map(error => error.message).join(', ')
      );
      setValidationErrors(errors);
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const validation = documentService.validateFile(file);
      
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        return;
      }

      setSelectedFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleMetadataChange = (field, value) => {
    setMetadata(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const validateForm = () => {
    const errors = [];
    
    if (!selectedFile) {
      errors.push('Please select a file to upload');
    }

    const metadataValidation = documentService.validateMetadata(metadata);
    if (!metadataValidation.isValid) {
      errors.push(...metadataValidation.errors);
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleUpload = async () => {
    if (!validateForm()) {
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadError('');

    try {
      const result = await documentService.uploadDocument(
        selectedFile,
        metadata,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      setUploadResult(result);
      setUploadStatus('success');
      setShowSuccessDialog(true);
      
      // Reset form
      setSelectedFile(null);
      setMetadata({
        studentId: '',
        studentName: '',
        institutionName: '',
        documentType: '',
        issueDate: '',
        expiryDate: '',
        department: '',
        description: ''
      });
      
    } catch (error) {
      setUploadError(error.message);
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    setUploadError('');
    setValidationErrors([]);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'uploading': return 'info';
      default: return 'primary';
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Upload Document
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Upload academic documents to the blockchain for secure verification and storage.
      </Typography>

      {/* File Upload Area */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          mb: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover'
          }
        }}
      >
        <input {...getInputProps()} />
        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        
        {selectedFile ? (
          <Box>
            <Typography variant="h6" gutterBottom>
              Selected File
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Description color="primary" />
              <Typography variant="body1">
                {selectedFile.name}
              </Typography>
              <Chip 
                label={formatFileSize(selectedFile.size)} 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
              <IconButton onClick={removeFile} size="small" color="error">
                <Close />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop the file here' : 'Drag & drop a file here, or click to select'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Please fix the following errors:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Upload Error */}
      {uploadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {uploadError}
        </Alert>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            Uploading... {uploadProgress}%
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={uploadProgress} 
            color={getStatusColor()}
          />
        </Box>
      )}

      {/* Document Metadata Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Document Information
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Student ID"
              value={metadata.studentId}
              onChange={(e) => handleMetadataChange('studentId', e.target.value)}
              required
              disabled={isUploading}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Student Name"
              value={metadata.studentName}
              onChange={(e) => handleMetadataChange('studentName', e.target.value)}
              required
              disabled={isUploading}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Institution Name"
              value={metadata.institutionName}
              onChange={(e) => handleMetadataChange('institutionName', e.target.value)}
              required
              disabled={isUploading}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Document Type</InputLabel>
              <Select
                value={metadata.documentType}
                label="Document Type"
                onChange={(e) => handleMetadataChange('documentType', e.target.value)}
                disabled={isUploading}
              >
                {documentTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Issue Date"
              type="date"
              value={metadata.issueDate}
              onChange={(e) => handleMetadataChange('issueDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              disabled={isUploading}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Expiry Date (Optional)"
              type="date"
              value={metadata.expiryDate}
              onChange={(e) => handleMetadataChange('expiryDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={isUploading}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Department (Optional)"
              value={metadata.department}
              onChange={(e) => handleMetadataChange('department', e.target.value)}
              disabled={isUploading}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description (Optional)"
              multiline
              rows={3}
              value={metadata.description}
              onChange={(e) => handleMetadataChange('description', e.target.value)}
              disabled={isUploading}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Upload Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          startIcon={isUploading ? <LinearProgress size={20} /> : <CloudUpload />}
          sx={{ minWidth: 200 }}
        >
          {isUploading ? 'Uploading...' : 'Upload Document'}
        </Button>
      </Box>

      {/* Success Dialog */}
      <Dialog 
        open={showSuccessDialog} 
        onClose={() => setShowSuccessDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle color="success" />
          Document Uploaded Successfully
        </DialogTitle>
        
        <DialogContent>
          {uploadResult && (
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                Your document has been successfully uploaded and stored on the blockchain!
              </Alert>
              
              <Typography variant="h6" gutterBottom>
                Transaction Details
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Document Hash:
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {uploadResult.documentHash}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Transaction Hash:
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {uploadResult.transactionHash}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    IPFS Hash:
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {uploadResult.ipfsHash}
                  </Typography>
                </Grid>
                
                {uploadResult.gasUsed && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Gas Used:
                    </Typography>
                    <Typography variant="body1">
                      {uploadResult.gasUsed}
                    </Typography>
                  </Grid>
                )}
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Info color="info" />
                <Typography variant="body2" color="text.secondary">
                  Important Information
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                • Save the document hash for future verification
                • The document is now permanently stored on the blockchain
                • You can verify this document anytime using the verification tool
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setShowSuccessDialog(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentUpload;