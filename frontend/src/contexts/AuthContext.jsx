/**
 * AuthContext provides authentication state management across the entire app
 * This context handles login/logout state, user data, and provides functions
 * for authentication operations. It follows the same pattern as ThemeContext.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/auth';

// Create the authentication context
const AuthContext = createContext();

/**
 * Custom hook to use the authentication context
 * This hook provides access to all authentication state and functions
 * @returns {Object} Auth context value with user, login, logout, etc.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * AuthProvider component that wraps the app and provides authentication state
 * This component manages the authentication state and provides it to all child components
 */
export const AuthProvider = ({ children }) => {
  // Authentication state
  const [user, setUser] = useState(null); // Current user data
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Is user logged in?
  const [isLoading, setIsLoading] = useState(true); // Are we checking authentication status?
  const [error, setError] = useState(null); // Current error message

  /**
   * Clear any existing error messages
   * This is called before authentication operations to clear old errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Initialize authentication on app startup
   * This checks if the user is already authenticated (has valid tokens)
   */
  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      clearError();

      // Check if we have tokens stored locally
      if (authService.isAuthenticated()) {
        // FIRST: Load cached user data immediately to avoid flickering
        const cachedUser = authService.getCachedUser();
        if (cachedUser) {
          setUser(cachedUser);
          setIsAuthenticated(true);
        }

        // THEN: Try to get fresh user data from the server in the background
        try {
          const userData = await authService.getProfile();
          
          if (userData.success) {
            setUser(userData.user);
            setIsAuthenticated(true);
            // Cache the fresh user data
            authService.setCachedUser(userData.user);
          } else {
            // If profile fetch fails, clear everything
            await handleLogout();
          }
        } catch (profileError) {
          console.error('Profile fetch error:', profileError);
          // If we had cached data, keep using it, but if not, logout
          if (!cachedUser) {
            await handleLogout();
          }
        }
      } else {
        // No tokens, user is not authenticated
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      // If there's an error, clear everything and let user log in again
      await handleLogout();
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  /**
   * Handle user login
   * @param {Object} credentials - User login credentials
   * @param {string} credentials.email - User email
   * @param {string} credentials.password - User password
   * @returns {Promise<Object>} Login result
   */
  const handleLogin = useCallback(async (credentials) => {
    try {
      setIsLoading(true);
      clearError();

      // Attempt to login via the auth service
      const response = await authService.login(credentials);
      
      if (response.success) {
        // Login successful, set authenticated state first
        setIsAuthenticated(true);
        
        // Get fresh profile data to ensure we have the most up-to-date information
        try {
          const profileData = await authService.getProfile();
          if (profileData.success) {
            setUser(profileData.user);
            authService.setCachedUser(profileData.user);
            return { success: true, user: profileData.user };
          } else {
            // Fallback to login response data if profile fetch fails
            setUser(response.user);
            authService.setCachedUser(response.user);
            return { success: true, user: response.user };
          }
        } catch (profileError) {
          console.warn('Profile fetch after login failed, using login data:', profileError);
          // Fallback to login response data
          setUser(response.user);
          authService.setCachedUser(response.user);
          return { success: true, user: response.user };
        }
      } else {
        // Login failed
        const errorMsg = response.message || 'Login failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMsg = error.message || 'An error occurred during login';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  /**
   * Handle user registration
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration result
   */
  const handleRegister = useCallback(async (userData) => {
    try {
      setIsLoading(true);
      clearError();

      // Attempt to register via the auth service
      const response = await authService.register(userData);
      
      if (response.success) {
        // Registration successful, set authenticated state first
        setIsAuthenticated(true);
        
        // Get fresh profile data to ensure we have the most up-to-date information
        try {
          const profileData = await authService.getProfile();
          if (profileData.success) {
            setUser(profileData.user);
            authService.setCachedUser(profileData.user);
            return { success: true, user: profileData.user };
          } else {
            // Fallback to registration response data if profile fetch fails
            setUser(response.user);
            authService.setCachedUser(response.user);
            return { success: true, user: response.user };
          }
        } catch (profileError) {
          console.warn('Profile fetch after registration failed, using registration data:', profileError);
          // Fallback to registration response data
          setUser(response.user);
          authService.setCachedUser(response.user);
          return { success: true, user: response.user };
        }
      } else {
        // Registration failed
        const errorMsg = response.message || 'Registration failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMsg = error.message || 'An error occurred during registration';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  /**
   * Handle user logout
   * This clears all authentication state and tokens
   */
  const handleLogout = useCallback(async () => {
    try {
      setIsLoading(true);
      clearError();

      // Call the auth service logout (this clears tokens)
      await authService.logout();
      
      // Clear all authentication state
      setUser(null);
      setIsAuthenticated(false);
      authService.clearCachedUser();
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      setUser(null);
      setIsAuthenticated(false);
      authService.clearCachedUser();
      return { success: true }; // Logout always "succeeds" from UI perspective
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  /**
   * Refresh user profile data
   * This fetches fresh user data from the server
   */
  const refreshProfile = useCallback(async () => {
    try {
      if (!isAuthenticated) {
        return { success: false, error: 'Not authenticated' };
      }

      const userData = await authService.getProfile();
      
      if (userData.success) {
        setUser(userData.user);
        authService.setCachedUser(userData.user);
        return { success: true, user: userData.user };
      } else {
        return { success: false, error: 'Failed to refresh profile' };
      }
    } catch (error) {
      console.error('Profile refresh error:', error);
      
      // If refresh fails due to auth error, logout the user
      if (error.message.includes('Authentication expired')) {
        await handleLogout();
        return { success: false, error: 'Session expired. Please log in again.' };
      }
      
      return { success: false, error: error.message || 'Failed to refresh profile' };
    }
  }, [isAuthenticated, handleLogout]);

  /**
   * Initialize authentication when the component mounts
   */
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  /**
   * Create the context value object
   * This contains all the state and functions that components can access
   */
  const value = {
    // Authentication state
    user,                    // Current user data
    isAuthenticated,         // Is user logged in?
    isLoading,              // Are we performing an auth operation?
    error,                  // Current error message
    
    // Authentication functions
    login: handleLogin,      // Login function
    register: handleRegister, // Registration function
    logout: handleLogout,    // Logout function
    refreshProfile,         // Refresh user profile function
    clearError,             // Clear error function
    
    // Utility functions
    isAuthenticatedUser: () => isAuthenticated && user !== null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 