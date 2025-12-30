const { execSync } = require('child_process');

try {
  console.log('Compiling contracts...');
  execSync('npx hardhat compile', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Contracts compiled successfully!');
  
  console.log('Running tests...');
  execSync('npx hardhat test', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ All tests passed!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}