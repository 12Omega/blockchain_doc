const { ethers } = require('ethers');
const logger = require('../utils/logger');

// Import contract ABIs (these would be generated from the smart contracts)
const DocumentRegistryABI = require('../contracts/DocumentRegistry.json');
const AccessControlABI = require('../contracts/AccessControl.json');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.documentRegistryContract = null;
    this.accessControlContract = null;
    
    this.initializeProvider();
  }

  initializeProvider() {
    try {
      const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Only initialize wallet if we have a valid private key
      const privateKey = process.env.PRIVATE_KEY;
      if (privateKey && privateKey !== 'your_private_key_here' && !privateKey.includes('your_')) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
      } else {
        logger.warn('No valid private key configured. Blockchain write operations will be disabled.');
      }

      // Initialize contracts
      this.initializeContracts();
      
      logger.info('Blockchain service initialized', {
        network: process.env.ETHEREUM_NETWORK || 'localhost',
        hasWallet: !!this.wallet
      });

    } catch (error) {
      logger.error('Blockchain service initialization failed:', error);
      logger.warn('Blockchain service will run in read-only mode');
      // Don't throw - allow service to continue without blockchain
    }
  }

  initializeContracts() {
    try {
      const documentRegistryAddress = process.env.CONTRACT_ADDRESS_DOCUMENT_REGISTRY;
      const accessControlAddress = process.env.CONTRACT_ADDRESS_ACCESS_CONTROL;

      if (documentRegistryAddress && this.wallet) {
        this.documentRegistryContract = new ethers.Contract(
          documentRegistryAddress,
          DocumentRegistryABI.abi || DocumentRegistryABI,
          this.wallet
        );
      }

      if (accessControlAddress && this.wallet) {
        this.accessControlContract = new ethers.Contract(
          accessControlAddress,
          AccessControlABI.abi || AccessControlABI,
          this.wallet
        );
      }

      logger.info('Smart contracts initialized', {
        documentRegistry: !!this.documentRegistryContract,
        accessControl: !!this.accessControlContract
      });

    } catch (error) {
      logger.error('Contract initialization failed:', error);
      // Don't throw here as contracts might not be deployed yet
    }
  }

  async registerDocument(documentHash, ipfsHash, ownerAddress, metadata = {}) {
    try {
      if (!this.documentRegistryContract) {
        throw new Error('Document registry contract not initialized');
      }

      logger.info('Registering document on blockchain', {
        documentHash,
        ipfsHash,
        ownerAddress
      });

      // Estimate gas
      const gasEstimate = await this.documentRegistryContract.registerDocument.estimateGas(
        documentHash,
        ipfsHash,
        ownerAddress,
        JSON.stringify(metadata)
      );

      // Add 20% buffer to gas estimate
      const gasLimit = Math.floor(gasEstimate * 1.2);

      // Get current gas price
      const gasPrice = await this.provider.getFeeData();

      // Execute transaction
      const transaction = await this.documentRegistryContract.registerDocument(
        documentHash,
        ipfsHash,
        ownerAddress,
        JSON.stringify(metadata),
        {
          gasLimit,
          gasPrice: gasPrice.gasPrice
        }
      );

      logger.info('Document registration transaction sent', {
        transactionHash: transaction.hash,
        gasLimit,
        gasPrice: gasPrice.gasPrice?.toString()
      });

      // Wait for confirmation
      const receipt = await transaction.wait();

      logger.info('Document registered successfully', {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString()
      });

      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        contractAddress: this.documentRegistryContract.address,
        success: true
      };

    } catch (error) {
      logger.error('Document registration failed:', {
        error: error.message,
        documentHash,
        ipfsHash
      });
      throw new Error(`Blockchain registration failed: ${error.message}`);
    }
  }

  async verifyDocument(documentHash) {
    try {
      if (!this.documentRegistryContract) {
        throw new Error('Document registry contract not initialized');
      }

      logger.info('Verifying document on blockchain', { documentHash });

      const document = await this.documentRegistryContract.getDocument(documentHash);

      const isValid = document.documentHash === documentHash && document.isActive;

      logger.info('Document verification completed', {
        documentHash,
        isValid,
        issuer: document.issuer,
        owner: document.owner
      });

      return {
        isValid,
        documentHash: document.documentHash,
        ipfsHash: document.ipfsHash,
        issuer: document.issuer,
        owner: document.owner,
        timestamp: document.timestamp?.toString(),
        isActive: document.isActive
      };

    } catch (error) {
      logger.error('Document verification failed:', {
        error: error.message,
        documentHash
      });
      throw new Error(`Blockchain verification failed: ${error.message}`);
    }
  }

  async transferOwnership(documentHash, newOwner, currentOwner) {
    try {
      if (!this.documentRegistryContract) {
        throw new Error('Document registry contract not initialized');
      }

      logger.info('Transferring document ownership', {
        documentHash,
        newOwner,
        currentOwner
      });

      // Estimate gas
      const gasEstimate = await this.documentRegistryContract.transferOwnership.estimateGas(
        documentHash,
        newOwner
      );

      const gasLimit = Math.floor(gasEstimate * 1.2);
      const gasPrice = await this.provider.getFeeData();

      // Execute transaction
      const transaction = await this.documentRegistryContract.transferOwnership(
        documentHash,
        newOwner,
        {
          gasLimit,
          gasPrice: gasPrice.gasPrice
        }
      );

      const receipt = await transaction.wait();

      logger.info('Ownership transferred successfully', {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString()
      });

      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        success: true
      };

    } catch (error) {
      logger.error('Ownership transfer failed:', {
        error: error.message,
        documentHash,
        newOwner
      });
      throw new Error(`Ownership transfer failed: ${error.message}`);
    }
  }

  async checkUserRole(userAddress) {
    try {
      if (!this.accessControlContract) {
        throw new Error('Access control contract not initialized');
      }

      const role = await this.accessControlContract.getUserRole(userAddress);
      
      // Convert role number to string
      const roleNames = ['ADMIN', 'ISSUER', 'VERIFIER', 'STUDENT'];
      const roleName = roleNames[role] || 'UNKNOWN';

      logger.debug('User role checked', { userAddress, role: roleName });

      return {
        address: userAddress,
        role: roleName,
        roleNumber: role
      };

    } catch (error) {
      logger.error('Role check failed:', {
        error: error.message,
        userAddress
      });
      throw new Error(`Role check failed: ${error.message}`);
    }
  }

  async grantRole(userAddress, role, grantedBy) {
    try {
      if (!this.accessControlContract) {
        throw new Error('Access control contract not initialized');
      }

      logger.info('Granting role to user', {
        userAddress,
        role,
        grantedBy
      });

      // Convert role string to number
      const roleNumbers = {
        'ADMIN': 0,
        'ISSUER': 1,
        'VERIFIER': 2,
        'STUDENT': 3
      };

      const roleNumber = roleNumbers[role.toUpperCase()];
      if (roleNumber === undefined) {
        throw new Error(`Invalid role: ${role}`);
      }

      const gasEstimate = await this.accessControlContract.grantRole.estimateGas(
        userAddress,
        roleNumber
      );

      const gasLimit = Math.floor(gasEstimate * 1.2);
      const gasPrice = await this.provider.getFeeData();

      const transaction = await this.accessControlContract.grantRole(
        userAddress,
        roleNumber,
        {
          gasLimit,
          gasPrice: gasPrice.gasPrice
        }
      );

      const receipt = await transaction.wait();

      logger.info('Role granted successfully', {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString()
      });

      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        success: true
      };

    } catch (error) {
      logger.error('Role grant failed:', {
        error: error.message,
        userAddress,
        role
      });
      throw new Error(`Role grant failed: ${error.message}`);
    }
  }

  async getTransactionStatus(transactionHash) {
    try {
      const receipt = await this.provider.getTransactionReceipt(transactionHash);
      
      if (!receipt) {
        return {
          status: 'pending',
          transactionHash
        };
      }

      return {
        status: receipt.status === 1 ? 'success' : 'failed',
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        confirmations: await receipt.confirmations()
      };

    } catch (error) {
      logger.error('Transaction status check failed:', {
        error: error.message,
        transactionHash
      });
      throw new Error(`Transaction status check failed: ${error.message}`);
    }
  }

  async getGasPrice() {
    try {
      const feeData = await this.provider.getFeeData();
      return {
        gasPrice: feeData.gasPrice?.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
      };
    } catch (error) {
      logger.error('Gas price fetch failed:', error);
      throw new Error(`Gas price fetch failed: ${error.message}`);
    }
  }

  async getBlockNumber() {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      logger.error('Block number fetch failed:', error);
      throw new Error(`Block number fetch failed: ${error.message}`);
    }
  }

  async getBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      logger.error('Balance fetch failed:', error);
      throw new Error(`Balance fetch failed: ${error.message}`);
    }
  }

  isValidAddress(address) {
    try {
      return ethers.isAddress(address);
    } catch (error) {
      return false;
    }
  }

  isValidTransactionHash(hash) {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  /**
   * Health check for blockchain connectivity
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      // Check if provider is available
      if (!this.provider) {
        return {
          status: 'error',
          connected: false,
          message: 'Provider not initialized'
        };
      }

      // Try to get block number
      const blockNumber = await this.getBlockNumber();
      const responseTime = Date.now() - startTime;

      // Check if contracts are initialized
      const contractsInitialized = !!(this.documentRegistryContract && this.accessControlContract);

      return {
        status: 'healthy',
        connected: true,
        blockNumber,
        responseTime,
        contractsInitialized,
        hasWallet: !!this.wallet,
        network: process.env.ETHEREUM_NETWORK || 'localhost',
        message: 'Blockchain service is operational'
      };
    } catch (error) {
      logger.error('Blockchain health check failed:', error);
      return {
        status: 'error',
        connected: false,
        message: error.message
      };
    }
  }

  /**
   * Get network information
   */
  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.getBlockNumber();
      const gasPrice = await this.getGasPrice();

      return {
        chainId: network.chainId.toString(),
        name: network.name,
        blockNumber,
        gasPrice
      };
    } catch (error) {
      logger.error('Failed to get network info:', error);
      throw new Error(`Network info fetch failed: ${error.message}`);
    }
  }

  async grantDocumentAccess(documentHash, userAddress, grantedBy) {
    try {
      if (!this.documentRegistryContract) {
        throw new Error('Document registry contract not initialized');
      }

      logger.info('Granting document access on blockchain', {
        documentHash,
        userAddress,
        grantedBy
      });

      // Estimate gas
      const gasEstimate = await this.documentRegistryContract.grantAccess.estimateGas(
        documentHash,
        userAddress
      );

      const gasLimit = Math.floor(gasEstimate * 1.2);
      const gasPrice = await this.provider.getFeeData();

      // Execute transaction
      const transaction = await this.documentRegistryContract.grantAccess(
        documentHash,
        userAddress,
        {
          gasLimit,
          gasPrice: gasPrice.gasPrice
        }
      );

      const receipt = await transaction.wait();

      logger.info('Document access granted successfully', {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString()
      });

      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        success: true
      };

    } catch (error) {
      logger.error('Grant document access failed:', {
        error: error.message,
        documentHash,
        userAddress
      });
      throw new Error(`Grant access failed: ${error.message}`);
    }
  }

  async revokeDocumentAccess(documentHash, userAddress, revokedBy) {
    try {
      if (!this.documentRegistryContract) {
        throw new Error('Document registry contract not initialized');
      }

      logger.info('Revoking document access on blockchain', {
        documentHash,
        userAddress,
        revokedBy
      });

      // Estimate gas
      const gasEstimate = await this.documentRegistryContract.revokeAccess.estimateGas(
        documentHash,
        userAddress
      );

      const gasLimit = Math.floor(gasEstimate * 1.2);
      const gasPrice = await this.provider.getFeeData();

      // Execute transaction
      const transaction = await this.documentRegistryContract.revokeAccess(
        documentHash,
        userAddress,
        {
          gasLimit,
          gasPrice: gasPrice.gasPrice
        }
      );

      const receipt = await transaction.wait();

      logger.info('Document access revoked successfully', {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString()
      });

      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        success: true
      };

    } catch (error) {
      logger.error('Revoke document access failed:', {
        error: error.message,
        documentHash,
        userAddress
      });
      throw new Error(`Revoke access failed: ${error.message}`);
    }
  }

  async assignRoleOnChain(userAddress, role, assignedBy) {
    try {
      if (!this.accessControlContract) {
        throw new Error('Access control contract not initialized');
      }

      logger.info('Assigning role on blockchain', {
        userAddress,
        role,
        assignedBy
      });

      // Convert role string to number
      const roleNumbers = {
        'admin': 0,
        'issuer': 1,
        'verifier': 2,
        'student': 3
      };

      const roleNumber = roleNumbers[role.toLowerCase()];
      if (roleNumber === undefined) {
        throw new Error(`Invalid role: ${role}`);
      }

      // Estimate gas
      const gasEstimate = await this.accessControlContract.assignRole.estimateGas(
        userAddress,
        roleNumber
      );

      const gasLimit = Math.floor(gasEstimate * 1.2);
      const gasPrice = await this.provider.getFeeData();

      // Execute transaction
      const transaction = await this.accessControlContract.assignRole(
        userAddress,
        roleNumber,
        {
          gasLimit,
          gasPrice: gasPrice.gasPrice
        }
      );

      const receipt = await transaction.wait();

      logger.info('Role assigned successfully on blockchain', {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        userAddress,
        role
      });

      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        success: true
      };

    } catch (error) {
      logger.error('Role assignment on blockchain failed:', {
        error: error.message,
        userAddress,
        role
      });
      throw new Error(`Blockchain role assignment failed: ${error.message}`);
    }
  }
}

module.exports = new BlockchainService();