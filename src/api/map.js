// src/api/map.js
import api from './client';

export const mapAPI = {
  // Get all map items
  getItems: () => api.get('/map/items'),
  
  // Get items within bounds (optional)
  getItemsInBounds: (bounds) => api.get('/map/items', { params: bounds }),
  
  // Get locations list
  getLocations: () => api.get('/map/locations'),
};