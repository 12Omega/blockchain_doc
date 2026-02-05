const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Document = require('../models/Document');
const VerificationLog = require('../models/VerificationLog');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Private (Admin)
router.get('/dashboard', 
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      // Get counts and statistics
      const [
        totalUsers,
        totalDocuments,
        totalVerifications,
        recentUsers,
        recentDocuments,
        recentVerifications
      ] = await Promise.all([
        User.countDocuments(),
        Document.countDocuments({ isActive: true }),
        VerificationLog.countDocuments(),
        User.find().sort({ createdAt: -1 }).limit(5).select('walletAddress role profile.name createdAt'),
        Document.find({ isActive: true }).sort({ 'audit.createdAt': -1 }).limit(5)
          .populate('audit.uploadedBy', 'walletAddress profile.name'),
        VerificationLog.find().sort({ timestamp: -1 }).limit(10)
      ]);

      // Calculate some basic statistics
      const usersByRole = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);

      const documentsByType = await Document.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$metadata.documentType', count: { $sum: 1 } } }
      ]);

      const verificationsByResult = await VerificationLog.aggregate([
        { $group: { _id: '$result', count: { $sum: 1 } } }
      ]);

      // System health info
      const systemHealth = {
        database: 'healthy',
        blockchain: 'connected',
        ipfs: 'operational',
        cache: 'disabled' // Redis is disabled in our setup
      };

      logger.info('Admin dashboard data requested', {
        admin: req.user.walletAddress,
        totalUsers,
        totalDocuments,
        totalVerifications
      });

      res.json({
        success: true,
        data: {
          overview: {
            totalUsers,
            totalDocuments,
            totalVerifications,
            systemHealth
          },
          statistics: {
            usersByRole: usersByRole.reduce((acc, item) => {
              acc[item._id] = item.count;
              return acc;
            }, {}),
            documentsByType: documentsByType.reduce((acc, item) => {
              acc[item._id] = item.count;
              return acc;
            }, {}),
            verificationsByResult: verificationsByResult.reduce((acc, item) => {
              acc[item._id] = item.count;
              return acc;
            }, {})
          },
          recent: {
            users: recentUsers,
            documents: recentDocuments,
            verifications: recentVerifications
          }
        }
      });

    } catch (error) {
      logger.error('Admin dashboard error:', {
        error: error.message,
        admin: req.user?.walletAddress
      });

      res.status(500).json({
        success: false,
        error: 'Failed to load dashboard data'
      });
    }
  }
);

// @route   GET /api/admin/users
// @desc    Get all users (admin only)
// @access  Private (Admin)
router.get('/users',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, role, search } = req.query;
      const skip = (page - 1) * limit;

      let query = {};
      
      if (role) {
        query.role = role;
      }
      
      if (search) {
        query.$or = [
          { walletAddress: { $regex: search, $options: 'i' } },
          { 'profile.name': { $regex: search, $options: 'i' } },
          { 'profile.email': { $regex: search, $options: 'i' } }
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
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('Admin get users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve users'
      });
    }
  }
);

// @route   PUT /api/admin/users/:userId/role
// @desc    Update user role (admin only)
// @access  Private (Admin)
router.put('/users/:userId/role',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['admin', 'issuer', 'verifier', 'student'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role'
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Update role and permissions
      const permissions = {
        admin: { canIssue: true, canVerify: true, canTransfer: true },
        issuer: { canIssue: true, canVerify: true, canTransfer: false },
        verifier: { canIssue: false, canVerify: true, canTransfer: false },
        student: { canIssue: false, canVerify: true, canTransfer: false }
      };

      user.role = role;
      user.permissions = permissions[role];
      await user.save();

      logger.info('User role updated by admin', {
        admin: req.user.walletAddress,
        targetUser: user.walletAddress,
        oldRole: user.role,
        newRole: role
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            walletAddress: user.walletAddress,
            role: user.role,
            permissions: user.permissions,
            profile: user.profile
          }
        }
      });

    } catch (error) {
      logger.error('Admin update user role error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user role'
      });
    }
  }
);

module.exports = router;