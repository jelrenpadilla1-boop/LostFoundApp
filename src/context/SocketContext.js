// src/context/SocketContext.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [useFallback, setUseFallback] = useState(false);

  // We'll use polling as fallback instead of WebSockets for now
  // This avoids the Pusher connection issues

  const subscribeToNotifications = (userId, callbacks) => {
    // Use polling as fallback
    console.log('Using polling for notifications');
    
    let interval;
    let lastCheck = 0;
    
    const poll = async () => {
      try {
        const response = await fetch(`http://YOUR_IP:8000/api/notifications/recent`, {
          headers: {
            'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.notifications?.length) {
            data.notifications.forEach(notif => {
              callbacks.onNotification?.(notif);
            });
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };
    
    interval = setInterval(poll, 10000);
    
    return {
      unsubscribe: () => {
        if (interval) clearInterval(interval);
      }
    };
  };

  const subscribeToConversation = (conversationId, callbacks) => {
    // Use polling for messages
    console.log('Using polling for messages');
    
    let interval;
    let lastMessageId = 0;
    
    const poll = async () => {
      try {
        const response = await fetch(`http://YOUR_IP:8000/api/messages/${conversationId}/poll`, {
          headers: {
            'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.messages?.length) {
            data.messages.forEach(msg => {
              if (msg.id > lastMessageId) {
                callbacks.onNewMessage?.({ message: msg });
                lastMessageId = msg.id;
              }
            });
          }
        }
      } catch (err) {
        console.error('Message polling error:', err);
      }
    };
    
    interval = setInterval(poll, 3000);
    
    return {
      unsubscribe: () => {
        if (interval) clearInterval(interval);
      }
    };
  };

  const value = {
    connected,
    error,
    useFallback,
    subscribeToNotifications,
    subscribeToConversation,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};