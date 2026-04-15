// src/utils/pusherConfig.js
export const getPusherConfig = () => {
  // Get your computer's IP - replace with actual IP
  const YOUR_COMPUTER_IP = '10.116.78.132';
  
  // For development with Expo Go
  if (__DEV__) {
    return {
      key: '9d07def6364aafd87b17', // Get from .env or config
      cluster: 'ap1', // e.g., 'mt1'
      authEndpoint: `http://${YOUR_COMPUTER_IP}:8000/broadcasting/auth`,
      // Disable stats to avoid additional connections
      enableStats: false,
    };
  }
  
  // Production
  return {
    key: '9d07def6364aafd87b17',
    cluster: 'ap1',
    authEndpoint: 'https://yourdomain.com/broadcasting/auth',
    enableStats: true,
  };
};