const redis = require('redis');
const logger = require('../utils/logger');

/**
 * Redis caching service for performance optimization
 */

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour default TTL
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    
    this.initialize();
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 2000,
          reconnectStrategy: false // Disable automatic reconnection
        }
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.info('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      
    } catch (error) {
      logger.warn('Redis not available. Caching disabled. Application will continue without cache.');
      this.isConnected = false;
      this.client = null; // Clear client to prevent further connection attempts
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable() {
    return this.isConnected && this.client && this.client.isReady;
  }

  /**
   * Generate cache key with namespace
   */
  generateKey(namespace, key) {
    return `blockchain_doc:${namespace}:${key}`;
  }

  /**
   * Set value in cache
   */
  async set(namespace, key, value, ttl = this.defaultTTL) {
    if (!this.isAvailable()) {
      logger.warn('Cache not available, skipping set operation');
      return false;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const serializedValue = JSON.stringify(value);
      
      await this.client.setEx(cacheKey, ttl, serializedValue);
      
      logger.debug('Cache set successful:', { namespace, key, ttl });
      return true;
    } catch (error) {
      logger.error('Cache set failed:', { error: error.message, namespace, key });
      return false;
    }
  }

  /**
   * Get value from cache
   */
  async get(namespace, key) {
    if (!this.isAvailable()) {
      logger.warn('Cache not available, skipping get operation');
      return null;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const cachedValue = await this.client.get(cacheKey);
      
      if (cachedValue === null) {
        logger.debug('Cache miss:', { namespace, key });
        return null;
      }

      const parsedValue = JSON.parse(cachedValue);
      logger.debug('Cache hit:', { namespace, key });
      return parsedValue;
    } catch (error) {
      logger.error('Cache get failed:', { error: error.message, namespace, key });
      return null;
    }
  }

  /**
   * Delete value from cache
   */
  async del(namespace, key) {
    if (!this.isAvailable()) {
      logger.warn('Cache not available, skipping delete operation');
      return false;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const result = await this.client.del(cacheKey);
      
      logger.debug('Cache delete successful:', { namespace, key, deleted: result });
      return result > 0;
    } catch (error) {
      logger.error('Cache delete failed:', { error: error.message, namespace, key });
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(namespace, pattern) {
    if (!this.isAvailable()) {
      logger.warn('Cache not available, skipping pattern delete operation');
      return 0;
    }

    try {
      const searchPattern = this.generateKey(namespace, pattern);
      const keys = await this.client.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client.del(keys);
      logger.debug('Cache pattern delete successful:', { namespace, pattern, deleted: result });
      return result;
    } catch (error) {
      logger.error('Cache pattern delete failed:', { error: error.message, namespace, pattern });
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(namespace, key) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const exists = await this.client.exists(cacheKey);
      return exists === 1;
    } catch (error) {
      logger.error('Cache exists check failed:', { error: error.message, namespace, key });
      return false;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(namespace, key, ttl) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const result = await this.client.expire(cacheKey, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire failed:', { error: error.message, namespace, key, ttl });
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(namespace, key) {
    if (!this.isAvailable()) {
      return -1;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      return await this.client.ttl(cacheKey);
    } catch (error) {
      logger.error('Cache TTL check failed:', { error: error.message, namespace, key });
      return -1;
    }
  }

  /**
   * Increment a numeric value in cache
   */
  async incr(namespace, key, amount = 1) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const result = await this.client.incrBy(cacheKey, amount);
      return result;
    } catch (error) {
      logger.error('Cache increment failed:', { error: error.message, namespace, key, amount });
      return null;
    }
  }

  /**
   * Set multiple values at once
   */
  async mset(namespace, keyValuePairs, ttl = this.defaultTTL) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const pipeline = this.client.multi();
      
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const cacheKey = this.generateKey(namespace, key);
        const serializedValue = JSON.stringify(value);
        pipeline.setEx(cacheKey, ttl, serializedValue);
      });

      await pipeline.exec();
      logger.debug('Cache mset successful:', { namespace, count: Object.keys(keyValuePairs).length });
      return true;
    } catch (error) {
      logger.error('Cache mset failed:', { error: error.message, namespace });
      return false;
    }
  }

  /**
   * Get multiple values at once
   */
  async mget(namespace, keys) {
    if (!this.isAvailable()) {
      return {};
    }

    try {
      const cacheKeys = keys.map(key => this.generateKey(namespace, key));
      const values = await this.client.mGet(cacheKeys);
      
      const result = {};
      keys.forEach((key, index) => {
        if (values[index] !== null) {
          try {
            result[key] = JSON.parse(values[index]);
          } catch (parseError) {
            logger.warn('Failed to parse cached value:', { namespace, key, error: parseError.message });
            result[key] = null;
          }
        } else {
          result[key] = null;
        }
      });

      return result;
    } catch (error) {
      logger.error('Cache mget failed:', { error: error.message, namespace, keys });
      return {};
    }
  }

  /**
   * Cache with automatic refresh
   */
  async getOrSet(namespace, key, fetchFunction, ttl = this.defaultTTL) {
    try {
      // Try to get from cache first
      let value = await this.get(namespace, key);
      
      if (value !== null) {
        return value;
      }

      // If not in cache, fetch the value
      value = await fetchFunction();
      
      if (value !== null && value !== undefined) {
        // Store in cache for future requests
        await this.set(namespace, key, value, ttl);
      }

      return value;
    } catch (error) {
      logger.error('Cache getOrSet failed:', { error: error.message, namespace, key });
      // If cache fails, still try to fetch the value
      try {
        return await fetchFunction();
      } catch (fetchError) {
        logger.error('Fetch function failed in getOrSet:', { error: fetchError.message, namespace, key });
        throw fetchError;
      }
    }
  }

  /**
   * Invalidate cache for a specific namespace
   */
  async invalidateNamespace(namespace) {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const pattern = `blockchain_doc:${namespace}:*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client.del(keys);
      logger.info('Cache namespace invalidated:', { namespace, deleted: result });
      return result;
    } catch (error) {
      logger.error('Cache namespace invalidation failed:', { error: error.message, namespace });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        connected: this.isConnected,
        memory: info,
        keyspace: keyspace,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * Flush all cache data (use with caution)
   */
  async flushAll() {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client.flushAll();
      logger.warn('Cache flushed - all data cleared');
      return true;
    } catch (error) {
      logger.error('Cache flush failed:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('Redis connection closed');
      } catch (error) {
        logger.error('Error closing Redis connection:', error);
      }
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.isAvailable()) {
      return { status: 'unhealthy', message: 'Redis not connected' };
    }

    try {
      const testKey = 'health_check';
      const testValue = Date.now().toString();
      
      await this.set('health', testKey, testValue, 10);
      const retrieved = await this.get('health', testKey);
      await this.del('health', testKey);
      
      if (retrieved === testValue) {
        return { status: 'healthy', message: 'Redis working correctly' };
      } else {
        return { status: 'unhealthy', message: 'Redis data integrity issue' };
      }
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;