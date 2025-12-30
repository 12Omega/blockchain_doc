const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const User = require('../models/User');
const logger = require('../utils/logger');

// Generate JWT token
const generateToken = (userId, walletAddress) => {
  return jwt.sign(
    { 
      userId, 
      walletAddress: walletAddress.toLowerCase(),
      // Add timestamp to ensure unique tokens even within same second
      timestamp: Date.now()
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '7d',
      issuer: 'blockchain-document-system',
      audience: 'blockchain-document-users'
    }
  );
};

// Verify wallet signature
const verifySignature = (message, signature, walletAddress) => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
  } catch (error) {
    logger.error('Signature verification failed:', { error: error.message, walletAddress });
    return false;
  }
};

// Generate message for signing
const generateSignMessage = (walletAddress, nonce, timestamp) => {
  return `Welcome to Blockchain Document Verification System!\n\n` +
         `Please sign this message to authenticate your wallet.\n\n` +
         `Wallet: ${walletAddress}\n` +
         `Nonce: ${nonce}\n` +
         `Timestamp: ${timestamp}\n\n` +
         `This request will not trigger a blockchain transaction or cost any gas fees.`;
};

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user and attach to request
    const user = await User.findById(decoded.userId);
    if (!user || !user.session.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive user'
      });
    }

    req.user = user;
    req.walletAddress = decoded.walletAddress;
    
    next();
  } catch (error) {
    logger.error('Token authentication failed:', { error: error.message });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

// Middleware to check user role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole) && userRole !== 'admin') {
      logger.warn('Unauthorized access attempt:', {
        walletAddress: req.user.walletAddress,
        userRole,
        requiredRoles: allowedRoles,
        endpoint: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Middleware to check specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!req.user.hasPermission(permission)) {
      logger.warn('Permission denied:', {
        walletAddress: req.user.walletAddress,
        permission,
        userRole: req.user.role,
        endpoint: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        error: `Permission '${permission}' required`
      });
    }

    next();
  };
};

// Middleware to validate wallet address format
const validateWalletAddress = (req, res, next) => {
  const { walletAddress } = req.body;
  
  if (!walletAddress) {
    return res.status(400).json({
      success: false,
      error: 'Wallet address is required'
    });
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid wallet address format'
    });
  }

  req.body.walletAddress = walletAddress.toLowerCase();
  next();
};

// Middleware to log authentication events
const logAuthEvent = (event) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      const statusCode = res.statusCode;
      const walletAddress = req.body.walletAddress || req.user?.walletAddress;
      
      logger.info(`Auth event: ${event}`, {
        walletAddress,
        statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        success: statusCode < 400
      });
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  generateToken,
  verifySignature,
  generateSignMessage,
  authenticateToken,
  requireRole,
  requirePermission,
  validateWalletAddress,
  logAuthEvent
};