// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AccessControl
 * @dev Role-based access control contract for document verification system
 * Supports ADMIN, ISSUER, VERIFIER, and STUDENT roles with hierarchical permissions
 */
contract AccessControl is Ownable {
    // Role definitions
    enum Role { STUDENT, VERIFIER, ISSUER, ADMIN }
    
    // Mappings
    mapping(address => Role) public userRoles;
    mapping(address => bool) public isRegistered;
    
    // Events
    event RoleAssigned(address indexed user, Role indexed role, address indexed assignedBy);
    event RoleRevoked(address indexed user, Role indexed previousRole, address indexed revokedBy);
    event AccessAttempt(address indexed user, string action, bool success);
    event UserRegistered(address indexed user, Role indexed role);
    
    // Modifiers
    modifier onlyRole(Role _role) {
        require(isRegistered[msg.sender], "User not registered");
        require(userRoles[msg.sender] == _role, "Insufficient role permissions");
        emit AccessAttempt(msg.sender, "Role check", true);
        _;
    }
    
    modifier onlyRoleOrHigher(Role _minRole) {
        require(isRegistered[msg.sender], "User not registered");
        require(userRoles[msg.sender] >= _minRole, "Insufficient role permissions");
        emit AccessAttempt(msg.sender, "Role check", true);
        _;
    }
    
    modifier onlyAdminOrIssuer() {
        require(isRegistered[msg.sender], "User not registered");
        require(
            userRoles[msg.sender] == Role.ADMIN || userRoles[msg.sender] == Role.ISSUER,
            "Only admin or issuer allowed"
        );
        emit AccessAttempt(msg.sender, "Admin/Issuer check", true);
        _;
    }
    
    constructor() Ownable(msg.sender) {
        // Assign owner as ADMIN
        userRoles[msg.sender] = Role.ADMIN;
        isRegistered[msg.sender] = true;
        emit UserRegistered(msg.sender, Role.ADMIN);
        emit RoleAssigned(msg.sender, Role.ADMIN, msg.sender);
    }
    
    /**
     * @dev Assign role to a user (only ADMIN can assign roles)
     * @param _user Address of the user
     * @param _role Role to assign
     */
    function assignRole(address _user, Role _role) external onlyRole(Role.ADMIN) {
        require(_user != address(0), "Invalid user address");
        require(_role <= Role.ADMIN, "Invalid role");
        
        Role previousRole = userRoles[_user];
        bool wasRegistered = isRegistered[_user];
        
        userRoles[_user] = _role;
        isRegistered[_user] = true;
        
        if (!wasRegistered) {
            emit UserRegistered(_user, _role);
        }
        
        emit RoleAssigned(_user, _role, msg.sender);
        
        if (wasRegistered && previousRole != _role) {
            emit RoleRevoked(_user, previousRole, msg.sender);
        }
    }
    
    /**
     * @dev Revoke user access (only ADMIN can revoke)
     * @param _user Address of the user
     */
    function revokeAccess(address _user) external onlyRole(Role.ADMIN) {
        require(_user != address(0), "Invalid user address");
        require(isRegistered[_user], "User not registered");
        require(_user != owner(), "Cannot revoke owner access");
        
        Role previousRole = userRoles[_user];
        isRegistered[_user] = false;
        userRoles[_user] = Role.STUDENT; // Reset to lowest role
        
        emit RoleRevoked(_user, previousRole, msg.sender);
    }
    
    /**
     * @dev Check if user has specific role
     * @param _user Address of the user
     * @param _role Role to check
     * @return bool True if user has the role
     */
    function hasRole(address _user, Role _role) external view returns (bool) {
        return isRegistered[_user] && userRoles[_user] == _role;
    }
    
    /**
     * @dev Check if user has role or higher
     * @param _user Address of the user
     * @param _minRole Minimum role required
     * @return bool True if user has the role or higher
     */
    function hasRoleOrHigher(address _user, Role _minRole) external view returns (bool) {
        return isRegistered[_user] && userRoles[_user] >= _minRole;
    }
    
    /**
     * @dev Get user role
     * @param _user Address of the user
     * @return Role User's role
     */
    function getUserRole(address _user) external view returns (Role) {
        require(isRegistered[_user], "User not registered");
        return userRoles[_user];
    }
    
    /**
     * @dev Check if user is registered
     * @param _user Address of the user
     * @return bool True if user is registered
     */
    function isUserRegistered(address _user) external view returns (bool) {
        return isRegistered[_user];
    }
    
    /**
     * @dev Batch assign roles (only ADMIN)
     * @param _users Array of user addresses
     * @param _roles Array of roles to assign
     */
    function batchAssignRoles(address[] calldata _users, Role[] calldata _roles) 
        external 
        onlyRole(Role.ADMIN) 
    {
        require(_users.length == _roles.length, "Arrays length mismatch");
        require(_users.length > 0, "Empty arrays");
        
        for (uint256 i = 0; i < _users.length; i++) {
            require(_users[i] != address(0), "Invalid user address");
            require(_roles[i] <= Role.ADMIN, "Invalid role");
            
            Role previousRole = userRoles[_users[i]];
            bool wasRegistered = isRegistered[_users[i]];
            
            userRoles[_users[i]] = _roles[i];
            isRegistered[_users[i]] = true;
            
            if (!wasRegistered) {
                emit UserRegistered(_users[i], _roles[i]);
            }
            
            emit RoleAssigned(_users[i], _roles[i], msg.sender);
            
            if (wasRegistered && previousRole != _roles[i]) {
                emit RoleRevoked(_users[i], previousRole, msg.sender);
            }
        }
    }
    
    /**
     * @dev Emergency function to transfer admin role (only current admin)
     * @param _newAdmin Address of the new admin
     */
    function transferAdminRole(address _newAdmin) external onlyRole(Role.ADMIN) {
        require(_newAdmin != address(0), "Invalid admin address");
        require(_newAdmin != msg.sender, "Cannot transfer to self");
        
        // Assign new admin
        userRoles[_newAdmin] = Role.ADMIN;
        isRegistered[_newAdmin] = true;
        
        // Remove admin role from current admin
        userRoles[msg.sender] = Role.ISSUER; // Downgrade to issuer
        
        emit RoleAssigned(_newAdmin, Role.ADMIN, msg.sender);
        emit RoleRevoked(msg.sender, Role.ADMIN, _newAdmin);
        
        // Transfer ownership
        _transferOwnership(_newAdmin);
    }
}