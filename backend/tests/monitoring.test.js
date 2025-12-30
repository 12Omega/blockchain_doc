const request = require('supertest');
const app = require('../server');
const { monitoring } = require('../utils/monitoring');

describe('Monitoring Endpoints', () => {
  describe('GET /api/monitoring/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/monitoring/health')
        .expect('Content-Type', /json/);

      expect(response.status).toBeLessThanOrEqual(503);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('ipfs');
      expect(response.body.services).toHaveProperty('blockchain');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('cache');
    });

    it('should include service status information', async () => {
      const response = await request(app)
        .get('/api/monitoring/health');

      const { services } = response.body;
      
      // Each service should have a status
      expect(services.ipfs).toHaveProperty('status');
      expect(services.blockchain).toHaveProperty('status');
      expect(services.database).toHaveProperty('status');
      expect(services.cache).toHaveProperty('status');
    });
  });

  describe('GET /api/monitoring/system', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/monitoring/system')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/monitoring/metrics', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/monitoring/alerts', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/monitoring/alerts')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/monitoring/dashboard', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/monitoring/dashboard')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Monitoring System', () => {
    it('should record metrics', async () => {
      const metric = await monitoring.recordMetric(
        'response_time',
        150,
        'ms',
        { endpoint: '/test', method: 'GET' }
      );

      expect(metric).toBeDefined();
      expect(metric.metricType).toBe('response_time');
      expect(metric.value).toBe(150);
      expect(metric.unit).toBe('ms');
    });

    it('should get system health', async () => {
      const health = await monitoring.getSystemHealth();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('metrics');
      expect(health).toHaveProperty('alerts');
      expect(health).toHaveProperty('database');
    });

    it('should generate monitoring report', async () => {
      const startDate = new Date(Date.now() - 3600000); // 1 hour ago
      const endDate = new Date();

      const report = await monitoring.generateMonitoringReport(startDate, endDate);

      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('performance');
      expect(report).toHaveProperty('security');
      expect(report).toHaveProperty('generatedAt');
      expect(report.period.startDate).toEqual(startDate);
      expect(report.period.endDate).toEqual(endDate);
    });
  });
});
