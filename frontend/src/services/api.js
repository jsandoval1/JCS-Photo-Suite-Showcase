/**
 * Enhanced API service using Axios
 * This provides a much cleaner and more powerful HTTP client with automatic
 * token management, request/response interceptors, and better error handling
 */

import axios from 'axios';

// Base URL for the licensing server API  
const getApiBaseUrl = () => {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Auto-detect based on environment
  if (import.meta.env.PROD) {
    // In production, use relative path (works with Vercel routing)
    return '/api';
  } else {
    // In development, use localhost
    return 'http://localhost:3000/api';
  }
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Custom error class for API errors
 * This helps us distinguish between network errors and API errors
 */
class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Get stored tokens from localStorage
 * Returns both access and refresh tokens if they exist
 */
const getStoredTokens = () => {
  try {
    const accessToken = localStorage.getItem('jcs_access_token');
    const refreshToken = localStorage.getItem('jcs_refresh_token');
    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Error reading tokens from localStorage:', error);
    return { accessToken: null, refreshToken: null };
  }
};

/**
 * Store tokens in localStorage
 * This persists the tokens across browser sessions
 */
const storeTokens = (accessToken, refreshToken) => {
  try {
    if (accessToken) {
      localStorage.setItem('jcs_access_token', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('jcs_refresh_token', refreshToken);
    }
  } catch (error) {
    console.error('Error storing tokens in localStorage:', error);
  }
};

/**
 * Remove tokens from localStorage
 * This is called when the user logs out
 */
const removeTokens = () => {
  try {
    localStorage.removeItem('jcs_access_token');
    localStorage.removeItem('jcs_refresh_token');
  } catch (error) {
    console.error('Error removing tokens from localStorage:', error);
  }
};

/**
 * Create the main axios instance
 * This will be used for all API requests
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Flag to prevent multiple simultaneous refresh attempts
 * This prevents infinite loops when multiple requests fail at once
 */
let isRefreshing = false;
let failedQueue = [];

/**
 * Process the queue of failed requests after token refresh
 * This replays all the requests that failed during token refresh
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

/**
 * Refresh the access token using the refresh token
 * This is called automatically when an API request returns a 401 error
 */
const refreshAccessToken = async () => {
  const { refreshToken } = getStoredTokens();
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    // Make refresh request without using the main axios instance to avoid interceptors
    const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
      refreshToken: refreshToken
    });

    if (response.data.success && response.data.accessToken) {
      // Store the new access token (keep the same refresh token)
      storeTokens(response.data.accessToken, refreshToken);
      return response.data.accessToken;
    } else {
      throw new Error('Invalid refresh token response');
    }
  } catch (error) {
    // If refresh fails, clear all tokens (user needs to log in again)
    removeTokens();
    throw error;
  }
};

/**
 * Request interceptor to automatically add authorization headers
 * This runs before every request and adds the JWT token if available
 */
apiClient.interceptors.request.use(
  (config) => {
    // Skip auth for certain endpoints
    const skipAuthEndpoints = ['/auth/login', '/auth/register', '/auth/refresh-token'];
    const shouldSkipAuth = skipAuthEndpoints.some(endpoint => 
      config.url?.includes(endpoint)
    );

    if (!shouldSkipAuth) {
      const { accessToken } = getStoredTokens();
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle errors and automatic token refresh
 * This runs after every response and handles 401 errors by refreshing tokens
 */
apiClient.interceptors.response.use(
  (response) => {
    // Return the response data directly (axios already parses JSON)
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Skip token refresh for auth endpoints (login, register, refresh-token)
    const skipRefreshEndpoints = ['/auth/login', '/auth/register', '/auth/refresh-token'];
    const shouldSkipRefresh = skipRefreshEndpoints.some(endpoint => 
      originalRequest.url?.includes(endpoint)
    );

    // If error is 401 and we haven't already tried to refresh, and it's not an auth endpoint
    if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        processQueue(null, newToken);
        
        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // If refresh fails, clear tokens and redirect to login
        removeTokens();
        
        // You might want to redirect to login here
        // window.location.href = '/login';
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    const apiError = new ApiError(
      error.response?.data?.error || 
      error.response?.data?.message || 
      error.message || 
      'Request failed',
      error.response?.status || 0,
      error.response?.data || null
    );

    return Promise.reject(apiError);
  }
);

/**
 * Wrapper functions that provide the same interface as before
 * These make it easy to use the axios client with a clean API
 */

/**
 * Make a GET request
 */
const get = (url, config = {}) => {
  return apiClient.get(url, config);
};

/**
 * Make a POST request
 */
const post = (url, data = null, config = {}) => {
  return apiClient.post(url, data, config);
};

/**
 * Make a PUT request
 */
const put = (url, data = null, config = {}) => {
  return apiClient.put(url, data, config);
};

/**
 * Make a DELETE request
 */
const del = (url, config = {}) => {
  return apiClient.delete(url, config);
};

/**
 * Make a PATCH request
 */
const patch = (url, data = null, config = {}) => {
  return apiClient.patch(url, data, config);
};

// Export the API service with the same interface as before
export default {
  // HTTP methods
  get,
  post,
  put,
  patch,
  delete: del,
  
  // Token management (kept for backward compatibility)
  getStoredTokens,
  storeTokens,
  removeTokens,
  
  // Error class
  ApiError,
  
  // Direct access to axios instance if needed
  client: apiClient,
}; 