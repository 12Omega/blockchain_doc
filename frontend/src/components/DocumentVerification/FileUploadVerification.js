import React, { useCallback, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import documentService from '../../services/documentService';

const FileUploadVerification = ({ onVerify, loading }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setValidationError(null);
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors.some(error => error.code === 'file-too-large')) {
        setValidationError('File size must be less than 10MB');
      } else if (rejection.errors.some(error => error.code === 'file-invalid-type')) {
        setValidationError('File type not supported. Please upload PDF, DOC, DOCX, or image files.');
      } else {
        setValidationError('Invalid file. Please try again.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Validate file using document service
      const validation = documentService.validateFile(file);
      if (!validation.isValid) {
        setValidationError(validation.errors.join(', '));
        return;
      }

      setSelectedFile(file);
    }
  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    maxSize: 10485760, // 10MB
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const handleVerify = () => {
    if (selectedFile && onVerify) {
      onVerify(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setValidationError(null);
  };

  const getDropzoneStyle = () => {
    let borderColor = '#cccccc';
    let backgroundColor = '#fafafa';

    if (isDragActive) {
      backgroundColor = '#f0f8ff';
    }
    if (isDragAccept) {
      borderColor = '#00e676';
    }
    if (isDragReject) {
      borderColor = '#ff1744';
    }

    return {
      borderColor,
      backgroundColor,
    };
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Upload Document for Verification
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Select or drag and drop the document you want to verify. The system will compare
        the document's hash with the blockchain record to confirm authenticity.
      </Typography>

      {validationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationError}
        </Alert>
      )}

      {!selectedFile ? (
        <Paper
          {...getRootProps()}
          sx={{
            p: 4,
            border: '2px dashed',
            borderRadius: 2,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            ...getDropzoneStyle(),
          }}
        >
          <input {...getInputProps()} />
          <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          
          {isDragActive ? (
            <Typography variant="h6" color="primary">
              Drop the document here...
            </Typography>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>
                Drag and drop a document here
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                or click to select a file
              </Typography>
              <Button variant="outlined" component="span">
                Choose File
              </Button>
            </>
          )}
          
          <Typography variant="caption" display="block" sx={{ mt: 2 }}>
            Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ p: 3, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <DescriptionIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" noWrap>
                {selectedFile.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatFileSize(selectedFile.size)} • {selectedFile.type}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={handleRemoveFile}
              disabled={loading}
            >
              Remove
            </Button>
          </Box>

          {loading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Verifying document authenticity...
              </Typography>
            </Box>
          )}

          <Button
            variant="contained"
            onClick={handleVerify}
            disabled={loading}
            fullWidth
            size="large"
          >
            {loading ? 'Verifying...' : 'Verify Document'}
          </Button>
        </Paper>
      )}

      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>How it works:</strong> The system generates a cryptographic hash of your uploaded 
          document and compares it with the hash stored on the blockchain. If they match, 
          the document is authentic and hasn't been tampered with.
        </Typography>
      </Alert>
    </Box>
  );
};

export default FileUploadVerification;