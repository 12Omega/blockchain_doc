import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
} from '@mui/material';
import {
  Verified as VerifiedIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  History as HistoryIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import documentService from '../../services/documentService';

const AccessLogs = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalLogs, setTotalLogs] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadOwnedDocuments();
  }, []);

  useEffect(() => {
    if (selectedDocument) {
      loadAccessLogs();
    }
  }, [selectedDocument, page, rowsPerPage, statusFilter, dateFrom, dateTo]);

  const loadOwnedDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await documentService.getUserDocuments({
        page: 1,
        limit: 100,
      });
      
      if (response.success) {
        // Filter to only show documents where user is the owner
        const ownedDocs = response.data.documents.filter(
          doc => doc.access.owner === user.walletAddress
        );
        setDocuments(ownedDocs);
        if (ownedDocs.length > 0 && !selectedDocument) {
          setSelectedDocument(ownedDocs[0]);
        }
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

  const loadAccessLogs = async () => {
    if (!selectedDocument) return;

    try {
      setLogsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        ...(statusFilter && { status: statusFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });

      const response = await fetch(
        `/api/documents/${selectedDocument.documentHash}/audit?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setLogs(data.data.logs || []);
        setTotalLogs(data.data.total || 0);
      } else {
        throw new Error(data.error || 'Failed to load access logs');
      }
    } catch (err) {
      console.error('Error loading access logs:', err);
      setError(err.message);
      setLogs([]);
      setTotalLogs(0);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleApplyFilters = () => {
    setPage(0);
    loadAccessLogs();
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  const getResultIcon = (result) => {
    switch (result) {
      case 'valid':
      case 'authentic':
        return <VerifiedIcon color="success" fontSize="small" />;
      case 'invalid':
      case 'tampered':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'not_found':
        return <WarningIcon color="warning" fontSize="small" />;
      default:
        return <HistoryIcon color="action" fontSize="small" />;
    }
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'valid':
      case 'authentic':
        return 'success';
      case 'invalid':
      case 'tampered':
        return 'error';
      case 'not_found':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAddress = (address) => {
    if (!address || address === 'anonymous') return 'Anonymous';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (documents.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <HistoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No documents to view logs for
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You don't own any documents yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Document Selection and Filters */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Access Logs
              </Typography>
              
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Document</InputLabel>
                    <Select
                      value={selectedDocument?._id || ''}
                      label="Document"
                      onChange={(e) => {
                        const doc = documents.find(d => d._id === e.target.value);
                        setSelectedDocument(doc);
                        setPage(0);
                      }}
                    >
                      {documents.map((doc) => (
                        <MenuItem key={doc._id} value={doc._id}>
                          {doc.metadata.documentType.charAt(0).toUpperCase() + 
                           doc.metadata.documentType.slice(1)} - {doc.metadata.studentName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={statusFilter}
                      label="Status"
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="valid">Valid</MenuItem>
                      <MenuItem value="invalid">Invalid</MenuItem>
                      <MenuItem value="not_found">Not Found</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="From Date"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="To Date"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} md={2}>
                  <Box display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      onClick={handleClearFilters}
                      fullWidth
                    >
                      Clear
                    </Button>
                  </Box>
                </Grid>
              </Grid>

              {selectedDocument && (
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Total Verifications:</strong> {selectedDocument.audit.verificationCount || 0}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Logs Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              {logsLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : logs.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No access logs found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {statusFilter || dateFrom || dateTo
                      ? 'Try adjusting your filters'
                      : 'This document has not been verified yet'}
                  </Typography>
                </Box>
              ) : (
                <>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date & Time</TableCell>
                          <TableCell>Verifier</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell>Result</TableCell>
                          <TableCell>Location</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {logs.map((log, index) => (
                          <TableRow key={index} hover>
                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(log.timestamp)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {formatAddress(log.verifier)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={log.verificationMethod || 'unknown'}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                {getResultIcon(log.result)}
                                <Chip
                                  label={log.result || 'unknown'}
                                  color={getResultColor(log.result)}
                                  size="small"
                                />
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {log.location?.city && log.location?.country
                                  ? `${log.location.city}, ${log.location.country}`
                                  : 'Unknown'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={totalLogs}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Summary Statistics */}
        {selectedDocument && logs.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Summary Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Total Verifications
                    </Typography>
                    <Typography variant="h5">
                      {totalLogs}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Successful
                    </Typography>
                    <Typography variant="h5" color="success.main">
                      {logs.filter(l => l.result === 'valid' || l.result === 'authentic').length}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Failed
                    </Typography>
                    <Typography variant="h5" color="error.main">
                      {logs.filter(l => l.result === 'invalid' || l.result === 'tampered').length}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Unique Verifiers
                    </Typography>
                    <Typography variant="h5">
                      {new Set(logs.map(l => l.verifier)).size}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AccessLogs;
