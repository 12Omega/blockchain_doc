import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Chip,
  IconButton,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  Description as FileIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

const DocumentUploadForm = ({ onSubmit, onCancel, loading = false }) => {
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    studentName: '',
    studentId: '',
    institutionName: '',
    documentType: '',
    issueDate: '',
    expiryDate: '',
    grade: '',
    course: '',
    description: '',
  });
  const [errors, setErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);

  // Drag and drop configuration
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setErrors({ file: 'File size must be less than 10MB' });
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setErrors({ file: 'Invalid file type. Please upload PDF, DOC, DOCX, or image files.' });
      } else {
        setErrors({ file: 'File upload failed. Please try again.' });
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setErrors({ ...errors, file: null });
    }
  }, [errors]);

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
    multiple: false,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!file) {
      newErrors.file = 'Please upload a document';
    }

    if (!formData.studentName.trim()) {
      newErrors.studentName = 'Student name is required';
    }

    if (!formData.studentId.trim()) {
      newErrors.studentId = 'Student ID is required';
    }

    if (!formData.institutionName.trim()) {
      newErrors.institutionName = 'Institution name is required';
    }

    if (!formData.documentType) {
      newErrors.documentType = 'Document type is required';
    }

    if (!formData.issueDate) {
      newErrors.issueDate = 'Issue date is required';
    } else {
      const issueDate = new Date(formData.issueDate);
      const today = new Date();
      if (issueDate > today) {
        newErrors.issueDate = 'Issue date cannot be in the future';
      }
    }

    if (formData.expiryDate) {
      const issueDate = new Date(formData.issueDate);
      const expiryDate = new Date(formData.expiryDate);
      if (expiryDate <= issueDate) {
        newErrors.expiryDate = 'Expiry date must be after issue date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(file, formData, setUploadProgress);
      // Reset form on success
      setFile(null);
      setFormData({
        studentName: '',
        studentId: '',
        institutionName: '',
        documentType: '',
        issueDate: '',
        expiryDate: '',
        grade: '',
        course: '',
        description: '',
      });
      setUploadProgress(0);
    } catch (error) {
      setErrors({ submit: error.message });
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setErrors({ ...errors, file: null });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Register New Document
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload and register academic documents on the blockchain
      </Typography>

      <form onSubmit={handleSubmit}>
        {/* File Upload Area */}
        <Box sx={{ mb: 3 }}>
          {!file ? (
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : errors.file ? 'error.main' : 'grey.300',
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
              <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop the file here' : 'Drag & drop document here'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or click to browse files
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'grey.300',
                borderRadius: 2,
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FileIcon color="primary" />
                <Box>
                  <Typography variant="body1">{file.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size)}
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={handleRemoveFile} size="small" disabled={loading}>
                <CloseIcon />
              </IconButton>
            </Box>
          )}
          {errors.file && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {errors.file}
            </Alert>
          )}
        </Box>

        {/* Student Information */}
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          Student Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Student Name"
              name="studentName"
              value={formData.studentName}
              onChange={handleInputChange}
              error={!!errors.studentName}
              helperText={errors.studentName}
              required
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Student ID"
              name="studentId"
              value={formData.studentId}
              onChange={handleInputChange}
              error={!!errors.studentId}
              helperText={errors.studentId}
              required
              disabled={loading}
            />
          </Grid>
        </Grid>

        {/* Document Information */}
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          Document Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Institution Name"
              name="institutionName"
              value={formData.institutionName}
              onChange={handleInputChange}
              error={!!errors.institutionName}
              helperText={errors.institutionName}
              required
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required error={!!errors.documentType}>
              <InputLabel>Document Type</InputLabel>
              <Select
                name="documentType"
                value={formData.documentType}
                onChange={handleInputChange}
                label="Document Type"
                disabled={loading}
              >
                <MenuItem value="degree">Degree</MenuItem>
                <MenuItem value="diploma">Diploma</MenuItem>
                <MenuItem value="certificate">Certificate</MenuItem>
                <MenuItem value="transcript">Transcript</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
              {errors.documentType && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                  {errors.documentType}
                </Typography>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Issue Date"
              name="issueDate"
              type="date"
              value={formData.issueDate}
              onChange={handleInputChange}
              error={!!errors.issueDate}
              helperText={errors.issueDate}
              InputLabelProps={{ shrink: true }}
              required
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Expiry Date (Optional)"
              name="expiryDate"
              type="date"
              value={formData.expiryDate}
              onChange={handleInputChange}
              error={!!errors.expiryDate}
              helperText={errors.expiryDate}
              InputLabelProps={{ shrink: true }}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Grade (Optional)"
              name="grade"
              value={formData.grade}
              onChange={handleInputChange}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Course (Optional)"
              name="course"
              value={formData.course}
              onChange={handleInputChange}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description (Optional)"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              multiline
              rows={3}
              disabled={loading}
            />
          </Grid>
        </Grid>

        {/* Upload Progress */}
        {loading && uploadProgress > 0 && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Uploading...</Typography>
              <Typography variant="body2">{uploadProgress}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}

        {/* Error Message */}
        {errors.submit && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errors.submit}
          </Alert>
        )}

        {/* Action Buttons */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          {onCancel && (
            <Button onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !file}
            startIcon={<UploadIcon />}
          >
            {loading ? 'Registering...' : 'Register Document'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default DocumentUploadForm;
