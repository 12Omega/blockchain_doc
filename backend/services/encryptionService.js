const crypto = require('crypto');
const logger = require('../utils/logger');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
  }

  /**
   * Generate a random encryption key
   * @returns {string} Base64 encoded encryption key
   */
  generateKey() {
    try {
      const key = crypto.randomBytes(this.keyLength);
      return key.toString('base64');
    } catch (error) {
      logger.error('Key generation failed:', error);
      throw new Error('Failed to generate encryption key');
    }
  }

  /**
   * Generate a random encryption key (alias for tests)
   * @returns {string} Hex encoded encryption key
   */
  generateEncryptionKey() {
    try {
      const key = crypto.randomBytes(this.keyLength);
      return key.toString('hex');
    } catch (error) {
      logger.error('Key generation failed:', error);
      throw new Error('Failed to generate encryption key');
    }
  }

  /**
   * Encrypt data (for testing and general use)
   * @param {string|Buffer} data - Data to encrypt
   * @returns {Object} Encrypted data with IV and auth tag
   */
  async encryptData(data) {
    try {
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      const key = crypto.randomBytes(this.keyLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      // Use GCM mode for authenticated encryption
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      
      let encrypted = cipher.update(dataBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const authTag = cipher.getAuthTag();

      return {
        encryptedData: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        key: key.toString('hex'),
        authTag: authTag.toString('base64'),
        algorithm: 'aes-256-gcm'
      };
    } catch (error) {
      logger.error('Data encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data (for testing and general use)
   * @param {Object} encryptedData - Encrypted data object
   * @returns {string} Decrypted data
   */
  async decryptData(encryptedData) {
    try {
      const key = Buffer.from(encryptedData.key, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const encrypted = Buffer.from(encryptedData.encryptedData, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Data decryption failed:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt file buffer using AES-256-CBC
   * @param {Buffer} fileBuffer - File data to encrypt
   * @param {string} encryptionKey - Base64 encoded encryption key (optional, will generate if not provided)
   * @returns {Object} Encrypted data with IV and encryption key
   */
  encryptFile(fileBuffer, encryptionKey = null) {
    try {
      if (!Buffer.isBuffer(fileBuffer)) {
        throw new Error('File data must be a Buffer');
      }

      // Generate key if not provided
      const key = encryptionKey ? Buffer.from(encryptionKey, 'base64') : crypto.randomBytes(this.keyLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(fileBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      const result = {
        encryptedData: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        encryptionKey: key.toString('base64'),
        algorithm: this.algorithm
      };

      logger.debug('File encrypted successfully', {
        originalSize: fileBuffer.length,
        encryptedSize: encrypted.length
      });

      return result;

    } catch (error) {
      logger.error('File encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt file data using AES-256-CBC
   * @param {Object} encryptedData - Encrypted data object
   * @param {string} encryptionKey - Base64 encoded encryption key (optional if included in encryptedData)
   * @returns {Buffer} Decrypted file buffer
   */
  decryptFile(encryptedData, encryptionKey = null) {
    try {
      if (!encryptedData || !encryptedData.encryptedData) {
        throw new Error('Invalid encrypted data format');
      }

      // Use provided key or key from encrypted data
      const keyToUse = encryptionKey || encryptedData.encryptionKey;
      if (!keyToUse) {
        throw new Error('Encryption key is required');
      }

      const key = Buffer.from(keyToUse, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const encrypted = Buffer.from(encryptedData.encryptedData, 'base64');

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      logger.debug('File decrypted successfully', {
        encryptedSize: encrypted.length,
        decryptedSize: decrypted.length
      });

      return decrypted;

    } catch (error) {
      logger.error('File decryption failed:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt data with user's public key (for key storage)
   * @param {string} data - Data to encrypt
   * @param {string} publicKey - RSA public key in PEM format
   * @returns {string} Base64 encoded encrypted data
   */
  encryptWithPublicKey(data, publicKey) {
    try {
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(data, 'utf8')
      );

      return encrypted.toString('base64');
    } catch (error) {
      logger.error('Public key encryption failed:', error);
      throw new Error(`Public key encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data with user's private key
   * @param {string} encryptedData - Base64 encoded encrypted data
   * @param {string} privateKey - RSA private key in PEM format
   * @returns {string} Decrypted data
   */
  decryptWithPrivateKey(encryptedData, privateKey) {
    try {
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(encryptedData, 'base64')
      );

      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Private key decryption failed:', error);
      throw new Error(`Private key decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate RSA key pair for asymmetric encryption
   * @returns {Object} Public and private key pair
   */
  generateKeyPair() {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      return { publicKey, privateKey };
    } catch (error) {
      logger.error('Key pair generation failed:', error);
      throw new Error('Failed to generate key pair');
    }
  }

  /**
   * Generate SHA-256 hash of file
   * @param {Buffer} fileBuffer - File data
   * @returns {string} Hex encoded hash with 0x prefix
   */
  generateFileHash(fileBuffer) {
    try {
      if (!Buffer.isBuffer(fileBuffer)) {
        throw new Error('File data must be a Buffer');
      }

      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      return '0x' + hash;
    } catch (error) {
      logger.error('Hash generation failed:', error);
      throw new Error(`Hash generation failed: ${error.message}`);
    }
  }

  /**
   * Verify file integrity by comparing hashes
   * @param {Buffer} fileBuffer - File data
   * @param {string} expectedHash - Expected hash with 0x prefix
   * @returns {boolean} True if hashes match
   */
  verifyFileIntegrity(fileBuffer, expectedHash) {
    try {
      const actualHash = this.generateFileHash(fileBuffer);
      return actualHash.toLowerCase() === expectedHash.toLowerCase();
    } catch (error) {
      logger.error('File integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Generate secure random nonce
   * @param {number} length - Length in bytes (default: 32)
   * @returns {string} Base64 encoded nonce
   */
  generateNonce(length = 32) {
    try {
      const nonce = crypto.randomBytes(length);
      return nonce.toString('base64');
    } catch (error) {
      logger.error('Nonce generation failed:', error);
      throw new Error('Failed to generate nonce');
    }
  }

  /**
   * Create HMAC signature for data integrity
   * @param {string} data - Data to sign
   * @param {string} secret - Secret key
   * @returns {string} Base64 encoded HMAC signature
   */
  createHMAC(data, secret) {
    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(data);
      return hmac.digest('base64');
    } catch (error) {
      logger.error('HMAC creation failed:', error);
      throw new Error(`HMAC creation failed: ${error.message}`);
    }
  }

  /**
   * Verify HMAC signature
   * @param {string} data - Original data
   * @param {string} signature - HMAC signature to verify
   * @param {string} secret - Secret key
   * @returns {boolean} True if signature is valid
   */
  verifyHMAC(data, signature, secret) {
    try {
      const expectedSignature = this.createHMAC(data, secret);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(expectedSignature, 'base64')
      );
    } catch (error) {
      logger.error('HMAC verification failed:', error);
      return false;
    }
  }

  /**
   * Securely compare two strings to prevent timing attacks
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {boolean} True if strings are equal
   */
  secureCompare(a, b) {
    try {
      if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
      }

      if (a.length !== b.length) {
        return false;
      }

      return crypto.timingSafeEqual(
        Buffer.from(a, 'utf8'),
        Buffer.from(b, 'utf8')
      );
    } catch (error) {
      logger.error('Secure comparison failed:', error);
      return false;
    }
  }

  /**
   * Encrypt encryption key for secure storage in database
   * Uses a master key from environment variable
   * @param {string} encryptionKey - Base64 encoded encryption key
   * @returns {Object} Encrypted key with IV
   */
  encryptKeyForStorage(encryptionKey) {
    try {
      const masterKey = process.env.MASTER_ENCRYPTION_KEY || 'default-master-key-change-in-production';
      
      // Derive a 32-byte key from master key
      const key = crypto.createHash('sha256').update(masterKey).digest();
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(encryptionKey, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      return {
        encryptedKey: encrypted.toString('base64'),
        iv: iv.toString('base64')
      };
    } catch (error) {
      logger.error('Key encryption for storage failed:', error);
      throw new Error(`Key encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt encryption key from database storage
   * @param {Object} encryptedKeyData - Object with encryptedKey and iv
   * @returns {string} Base64 encoded encryption key
   */
  decryptKeyFromStorage(encryptedKeyData) {
    try {
      if (!encryptedKeyData || !encryptedKeyData.encryptedKey || !encryptedKeyData.iv) {
        throw new Error('Invalid encrypted key data format');
      }

      const masterKey = process.env.MASTER_ENCRYPTION_KEY || 'default-master-key-change-in-production';
      
      // Derive the same 32-byte key from master key
      const key = crypto.createHash('sha256').update(masterKey).digest();
      const iv = Buffer.from(encryptedKeyData.iv, 'base64');
      const encrypted = Buffer.from(encryptedKeyData.encryptedKey, 'base64');

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Key decryption from storage failed:', error);
      throw new Error(`Key decryption failed: ${error.message}`);
    }
  }
}

module.exports = new EncryptionService();