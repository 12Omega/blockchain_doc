const { validationResult } = require('express-validator');
const { sanitizeRequest, validateRateLimit } = require('../utils/validation');
const logger = require('../utils/logger');

/**
 * Enhanced validation middleware with security features
 */

/**
 * Handle validation errors
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    logger.warn('Validation failed:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      errors: errorDetails,
      user: req.user?.walletAddress
    });
    
    // Use the first error message as the main error for better UX
    const firstError = errorDetails[0];
    const mainError = firstError ? firstError.message : 'Validation failed';
    
    return res.status(400).json({
      success: false,
      error: mainError,
      details: errorDetails
    });
  }
  
  next();
}

/**
 * SQL injection prevention middleware
 */
function preventSQLInjection(req, res, next) {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(\'|\"|;|--|\*|\|)/g,
    /(\bxp_cmdshell\b|\bsp_executesql\b)/gi
  ];
  
  function checkForSQLInjection(obj, path = '') {
    if (typeof obj === 'string') {
      for (const pattern of sqlPatterns) {
        if (pattern.test(obj)) {
          logger.warn('Potential SQL injection attempt detected:', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            field: path,
            value: obj,
            user: req.user?.walletAddress
          });
          
          return true;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (checkForSQLInjection(value, path ? `${path}.${key}` : key)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Check all request data
  const hasInjection = 
    checkForSQLInjection(req.body, 'body') ||
    checkForSQLInjection(req.query, 'query') ||
    checkForSQLInjection(req.params, 'params');
  
  if (hasInjection) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input detected'
    });
  }
  
  next();
}

/**
 * NoSQL injection prevention middleware
 */
function preventNoSQLInjection(req, res, next) {
  function sanitizeNoSQL(obj) {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (key.startsWith('$') || key.includes('.')) {
          logger.warn('Potential NoSQL injection attempt detected:', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            field: key,
            user: req.user?.walletAddress
          });
          
          return false;
        }
        
        if (typeof obj[key] === 'object') {
          if (!sanitizeNoSQL(obj[key])) {
            return false;
          }
        }
      }
    }
    
    return true;
  }
  
  // Check all request data
  const isSafe = 
    sanitizeNoSQL(req.body) &&
    sanitizeNoSQL(req.query) &&
    sanitizeNoSQL(req.params);
  
  if (!isSafe) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input detected'
    });
  }
  
  next();
}

/**
 * XSS prevention middleware
 */
function preventXSS(req, res, next) {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+src[\\s]*=[\\s]*["\']javascript:/gi,
    /<[^>]*\s(onerror|onload|onclick|onmouseover)\s*=/gi
  ];
  
  function checkForXSS(obj, path = '') {
    if (typeof obj === 'string') {
      for (const pattern of xssPatterns) {
        if (pattern.test(obj)) {
          logger.warn('Potential XSS attempt detected:', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            field: path,
            value: obj.substring(0, 100),
            user: req.user?.walletAddress
          });
          
          return true;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (checkForXSS(value, path ? `${path}.${key}` : key)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Check all request data
  const hasXSS = 
    checkForXSS(req.body, 'body') ||
    checkForXSS(req.query, 'query') ||
    checkForXSS(req.params, 'params');
  
  if (hasXSS) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input detected'
    });
  }
  
  next();
}

/**
 * Command injection prevention middleware
 */
function preventCommandInjection(req, res, next) {
  const commandPatterns = [
    /(\||&|;|`|\$\(|\$\{)/g,
    /(rm\s|del\s|format\s|shutdown\s)/gi,
    /(wget\s|curl\s|nc\s|netcat\s)/gi,
    /(\/bin\/|\/usr\/bin\/|cmd\.exe|powershell)/gi
  ];
  
  function checkForCommandInjection(obj, path = '') {
    if (typeof obj === 'string') {
      for (const pattern of commandPatterns) {
        if (pattern.test(obj)) {
          logger.warn('Potential command injection attempt detected:', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            field: path,
            value: obj.substring(0, 100),
            user: req.user?.walletAddress
          });
          
          return true;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (checkForCommandInjection(value, path ? `${path}.${key}` : key)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Check all request data
  const hasInjection = 
    checkForCommandInjection(req.body, 'body') ||
    checkForCommandInjection(req.query, 'query') ||
    checkForCommandInjection(req.params, 'params');
  
  if (hasInjection) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input detected'
    });
  }
  
  next();
}

/**
 * Path traversal prevention middleware
 */
function preventPathTraversal(req, res, next) {
  const pathPatterns = [
    /\.\.\//g,
    /\.\.\\/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
    /\.\.%2f/gi,
    /\.\.%5c/gi
  ];
  
  function checkForPathTraversal(obj, path = '') {
    if (typeof obj === 'string') {
      for (const pattern of pathPatterns) {
        if (pattern.test(obj)) {
          logger.warn('Potential path traversal attempt detected:', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            field: path,
            value: obj,
            user: req.user?.walletAddress
          });
          
          return true;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (checkForPathTraversal(value, path ? `${path}.${key}` : key)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Check all request data
  const hasTraversal = 
    checkForPathTraversal(req.body, 'body') ||
    checkForPathTraversal(req.query, 'query') ||
    checkForPathTraversal(req.params, 'params');
  
  if (hasTraversal) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input detected'
    });
  }
  
  next();
}

/**
 * Content-Type validation middleware
 */
function validateContentType(allowedTypes = ['application/json', 'multipart/form-data']) {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }
    
    const contentType = req.get('Content-Type');
    
    if (!contentType) {
      return res.status(400).json({
        success: false,
        error: 'Content-Type header is required'
      });
    }
    
    const isAllowed = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (!isAllowed) {
      logger.warn('Invalid Content-Type:', {
        ip: req.ip,
        contentType,
        path: req.path,
        allowedTypes,
        user: req.user?.walletAddress
      });
      
      return res.status(415).json({
        success: false,
        error: `Unsupported Content-Type. Allowed types: ${allowedTypes.join(', ')}`
      });
    }
    
    next();
  };
}

/**
 * Request size validation middleware
 */
function validateRequestSize(maxSize = 50 * 1024 * 1024) { // 50MB default
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSize) {
      logger.warn('Request size exceeded:', {
        ip: req.ip,
        contentLength,
        maxSize,
        path: req.path,
        user: req.user?.walletAddress
      });
      
      return res.status(413).json({
        success: false,
        error: `Request size exceeds limit`
      });
    }
    
    next();
  };
}

/**
 * Comprehensive security validation middleware
 */
function securityValidation(options = {}) {
  const {
    enableSQLInjectionPrevention = true,
    enableNoSQLInjectionPrevention = true,
    enableXSSPrevention = true,
    enableCommandInjectionPrevention = true,
    enablePathTraversalPrevention = true,
    enableSanitization = true,
    enableRateLimit = false,
    rateLimitOptions = {}
  } = options;
  
  const middlewares = [];
  
  // Rate limiting should be first
  if (enableRateLimit) {
    middlewares.push(validateRateLimit(rateLimitOptions.windowMs, rateLimitOptions.max));
  }
  
  // Security checks should run BEFORE sanitization to detect attacks
  if (enableSQLInjectionPrevention) {
    middlewares.push(preventSQLInjection);
  }
  
  if (enableNoSQLInjectionPrevention) {
    middlewares.push(preventNoSQLInjection);
  }
  
  if (enableXSSPrevention) {
    middlewares.push(preventXSS);
  }
  
  if (enableCommandInjectionPrevention) {
    middlewares.push(preventCommandInjection);
  }
  
  if (enablePathTraversalPrevention) {
    middlewares.push(preventPathTraversal);
  }
  
  // Sanitization runs last to clean up any remaining issues
  if (enableSanitization) {
    middlewares.push(sanitizeRequest);
  }
  
  return middlewares;
}

module.exports = {
  handleValidationErrors,
  preventSQLInjection,
  preventNoSQLInjection,
  preventXSS,
  preventCommandInjection,
  preventPathTraversal,
  validateContentType,
  validateRequestSize,
  securityValidation
};