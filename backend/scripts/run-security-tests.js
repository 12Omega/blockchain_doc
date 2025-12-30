#!/usr/bin/env node

/**
 * Security test runner script
 * Runs different categories of security tests
 */

const { spawn } = require('child_process');
const path = require('path');

const testCategories = {
  integration: 'tests/integration/**/*.test.js',
  security: 'tests/security/**/*.test.js',
  load: 'tests/load/**/*.test.js',
  all: 'tests/**/*.test.js'
};

function runTests(pattern, options = {}) {
  return new Promise((resolve, reject) => {
    const jestArgs = [
      '--testPathPattern', pattern,
      '--verbose',
      '--detectOpenHandles',
      '--forceExit'
    ];

    if (options.coverage) {
      jestArgs.push('--coverage');
    }

    if (options.bail) {
      jestArgs.push('--bail');
    }

    if (options.maxWorkers) {
      jestArgs.push('--maxWorkers', options.maxWorkers.toString());
    }

    console.log(`\n🧪 Running tests: ${pattern}`);
    console.log(`📋 Jest args: ${jestArgs.join(' ')}\n`);

    const jest = spawn('npx', ['jest', ...jestArgs], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    jest.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ Tests passed: ${pattern}\n`);
        resolve();
      } else {
        console.log(`\n❌ Tests failed: ${pattern}\n`);
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });

    jest.on('error', (error) => {
      console.error(`\n💥 Failed to start tests: ${error.message}\n`);
      reject(error);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const category = args[0] || 'all';
  
  const options = {
    coverage: args.includes('--coverage'),
    bail: args.includes('--bail'),
    maxWorkers: args.includes('--maxWorkers') ? 
      parseInt(args[args.indexOf('--maxWorkers') + 1]) : undefined
  };

  if (!testCategories[category]) {
    console.error(`\n❌ Unknown test category: ${category}`);
    console.log('\n📚 Available categories:');
    Object.keys(testCategories).forEach(cat => {
      console.log(`   - ${cat}: ${testCategories[cat]}`);
    });
    console.log('\n📖 Usage: node run-security-tests.js [category] [options]');
    console.log('   Options: --coverage, --bail, --maxWorkers <number>');
    process.exit(1);
  }

  try {
    const startTime = Date.now();
    
    console.log('🔒 Security Test Suite Runner');
    console.log('============================');
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    console.log(`🎯 Category: ${category}`);
    console.log(`📁 Pattern: ${testCategories[category]}`);
    
    if (options.coverage) console.log('📊 Coverage: enabled');
    if (options.bail) console.log('🛑 Bail: enabled');
    if (options.maxWorkers) console.log(`👥 Max workers: ${options.maxWorkers}`);

    await runTests(testCategories[category], options);
    
    const duration = Date.now() - startTime;
    console.log('🎉 All tests completed successfully!');
    console.log(`⏱️  Total time: ${(duration / 1000).toFixed(2)}s`);
    
  } catch (error) {
    console.error('💥 Test execution failed:', error.message);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test execution interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Test execution terminated');
  process.exit(1);
});

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testCategories };