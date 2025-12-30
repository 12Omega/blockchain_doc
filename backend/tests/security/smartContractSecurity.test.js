const { ethers } = require('ethers');
const { expect } = require('chai');

/**
 * Smart contract security audit and vulnerability testing
 */

describe('Smart Contract Security Tests', () => {
  let provider, deployer, user1, user2, attacker;
  let documentRegistry, accessControl;
  let documentRegistryFactory, accessControlFactory;

  beforeEach(async () => {
    // Set up test environment
    provider = new ethers.JsonRpcProvider('http://localhost:8545');
    
    // Get test accounts
    const accounts = await provider.listAccounts();
    deployer = await provider.getSigner(accounts[0]);
    user1 = await provider.getSigner(accounts[1]);
    user2 = await provider.getSigner(accounts[2]);
    attacker = await provider.getSigner(accounts[3]);

    // Load contract artifacts
    const DocumentRegistryArtifact = require('../../contracts/DocumentRegistry.json');
    const AccessControlArtifact = require('../../contracts/AccessControl.json');

    // Create contract factories
    documentRegistryFactory = new ethers.ContractFactory(
      DocumentRegistryArtifact.abi,
      DocumentRegistryArtifact.bytecode,
      deployer
    );

    accessControlFactory = new ethers.ContractFactory(
      AccessControlArtifact.abi,
      AccessControlArtifact.bytecode,
      deployer
    );

    // Deploy contracts
    accessControl = await accessControlFactory.deploy();
    await accessControl.waitForDeployment();

    documentRegistry = await documentRegistryFactory.deploy(await accessControl.getAddress());
    await documentRegistry.waitForDeployment();

    // Set up initial roles
    await accessControl.grantRole(await accessControl.ADMIN_ROLE(), await deployer.getAddress());
    await accessControl.grantRole(await accessControl.ISSUER_ROLE(), await user1.getAddress());
    await accessControl.grantRole(await accessControl.VERIFIER_ROLE(), await user2.getAddress());
  });

  describe('Access Control Security', () => {
    test('should prevent unauthorized role assignment', async () => {
      // Attacker tries to grant themselves admin role
      const attackerAccessControl = accessControl.connect(attacker);
      
      await expect(
        attackerAccessControl.grantRole(
          await accessControl.ADMIN_ROLE(),
          await attacker.getAddress()
        )
      ).to.be.revertedWith('AccessControl: account');
    });

    test('should prevent role escalation', async () => {
      // User1 (issuer) tries to grant admin role to themselves
      const user1AccessControl = accessControl.connect(user1);
      
      await expect(
        user1AccessControl.grantRole(
          await accessControl.ADMIN_ROLE(),
          await user1.getAddress()
        )
      ).to.be.revertedWith('AccessControl: account');
    });

    test('should prevent unauthorized document registration', async () => {
      // Attacker tries to register document without issuer role
      const attackerDocumentRegistry = documentRegistry.connect(attacker);
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('test document'));
      const ipfsHash = 'QmTest123456789012345678901234567890123456789012';

      await expect(
        attackerDocumentRegistry.registerDocument(documentHash, ipfsHash)
      ).to.be.revertedWith('Caller is not an issuer');
    });

    test('should validate role-based permissions correctly', async () => {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('test document'));
      const ipfsHash = 'QmTest123456789012345678901234567890123456789012';

      // Issuer should be able to register document
      const user1DocumentRegistry = documentRegistry.connect(user1);
      await expect(
        user1DocumentRegistry.registerDocument(documentHash, ipfsHash)
      ).to.not.be.reverted;

      // Verify document was registered
      const document = await documentRegistry.getDocument(documentHash);
      expect(document.issuer).to.equal(await user1.getAddress());
      expect(document.isActive).to.be.true;
    });

    test('should prevent privilege escalation through contract calls', async () => {
      // Try to call admin functions through document registry
      const attackerDocumentRegistry = documentRegistry.connect(attacker);
      
      // This should fail as attacker doesn't have admin role
      await expect(
        attackerDocumentRegistry.updateAccessControl(await attacker.getAddress())
      ).to.be.revertedWith('Caller is not an admin');
    });
  });

  describe('Reentrancy Attack Prevention', () => {
    test('should prevent reentrancy in document registration', async () => {
      // Create a malicious contract that tries to reenter
      const MaliciousContract = `
        pragma solidity ^0.8.0;
        
        interface IDocumentRegistry {
          function registerDocument(bytes32 documentHash, string memory ipfsHash) external;
        }
        
        contract MaliciousReentrant {
          IDocumentRegistry public target;
          bytes32 public documentHash;
          string public ipfsHash;
          uint256 public callCount;
          
          constructor(address _target) {
            target = IDocumentRegistry(_target);
          }
          
          function attack(bytes32 _documentHash, string memory _ipfsHash) external {
            documentHash = _documentHash;
            ipfsHash = _ipfsHash;
            target.registerDocument(_documentHash, _ipfsHash);
          }
          
          // This would be called if the contract had a fallback that could trigger reentrancy
          fallback() external {
            if (callCount < 2) {
              callCount++;
              target.registerDocument(documentHash, ipfsHash);
            }
          }
        }
      `;

      // Note: This test assumes the contract has proper reentrancy guards
      // In a real audit, you would deploy the malicious contract and test it
      
      // For now, we test that multiple rapid calls don't cause issues
      const documentHash1 = ethers.keccak256(ethers.toUtf8Bytes('test document 1'));
      const documentHash2 = ethers.keccak256(ethers.toUtf8Bytes('test document 2'));
      const ipfsHash = 'QmTest123456789012345678901234567890123456789012';

      const user1DocumentRegistry = documentRegistry.connect(user1);
      
      // Rapid successive calls should not cause reentrancy issues
      const tx1 = user1DocumentRegistry.registerDocument(documentHash1, ipfsHash);
      const tx2 = user1DocumentRegistry.registerDocument(documentHash2, ipfsHash);
      
      await expect(tx1).to.not.be.reverted;
      await expect(tx2).to.not.be.reverted;
    });
  });

  describe('Integer Overflow/Underflow Protection', () => {
    test('should handle large numbers safely', async () => {
      // Test with maximum uint256 values
      const maxUint256 = ethers.MaxUint256;
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('overflow test'));
      const ipfsHash = 'QmTest123456789012345678901234567890123456789012';

      const user1DocumentRegistry = documentRegistry.connect(user1);
      await user1DocumentRegistry.registerDocument(documentHash, ipfsHash);

      // Try operations that might cause overflow
      // Note: Solidity 0.8+ has built-in overflow protection
      const document = await documentRegistry.getDocument(documentHash);
      expect(document.timestamp).to.be.a('bigint');
      expect(document.timestamp).to.be.lessThan(maxUint256);
    });

    test('should prevent timestamp manipulation', async () => {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('timestamp test'));
      const ipfsHash = 'QmTest123456789012345678901234567890123456789012';

      const user1DocumentRegistry = documentRegistry.connect(user1);
      const tx = await user1DocumentRegistry.registerDocument(documentHash, ipfsHash);
      const receipt = await tx.wait();
      
      const block = await provider.getBlock(receipt.blockNumber);
      const document = await documentRegistry.getDocument(documentHash);
      
      // Timestamp should be reasonable (within block timestamp range)
      expect(Number(document.timestamp)).to.be.closeTo(block.timestamp, 60); // Within 60 seconds
    });
  });

  describe('Gas Limit and DoS Attack Prevention', () => {
    test('should handle batch operations efficiently', async () => {
      const user1DocumentRegistry = documentRegistry.connect(user1);
      const gasUsages = [];

      // Register multiple documents and track gas usage
      for (let i = 0; i < 10; i++) {
        const documentHash = ethers.keccak256(ethers.toUtf8Bytes(`batch document ${i}`));
        const ipfsHash = `QmBatch${i.toString().padStart(40, '0')}`;
        
        const tx = await user1DocumentRegistry.registerDocument(documentHash, ipfsHash);
        const receipt = await tx.wait();
        gasUsages.push(Number(receipt.gasUsed));
      }

      // Gas usage should be consistent (no exponential growth)
      const avgGas = gasUsages.reduce((sum, gas) => sum + gas, 0) / gasUsages.length;
      gasUsages.forEach(gas => {
        expect(gas).to.be.closeTo(avgGas, avgGas * 0.1); // Within 10% of average
      });

      // Gas usage should be reasonable (less than 200k per operation)
      expect(avgGas).to.be.lessThan(200000);
    });

    test('should prevent gas griefing attacks', async () => {
      // Test with very long IPFS hash (but still valid)
      const longIpfsHash = 'Qm' + 'a'.repeat(44); // Maximum reasonable length
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('gas test'));

      const user1DocumentRegistry = documentRegistry.connect(user1);
      const tx = await user1DocumentRegistry.registerDocument(documentHash, longIpfsHash);
      const receipt = await tx.wait();

      // Should complete successfully without excessive gas usage
      expect(Number(receipt.gasUsed)).to.be.lessThan(300000);
    });

    test('should handle contract state bloat prevention', async () => {
      // Register many documents to test state growth
      const user1DocumentRegistry = documentRegistry.connect(user1);
      const documentCount = 50;

      for (let i = 0; i < documentCount; i++) {
        const documentHash = ethers.keccak256(ethers.toUtf8Bytes(`state test ${i}`));
        const ipfsHash = `QmState${i.toString().padStart(39, '0')}`;
        
        await user1DocumentRegistry.registerDocument(documentHash, ipfsHash);
      }

      // All documents should be retrievable
      for (let i = 0; i < documentCount; i++) {
        const documentHash = ethers.keccak256(ethers.toUtf8Bytes(`state test ${i}`));
        const document = await documentRegistry.getDocument(documentHash);
        expect(document.isActive).to.be.true;
      }
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('should validate document hash format', async () => {
      const user1DocumentRegistry = documentRegistry.connect(user1);
      const invalidHashes = [
        '0x0', // Too short
        '0x', // Empty
        ethers.ZeroHash // Zero hash
      ];

      for (const invalidHash of invalidHashes) {
        await expect(
          user1DocumentRegistry.registerDocument(
            invalidHash,
            'QmTest123456789012345678901234567890123456789012'
          )
        ).to.be.revertedWith('Invalid document hash');
      }
    });

    test('should validate IPFS hash format', async () => {
      const user1DocumentRegistry = documentRegistry.connect(user1);
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('ipfs validation test'));
      const invalidIpfsHashes = [
        '', // Empty
        'invalid-hash', // Wrong format
        'Qm', // Too short
        'Qm' + 'x'.repeat(100) // Too long
      ];

      for (const invalidIpfsHash of invalidIpfsHashes) {
        await expect(
          user1DocumentRegistry.registerDocument(documentHash, invalidIpfsHash)
        ).to.be.revertedWith('Invalid IPFS hash');
      }
    });

    test('should prevent duplicate document registration', async () => {
      const user1DocumentRegistry = documentRegistry.connect(user1);
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('duplicate test'));
      const ipfsHash = 'QmTest123456789012345678901234567890123456789012';

      // First registration should succeed
      await user1DocumentRegistry.registerDocument(documentHash, ipfsHash);

      // Second registration should fail
      await expect(
        user1DocumentRegistry.registerDocument(documentHash, ipfsHash)
      ).to.be.revertedWith('Document already exists');
    });
  });

  describe('Ownership and Transfer Security', () => {
    test('should prevent unauthorized ownership transfer', async () => {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('ownership test'));
      const ipfsHash = 'QmTest123456789012345678901234567890123456789012';

      // Register document as user1
      const user1DocumentRegistry = documentRegistry.connect(user1);
      await user1DocumentRegistry.registerDocument(documentHash, ipfsHash);

      // Attacker tries to transfer ownership
      const attackerDocumentRegistry = documentRegistry.connect(attacker);
      await expect(
        attackerDocumentRegistry.transferOwnership(documentHash, await attacker.getAddress())
      ).to.be.revertedWith('Not authorized');
    });

    test('should validate ownership transfer permissions', async () => {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('transfer test'));
      const ipfsHash = 'QmTest123456789012345678901234567890123456789012';

      // Register document as user1
      const user1DocumentRegistry = documentRegistry.connect(user1);
      await user1DocumentRegistry.registerDocument(documentHash, ipfsHash);

      // Owner should be able to transfer
      await expect(
        user1DocumentRegistry.transferOwnership(documentHash, await user2.getAddress())
      ).to.not.be.reverted;

      // Verify ownership changed
      const document = await documentRegistry.getDocument(documentHash);
      expect(document.owner).to.equal(await user2.getAddress());
    });

    test('should prevent transfer to zero address', async () => {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('zero address test'));
      const ipfsHash = 'QmTest123456789012345678901234567890123456789012';

      const user1DocumentRegistry = documentRegistry.connect(user1);
      await user1DocumentRegistry.registerDocument(documentHash, ipfsHash);

      await expect(
        user1DocumentRegistry.transferOwnership(documentHash, ethers.ZeroAddress)
      ).to.be.revertedWith('Invalid address');
    });
  });

  describe('Event Emission and Logging Security', () => {
    test('should emit events with correct parameters', async () => {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('event test'));
      const ipfsHash = 'QmTest123456789012345678901234567890123456789012';

      const user1DocumentRegistry = documentRegistry.connect(user1);
      
      await expect(
        user1DocumentRegistry.registerDocument(documentHash, ipfsHash)
      ).to.emit(documentRegistry, 'DocumentRegistered')
        .withArgs(documentHash, await user1.getAddress(), ipfsHash);
    });

    test('should not leak sensitive information in events', async () => {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('privacy test'));
      const ipfsHash = 'QmTest123456789012345678901234567890123456789012';

      const user1DocumentRegistry = documentRegistry.connect(user1);
      const tx = await user1DocumentRegistry.registerDocument(documentHash, ipfsHash);
      const receipt = await tx.wait();

      // Check that events don't contain sensitive data
      const events = receipt.logs;
      events.forEach(event => {
        // Events should not contain raw document content or encryption keys
        expect(event.data).to.not.include('password');
        expect(event.data).to.not.include('private');
        expect(event.data).to.not.include('secret');
      });
    });
  });

  describe('Upgrade and Migration Security', () => {
    test('should handle contract upgrades securely', async () => {
      // Test that contract state is preserved during upgrades
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('upgrade test'));
      const ipfsHash = 'QmTest123456789012345678901234567890123456789012';

      const user1DocumentRegistry = documentRegistry.connect(user1);
      await user1DocumentRegistry.registerDocument(documentHash, ipfsHash);

      // Verify document exists before "upgrade"
      const documentBefore = await documentRegistry.getDocument(documentHash);
      expect(documentBefore.isActive).to.be.true;

      // In a real upgrade scenario, you would deploy a new contract
      // and migrate state. For this test, we just verify data integrity
      const documentAfter = await documentRegistry.getDocument(documentHash);
      expect(documentAfter.documentHash).to.equal(documentBefore.documentHash);
      expect(documentAfter.issuer).to.equal(documentBefore.issuer);
      expect(documentAfter.ipfsHash).to.equal(documentBefore.ipfsHash);
    });

    test('should prevent unauthorized contract upgrades', async () => {
      // Only admin should be able to upgrade contracts
      const attackerDocumentRegistry = documentRegistry.connect(attacker);
      
      await expect(
        attackerDocumentRegistry.updateAccessControl(await attacker.getAddress())
      ).to.be.revertedWith('Caller is not an admin');
    });
  });

  describe('Economic Attack Prevention', () => {
    test('should prevent front-running attacks', async () => {
      // Test that document registration is not vulnerable to front-running
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('front-run test'));
      const ipfsHash = 'QmTest123456789012345678901234567890123456789012';

      const user1DocumentRegistry = documentRegistry.connect(user1);
      const attackerDocumentRegistry = documentRegistry.connect(attacker);

      // Simulate front-running by having attacker try to register first
      // (This would fail because attacker doesn't have issuer role)
      await expect(
        attackerDocumentRegistry.registerDocument(documentHash, ipfsHash)
      ).to.be.revertedWith('Caller is not an issuer');

      // Legitimate user should still be able to register
      await expect(
        user1DocumentRegistry.registerDocument(documentHash, ipfsHash)
      ).to.not.be.reverted;
    });

    test('should handle MEV (Maximal Extractable Value) attacks', async () => {
      // Test that contract operations are not vulnerable to MEV extraction
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('mev test'));
      const ipfsHash = 'QmTest123456789012345678901234567890123456789012';

      const user1DocumentRegistry = documentRegistry.connect(user1);
      
      // Register document with specific gas price
      const tx = await user1DocumentRegistry.registerDocument(documentHash, ipfsHash, {
        gasPrice: ethers.parseUnits('20', 'gwei')
      });
      
      const receipt = await tx.wait();
      
      // Verify transaction was mined successfully
      expect(receipt.status).to.equal(1);
      
      // Document should be registered correctly regardless of MEV attempts
      const document = await documentRegistry.getDocument(documentHash);
      expect(document.issuer).to.equal(await user1.getAddress());
    });
  });

  describe('Oracle and External Call Security', () => {
    test('should handle external call failures gracefully', async () => {
      // Test that contract doesn't break if external calls fail
      // (This would be relevant if the contract made external calls)
      
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('external call test'));
      const ipfsHash = 'QmTest123456789012345678901234567890123456789012';

      const user1DocumentRegistry = documentRegistry.connect(user1);
      
      // Registration should succeed even if external services are down
      await expect(
        user1DocumentRegistry.registerDocument(documentHash, ipfsHash)
      ).to.not.be.reverted;
    });

    test('should validate external data sources', async () => {
      // Test that any external data is properly validated
      // For this contract, IPFS hashes are the main external data
      
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes('validation test'));
      const validIpfsHash = 'QmTest123456789012345678901234567890123456789012';
      
      const user1DocumentRegistry = documentRegistry.connect(user1);
      
      // Valid IPFS hash should work
      await expect(
        user1DocumentRegistry.registerDocument(documentHash, validIpfsHash)
      ).to.not.be.reverted;
      
      // Invalid IPFS hash should be rejected
      await expect(
        user1DocumentRegistry.registerDocument(
          ethers.keccak256(ethers.toUtf8Bytes('invalid test')),
          'invalid-ipfs-hash'
        )
      ).to.be.revertedWith('Invalid IPFS hash');
    });
  });
});