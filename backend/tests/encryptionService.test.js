const encryptionService = require('../services/encryptionService');
const crypto = require('crypto');

describe('Encryption Service', () => {
  describe('Key Generation', () => {
    it('should generate a valid encryption key', () => {
      const key = encryptionService.generateKey();
      
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
      
      // Should be base64 encoded
      const keyBuffer = Buffer.from(key, 'base64');
      expect(keyBuffer.length).toBe(32); // 256 bits
    });

    it('should generate unique keys', () => {
      const key1 = encryptionService.generateKey();
      const key2 = encryptionService.generateKey();
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('File Encryption/Decryption', () => {
    let testFileBuffer;
    let encryptionKey;

    beforeEach(() => {
      testFileBuffer = Buffer.from('This is a test file content for encryption');
      encryptionKey = encryptionService.generateKey();
    });

    it('should encrypt file successfully', () => {
      const encrypted = encryptionService.encryptFile(testFileBuffer, encryptionKey);
      
      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('encryptionKey');
      expect(encrypted).toHaveProperty('algorithm');
      expect(encrypted.algorithm).toBe('aes-256-cbc');
      
      // Encrypted data should be different from original
      expect(encrypted.encryptedData).not.toBe(testFileBuffer.toString('base64'));
    });

    it('should decrypt file successfully', () => {
      const encrypted = encryptionService.encryptFile(testFileBuffer, encryptionKey);
      const decrypted = encryptionService.decryptFile(encrypted, encryptionKey);
      
      expect(Buffer.isBuffer(decrypted)).toBe(true);
      expect(decrypted.toString()).toBe(testFileBuffer.toString());
    });

    it('should fail decryption with wrong key', () => {
      const encrypted = encryptionService.encryptFile(testFileBuffer, encryptionKey);
      const wrongKey = encryptionService.generateKey();
      
      expect(() => {
        encryptionService.decryptFile(encrypted, wrongKey);
      }).toThrow();
    });

    it('should fail decryption with tampered data', () => {
      const encrypted = encryptionService.encryptFile(testFileBuffer, encryptionKey);
      
      // Tamper with encrypted data
      encrypted.encryptedData = encrypted.encryptedData.slice(0, -4) + 'XXXX';
      
      expect(() => {
        encryptionService.decryptFile(encrypted, encryptionKey);
      }).toThrow();
    });

    it('should reject non-buffer input for encryption', () => {
      expect(() => {
        encryptionService.encryptFile('not a buffer', encryptionKey);
      }).toThrow('File data must be a Buffer');
    });

    it('should auto-generate key when not provided', () => {
      const encrypted = encryptionService.encryptFile(testFileBuffer);
      
      expect(encrypted).toHaveProperty('encryptionKey');
      expect(encrypted.encryptionKey).toBeTruthy();
      
      // Should be able to decrypt with the generated key
      const decrypted = encryptionService.decryptFile(encrypted);
      expect(decrypted.toString()).toBe(testFileBuffer.toString());
    });

    it('should reject invalid encrypted data format', () => {
      expect(() => {
        encryptionService.decryptFile({}, encryptionKey);
      }).toThrow('Invalid encrypted data format');
    });
  });

  describe('Hash Generation', () => {
    it('should generate SHA-256 hash with 0x prefix', () => {
      const testData = Buffer.from('test data');
      const hash = encryptionService.generateFileHash(testData);
      
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(hash.length).toBe(66); // 0x + 64 hex characters
    });

    it('should generate consistent hashes for same data', () => {
      const testData = Buffer.from('test data');
      const hash1 = encryptionService.generateFileHash(testData);
      const hash2 = encryptionService.generateFileHash(testData);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different data', () => {
      const testData1 = Buffer.from('test data 1');
      const testData2 = Buffer.from('test data 2');
      
      const hash1 = encryptionService.generateFileHash(testData1);
      const hash2 = encryptionService.generateFileHash(testData2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should reject non-buffer input for hashing', () => {
      expect(() => {
        encryptionService.generateFileHash('not a buffer');
      }).toThrow('File data must be a Buffer');
    });
  });

  describe('File Integrity Verification', () => {
    it('should verify file integrity correctly', () => {
      const testData = Buffer.from('test data');
      const hash = encryptionService.generateFileHash(testData);
      
      const isValid = encryptionService.verifyFileIntegrity(testData, hash);
      expect(isValid).toBe(true);
    });

    it('should detect file tampering', () => {
      const testData = Buffer.from('test data');
      const hash = encryptionService.generateFileHash(testData);
      const tamperedData = Buffer.from('tampered data');
      
      const isValid = encryptionService.verifyFileIntegrity(tamperedData, hash);
      expect(isValid).toBe(false);
    });

    it('should handle case-insensitive hash comparison', () => {
      const testData = Buffer.from('test data');
      const hash = encryptionService.generateFileHash(testData);
      const upperCaseHash = hash.toUpperCase();
      
      const isValid = encryptionService.verifyFileIntegrity(testData, upperCaseHash);
      expect(isValid).toBe(true);
    });
  });

  describe('RSA Key Pair Generation', () => {
    it('should generate valid RSA key pair', () => {
      const keyPair = encryptionService.generateKeyPair();
      
      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('should generate unique key pairs', () => {
      const keyPair1 = encryptionService.generateKeyPair();
      const keyPair2 = encryptionService.generateKeyPair();
      
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
    });
  });

  describe('Asymmetric Encryption', () => {
    let keyPair;
    let testData;

    beforeEach(() => {
      keyPair = encryptionService.generateKeyPair();
      testData = 'This is secret data';
    });

    it('should encrypt and decrypt with RSA key pair', () => {
      const encrypted = encryptionService.encryptWithPublicKey(testData, keyPair.publicKey);
      const decrypted = encryptionService.decryptWithPrivateKey(encrypted, keyPair.privateKey);
      
      expect(decrypted).toBe(testData);
    });

    it('should fail decryption with wrong private key', () => {
      const wrongKeyPair = encryptionService.generateKeyPair();
      const encrypted = encryptionService.encryptWithPublicKey(testData, keyPair.publicKey);
      
      expect(() => {
        encryptionService.decryptWithPrivateKey(encrypted, wrongKeyPair.privateKey);
      }).toThrow();
    });
  });

  describe('Nonce Generation', () => {
    it('should generate nonce with default length', () => {
      const nonce = encryptionService.generateNonce();
      
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);
      
      // Should be base64 encoded
      const nonceBuffer = Buffer.from(nonce, 'base64');
      expect(nonceBuffer.length).toBe(32); // Default 32 bytes
    });

    it('should generate nonce with custom length', () => {
      const nonce = encryptionService.generateNonce(16);
      const nonceBuffer = Buffer.from(nonce, 'base64');
      
      expect(nonceBuffer.length).toBe(16);
    });

    it('should generate unique nonces', () => {
      const nonce1 = encryptionService.generateNonce();
      const nonce2 = encryptionService.generateNonce();
      
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('HMAC Operations', () => {
    const testData = 'test data';
    const secret = 'secret key';

    it('should create HMAC signature', () => {
      const signature = encryptionService.createHMAC(testData, secret);
      
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should verify HMAC signature', () => {
      const signature = encryptionService.createHMAC(testData, secret);
      const isValid = encryptionService.verifyHMAC(testData, signature, secret);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid HMAC signature', () => {
      const signature = encryptionService.createHMAC(testData, secret);
      const isValid = encryptionService.verifyHMAC('tampered data', signature, secret);
      
      expect(isValid).toBe(false);
    });

    it('should reject HMAC with wrong secret', () => {
      const signature = encryptionService.createHMAC(testData, secret);
      const isValid = encryptionService.verifyHMAC(testData, signature, 'wrong secret');
      
      expect(isValid).toBe(false);
    });
  });

  describe('Secure Comparison', () => {
    it('should return true for identical strings', () => {
      const result = encryptionService.secureCompare('test', 'test');
      expect(result).toBe(true);
    });

    it('should return false for different strings', () => {
      const result = encryptionService.secureCompare('test1', 'test2');
      expect(result).toBe(false);
    });

    it('should return false for different length strings', () => {
      const result = encryptionService.secureCompare('test', 'testing');
      expect(result).toBe(false);
    });

    it('should return false for non-string inputs', () => {
      const result1 = encryptionService.secureCompare(123, 'test');
      const result2 = encryptionService.secureCompare('test', null);
      
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });

  describe('Key Storage Encryption', () => {
    let testKey;

    beforeEach(() => {
      testKey = encryptionService.generateKey();
    });

    it('should encrypt key for storage', () => {
      const encrypted = encryptionService.encryptKeyForStorage(testKey);
      
      expect(encrypted).toHaveProperty('encryptedKey');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted.encryptedKey).not.toBe(testKey);
    });

    it('should decrypt key from storage', () => {
      const encrypted = encryptionService.encryptKeyForStorage(testKey);
      const decrypted = encryptionService.decryptKeyFromStorage(encrypted);
      
      expect(decrypted).toBe(testKey);
    });

    it('should generate unique IVs for key storage', () => {
      const encrypted1 = encryptionService.encryptKeyForStorage(testKey);
      const encrypted2 = encryptionService.encryptKeyForStorage(testKey);
      
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.encryptedKey).not.toBe(encrypted2.encryptedKey);
    });

    it('should reject invalid encrypted key data', () => {
      expect(() => {
        encryptionService.decryptKeyFromStorage({});
      }).toThrow('Invalid encrypted key data format');
    });

    it('should handle key storage round trip', () => {
      // Generate multiple keys and ensure they all round trip correctly
      const keys = [
        encryptionService.generateKey(),
        encryptionService.generateKey(),
        encryptionService.generateKey()
      ];

      keys.forEach(key => {
        const encrypted = encryptionService.encryptKeyForStorage(key);
        const decrypted = encryptionService.decryptKeyFromStorage(encrypted);
        expect(decrypted).toBe(key);
      });
    });
  });
});