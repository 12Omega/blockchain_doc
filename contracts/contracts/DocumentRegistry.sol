// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessControl.sol";

/**
 * @title DocumentRegistry
 * @dev Smart contract for document hash storage and lifecycle management
 * Integrates with AccessControl for role-based permissions
 */
contract DocumentRegistry {
    AccessControl public accessControl;
    
    // Document structure
    struct Document {
        bytes32 documentHash;
        address issuer;
        address owner;
        uint256 timestamp;
        string ipfsHash;
        bool isActive;
        string documentType;
        string metadata; // JSON string for additional metadata
    }
    
    // Mappings
    mapping(bytes32 => Document) public documents;
    mapping(address => bytes32[]) public userDocuments;
    mapping(bytes32 => address[]) public documentViewers;
    mapping(bytes32 => mapping(address => bool)) public hasAccess;
    
    // Counters
    uint256 public totalDocuments;
    mapping(address => uint256) public userDocumentCount;
    
    // Events
    event DocumentRegistered(
        bytes32 indexed documentHash,
        address indexed issuer,
        address indexed owner,
        string ipfsHash,
        string documentType
    );
    
    event DocumentVerified(
        bytes32 indexed documentHash,
        address indexed verifier,
        bool isValid,
        uint256 timestamp
    );
    
    event OwnershipTransferred(
        bytes32 indexed documentHash,
        address indexed previousOwner,
        address indexed newOwner
    );
    
    event AccessGranted(
        bytes32 indexed documentHash,
        address indexed grantedTo,
        address indexed grantedBy
    );
    
    event AccessRevoked(
        bytes32 indexed documentHash,
        address indexed revokedFrom,
        address indexed revokedBy
    );
    
    event DocumentDeactivated(
        bytes32 indexed documentHash,
        address indexed deactivatedBy,
        string reason
    );
    
    // Modifiers
    modifier onlyRegisteredUser() {
        require(accessControl.isUserRegistered(msg.sender), "User not registered");
        _;
    }
    
    modifier onlyIssuerOrAdmin() {
        require(
            accessControl.hasRoleOrHigher(msg.sender, AccessControl.Role.ISSUER),
            "Only issuer or admin allowed"
        );
        _;
    }
    
    modifier onlyDocumentOwner(bytes32 _documentHash) {
        require(documents[_documentHash].owner == msg.sender, "Not document owner");
        _;
    }
    
    modifier onlyDocumentOwnerOrIssuer(bytes32 _documentHash) {
        require(
            documents[_documentHash].owner == msg.sender || 
            documents[_documentHash].issuer == msg.sender ||
            accessControl.hasRole(msg.sender, AccessControl.Role.ADMIN),
            "Not authorized for this document"
        );
        _;
    }
    
    modifier documentExists(bytes32 _documentHash) {
        require(documents[_documentHash].timestamp != 0, "Document does not exist");
        _;
    }
    
    modifier documentActive(bytes32 _documentHash) {
        require(documents[_documentHash].isActive, "Document is not active");
        _;
    }
    
    constructor(address _accessControlAddress) {
        require(_accessControlAddress != address(0), "Invalid AccessControl address");
        accessControl = AccessControl(_accessControlAddress);
    }
    
    /**
     * @dev Register a new document (only issuers and admins)
     * @param _documentHash SHA-256 hash of the document
     * @param _owner Address of the document owner
     * @param _ipfsHash IPFS hash for document storage
     * @param _documentType Type of document (degree, certificate, etc.)
     * @param _metadata Additional metadata as JSON string
     */
    function registerDocument(
        bytes32 _documentHash,
        address _owner,
        string calldata _ipfsHash,
        string calldata _documentType,
        string calldata _metadata
    ) external onlyIssuerOrAdmin {
        require(_documentHash != bytes32(0), "Invalid document hash");
        require(_owner != address(0), "Invalid owner address");
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        require(bytes(_documentType).length > 0, "Document type required");
        require(documents[_documentHash].timestamp == 0, "Document already exists");
        
        // Create document
        documents[_documentHash] = Document({
            documentHash: _documentHash,
            issuer: msg.sender,
            owner: _owner,
            timestamp: block.timestamp,
            ipfsHash: _ipfsHash,
            isActive: true,
            documentType: _documentType,
            metadata: _metadata
        });
        
        // Update mappings
        userDocuments[_owner].push(_documentHash);
        userDocumentCount[_owner]++;
        totalDocuments++;
        
        // Grant access to owner and issuer
        hasAccess[_documentHash][_owner] = true;
        hasAccess[_documentHash][msg.sender] = true;
        documentViewers[_documentHash].push(_owner);
        if (_owner != msg.sender) {
            documentViewers[_documentHash].push(msg.sender);
        }
        
        emit DocumentRegistered(_documentHash, msg.sender, _owner, _ipfsHash, _documentType);
    }
    
    /**
     * @dev Verify a document by comparing hashes
     * @param _documentHash Hash to verify
     * @return isValid True if document exists and is active
     * @return document Document details if valid
     */
    function verifyDocument(bytes32 _documentHash) 
        external 
        onlyRegisteredUser 
        returns (bool isValid, Document memory document) 
    {
        document = documents[_documentHash];
        isValid = document.timestamp != 0 && document.isActive;
        
        emit DocumentVerified(_documentHash, msg.sender, isValid, block.timestamp);
        
        return (isValid, document);
    }
    
    /**
     * @dev Transfer document ownership
     * @param _documentHash Hash of the document
     * @param _newOwner Address of the new owner
     */
    function transferOwnership(bytes32 _documentHash, address _newOwner) 
        external 
        documentExists(_documentHash)
        documentActive(_documentHash)
        onlyDocumentOwnerOrIssuer(_documentHash)
    {
        require(_newOwner != address(0), "Invalid new owner address");
        require(accessControl.isUserRegistered(_newOwner), "New owner not registered");
        require(documents[_documentHash].owner != _newOwner, "Already the owner");
        
        address previousOwner = documents[_documentHash].owner;
        documents[_documentHash].owner = _newOwner;
        
        // Update user documents mapping
        userDocuments[_newOwner].push(_documentHash);
        userDocumentCount[_newOwner]++;
        
        // Remove from previous owner's list
        _removeDocumentFromUser(previousOwner, _documentHash);
        userDocumentCount[previousOwner]--;
        
        // Grant access to new owner
        hasAccess[_documentHash][_newOwner] = true;
        documentViewers[_documentHash].push(_newOwner);
        
        emit OwnershipTransferred(_documentHash, previousOwner, _newOwner);
    }
    
    /**
     * @dev Grant access to view a document
     * @param _documentHash Hash of the document
     * @param _user Address to grant access to
     */
    function grantAccess(bytes32 _documentHash, address _user) 
        external 
        documentExists(_documentHash)
        documentActive(_documentHash)
        onlyDocumentOwnerOrIssuer(_documentHash)
    {
        require(_user != address(0), "Invalid user address");
        require(accessControl.isUserRegistered(_user), "User not registered");
        require(!hasAccess[_documentHash][_user], "User already has access");
        
        hasAccess[_documentHash][_user] = true;
        documentViewers[_documentHash].push(_user);
        
        emit AccessGranted(_documentHash, _user, msg.sender);
    }
    
    /**
     * @dev Revoke access to view a document
     * @param _documentHash Hash of the document
     * @param _user Address to revoke access from
     */
    function revokeAccess(bytes32 _documentHash, address _user) 
        external 
        documentExists(_documentHash)
        onlyDocumentOwnerOrIssuer(_documentHash)
    {
        require(_user != address(0), "Invalid user address");
        require(hasAccess[_documentHash][_user], "User doesn't have access");
        require(_user != documents[_documentHash].owner, "Cannot revoke owner access");
        require(_user != documents[_documentHash].issuer, "Cannot revoke issuer access");
        
        hasAccess[_documentHash][_user] = false;
        _removeViewerFromDocument(_documentHash, _user);
        
        emit AccessRevoked(_documentHash, _user, msg.sender);
    }
    
    /**
     * @dev Deactivate a document (only issuer or admin)
     * @param _documentHash Hash of the document
     * @param _reason Reason for deactivation
     */
    function deactivateDocument(bytes32 _documentHash, string calldata _reason) 
        external 
        documentExists(_documentHash)
        onlyDocumentOwnerOrIssuer(_documentHash)
    {
        require(documents[_documentHash].isActive, "Document already inactive");
        require(bytes(_reason).length > 0, "Reason required");
        
        documents[_documentHash].isActive = false;
        
        emit DocumentDeactivated(_documentHash, msg.sender, _reason);
    }
    
    /**
     * @dev Get document details (only for users with access)
     * @param _documentHash Hash of the document
     * @return document Document details
     */
    function getDocument(bytes32 _documentHash) 
        external 
        view 
        documentExists(_documentHash)
        returns (Document memory document) 
    {
        require(
            hasAccess[_documentHash][msg.sender] || 
            accessControl.hasRoleOrHigher(msg.sender, AccessControl.Role.VERIFIER),
            "No access to this document"
        );
        
        return documents[_documentHash];
    }
    
    /**
     * @dev Get user's documents
     * @param _user Address of the user
     * @return documentHashes Array of document hashes owned by user
     */
    function getUserDocuments(address _user) 
        external 
        view 
        returns (bytes32[] memory documentHashes) 
    {
        require(
            _user == msg.sender || 
            accessControl.hasRoleOrHigher(msg.sender, AccessControl.Role.VERIFIER),
            "Not authorized to view user documents"
        );
        
        return userDocuments[_user];
    }
    
    /**
     * @dev Get document viewers
     * @param _documentHash Hash of the document
     * @return viewers Array of addresses with access to the document
     */
    function getDocumentViewers(bytes32 _documentHash) 
        external 
        view 
        documentExists(_documentHash)
        returns (address[] memory viewers) 
    {
        require(
            hasAccess[_documentHash][msg.sender] || 
            accessControl.hasRoleOrHigher(msg.sender, AccessControl.Role.ISSUER),
            "Not authorized to view document viewers"
        );
        
        return documentViewers[_documentHash];
    }
    
    /**
     * @dev Check if user has access to document
     * @param _documentHash Hash of the document
     * @param _user Address to check
     * @return hasDocumentAccess True if user has access
     */
    function checkAccess(bytes32 _documentHash, address _user) 
        external 
        view 
        returns (bool hasDocumentAccess) 
    {
        return hasAccess[_documentHash][_user] || 
               accessControl.hasRoleOrHigher(_user, AccessControl.Role.VERIFIER);
    }
    
    /**
     * @dev Get total number of documents
     * @return count Total documents registered
     */
    function getTotalDocuments() external view returns (uint256 count) {
        return totalDocuments;
    }
    
    /**
     * @dev Get user document count
     * @param _user Address of the user
     * @return count Number of documents owned by user
     */
    function getUserDocumentCount(address _user) external view returns (uint256 count) {
        return userDocumentCount[_user];
    }
    
    // Internal helper functions
    
    /**
     * @dev Remove document from user's document list
     * @param _user User address
     * @param _documentHash Document hash to remove
     */
    function _removeDocumentFromUser(address _user, bytes32 _documentHash) internal {
        bytes32[] storage userDocs = userDocuments[_user];
        for (uint256 i = 0; i < userDocs.length; i++) {
            if (userDocs[i] == _documentHash) {
                userDocs[i] = userDocs[userDocs.length - 1];
                userDocs.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Remove viewer from document's viewer list
     * @param _documentHash Document hash
     * @param _viewer Viewer address to remove
     */
    function _removeViewerFromDocument(bytes32 _documentHash, address _viewer) internal {
        address[] storage viewers = documentViewers[_documentHash];
        for (uint256 i = 0; i < viewers.length; i++) {
            if (viewers[i] == _viewer) {
                viewers[i] = viewers[viewers.length - 1];
                viewers.pop();
                break;
            }
        }
    }
}

