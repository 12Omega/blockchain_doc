import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  InsertDriveFile,
  CheckCircle,
  Error as ErrorIcon,
  Visibility,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import documentService from '../../services/documentService';

const ALLOWED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'text/plain': ['.txt'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const EnhancedDocumentUpload = ({ onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [documentType, setDocumentType] = useState('certificate');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [metadata, setMetadata] = useState({
    studentName: '',
    studentId: '',
    ownerName: '',
    issueDate: new Date().toISOString().split('T')[0],
    course: '',
    grade: '',
    description: '',
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(f => f.errors[0].message).join(', ');
      setError(`Some files were rejected: ${errors}`);
    }

    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      status: 'pending',
      error: null,
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const removeFile = (id) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    if (!recipientAddress) {
      setError('Please enter recipient wallet address');
      return;
    }

    if (!metadata.studentName) {
      setError('Please enter student name');
      return;
    }

    if (!metadata.studentId) {
      setError('Please enter student ID');
      return;
    }

    if (!metadata.ownerName) {
      setError('Please enter owner name');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const uploadPromises = files.map(async (fileItem) => {
        try {
          setUploadProgress(prev => ({ ...prev, [fileItem.id]: 0 }));

          // Combine metadata with documentType
          const fullMetadata = {
            ...metadata,
            documentType: documentType,
            ownerAddress: recipientAddress || undefined,
          };

          const result = await documentService.registerDocument(fileItem.file, fullMetadata, (progress) => {
            setUploadProgress(prev => ({ ...prev, [fileItem.id]: progress }));
          });

          setFiles(prev => prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'success', result }
              : f
          ));

          return result;
        } catch (err) {
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'error', error: err.message }
              : f
          ));
          throw err;
        }
      });

      const results = await Promise.allSettled(uploadPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      if (successCount > 0) {
        setSuccess(`Successfully uploaded ${successCount} document(s)`);
        if (onUploadSuccess) {
          onUploadSuccess(results.filter(r => r.status === 'fulfilled').map(r => r.value));
        }
      }

      if (failCount > 0) {
        setError(`Failed to upload ${failCount} document(s)`);
      }

      // Clear successful uploads after 3 seconds
      setTimeout(() => {
        setFiles(prev => prev.filter(f => f.status !== 'success'));
      }, 3000);

    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('word')) return '📝';
    return '📎';
  };

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudUpload /> Upload Documents
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

        <Grid container spacing={3}>
          {/* Document Information */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Document Information</Typography>
                
                <TextField
                  fullWidth
                  label="Student Name"
                  value={metadata.studentName}
                  onChange={(e) => setMetadata({ ...metadata, studentName: e.target.value })}
                  margin="normal"
                  required
                />

                <TextField
                  fullWidth
                  label="Student ID"
                  value={metadata.studentId}
                  onChange={(e) => setMetadata({ ...metadata, studentId: e.target.value })}
                  margin="normal"
                  required
                />

                <TextField
                  fullWidth
                  label="Owner Name"
                  value={metadata.ownerName}
                  onChange={(e) => setMetadata({ ...metadata, ownerName: e.target.value })}
                  margin="normal"
                  required
                />

                <TextField
                  fullWidth
                  label="Course"
                  value={metadata.course}
                  onChange={(e) => setMetadata({ ...metadata, course: e.target.value })}
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Grade"
                  value={metadata.grade}
                  onChange={(e) => setMetadata({ ...metadata, grade: e.target.value })}
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Description"
                  value={metadata.description}
                  onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                  margin="normal"
                  multiline
                  rows={3}
                />

                <FormControl fullWidth margin="normal">
                  <InputLabel>Document Type</InputLabel>
                  <Select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    label="Document Type"
                  >
                    <MenuItem value="certificate">Certificate</MenuItem>
                    <MenuItem value="diploma">Diploma</MenuItem>
                    <MenuItem value="transcript">Transcript</MenuItem>
                    <MenuItem value="license">License</MenuItem>
                    <MenuItem value="contract">Contract</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>



                <TextField
                  fullWidth
                  label="Issue Date"
                  type="date"
                  value={metadata.issueDate}
                  onChange={(e) => setMetadata({ ...metadata, issueDate: e.target.value })}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  fullWidth
                  label="Recipient Wallet Address"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  margin="normal"
                  required
                  placeholder="0x..."
                  helperText="Ethereum wallet address of the document recipient"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* File Upload Area */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Upload Files</Typography>
                
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
                    {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    or click to browse
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Supported: PDF, DOC, DOCX, JPG, PNG, GIF, TXT (Max 10MB)
                  </Typography>
                </Box>

                {files.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Selected Files ({files.length})
                    </Typography>
                    <List>
                      {files.map((fileItem) => (
                        <ListItem key={fileItem.id} divider>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                            <Typography sx={{ fontSize: 24 }}>
                              {getFileIcon(fileItem.file)}
                            </Typography>
                            <ListItemText
                              primary={fileItem.file.name}
                              secondary={`${(fileItem.file.size / 1024).toFixed(2)} KB`}
                            />
                            {fileItem.status === 'success' && (
                              <CheckCircle color="success" />
                            )}
                            {fileItem.status === 'error' && (
                              <ErrorIcon color="error" />
                            )}
                            {fileItem.status === 'uploading' && uploadProgress[fileItem.id] !== undefined && (
                              <Box sx={{ width: 100 }}>
                                <LinearProgress variant="determinate" value={uploadProgress[fileItem.id]} />
                              </Box>
                            )}
                          </Box>
                          <ListItemSecondaryAction>
                            {fileItem.preview && (
                              <IconButton size="small" onClick={() => window.open(fileItem.preview)}>
                                <Visibility />
                              </IconButton>
                            )}
                            <IconButton 
                              edge="end" 
                              onClick={() => removeFile(fileItem.id)}
                              disabled={uploading}
                            >
                              <Delete />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setFiles([]);
              setMetadata({ title: '', description: '', issuer: '', issueDate: new Date().toISOString().split('T')[0] });
              setRecipientAddress('');
            }}
            disabled={uploading}
          >
            Clear All
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            startIcon={<CloudUpload />}
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default EnhancedDocumentUpload;
