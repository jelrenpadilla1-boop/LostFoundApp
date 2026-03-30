// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import api, { setLogoutCallback } from '../api/client';
import {
  getToken,
  getUser as getUserFromStorage,
  removeToken,
  removeUser,
  storeToken,
  storeUser
} from '../utils/tokenStorage';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStoredUser();
        
        // Set logout callback for API interceptor
        setLogoutCallback(() => {
            console.log('Logout callback triggered');
            setUser(null);
        });
        
        return () => {
            setLogoutCallback(null);
        };
    }, []);

    const loadStoredUser = async () => {
        try {
            const storedUser = await getUserFromStorage();
            const token = await getToken();
            
            if (storedUser && token) {
                setUser(storedUser);
                console.log('User loaded from storage:', storedUser.name);
            }
        } catch (error) {
            console.error('Error loading stored user:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await api.post('/login', { email, password });
            const { user: userData, token } = response.data;
            
            await storeToken(token);
            await storeUser(userData);
            setUser(userData);
            
            console.log('Login successful:', userData.name);
            return { success: true, user: userData };
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                error: error.userMessage || error.response?.data?.message || 'Login failed' 
            };
        }
    };

    const register = async (userData) => {
        try {
            const response = await api.post('/register', userData);
            const { user: userDataResponse, token } = response.data;
            
            await storeToken(token);
            await storeUser(userDataResponse);
            setUser(userDataResponse);
            
            console.log('Registration successful:', userDataResponse.name);
            return { success: true, user: userDataResponse };
        } catch (error) {
            console.error('Registration error:', error);
            return { 
                success: false, 
                error: error.userMessage || error.response?.data?.message || 'Registration failed' 
            };
        }
    };

    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (error) {
            // Don't show error for 401 on logout
            if (error.response?.status !== 401) {
                console.error('Logout error:', error);
            }
        } finally {
            await removeToken();
            await removeUser();
            setUser(null);
            console.log('User logged out');
        }
    };

    const updateUser = async (updatedUser) => {
        try {
            await storeUser(updatedUser);
            setUser(updatedUser);
            console.log('User updated:', updatedUser.name);
            return true;
        } catch (error) {
            console.error('Error updating user:', error);
            return false;
        }
    };

    const value = {
        user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        isAdmin: user?.role === 'admin' || user?.is_admin === true,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;