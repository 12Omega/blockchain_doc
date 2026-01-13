System Monitoring and Health Checks

This document describes the comprehensive monitoring and health check system implemented for the Academic Document Blockchain Verification System.

Overview

The monitoring system provides real-time visibility into system health, performance metrics, security alerts, and service status. It includes automated health checks, performance tracking, error logging, and an admin dashboard for system oversight.

Features

1. Health Check Endpoints

Public Health Check
- Endpoint: `GET /health`
- Access: Public
- Purpose: Basic system health status
- Returns: Overall status, uptime, service availability

Comprehensive Health Check
- Endpoint: `GET /api/monitoring/health`
- Access: Public (basic) / Admin (detailed)
- Purpose: Detailed health status of all services
- Checks:
  - IPFS provider availability
  - Blockchain node connectivity
  - Database connection status
  - Cache service status
  - System resource usage (admin only)

2. Service-Specific Health Checks

IPFS Health
- Endpoint: `GET /api/monitoring/health/ipfs`
- Access: Admin
- Monitors:
  - Provider availability (Web3.Storage, Pinata, NFT.Storage)
  - Response times
  - Upload queue status
  - Enabled providers

Blockchain Health
- Endpoint: `GET /api/monitoring/health/blockchain`
- Access: Admin
- Monitors:
  - Node connectivity
  - Current block number
  - Response time
  - Gas prices
  - Wallet balance
  - Contract initialization status

Database Health
- Endpoint: `GET /api/monitoring/health/database`
- Access: Admin
- Monitors:
  - Connection status
  - Collection count
  - Data size
  - Storage size
  - Index count

3. Performance Metrics

Metrics Collection
- Endpoint: `GET /api/monitoring/metrics`
- Access: Admin
- Time Ranges: 1h, 24h, 7d, 30d
- Tracks:
  - Response times
  - Memory usage
  - CPU usage
  - Database query times
  - Blockchain transaction times
  - IPFS operation times
  - Error rates
  - Request rates

Automatic Metric Recording
The system automatically records:
- API response times
- Error occurrences
- System resource usage (every 5 minutes)
- Database connection status
- Service availability

4. Security Alerts

Alert Types
- Brute force attempts
- Suspicious login patterns
- Multiple failed attempts
- Unusual access patterns
- SQL injection attempts
- XSS attempts
- Command injection attempts
- Rate limit exceeded
- Unauthorized admin access
- System resource exhaustion
- Database connection failures
- Blockchain interaction failures

Alert Management
- Endpoint: `GET /api/monitoring/alerts`
- Access: Admin
- Features:
  - Filter by severity (low, medium, high, critical)
  - Filter by status (open, investigating, resolved)
  - Filter by alert type
  - Automatic alert cooldowns to prevent spam
  - Alert notifications for high/critical issues

Update Alerts
- Endpoint: `PUT /api/monitoring/alerts/:alertId`
- Access: Admin
- Actions:
  - Mark as resolved
  - Mark as investigating
  - Mark as false positive
  - Add resolution notes

5. System Information

Resource Usage
- Endpoint: `GET /api/monitoring/system`
- Access: Admin
- Provides:
  - Memory usage (heap, RSS, external)
  - CPU usage
  - Process uptime
  - Platform information
  - Node.js version
  - Environment

6. Logging

Log Access
- Endpoint: `GET /api/monitoring/logs`
- Access: Admin
- Types:
  - Application logs (`app.log`)
  - Error logs (`error.log`)
- Features:
  - Configurable line count
  - Real-time log viewing
  - Log rotation (automatic cleanup after 30 days)

Log Levels
- INFO: General information
- WARN: Warning messages
- ERROR: Error messages
- DEBUG: Debug information (development only)

7. Admin Dashboard

Dashboard Data
- Endpoint: `GET /api/monitoring/dashboard`
- Access: Admin
- Provides:
  - System health summary
  - Recent alerts
  - System resource usage
  - Service status
  - Performance metrics

Frontend Dashboard
- Component: `AdminDashboard`
- Features:
  - Real-time status overview
  - Auto-refresh (30 seconds)
  - Service health visualization
  - Alert management
  - Color-coded status indicators
  - Responsive design

Health Status Levels

Overall System Status
- healthy: All services operational
- degraded: Some services experiencing issues
- critical: Major service failures
- error: System error occurred

Service Status
- healthy: Service fully operational
- degraded: Service partially operational
- critical: Service unavailable
- error: Service error

Alert Severity Levels

- low: Minor issues, no immediate action required
- medium: Issues requiring attention
- high: Serious issues requiring prompt action
- critical: Critical issues requiring immediate action

Automated Monitoring Tasks

Periodic Tasks
1. System Metrics Recording (every 5 minutes)
   - Memory usage
   - CPU usage
   - Database connection status

2. Metrics Cleanup (every hour)
   - Remove metrics older than 30 days

3. Alert Cooldown Reset (every hour)
   - Clear alert cooldowns to allow new alerts

Performance Thresholds
- Response time: 5 seconds
- Error rate: 5%
- Failed login attempts: 5 in 15 minutes
- Memory usage: 85%
- CPU usage: 80%

Security Monitoring

Brute Force Detection
- Tracks failed authentication attempts per IP
- Threshold: 5 attempts in 15 minutes
- Creates high-severity alert

Suspicious Pattern Detection
- SQL injection patterns
- XSS patterns
- Command injection patterns
- Creates high-severity alert on detection

Rate Limiting
- Monitors request rates per IP
- Threshold: 100 requests per minute
- Creates medium-severity alert

Integration with Existing Services

IPFS Service
- Health check method: `checkIPFSHealth()`
- Queue status: `getQueueStatus()`
- Provider list: `getEnabledProviders()`

Blockchain Service
- Health check method: `healthCheck()`
- Network info: `getNetworkInfo()`
- Gas price monitoring
- Block number tracking

Cache Service
- Health check: `healthCheck()`
- Statistics: `getStats()`
- Hit rate tracking

Database Service
- Connection monitoring
- Performance statistics
- Query optimization tracking

Usage Examples

Check System Health
```bash
curl http://localhost:3001/api/monitoring/health
```

Get Performance Metrics (Last 24 Hours)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/monitoring/metrics?timeRange=24h
```

Get Active Alerts
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/monitoring/alerts?status=open&severity=critical
```

Resolve an Alert
```bash
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"resolved","resolution":"Issue fixed by restarting service"}' \
  http://localhost:3001/api/monitoring/alerts/ALERT_ID
```

View Recent Logs
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/monitoring/logs?type=error&lines=50"
```

Frontend Integration

Using the Monitoring Service
```javascript
import monitoringService from './services/monitoringService';

// Get health status
const health = await monitoringService.getHealth();

// Get dashboard data (requires auth token)
const token = localStorage.getItem('token');
const dashboard = await monitoringService.getDashboard(token);

// Get alerts
const alerts = await monitoringService.getAlerts(token, {
  severity: 'critical',
  status: 'open'
});
```

Using the Admin Dashboard Component
```javascript
import AdminDashboard from './components/AdminDashboard';

function App() {
  return (
    <div>
      <AdminDashboard />
    </div>
  );
}
```

Best Practices

For Administrators
1. Check the dashboard regularly
2. Respond to critical alerts promptly
3. Review error logs weekly
4. Monitor resource usage trends
5. Keep alert thresholds updated

For Developers
1. Use appropriate log levels
2. Include context in error messages
3. Handle errors gracefully
4. Monitor performance metrics
5. Test health check endpoints

Troubleshooting

High Memory Usage
1. Check for memory leaks
2. Review recent code changes
3. Restart the service if necessary
4. Monitor for recurrence

Service Unavailable
1. Check service logs
2. Verify network connectivity
3. Check API keys and credentials
4. Restart affected service

High Alert Volume
1. Review alert thresholds
2. Check for false positives
3. Investigate root cause
4. Adjust monitoring rules if needed

Future Enhancements

1. Email Notifications: Send alerts via email
2. Slack Integration: Post alerts to Slack channels
3. SMS Alerts: Critical alerts via SMS
4. Grafana Integration: Advanced visualization
5. Prometheus Metrics: Export metrics for Prometheus
6. Custom Dashboards: User-configurable dashboards
7. Historical Analysis: Long-term trend analysis
8. Predictive Alerts: ML-based anomaly detection

Setting Things Up

Environment Variables
```env
Monitoring Setting Things Up
MONITORING_ENABLED=true
ALERT_EMAIL=admin@example.com
ALERT_SLACK_WEBHOOK=https://hooks.slack.com/...
METRICS_RETENTION_DAYS=30
LOG_LEVEL=info
```

Alert Thresholds
Edit `backend/utils/monitoring.js` to adjust thresholds:
```javascript
this.alertThresholds = {
  response_time: 5000,        // 5 seconds
  error_rate: 0.05,           // 5%
  failed_login_attempts: 5,
  concurrent_failed_attempts: 3,
  memory_usage: 0.85,         // 85%
  cpu_usage: 0.80             // 80%
};
```

Support

For issues or questions about the monitoring system:
1. Check the logs: `/api/monitoring/logs`
2. Review the dashboard: `/api/monitoring/dashboard`
3. Check service health: `/api/monitoring/health`
4. Contact system administrator

License

This monitoring system is part of the Academic Document Blockchain Verification System.

