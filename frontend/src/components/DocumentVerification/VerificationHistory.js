import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  GetApp as GetAppIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import documentService from '../../services/documentService';

const VerificationHistory = () => {
  const { user } = useAuth();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchVerificationHistory = useCallback(async (pageNum = 0, search = '') => {
    try {
      setLoading(true);
      setError(null);

      // Note: This endpoint would need to be implemented in the backend
      // For now, we'll simulate the data structure
      const response = await documentService.api.get('/documents/verifications', {
        params: {
          page: pageNum + 1,
          limit: rowsPerPage,
          search: search.trim(),
        }
      });

      setVerifications(response.data.data.verifications || []);
      setTotalCount(response.data.data.totalCount || 0);
    } catch (err) {
      console.error('Failed to fetch verification history:', err);
      setError('Failed to load verification history. This feature may not be fully implemented yet.');
      
      // Mock data for demonstration
      const mockVerifications = [
        {
          verificationId: 'ver_001',
          documentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          isValid: true,
          verifier: user?.walletAddress,
          document: {
            metadata: {
              studentName: 'John Doe',
              documentType: 'degree',
              institutionName: 'Sample University'
            }
          }
        },
        {
          verificationId: 'ver_002',
          documentHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          isValid: false,
          verifier: user?.walletAddress,
          document: null
        }
      ];
      
      setVerifications(mockVerifications);
      setTotalCount(mockVerifications.length);
    } finally {
      setLoading(false);
    }
  }, [rowsPerPage, user?.walletAddress]);

  const fetchAuditTrail = useCallback(async (documentHash) => {
    try {
      setAuditLoading(true);
      const response = await documentService.api.get(`/documents/audit/${documentHash}`);
      setAuditData(response.data.data.audit);
    } catch (err) {
      console.error('Failed to fetch audit trail:', err);
      setError('Failed to load audit trail');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerificationHistory(page, searchTerm);
  }, [fetchVerificationHistory, page, searchTerm]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleRefresh = () => {
    fetchVerificationHistory(page, searchTerm);
  };

  const handleViewDetails = (verification) => {
    setSelectedVerification(verification);
  };

  const handleViewAudit = async (documentHash) => {
    setAuditDialogOpen(true);
    await fetchAuditTrail(documentHash);
  };

  const handleCloseAuditDialog = () => {
    setAuditDialogOpen(false);
    setAuditData(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const exportVerificationData = () => {
    const csvContent = [
      ['Verification ID', 'Document Hash', 'Timestamp', 'Status', 'Student Name', 'Document Type'].join(','),
      ...verifications.map(v => [
        v.verificationId,
        v.documentHash,
        v.timestamp,
        v.isValid ? 'Valid' : 'Invalid',
        v.document?.metadata?.studentName || 'N/A',
        v.document?.metadata?.documentType || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <Alert severity="warning">
        Please connect and authenticate your wallet to view verification history.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Verification History
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Export to CSV">
            <IconButton onClick={exportVerificationData} disabled={verifications.length === 0}>
              <GetAppIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="Search by document hash, student name, or verification ID..."
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
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Verification ID</TableCell>
              <TableCell>Document Hash</TableCell>
              <TableCell>Timestamp</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Student Name</TableCell>
              <TableCell>Document Type</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : verifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No verification history found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              verifications.map((verification) => (
                <TableRow key={verification.verificationId}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {verification.verificationId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {formatAddress(verification.documentHash)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {formatDate(verification.timestamp)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={verification.isValid ? 'Valid' : 'Invalid'}
                      color={verification.isValid ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {verification.document?.metadata?.studentName || 'N/A'}
                  </TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>
                    {verification.document?.metadata?.documentType || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(verification)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    {verification.document && (
                      <Tooltip title="View Audit Trail">
                        <IconButton
                          size="small"
                          onClick={() => handleViewAudit(verification.documentHash)}
                        >
                          <SearchIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Verification Details Dialog */}
      <Dialog
        open={!!selectedVerification}
        onClose={() => setSelectedVerification(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Verification Details</DialogTitle>
        <DialogContent>
          {selectedVerification && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Verification ID
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                {selectedVerification.verificationId}
              </Typography>

              <Typography variant="subtitle2" gutterBottom>
                Document Hash
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2, wordBreak: 'break-all' }}>
                {selectedVerification.documentHash}
              </Typography>

              <Typography variant="subtitle2" gutterBottom>
                Status
              </Typography>
              <Chip
                label={selectedVerification.isValid ? 'Valid' : 'Invalid'}
                color={selectedVerification.isValid ? 'success' : 'error'}
                sx={{ mb: 2 }}
              />

              <Typography variant="subtitle2" gutterBottom>
                Verification Time
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {formatDate(selectedVerification.timestamp)}
              </Typography>

              {selectedVerification.document && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Document Information
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography variant="body2">
                      <strong>Student:</strong> {selectedVerification.document.metadata?.studentName}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Type:</strong> {selectedVerification.document.metadata?.documentType}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Institution:</strong> {selectedVerification.document.metadata?.institutionName}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedVerification(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Audit Trail Dialog */}
      <Dialog
        open={auditDialogOpen}
        onClose={handleCloseAuditDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Document Audit Trail</DialogTitle>
        <DialogContent>
          {auditLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : auditData ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Document Hash
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2, wordBreak: 'break-all' }}>
                {auditData.documentHash}
              </Typography>

              <Typography variant="subtitle2" gutterBottom>
                Events
              </Typography>
              {auditData.events?.map((event, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>{event.type.replace('_', ' ').toUpperCase()}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(event.timestamp)} by {formatAddress(event.actor)}
                  </Typography>
                  {event.details && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {JSON.stringify(event.details, null, 2)}
                    </Typography>
                  )}
                </Box>
              ))}

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
                Statistics
              </Typography>
              <Typography variant="body2">
                <strong>Verification Count:</strong> {auditData.statistics?.verificationCount || 0}
              </Typography>
              <Typography variant="body2">
                <strong>Last Verified:</strong> {auditData.statistics?.lastVerified ? formatDate(auditData.statistics.lastVerified) : 'Never'}
              </Typography>
              <Typography variant="body2">
                <strong>Document Age:</strong> {auditData.statistics?.age || 0} days
              </Typography>
            </Box>
          ) : (
            <Typography>No audit data available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAuditDialog}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VerificationHistory;