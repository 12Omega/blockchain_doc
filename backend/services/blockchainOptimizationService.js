const { ethers } = require('ethers');
const logger = require('../utils/logger');
const { auditLogger } = require('../utils/auditLogger');
const cacheService = require('./cacheService');
const batchProcessingService = require('./batchProcessingService');

/**
 * Blockchain optimization service for gas efficiency and transaction management
 */

class BlockchainOptimizationService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contracts = new Map();
    this.gasTracker = {
      totalTransactions: 0,
      totalGasUsed: 0,
      averageGasPrice: 0,
      failedTransactions: 0
    };
    
    this.optimizationConfig = {
      gasLimitBuffer: 1.2, // 20% buffer
      maxGasPrice: ethers.parseUnits('50', 'gwei'),
      minGasPrice: ethers.parseUnits('1', 'gwei'),
      retryAttempts: 3,
      retryMultiplier: 1.1,
      batchSize: 10,
      confirmationBlocks: 1
    };

    this.initialize();
  }

  /**
   * Initialize blockchain optimization service
   */
  async initialize() {
    try {
      // Initialize provider
      const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      // Initialize wallet only if we have a valid private key
      const privateKey = process.env.PRIVATE_KEY;
      if (privateKey && privateKey !== 'your_private_key_here' && !privateKey.includes('your_')) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
      } else {
        logger.warn('No valid private key for blockchain optimization. Write operations disabled.');
      }

      // Register batch processors
      this.registerBatchProcessors();

      logger.info('Blockchain optimization service initialized');
    } catch (error) {
      logger.error('Failed to initialize blockchain optimization service:', error);
      logger.warn('Blockchain optimization will run in limited mode');
      // Don't throw - allow service to continue
    }
  }

  /**
   * Register batch processors for blockchain operations
   */
  registerBatchProcessors() {
    // Document registration batch processor
    batchProcessingService.registerProcessor(
      'documentRegistration',
      this.batchRegisterDocuments.bind(this),
      {
        batchSize: 5,
        maxWaitTime: 10000,
        concurrency: 1 // Sequential for blockchain operations
      }
    );

    // Document verification batch processor
    batchProcessingService.registerProcessor(
      'documentVerification',
      this.batchVerifyDocuments.bind(this),
      {
        batchSize: 10,
        maxWaitTime: 5000,
        concurrency: 2
      }
    );

    logger.info('Blockchain batch processors registered');
  }

  /**
   * Estimate gas for transaction with optimization
   */
  async estimateGasOptimized(contract, methodName, params = [], options = {}) {
    try {
      const cacheKey = `gas_estimate_${contract.target}_${methodName}_${JSON.stringify(params)}`;
      
      // Try cache first
      const cachedEstimate = await cacheService.get('gas_estimates', cacheKey);
      if (cachedEstimate) {
        logger.debug('Gas estimate served from cache:', { methodName, estimate: cachedEstimate });
        return BigInt(cachedEstimate);
      }

      // Estimate gas
      const gasEstimate = await contract[methodName].estimateGas(...params, options);
      
      // Apply buffer for safety
      const bufferedEstimate = BigInt(Math.floor(Number(gasEstimate) * this.optimizationConfig.gasLimitBuffer));

      // Cache the estimate for 5 minutes
      await cacheService.set('gas_estimates', cacheKey, bufferedEstimate.toString(), 300);

      logger.debug('Gas estimated:', {
        method: methodName,
        originalEstimate: gasEstimate.toString(),
        bufferedEstimate: bufferedEstimate.toString()
      });

      return bufferedEstimate;
    } catch (error) {
      logger.error('Gas estimation failed:', {
        method: methodName,
        error: error.message
      });
      
      // Return a reasonable default
      return ethers.parseUnits('200000', 'wei');
    }
  }

  /**
   * Get optimized gas price
   */
  async getOptimizedGasPrice() {
    try {
      const cacheKey = 'current_gas_price';
      
      // Try cache first (cache for 30 seconds)
      const cachedPrice = await cacheService.get('gas_prices', cacheKey);
      if (cachedPrice) {
        return BigInt(cachedPrice);
      }

      // Get current gas price from network
      const feeData = await this.provider.getFeeData();
      let gasPrice = feeData.gasPrice;

      // Apply bounds
      if (gasPrice > this.optimizationConfig.maxGasPrice) {
        gasPrice = this.optimizationConfig.maxGasPrice;
        logger.warn('Gas price capped at maximum:', { 
          networkPrice: feeData.gasPrice.toString(),
          cappedPrice: gasPrice.toString()
        });
      } else if (gasPrice < this.optimizationConfig.minGasPrice) {
        gasPrice = this.optimizationConfig.minGasPrice;
      }

      // Cache for 30 seconds
      await cacheService.set('gas_prices', cacheKey, gasPrice.toString(), 30);

      return gasPrice;
    } catch (error) {
      logger.error('Failed to get gas price:', error);
      // Return a reasonable default
      return ethers.parseUnits('20', 'gwei');
    }
  }

  /**
   * Execute transaction with retry logic and optimization
   */
  async executeTransactionOptimized(contract, methodName, params = [], options = {}) {
    const startTime = Date.now();
    let attempt = 0;
    let lastError;

    while (attempt < this.optimizationConfig.retryAttempts) {
      try {
        attempt++;
        
        // Get optimized gas parameters
        const [gasLimit, gasPrice] = await Promise.all([
          this.estimateGasOptimized(contract, methodName, params, options),
          this.getOptimizedGasPrice()
        ]);

        // Apply retry multiplier to gas price
        const adjustedGasPrice = attempt > 1 
          ? BigInt(Math.floor(Number(gasPrice) * Math.pow(this.optimizationConfig.retryMultiplier, attempt - 1)))
          : gasPrice;

        const txOptions = {
          gasLimit,
          gasPrice: adjustedGasPrice,
          ...options
        };

        logger.info('Executing blockchain transaction:', {
          method: methodName,
          attempt,
          gasLimit: gasLimit.toString(),
          gasPrice: adjustedGasPrice.toString()
        });

        // Execute transaction
        const tx = await contract[methodName](...params, txOptions);
        
        // Wait for confirmation
        const receipt = await tx.wait(this.optimizationConfig.confirmationBlocks);
        
        // Update statistics
        this.updateGasTracker(receipt, adjustedGasPrice);

        const duration = Date.now() - startTime;
        
        logger.info('Transaction successful:', {
          method: methodName,
          txHash: receipt.hash,
          gasUsed: receipt.gasUsed.toString(),
          duration: `${duration}ms`,
          attempt
        });

        return {
          success: true,
          receipt,
          gasUsed: receipt.gasUsed,
          gasPrice: adjustedGasPrice,
          duration,
          attempts: attempt
        };

      } catch (error) {
        lastError = error;
        
        logger.warn('Transaction attempt failed:', {
          method: methodName,
          attempt,
          error: error.message
        });

        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt >= this.optimizationConfig.retryAttempts) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = 1000 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All attempts failed
    this.gasTracker.failedTransactions++;
    
    const duration = Date.now() - startTime;
    
    logger.error('Transaction failed after all attempts:', {
      method: methodName,
      attempts: attempt,
      duration: `${duration}ms`,
      lastError: lastError.message
    });

    return {
      success: false,
      error: lastError,
      attempts: attempt,
      duration
    };
  }

  /**
   * Batch register documents on blockchain
   */
  async batchRegisterDocuments(documents, context) {
    try {
      const { batchId } = context;
      
      logger.info('Processing document registration batch:', {
        batchId,
        documentCount: documents.length
      });

      const results = [];
      
      for (const doc of documents) {
        try {
          const result = await this.registerSingleDocument(doc);
          results.push({
            documentHash: doc.documentHash,
            success: true,
            result
          });
        } catch (error) {
          logger.error('Document registration failed in batch:', {
            batchId,
            documentHash: doc.documentHash,
            error: error.message
          });
          
          results.push({
            documentHash: doc.documentHash,
            success: false,
            error: error.message
          });
        }
      }

      const successful = results.filter(r => r.success).length;
      
      logger.info('Document registration batch completed:', {
        batchId,
        total: documents.length,
        successful,
        failed: documents.length - successful
      });

      return results;
    } catch (error) {
      logger.error('Batch document registration failed:', {
        batchId: context.batchId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Batch verify documents on blockchain
   */
  async batchVerifyDocuments(verificationRequests, context) {
    try {
      const { batchId } = context;
      
      logger.info('Processing document verification batch:', {
        batchId,
        requestCount: verificationRequests.length
      });

      const results = [];
      
      // Process verifications in parallel (read-only operations)
      const verificationPromises = verificationRequests.map(async (request) => {
        try {
          const result = await this.verifySingleDocument(request.documentHash);
          return {
            documentHash: request.documentHash,
            success: true,
            result
          };
        } catch (error) {
          return {
            documentHash: request.documentHash,
            success: false,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(verificationPromises);
      results.push(...batchResults);

      const successful = results.filter(r => r.success).length;
      
      logger.info('Document verification batch completed:', {
        batchId,
        total: verificationRequests.length,
        successful,
        failed: verificationRequests.length - successful
      });

      return results;
    } catch (error) {
      logger.error('Batch document verification failed:', {
        batchId: context.batchId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Register single document (placeholder - implement based on your contract)
   */
  async registerSingleDocument(document) {
    // This would call your actual contract method
    // Example implementation:
    const contract = this.contracts.get('DocumentRegistry');
    if (!contract) {
      throw new Error('DocumentRegistry contract not loaded');
    }

    return await this.executeTransactionOptimized(
      contract,
      'registerDocument',
      [document.documentHash, document.ipfsHash]
    );
  }

  /**
   * Verify single document (placeholder - implement based on your contract)
   */
  async verifySingleDocument(documentHash) {
    const contract = this.contracts.get('DocumentRegistry');
    if (!contract) {
      throw new Error('DocumentRegistry contract not loaded');
    }

    // This is a read operation, no gas optimization needed
    return await contract.getDocument(documentHash);
  }

  /**
   * Load contract for optimization
   */
  loadContract(name, address, abi) {
    try {
      const contract = new ethers.Contract(address, abi, this.wallet || this.provider);
      this.contracts.set(name, contract);
      
      logger.info('Contract loaded for optimization:', { name, address });
      return contract;
    } catch (error) {
      logger.error('Failed to load contract:', { name, address, error: error.message });
      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const retryableErrors = [
      'network error',
      'timeout',
      'nonce too low',
      'replacement transaction underpriced',
      'insufficient funds for gas',
      'gas price too low'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }

  /**
   * Update gas tracking statistics
   */
  updateGasTracker(receipt, gasPrice) {
    this.gasTracker.totalTransactions++;
    this.gasTracker.totalGasUsed += Number(receipt.gasUsed);
    this.gasTracker.averageGasPrice = 
      (this.gasTracker.averageGasPrice + Number(gasPrice)) / 2;
  }

  /**
   * Get gas optimization statistics
   */
  getGasStats() {
    const averageGasPerTx = this.gasTracker.totalTransactions > 0 
      ? this.gasTracker.totalGasUsed / this.gasTracker.totalTransactions 
      : 0;

    return {
      ...this.gasTracker,
      averageGasPerTransaction: Math.round(averageGasPerTx),
      successRate: this.gasTracker.totalTransactions > 0 
        ? ((this.gasTracker.totalTransactions - this.gasTracker.failedTransactions) / this.gasTracker.totalTransactions * 100).toFixed(2) + '%'
        : '0%',
      timestamp: new Date()
    };
  }

  /**
   * Optimize gas price based on network conditions
   */
  async optimizeGasPriceForUrgency(urgency = 'normal') {
    try {
      const feeData = await this.provider.getFeeData();
      let multiplier = 1;

      switch (urgency) {
        case 'low':
          multiplier = 0.8;
          break;
        case 'normal':
          multiplier = 1;
          break;
        case 'high':
          multiplier = 1.2;
          break;
        case 'urgent':
          multiplier = 1.5;
          break;
        default:
          multiplier = 1;
      }

      const optimizedPrice = BigInt(Math.floor(Number(feeData.gasPrice) * multiplier));
      
      // Apply bounds
      const boundedPrice = optimizedPrice > this.optimizationConfig.maxGasPrice 
        ? this.optimizationConfig.maxGasPrice 
        : optimizedPrice < this.optimizationConfig.minGasPrice 
          ? this.optimizationConfig.minGasPrice 
          : optimizedPrice;

      return boundedPrice;
    } catch (error) {
      logger.error('Gas price optimization failed:', error);
      return ethers.parseUnits('20', 'gwei');
    }
  }

  /**
   * Monitor network congestion
   */
  async getNetworkCongestion() {
    try {
      const [latestBlock, pendingBlock] = await Promise.all([
        this.provider.getBlock('latest'),
        this.provider.getBlock('pending')
      ]);

      const gasUsageRatio = Number(latestBlock.gasUsed) / Number(latestBlock.gasLimit);
      const pendingTxCount = pendingBlock ? pendingBlock.transactions.length : 0;

      let congestionLevel = 'low';
      if (gasUsageRatio > 0.9 || pendingTxCount > 100) {
        congestionLevel = 'high';
      } else if (gasUsageRatio > 0.7 || pendingTxCount > 50) {
        congestionLevel = 'medium';
      }

      return {
        congestionLevel,
        gasUsageRatio: (gasUsageRatio * 100).toFixed(2) + '%',
        pendingTransactions: pendingTxCount,
        latestBlockNumber: latestBlock.number,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to get network congestion:', error);
      return {
        congestionLevel: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Health check for blockchain optimization service
   */
  async healthCheck() {
    try {
      // Check provider connection
      const blockNumber = await this.provider.getBlockNumber();
      
      // Check wallet connection
      const walletConnected = !!this.wallet;
      
      // Check contract loading
      const contractsLoaded = this.contracts.size;

      // Get network congestion
      const congestion = await this.getNetworkCongestion();

      return {
        status: 'healthy',
        message: 'Blockchain optimization service operational',
        details: {
          providerConnected: true,
          currentBlock: blockNumber,
          walletConnected,
          contractsLoaded,
          networkCongestion: congestion.congestionLevel,
          gasStats: this.getGasStats()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        details: {
          providerConnected: false,
          error: error.stack
        }
      };
    }
  }

  /**
   * Reset gas tracking statistics
   */
  resetGasStats() {
    this.gasTracker = {
      totalTransactions: 0,
      totalGasUsed: 0,
      averageGasPrice: 0,
      failedTransactions: 0
    };
    logger.info('Gas tracking statistics reset');
  }
}

// Create singleton instance
const blockchainOptimizationService = new BlockchainOptimizationService();

module.exports = blockchainOptimizationService;