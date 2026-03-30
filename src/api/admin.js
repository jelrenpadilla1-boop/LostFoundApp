// src/api/admin.js
import api from './client';

export const adminAPI = {
    // Dashboard
    getDashboardStats: async () => {
        try {
            const response = await api.get('/admin/dashboard');
            return response;
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            // Return default structure
            return { data: { stats: {} } };
        }
    },
    getDashboardStatsAlt: async () => {
        try {
            const response = await api.get('/admin/dashboard/stats');
            return response;
        } catch (error) {
            console.error('Error fetching dashboard stats alt:', error);
            return { data: { stats: {} } };
        }
    },
    
    // Users
    getUsers: async (params = {}) => {
        try {
            const response = await api.get('/admin/users', { params });
            // Ensure consistent response structure
            if (response.data && !response.data.users) {
                response.data.users = response.data.data || [];
            }
            return response;
        } catch (error) {
            console.error('Error fetching users:', error);
            return { data: { users: [] } };
        }
    },
    getRecentUsers: async () => {
        try {
            const response = await api.get('/admin/users/recent');
            // Handle different response structures
            if (response.data && !response.data.users) {
                response.data.users = response.data.data || [];
            }
            return response;
        } catch (error) {
            console.error('Error fetching recent users:', error);
            return { data: { users: [] } };
        }
    },
    getUser: async (id) => {
        try {
            const response = await api.get(`/admin/users/${id}`);
            return response;
        } catch (error) {
            console.error(`Error fetching user ${id}:`, error);
            throw error;
        }
    },
    createUser: async (data) => {
        try {
            const response = await api.post('/admin/users', data);
            return response;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    },
    updateUser: async (id, data) => {
        try {
            const response = await api.put(`/admin/users/${id}`, data);
            return response;
        } catch (error) {
            console.error(`Error updating user ${id}:`, error);
            throw error;
        }
    },
    deleteUser: async (id) => {
        try {
            const response = await api.delete(`/admin/users/${id}`);
            return response;
        } catch (error) {
            console.error(`Error deleting user ${id}:`, error);
            throw error;
        }
    },
    resetPassword: async (id, password) => {
        try {
            const response = await api.post(`/admin/users/${id}/reset-password`, { password });
            return response;
        } catch (error) {
            console.error(`Error resetting password for user ${id}:`, error);
            throw error;
        }
    },
    bulkDeleteUsers: async (userIds) => {
        try {
            const response = await api.post('/admin/users/bulk-delete', { user_ids: userIds });
            return response;
        } catch (error) {
            console.error('Error bulk deleting users:', error);
            throw error;
        }
    },
    
    // Items
    getItems: async (params = {}) => {
        try {
            const response = await api.get('/admin/items', { params });
            // Ensure consistent response structure
            if (response.data && !response.data.items && response.data.data) {
                response.data.items = response.data.data;
            }
            return response;
        } catch (error) {
            console.error('Error fetching items:', error);
            return { data: { items: [] } };
        }
    },
    getLostItems: async (params = {}) => {
        try {
            const response = await api.get('/admin/items/lost', { params });
            if (response.data && !response.data.items && response.data.data) {
                response.data.items = response.data.data;
            }
            return response;
        } catch (error) {
            console.error('Error fetching lost items:', error);
            return { data: { items: [] } };
        }
    },
    getFoundItems: async (params = {}) => {
        try {
            const response = await api.get('/admin/items/found', { params });
            if (response.data && !response.data.items && response.data.data) {
                response.data.items = response.data.data;
            }
            return response;
        } catch (error) {
            console.error('Error fetching found items:', error);
            return { data: { items: [] } };
        }
    },
    getPendingItems: async (params = {}) => {
        try {
            const response = await api.get('/admin/items/pending', { params });
            if (response.data && !response.data.items && response.data.data) {
                response.data.items = response.data.data;
            }
            return response;
        } catch (error) {
            console.error('Error fetching pending items:', error);
            return { data: { items: [] } };
        }
    },
    bulkDeleteItems: async (itemIds, type) => {
        try {
            const response = await api.post('/admin/items/bulk-delete', { item_ids: itemIds, type });
            return response;
        } catch (error) {
            console.error('Error bulk deleting items:', error);
            throw error;
        }
    },
    
    // Matches
    getMatches: async (params = {}) => {
        try {
            const response = await api.get('/admin/matches', { params });
            if (response.data && !response.data.matches && response.data.data) {
                response.data.matches = response.data.data;
            }
            return response;
        } catch (error) {
            console.error('Error fetching matches:', error);
            return { data: { matches: [] } };
        }
    },
    getPendingMatches: async (params = {}) => {
        try {
            const response = await api.get('/admin/matches/pending', { params });
            if (response.data && !response.data.matches && response.data.data) {
                response.data.matches = response.data.data;
            }
            return response;
        } catch (error) {
            console.error('Error fetching pending matches:', error);
            return { data: { matches: [] } };
        }
    },
    bulkUpdateMatches: async (matchIds, status) => {
        try {
            const response = await api.post('/admin/matches/bulk-update', { match_ids: matchIds, status });
            return response;
        } catch (error) {
            console.error('Error bulk updating matches:', error);
            throw error;
        }
    },
    
    // Reports
    getReports: async (params = {}) => {
        try {
            const response = await api.get('/admin/reports', { params });
            return response;
        } catch (error) {
            console.error('Error fetching reports:', error);
            return { data: {} };
        }
    },
    exportUsers: async () => {
        try {
            const response = await api.get('/admin/export/users');
            return response;
        } catch (error) {
            console.error('Error exporting users:', error);
            throw error;
        }
    },
    exportItems: async () => {
        try {
            const response = await api.get('/admin/export/items');
            return response;
        } catch (error) {
            console.error('Error exporting items:', error);
            throw error;
        }
    },
    exportMatches: async () => {
        try {
            const response = await api.get('/admin/export/matches');
            return response;
        } catch (error) {
            console.error('Error exporting matches:', error);
            throw error;
        }
    },
    
    // Analytics
    getAnalytics: async () => {
        try {
            const response = await api.get('/admin/analytics');
            return response;
        } catch (error) {
            console.error('Error fetching analytics:', error);
            return { data: {} };
        }
    },
    
    // Settings
    getSettings: async () => {
        try {
            const response = await api.get('/admin/settings');
            return response;
        } catch (error) {
            console.error('Error fetching settings:', error);
            return { data: {} };
        }
    },
    updateSettings: async (settings) => {
        try {
            const response = await api.put('/admin/settings', settings);
            return response;
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    },
    clearCache: async () => {
        try {
            const response = await api.post('/admin/settings/clear-cache');
            return response;
        } catch (error) {
            console.error('Error clearing cache:', error);
            throw error;
        }
    },
    
    // Search
    search: async (query) => {
        try {
            const response = await api.get('/admin/search', { params: { q: query } });
            return response;
        } catch (error) {
            console.error('Error searching:', error);
            return { data: { results: {} } };
        }
    },
    liveSearch: async (query) => {
        try {
            const response = await api.get('/admin/search/live', { params: { q: query } });
            return response;
        } catch (error) {
            console.error('Error live searching:', error);
            return { data: { suggestions: [] } };
        }
    },
};

// Add default export for backward compatibility
export default adminAPI;