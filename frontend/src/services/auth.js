/**
 * Authentication service for handling user registration, login, logout, and token management
 */

import api from './api';

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User email address
 * @param {string} userData.password - User password
 * @param {string} userData.first_name - User first name
 * @param {string} userData.last_name - User last name
 * @param {string} userData.district_name - School district name
 * @param {string} userData.district_uniqueid - Unique district identifier
 * @param {string} userData.powerschool_url - PowerSchool server URL (optional)
 * @param {string} userData.test_url - Test server URL (optional)
 * @returns {Promise<Object>} Registration response with user data and tokens
 */
const register = async (userData) => {
  try {
    // Make the registration request
    // Axios interceptors automatically handle JSON parsing and error handling
    const response = await api.post('/auth/register', userData);
    
    // If registration successful, store the tokens
    if (response.success && response.tokens) {
      api.storeTokens(response.tokens.accessToken, response.tokens.refreshToken);
      // Cache user data for quick access
      setCachedUser(response.user);
    }
    
    return response;
  } catch (error) {
    // The axios interceptor converts errors to ApiError objects
    throw error;
  }
};

/**
 * Login an existing user
 * @param {Object} credentials - User login credentials
 * @param {string} credentials.email - User email address
 * @param {string} credentials.password - User password
 * @returns {Promise<Object>} Login response with user data and tokens
 */
const login = async (credentials) => {
  try {
    // Make the login request
    // Axios interceptors automatically handle JSON parsing and error handling
    const response = await api.post('/auth/login', credentials);
    
    // If login successful, store the tokens
    if (response.success && response.tokens) {
      api.storeTokens(response.tokens.accessToken, response.tokens.refreshToken);
      // Cache user data for quick access
      setCachedUser(response.user);
    }
    
    return response;
  } catch (error) {
    // The axios interceptor converts errors to ApiError objects
    throw error;
  }
};

/**
 * Logout the current user
 * This will invalidate the refresh token on the server and clear local tokens
 * @returns {Promise<Object>} Logout response
 */
const logout = async () => {
  try {
    // Get the current refresh token
    const { refreshToken } = api.getStoredTokens();
    
    // If we have a refresh token, tell the server to invalidate it
    if (refreshToken) {
      // Note: We make a direct request here to avoid the auth interceptor
      await api.client.post('/auth/logout', { refreshToken });
    }
  } catch (error) {
    // Don't throw logout errors - we want to clear local state regardless
    console.warn('Logout request failed, but local tokens will be cleared:', error);
  } finally {
    // Always clear the local tokens and cached user data
    api.removeTokens();
    clearCachedUser();
  }
  
  return { success: true, message: 'Logged out successfully' };
};

/**
 * Refresh the access token using the refresh token
 * Note: This is now handled automatically by the axios interceptors,
 * but we keep this function for manual refresh if needed
 * @returns {Promise<string>} New access token
 */
const refreshAccessToken = async () => {
  try {
    // Get the current refresh token
    const { refreshToken } = api.getStoredTokens();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    // Request a new access token using the base axios client to avoid interceptors
    const response = await api.client.post('/auth/refresh-token', { refreshToken });
    
    if (response.data.success && response.data.accessToken) {
      // Store the new access token (keep the same refresh token)
      api.storeTokens(response.data.accessToken, refreshToken);
      return response.data.accessToken;
    } else {
      throw new Error('Invalid refresh token response');
    }
  } catch (error) {
    // If refresh fails, clear all tokens (user needs to log in again)
    api.removeTokens();
    clearCachedUser();
    throw error;
  }
};

/**
 * Get the current user's profile
 * This requires authentication and will automatically refresh the token if needed
 * @returns {Promise<Object>} User profile data
 */
const getProfile = async () => {
  try {
    // The axios interceptors will automatically handle token refresh if needed
    const response = await api.get('/profile/');
    
    if (response.success) {
      // Cache the fresh user data
      setCachedUser(response.user);
      return response;
    }
    
    throw new Error('Failed to get user profile');
  } catch (error) {
    // If profile fetch fails, it might be an auth issue
    if (error.status === 401) {
      // Clear cached data on auth failure
      clearCachedUser();
      throw new Error('Authentication expired. Please log in again.');
    }
    throw error;
  }
};

/**
 * Check if the user is currently authenticated
 * This checks if we have tokens stored locally
 * @returns {boolean} True if user appears to be authenticated
 */
const isAuthenticated = () => {
  const { accessToken, refreshToken } = api.getStoredTokens();
  return !!(accessToken && refreshToken);
};

/**
 * Get the current user data from localStorage
 * This is a quick way to get user data without making an API call
 * Note: This data might be outdated, use getProfile() for fresh data
 * @returns {Object|null} Cached user data or null if not available
 */
const getCachedUser = () => {
  try {
    const userData = localStorage.getItem('jcs_user_data');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error reading cached user data:', error);
    return null;
  }
};

/**
 * Cache user data in localStorage
 * This is called after successful login/registration to cache user data
 * @param {Object} userData - User data to cache
 */
const setCachedUser = (userData) => {
  try {
    localStorage.setItem('jcs_user_data', JSON.stringify(userData));
  } catch (error) {
    console.error('Error caching user data:', error);
  }
};

/**
 * Clear cached user data
 * This is called during logout
 */
const clearCachedUser = () => {
  try {
    localStorage.removeItem('jcs_user_data');
  } catch (error) {
    console.error('Error clearing cached user data:', error);
  }
};

// Export the authentication service
export default {
  register,
  login,
  logout,
  refreshAccessToken,
  getProfile,
  isAuthenticated,
  getCachedUser,
  setCachedUser,
  clearCachedUser,
}; 