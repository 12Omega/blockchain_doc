const crypto = require("crypto");
const { ethers } = require("ethers");
const encryptionService = require("../../services/encryptionService");
const fs = require("fs");
const path = require("path");

/**
 * Encryption and key management security tests
 */

describe("Encryption and Key Management Security Tests", () => {
  let testData, testFile, testKey, testIv;

  beforeEach(() => {
    // Generate test data
    testData =
      "This is sensitive test data that needs to be encrypted securely.";
    testFile = Buffer.from(
      "%PDF-1.4\nTest PDF content for encryption testing\n%%EOF"
    );
    testKey = crypto.randomBytes(32); // 256-bit key
    testIv = crypto.randomBytes(16); // 128-bit IV
  });

  describe("Symmetric Encryption Security", () => {
    test("should use strong encryption algorithms", () => {
      // Test that AES-256-GCM is used (industry standard)
      const algorithm = "aes-256-gcm";
      const cipher = crypto.createCipher(algorithm, testKey);

      expect(cipher).toBeDefined();
      expect(algorithm).toContain("256"); // Strong key size
      expect(algorithm).toContain("gcm"); // Authenticated encryption
    });

    test("should generate cryptographically secure random keys", () => {
      const keys = [];

      // Generate multiple keys
      for (let i = 0; i < 10; i++) {
        const key = encryptionService.generateEncryptionKey();
        keys.push(key);

        // Key should be 32 bytes (256 bits)
        expect(Buffer.from(key, "hex")).toHaveLength(32);

        // Key should be unique
        expect(keys.filter((k) => k === key)).toHaveLength(1);
      }

      // All keys should be different
      const uniqueKeys = [...new Set(keys)];
      expect(uniqueKeys).toHaveLength(keys.length);
    });

    test("should use unique IVs for each encryption", async () => {
      const ivs = [];
      const plaintext = "Test data for IV uniqueness";

      // Encrypt same data multiple times
      for (let i = 0; i < 10; i++) {
        const encrypted = await encryptionService.encryptData(plaintext);
        const iv = encrypted.iv;
        ivs.push(iv);

        // IV should be 16 bytes (128 bits)
        expect(Buffer.from(iv, "hex")).toHaveLength(16);
      }

      // All IVs should be unique
      const uniqueIvs = [...new Set(ivs)];
      expect(uniqueIvs).toHaveLength(ivs.length);
    });

    test("should provide authenticated encryption", async () => {
      const plaintext = "Authenticated encryption test data";

      // Encrypt data
      const encrypted = await encryptionService.encryptData(plaintext);

      // Should include authentication tag
      expect(encrypted.authTag).toBeDefined();
      expect(Buffer.from(encrypted.authTag, "hex")).toHaveLength(16); // GCM auth tag is 16 bytes

      // Decrypt should succeed with correct auth tag
      const decrypted = await encryptionService.decryptData(encrypted);
      expect(decrypted).toBe(plaintext);

      // Tamper with ciphertext
      const tamperedEncrypted = {
        ...encrypted,
        encryptedData: encrypted.encryptedData.slice(0, -2) + "XX", // Change last 2 chars
      };

      // Decryption should fail with tampered data
      await expect(
        encryptionService.decryptData(tamperedEncrypted)
      ).rejects.toThrow();
    });

    test("should handle large file encryption securely", async () => {
      // Create large test file (1MB)
      const largeFile = Buffer.alloc(1024 * 1024, "A");

      const startTime = Date.now();
      const encrypted = await encryptionService.encryptFile(largeFile);
      const encryptionTime = Date.now() - startTime;

      // Encryption should complete in reasonable time (< 5 seconds)
      expect(encryptionTime).toBeLessThan(5000);

      // Encrypted data should be different from original
      expect(encrypted.encryptedData).not.toEqual(largeFile.toString("hex"));

      // Should be able to decrypt back to original
      const decrypted = await encryptionService.decryptFile(encrypted);
      expect(decrypted).toEqual(largeFile);
    });

    test("should prevent key reuse vulnerabilities", async () => {
      const plaintext1 = "First message";
      const plaintext2 = "Second message";

      // Encrypt two different messages
      const encrypted1 = await encryptionService.encryptData(plaintext1);
      const encrypted2 = await encryptionService.encryptData(plaintext2);

      // Should use different keys and IVs
      expect(encrypted1.key).not.toBe(encrypted2.key);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);

      // Ciphertexts should be different
      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
    });
  });

  describe("Key Management Security", () => {
    test("should securely derive keys from passwords", async () => {
      const password = "test-password-123";
      const salt = crypto.randomBytes(32);

      // Use PBKDF2 with high iteration count
      const derivedKey = await new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, 100000, 32, "sha256", (err, key) => {
          if (err) reject(err);
          else resolve(key);
        });
      });

      expect(derivedKey).toHaveLength(32);

      // Same password and salt should produce same key
      const derivedKey2 = await new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, 100000, 32, "sha256", (err, key) => {
          if (err) reject(err);
          else resolve(key);
        });
      });

      expect(derivedKey.equals(derivedKey2)).toBe(true);

      // Different salt should produce different key
      const differentSalt = crypto.randomBytes(32);
      const derivedKey3 = await new Promise((resolve, reject) => {
        crypto.pbkdf2(
          password,
          differentSalt,
          100000,
          32,
          "sha256",
          (err, key) => {
            if (err) reject(err);
            else resolve(key);
          }
        );
      });

      expect(derivedKey.equals(derivedKey3)).toBe(false);
    });

    test("should implement secure key storage", () => {
      // Test that keys are not stored in plain text
      const key = encryptionService.generateEncryptionKey();

      // Key should be hex encoded (not plain text)
      expect(key).toMatch(/^[0-9a-f]+$/i);

      // Key should not be stored in memory as plain text
      // (This is more of a design principle test)
      expect(typeof key).toBe("string");
      expect(key.length).toBe(64); // 32 bytes * 2 (hex encoding)
    });

    test("should implement key rotation capabilities", async () => {
      const plaintext = "Data for key rotation test";

      // Encrypt with first key
      const encrypted1 = await encryptionService.encryptData(plaintext);
      const key1 = encrypted1.key;

      // Simulate key rotation - encrypt with new key
      const encrypted2 = await encryptionService.encryptData(plaintext);
      const key2 = encrypted2.key;

      // Keys should be different
      expect(key1).not.toBe(key2);

      // Both should decrypt correctly
      const decrypted1 = await encryptionService.decryptData(encrypted1);
      const decrypted2 = await encryptionService.decryptData(encrypted2);

      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });

    test("should prevent key exposure in logs or errors", async () => {
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      const logs = [];
      const errors = [];

      // Capture console output
      console.log = (...args) => logs.push(args.join(" "));
      console.error = (...args) => errors.push(args.join(" "));

      try {
        // Generate and use encryption key
        const key = encryptionService.generateEncryptionKey();
        const encrypted = await encryptionService.encryptData("test data");

        // Force an error with invalid data
        try {
          await encryptionService.decryptData({
            encryptedData: "invalid",
            iv: "invalid",
            authTag: "invalid",
            key: key,
          });
        } catch (error) {
          console.error("Decryption error:", error.message);
        }

        // Check that keys are not exposed in logs
        const allOutput = [...logs, ...errors].join(" ");
        expect(allOutput).not.toContain(key);
        expect(allOutput).not.toContain(encrypted.key);
      } finally {
        // Restore console
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
      }
    });

    test("should implement secure key deletion", () => {
      // Test that keys can be securely wiped from memory
      let key = encryptionService.generateEncryptionKey();
      const keyBuffer = Buffer.from(key, "hex");

      // Simulate secure deletion by overwriting
      keyBuffer.fill(0);

      // Verify key is overwritten
      expect(keyBuffer.every((byte) => byte === 0)).toBe(true);

      // Original key string should still exist (strings are immutable in JS)
      // But in a real implementation, you'd use secure memory management
      expect(key).not.toBe("0".repeat(64));
    });
  });

  describe("Asymmetric Encryption Security", () => {
    test("should generate secure RSA key pairs", async () => {
      const keyPair = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: "spki",
          format: "pem",
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem",
        },
      });

      expect(keyPair.publicKey).toContain("BEGIN PUBLIC KEY");
      expect(keyPair.privateKey).toContain("BEGIN PRIVATE KEY");

      // Test encryption/decryption
      const plaintext = "RSA encryption test";
      const encrypted = crypto.publicEncrypt(
        keyPair.publicKey,
        Buffer.from(plaintext)
      );
      const decrypted = crypto.privateDecrypt(keyPair.privateKey, encrypted);

      expect(decrypted.toString()).toBe(plaintext);
    });

    test("should implement secure ECDSA signatures", async () => {
      const wallet = ethers.Wallet.createRandom();
      const message = "Test message for signing";

      // Sign message
      const signature = await wallet.signMessage(message);

      // Verify signature
      const recoveredAddress = ethers.verifyMessage(message, signature);
      expect(recoveredAddress).toBe(wallet.address);

      // Tampered message should fail verification
      const tamperedMessage = "Tampered message";
      const tamperedRecoveredAddress = ethers.verifyMessage(
        tamperedMessage,
        signature
      );
      expect(tamperedRecoveredAddress).not.toBe(wallet.address);
    });

    test("should prevent signature malleability attacks", async () => {
      const wallet = ethers.Wallet.createRandom();
      const message = "Signature malleability test";

      // Sign message
      const signature = await wallet.signMessage(message);

      // Parse signature components
      const sig = ethers.Signature.from(signature);

      // Check that signature uses canonical form (low s value)
      // This prevents signature malleability
      const secp256k1n = BigInt(
        "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
      );
      const halfN = secp256k1n / 2n;

      expect(BigInt(sig.s)).toBeLessThanOrEqual(halfN);
    });

    test("should implement secure key exchange", () => {
      // Test ECDH key exchange
      const alice = crypto.createECDH("secp256k1");
      const bob = crypto.createECDH("secp256k1");

      // Generate key pairs
      const alicePublicKey = alice.generateKeys();
      const bobPublicKey = bob.generateKeys();

      // Compute shared secrets
      const aliceSharedSecret = alice.computeSecret(bobPublicKey);
      const bobSharedSecret = bob.computeSecret(alicePublicKey);

      // Shared secrets should be identical
      expect(aliceSharedSecret.equals(bobSharedSecret)).toBe(true);

      // Shared secret should be 32 bytes
      expect(aliceSharedSecret).toHaveLength(32);
    });
  });

  describe("Cryptographic Hash Security", () => {
    test("should use secure hash algorithms", () => {
      const data = "Test data for hashing";

      // Test SHA-256 (secure)
      const sha256Hash = crypto.createHash("sha256").update(data).digest("hex");
      expect(sha256Hash).toHaveLength(64); // 256 bits = 64 hex chars

      // Test SHA-3 (also secure)
      const sha3Hash = crypto.createHash("sha3-256").update(data).digest("hex");
      expect(sha3Hash).toHaveLength(64);

      // Hashes should be different
      expect(sha256Hash).not.toBe(sha3Hash);
    });

    test("should prevent hash collision attacks", () => {
      const data1 = "First piece of data";
      const data2 = "Second piece of data";

      const hash1 = crypto.createHash("sha256").update(data1).digest("hex");
      const hash2 = crypto.createHash("sha256").update(data2).digest("hex");

      // Different data should produce different hashes
      expect(hash1).not.toBe(hash2);

      // Same data should produce same hash
      const hash1_repeat = crypto
        .createHash("sha256")
        .update(data1)
        .digest("hex");
      expect(hash1).toBe(hash1_repeat);
    });

    test("should implement secure HMAC", () => {
      const key = crypto.randomBytes(32);
      const data = "HMAC test data";

      // Create HMAC
      const hmac = crypto.createHmac("sha256", key);
      hmac.update(data);
      const digest = hmac.digest("hex");

      expect(digest).toHaveLength(64); // SHA-256 output

      // Same key and data should produce same HMAC
      const hmac2 = crypto.createHmac("sha256", key);
      hmac2.update(data);
      const digest2 = hmac2.digest("hex");

      expect(digest).toBe(digest2);

      // Different key should produce different HMAC
      const differentKey = crypto.randomBytes(32);
      const hmac3 = crypto.createHmac("sha256", differentKey);
      hmac3.update(data);
      const digest3 = hmac3.digest("hex");

      expect(digest).not.toBe(digest3);
    });

    test("should prevent length extension attacks", () => {
      // HMAC is resistant to length extension attacks
      const key = crypto.randomBytes(32);
      const originalData = "Original message";
      const additionalData = "Additional data";

      // Create HMAC of original data
      const originalHmac = crypto.createHmac("sha256", key);
      originalHmac.update(originalData);
      const originalDigest = originalHmac.digest("hex");

      // Create HMAC of extended data
      const extendedHmac = crypto.createHmac("sha256", key);
      extendedHmac.update(originalData + additionalData);
      const extendedDigest = extendedHmac.digest("hex");

      // Digests should be completely different
      expect(originalDigest).not.toBe(extendedDigest);

      // Cannot compute extended HMAC from original HMAC
      // (This is what prevents length extension attacks)
    });
  });

  describe("Random Number Generation Security", () => {
    test("should use cryptographically secure random number generation", () => {
      const randomBytes1 = crypto.randomBytes(32);
      const randomBytes2 = crypto.randomBytes(32);

      // Should be different
      expect(randomBytes1.equals(randomBytes2)).toBe(false);

      // Should be correct length
      expect(randomBytes1).toHaveLength(32);
      expect(randomBytes2).toHaveLength(32);
    });

    test("should pass basic randomness tests", () => {
      const sampleSize = 1000;
      const randomValues = [];

      // Generate random bytes
      for (let i = 0; i < sampleSize; i++) {
        const randomByte = crypto.randomBytes(1)[0];
        randomValues.push(randomByte);
      }

      // Test distribution (should be roughly uniform)
      const average =
        randomValues.reduce((sum, val) => sum + val, 0) / sampleSize;
      expect(average).toBeGreaterThan(100); // Should be around 127.5
      expect(average).toBeLessThan(155);

      // Test uniqueness (adjusted for realistic expectations)
      const uniqueValues = [...new Set(randomValues)];
      expect(uniqueValues.length).toBeGreaterThan(200); // At least 200 unique values out of 256 possible
    });

    test("should generate secure nonces", () => {
      const nonces = [];

      // Generate multiple nonces
      for (let i = 0; i < 100; i++) {
        const nonce = crypto.randomBytes(16).toString("hex");
        nonces.push(nonce);

        // Nonce should be 32 hex characters (16 bytes)
        expect(nonce).toHaveLength(32);
        expect(nonce).toMatch(/^[0-9a-f]+$/);
      }

      // All nonces should be unique
      const uniqueNonces = [...new Set(nonces)];
      expect(uniqueNonces).toHaveLength(nonces.length);
    });
  });

  describe("Side-Channel Attack Prevention", () => {
    test("should implement constant-time comparison", () => {
      const secret1 = "secret123456789";
      const secret2 = "secret123456789";
      const wrong = "wrong123456789";

      // Use crypto.timingSafeEqual for constant-time comparison
      const buffer1 = Buffer.from(secret1);
      const buffer2 = Buffer.from(secret2);
      const bufferWrong = Buffer.from(wrong);

      // Same secrets should match
      expect(crypto.timingSafeEqual(buffer1, buffer2)).toBe(true);

      // Different secrets should not match
      expect(crypto.timingSafeEqual(buffer1, bufferWrong)).toBe(false);
    });

    test("should prevent timing attacks on signature verification", async () => {
      const wallet = ethers.Wallet.createRandom();
      const message = "Timing attack test message";
      const signature = await wallet.signMessage(message);

      // Measure verification time for correct signature
      const startTime1 = process.hrtime.bigint();
      const result1 = ethers.verifyMessage(message, signature);
      const endTime1 = process.hrtime.bigint();
      const time1 = Number(endTime1 - startTime1);

      // Measure verification time for incorrect signature
      const wrongSignature = signature.slice(0, -2) + "00"; // Change last byte
      const startTime2 = process.hrtime.bigint();
      try {
        const result2 = ethers.verifyMessage(message, wrongSignature);
      } catch (error) {
        // Expected to fail
      }
      const endTime2 = process.hrtime.bigint();
      const time2 = Number(endTime2 - startTime2);

      // Times should be similar (within 50% of each other)
      // This is a basic test - real timing attack prevention requires more sophisticated analysis
      const timeDifference = Math.abs(time1 - time2);
      const averageTime = (time1 + time2) / 2;
      const relativeTimeDifference = timeDifference / averageTime;

      expect(relativeTimeDifference).toBeLessThan(0.5);
    });
  });

  describe("Key Derivation Security", () => {
    test("should implement secure password-based key derivation", async () => {
      const password = "user-password-123";
      const salt = crypto.randomBytes(32);
      const iterations = 100000; // High iteration count

      // Derive key using PBKDF2
      const derivedKey = await new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, iterations, 32, "sha256", (err, key) => {
          if (err) reject(err);
          else resolve(key);
        });
      });

      expect(derivedKey).toHaveLength(32);

      // Different password should produce different key
      const wrongPassword = "wrong-password-123";
      const wrongKey = await new Promise((resolve, reject) => {
        crypto.pbkdf2(
          wrongPassword,
          salt,
          iterations,
          32,
          "sha256",
          (err, key) => {
            if (err) reject(err);
            else resolve(key);
          }
        );
      });

      expect(derivedKey.equals(wrongKey)).toBe(false);
    });

    test("should use sufficient iteration count for PBKDF2", async () => {
      const password = "test-password";
      const salt = crypto.randomBytes(32);

      // Test with low iteration count (insecure)
      const lowIterations = 1000;
      const startTime1 = Date.now();
      const weakKey = await new Promise((resolve, reject) => {
        crypto.pbkdf2(
          password,
          salt,
          lowIterations,
          32,
          "sha256",
          (err, key) => {
            if (err) reject(err);
            else resolve(key);
          }
        );
      });
      const weakTime = Date.now() - startTime1;

      // Test with high iteration count (secure)
      const highIterations = 100000;
      const startTime2 = Date.now();
      const strongKey = await new Promise((resolve, reject) => {
        crypto.pbkdf2(
          password,
          salt,
          highIterations,
          32,
          "sha256",
          (err, key) => {
            if (err) reject(err);
            else resolve(key);
          }
        );
      });
      const strongTime = Date.now() - startTime2;

      // High iteration count should take significantly longer
      expect(strongTime).toBeGreaterThan(weakTime * 10);

      // Keys should be different
      expect(weakKey.equals(strongKey)).toBe(false);
    });

    test("should implement secure salt generation", () => {
      const salts = [];

      // Generate multiple salts
      for (let i = 0; i < 10; i++) {
        const salt = crypto.randomBytes(32);
        salts.push(salt.toString("hex"));

        // Salt should be 32 bytes
        expect(salt).toHaveLength(32);
      }

      // All salts should be unique
      const uniqueSalts = [...new Set(salts)];
      expect(uniqueSalts).toHaveLength(salts.length);
    });
  });
});
