import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Pagination,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  QrCode as QrCodeIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';

const DocumentList = ({ onViewDetails, onViewQRCode, onRefresh }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const documentsPerPage = 12;

  useEffect(() => {
    loadDocuments();
  }, [currentPage, searchTerm, statusFilter, typeFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage,
        limit: documentsPerPage,
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('documentType', typeFilter);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/documents?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load documents');
      }

      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.data.documents);
        setTotalPages(data.data.pagination.pages);
      } else {
        throw new Error(data.error || 'Failed to load documents');
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">
          Registered Documents
        </Typography>
        <Button onClick={loadDocuments} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
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
                <MenuItem value="diploma">Diploma</MenuItem>
                <MenuItem value="certificate">Certificate</MenuItem>
                <MenuItem value="transcript">Transcript</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Documents Grid */}
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : documents.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: 'center' }}>
          <DocumentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No documents found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm || statusFilter || typeFilter
              ? 'Try adjusting your search criteria'
              : 'Register your first document to get started'}
          </Typography>
        </Paper>
      ) : (
        <>
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
                    
                    <Box mt={2}>
                      <Chip
                        label={document.status.replace('_', ' ').toUpperCase()}
                        color={getStatusColor(document.status)}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      Registered: {formatDate(document.audit.createdAt)}
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
                        onClick={() => onViewDetails(document)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    
                    {document.status === 'blockchain_stored' && (
                      <Tooltip title="View QR Code">
                        <IconButton
                          size="small"
                          onClick={() => onViewQRCode(document)}
                        >
                          <QrCodeIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

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
        </>
      )}
    </Box>
  );
};

export default DocumentList;
