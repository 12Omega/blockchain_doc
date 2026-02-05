const axios = require('axios');
const FormData = require('form-data');
const logger = require('../utils/logger');

class IPFSService {
  constructor() {
    this.ipfsGateway = process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/';
    
    // Configure multiple IPFS providers with priority
    this.providers = [
      {
        name: 'web3.storage',
        apiKey: process.env.WEB3_STORAGE_API_KEY,
        endpoint: 'https://api.web3.storage',
        priority: 1,
        free: true,
        limits: 'unlimited',
        enabled: !!process.env.WEB3_STORAGE_API_KEY
      },
      {
        name: 'pinata',
        apiKey: process.env.PINATA_API_KEY,
        apiSecret: process.env.PINATA_SECRET_API_KEY,
        endpoint: 'https://api.pinata.cloud',
        priority: 2,
        free: true,
        limits: '1GB',
        enabled: !!(process.env.PINATA_API_KEY && process.env.PINATA_SECRET_API_KEY)
      },
      {
        name: 'nft.storage',
        apiKey: process.env.NFT_STORAGE_API_KEY,
        endpoint: 'https://api.nft.storage',
        priority: 3,
        free: true,
        limits: 'unlimited',
        enabled: !!process.env.NFT_STORAGE_API_KEY
      },
      {
        name: 'local',
        endpoint: 'local',
        priority: 4,
        free: true,
        limits: 'disk space',
        enabled: true // Always enabled as final fallback
      }
    ];

    // Sort providers by priority
    this.providers.sort((a, b) => a.priority - b.priority);
    
    // Upload queue for offline scenarios
    this.uploadQueue = [];
    this.isProcessingQueue = false;
    
    // Retry configuration
    this.retryConfig = {
      maxRetries: 3,
      initialDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
      backoffMultiplier: 2
    };
    
    // Local storage path for fallback
    this.localStoragePath = process.env.LOCAL_IPFS_PATH || './uploads/ipfs';
    this.ensureLocalStorageDir();
    
    this.initializeClient();
  }

  initializeClient() {
    try {
      const enabledProviders = this.providers.filter(p => p.enabled);
      
      if (enabledProviders.length === 0) {
        logger.warn('No IPFS providers configured. Please set API keys for at least one provider.');
        logger.info('Supported providers: Web3.Storage, Pinata, NFT.Storage');
      } else {
        logger.info(`IPFS service initialized with ${enabledProviders.length} provider(s):`);
        enabledProviders.forEach(p => {
          logger.info(`  - ${p.name} (priority: ${p.priority}, limits: ${p.limits})`);
        });
      }
    } catch (error) {
      logger.error('Failed to initialize IPFS client:', error);
      throw new Error('IPFS service initialization failed');
    }
  }

  /**
   * Ensure local storage directory exists
   */
  ensureLocalStorageDir() {
    const fs = require('fs');
    const path = require('path');
    
    try {
      if (!fs.existsSync(this.localStoragePath)) {
        fs.mkdirSync(this.localStoragePath, { recursive: true });
        logger.info(`Created local IPFS storage directory: ${this.localStoragePath}`);
      }
    } catch (error) {
      logger.error('Failed to create local storage directory:', error);
    }
  }

  /**
   * Upload file to IPFS with automatic provider fallback and retry logic
   * @param {Buffer} fileBuffer - File content as buffer
   * @param {string} filename - Name of the file
   * @param {Object} metadata - Additional metadata
   * @param {boolean} encryption - Whether file is encrypted (default: true)
   * @returns {Promise<Object>} Upload result with CID, encryption key, and provider
   */
  async uploadFile(fileBuffer, filename, metadata = {}, encryption = true) {
    const enabledProviders = this.providers.filter(p => p.enabled);
    
    if (enabledProviders.length === 0) {
      // Queue upload for later if no providers available
      return await this.queueUpload(fileBuffer, filename, metadata, encryption);
    }

    let lastError = null;
    
    // Try each provider in priority order
    for (const provider of enabledProviders) {
      try {
        logger.info(`Attempting upload to ${provider.name}...`, { filename });
        
        const result = await this.uploadWithRetry(
          provider,
          fileBuffer,
          filename,
          metadata
        );
        
        logger.info(`Upload successful via ${provider.name}`, { 
          filename, 
          cid: result.cid 
        });
        
        return {
          cid: result.cid,
          size: fileBuffer.length,
          provider: provider.name,
          gateway: `${this.ipfsGateway}${result.cid}`,
          pinned: true,
          timestamp: new Date().toISOString()
        };
        
      } catch (error) {
        lastError = error;
        logger.warn(`Upload failed for ${provider.name}: ${error.message}`, { filename });
        // Continue to next provider
      }
    }
    
    // All providers failed
    logger.error('All IPFS providers failed', { filename, error: lastError?.message });
    
    // Queue for retry
    await this.queueUpload(fileBuffer, filename, metadata, encryption);
    
    throw new Error(`IPFS upload failed: All providers unavailable. Upload queued for retry.`);
  }

  /**
   * Upload with exponential backoff retry logic
   */
  async uploadWithRetry(provider, fileBuffer, filename, metadata, attempt = 1) {
    try {
      switch (provider.name) {
        case 'web3.storage':
          return await this.uploadToWeb3Storage(fileBuffer, filename, metadata);
        case 'pinata':
          return await this.uploadToPinata(fileBuffer, filename, metadata);
        case 'nft.storage':
          return await this.uploadToNFTStorage(fileBuffer, filename, metadata);
        case 'local':
          return await this.uploadToLocal(fileBuffer, filename, metadata);
        default:
          throw new Error(`Unknown provider: ${provider.name}`);
      }
    } catch (error) {
      if (attempt < this.retryConfig.maxRetries && this.isRetriableError(error) && provider.name !== 'local') {
        const delay = Math.min(
          this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
          this.retryConfig.maxDelay
        );
        
        logger.info(`Retrying upload to ${provider.name} in ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`);
        
        await this.sleep(delay);
        return await this.uploadWithRetry(provider, fileBuffer, filename, metadata, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Check if error is retriable (network errors, timeouts, 5xx errors)
   */
  isRetriableError(error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }
    
    if (error.response && error.response.status >= 500) {
      return true;
    }
    
    return false;
  }

  /**
   * Queue upload for later processing
   */
  async queueUpload(fileBuffer, filename, metadata, encryption) {
    const queueItem = {
      fileBuffer,
      filename,
      metadata,
      encryption,
      timestamp: new Date().toISOString(),
      attempts: 0
    };
    
    this.uploadQueue.push(queueItem);
    logger.info(`Upload queued for later processing`, { 
      filename, 
      queueLength: this.uploadQueue.length 
    });
    
    // Try to process queue if not already processing
    if (!this.isProcessingQueue) {
      setTimeout(() => this.processQueue(), 5000); // Try again in 5 seconds
    }
    
    return {
      queued: true,
      queuePosition: this.uploadQueue.length,
      message: 'Upload queued for processing when providers become available'
    };
  }

  /**
   * Process queued uploads
   */
  async processQueue() {
    if (this.isProcessingQueue || this.uploadQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    logger.info(`Processing upload queue (${this.uploadQueue.length} items)`);
    
    const enabledProviders = this.providers.filter(p => p.enabled);
    
    if (enabledProviders.length === 0) {
      logger.warn('No providers available, queue processing postponed');
      this.isProcessingQueue = false;
      return;
    }
    
    while (this.uploadQueue.length > 0) {
      const item = this.uploadQueue[0];
      
      try {
        await this.uploadFile(item.fileBuffer, item.filename, item.metadata, item.encryption);
        this.uploadQueue.shift(); // Remove from queue on success
        logger.info(`Queued upload processed successfully`, { filename: item.filename });
      } catch (error) {
        item.attempts++;
        
        if (item.attempts >= 5) {
          logger.error(`Queued upload failed after 5 attempts, removing from queue`, { 
            filename: item.filename 
          });
          this.uploadQueue.shift();
        } else {
          logger.warn(`Queued upload failed, will retry later`, { 
            filename: item.filename,
            attempts: item.attempts 
          });
          break; // Stop processing queue, will retry later
        }
      }
    }
    
    this.isProcessingQueue = false;
    
    // Schedule next queue processing if items remain
    if (this.uploadQueue.length > 0) {
      setTimeout(() => this.processQueue(), 30000); // Try again in 30 seconds
    }
  }

  /**
   * Sleep utility for retry delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Upload to Web3.Storage (Primary provider - unlimited free storage)
   */
  async uploadToWeb3Storage(fileBuffer, filename, metadata) {
    try {
      const provider = this.providers.find(p => p.name === 'web3.storage');
      
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(
        `${provider.endpoint}/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${provider.apiKey}`,
            'X-NAME': filename
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 60000
        }
      );

      const cid = response.data.cid;
      
      return {
        cid,
        size: fileBuffer.length
      };

    } catch (error) {
      logger.error('Web3.Storage upload failed:', { error: error.message, filename });
      throw new Error(`Web3.Storage upload failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Upload to Pinata (Fallback provider - 1GB free)
   */
  async uploadToPinata(fileBuffer, filename, metadata) {
    try {
      const provider = this.providers.find(p => p.name === 'pinata');
      
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);
      
      // Add metadata
      const pinataMetadata = {
        name: filename,
        keyvalues: {
          ...metadata,
          uploadedAt: new Date().toISOString()
        }
      };
      formData.append('pinataMetadata', JSON.stringify(pinataMetadata));

      const pinataOptions = {
        cidVersion: 1
      };
      formData.append('pinataOptions', JSON.stringify(pinataOptions));

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            pinata_api_key: provider.apiKey,
            pinata_secret_api_key: provider.apiSecret
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 60000
        }
      );

      const cid = response.data.IpfsHash;

      return {
        cid,
        size: fileBuffer.length
      };

    } catch (error) {
      logger.error('Pinata upload failed:', { error: error.message, filename });
      throw new Error(`Pinata upload failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Upload to NFT.Storage (Secondary fallback - unlimited free)
   */
  async uploadToNFTStorage(fileBuffer, filename, metadata) {
    try {
      const provider = this.providers.find(p => p.name === 'nft.storage');
      
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(
        `${provider.endpoint}/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${provider.apiKey}`
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 60000
        }
      );

      const cid = response.data.value.cid;

      return {
        cid,
        size: fileBuffer.length
      };

    } catch (error) {
      logger.error('NFT.Storage upload failed:', { error: error.message, filename });
      throw new Error(`NFT.Storage upload failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Upload to local storage (Final fallback when all IPFS providers are down)
   */
  async uploadToLocal(fileBuffer, filename, metadata) {
    try {
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');
      
      // Generate a pseudo-CID for local storage
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const localCid = `local_${hash.substring(0, 32)}`;
      
      // Create filename with timestamp to avoid conflicts
      const timestamp = Date.now();
      const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const localFilename = `${timestamp}_${safeFilename}`;
      const filePath = path.join(this.localStoragePath, localFilename);
      
      // Write file to local storage
      fs.writeFileSync(filePath, fileBuffer);
      
      // Create metadata file
      const metadataPath = path.join(this.localStoragePath, `${localFilename}.meta.json`);
      const fileMetadata = {
        originalFilename: filename,
        localFilename,
        localCid,
        size: fileBuffer.length,
        uploadedAt: new Date().toISOString(),
        metadata: metadata || {}
      };
      fs.writeFileSync(metadataPath, JSON.stringify(fileMetadata, null, 2));
      
      logger.info(`File stored locally as fallback`, { 
        filename, 
        localCid, 
        path: filePath 
      });
      
      return {
        cid: localCid,
        size: fileBuffer.length,
        localPath: filePath
      };

    } catch (error) {
      logger.error('Local storage upload failed:', { error: error.message, filename });
      throw new Error(`Local storage upload failed: ${error.message}`);
    }
  }

  /**
   * Check health status of all IPFS providers
   */
  async checkIPFSHealth() {
    const healthStatus = {};
    
    for (const provider of this.providers) {
      if (!provider.enabled) {
        healthStatus[provider.name] = {
          available: false,
          reason: 'Not configured'
        };
        continue;
      }
      
      try {
        const startTime = Date.now();
        
        // Simple health check - try to access the API
        let isHealthy = false;
        
        switch (provider.name) {
          case 'web3.storage':
            // Check if we can authenticate
            await axios.get(`${provider.endpoint}/user/uploads`, {
              headers: { 'Authorization': `Bearer ${provider.apiKey}` },
              timeout: 5000
            });
            isHealthy = true;
            break;
            
          case 'pinata':
            // Test authentication
            await axios.get('https://api.pinata.cloud/data/testAuthentication', {
              headers: {
                pinata_api_key: provider.apiKey,
                pinata_secret_api_key: provider.apiSecret
              },
              timeout: 5000
            });
            isHealthy = true;
            break;
            
          case 'nft.storage':
            // Check API status
            await axios.get(`${provider.endpoint}/`, {
              headers: { 'Authorization': `Bearer ${provider.apiKey}` },
              timeout: 5000
            });
            isHealthy = true;
            break;
        }
        
        const responseTime = Date.now() - startTime;
        
        healthStatus[provider.name] = {
          available: isHealthy,
          responseTime,
          priority: provider.priority
        };
        
      } catch (error) {
        healthStatus[provider.name] = {
          available: false,
          reason: error.message,
          priority: provider.priority
        };
      }
    }
    
    return healthStatus;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.uploadQueue.length,
      isProcessing: this.isProcessingQueue,
      items: this.uploadQueue.map(item => ({
        filename: item.filename,
        timestamp: item.timestamp,
        attempts: item.attempts
      }))
    };
  }

  /**
   * Retrieve file from IPFS using public gateway or local storage
   */
  async retrieveFile(ipfsHash) {
    try {
      // Check if it's a local file
      if (ipfsHash.startsWith('local_')) {
        return await this.retrieveLocalFile(ipfsHash);
      }
      
      // Try IPFS gateway
      const response = await axios.get(`${this.ipfsGateway}${ipfsHash}`, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      return Buffer.from(response.data);
    } catch (error) {
      logger.error('File retrieval failed:', { error: error.message, ipfsHash });
      throw new Error(`IPFS retrieval failed: ${error.message}`);
    }
  }

  /**
   * Retrieve file from local storage
   */
  async retrieveLocalFile(localCid) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Find all metadata files
      const files = fs.readdirSync(this.localStoragePath);
      const metadataFiles = files.filter(f => f.endsWith('.meta.json'));
      
      if (metadataFiles.length === 0) {
        throw new Error('No local file metadata found');
      }
      
      // Find the metadata file that matches this CID
      let matchedMetadata = null;
      let matchedMetadataFile = null;
      
      for (const metadataFile of metadataFiles) {
        const metadataPath = path.join(this.localStoragePath, metadataFile);
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        
        if (metadata.localCid === localCid) {
          matchedMetadata = metadata;
          matchedMetadataFile = metadataFile;
          break;
        }
      }
      
      if (!matchedMetadata) {
        throw new Error(`Local CID not found: ${localCid}`);
      }
      
      const filePath = path.join(this.localStoragePath, matchedMetadata.localFilename);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Local file not found: ${matchedMetadata.localFilename}`);
      }
      
      logger.info('Local file retrieved successfully', { 
        localCid, 
        filename: matchedMetadata.localFilename 
      });
      
      return fs.readFileSync(filePath);
      
    } catch (error) {
      logger.error('Local file retrieval failed:', { error: error.message, localCid });
      throw new Error(`Local file retrieval failed: ${error.message}`);
    }
  }

  /**
   * Download file from IPFS (alias for retrieveFile)
   */
  async downloadFromIPFS(cid, encryptionKey = null) {
    const fileBuffer = await this.retrieveFile(cid);
    
    // If encryption key provided, caller should decrypt
    // This method just returns the raw buffer
    return fileBuffer;
  }



  /**
   * Get gateway URL for a CID
   */
  getGatewayUrl(ipfsHash) {
    return `${this.ipfsGateway}${ipfsHash}`;
  }

  /**
   * Validate IPFS CID format
   */
  isValidIPFSHash(hash) {
    // Check for CIDv0 (Qm...) or CIDv1 (bafy...)
    return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash) || /^bafy[a-z0-9]{55,}$/.test(hash);
  }

  /**
   * Get list of enabled providers
   */
  getEnabledProviders() {
    return this.providers.filter(p => p.enabled).map(p => ({
      name: p.name,
      priority: p.priority,
      limits: p.limits
    }));
  }
}

module.exports = new IPFSService();