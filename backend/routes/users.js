const express = require('express');
const { body, validationResult, param } = require('express-validator');
const User = require('../models/User');
const {
  authenticateToken,
  requireRole,
  requirePermission,
  validateWalletAddress
} = require('../middleware/auth');
const {
  handleValidationErrors,
  securityValidation,
  validateContentType,
  validateRequestSize
} = require('../middleware/validation');
const {
  validationRules,
  sanitizeRequest
} = require('../utils/validation');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private (Admin)
router.get('/',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, role, search } = req.query;
      const skip = (page - 1) * limit;
      
      // Build query
      let query = {};
      if (role && role !== 'all') {
        query.role = role;
      }
      if (search) {
        query.$or = [
          { walletAddress: { $regex: search, $options: 'i' } },
          { 'profile.name': { $regex: search, $options: 'i' } },
          { 'profile.email': { $regex: search, $options: 'i' } },
          { 'profile.organization': { $regex: search, $options: 'i' } }
        ];
      }
      
      const users = await User.find(query)
        .select('-session.nonce') // Don't expose nonce
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await User.countDocuments(query);
      
      res.json({
        success: true,
        data: {
          users,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
      
    } catch (error) {
      logger.error('Get users failed:', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve users'
      });
    }
  }
);

// @route   GET /api/users/:walletAddress
// @desc    Get user by wallet address
// @access  Private
router.get('/:walletAddress',
  authenticateToken,
  param('walletAddress').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Invalid wallet address'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { walletAddress } = req.params;
      const requestingUser = req.user;
      
      // Users can only view their own profile unless they're admin
      if (requestingUser.walletAddress !== walletAddress.toLowerCase() && 
          requestingUser.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      const user = await User.findByWallet(walletAddress)
        .select('-session.nonce');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: { user }
      });
      
    } catch (error) {
      logger.error('Get user failed:', { error: error.message, walletAddress: req.params.walletAddress });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user'
      });
    }
  }
);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile',
  // Security middleware
  validateRequestSize(10 * 1024), // 10KB limit
  validateContentType(['application/json']),
  ...securityValidation({
    enableSanitization: true,
    enableXSSPrevention: true,
    enableSQLInjectionPrevention: true,
    enableNoSQLInjectionPrevention: true
  }),
  
  // Authentication
  authenticateToken,
  
  // Input validation
  [
    validationRules.name('profile.name', false),
    validationRules.email('profile.email'),
    validationRules.organization('profile.organization', false),
    validationRules.text('profile.department', 100, false)
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const user = req.user;
      const { profile } = req.body;
      
      // Update profile fields
      if (profile) {
        Object.keys(profile).forEach(key => {
          if (profile[key] !== undefined) {
            user.profile[key] = profile[key];
          }
        });
      }
      
      await user.save();
      
      logger.info('User profile updated:', { walletAddress: user.walletAddress });
      
      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            walletAddress: user.walletAddress,
            role: user.role,
            permissions: user.permissions,
            profile: user.profile,
            isVerified: user.isVerified
          }
        }
      });
      
    } catch (error) {
      logger.error('Update profile failed:', { error: error.message, userId: req.user?._id });
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }
);

// @route   PUT /api/users/:walletAddress/role
// @desc    Update user role (admin only)
// @access  Private (Admin)
router.put('/:walletAddress/role',
  // Security middleware
  validateRequestSize(1024), // 1KB limit
  validateContentType(['application/json']),
  ...securityValidation({
    enableSanitization: true,
    enableXSSPrevention: true,
    enableSQLInjectionPrevention: true,
    enableNoSQLInjectionPrevention: true
  }),
  
  // Authentication and authorization
  authenticateToken,
  requireRole('admin'),
  
  // Input validation
  [
    param('walletAddress').custom(value => {
      if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
        throw new Error('Invalid wallet address format');
      }
      return true;
    }),
    validationRules.role('role')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { walletAddress } = req.params;
      const { role } = req.body;
      
      const user = await User.findByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Update role and permissions
      user.role = role;
      
      // Set default permissions based on role
      const rolePermissions = {
        admin: { canIssue: true, canVerify: true, canTransfer: true },
        issuer: { canIssue: true, canVerify: true, canTransfer: false },
        verifier: { canIssue: false, canVerify: true, canTransfer: false },
        student: { canIssue: false, canVerify: true, canTransfer: false }
      };
      
      user.permissions = rolePermissions[role];
      await user.save();
      
      logger.info('User role updated in database:', { 
        walletAddress, 
        newRole: role, 
        updatedBy: req.user.walletAddress 
      });

      // Sync role assignment with blockchain AccessControl contract
      const blockchainService = require('../services/blockchainService');
      try {
        const blockchainResult = await blockchainService.assignRoleOnChain(
          walletAddress,
          role,
          req.user.walletAddress
        );

        logger.info('User role synced with blockchain:', {
          walletAddress,
          role,
          transactionHash: blockchainResult.transactionHash,
          blockNumber: blockchainResult.blockNumber
        });

        res.json({
          success: true,
          message: 'Role updated and synced with blockchain',
          data: {
            user: {
              id: user._id,
              walletAddress: user.walletAddress,
              role: user.role,
              permissions: user.permissions,
              profile: user.profile
            },
            blockchain: {
              transactionHash: blockchainResult.transactionHash,
              blockNumber: blockchainResult.blockNumber,
              gasUsed: blockchainResult.gasUsed
            }
          }
        });

      } catch (blockchainError) {
        logger.warn('Role updated in database but blockchain sync failed:', {
          walletAddress,
          role,
          error: blockchainError.message
        });

        // Return success with warning since database update succeeded
        res.status(207).json({
          success: true,
          warning: 'Role updated in database but blockchain sync failed',
          data: {
            user: {
              id: user._id,
              walletAddress: user.walletAddress,
              role: user.role,
              permissions: user.permissions,
              profile: user.profile
            },
            blockchainError: blockchainError.message
          }
        });
      }
      
    } catch (error) {
      logger.error('Update role failed:', { error: error.message, walletAddress: req.params.walletAddress });
      res.status(500).json({
        success: false,
        error: 'Failed to update user role'
      });
    }
  }
);

// @route   PUT /api/users/:walletAddress/verify
// @desc    Verify user account (admin only)
// @access  Private (Admin)
router.put('/:walletAddress/verify',
  authenticateToken,
  requireRole('admin'),
  param('walletAddress').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Invalid wallet address'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { walletAddress } = req.params;
      
      const user = await User.findByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      user.isVerified = true;
      await user.save();
      
      logger.info('User verified:', { 
        walletAddress, 
        verifiedBy: req.user.walletAddress 
      });
      
      res.json({
        success: true,
        message: 'User verified successfully',
        data: {
          user: {
            id: user._id,
            walletAddress: user.walletAddress,
            role: user.role,
            isVerified: user.isVerified
          }
        }
      });
      
    } catch (error) {
      logger.error('Verify user failed:', { error: error.message, walletAddress: req.params.walletAddress });
      res.status(500).json({
        success: false,
        error: 'Failed to verify user'
      });
    }
  }
);

// @route   DELETE /api/users/:walletAddress
// @desc    Delete user account (admin only)
// @access  Private (Admin)
router.delete('/:walletAddress',
  authenticateToken,
  requireRole('admin'),
  param('walletAddress').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Invalid wallet address'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { walletAddress } = req.params;
      
      // Prevent admin from deleting themselves
      if (req.user.walletAddress === walletAddress.toLowerCase()) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete your own account'
        });
      }
      
      const user = await User.findByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      await User.deleteOne({ _id: user._id });
      
      logger.info('User deleted:', { 
        walletAddress, 
        deletedBy: req.user.walletAddress 
      });
      
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
      
    } catch (error) {
      logger.error('Delete user failed:', { error: error.message, walletAddress: req.params.walletAddress });
      res.status(500).json({
        success: false,
        error: 'Failed to delete user'
      });
    }
  }
);

module.exports = router;