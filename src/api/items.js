// src/api/items.js
import api from './client';

export const lostItemsAPI = {
  getAll: (params = {}) => api.get('/lost-items', { params }),
  getOne: (id) => api.get(`/lost-items/${id}`),
  getMyItems: () => api.get('/lost-items/my-items'),
  create: (data) => {
    return api.post('/lost-items', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  update: (id, data) => {
    // Use POST with _method=PUT to handle file uploads properly
    return api.post(`/lost-items/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (id) => api.delete(`/lost-items/${id}`),
  approve: (id) => api.post(`/lost-items/${id}/approve`),
  reject: (id, reason) => api.post(`/lost-items/${id}/reject`, { rejection_reason: reason }),
  getPendingCount: () => api.get('/lost-items/pending/count'),
  // NEW: Mark a lost item as found (owner action)
  markAsFound: (id) => api.post(`/lost-items/${id}/mark-as-found`),
};

export const foundItemsAPI = {
  getAll: (params = {}) => api.get('/found-items', { params }),
  getOne: (id) => api.get(`/found-items/${id}`),
  getMyItems: () => api.get('/found-items/my-items'),
  create: (data) => {
    return api.post('/found-items', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  update: (id, data) => {
    // Use POST with _method=PUT to handle file uploads properly
    return api.post(`/found-items/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (id) => api.delete(`/found-items/${id}`),
  approve: (id) => api.post(`/found-items/${id}/approve`),
  reject: (id, reason) => api.post(`/found-items/${id}/reject`, { rejection_reason: reason }),
  getPendingCount: () => api.get('/found-items/pending/count'),
  // NEW: Mark a found item as claimed (owner action)
  markAsClaimed: (id, claimDetails) => api.post(`/found-items/${id}/mark-as-claimed`, { claim_details: claimDetails }),
};

// For backward compatibility
export const itemsAPI = {
  createLostItem: (data) => lostItemsAPI.create(data),
  createFoundItem: (data) => foundItemsAPI.create(data),
};