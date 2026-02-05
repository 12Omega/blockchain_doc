import React, { useState, useEffect } from 'react';
import monitoringService from '../../services/monitoringService';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh every 30 seconds if enabled
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadDashboardData();
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('authToken'); // Fixed: use 'authToken' instead of 'token'
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await monitoringService.getDashboard(token);
      setDashboardData(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return '#4caf50';
      case 'degraded':
        return '#ff9800';
      case 'critical':
      case 'error':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return '✓';
      case 'degraded':
        return '⚠';
      case 'critical':
      case 'error':
        return '✗';
      default:
        return '?';
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={loadDashboardData}>Retry</button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { health, alerts, system, services } = dashboardData;

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>System Monitoring Dashboard</h1>
        <div className="dashboard-controls">
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (30s)
          </label>
          <button onClick={loadDashboardData} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className="status-overview">
        <div className="status-card" style={{ borderColor: getStatusColor(health.status) }}>
          <div className="status-icon" style={{ color: getStatusColor(health.status) }}>
            {getStatusIcon(health.status)}
          </div>
          <div className="status-info">
            <h2>System Status</h2>
            <p className="status-value">{health.status.toUpperCase()}</p>
            <p className="status-detail">Uptime: {formatUptime(system.uptime)}</p>
          </div>
        </div>

        <div className="status-card">
          <div className="status-icon">🚨</div>
          <div className="status-info">
            <h2>Active Alerts</h2>
            <p className="status-value">{alerts.open}</p>
            <p className="status-detail critical">Critical: {alerts.critical}</p>
          </div>
        </div>

        <div className="status-card">
          <div className="status-icon">💾</div>
          <div className="status-info">
            <h2>Memory Usage</h2>
            <p className="status-value">{system.memory.usagePercent}%</p>
            <p className="status-detail">
              {formatBytes(system.memory.used)} / {formatBytes(system.memory.total)}
            </p>
          </div>
        </div>

        <div className="status-card">
          <div className="status-icon">⚙️</div>
          <div className="status-info">
            <h2>Environment</h2>
            <p className="status-value">{system.environment}</p>
            <p className="status-detail">{system.nodeVersion}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={selectedTab === 'overview' ? 'active' : ''}
          onClick={() => setSelectedTab('overview')}
        >
          Overview
        </button>
        <button
          className={selectedTab === 'services' ? 'active' : ''}
          onClick={() => setSelectedTab('services')}
        >
          Services
        </button>
        <button
          className={selectedTab === 'alerts' ? 'active' : ''}
          onClick={() => setSelectedTab('alerts')}
        >
          Alerts {alerts.open > 0 && `(${alerts.open})`}
        </button>
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {selectedTab === 'overview' && (
          <div className="overview-tab">
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>Database</h3>
                <div className="metric-status" style={{ color: getStatusColor(health.database.connected ? 'healthy' : 'critical') }}>
                  {health.database.connected ? 'Connected' : 'Disconnected'}
                </div>
                <p>State: {health.database.state}</p>
              </div>

              <div className="metric-card">
                <h3>Cache</h3>
                <div className="metric-status" style={{ color: getStatusColor(health.cache.connected ? 'healthy' : 'critical') }}>
                  {health.cache.connected ? 'Connected' : 'Disconnected'}
                </div>
                {health.cache.hitRate && (
                  <p>Hit Rate: {(health.cache.hitRate * 100).toFixed(1)}%</p>
                )}
              </div>

              <div className="metric-card">
                <h3>Performance</h3>
                {health.metrics && health.metrics.length > 0 ? (
                  <div>
                    <p>Metrics tracked: {health.metrics.length}</p>
                  </div>
                ) : (
                  <p>No recent metrics</p>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'services' && (
          <div className="services-tab">
            <div className="service-section">
              <h3>IPFS Storage</h3>
              <div className="service-status" style={{ color: getStatusColor(services.ipfs.status) }}>
                {getStatusIcon(services.ipfs.status)} {services.ipfs.status.toUpperCase()}
              </div>
              <p>{services.ipfs.message}</p>
              {services.ipfs.providers && (
                <div className="provider-list">
                  {Object.entries(services.ipfs.providers).map(([name, provider]) => (
                    <div key={name} className="provider-item">
                      <span className="provider-name">{name}</span>
                      <span
                        className="provider-status"
                        style={{ color: provider.available ? '#4caf50' : '#f44336' }}
                      >
                        {provider.available ? '✓ Available' : '✗ Unavailable'}
                      </span>
                      {provider.responseTime && (
                        <span className="provider-detail">{provider.responseTime}ms</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {services.ipfs.queueLength > 0 && (
                <div className="queue-info">
                  <p>⏳ Queue: {services.ipfs.queueLength} items pending</p>
                </div>
              )}
            </div>

            <div className="service-section">
              <h3>Blockchain</h3>
              <div className="service-status" style={{ color: getStatusColor(services.blockchain.status) }}>
                {getStatusIcon(services.blockchain.status)} {services.blockchain.status.toUpperCase()}
              </div>
              <p>{services.blockchain.message}</p>
              {services.blockchain.blockNumber && (
                <p>Block: #{services.blockchain.blockNumber}</p>
              )}
              {services.blockchain.responseTime && (
                <p>Response Time: {services.blockchain.responseTime}ms</p>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'alerts' && (
          <div className="alerts-tab">
            {alerts.recent && alerts.recent.length > 0 ? (
              <div className="alerts-list">
                {alerts.recent.map((alert) => (
                  <div key={alert._id} className="alert-item" data-severity={alert.severity}>
                    <div className="alert-header">
                      <span className="alert-type">{alert.alertType.replace(/_/g, ' ')}</span>
                      <span className={`alert-severity ${alert.severity}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="alert-description">{alert.description}</p>
                    <div className="alert-footer">
                      <span className="alert-time">
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                      <span className="alert-status">{alert.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-alerts">
                <p>✓ No active alerts</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
