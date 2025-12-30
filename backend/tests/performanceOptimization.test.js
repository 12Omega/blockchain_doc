const cacheService = require('../services/cacheService');
const dbOptimizationService = require('../services/databaseOptimizationService');
const batchProcessingService = require('../services/batchProcessingService');
const blockchainOptimizationService = require('../services/blockchainOptimizationService');

// Mock dependencies
jest.mock('../utils/logger');
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    on: jest.fn(),
    isReady: true,
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    incrBy: jest.fn(),
    mGet: jest.fn(),
    multi: jest.fn(() => ({
      setEx: jest.fn(),
      exec: jest.fn()
    })),
    info: jest.fn(),
    flushAll: jest.fn(),
    quit: jest.fn()
  }))
}));

describe('Performance Optimization Services', () => {
  describe('Cache Service', () => {
    beforeEach(() => {
      // Reset cache service state
      cacheService.isConnected = true;
    });

    test('should generate correct cache key', () => {
      const key = cacheService.generateKey('test', 'key123');
      expect(key).toBe('blockchain_doc:test:key123');
    });

    test('should set and get values from cache', async () => {
      const testData = { test: 'data', number: 123 };
      
      // Mock Redis client methods
      cacheService.client = {
        isReady: true,
        setEx: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(JSON.stringify(testData))
      };

      // Test set
      const setResult = await cacheService.set('test', 'key1', testData, 300);
      expect(setResult).toBe(true);
      expect(cacheService.client.setEx).toHaveBeenCalledWith(
        'blockchain_doc:test:key1',
        300,
        JSON.stringify(testData)
      );

      // Test get
      const getValue = await cacheService.get('test', 'key1');
      expect(getValue).toEqual(testData);
      expect(cacheService.client.get).toHaveBeenCalledWith('blockchain_doc:test:key1');
    });

    test('should handle cache miss gracefully', async () => {
      cacheService.client = {
        isReady: true,
        get: jest.fn().mockResolvedValue(null)
      };

      const result = await cacheService.get('test', 'nonexistent');
      expect(result).toBeNull();
    });

    test('should handle cache unavailability', async () => {
      cacheService.isConnected = false;
      
      const setResult = await cacheService.set('test', 'key1', 'data');
      const getResult = await cacheService.get('test', 'key1');
      
      expect(setResult).toBe(false);
      expect(getResult).toBeNull();
    });

    test('should implement getOrSet pattern', async () => {
      const testData = { fetched: true };
      const fetchFunction = jest.fn().mockResolvedValue(testData);
      
      cacheService.client = {
        isReady: true,
        get: jest.fn().mockResolvedValue(null), // Cache miss
        setEx: jest.fn().mockResolvedValue('OK')
      };

      const result = await cacheService.getOrSet('test', 'key1', fetchFunction, 300);
      
      expect(result).toEqual(testData);
      expect(fetchFunction).toHaveBeenCalled();
      expect(cacheService.client.setEx).toHaveBeenCalled();
    });

    test('should perform health check', async () => {
      cacheService.client = {
        isReady: true,
        setEx: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue('"test_value"'),
        del: jest.fn().mockResolvedValue(1)
      };

      const health = await cacheService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.message).toBe('Redis working correctly');
    });
  });

  describe('Database Optimization Service', () => {
    const mockModel = {
      modelName: 'TestModel',
      find: jest.fn(),
      findOne: jest.fn(),
      insertMany: jest.fn(),
      bulkWrite: jest.fn(),
      aggregate: jest.fn(),
      ensureIndexes: jest.fn(),
      collection: {
        indexes: jest.fn(),
        aggregate: jest.fn()
      }
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should execute findWithCache with cache hit', async () => {
      const testData = [{ _id: '1', name: 'test' }];
      
      // Mock cache hit
      cacheService.get = jest.fn().mockResolvedValue(testData);
      
      const result = await dbOptimizationService.findWithCache(
        mockModel,
        { name: 'test' },
        { cache: true }
      );
      
      expect(result).toEqual(testData);
      expect(cacheService.get).toHaveBeenCalled();
      expect(mockModel.find).not.toHaveBeenCalled();
    });

    test('should execute findWithCache with cache miss', async () => {
      const testData = [{ _id: '1', name: 'test' }];
      
      // Mock cache miss and database query
      cacheService.get = jest.fn().mockResolvedValue(null);
      cacheService.set = jest.fn().mockResolvedValue(true);
      mockModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(testData)
      });
      
      const result = await dbOptimizationService.findWithCache(
        mockModel,
        { name: 'test' },
        { cache: true }
      );
      
      expect(result).toEqual(testData);
      expect(cacheService.get).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalled();
      expect(mockModel.find).toHaveBeenCalled();
    });

    test('should perform batch insert', async () => {
      const documents = [
        { name: 'doc1' },
        { name: 'doc2' },
        { name: 'doc3' }
      ];
      
      mockModel.insertMany.mockResolvedValue({
        insertedIds: ['id1', 'id2', 'id3']
      });
      
      cacheService.invalidateNamespace = jest.fn().mockResolvedValue(5);
      
      const result = await dbOptimizationService.batchInsert(
        mockModel,
        documents,
        { batchSize: 2 }
      );
      
      expect(result).toHaveLength(3);
      expect(mockModel.insertMany).toHaveBeenCalledTimes(2); // 3 docs, batch size 2
      expect(cacheService.invalidateNamespace).toHaveBeenCalled();
    });

    test('should perform batch update', async () => {
      const updates = [
        { filter: { _id: '1' }, update: { name: 'updated1' } },
        { filter: { _id: '2' }, update: { name: 'updated2' } }
      ];
      
      mockModel.bulkWrite.mockResolvedValue({ modifiedCount: 2 });
      cacheService.invalidateNamespace = jest.fn().mockResolvedValue(3);
      
      const result = await dbOptimizationService.batchUpdate(
        mockModel,
        updates,
        { batchSize: 10 }
      );
      
      expect(result).toHaveLength(1); // Single batch
      expect(mockModel.bulkWrite).toHaveBeenCalled();
      expect(cacheService.invalidateNamespace).toHaveBeenCalled();
    });

    test('should generate consistent cache keys', () => {
      const query1 = { name: 'test' };
      const options1 = { limit: 10 };
      
      const key1 = dbOptimizationService.generateQueryCacheKey(query1, options1);
      const key2 = dbOptimizationService.generateQueryCacheKey(query1, options1);
      
      expect(key1).toBe(key2);
      expect(typeof key1).toBe('string');
      expect(key1.length).toBe(32); // MD5 hash length
    });

    test('should perform health check', async () => {
      // Mock mongoose connection
      const mockConnection = {
        readyState: 1,
        host: 'localhost',
        port: 27017,
        name: 'test_db',
        db: {
          admin: () => ({
            ping: jest.fn().mockResolvedValue({ ok: 1 })
          })
        }
      };
      
      // Mock mongoose
      require('mongoose').connection = mockConnection;
      
      const health = await dbOptimizationService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.details.queryStats).toBeDefined();
    });
  });

  describe('Batch Processing Service', () => {
    beforeEach(() => {
      // Clear all processors and queues
      batchProcessingService.clearAllQueues();
      batchProcessingService.processors.clear();
    });

    test('should register processor', () => {
      const mockProcessor = jest.fn();
      const options = { batchSize: 5, maxWaitTime: 1000 };
      
      batchProcessingService.registerProcessor('testProcessor', mockProcessor, options);
      
      expect(batchProcessingService.processors.has('testProcessor')).toBe(true);
      expect(batchProcessingService.queues.has('testProcessor')).toBe(true);
      
      const processor = batchProcessingService.processors.get('testProcessor');
      expect(processor.config.batchSize).toBe(5);
      expect(processor.config.maxWaitTime).toBe(1000);
    });

    test('should add items to batch queue', async () => {
      const mockProcessor = jest.fn().mockResolvedValue('processed');
      batchProcessingService.registerProcessor('testProcessor', mockProcessor);
      
      const itemId = await batchProcessingService.addToBatch('testProcessor', { data: 'test' });
      
      expect(typeof itemId).toBe('string');
      expect(itemId).toMatch(/^item_/);
      
      const queue = batchProcessingService.queues.get('testProcessor');
      expect(queue.items).toHaveLength(1);
      expect(queue.items[0].data).toEqual({ data: 'test' });
    });

    test('should process batch when size limit reached', async () => {
      const mockProcessor = jest.fn().mockResolvedValue('processed');
      batchProcessingService.registerProcessor('testProcessor', mockProcessor, { batchSize: 2 });
      
      // Add items to trigger batch processing
      await batchProcessingService.addToBatch('testProcessor', { data: 'test1' });
      await batchProcessingService.addToBatch('testProcessor', { data: 'test2' });
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockProcessor).toHaveBeenCalled();
    });

    test('should handle failed items with retry logic', async () => {
      let callCount = 0;
      const mockProcessor = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Processing failed');
        }
        return 'success';
      });
      
      batchProcessingService.registerProcessor('testProcessor', mockProcessor, {
        batchSize: 1,
        maxRetries: 3,
        retryDelay: 10
      });
      
      await batchProcessingService.addToBatch('testProcessor', { data: 'test' });
      
      // Wait for processing and retries
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockProcessor).toHaveBeenCalledTimes(3);
    });

    test('should get queue status', () => {
      const mockProcessor = jest.fn();
      batchProcessingService.registerProcessor('testProcessor', mockProcessor);
      
      const status = batchProcessingService.getQueueStatus('testProcessor');
      
      expect(status).toBeDefined();
      expect(status.processor).toBe('testProcessor');
      expect(status.pendingItems).toBe(0);
      expect(status.processing).toBe(false);
      expect(status.config).toBeDefined();
      expect(status.stats).toBeDefined();
    });

    test('should flush all queues', async () => {
      const mockProcessor = jest.fn().mockResolvedValue('processed');
      batchProcessingService.registerProcessor('testProcessor', mockProcessor);
      
      await batchProcessingService.addToBatch('testProcessor', { data: 'test' });
      
      await batchProcessingService.flushAll();
      
      expect(mockProcessor).toHaveBeenCalled();
    });

    test('should perform health check', () => {
      const mockProcessor = jest.fn();
      batchProcessingService.registerProcessor('testProcessor', mockProcessor);
      
      const health = batchProcessingService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.details.registeredProcessors).toBe(1);
      expect(health.details.globalStats).toBeDefined();
    });
  });

  describe('Blockchain Optimization Service', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should estimate gas with optimization', async () => {
      const mockContract = {
        target: '0x123',
        testMethod: {
          estimateGas: jest.fn().mockResolvedValue(BigInt(100000))
        }
      };
      
      cacheService.get = jest.fn().mockResolvedValue(null);
      cacheService.set = jest.fn().mockResolvedValue(true);
      
      const gasEstimate = await blockchainOptimizationService.estimateGasOptimized(
        mockContract,
        'testMethod',
        ['param1']
      );
      
      expect(gasEstimate).toBeGreaterThan(BigInt(100000)); // Should include buffer
      expect(cacheService.set).toHaveBeenCalled();
    });

    test('should get optimized gas price with bounds', async () => {
      // Mock provider
      blockchainOptimizationService.provider = {
        getFeeData: jest.fn().mockResolvedValue({
          gasPrice: BigInt('100000000000') // 100 gwei
        })
      };
      
      cacheService.get = jest.fn().mockResolvedValue(null);
      cacheService.set = jest.fn().mockResolvedValue(true);
      
      const gasPrice = await blockchainOptimizationService.getOptimizedGasPrice();
      
      expect(gasPrice).toBeLessThanOrEqual(blockchainOptimizationService.optimizationConfig.maxGasPrice);
      expect(gasPrice).toBeGreaterThanOrEqual(blockchainOptimizationService.optimizationConfig.minGasPrice);
    });

    test('should check if error is retryable', () => {
      const retryableError = new Error('network error occurred');
      const nonRetryableError = new Error('invalid signature');
      
      expect(blockchainOptimizationService.isRetryableError(retryableError)).toBe(true);
      expect(blockchainOptimizationService.isRetryableError(nonRetryableError)).toBe(false);
    });

    test('should update gas tracker statistics', () => {
      const mockReceipt = {
        gasUsed: BigInt(50000),
        hash: '0xabc123'
      };
      const gasPrice = BigInt('20000000000');
      
      const initialStats = { ...blockchainOptimizationService.gasTracker };
      
      blockchainOptimizationService.updateGasTracker(mockReceipt, gasPrice);
      
      expect(blockchainOptimizationService.gasTracker.totalTransactions).toBe(initialStats.totalTransactions + 1);
      expect(blockchainOptimizationService.gasTracker.totalGasUsed).toBe(initialStats.totalGasUsed + 50000);
    });

    test('should get gas statistics', () => {
      // Set some test data
      blockchainOptimizationService.gasTracker = {
        totalTransactions: 10,
        totalGasUsed: 500000,
        averageGasPrice: 20000000000,
        failedTransactions: 1
      };
      
      const stats = blockchainOptimizationService.getGasStats();
      
      expect(stats.totalTransactions).toBe(10);
      expect(stats.averageGasPerTransaction).toBe(50000);
      expect(stats.successRate).toBe('90.00%');
      expect(stats.timestamp).toBeInstanceOf(Date);
    });

    test('should load contract for optimization', () => {
      const mockAbi = [{ name: 'test', type: 'function' }];
      const address = '0x1234567890123456789012345678901234567890';
      
      // Mock ethers Contract constructor
      const mockContract = { target: address };
      require('ethers').Contract = jest.fn().mockReturnValue(mockContract);
      
      const contract = blockchainOptimizationService.loadContract('TestContract', address, mockAbi);
      
      expect(contract).toBe(mockContract);
      expect(blockchainOptimizationService.contracts.has('TestContract')).toBe(true);
    });

    test('should perform health check', async () => {
      // Mock provider
      blockchainOptimizationService.provider = {
        getBlockNumber: jest.fn().mockResolvedValue(12345)
      };
      
      blockchainOptimizationService.wallet = { address: '0x123' };
      blockchainOptimizationService.contracts.set('TestContract', {});
      
      const health = await blockchainOptimizationService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.details.providerConnected).toBe(true);
      expect(health.details.currentBlock).toBe(12345);
      expect(health.details.walletConnected).toBe(true);
      expect(health.details.contractsLoaded).toBe(1);
    });
  });
});