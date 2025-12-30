const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');
const { body, param, query } = require('express-validator');

/**
 * Input validation and sanitization utilities
 * Implements comprehensive validation for all user inputs
 */

// File type validation
const ALLOWED_FILE_TYPES = {
  documents: ['pdf', 'doc', 'docx', 'txt'],
  images: ['jpg', 'jpeg', 'png', 'gif'],
  all: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif']
};

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  document: 10 * 1024 * 1024, // 10MB
  image: 5 * 1024 * 1024,     // 5MB
  default: 10 * 1024 * 1024   // 10MB
};

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove HTML tags and sanitize - DOMPurify removes tags but keeps text content
  // We need to strip all HTML completely
  let sanitized = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: false,  // Don't keep content of removed tags
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false
  });
  
  // Additional cleanup: remove any remaining HTML entities and tags
  sanitized = sanitized.replace(/<[^>]*>/g, ''); // Remove any remaining tags
  sanitized = sanitized.replace(/&[^;]+;/g, ''); // Remove HTML entities
  
  // Trim whitespace
  return validator.trim(sanitized);
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);
    sanitized[sanitizedKey] = sanitizeObject(value);
  }
  
  return sanitized;
}

/**
 * Validate Ethereum wallet address
 */
function isValidWalletAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // Check format: 0x followed by 40 hexadecimal characters
  const walletRegex = /^0x[a-fA-F0-9]{40}$/;
  return walletRegex.test(address);
}

/**
 * Validate document hash (SHA-256)
 */
function isValidDocumentHash(hash) {
  if (!hash || typeof hash !== 'string') {
    return false;
  }
  
  // Check format: 0x followed by 64 hexadecimal characters
  const hashRegex = /^0x[a-fA-F0-9]{64}$/;
  return hashRegex.test(hash);
}

/**
 * Validate IPFS hash
 */
function isValidIPFSHash(hash) {
  if (!hash || typeof hash !== 'string') {
    return false;
  }
  
  // IPFS hash patterns (CIDv0 and CIDv1)
  const ipfsRegex = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58}|B[A-Z2-7]{58}|z[1-9A-HJ-NP-Za-km-z]{48})$/;
  return ipfsRegex.test(hash);
}

/**
 * Validate file type
 */
function isValidFileType(filename, allowedTypes = ALLOWED_FILE_TYPES.all) {
  if (!filename || typeof filename !== 'string') {
    return false;
  }
  
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension && allowedTypes.includes(extension);
}

/**
 * Validate file size
 */
function isValidFileSize(size, type = 'default') {
  const limit = FILE_SIZE_LIMITS[type] || FILE_SIZE_LIMITS.default;
  return typeof size === 'number' && size > 0 && size <= limit;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  return validator.isEmail(email) && email.length <= 254;
}

/**
 * Validate URL format
 */
function isValidURL(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
    allow_underscores: false
  });
}

/**
 * Validate date format (ISO 8601)
 */
function isValidDate(date) {
  if (!date) {
    return false;
  }
  
  if (typeof date === 'string') {
    return validator.isISO8601(date);
  }
  
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  
  return false;
}

/**
 * Validate role
 */
function isValidRole(role) {
  const validRoles = ['admin', 'issuer', 'verifier', 'student'];
  return validRoles.includes(role);
}

/**
 * Validate document type
 */
function isValidDocumentType(type) {
  const validTypes = ['degree', 'certificate', 'transcript', 'diploma', 'other'];
  return validTypes.includes(type);
}

/**
 * Validate access level
 */
function isValidAccessLevel(level) {
  const validLevels = ['view', 'download', 'full'];
  return validLevels.includes(level);
}

/**
 * Express validator middleware for common validations
 */
const validationRules = {
  // Wallet address validation
  walletAddress: (field = 'walletAddress') => 
    body(field)
      .custom(value => {
        if (!isValidWalletAddress(value)) {
          throw new Error('Invalid wallet address format');
        }
        return true;
      })
      .customSanitizer(value => value?.toLowerCase()),

  // Document hash validation
  documentHash: (field = 'documentHash') =>
    body(field)
      .custom(value => {
        if (!isValidDocumentHash(value)) {
          throw new Error('Invalid document hash format');
        }
        return true;
      }),

  // IPFS hash validation
  ipfsHash: (field = 'ipfsHash') =>
    body(field)
      .custom(value => {
        if (!isValidIPFSHash(value)) {
          throw new Error('Invalid IPFS hash format');
        }
        return true;
      }),

  // Email validation
  email: (field = 'email') =>
    body(field)
      .optional()
      .isEmail()
      .withMessage('Invalid email format')
      .isLength({ max: 254 })
      .withMessage('Email too long')
      .normalizeEmail(),

  // Name validation
  name: (field = 'name', required = true) => {
    const validator = body(field)
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters')
      .matches(/^[a-zA-Z\s\-\.\']+$/)
      .withMessage('Name contains invalid characters')
      .customSanitizer(sanitizeString);
    
    return required ? validator.notEmpty() : validator.optional();
  },

  // Organization/Owner name validation
  organization: (field = 'organization', required = true) => {
    const validator = body(field)
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Organization name must be between 1 and 200 characters')
      .customSanitizer(sanitizeString);
    
    return required ? validator.notEmpty() : validator.optional();
  },

  // Student ID validation
  studentId: (field = 'studentId') =>
    body(field)
      .trim()
      .notEmpty()
      .withMessage('Student ID is required')
      .isLength({ max: 50 })
      .withMessage('Student ID must be less than 50 characters')
      .matches(/^[a-zA-Z0-9\-_]+$/)
      .withMessage('Student ID contains invalid characters')
      .customSanitizer(sanitizeString),

  // Document type validation
  documentType: (field = 'documentType') =>
    body(field)
      .isIn(['degree', 'certificate', 'transcript', 'diploma', 'other'])
      .withMessage('Invalid document type'),

  // Date validation
  date: (field = 'date', required = true) => {
    const validator = body(field)
      .isISO8601()
      .withMessage('Invalid date format (ISO 8601 required)')
      .toDate();
    
    return required ? validator.notEmpty() : validator.optional();
  },

  // Role validation
  role: (field = 'role') =>
    body(field)
      .isIn(['admin', 'issuer', 'verifier', 'student'])
      .withMessage('Invalid role'),

  // Access level validation
  accessLevel: (field = 'accessLevel') =>
    body(field)
      .isIn(['view', 'download', 'full'])
      .withMessage('Invalid access level'),

  // Generic text validation
  text: (field, maxLength = 500, required = false) => {
    const validator = body(field)
      .trim()
      .isLength({ max: maxLength })
      .withMessage(`${field} must be less than ${maxLength} characters`)
      .customSanitizer(sanitizeString);
    
    return required ? validator.notEmpty() : validator.optional();
  },

  // Pagination validation
  pagination: {
    page: query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    
    limit: query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt()
  }
};

/**
 * File validation middleware
 */
function validateFile(options = {}) {
  const {
    required = true,
    allowedTypes = ALLOWED_FILE_TYPES.all,
    maxSize = FILE_SIZE_LIMITS.default,
    fieldName = 'document'
  } = options;

  return (req, res, next) => {
    const file = req.file;
    
    if (!file && required) {
      return res.status(400).json({
        success: false,
        error: 'File is required'
      });
    }
    
    if (file) {
      // Validate file type
      if (!isValidFileType(file.originalname, allowedTypes)) {
        return res.status(400).json({
          success: false,
          error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
        });
      }
      
      // Validate file size - fix the validation logic
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`
        });
      }
      
      // Sanitize filename
      file.originalname = sanitizeString(file.originalname);
    }
    
    next();
  };
}

/**
 * Request sanitization middleware
 */
function sanitizeRequest(req, res, next) {
  // Sanitize body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitize params
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
}

/**
 * Rate limiting validation
 */
function validateRateLimit(windowMs = 15 * 60 * 1000, max = 100) {
  const requests = new Map();
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [ip, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter(time => time > windowStart);
      if (validTimestamps.length === 0) {
        requests.delete(ip);
      } else {
        requests.set(ip, validTimestamps);
      }
    }
    
    // Check current IP
    const userRequests = requests.get(key) || [];
    const recentRequests = userRequests.filter(time => time > windowStart);
    
    if (recentRequests.length >= max) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later'
      });
    }
    
    // Add current request
    recentRequests.push(now);
    requests.set(key, recentRequests);
    
    next();
  };
}

module.exports = {
  // Utility functions
  sanitizeString,
  sanitizeObject,
  isValidWalletAddress,
  isValidDocumentHash,
  isValidIPFSHash,
  isValidFileType,
  isValidFileSize,
  isValidEmail,
  isValidURL,
  isValidDate,
  isValidRole,
  isValidDocumentType,
  isValidAccessLevel,
  
  // Validation rules
  validationRules,
  
  // Middleware
  validateFile,
  sanitizeRequest,
  validateRateLimit,
  
  // Constants
  ALLOWED_FILE_TYPES,
  FILE_SIZE_LIMITS
};