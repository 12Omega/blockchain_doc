const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const {
  generateToken,
  verifySignature,
  generateSignMessage,
  authenticateToken,
  validateWalletAddress,
  logAuthEvent,
} = require("../middleware/auth");
const {
  handleValidationErrors
} = require("../middleware/validation");
const logger = require("../utils/logger");

const router = express.Router();

// @route   POST /api/auth/nonce
// @desc    Get nonce for wallet signature
// @access  Public
router.post(
  "/nonce",
  // Basic validation
  body('walletAddress')
    .notEmpty()
    .withMessage('Wallet address is required')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid wallet address format'),
  handleValidationErrors,
  // Auth middleware
  async (req, res) => {
    try {
      const { walletAddress, role } = req.body;

      let user = await User.findByWallet(walletAddress);

      if (!user) {
        // Create new user with specified role or default to student
        const userRole = role || "student";
        user = await User.createWithRole(walletAddress, userRole);
        logger.info("New user created:", { walletAddress, role: userRole });
      } else if (role && user.role !== role) {
        // Update user role if different
        user.role = role;
        const permissions = {
          admin: { canIssue: true, canVerify: true, canTransfer: true },
          issuer: { canIssue: true, canVerify: true, canTransfer: false },
          verifier: { canIssue: false, canVerify: true, canTransfer: false },
          student: { canIssue: false, canVerify: true, canTransfer: false }
        };
        user.permissions = permissions[role] || permissions.student;
        logger.info("User role updated:", { walletAddress, oldRole: user.role, newRole: role });
      }

      // Generate new nonce
      const nonce = user.generateNonce();
      await user.save();

      const timestamp = Date.now();
      const message = generateSignMessage(walletAddress, nonce, timestamp);

      res.json({
        success: true,
        data: {
          message,
          nonce,
          timestamp,
          walletAddress,
        },
      });
    } catch (error) {
      logger.error("Nonce generation failed:", {
        error: error.message,
        walletAddress: req.body.walletAddress,
      });
      res.status(500).json({
        success: false,
        error: "Failed to generate nonce",
      });
    }
  }
);

// @route   POST /api/auth/verify
// @desc    Verify wallet signature and authenticate user
// @access  Public
router.post(
  "/verify",
  // Basic validation
  body('walletAddress')
    .notEmpty()
    .withMessage('Wallet address is required')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid wallet address format'),
  body("signature")
    .notEmpty()
    .withMessage("Signature is required"),
  body("message")
    .notEmpty()
    .withMessage("Message is required"),
  body("nonce")
    .notEmpty()
    .withMessage("Nonce is required"),
  handleValidationErrors,
  // Auth middleware
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { walletAddress, signature, message, nonce } = req.body;

      // Find user
      const user = await User.findByWallet(walletAddress);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found. Please request a nonce first.",
        });
      }

      // Verify nonce matches
      if (user.session.nonce !== nonce) {
        return res.status(400).json({
          success: false,
          error: "Invalid or expired nonce",
        });
      }

      // Verify signature
      const isValidSignature = verifySignature(
        message,
        signature,
        walletAddress
      );
      if (!isValidSignature) {
        logger.warn("Invalid signature attempt:", { walletAddress });
        return res.status(401).json({
          success: false,
          error: "Invalid signature",
        });
      }

      // Update user session
      await user.updateLastLogin();

      // Generate JWT token
      const token = generateToken(user._id, walletAddress);

      // Generate new nonce for next authentication
      user.generateNonce();
      await user.save();

      logger.info("User authenticated successfully:", {
        walletAddress,
        role: user.role,
      });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            walletAddress: user.walletAddress,
            role: user.role,
            permissions: user.permissions,
            profile: user.profile,
            isVerified: user.isVerified,
          },
        },
      });
    } catch (error) {
      logger.error("Authentication failed:", {
        error: error.message,
        walletAddress: req.body.walletAddress,
      });
      res.status(500).json({
        success: false,
        error: "Authentication failed",
      });
    }
  }
);

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post(
  "/refresh",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;

      // Generate new token
      const token = generateToken(user._id, user.walletAddress);

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            walletAddress: user.walletAddress,
            role: user.role,
            permissions: user.permissions,
            profile: user.profile,
            isVerified: user.isVerified,
          },
        },
      });
    } catch (error) {
      logger.error("Token refresh failed:", {
        error: error.message,
        userId: req.user?._id,
      });
      res.status(500).json({
        success: false,
        error: "Token refresh failed",
      });
    }
  }
);

// @route   POST /api/auth/logout
// @desc    Logout user (invalidate session)
// @access  Private
router.post(
  "/logout",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;

      // Deactivate user session
      user.session.isActive = false;
      user.generateNonce(); // Generate new nonce to invalidate any cached tokens
      await user.save();

      logger.info("User logged out:", { walletAddress: user.walletAddress });

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      logger.error("Logout failed:", {
        error: error.message,
        userId: req.user?._id,
      });
      res.status(500).json({
        success: false,
        error: "Logout failed",
      });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          walletAddress: user.walletAddress,
          role: user.role,
          permissions: user.permissions,
          profile: user.profile,
          isVerified: user.isVerified,
          session: {
            lastLogin: user.session.lastLogin,
            isActive: user.session.isActive,
          },
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error("Get profile failed:", {
      error: error.message,
      userId: req.user?._id,
    });
    res.status(500).json({
      success: false,
      error: "Failed to get user profile",
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register new user with wallet address
// @access  Public
router.post(
  "/register",
  // Basic validation
  body('walletAddress')
    .notEmpty()
    .withMessage('Wallet address is required')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid wallet address format'),
  handleValidationErrors,
  
  async (req, res) => {
    try {
      const { walletAddress, name, email, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findByWallet(walletAddress);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "User with this wallet address already exists"
        });
      }

      // Check if email is already in use
      if (email) {
        const existingEmail = await User.findOne({ 'profile.email': email });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            error: "Email address already in use"
          });
        }
      }

      // Create new user with specified role or default to 'student'
      const userRole = role || 'student';
      const user = await User.createWithRole(walletAddress, userRole);

      // Update profile if provided
      if (name) {
        user.profile.name = name;
      }
      if (email) {
        user.profile.email = email;
      }
      await user.save();

      logger.info("User registered successfully:", {
        walletAddress,
        role: userRole,
        hasEmail: !!email
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            id: user._id,
            walletAddress: user.walletAddress,
            role: user.role,
            permissions: user.permissions,
            profile: user.profile,
            isVerified: user.isVerified,
            createdAt: user.createdAt
          }
        }
      });

    } catch (error) {
      logger.error("User registration failed:", {
        error: error.message,
        walletAddress: req.body.walletAddress
      });
      res.status(500).json({
        success: false,
        error: "Registration failed"
      });
    }
  }
);

module.exports = router;
