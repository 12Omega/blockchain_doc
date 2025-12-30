import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  LinearProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
  Description as FileIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

const BatchUploadModal = ({ open, onClose, onBatchUpload, commonMetadata }) => {
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      setError('Some files were rejected. Please ensure all files are valid documents under 10MB.');
      return;
    }

    const newFiles = acceptedFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      status: 'pending',
    }));

    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  const handleRemoveFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setUploadStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[fileId];
      return newStatus;
    });
  };

  const handleBatchUpload = async () => {
    if (files.length === 0) {
      setError('Please add at least one file');
      return;
    }

    if (!commonMetadata || !commonMetadata.institutionName || !commonMetadata.documentType) {
      setError('Please provide institution name and document type');
      return;
    }

    setUploading(true);
    setError(null);

    const results = {
      successful: 0,
      failed: 0,
      total: files.length,
    };

    for (const fileItem of files) {
      try {
        setUploadStatus(prev => ({
          ...prev,
          [fileItem.id]: { status: 'uploading', progress: 0 },
        }));

        // Extract student info from filename if possible
        // Expected format: StudentID_StudentName.ext
        const fileNameParts = fileItem.file.name.split('.')[0].split('_');
        const studentId = fileNameParts[0] || '';
        const studentName = fileNameParts.slice(1).join(' ') || '';

        const metadata = {
          ...commonMetadata,
          studentId,
          studentName,
        };

        await onBatchUpload(fileItem.file, metadata, (progress) => {
          setUploadStatus(prev => ({
            ...prev,
            [fileItem.id]: { status: 'uploading', progress },
          }));
        });

        setUploadStatus(prev => ({
          ...prev,
          [fileItem.id]: { status: 'success', progress: 100 },
        }));

        results.successful++;
      } catch (err) {
        console.error(`Failed to upload ${fileItem.file.name}:`, err);
        setUploadStatus(prev => ({
          ...prev,
          [fileItem.id]: { status: 'error', error: err.message },
        }));
        results.failed++;
      }
    }

    setUploading(false);

    if (results.failed === 0) {
      setTimeout(() => {
        handleClose();
      }, 2000);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      setUploadStatus({});
      setError(null);
      onClose();
    }
  };

  const getFileStatus = (fileId) => {
    return uploadStatus[fileId] || { status: 'pending', progress: 0 };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <SuccessIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'uploading':
        return <PendingIcon color="primary" />;
      default:
        return <FileIcon color="action" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const successCount = Object.values(uploadStatus).filter(s => s.status === 'success').length;
  const errorCount = Object.values(uploadStatus).filter(s => s.status === 'error').length;
  const uploadingCount = Object.values(uploadStatus).filter(s => s.status === 'uploading').length;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Batch Document Upload
        {files.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Upload Progress Summary */}
        {uploading && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Chip label={`Success: ${successCount}`} color="success" size="small" />
              <Chip label={`Failed: ${errorCount}`} color="error" size="small" />
              <Chip label={`Uploading: ${uploadingCount}`} color="primary" size="small" />
            </Box>
          </Box>
        )}

        {/* Instructions */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Filename Format:</strong> StudentID_StudentName.ext
          </Typography>
          <Typography variant="body2">
            Example: 12345_John_Doe.pdf
          </Typography>
        </Alert>

        {/* Drop Zone */}
        {!uploading && (
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
              transition: 'all 0.3s',
              mb: 2,
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            <input {...getInputProps()} />
            <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="body1" gutterBottom>
              {isDragActive ? 'Drop files here' : 'Drag & drop files here or click to browse'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supported: PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
            </Typography>
          </Box>
        )}

        {/* File List */}
        {files.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Files to Upload
            </Typography>
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {files.map((fileItem) => {
                const status = getFileStatus(fileItem.id);
                return (
                  <ListItem
                    key={fileItem.id}
                    secondaryAction={
                      !uploading && (
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveFile(fileItem.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemIcon>
                      {getStatusIcon(status.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={fileItem.file.name}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {formatFileSize(fileItem.file.size)}
                          </Typography>
                          {status.status === 'uploading' && (
                            <LinearProgress
                              variant="determinate"
                              value={status.progress}
                              sx={{ mt: 0.5 }}
                            />
                          )}
                          {status.status === 'error' && (
                            <Typography variant="caption" color="error">
                              {status.error}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Cancel'}
        </Button>
        <Button
          onClick={handleBatchUpload}
          variant="contained"
          disabled={uploading || files.length === 0}
          startIcon={<UploadIcon />}
        >
          Upload {files.length} Document{files.length !== 1 ? 's' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BatchUploadModal;
