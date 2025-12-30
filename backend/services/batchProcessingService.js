const EventEmitter = require('events');
const logger = require('../utils/logger');
const { auditLogger } = require('../utils/auditLogger');
const cacheService = require('./cacheService');

/**
 * Batch processing service for efficient handling of multiple operations
 */

class BatchProcessingService extends EventEmitter {
  constructor() {
    super();
    this.queues = new Map();
    this.processors = new Map();
    this.stats = {
      totalBatches: 0,
      totalItems: 0,
      successfulBatches: 0,
      failedBatches: 0,
      averageProcessingTime: 0
    };
    
    this.defaultOptions = {
      batchSize: 10,
      maxWaitTime: 5000, // 5 seconds
      maxRetries: 3,
      retryDelay: 1000,
      concurrency: 3
    };
  }

  /**
   * Register a batch processor
   */
  registerProcessor(name, processorFunction, options = {}) {
    const config = { ...this.defaultOptions, ...options };
    
    this.processors.set(name, {
      processor: processorFunction,
      config,
      stats: {
        totalProcessed: 0,
        totalFailed: 0,
        averageTime: 0
      }
    });

    this.queues.set(name, {
      items: [],
      timer: null,
      processing: false
    });

    logger.info('Batch processor registered:', { name, config });
  }

  /**
   * Add item to batch queue
   */
  async addToBatch(processorName, item, priority = 0) {
    if (!this.processors.has(processorName)) {
      throw new Error(`Processor '${processorName}' not registered`);
    }

    const queue = this.queues.get(processorName);
    const processor = this.processors.get(processorName);

    // Add item with metadata
    const queueItem = {
      id: this.generateItemId(),
      data: item,
      priority,
      addedAt: new Date(),
      retries: 0
    };

    queue.items.push(queueItem);

    // Sort by priority (higher priority first)
    queue.items.sort((a, b) => b.priority - a.priority);

    logger.debug('Item added to batch queue:', {
      processor: processorName,
      itemId: queueItem.id,
      queueSize: queue.items.length,
      priority
    });

    // Check if we should process immediately
    if (queue.items.length >= processor.config.batchSize) {
      await this.processBatch(processorName);
    } else if (!queue.timer) {
      // Set timer for maximum wait time
      queue.timer = setTimeout(() => {
        this.processBatch(processorName);
      }, processor.config.maxWaitTime);
    }

    return queueItem.id;
  }

  /**
   * Process batch for a specific processor
   */
  async processBatch(processorName) {
    const queue = this.queues.get(processorName);
    const processor = this.processors.get(processorName);

    if (!queue || !processor || queue.processing || queue.items.length === 0) {
      return;
    }

    // Clear timer if exists
    if (queue.timer) {
      clearTimeout(queue.timer);
      queue.timer = null;
    }

    queue.processing = true;
    const startTime = Date.now();

    try {
      // Extract batch items
      const batchItems = queue.items.splice(0, processor.config.batchSize);
      const batchId = this.generateBatchId();

      logger.info('Processing batch:', {
        processor: processorName,
        batchId,
        itemCount: batchItems.length
      });

      // Process with concurrency control
      const results = await this.processWithConcurrency(
        processor.processor,
        batchItems,
        processor.config.concurrency,
        batchId
      );

      // Update statistics
      const duration = Date.now() - startTime;
      this.updateStats(processorName, batchItems.length, duration, true);

      // Emit success event
      this.emit('batchProcessed', {
        processor: processorName,
        batchId,
        itemCount: batchItems.length,
        duration,
        results
      });

      // Handle failed items (retry logic)
      const failedItems = results.filter(r => !r.success);
      if (failedItems.length > 0) {
        await this.handleFailedItems(processorName, failedItems);
      }

      logger.info('Batch processing completed:', {
        processor: processorName,
        batchId,
        successful: results.filter(r => r.success).length,
        failed: failedItems.length,
        duration: `${duration}ms`
      });

    } catch (error) {
      logger.error('Batch processing failed:', {
        processor: processorName,
        error: error.message,
        itemCount: queue.items.length
      });

      this.updateStats(processorName, 0, Date.now() - startTime, false);
      
      this.emit('batchFailed', {
        processor: processorName,
        error: error.message,
        itemCount: queue.items.length
      });
    } finally {
      queue.processing = false;
      
      // Process remaining items if any
      if (queue.items.length > 0) {
        setTimeout(() => this.processBatch(processorName), 100);
      }
    }
  }

  /**
   * Process items with concurrency control
   */
  async processWithConcurrency(processorFunction, items, concurrency, batchId) {
    const results = [];
    const semaphore = new Array(concurrency).fill(null);
    
    const processItem = async (item, index) => {
      try {
        const result = await processorFunction(item.data, {
          itemId: item.id,
          batchId,
          attempt: item.retries + 1
        });
        
        return {
          itemId: item.id,
          success: true,
          result,
          processingTime: Date.now() - item.addedAt.getTime()
        };
      } catch (error) {
        logger.error('Item processing failed:', {
          itemId: item.id,
          batchId,
          error: error.message,
          retries: item.retries
        });
        
        return {
          itemId: item.id,
          success: false,
          error: error.message,
          item,
          processingTime: Date.now() - item.addedAt.getTime()
        };
      }
    };

    // Process items with concurrency limit
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const promises = batch.map((item, index) => processItem(item, i + index));
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Handle failed items with retry logic
   */
  async handleFailedItems(processorName, failedItems) {
    const processor = this.processors.get(processorName);
    const queue = this.queues.get(processorName);

    for (const failedResult of failedItems) {
      const item = failedResult.item;
      
      if (item.retries < processor.config.maxRetries) {
        // Retry the item
        item.retries++;
        
        // Add delay before retry
        setTimeout(() => {
          queue.items.unshift(item); // Add to front of queue
          logger.debug('Item queued for retry:', {
            processor: processorName,
            itemId: item.id,
            retryAttempt: item.retries
          });
        }, processor.config.retryDelay * item.retries);
        
      } else {
        // Max retries reached, log as permanently failed
        logger.error('Item permanently failed after max retries:', {
          processor: processorName,
          itemId: item.id,
          maxRetries: processor.config.maxRetries,
          lastError: failedResult.error
        });

        // Emit permanent failure event
        this.emit('itemPermanentlyFailed', {
          processor: processorName,
          itemId: item.id,
          item: item.data,
          error: failedResult.error,
          retries: item.retries
        });
      }
    }
  }

  /**
   * Force process all pending batches
   */
  async flushAll() {
    const processors = Array.from(this.processors.keys());
    const flushPromises = processors.map(name => this.flush(name));
    
    await Promise.all(flushPromises);
    logger.info('All batch queues flushed');
  }

  /**
   * Force process pending batch for specific processor
   */
  async flush(processorName) {
    if (!this.processors.has(processorName)) {
      throw new Error(`Processor '${processorName}' not registered`);
    }

    const queue = this.queues.get(processorName);
    
    if (queue.items.length > 0) {
      logger.info('Flushing batch queue:', {
        processor: processorName,
        pendingItems: queue.items.length
      });
      
      await this.processBatch(processorName);
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(processorName) {
    if (!this.processors.has(processorName)) {
      return null;
    }

    const queue = this.queues.get(processorName);
    const processor = this.processors.get(processorName);

    return {
      processor: processorName,
      pendingItems: queue.items.length,
      processing: queue.processing,
      hasTimer: !!queue.timer,
      config: processor.config,
      stats: processor.stats
    };
  }

  /**
   * Get all queue statuses
   */
  getAllQueueStatuses() {
    const statuses = {};
    
    for (const processorName of this.processors.keys()) {
      statuses[processorName] = this.getQueueStatus(processorName);
    }

    return {
      queues: statuses,
      globalStats: this.stats,
      timestamp: new Date()
    };
  }

  /**
   * Update processing statistics
   */
  updateStats(processorName, itemCount, duration, success) {
    // Update global stats
    this.stats.totalBatches++;
    this.stats.totalItems += itemCount;
    
    if (success) {
      this.stats.successfulBatches++;
    } else {
      this.stats.failedBatches++;
    }
    
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime + duration) / 2;

    // Update processor-specific stats
    const processor = this.processors.get(processorName);
    if (processor) {
      if (success) {
        processor.stats.totalProcessed += itemCount;
      } else {
        processor.stats.totalFailed += itemCount;
      }
      
      processor.stats.averageTime = 
        (processor.stats.averageTime + duration) / 2;
    }
  }

  /**
   * Generate unique item ID
   */
  generateItemId() {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique batch ID
   */
  generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all queues
   */
  clearAllQueues() {
    for (const [name, queue] of this.queues) {
      if (queue.timer) {
        clearTimeout(queue.timer);
      }
      queue.items = [];
      queue.timer = null;
      queue.processing = false;
      
      logger.info('Queue cleared:', { processor: name });
    }
  }

  /**
   * Remove processor
   */
  removeProcessor(processorName) {
    if (this.processors.has(processorName)) {
      const queue = this.queues.get(processorName);
      
      if (queue.timer) {
        clearTimeout(queue.timer);
      }
      
      this.processors.delete(processorName);
      this.queues.delete(processorName);
      
      logger.info('Processor removed:', { processor: processorName });
      return true;
    }
    
    return false;
  }

  /**
   * Shutdown service gracefully
   */
  async shutdown() {
    logger.info('Shutting down batch processing service...');
    
    // Flush all pending batches
    await this.flushAll();
    
    // Clear all timers
    for (const queue of this.queues.values()) {
      if (queue.timer) {
        clearTimeout(queue.timer);
      }
    }
    
    // Clear all data
    this.queues.clear();
    this.processors.clear();
    
    logger.info('Batch processing service shutdown completed');
  }

  /**
   * Health check
   */
  healthCheck() {
    const totalPendingItems = Array.from(this.queues.values())
      .reduce((sum, queue) => sum + queue.items.length, 0);
    
    const processingQueues = Array.from(this.queues.values())
      .filter(queue => queue.processing).length;

    return {
      status: 'healthy',
      message: 'Batch processing service operational',
      details: {
        registeredProcessors: this.processors.size,
        totalPendingItems,
        processingQueues,
        globalStats: this.stats
      }
    };
  }
}

// Create singleton instance
const batchProcessingService = new BatchProcessingService();

module.exports = batchProcessingService;