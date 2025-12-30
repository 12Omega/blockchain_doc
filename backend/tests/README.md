# Comprehensive Testing Suite

This directory contains a comprehensive testing suite for the blockchain document verification system, covering integration tests, security tests, and load testing.

## Test Structure

```
tests/
├── integration/           # End-to-end workflow tests
│   ├── documentWorkflow.test.js
│   └── authenticationWorkflow.test.js
├── load/                 # Performance and load tests
│   └── concurrentUsers.test.js
├── security/             # Security and penetration tests
│   ├── vulnerabilityTests.test.js
│   ├── smartContractSecurity.test.js
│   └── encryptionSecurity.test.js
└── README.md            # This file
```

## Test Categories

### 1. Integration Tests (`tests/integration/`)

**Purpose**: Test complete workflows and user journeys end-to-end.

#### Document Workflow Tests (`documentWorkflow.test.js`)
- Complete document upload workflow
- Document verification workflow  
- Document access control workflow
- Document audit trail workflow
- Error handling and edge cases
- Performance under load

**Key Features Tested**:
- Multi-role user interactions (admin, issuer, student, verifier)
- Document lifecycle management
- Access control and permissions
- Audit trail generation
- Error scenarios and edge cases
- Concurrent operations

#### Authentication Workflow Tests (`authenticationWorkflow.test.js`)
- Wallet connection and nonce generation
- Signature verification and authentication
- Token-based authentication
- Role-based access control
- Session management
- Multi-wallet support
- Security edge cases

**Key Features Tested**:
- MetaMask wallet integration
- Cryptographic signature verification
- JWT token management
- Role-based permissions
- Session security
- Attack prevention (replay, fixation, etc.)

### 2. Load Tests (`tests/load/`)

**Purpose**: Test system performance under concurrent user load.

#### Concurrent Users Tests (`concurrentUsers.test.js`)
- 50+ concurrent user registrations
- 100+ concurrent authentication requests
- 25+ concurrent document uploads
- 100+ concurrent document retrievals
- 50+ concurrent document verifications
- Mixed workload stress testing
- System resource monitoring

**Performance Metrics**:
- Response times
- Success rates
- Throughput (operations/second)
- Memory usage
- Error rates
- System stability

**Load Test Scenarios**:
- User registration burst
- Authentication storm
- Document upload surge
- Verification flood
- Mixed operations
- Resource exhaustion

### 3. Security Tests (`tests/security/`)

**Purpose**: Test security vulnerabilities and attack vectors.

#### Vulnerability Tests (`vulnerabilityTests.test.js`)
- SQL Injection prevention
- NoSQL Injection prevention
- XSS (Cross-Site Scripting) prevention
- CSRF (Cross-Site Request Forgery) prevention
- Authentication and authorization security
- Input validation and sanitization
- Rate limiting
- Information disclosure prevention
- Business logic security
- Cryptographic security

**Security Test Coverage**:
- OWASP Top 10 vulnerabilities
- Authentication bypass attempts
- Authorization escalation
- Input validation attacks
- Session security
- Cryptographic attacks

#### Smart Contract Security Tests (`smartContractSecurity.test.js`)
- Access control security
- Reentrancy attack prevention
- Integer overflow/underflow protection
- Gas limit and DoS attack prevention
- Input validation and sanitization
- Ownership and transfer security
- Event emission security
- Upgrade and migration security
- Economic attack prevention
- Oracle and external call security

**Smart Contract Attack Vectors**:
- Unauthorized role assignment
- Privilege escalation
- Reentrancy attacks
- Gas griefing
- Front-running
- MEV attacks
- Signature replay

#### Encryption Security Tests (`encryptionSecurity.test.js`)
- Symmetric encryption security
- Key management security
- Asymmetric encryption security
- Cryptographic hash security
- Random number generation security
- Side-channel attack prevention
- Key derivation security

**Cryptographic Security Coverage**:
- AES-256-GCM encryption
- RSA and ECDSA signatures
- Secure key generation
- HMAC authentication
- PBKDF2 key derivation
- Timing attack prevention

## Running Tests

### Prerequisites

1. **Test Database**: Set up a test MongoDB instance
   ```bash
   # Set environment variable
   export MONGODB_TEST_URI="mongodb://localhost:27017/blockchain-doc-test"
   ```

2. **Test Blockchain**: Run a local Ethereum test network
   ```bash
   # Using Hardhat
   npx hardhat node
   ```

3. **Dependencies**: Install test dependencies
   ```bash
   npm install
   ```

### Test Commands

```bash
# Run all tests
npm run test:all

# Run specific test categories
npm run test:integration    # Integration tests only
npm run test:security      # Security tests only  
npm run test:load         # Load tests only

# Run with coverage
npm run test:coverage

# Run individual test files
npx jest tests/integration/documentWorkflow.test.js
npx jest tests/security/vulnerabilityTests.test.js
npx jest tests/load/concurrentUsers.test.js

# Run with specific options
npm run test:all -- --bail --maxWorkers=2
```

### Test Configuration

Tests are configured in `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  // ... other config
};
```

## Test Data and Mocking

### Test Users
Tests create users with different roles:
- **Admin**: Full system access
- **Issuer**: Can upload documents
- **Student**: Document owners
- **Verifier**: Can verify documents

### Mock Data
- Ethereum wallets (randomly generated)
- JWT tokens (test-signed)
- Document files (PDF buffers)
- IPFS hashes (mock format)

### Database Isolation
Each test suite uses isolated test databases:
- `blockchain-doc-integration-test`
- `blockchain-doc-auth-test`
- `blockchain-doc-load-test`
- `blockchain-doc-security-test`

## Performance Benchmarks

### Expected Performance Metrics

| Operation | Target Response Time | Target Success Rate |
|-----------|---------------------|-------------------|
| User Registration | < 2s | > 95% |
| Authentication | < 1s | > 98% |
| Document Upload | < 10s | > 90% |
| Document Retrieval | < 1s | > 99% |
| Document Verification | < 3s | > 95% |

### Load Test Targets

| Scenario | Concurrent Users | Duration | Success Rate |
|----------|-----------------|----------|--------------|
| Registration Burst | 50 | 30s | > 80% |
| Auth Storm | 100 | 20s | > 90% |
| Upload Surge | 25 | 45s | > 70% |
| Verification Flood | 50 | 20s | > 90% |
| Mixed Workload | 60 | 60s | > 80% |

## Security Test Coverage

### OWASP Top 10 Coverage
- ✅ A01: Broken Access Control
- ✅ A02: Cryptographic Failures  
- ✅ A03: Injection
- ✅ A04: Insecure Design
- ✅ A05: Security Misconfiguration
- ✅ A06: Vulnerable Components
- ✅ A07: Authentication Failures
- ✅ A08: Software Integrity Failures
- ✅ A09: Logging Failures
- ✅ A10: Server-Side Request Forgery

### Smart Contract Security
- Access control mechanisms
- Reentrancy protection
- Integer overflow protection
- Gas optimization
- Input validation
- Economic attack prevention

### Cryptographic Security
- Encryption algorithms (AES-256-GCM)
- Key management (secure generation, storage)
- Digital signatures (ECDSA)
- Hash functions (SHA-256, SHA-3)
- Random number generation
- Side-channel attack prevention

## Continuous Integration

### GitHub Actions Integration
```yaml
name: Security Tests
on: [push, pull_request]
jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:security
      - run: npm run test:integration
```

### Test Reports
- Coverage reports in `coverage/`
- Test results in JUnit XML format
- Performance metrics logging
- Security scan results

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Ensure MongoDB is running
   mongod --dbpath /path/to/test/db
   ```

2. **Blockchain Connection Errors**
   ```bash
   # Start local Hardhat network
   npx hardhat node
   ```

3. **Memory Issues in Load Tests**
   ```bash
   # Increase Node.js memory limit
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

4. **Test Timeouts**
   ```bash
   # Increase Jest timeout
   npx jest --testTimeout=30000
   ```

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm run test:security

# Run specific test with verbose output
npx jest tests/security/vulnerabilityTests.test.js --verbose
```

## Contributing

### Adding New Tests

1. **Integration Tests**: Add to `tests/integration/`
2. **Security Tests**: Add to `tests/security/`
3. **Load Tests**: Add to `tests/load/`

### Test Naming Convention
- File: `featureName.test.js`
- Describe: `Feature Name Tests`
- Test: `should do something specific`

### Test Structure
```javascript
describe('Feature Name Tests', () => {
  beforeAll(async () => {
    // Setup test environment
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup test data
  });

  describe('Specific Functionality', () => {
    test('should behave correctly', async () => {
      // Test implementation
    });
  });
});
```

## Security Considerations

### Test Environment Security
- Use isolated test databases
- Generate random test data
- Clean up sensitive test data
- Use mock credentials
- Avoid production endpoints

### Test Data Privacy
- No real user data in tests
- Generate synthetic test data
- Anonymize any real data samples
- Secure test credential storage

## Reporting Issues

When reporting test failures:
1. Include full error messages
2. Provide test environment details
3. Include steps to reproduce
4. Attach relevant logs
5. Specify test category and file

## Future Enhancements

### Planned Additions
- [ ] API fuzzing tests
- [ ] Chaos engineering tests
- [ ] Performance regression tests
- [ ] Mobile app integration tests
- [ ] Cross-browser compatibility tests
- [ ] Accessibility testing
- [ ] Internationalization tests

### Test Automation
- [ ] Automated security scanning
- [ ] Performance monitoring
- [ ] Test result analytics
- [ ] Failure notification system
- [ ] Test environment provisioning