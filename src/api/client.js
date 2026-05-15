// src/api/client.js
import axios from 'axios';
import { Alert } from 'react-native';
import { getToken, removeToken, removeUser } from '../utils/tokenStorage';

// Get your IP address from your computer
const API_BASE_URL = 'http://192.168.1.5:8092/api';

// Create a navigation reference to use outside of React components
let navigationRef = null;
let logoutCallback = null;
let isLoggingOut = false;

export const setNavigationRef = (ref) => {
  navigationRef = ref;
};

export const setLogoutCallback = (callback) => {
  logoutCallback = callback;
};

// Function to handle logout without making API call if session is already expired
const handleLogout = async (showAlert = true) => {
  if (isLoggingOut) return;
  isLoggingOut = true;
  
  console.log('Handling logout...');
  
  // Clear stored token and user data
  await removeToken();
  await removeUser();
  
  if (showAlert) {
    Alert.alert(
      'Session Expired',
      'Your session has expired. Please login again.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Call logout callback if set
            if (logoutCallback) {
              logoutCallback();
            }
            
            // Navigate to login screen using navigation ref
            if (navigationRef) {
              try {
                navigationRef.resetRoot({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              } catch (error) {
                console.log('Navigation reset error:', error);
                try {
                  navigationRef.navigate('Login');
                } catch (navError) {
                  console.log('Navigation error:', navError);
                }
              }
            }
          },
        },
      ]
    );
  } else {
    // Call logout callback without alert
    if (logoutCallback) {
      logoutCallback();
    }
    
    // Navigate to login without alert
    if (navigationRef) {
      try {
        navigationRef.resetRoot({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } catch (error) {
        try {
          navigationRef.navigate('Login');
        } catch (navError) {
          console.log('Navigation error:', navError);
        }
      }
    }
  }
  
  setTimeout(() => {
    isLoggingOut = false;
  }, 1000);
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    console.log(`📍 Full URL: ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`📥 API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Define non-critical endpoints that shouldn't trigger logout on 401
    const nonCriticalEndpoints = [
      '/users',
      '/users/search',
      '/profile/stats',
      '/notifications',
      '/messages/unread-count',
      '/matches/unread-count',
      '/pending-count',
      '/new-count',
      '/dashboard/stats',
      '/dashboard/recent-items'
    ];

    // 419 = CSRF token mismatch — the route is on web middleware instead of api.
    // Silently ignore for read-receipt and other fire-and-forget endpoints.
    if (error.response?.status === 419) {
      console.warn(`⚠️ 419 CSRF on ${originalRequest?.url} — route should be in routes/api.php`);
      return Promise.resolve({ data: { success: false, message: 'csrf' } });
    }
    
    const isNonCritical = nonCriticalEndpoints.some(endpoint => 
      originalRequest?.url?.includes(endpoint)
    );
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (originalRequest) originalRequest._retry = true;
      
      if (isNonCritical) {
        console.log(`⚠️ Non-critical endpoint 401: ${originalRequest?.url} - ignoring`);
        // Return a fallback response
        return Promise.resolve({ 
          data: { 
            success: false, 
            message: 'Unauthenticated',
            data: originalRequest?.url?.includes('/users') ? [] : null,
            users: [],
            conversations: [],
            count: 0
          } 
        });
      }
      
      console.log('❌ Critical endpoint 401 - session expired');
      await handleLogout(true);
      return Promise.reject(error);
    }
    
    // Handle network errors
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      console.error('Network error - check your connection');
      error.userMessage = 'Network error. Please check your internet connection.';
    }
    
    // Handle other errors
    if (error.response) {
      console.error(`❌ API Error: ${error.response.status} ${originalRequest?.url || ''}`);
      console.error('Error Data:', error.response.data);
      
      // Extract user-friendly error message
      if (error.response.data) {
        if (error.response.data.message) {
          error.userMessage = error.response.data.message;
        } else if (error.response.data.error) {
          error.userMessage = error.response.data.error;
        } else if (error.response.data.errors) {
          const errors = Object.values(error.response.data.errors).flat();
          error.userMessage = errors.join('\n');
        } else {
          error.userMessage = 'An error occurred. Please try again.';
        }
      }
    } else if (error.request) {
      console.error('No response received from server');
      error.userMessage = 'No response from server. Please check your connection.';
    } else {
      console.error('Error setting up request:', error.message);
      error.userMessage = error.message || 'An error occurred';
    }
    
    return Promise.reject(error);
  }
);

export default api;
