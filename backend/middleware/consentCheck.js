const { privacyService } = require('../services/privacyService');
const { auditLogger } = require('../utils/auditLogger');
const logger = require('../utils/logger');

/**
 * Middleware to check user consent before processing requests
 */

/**
 * Check if user has given consent for data processing
 */
const requireDataProcessingConsent = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const hasConsent = await privacyService.hasConsent(req.user._id, 'data_processing');
    
    if (!hasConsent) {
      await auditLogger.logSecurityEvent(
        'unauthorized_access_attempt',
        req,
        'missing_consent',
        'blocked',
        { requiredConsent: 'data_processing' }
      );

      return res.status(403).json({
        success: false,
        message: 'Data processing consent required',
        code: 'CONSENT_REQUIRED',
        requiredConsent: 'data_processing'
      });
    }

    next();
  } catch (error) {
    logger.error('Consent check failed:', {
      error: error.message,
      userId: req.user?._id,
      endpoint: req.originalUrl
    });

    res.status(500).json({
      success: false,
      message: 'Failed to verify consent'
    });
  }
};

/**
 * Check if user has given consent for document storage
 */
const requireDocumentStorageConsent = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const hasConsent = await privacyService.hasConsent(req.user._id, 'document_storage');
    
    if (!hasConsent) {
      await auditLogger.logSecurityEvent(
        'unauthorized_access_attempt',
        req,
        'missing_consent',
        'blocked',
        { requiredConsent: 'document_storage' }
      );

      return res.status(403).json({
        success: false,
        message: 'Document storage consent required',
        code: 'CONSENT_REQUIRED',
        requiredConsent: 'document_storage'
      });
    }

    next();
  } catch (error) {
    logger.error('Document storage consent check failed:', {
      error: error.message,
      userId: req.user?._id,
      endpoint: req.originalUrl
    });

    res.status(500).json({
      success: false,
      message: 'Failed to verify document storage consent'
    });
  }
};

/**
 * Check if user has given consent for blockchain storage
 */
const requireBlockchainStorageConsent = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const hasConsent = await privacyService.hasConsent(req.user._id, 'blockchain_storage');
    
    if (!hasConsent) {
      await auditLogger.logSecurityEvent(
        'unauthorized_access_attempt',
        req,
        'missing_consent',
        'blocked',
        { requiredConsent: 'blockchain_storage' }
      );

      return res.status(403).json({
        success: false,
        message: 'Blockchain storage consent required',
        code: 'CONSENT_REQUIRED',
        requiredConsent: 'blockchain_storage'
      });
    }

    next();
  } catch (error) {
    logger.error('Blockchain storage consent check failed:', {
      error: error.message,
      userId: req.user?._id,
      endpoint: req.originalUrl
    });

    res.status(500).json({
      success: false,
      message: 'Failed to verify blockchain storage consent'
    });
  }
};

/**
 * Check multiple consent types
 */
const requireConsents = (consentTypes) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const missingConsents = [];
      
      for (const consentType of consentTypes) {
        const hasConsent = await privacyService.hasConsent(req.user._id, consentType);
        if (!hasConsent) {
          missingConsents.push(consentType);
        }
      }

      if (missingConsents.length > 0) {
        await auditLogger.logSecurityEvent(
          'unauthorized_access_attempt',
          req,
          'missing_consents',
          'blocked',
          { requiredConsents: consentTypes, missingConsents }
        );

        return res.status(403).json({
          success: false,
          message: 'Required consents missing',
          code: 'CONSENTS_REQUIRED',
          requiredConsents: consentTypes,
          missingConsents
        });
      }

      next();
    } catch (error) {
      logger.error('Multiple consent check failed:', {
        error: error.message,
        userId: req.user?._id,
        consentTypes,
        endpoint: req.originalUrl
      });

      res.status(500).json({
        success: false,
        message: 'Failed to verify consents'
      });
    }
  };
};

/**
 * Data minimization middleware - removes sensitive fields from responses
 */
const dataMinimization = (sensitiveFields = []) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      if (data && typeof data === 'object') {
        const minimizedData = minimizeData(data, sensitiveFields);
        return originalJson.call(this, minimizedData);
      }
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Recursively remove sensitive fields from data
 */
function minimizeData(data, sensitiveFields) {
  if (Array.isArray(data)) {
    return data.map(item => minimizeData(item, sensitiveFields));
  }
  
  if (data && typeof data === 'object') {
    const minimized = { ...data };
    
    sensitiveFields.forEach(field => {
      if (field.includes('.')) {
        // Handle nested fields like 'profile.email'
        const parts = field.split('.');
        let current = minimized;
        for (let i = 0; i < parts.length - 1; i++) {
          if (current[parts[i]]) {
            current = current[parts[i]];
          } else {
            break;
          }
        }
        if (current && current[parts[parts.length - 1]]) {
          current[parts[parts.length - 1]] = '[REDACTED]';
        }
      } else {
        if (minimized[field]) {
          minimized[field] = '[REDACTED]';
        }
      }
    });
    
    // Recursively process nested objects
    Object.keys(minimized).forEach(key => {
      if (minimized[key] && typeof minimized[key] === 'object') {
        minimized[key] = minimizeData(minimized[key], sensitiveFields);
      }
    });
    
    return minimized;
  }
  
  return data;
}

/**
 * Privacy-compliant logging middleware
 */
const privacyCompliantLogging = (req, res, next) => {
  // Override console.log and logger methods to ensure no sensitive data is logged
  const originalLog = logger.info;
  const originalError = logger.error;
  const originalWarn = logger.warn;
  
  const sensitivePatterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /0x[a-fA-F0-9]{40}/g // Ethereum addresses (partial redaction)
  ];
  
  const sanitizeLogData = (data) => {
    if (typeof data === 'string') {
      let sanitized = data;
      sensitivePatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      });
      return sanitized;
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'string') {
          sanitized[key] = sanitizeLogData(sanitized[key]);
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = sanitizeLogData(sanitized[key]);
        }
      });
      return sanitized;
    }
    
    return data;
  };
  
  logger.info = (...args) => {
    const sanitizedArgs = args.map(sanitizeLogData);
    return originalLog.apply(logger, sanitizedArgs);
  };
  
  logger.error = (...args) => {
    const sanitizedArgs = args.map(sanitizeLogData);
    return originalError.apply(logger, sanitizedArgs);
  };
  
  logger.warn = (...args) => {
    const sanitizedArgs = args.map(sanitizeLogData);
    return originalWarn.apply(logger, sanitizedArgs);
  };
  
  // Restore original methods after request
  res.on('finish', () => {
    logger.info = originalLog;
    logger.error = originalError;
    logger.warn = originalWarn;
  });
  
  next();
};

/**
 * Check if user has withdrawn consent and handle accordingly
 */
const checkConsentWithdrawal = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Check if user has withdrawn data processing consent
    const hasDataProcessingConsent = await privacyService.hasConsent(req.user._id, 'data_processing');
    
    if (!hasDataProcessingConsent) {
      // User has withdrawn consent, limit functionality
      req.consentWithdrawn = true;
      
      // Only allow privacy-related endpoints and logout
      const allowedPaths = [
        '/api/privacy/',
        '/api/auth/logout',
        '/api/auth/nonce'
      ];
      
      const isAllowedPath = allowedPaths.some(path => req.originalUrl.startsWith(path));
      
      if (!isAllowedPath) {
        return res.status(403).json({
          success: false,
          message: 'Data processing consent has been withdrawn. Only privacy management functions are available.',
          code: 'CONSENT_WITHDRAWN'
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error('Consent withdrawal check failed:', {
      error: error.message,
      userId: req.user?._id
    });
    next(); // Continue on error to avoid blocking legitimate requests
  }
};

module.exports = {
  requireDataProcessingConsent,
  requireDocumentStorageConsent,
  requireBlockchainStorageConsent,
  requireConsents,
  dataMinimization,
  privacyCompliantLogging,
  checkConsentWithdrawal
};