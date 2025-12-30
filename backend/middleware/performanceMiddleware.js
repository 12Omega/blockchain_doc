const { monitoring } = require('../utils/monitoring');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * Performance monitoring and optimization middleware
 */

/**
 * Request timing middleware
 */
const requestTiming = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  req.startTime = startTime;
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Record response time
    monitoring.recordResponseTime(req, res, responseTime);
    
    // Log slow requests
    if (responseTime > 1000) { // > 1 second
      logger.warn('Slow request detected:', {
        method: req.method,
        url: req.originalUrl,
        responseTime: `${responseTime.toFixed(2)}ms`,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }
    
    // Add response time header
    res.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);
    
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Response caching middleware
 */
const responseCache = (options = {}) => {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req) => `${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`,
    skipCache = () => false,
    onlyStatus = [200],
    namespace = 'api_responses'
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests by default
    if (req.method !== 'GET' || skipCache(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);
    
    try {
      // Try to get cached response
      const cachedResponse = await cacheService.get(namespace, cacheKey);
      
      if (cachedResponse) {
        logger.debug('Response served from cache:', {
          method: req.method,
          url: req.originalUrl,
          cacheKey
        });
        
        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
        // Send cached response
        return res.status(cachedResponse.statusCode)
          .set(cachedResponse.headers)
          .send(cachedResponse.body);
      }
      
      // Cache miss - intercept response
      const originalSend = res.send;
      const originalJson = res.json;
      
      res.send = function(body) {
        // Cache successful responses
        if (onlyStatus.includes(res.statusCode)) {
          const responseToCache = {
            statusCode: res.statusCode,
            headers: res.getHeaders(),
            body: body,
            timestamp: new Date()
          };
          
          cacheService.set(namespace, cacheKey, responseToCache, ttl)
            .catch(error => {
              logger.error('Failed to cache response:', {
                error: error.message,
                cacheKey
              });
            });
        }
        
        res.set('X-Cache', 'MISS');
        return originalSend.call(this, body);
      };
      
      res.json = function(obj) {
        // Cache successful JSON responses
        if (onlyStatus.includes(res.statusCode)) {
          const responseToCache = {
            statusCode: res.statusCode,
            headers: res.getHeaders(),
            body: obj,
            timestamp: new Date()
          };
          
          cacheService.set(namespace, cacheKey, responseToCache, ttl)
            .catch(error => {
              logger.error('Failed to cache JSON response:', {
                error: error.message,
                cacheKey
              });
            });
        }
        
        res.set('X-Cache', 'MISS');
        return originalJson.call(this, obj);
      };
      
    } catch (error) {
      logger.error('Cache middleware error:', {
        error: error.message,
        cacheKey
      });
    }
    
    next();
  };
};

/**
 * Request compression middleware
 */
const requestCompression = (req, res, next) => {
  // Add compression headers for responses
  const acceptEncoding = req.get('Accept-Encoding') || '';
  
  if (acceptEncoding.includes('gzip')) {
    res.set('Content-Encoding', 'gzip');
  } else if (acceptEncoding.includes('deflate')) {
    res.set('Content-Encoding', 'deflate');
  }
  
  next();
};

/**
 * Memory usage monitoring middleware
 */
const memoryMonitoring = (req, res, next) => {
  const memUsage = process.memoryUsage();
  
  // Log memory warnings
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
  const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100;
  
  if (memoryUsagePercent > 80) {
    logger.warn('High memory usage detected:', {
      heapUsed: `${heapUsedMB.toFixed(2)}MB`,
      heapTotal: `${heapTotalMB.toFixed(2)}MB`,
      usagePercent: `${memoryUsagePercent.toFixed(2)}%`,
      endpoint: req.originalUrl
    });
  }
  
  // Add memory usage headers in development
  if (process.env.NODE_ENV === 'development') {
    res.set('X-Memory-Usage', `${heapUsedMB.toFixed(2)}MB`);
    res.set('X-Memory-Total', `${heapTotalMB.toFixed(2)}MB`);
  }
  
  next();
};

/**
 * Database query optimization middleware
 */
const queryOptimization = (req, res, next) => {
  // Add query hints to request for database optimization
  req.queryHints = {
    useCache: true,
    cacheTTL: 300,
    lean: true, // Use lean queries for better performance
    limit: parseInt(req.query.limit) || 100, // Default limit
    skip: parseInt(req.query.skip) || 0
  };
  
  // Override query limit if too high
  if (req.queryHints.limit > 1000) {
    req.queryHints.limit = 1000;
    logger.warn('Query limit capped at 1000:', {
      originalLimit: req.query.limit,
      endpoint: req.originalUrl
    });
  }
  
  next();
};

/**
 * API rate limiting with performance tracking
 */
const performanceRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  const requestCounts = new Map();
  
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    if (requestCounts.has(key)) {
      const requests = requestCounts.get(key);
      requestCounts.set(key, requests.filter(time => time > windowStart));
    }
    
    // Get current request count
    const currentRequests = requestCounts.get(key) || [];
    
    if (currentRequests.length >= maxRequests) {
      logger.warn('Rate limit exceeded:', {
        ip: key,
        requests: currentRequests.length,
        maxRequests,
        endpoint: req.originalUrl
      });
      
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    // Add current request
    currentRequests.push(now);
    requestCounts.set(key, currentRequests);
    
    // Add rate limit headers
    res.set('X-RateLimit-Limit', maxRequests.toString());
    res.set('X-RateLimit-Remaining', (maxRequests - currentRequests.length).toString());
    res.set('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
    
    next();
  };
};

/**
 * Request size optimization middleware
 */
const requestSizeOptimization = (maxSize = 10 * 1024 * 1024) => { // 10MB default
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length')) || 0;
    
    if (contentLength > maxSize) {
      logger.warn('Request size too large:', {
        contentLength: `${(contentLength / 1024 / 1024).toFixed(2)}MB`,
        maxSize: `${(maxSize / 1024 / 1024).toFixed(2)}MB`,
        endpoint: req.originalUrl
      });
      
      return res.status(413).json({
        error: 'Request entity too large',
        maxSize: `${(maxSize / 1024 / 1024).toFixed(2)}MB`
      });
    }
    
    next();
  };
};

/**
 * Response optimization middleware
 */
const responseOptimization = (req, res, next) => {
  // Add performance headers
  res.set('X-Powered-By', 'Blockchain Document System');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-Content-Type-Options', 'nosniff');
  
  // Enable keep-alive
  res.set('Connection', 'keep-alive');
  
  // Add cache control for static resources
  if (req.originalUrl.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
  }
  
  next();
};

/**
 * Performance metrics collection middleware
 */
const metricsCollection = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to collect metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Collect metrics
    monitoring.recordMetric('response_time', responseTime, 'ms', {
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
      userId: req.user?.walletAddress
    });
    
    // Record error metrics
    if (res.statusCode >= 400) {
      monitoring.recordError(req, new Error(`HTTP ${res.statusCode}`), res.statusCode);
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Health check endpoint optimization
 */
const healthCheckOptimization = (req, res, next) => {
  if (req.originalUrl === '/health' || req.originalUrl === '/api/health') {
    // Skip heavy middleware for health checks
    req.skipCache = true;
    req.skipAuth = true;
    req.skipValidation = true;
  }
  
  next();
};

module.exports = {
  requestTiming,
  responseCache,
  requestCompression,
  memoryMonitoring,
  queryOptimization,
  performanceRateLimit,
  requestSizeOptimization,
  responseOptimization,
  metricsCollection,
  healthCheckOptimization
};