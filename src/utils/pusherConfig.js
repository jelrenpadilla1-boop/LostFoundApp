// src/utils/pusherConfig.js
export const getPusherConfig = () => {
  // Get your computer's IP - replace with actual IP
  const YOUR_COMPUTER_IP = '192.168.1.100';
  
  // For development with Expo Go
  if (__DEV__) {
    return {
      key: 'YOUR_PUSHER_KEY', // Get from .env or config
      cluster: 'YOUR_CLUSTER', // e.g., 'mt1'
      authEndpoint: `http://${YOUR_COMPUTER_IP}:8000/broadcasting/auth`,
      // Disable stats to avoid additional connections
      enableStats: false,
    };
  }
  
  // Production
  return {
    key: 'YOUR_PUSHER_KEY',
    cluster: 'YOUR_CLUSTER',
    authEndpoint: 'https://yourdomain.com/broadcasting/auth',
    enableStats: true,
  };
};