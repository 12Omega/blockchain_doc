import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Alert,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Description as DocumentIcon,
  QrCode as QrCodeIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import documentService from '../../services/documentService';
import DocumentViewer from './DocumentViewer';
import DocumentShare from '../Dashboard/DocumentShare';

const MyDocuments = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const documentsPerPage = 12;

  useEffect(() => {
    loadDocuments();
  }, [currentPage, searchTerm, typeFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: documentsPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(typeFilter && { documentType: typeFilter }),
      };

      const response = await documentService.getUserDocuments(params);
      
      if (response.success) {
        setDocuments(response.data.documents);
        setTotalPages(response.data.pagination.pages);
      } else {
        throw new Error(response.error || 'Failed to load documents');
      }
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleTypeFilter = (event) => {
    setTypeFilter(event.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };

  const handleViewDocument = (document) => {
    setSelectedDocument(document);
    setViewerOpen(true);
  };

  const handleShare = (document) => {
    setSelectedDocument(document);
    setShareOpen(true);
  };

  const handleDownload = async (document) => {
    try {
      setError(null);
      const response = await fetch(`/api/documents/${document.documentHash}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.fileInfo.originalName || 'document';
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      } else {
        throw new Error('Download failed');
      }
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download document');
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOwner = (document) => {
    return user?.walletAddress === document.access.owner;
  };

  if (loading && documents.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Search by student name, ID, institution, or course..."
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Document Type</InputLabel>
              <Select
                value={typeFilter}
                label="Document Type"
                onChange={handleTypeFilter}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="degree">Degree</MenuItem>
                <MenuItem value="certificate">Certificate</MenuItem>
                <MenuItem value="transcript">Transcript</MenuItem>
                <MenuItem value="diploma">Diploma</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Documents Grid */}
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : documents.length === 0 ? (
        <Box textAlign="center" py={8}>
          <DocumentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No documents found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm || typeFilter
              ? 'Try adjusting your search criteria'
              : 'You don\'t have any documents yet'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {documents.map((document) => (
            <Grid item xs={12} sm={6} md={4} key={document._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center">
                      {getStatusIcon(document.status)}
                      <Typography variant="h6" component="h2" ml={1} noWrap>
                        {document.metadata.documentType.charAt(0).toUpperCase() + 
                         document.metadata.documentType.slice(1)}
                      </Typography>
                    </Box>
                    {isOwner(document) && (
                      <Chip label="Owner" color="primary" size="small" />
                    )}
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Student:</strong> {document.metadata.studentName}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>ID:</strong> {document.metadata.studentId}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Institution:</strong> {document.metadata.institutionName}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Issue Date:</strong> {formatDate(document.metadata.issueDate)}
                  </Typography>
                  
                  {document.metadata.course && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Course:</strong> {document.metadata.course}
                    </Typography>
                  )}
                  
                  {document.metadata.grade && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Grade:</strong> {document.metadata.grade}
                    </Typography>
                  )}
                  
                  <Box mt={2}>
                    <Chip
                      label={document.status.replace('_', ' ').toUpperCase()}
                      color={getStatusColor(document.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    Created: {formatDate(document.audit.createdAt)}
                  </Typography>
                  
                  {document.audit.verificationCount > 0 && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Verified {document.audit.verificationCount} times
                    </Typography>
                  )}
                </CardContent>
                
                <CardActions>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => handleViewDocument(document)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  
                  {document.status === 'blockchain_stored' && (
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        onClick={() => handleDownload(document)}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  {isOwner(document) && (
                    <Tooltip title="Share & Manage Access">
                      <IconButton
                        size="small"
                        onClick={() => handleShare(document)}
                      >
                        <ShareIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {/* Document Viewer Dialog */}
      <Dialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Document Details</DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <DocumentViewer 
              document={selectedDocument} 
              onDownload={handleDownload}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Document Share Dialog */}
      <Dialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Share Document</DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <DocumentShare
              document={selectedDocument}
              onClose={() => {
                setShareOpen(false);
                loadDocuments(); // Refresh to show updated access list
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MyDocuments;
