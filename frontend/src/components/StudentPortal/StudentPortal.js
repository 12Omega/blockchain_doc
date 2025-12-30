import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Description as DocumentIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import MyDocuments from './MyDocuments';
import AccessManagement from './AccessManagement';
import AccessLogs from './AccessLogs';

const StudentPortal = () => {
  const { user, isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">
          Please connect your wallet to access the Student Portal
        </Alert>
      </Container>
    );
  }

  if (loading) {
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
          Student Portal
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your academic documents and access permissions
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="student portal tabs">
          <Tab
            icon={<DocumentIcon />}
            label="My Documents"
            iconPosition="start"
          />
          <Tab
            icon={<SecurityIcon />}
            label="Access Management"
            iconPosition="start"
          />
          <Tab
            icon={<HistoryIcon />}
            label="Access Logs"
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <Box>
        {currentTab === 0 && <MyDocuments />}
        {currentTab === 1 && <AccessManagement />}
        {currentTab === 2 && <AccessLogs />}
      </Box>
    </Container>
  );
};

export default StudentPortal;
