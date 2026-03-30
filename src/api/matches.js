// src/api/matches.js
import api from './client';

export const matchesAPI = {
  // Get all matches (admin only or public)
  getMatches: (params = {}) => {
    return api.get('/matches', { params });
  },
  
  // Get current user's matches
  getMyMatches: (params = {}) => {
    return api.get('/matches/my-matches', { params });
  },
  
  // Get single match details
  getMatch: (id) => {
    return api.get(`/matches/${id}`);
  },
  
  // Confirm a match
  confirmMatch: (id) => {
    return api.post(`/matches/${id}/confirm`);
  },
  
  // Reject a match
  rejectMatch: (id) => {
    return api.post(`/matches/${id}/reject`);
  },
  
  // Get match statistics for current user
  getMatchStats: () => {
    return api.get('/matches/my-stats');
  },
  
  // Bulk update matches (admin only)
  bulkUpdate: (data) => {
    return api.post('/matches/bulk-update', data);
  },
  
  // Get pending count (admin only)
  getPendingCount: () => {
    return api.get('/matches/pending/count');
  },
  
  // Get matches for a specific lost item
  getMatchesForLostItem: (lostItemId) => {
    return api.get(`/matches/lost-item/${lostItemId}`);
  },
  
  // Get matches for a specific found item
  getMatchesForFoundItem: (foundItemId) => {
    return api.get(`/matches/found-item/${foundItemId}`);
  },
};