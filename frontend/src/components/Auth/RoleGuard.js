import React from 'react';

const RoleGuard = ({ allowedRoles, userRole, children, fallback }) => {
  if (!allowedRoles.includes(userRole)) {
    return fallback || (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '8px',
        color: '#721c24'
      }}>
        <h3>🚫 Access Denied</h3>
        <p>You don't have permission to access this feature.</p>
        <p>Required roles: {allowedRoles.join(', ')}</p>
        <p>Your role: {userRole}</p>
      </div>
    );
  }

  return children;
};

export default RoleGuard;