// src/api/notifications.js
import api from './client';

export const notificationsAPI = {
  getNotifications: (page = 1) => {
    return api.get('/notifications', { params: { page } });
  },
  
  markAsRead: (id) => {
    return api.post(`/notifications/${id}/read`);
  },
  
  markAllAsRead: () => {
    return api.post('/notifications/mark-all-read');
  },
  
  getUnreadCount: () => {
    return api.get('/notifications/unread-count');
  },
  
  getRecent: () => {
    return api.get('/notifications/recent');
  },
  
  delete: (id) => {
    return api.delete(`/notifications/${id}`);
  },
  
  clearAll: () => {
    return api.delete('/notifications/clear-all');
  },
};