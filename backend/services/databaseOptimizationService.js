const mongoose = require('mongoose');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

/**
 * Database optimization service for improved performance
 */

class DatabaseOptimizationService {
  constructor() {
    this.queryCache = new Map();
    this.connectionPool = null;
    this.queryStats = {
      totalQueries: 0,
      cachedQueries: 0,
      slowQueries: 0,
      averageResponseTime: 0
    };
    
    this.initializeOptimizations();
  }

  /**
   * Initialize database optimizations
   */
  initializeOptimizations() {
    // Set up connection pool optimization
    this.setupConnectionPool();
    
    // Set up query monitoring
    this.setupQueryMonitoring();
    
    // Set up automatic indexing only after connection is ready
    mongoose.connection.once('connected', () => {
      this.setupIndexing();
    });
  }

  /**
   * Setup optimized connection pool
   */
  setupConnectionPool() {
    const poolOptions = {
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
      minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 2,
      maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME) || 30000,
      serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 5000,
      socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true
    };

    // Store pool options for use in connection
    this.poolOptions = poolOptions;
    
    logger.info('Database connection pool configured:', poolOptions);
  }

  /**
   * Setup query monitoring and optimization
   */
  setupQueryMonitoring() {
    // Skip in test environment to avoid conflicts
    if (process.env.NODE_ENV === 'test') {
      logger.debug('Query monitoring disabled in test environment');
      return;
    }

    // Monitor slow queries
    mongoose.set('debug', (collectionName, method, query, doc, options) => {
      const startTime = Date.now();
      
      // Log slow queries (> 100ms)
      setTimeout(() => {
        const duration = Date.now() - startTime;
        if (duration > 100) {
          this.queryStats.slowQueries++;
          logger.warn('Slow query detected:', {
            collection: collectionName,
            method,
            query: JSON.stringify(query),
            duration: `${duration}ms`
          });
        }
      }, 0);
    });

    // Track query statistics
    const self = this;
    const originalExec = mongoose.Query.prototype.exec;
    
    // Only patch if not already patched
    if (!mongoose.Query.prototype.exec._isPatched) {
      mongoose.Query.prototype.exec = function() {
        const startTime = Date.now();
        
        return originalExec.call(this).then(result => {
          const duration = Date.now() - startTime;
          
          // Safely update query stats
          if (self && self.queryStats) {
            self.queryStats.totalQueries++;
            self.queryStats.averageResponseTime = 
              (self.queryStats.averageResponseTime + duration) / 2;
          }
          
          return result;
        }).catch(error => {
          // Ensure errors are properly propagated
          throw error;
        });
      };
      
      mongoose.Query.prototype.exec._isPatched = true;
    }
  }

  /**
   * Setup automatic indexing for better performance
   */
  async setupIndexing() {
    try {
      // Ensure indexes are created for all models
      const models = mongoose.modelNames();
      
      for (const modelName of models) {
        const model = mongoose.model(modelName);
        await model.ensureIndexes();
        logger.debug(`Indexes ensured for model: ${modelName}`);
      }
      
      logger.info('Database indexing setup completed');
    } catch (error) {
      logger.error('Failed to setup database indexing:', error);
    }
  }

  /**
   * Optimized find with caching
   */
  async findWithCache(model, query, options = {}) {
    const {
      cache = true,
      cacheTTL = 300, // 5 minutes default
      cacheNamespace = model.modelName.toLowerCase(),
      ...mongoOptions
    } = options;

    const startTime = Date.now();
    
    try {
      // Generate cache key
      const cacheKey = this.generateQueryCacheKey(query, mongoOptions);
      
      // Try cache first if enabled
      if (cache) {
        const cachedResult = await cacheService.get(cacheNamespace, cacheKey);
        if (cachedResult !== null) {
          this.queryStats.cachedQueries++;
          logger.debug('Query served from cache:', { model: model.modelName, cacheKey });
          return cachedResult;
        }
      }

      // Execute database query
      const result = await model.find(query, null, mongoOptions).lean();
      
      // Cache the result if enabled
      if (cache && result) {
        await cacheService.set(cacheNamespace, cacheKey, result, cacheTTL);
      }

      const duration = Date.now() - startTime;
      this.queryStats.totalQueries++;
      this.queryStats.averageResponseTime = 
        (this.queryStats.averageResponseTime + duration) / 2;

      logger.debug('Database query executed:', {
        model: model.modelName,
        duration: `${duration}ms`,
        resultCount: result.length
      });

      return result;
    } catch (error) {
      logger.error('Optimized find query failed:', {
        model: model.modelName,
        error: error.message,
        query
      });
      throw error;
    }
  }

  /**
   * Optimized findOne with caching
   */
  async findOneWithCache(model, query, options = {}) {
    const {
      cache = true,
      cacheTTL = 300,
      cacheNamespace = model.modelName.toLowerCase(),
      ...mongoOptions
    } = options;

    const startTime = Date.now();
    
    try {
      const cacheKey = this.generateQueryCacheKey(query, mongoOptions);
      
      if (cache) {
        const cachedResult = await cacheService.get(cacheNamespace, cacheKey);
        if (cachedResult !== null) {
          this.queryStats.cachedQueries++;
          return cachedResult;
        }
      }

      const result = await model.findOne(query, null, mongoOptions).lean();
      
      if (cache && result) {
        await cacheService.set(cacheNamespace, cacheKey, result, cacheTTL);
      }

      const duration = Date.now() - startTime;
      this.queryStats.totalQueries++;
      this.queryStats.averageResponseTime = 
        (this.queryStats.averageResponseTime + duration) / 2;

      return result;
    } catch (error) {
      logger.error('Optimized findOne query failed:', {
        model: model.modelName,
        error: error.message,
        query
      });
      throw error;
    }
  }

  /**
   * Batch operations for multiple documents
   */
  async batchInsert(model, documents, options = {}) {
    const {
      batchSize = 100,
      ordered = false,
      invalidateCache = true
    } = options;

    const startTime = Date.now();
    
    try {
      const results = [];
      
      // Process in batches
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        const batchResult = await model.insertMany(batch, {
          ordered,
          rawResult: true
        });
        
        results.push(...batchResult.insertedIds);
        
        logger.debug(`Batch insert completed: ${i + batch.length}/${documents.length}`);
      }

      // Invalidate cache if needed
      if (invalidateCache) {
        await cacheService.invalidateNamespace(model.modelName.toLowerCase());
      }

      const duration = Date.now() - startTime;
      logger.info('Batch insert completed:', {
        model: model.modelName,
        totalDocuments: documents.length,
        duration: `${duration}ms`,
        batchSize
      });

      return results;
    } catch (error) {
      logger.error('Batch insert failed:', {
        model: model.modelName,
        error: error.message,
        documentCount: documents.length
      });
      throw error;
    }
  }

  /**
   * Batch update operations
   */
  async batchUpdate(model, updates, options = {}) {
    const {
      batchSize = 100,
      invalidateCache = true
    } = options;

    const startTime = Date.now();
    
    try {
      const results = [];
      
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        
        const bulkOps = batch.map(update => ({
          updateOne: {
            filter: update.filter,
            update: update.update,
            upsert: update.upsert || false
          }
        }));
        
        const batchResult = await model.bulkWrite(bulkOps);
        results.push(batchResult);
        
        logger.debug(`Batch update completed: ${i + batch.length}/${updates.length}`);
      }

      if (invalidateCache) {
        await cacheService.invalidateNamespace(model.modelName.toLowerCase());
      }

      const duration = Date.now() - startTime;
      logger.info('Batch update completed:', {
        model: model.modelName,
        totalUpdates: updates.length,
        duration: `${duration}ms`,
        batchSize
      });

      return results;
    } catch (error) {
      logger.error('Batch update failed:', {
        model: model.modelName,
        error: error.message,
        updateCount: updates.length
      });
      throw error;
    }
  }

  /**
   * Optimized aggregation with caching
   */
  async aggregateWithCache(model, pipeline, options = {}) {
    const {
      cache = true,
      cacheTTL = 600, // 10 minutes for aggregations
      cacheNamespace = `${model.modelName.toLowerCase()}_agg`,
      ...mongoOptions
    } = options;

    const startTime = Date.now();
    
    try {
      const cacheKey = this.generateQueryCacheKey(pipeline, mongoOptions);
      
      if (cache) {
        const cachedResult = await cacheService.get(cacheNamespace, cacheKey);
        if (cachedResult !== null) {
          this.queryStats.cachedQueries++;
          return cachedResult;
        }
      }

      const result = await model.aggregate(pipeline, mongoOptions);
      
      if (cache && result) {
        await cacheService.set(cacheNamespace, cacheKey, result, cacheTTL);
      }

      const duration = Date.now() - startTime;
      this.queryStats.totalQueries++;
      this.queryStats.averageResponseTime = 
        (this.queryStats.averageResponseTime + duration) / 2;

      logger.debug('Aggregation query executed:', {
        model: model.modelName,
        duration: `${duration}ms`,
        resultCount: result.length
      });

      return result;
    } catch (error) {
      logger.error('Aggregation query failed:', {
        model: model.modelName,
        error: error.message,
        pipeline
      });
      throw error;
    }
  }

  /**
   * Generate cache key for queries
   */
  generateQueryCacheKey(query, options = {}) {
    const queryString = JSON.stringify({ query, options });
    return require('crypto').createHash('md5').update(queryString).digest('hex');
  }

  /**
   * Invalidate cache for a model
   */
  async invalidateModelCache(modelName) {
    const namespace = modelName.toLowerCase();
    const aggNamespace = `${namespace}_agg`;
    
    const [deleted1, deleted2] = await Promise.all([
      cacheService.invalidateNamespace(namespace),
      cacheService.invalidateNamespace(aggNamespace)
    ]);

    logger.info('Model cache invalidated:', {
      model: modelName,
      deletedKeys: deleted1 + deleted2
    });

    return deleted1 + deleted2;
  }

  /**
   * Get database performance statistics
   */
  async getPerformanceStats() {
    try {
      const dbStats = await mongoose.connection.db.stats();
      const connectionStats = {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      };

      return {
        database: dbStats,
        connection: connectionStats,
        queries: this.queryStats,
        cache: await cacheService.getStats(),
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to get performance stats:', error);
      return null;
    }
  }

  /**
   * Optimize database indexes
   */
  async optimizeIndexes() {
    try {
      const models = mongoose.modelNames();
      const optimizationResults = [];

      for (const modelName of models) {
        const model = mongoose.model(modelName);
        const collection = model.collection;
        
        // Get current indexes
        const indexes = await collection.indexes();
        
        // Get index usage stats
        const indexStats = await collection.aggregate([
          { $indexStats: {} }
        ]).toArray();

        // Identify unused indexes (except _id)
        const unusedIndexes = indexStats.filter(stat => 
          stat.accesses.ops === 0 && stat.name !== '_id_'
        );

        // Log optimization opportunities
        if (unusedIndexes.length > 0) {
          logger.warn('Unused indexes detected:', {
            model: modelName,
            unusedIndexes: unusedIndexes.map(idx => idx.name)
          });
        }

        optimizationResults.push({
          model: modelName,
          totalIndexes: indexes.length,
          unusedIndexes: unusedIndexes.length,
          indexStats
        });
      }

      logger.info('Index optimization analysis completed:', {
        totalModels: models.length,
        results: optimizationResults
      });

      return optimizationResults;
    } catch (error) {
      logger.error('Index optimization failed:', error);
      throw error;
    }
  }

  /**
   * Database health check
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      const isConnected = mongoose.connection.readyState === 1;
      if (!isConnected) {
        return {
          status: 'unhealthy',
          message: 'Database not connected',
          details: { readyState: mongoose.connection.readyState }
        };
      }

      // Test query performance
      const testQuery = await mongoose.connection.db.admin().ping();
      const queryTime = Date.now() - startTime;

      // Check connection pool
      const poolStats = {
        maxPoolSize: mongoose.connection.options?.maxPoolSize || 'default',
        minPoolSize: mongoose.connection.options?.minPoolSize || 'default'
      };

      return {
        status: 'healthy',
        message: 'Database working correctly',
        details: {
          queryTime: `${queryTime}ms`,
          connectionPool: poolStats,
          queryStats: this.queryStats
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        details: { error: error.stack }
      };
    }
  }

  /**
   * Reset query statistics
   */
  resetStats() {
    this.queryStats = {
      totalQueries: 0,
      cachedQueries: 0,
      slowQueries: 0,
      averageResponseTime: 0
    };
    logger.info('Query statistics reset');
  }
}

// Create singleton instance
const dbOptimizationService = new DatabaseOptimizationService();

module.exports = dbOptimizationService;