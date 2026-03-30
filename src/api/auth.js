import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './client';

export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/login', { email, password });
    const { token, user } = response.data;
    
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user_data', JSON.stringify(user));
    
    return { token, user };
  },

  register: async (userData) => {
    const response = await api.post('/register', userData);
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    await AsyncStorage.multiRemove(['auth_token', 'user_data']);
  },

  getCurrentUser: async () => {
    const userData = await AsyncStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  },
};