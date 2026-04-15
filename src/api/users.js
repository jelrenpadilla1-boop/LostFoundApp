// src/api/users.js
import api from './client';

export const usersAPI = {
    // Get all users (except current user)
    getUsers: async (params = {}) => {
        try {
            const response = await api.get('/users', { params });
            const d = response.data;
            let users = [];

            if (d?.success === false) {
                return { data: [], success: false, message: d.message };
            } else if (Array.isArray(d)) {
                users = d;
            } else if (Array.isArray(d?.data) && d.data.length > 0) {
                users = d.data;                     // { data: [...] }
            } else if (Array.isArray(d?.users)) {
                users = d.users;                    // { users: [...] }
            } else if (d?.success === true) {
                users = d.users || d.data || [];    // { success: true, users/data: [...] }
            } else if (Array.isArray(d?.data)) {
                users = d.data;                     // { data: [] } legitimate empty list
            }

            return { data: users, success: true };
        } catch (error) {
            console.error('Error fetching users:', error);
            if (error.response?.status === 401 || error.userMessage === 'Unauthenticated') {
                return { data: [], success: false, message: 'Unauthenticated' };
            }
            return { data: [], success: false, error: error.response?.data?.message || 'Failed to fetch users' };
        }
    },
    
    // Search users
    searchUsers: async (query) => {
        try {
            const response = await api.get(`/users/search`, { params: { q: query } });
            if (response.data && response.data.success === true) {
                return { data: response.data.users || [], success: true };
            } else if (response.data && response.data.data) {
                return { data: response.data.data, success: true };
            } else if (Array.isArray(response.data)) {
                return { data: response.data, success: true };
            }
            return { data: response.data || [], success: true };
        } catch (error) {
            console.error('Error searching users:', error);
            if (error.response?.status === 401) {
                return { data: [], success: false, message: 'Unauthenticated' };
            }
            return { data: [], success: false, error: error.response?.data?.message || 'Failed to search users' };
        }
    },
    
    // Get user by ID
    getUser: async (userId) => {
        try {
            const response = await api.get(`/users/${userId}`);
            if (response.data && response.data.success === true) {
                return { data: response.data.user, success: true };
            } else if (response.data && response.data.data) {
                return { data: response.data.data, success: true };
            }
            return { data: response.data, success: true };
        } catch (error) {
            console.error('Error fetching user:', error);
            if (error.response?.status === 401) {
                return { data: null, success: false, message: 'Unauthenticated' };
            }
            return { data: null, success: false, error: error.response?.data?.message || 'Failed to fetch user' };
        }
    },
    
    // Get user profile
    getProfile: async () => {
        try {
            const response = await api.get('/profile');
            if (response.data && response.data.success === true) {
                return { data: response.data.user || response.data.data, success: true };
            } else if (response.data && response.data.data) {
                return { data: response.data.data, success: true };
            }
            return { data: response.data, success: true };
        } catch (error) {
            console.error('Error fetching profile:', error);
            if (error.response?.status === 401) {
                return { data: null, success: false, message: 'Unauthenticated' };
            }
            return { data: null, success: false, error: error.response?.data?.message || 'Failed to fetch profile' };
        }
    },
    
    // Update user profile
    updateProfile: async (data) => {
        try {
            const formData = new FormData();
            
            Object.keys(data).forEach(key => {
                if (data[key] !== null && data[key] !== undefined) {
                    if (key === 'profile_photo' && data[key] && typeof data[key] === 'object') {
                        formData.append('profile_photo', {
                            uri: data[key].uri,
                            type: data[key].type || 'image/jpeg',
                            name: data[key].name || 'profile_photo.jpg'
                        });
                    } else {
                        formData.append(key, data[key]);
                    }
                }
            });
            
            const response = await api.post('/profile', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            if (response.data && response.data.success === true) {
                return { data: response.data.user || response.data.data, success: true, message: response.data.message };
            }
            return { data: response.data, success: true, message: 'Profile updated successfully' };
        } catch (error) {
            console.error('Error updating profile:', error);
            return { 
                data: null, 
                success: false, 
                error: error.response?.data?.message || error.response?.data?.errors || 'Failed to update profile' 
            };
        }
    },
    
    // Update password
    updatePassword: async (data) => {
        try {
            const response = await api.put('/profile/password', data);
            if (response.data && response.data.success === true) {
                return { success: true, message: response.data.message || 'Password updated successfully' };
            }
            return { success: true, message: 'Password updated successfully' };
        } catch (error) {
            console.error('Error updating password:', error);
            return { 
                success: false, 
                error: error.response?.data?.message || error.response?.data?.errors || 'Failed to update password' 
            };
        }
    },
    
    // Delete account
    deleteAccount: async () => {
        try {
            const response = await api.delete('/profile');
            if (response.data && response.data.success === true) {
                return { success: true, message: response.data.message || 'Account deleted successfully' };
            }
            return { success: true, message: 'Account deleted successfully' };
        } catch (error) {
            console.error('Error deleting account:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to delete account' };
        }
    },
    
    // Get user stats
    getUserStats: async () => {
        try {
            const response = await api.get('/profile/stats');
            if (response.data && response.data.success === true) {
                return { data: response.data.stats || response.data.data, success: true };
            }
            return { data: response.data, success: true };
        } catch (error) {
            console.error('Error fetching user stats:', error);
            if (error.response?.status === 401) {
                return { data: null, success: false, message: 'Unauthenticated' };
            }
            return { data: null, success: false, error: error.response?.data?.message || 'Failed to fetch stats' };
        }
    },
};

export default usersAPI;