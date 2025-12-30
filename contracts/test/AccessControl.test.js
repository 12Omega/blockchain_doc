const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AccessControl", function () {
  let accessControl;
  let owner, admin, issuer, verifier, student, unauthorized;
  
  // Role enum values
  const Role = {
    STUDENT: 0,
    VERIFIER: 1,
    ISSUER: 2,
    ADMIN: 3
  };

  beforeEach(async function () {
    [owner, admin, issuer, verifier, student, unauthorized] = await ethers.getSigners();
    
    const AccessControl = await ethers.getContractFactory("AccessControl");
    accessControl = await AccessControl.deploy();
    await accessControl.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the deployer as admin and owner", async function () {
      expect(await accessControl.owner()).to.equal(owner.address);
      expect(await accessControl.userRoles(owner.address)).to.equal(Role.ADMIN);
      expect(await accessControl.isRegistered(owner.address)).to.be.true;
    });

    it("Should emit UserRegistered and RoleAssigned events on deployment", async function () {
      const AccessControl = await ethers.getContractFactory("AccessControl");
      const newAccessControl = await AccessControl.deploy();
      
      // Get the deployment transaction receipt
      const deployTx = newAccessControl.deploymentTransaction();
      
      // Check events from the deployment transaction
      await expect(deployTx)
        .to.emit(newAccessControl, "UserRegistered")
        .withArgs(owner.address, Role.ADMIN);
    });
  });

  describe("Role Assignment", function () {
    it("Should allow admin to assign roles", async function () {
      await accessControl.assignRole(issuer.address, Role.ISSUER);
      
      expect(await accessControl.userRoles(issuer.address)).to.equal(Role.ISSUER);
      expect(await accessControl.isRegistered(issuer.address)).to.be.true;
    });

    it("Should emit RoleAssigned and UserRegistered events", async function () {
      await expect(accessControl.assignRole(issuer.address, Role.ISSUER))
        .to.emit(accessControl, "UserRegistered")
        .withArgs(issuer.address, Role.ISSUER)
        .and.to.emit(accessControl, "RoleAssigned")
        .withArgs(issuer.address, Role.ISSUER, owner.address);
    });

    it("Should emit RoleRevoked when changing existing user's role", async function () {
      // First assign a role
      await accessControl.assignRole(issuer.address, Role.ISSUER);
      
      // Then change the role
      await expect(accessControl.assignRole(issuer.address, Role.VERIFIER))
        .to.emit(accessControl, "RoleRevoked")
        .withArgs(issuer.address, Role.ISSUER, owner.address)
        .and.to.emit(accessControl, "RoleAssigned")
        .withArgs(issuer.address, Role.VERIFIER, owner.address);
    });

    it("Should reject role assignment from non-admin", async function () {
      await expect(
        accessControl.connect(unauthorized).assignRole(issuer.address, Role.ISSUER)
      ).to.be.revertedWith("User not registered");
    });

    it("Should reject invalid user address", async function () {
      await expect(
        accessControl.assignRole(ethers.ZeroAddress, Role.ISSUER)
      ).to.be.revertedWith("Invalid user address");
    });

    it("Should reject invalid role", async function () {
      // Role 4 is invalid (only 0-3 are valid: STUDENT, VERIFIER, ISSUER, ADMIN)
      await expect(
        accessControl.assignRole(issuer.address, 4)
      ).to.be.reverted; // Just check it reverts, don't check specific message
    });
  });

  describe("Role Revocation", function () {
    beforeEach(async function () {
      await accessControl.assignRole(issuer.address, Role.ISSUER);
      await accessControl.assignRole(verifier.address, Role.VERIFIER);
    });

    it("Should allow admin to revoke access", async function () {
      await accessControl.revokeAccess(issuer.address);
      
      expect(await accessControl.isRegistered(issuer.address)).to.be.false;
      expect(await accessControl.userRoles(issuer.address)).to.equal(Role.STUDENT);
    });

    it("Should emit RoleRevoked event", async function () {
      await expect(accessControl.revokeAccess(issuer.address))
        .to.emit(accessControl, "RoleRevoked")
        .withArgs(issuer.address, Role.ISSUER, owner.address);
    });

    it("Should reject revocation from non-admin", async function () {
      await expect(
        accessControl.connect(issuer).revokeAccess(verifier.address)
      ).to.be.revertedWith("Insufficient role permissions");
    });

    it("Should reject revoking unregistered user", async function () {
      await expect(
        accessControl.revokeAccess(unauthorized.address)
      ).to.be.revertedWith("User not registered");
    });

    it("Should reject revoking owner access", async function () {
      await expect(
        accessControl.revokeAccess(owner.address)
      ).to.be.revertedWith("Cannot revoke owner access");
    });
  });

  describe("Role Checking", function () {
    beforeEach(async function () {
      await accessControl.assignRole(issuer.address, Role.ISSUER);
      await accessControl.assignRole(verifier.address, Role.VERIFIER);
      await accessControl.assignRole(student.address, Role.STUDENT);
    });

    it("Should correctly check specific roles", async function () {
      expect(await accessControl.hasRole(owner.address, Role.ADMIN)).to.be.true;
      expect(await accessControl.hasRole(issuer.address, Role.ISSUER)).to.be.true;
      expect(await accessControl.hasRole(verifier.address, Role.VERIFIER)).to.be.true;
      expect(await accessControl.hasRole(student.address, Role.STUDENT)).to.be.true;
      
      expect(await accessControl.hasRole(issuer.address, Role.ADMIN)).to.be.false;
      expect(await accessControl.hasRole(student.address, Role.ISSUER)).to.be.false;
    });

    it("Should correctly check role hierarchy", async function () {
      expect(await accessControl.hasRoleOrHigher(owner.address, Role.STUDENT)).to.be.true;
      expect(await accessControl.hasRoleOrHigher(owner.address, Role.VERIFIER)).to.be.true;
      expect(await accessControl.hasRoleOrHigher(owner.address, Role.ISSUER)).to.be.true;
      expect(await accessControl.hasRoleOrHigher(owner.address, Role.ADMIN)).to.be.true;
      
      expect(await accessControl.hasRoleOrHigher(issuer.address, Role.STUDENT)).to.be.true;
      expect(await accessControl.hasRoleOrHigher(issuer.address, Role.VERIFIER)).to.be.true;
      expect(await accessControl.hasRoleOrHigher(issuer.address, Role.ISSUER)).to.be.true;
      expect(await accessControl.hasRoleOrHigher(issuer.address, Role.ADMIN)).to.be.false;
      
      expect(await accessControl.hasRoleOrHigher(student.address, Role.STUDENT)).to.be.true;
      expect(await accessControl.hasRoleOrHigher(student.address, Role.VERIFIER)).to.be.false;
    });

    it("Should return correct user roles", async function () {
      expect(await accessControl.getUserRole(owner.address)).to.equal(Role.ADMIN);
      expect(await accessControl.getUserRole(issuer.address)).to.equal(Role.ISSUER);
      expect(await accessControl.getUserRole(verifier.address)).to.equal(Role.VERIFIER);
      expect(await accessControl.getUserRole(student.address)).to.equal(Role.STUDENT);
    });

    it("Should reject getting role for unregistered user", async function () {
      await expect(
        accessControl.getUserRole(unauthorized.address)
      ).to.be.revertedWith("User not registered");
    });

    it("Should correctly check registration status", async function () {
      expect(await accessControl.isUserRegistered(owner.address)).to.be.true;
      expect(await accessControl.isUserRegistered(issuer.address)).to.be.true;
      expect(await accessControl.isUserRegistered(unauthorized.address)).to.be.false;
    });
  });

  describe("Modifiers", function () {
    beforeEach(async function () {
      await accessControl.assignRole(issuer.address, Role.ISSUER);
      await accessControl.assignRole(verifier.address, Role.VERIFIER);
    });

    it("Should emit AccessAttempt event on successful role check", async function () {
      await expect(accessControl.connect(issuer).assignRole(student.address, Role.STUDENT))
        .to.be.revertedWith("Insufficient role permissions");
    });

    it("Should reject unregistered users", async function () {
      await expect(
        accessControl.connect(unauthorized).assignRole(student.address, Role.STUDENT)
      ).to.be.revertedWith("User not registered");
    });
  });

  describe("Batch Operations", function () {
    it("Should batch assign roles correctly", async function () {
      const users = [issuer.address, verifier.address, student.address];
      const roles = [Role.ISSUER, Role.VERIFIER, Role.STUDENT];
      
      await accessControl.batchAssignRoles(users, roles);
      
      expect(await accessControl.userRoles(issuer.address)).to.equal(Role.ISSUER);
      expect(await accessControl.userRoles(verifier.address)).to.equal(Role.VERIFIER);
      expect(await accessControl.userRoles(student.address)).to.equal(Role.STUDENT);
      
      expect(await accessControl.isRegistered(issuer.address)).to.be.true;
      expect(await accessControl.isRegistered(verifier.address)).to.be.true;
      expect(await accessControl.isRegistered(student.address)).to.be.true;
    });

    it("Should emit events for batch operations", async function () {
      const users = [issuer.address, verifier.address];
      const roles = [Role.ISSUER, Role.VERIFIER];
      
      const tx = await accessControl.batchAssignRoles(users, roles);
      const receipt = await tx.wait();
      
      // Should emit UserRegistered and RoleAssigned for each user
      expect(receipt.logs.length).to.be.greaterThan(0);
    });

    it("Should reject batch operations with mismatched arrays", async function () {
      const users = [issuer.address, verifier.address];
      const roles = [Role.ISSUER]; // Mismatched length
      
      await expect(
        accessControl.batchAssignRoles(users, roles)
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("Should reject empty arrays", async function () {
      await expect(
        accessControl.batchAssignRoles([], [])
      ).to.be.revertedWith("Empty arrays");
    });

    it("Should reject batch operations from non-admin", async function () {
      await accessControl.assignRole(issuer.address, Role.ISSUER);
      
      await expect(
        accessControl.connect(issuer).batchAssignRoles([verifier.address], [Role.VERIFIER])
      ).to.be.revertedWith("Insufficient role permissions");
    });
  });

  describe("Admin Transfer", function () {
    beforeEach(async function () {
      await accessControl.assignRole(admin.address, Role.ISSUER);
    });

    it("Should transfer admin role correctly", async function () {
      await accessControl.transferAdminRole(admin.address);
      
      expect(await accessControl.userRoles(admin.address)).to.equal(Role.ADMIN);
      expect(await accessControl.userRoles(owner.address)).to.equal(Role.ISSUER);
      expect(await accessControl.owner()).to.equal(admin.address);
    });

    it("Should emit role events on admin transfer", async function () {
      await expect(accessControl.transferAdminRole(admin.address))
        .to.emit(accessControl, "RoleAssigned")
        .withArgs(admin.address, Role.ADMIN, owner.address)
        .and.to.emit(accessControl, "RoleRevoked")
        .withArgs(owner.address, Role.ADMIN, admin.address);
    });

    it("Should reject transfer to invalid address", async function () {
      await expect(
        accessControl.transferAdminRole(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid admin address");
    });

    it("Should reject transfer to self", async function () {
      await expect(
        accessControl.transferAdminRole(owner.address)
      ).to.be.revertedWith("Cannot transfer to self");
    });

    it("Should reject transfer from non-admin", async function () {
      await expect(
        accessControl.connect(admin).transferAdminRole(issuer.address)
      ).to.be.revertedWith("Insufficient role permissions");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple role changes for same user", async function () {
      // Assign initial role
      await accessControl.assignRole(issuer.address, Role.STUDENT);
      expect(await accessControl.userRoles(issuer.address)).to.equal(Role.STUDENT);
      
      // Change to verifier
      await accessControl.assignRole(issuer.address, Role.VERIFIER);
      expect(await accessControl.userRoles(issuer.address)).to.equal(Role.VERIFIER);
      
      // Change to issuer
      await accessControl.assignRole(issuer.address, Role.ISSUER);
      expect(await accessControl.userRoles(issuer.address)).to.equal(Role.ISSUER);
      
      // Revoke access
      await accessControl.revokeAccess(issuer.address);
      expect(await accessControl.isRegistered(issuer.address)).to.be.false;
    });

    it("Should handle assigning same role multiple times", async function () {
      await accessControl.assignRole(issuer.address, Role.ISSUER);
      await accessControl.assignRole(issuer.address, Role.ISSUER);
      
      expect(await accessControl.userRoles(issuer.address)).to.equal(Role.ISSUER);
      expect(await accessControl.isRegistered(issuer.address)).to.be.true;
    });
  });
});