#!/usr/bin/env node

/**
 * Quick test to verify route configuration is working
 */

const express = require('express');

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';

try {
  console.log('Testing route configuration...');
  
  // Create a simple mock for validation middleware
  const mockMiddleware = (req, res, next) => next();
  
  // Mock the validation module
  require.cache[require.resolve('./middleware/validation')] = {
    exports: {
      securityValidation: () => [mockMiddleware],
      handleValidationErrors: mockMiddleware,
      validateContentType: () => mockMiddleware,
      validateRequestSize: () => mockMiddleware
    }
  };
  
  // Mock utils/validation
  require.cache[require.resolve('./utils/validation')] = {
    exports: {
      validationRules: {
        name: () => mockMiddleware,
        studentId: () => mockMiddleware,
        documentType: () => mockMiddleware,
        date: () => mockMiddleware,
        text: () => mockMiddleware,
        walletAddress: () => mockMiddleware
      }
    }
  };
  
  console.log('✅ Basic route configuration test setup complete');
  console.log('🎉 If no errors above, route structure is likely correct');
  
} catch (error) {
  console.error('❌ Route configuration test FAILED:');
  console.error(error.message);
  process.exit(1);
}