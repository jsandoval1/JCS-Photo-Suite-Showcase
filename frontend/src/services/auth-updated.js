/**
 * UPDATED Authentication service with new route structure
 * This shows what auth.js would look like after route refactoring
 */

import api from './api';

/**
 * Register a new user
 */
const register = async (userData) => {
  try {
    // CHANGED: /users/register → /auth/register
    const response = await api.post('/auth/register', userData);
    
    if (response.success && response.tokens) {
      api.storeTokens(response.tokens.accessToken, response.tokens.refreshToken);
      setCachedUser(response.user);
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Login an existing user
 */
const login = async (credentials) => {
  try {
    // CHANGED: /users/login → /auth/login
    const response = await api.post('/auth/login', credentials);
    
    if (response.success && response.tokens) {
      api.storeTokens(response.tokens.accessToken, response.tokens.refreshToken);
      setCachedUser(response.user);
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Logout current user
 */
const logout = async () => {
  try {
    const { refreshToken } = api.getStoredTokens();
    
    if (refreshToken) {
      // CHANGED: /users/logout → /auth/logout
      await api.post('/auth/logout', { refreshToken });
    }
    
    api.removeTokens();
    clearCachedUser();
    
    return { success: true };
  } catch (error) {
    // Even if logout fails on server, clear local tokens
    api.removeTokens();
    clearCachedUser();
    throw error;
  }
};

/**
 * Refresh access token
 */
const refreshAccessToken = async () => {
  try {
    const { refreshToken } = api.getStoredTokens();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    // CHANGED: /users/refresh-token → /auth/refresh-token
    const response = await api.post('/auth/refresh-token', { refreshToken });
    
    if (response.success && response.accessToken) {
      // Store the new access token (keep existing refresh token)
      const { refreshToken: currentRefreshToken } = api.getStoredTokens();
      api.storeTokens(response.accessToken, currentRefreshToken);
      
      return response.accessToken;
    }
    
    throw new Error('Failed to refresh token');
  } catch (error) {
    // If refresh fails, clear all tokens and redirect to login
    api.removeTokens();
    clearCachedUser();
    throw error;
  }
};

/**
 * Verify email with token
 */
const verifyEmail = async (token) => {
  try {
    // CHANGED: /users/verify-email → /auth/verify-email
    const response = await api.get(`/auth/verify-email?token=${token}`);
    
    if (response.success && response.user) {
      // Update cached user with verified status
      const cachedUser = getCachedUser();
      if (cachedUser) {
        setCachedUser({ ...cachedUser, email_verified: true });
      }
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Resend email verification
 */
const resendVerification = async () => {
  try {
    // CHANGED: /users/resend-verification → /auth/resend-verification
    const response = await api.post('/auth/resend-verification');
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Submit contact form
 */
const submitContactForm = async (contactData) => {
  try {
    // CHANGED: /users/contact → /auth/contact
    const response = await api.post('/auth/contact', contactData);
    return response;
  } catch (error) {
    throw error;
  }
};

// Helper functions (unchanged)
const getProfile = async () => {
  try {
    // CHANGED: /users/profile → /profile/
    const response = await api.get('/profile/');
    
    if (response.success && response.user) {
      setCachedUser(response.user);
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};

const isAuthenticated = () => {
  const { accessToken } = api.getStoredTokens();
  return !!accessToken;
};

const getCachedUser = () => {
  try {
    const userData = localStorage.getItem('jcs_user_data');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error parsing cached user data:', error);
    return null;
  }
};

const setCachedUser = (userData) => {
  try {
    localStorage.setItem('jcs_user_data', JSON.stringify(userData));
  } catch (error) {
    console.error('Error caching user data:', error);
  }
};

const clearCachedUser = () => {
  try {
    localStorage.removeItem('jcs_user_data');
  } catch (error) {
    console.error('Error clearing cached user data:', error);
  }
};

export default {
  register,
  login,
  logout,
  refreshAccessToken,
  verifyEmail,
  resendVerification,
  submitContactForm,
  getProfile,
  isAuthenticated,
  getCachedUser,
  setCachedUser,
  clearCachedUser
};