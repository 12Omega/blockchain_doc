const http = require('http');

console.log('🧪 Running Live System Test...\n');

// Test 1: Backend Health Check
function testBackendHealth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.status === 'OK') {
            console.log('✅ Backend Health Check: PASSED');
            console.log(`   - Status: ${response.status}`);
            console.log(`   - Environment: ${response.environment}`);
            console.log(`   - Database: ${response.services.database.status}`);
            console.log(`   - Blockchain: ${response.services.blockchain.status}`);
            resolve(true);
          } else {
            reject(new Error('Backend not healthy'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Test 2: Authentication Endpoint
function testAuthentication() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      walletAddress: '0x1234567890123456789012345678901234567890'
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/nonce',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success && response.data.nonce) {
            console.log('✅ Authentication Endpoint: PASSED');
            console.log(`   - Nonce generated: ${response.data.nonce.substring(0, 10)}...`);
            console.log(`   - Message length: ${response.data.message.length} chars`);
            resolve(true);
          } else {
            reject(new Error('Authentication failed'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Test 3: Frontend Accessibility
function testFrontend() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200 && data.includes('<!DOCTYPE html>')) {
          console.log('✅ Frontend Accessibility: PASSED');
          console.log(`   - Status Code: ${res.statusCode}`);
          console.log(`   - Content Type: ${res.headers['content-type']}`);
          console.log(`   - HTML Content: ${data.length} bytes`);
          resolve(true);
        } else {
          reject(new Error('Frontend not accessible'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Run all tests
async function runTests() {
  const tests = [
    { name: 'Backend Health', test: testBackendHealth },
    { name: 'Authentication', test: testAuthentication },
    { name: 'Frontend', test: testFrontend }
  ];

  let passed = 0;
  let failed = 0;

  for (const { name, test } of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: FAILED`);
      console.log(`   - Error: ${error.message}`);
      failed++;
    }
    console.log('');
  }

  console.log('📊 Test Summary:');
  console.log(`   - Passed: ${passed}/${tests.length}`);
  console.log(`   - Failed: ${failed}/${tests.length}`);
  console.log(`   - Success Rate: ${Math.round((passed / tests.length) * 100)}%`);

  if (passed === tests.length) {
    console.log('\n🎉 All tests passed! System is fully operational.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above.');
  }
}

runTests().catch(console.error);