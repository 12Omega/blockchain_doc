import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Tab,
  Tabs,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CloudUpload,
  Verified,
  Description,
  People,
  Settings,
  MoreVert,
  TrendingUp,
  CheckCircle,
  Pending,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import documentService from '../../services/documentService';
import EnhancedDocumentUpload from '../DocumentUpload/EnhancedDocumentUpload';
import EnhancedVerification from '../DocumentVerification/EnhancedVerification';

const UnifiedDashboard = () => {
  const { user, isAdmin, isIssuer, isVerifier, isStudent } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    verifiedDocuments: 0,
    pendingDocuments: 0,
    recentActivity: [],
  });
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load documents based on role
      let docs = [];
      if (isIssuer() || isAdmin()) {
        docs = await documentService.getMyDocuments();
      } else if (isStudent()) {
        docs = await documentService.getReceivedDocuments();
      }
      
      setDocuments(docs);
      
      // Calculate stats
      setStats({
        totalDocuments: docs.length,
        verifiedDocuments: docs.filter(d => d.status === 'verified').length,
        pendingDocuments: docs.filter(d => d.status === 'pending').length,
        recentActivity: docs.slice(0, 5),
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color = 'primary' }) => (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const renderOverview = () => (
    <Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Documents"
            value={stats.totalDocuments}
            icon={<Description />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Verified"
            value={stats.verifiedDocuments}
            icon={<CheckCircle />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending"
            value={stats.pendingDocuments}
            icon={<Pending />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Success Rate"
            value={stats.totalDocuments > 0 
              ? `${Math.round((stats.verifiedDocuments / stats.totalDocuments) * 100)}%`
              : '0%'}
            icon={<TrendingUp />}
            color="info"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {stats.recentActivity.length > 0 ? (
              <List>
                {stats.recentActivity.map((doc, index) => (
                  <React.Fragment key={doc._id || index}>
                    <ListItem
                      secondaryAction={
                        <Chip
                          label={doc.status || 'pending'}
                          size="small"
                          color={doc.status === 'verified' ? 'success' : 'warning'}
                        />
                      }
                    >
                      <ListItemAvatar>
                        <Avatar>
                          <Description />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={doc.metadata?.title || 'Untitled Document'}
                        secondary={`${doc.documentType || 'Unknown'} • ${new Date(doc.createdAt).toLocaleDateString()}`}
                      />
                    </ListItem>
                    {index < stats.recentActivity.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No recent activity
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(isIssuer() || isAdmin()) && (
                <Button
                  variant="contained"
                  startIcon={<CloudUpload />}
                  onClick={() => setTabValue(1)}
                  fullWidth
                >
                  Upload Document
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<Verified />}
                onClick={() => setTabValue(2)}
                fullWidth
              >
                Verify Document
              </Button>
              <Button
                variant="outlined"
                startIcon={<Description />}
                onClick={() => {/* View documents - handled by parent */}}
                fullWidth
              >
                View All Documents
              </Button>
            </Box>
          </Paper>

          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Profile
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                {user?.walletAddress?.slice(0, 2).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="subtitle1">
                  {user?.name || 'User'}
                </Typography>
                <Chip label={user?.role || 'student'} size="small" color="primary" />
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {user?.walletAddress}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DashboardIcon /> Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.name || 'User'}! Manage your documents and verify authenticity.
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<DashboardIcon />} label="Overview" />
          {(isIssuer() || isAdmin()) && <Tab icon={<CloudUpload />} label="Upload" />}
          <Tab icon={<Verified />} label="Verify" />
          <Tab icon={<Description />} label="Documents" />
        </Tabs>
      </Paper>

      <Box>
        {tabValue === 0 && renderOverview()}
        {tabValue === 1 && (isIssuer() || isAdmin()) && (
          <EnhancedDocumentUpload onUploadSuccess={loadDashboardData} />
        )}
        {tabValue === (isIssuer() || isAdmin() ? 2 : 1) && <EnhancedVerification />}
        {tabValue === (isIssuer() || isAdmin() ? 3 : 2) && (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              My Documents
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {documents.length > 0 ? (
              <List>
                {documents.map((doc, index) => (
                  <React.Fragment key={doc._id || index}>
                    <ListItem
                      button
                      onClick={() => {/* View document details */}}
                      secondaryAction={
                        <Chip
                          label={doc.status || 'pending'}
                          size="small"
                          color={doc.status === 'verified' ? 'success' : 'warning'}
                        />
                      }
                    >
                      <ListItemAvatar>
                        <Avatar>
                          <Description />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={doc.metadata?.title || 'Untitled Document'}
                        secondary={`${doc.documentType || 'Unknown'} • ${new Date(doc.createdAt).toLocaleDateString()}`}
                      />
                    </ListItem>
                    {index < documents.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No documents found
              </Typography>
            )}
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default UnifiedDashboard;
