import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Monitoring Service
 * Provides methods to fetch system health and monitoring data
 */

class MonitoringService {
  /**
   * Get comprehensive health check
   */
  async getHealth() {
    try {
      const response = await axios.get(`${API_URL}/monitoring/health`);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  /**
   * Get IPFS provider health
   */
  async getIPFSHealth(token) {
    try {
      const response = await axios.get(`${API_URL}/monitoring/health/ipfs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('IPFS health check failed:', error);
      throw error;
    }
  }

  /**
   * Get blockchain health
   */
  async getBlockchainHealth(token) {
    try {
      const response = await axios.get(`${API_URL}/monitoring/health/blockchain`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Blockchain health check failed:', error);
      throw error;
    }
  }

  /**
   * Get database health
   */
  async getDatabaseHealth(token) {
    try {
      const response = await axios.get(`${API_URL}/monitoring/health/database`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Database health check failed:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getMetrics(token, timeRange = '1h') {
    try {
      const response = await axios.get(`${API_URL}/monitoring/metrics`, {
        params: { timeRange },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get metrics:', error);
      throw error;
    }
  }

  /**
   * Get security alerts
   */
  async getAlerts(token, filters = {}) {
    try {
      const response = await axios.get(`${API_URL}/monitoring/alerts`, {
        params: filters,
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get alerts:', error);
      throw error;
    }
  }

  /**
   * Update alert status
   */
  async updateAlert(token, alertId, status, resolution) {
    try {
      const response = await axios.put(
        `${API_URL}/monitoring/alerts/${alertId}`,
        { status, resolution },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to update alert:', error);
      throw error;
    }
  }

  /**
   * Get system resource usage
   */
  async getSystemInfo(token) {
    try {
      const response = await axios.get(`${API_URL}/monitoring/system`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get system info:', error);
      throw error;
    }
  }

  /**
   * Get recent logs
   */
  async getLogs(token, type = 'app', lines = 100) {
    try {
      const response = await axios.get(`${API_URL}/monitoring/logs`, {
        params: { type, lines },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get logs:', error);
      throw error;
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboard(token) {
    try {
      const response = await axios.get(`${API_URL}/monitoring/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      throw error;
    }
  }
}

export default new MonitoringService();
