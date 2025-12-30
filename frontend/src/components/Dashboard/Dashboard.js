import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import documentService from '../../services/documentService';
import DocumentDetails from './DocumentDetails';
import DocumentShare from './DocumentShare';

const Dashboard = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const documentsPerPage = 12;

  useEffect(() => {
    loadDocuments();
  }, [currentPage, searchTerm, statusFilter, typeFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: documentsPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
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
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleStatusFilter = (event) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  };

  const handleTypeFilter = (event) => {
    setTypeFilter(event.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };

  const handleViewDetails = (document) => {
    setSelectedDocument(document);
    setDetailsOpen(true);
  };

  const handleShare = (document) => {
    setSelectedDocument(document);
    setShareOpen(true);
  };

  const handleDownload = async (document) => {
    try {
      setError(null);
      // This would trigger the download endpoint
      const response = await fetch(`/api/documents/${document.documentHash}/download`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = document.fileInfo.originalName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
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

  if (loading && documents.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Document Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your documents and view verification status
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search documents..."
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
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={handleStatusFilter}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="blockchain_stored">Verified</MenuItem>
                <MenuItem value="uploaded">Uploaded</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                label="Type"
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
            {searchTerm || statusFilter || typeFilter
              ? 'Try adjusting your search criteria'
              : 'Upload your first document to get started'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {documents.map((document) => (
            <Grid item xs={12} sm={6} md={4} key={document._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    {getStatusIcon(document.status)}
                    <Typography variant="h6" component="h2" ml={1} noWrap>
                      {document.metadata.documentType.charAt(0).toUpperCase() + 
                       document.metadata.documentType.slice(1)}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Student:</strong> {document.metadata.studentName}
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
                      onClick={() => handleViewDetails(document)}
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
                  
                  {(user?.walletAddress === document.access.owner || 
                    user?.walletAddress === document.access.issuer) && (
                    <Tooltip title="Share">
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

      {/* Document Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Document Details</DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <DocumentDetails document={selectedDocument} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
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
              onClose={() => setShareOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default Dashboard;