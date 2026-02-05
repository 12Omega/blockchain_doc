#!/usr/bin/env node

/**
 * Script to fix all validation arrays in route files
 * Removes array brackets from express-validator middleware
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing validation arrays in all route files...\n');

const routeFiles = [
  'routes/documents.js',
  'routes/admin.js',
  'routes/users.js',
  'routes/monitoring.js',
  'routes/performance.js'
];

let totalFixed = 0;

routeFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skipping ${file} (not found)`);
    return;
  }
  
  console.log(`📝 Processing ${file}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Pattern to match validation arrays
  // Matches: auth, \n  [ \n    body('field')...
  const pattern = /(,\s*\n\s*)(\/\/[^\n]*\n\s*)?\[\s*\n(\s*(?:body|param|query)\([^)]+\)[^\]]+)\n\s*\],(\s*\n\s*handleValidationErrors,)/g;
  
  let matchCount = 0;
  content = content.replace(pattern, (match, prefix, comment, validations, suffix) => {
    matchCount++;
    
    // Remove the array brackets and adjust indentation
    const fixedValidations = validations
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((line, index, array) => {
        // Add comma to all lines except the last
        if (index < array.length - 1 && !line.endsWith(',')) {
          return line + ',';
        }
        // Ensure last line has comma before handleValidationErrors
        if (index === array.length - 1 && !line.endsWith(',')) {
          return line + ',';
        }
        return line;
      })
      .join('\n  ');
    
    return `${prefix}${comment || ''}${fixedValidations}${suffix}`;
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${matchCount} validation arrays in ${file}`);
    totalFixed += matchCount;
  } else {
    console.log(`✓  No validation arrays found in ${file}`);
  }
});

console.log(`\n🎉 Complete! Fixed ${totalFixed} validation arrays total.`);
console.log('\n📋 Next steps:');
console.log('1. Run tests to verify fixes');
console.log('2. Check for any remaining issues');
console.log('3. Commit changes');
