// src/utils/pusherConfig.js
export const getPusherConfig = () => {
  // Get your computer's IP - replace with actual IP
  const YOUR_COMPUTER_IP = '192.168.1.2';
  
  // For development with Expo Go
  if (__DEV__) {
    return {
      key: '9d07def6364aafd87b17', // Get from .env or config
      cluster: 'mt1', // required by pusher-js, ignored for local Reverb hosts
      authEndpoint: `http://${YOUR_COMPUTER_IP}:8092/api/broadcasting/auth`,
      // Disable stats to avoid additional connections
      enableStats: false,
    };
  }
  
  // Production
  return {
    key: '9d07def6364aafd87b17',
    cluster: 'mt1',
    authEndpoint: 'http://192.168.1.2:8092/api/broadcasting/auth',
    enableStats: true,
  };
};
