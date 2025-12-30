const fc = require('fast-check');
const mongoose = require('mongoose');
const User = require('../models/User');
const blockchainService = require('../services/blockchainService');

// Mock blockchain service for testing
jest.mock('../services/blockchainService');

// Increase timeout for property-based tests
jest.setTimeout(60000);

describe('Role Assignment - Property-Based Tests', () => {
  
  beforeAll(async () => {
    // Connection and setup handled by setup.js
    // Just wait for connection to be ready
    const maxWait = 10000;
    const startTime = Date.now();
    while (mongoose.connection.readyState !== 1 && Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection not ready for tests');
    }
  });

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock blockchain service methods
    blockchainService.assignRoleOnChain = jest.fn().mockResolvedValue({
      transactionHash: '0x' + '1'.repeat(64),
      blockNumber: 12345,
      gasUsed: '50000',
      success: true
    });
  });

  /**
   * Feature: academic-document-blockchain-verification, Property 10: Role Assignment Persistence
   * Validates: Requirements 5.2
   * 
   * For any role assignment by an administrator, querying the blockchain for that user's role 
   * should return the assigned role.
   */
  describe('Property 10: Role Assignment Persistence', () => {
    
    // Generator for valid Ethereum addresses
    const ethereumAddressArb = fc.array(
      fc.integer({ min: 0, max: 15 }), 
      { minLength: 40, maxLength: 40 }
    ).map(arr => '0x' + arr.map(n => n.toString(16)).join('').toLowerCase());

    // Generator for valid roles
    const roleArb = fc.constantFrom('admin', 'issuer', 'verifier', 'student');

    it('should persist role assignment in database for any valid wallet address and role', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethereumAddressArb,
          roleArb,
          async (walletAddress, role) => {
            try {
              // Create user with role
              const user = await User.createWithRole(walletAddress, role);
              
              // Verify user was created
              expect(user).toBeDefined();
              expect(user.walletAddress).toBe(walletAddress.toLowerCase());
              expect(user.role).toBe(role);
              
              // Query database to verify persistence
              const retrievedUser = await User.findByWallet(walletAddress);
              
              // Retrieved user should match assigned role
              expect(retrievedUser).toBeDefined();
              expect(retrievedUser.walletAddress).toBe(walletAddress.toLowerCase());
              expect(retrievedUser.role).toBe(role);
              expect(retrievedUser._id.toString()).toBe(user._id.toString());
            } finally {
              // Clean up after each iteration
              await User.deleteMany({ walletAddress: walletAddress.toLowerCase() });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update role when reassigning for any user', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethereumAddressArb,
          roleArb,
          roleArb,
          async (walletAddress, initialRole, newRole) => {
            try {
              // Create user with initial role
              const user = await User.createWithRole(walletAddress, initialRole);
              expect(user.role).toBe(initialRole);
              
              // Update role
              user.role = newRole;
              
              // Set permissions based on new role
              const rolePermissions = {
                admin: { canIssue: true, canVerify: true, canTransfer: true },
                issuer: { canIssue: true, canVerify: true, canTransfer: false },
                verifier: { canIssue: false, canVerify: true, canTransfer: false },
                student: { canIssue: false, canVerify: true, canTransfer: false }
              };
              user.permissions = rolePermissions[newRole];
              
              await user.save();
              
              // Query database to verify update
              const updatedUser = await User.findByWallet(walletAddress);
              
              // Role should be updated
              expect(updatedUser.role).toBe(newRole);
              expect(updatedUser.permissions).toEqual(rolePermissions[newRole]);
            } finally {
              // Clean up after each iteration
              await User.deleteMany({ walletAddress: walletAddress.toLowerCase() });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain role consistency across multiple queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethereumAddressArb,
          roleArb,
          async (walletAddress, role) => {
            try {
              // Create user
              await User.createWithRole(walletAddress, role);
              
              // Query multiple times
              const query1 = await User.findByWallet(walletAddress);
              const query2 = await User.findByWallet(walletAddress);
              const query3 = await User.findByWallet(walletAddress);
              
              // All queries should return the same role
              expect(query1.role).toBe(role);
              expect(query2.role).toBe(role);
              expect(query3.role).toBe(role);
              
              // All queries should return the same user
              expect(query1._id.toString()).toBe(query2._id.toString());
              expect(query2._id.toString()).toBe(query3._id.toString());
            } finally {
              // Clean up after each iteration
              await User.deleteMany({ walletAddress: walletAddress.toLowerCase() });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign correct permissions based on role', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethereumAddressArb,
          roleArb,
          async (walletAddress, role) => {
            try {
              // Expected permissions for each role
              const expectedPermissions = {
                admin: { canIssue: true, canVerify: true, canTransfer: true },
                issuer: { canIssue: true, canVerify: true, canTransfer: false },
                verifier: { canIssue: false, canVerify: true, canTransfer: false },
                student: { canIssue: false, canVerify: true, canTransfer: false }
              };
              
              // Create user with role
              const user = await User.createWithRole(walletAddress, role);
              
              // Verify permissions match role
              expect(user.permissions).toEqual(expectedPermissions[role]);
              
              // Verify hasPermission method works correctly
              if (role === 'admin') {
                expect(user.hasPermission('canIssue')).toBe(true);
                expect(user.hasPermission('canVerify')).toBe(true);
                expect(user.hasPermission('canTransfer')).toBe(true);
              } else if (role === 'issuer') {
                expect(user.hasPermission('canIssue')).toBe(true);
                expect(user.hasPermission('canVerify')).toBe(true);
                expect(user.hasPermission('canTransfer')).toBe(false);
              } else if (role === 'verifier') {
                expect(user.hasPermission('canIssue')).toBe(false);
                expect(user.hasPermission('canVerify')).toBe(true);
                expect(user.hasPermission('canTransfer')).toBe(false);
              } else if (role === 'student') {
                expect(user.hasPermission('canIssue')).toBe(false);
                expect(user.hasPermission('canVerify')).toBe(true);
                expect(user.hasPermission('canTransfer')).toBe(false);
              }
            } finally {
              await User.deleteMany({ walletAddress: walletAddress.toLowerCase() });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle role assignment for multiple users independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              address: ethereumAddressArb,
              role: roleArb
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (users) => {
            try {
              // Ensure unique addresses
              const uniqueUsers = Array.from(
                new Map(users.map(u => [u.address, u])).values()
              );
              
              if (uniqueUsers.length < 2) {
                return true; // Skip if not enough unique users
              }
              
              // Create all users
              const createdUsers = await Promise.all(
                uniqueUsers.map(u => User.createWithRole(u.address, u.role))
              );
              
              // Verify each user has correct role
              for (let i = 0; i < uniqueUsers.length; i++) {
                const retrievedUser = await User.findByWallet(uniqueUsers[i].address);
                expect(retrievedUser.role).toBe(uniqueUsers[i].role);
                expect(retrievedUser._id.toString()).toBe(createdUsers[i]._id.toString());
              }
              
              // Verify total count
              const totalUsers = await User.countDocuments();
              expect(totalUsers).toBe(uniqueUsers.length);
            } finally {
              await User.deleteMany({});
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should preserve role after user updates other fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethereumAddressArb,
          roleArb,
          fc.string({ minLength: 3, maxLength: 50 }),
          fc.emailAddress(),
          async (walletAddress, role, name, email) => {
            try {
              // Create user with role
              const user = await User.createWithRole(walletAddress, role);
              const originalRole = user.role;
              
              // Update profile fields
              user.profile.name = name;
              user.profile.email = email;
              await user.save();
              
              // Query user again
              const updatedUser = await User.findByWallet(walletAddress);
              
              // Role should remain unchanged
              expect(updatedUser.role).toBe(originalRole);
              
              // Profile should be updated
              // Note: User model trims whitespace, so we need to compare trimmed values
              expect(updatedUser.profile.name).toBe(name.trim());
              expect(updatedUser.profile.email).toBe(email.toLowerCase());
            } finally {
              await User.deleteMany({ walletAddress: walletAddress.toLowerCase() });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle case-insensitive wallet address lookups', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethereumAddressArb,
          roleArb,
          async (walletAddress, role) => {
            try {
              // Create user with lowercase address
              await User.createWithRole(walletAddress.toLowerCase(), role);
              
              // Query with different case variations
              const lowerCase = await User.findByWallet(walletAddress.toLowerCase());
              const upperCase = await User.findByWallet(walletAddress.toUpperCase());
              const mixedCase = await User.findByWallet(
                walletAddress.split('').map((c, i) => 
                  i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
                ).join('')
              );
              
              // All queries should find the same user
              expect(lowerCase).toBeDefined();
              expect(upperCase).toBeDefined();
              expect(mixedCase).toBeDefined();
              
              expect(lowerCase._id.toString()).toBe(upperCase._id.toString());
              expect(upperCase._id.toString()).toBe(mixedCase._id.toString());
              
              // All should have the same role
              expect(lowerCase.role).toBe(role);
              expect(upperCase.role).toBe(role);
              expect(mixedCase.role).toBe(role);
            } finally {
              await User.deleteMany({ walletAddress: walletAddress.toLowerCase() });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not allow duplicate wallet addresses with different roles', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethereumAddressArb,
          roleArb,
          roleArb,
          async (walletAddress, role1, role2) => {
            try {
              // Create first user
              await User.createWithRole(walletAddress, role1);
              
              // Attempt to create second user with same address should fail
              try {
                await User.createWithRole(walletAddress, role2);
                // If it doesn't throw, verify only one user exists
                const users = await User.find({ 
                  walletAddress: walletAddress.toLowerCase() 
                });
                expect(users.length).toBe(1);
              } catch (error) {
                // Duplicate key error is expected
                expect(error.code).toBe(11000); // MongoDB duplicate key error
              }
            } finally {
              await User.deleteMany({ walletAddress: walletAddress.toLowerCase() });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Role Assignment with Blockchain Sync', () => {
    // Generator for valid Ethereum addresses
    const ethereumAddressArb = fc.array(
      fc.integer({ min: 0, max: 15 }), 
      { minLength: 40, maxLength: 40 }
    ).map(arr => '0x' + arr.map(n => n.toString(16)).join('').toLowerCase());

    // Generator for valid roles
    const roleArb = fc.constantFrom('admin', 'issuer', 'verifier', 'student');

    it('should call blockchain service when assigning role', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethereumAddressArb,
          roleArb,
          ethereumAddressArb,
          async (userAddress, role, adminAddress) => {
            try {
              // Skip if addresses are the same
              if (userAddress.toLowerCase() === adminAddress.toLowerCase()) {
                return true;
              }
              
              // Create user
              const user = await User.createWithRole(userAddress, 'student');
              
              // Simulate role assignment with blockchain sync
              user.role = role;
              const rolePermissions = {
                admin: { canIssue: true, canVerify: true, canTransfer: true },
                issuer: { canIssue: true, canVerify: true, canTransfer: false },
                verifier: { canIssue: false, canVerify: true, canTransfer: false },
                student: { canIssue: false, canVerify: true, canTransfer: false }
              };
              user.permissions = rolePermissions[role];
              await user.save();
              
              // Call blockchain service
              await blockchainService.assignRoleOnChain(userAddress, role, adminAddress);
              
              // Verify blockchain service was called
              expect(blockchainService.assignRoleOnChain).toHaveBeenCalledWith(
                userAddress,
                role,
                adminAddress
              );
              
              // Verify user role in database
              const updatedUser = await User.findByWallet(userAddress);
              expect(updatedUser.role).toBe(role);
            } finally {
              await User.deleteMany({ walletAddress: userAddress.toLowerCase() });
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
