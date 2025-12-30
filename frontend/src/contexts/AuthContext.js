import React, { createContext, useContext, useState, useEffect } from 'react';
import useWallet from '../hooks/useWallet';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const wallet = useWallet();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Check authentication status when wallet connection changes
  useEffect(() => {
    checkAuthStatus();
  }, [wallet.account, wallet.isConnected]);

  const checkAuthStatus = async () => {
    setIsLoading(true);
    setAuthError(null);

    try {
      if (!wallet.isConnected || !wallet.account) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      const storedUser = authService.getStoredUser();
      const storedToken = authService.getStoredToken();

      if (storedUser && storedToken && storedUser.walletAddress === wallet.account) {
        // Verify token is still valid by fetching profile
        try {
          const profile = await authService.getUserProfile();
          setUser(profile);
          setIsAuthenticated(true);
        } catch (error) {
          // Token is invalid, clear stored data
          authService.logout();
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthError(error.message);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const authenticate = async () => {
    if (!wallet.signer || !wallet.account) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const authResult = await authService.authenticateWallet(wallet.account, wallet.signer);
      setUser(authResult.user);
      setIsAuthenticated(true);
      return authResult;
    } catch (error) {
      console.error('Authentication failed:', error);
      setAuthError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    wallet.disconnectWallet();
  };

  const updateUserProfile = async (profileData) => {
    try {
      const updatedUser = await authService.updateUserProfile(profileData);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const refreshAuth = async () => {
    if (!wallet.signer || !wallet.account) {
      throw new Error('Wallet not connected');
    }

    try {
      const authResult = await authService.refreshAuth(wallet.account, wallet.signer);
      setUser(authResult.user);
      setIsAuthenticated(true);
      return authResult;
    } catch (error) {
      console.error('Error refreshing auth:', error);
      setAuthError(error.message);
      throw error;
    }
  };

  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions[permission] === true;
  };

  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role;
  };

  const isAdmin = () => hasRole('admin');
  const isIssuer = () => hasRole('issuer') || isAdmin();
  const isVerifier = () => hasRole('verifier') || isAdmin();
  const isStudent = () => hasRole('student');

  const value = {
    // Wallet state
    wallet,
    
    // Auth state
    user,
    isAuthenticated,
    isLoading,
    authError,
    
    // Auth methods
    authenticate,
    logout,
    updateUserProfile,
    refreshAuth,
    checkAuthStatus,
    
    // Permission helpers
    hasPermission,
    hasRole,
    isAdmin,
    isIssuer,
    isVerifier,
    isStudent,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;