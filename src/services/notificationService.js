// src/services/notificationService.js
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from '../api/client';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Safe check for Expo Go environment
const isExpoGo = () => {
  try {
    return Constants.appOwnership === 'expo';
  } catch (e) {
    return true; // Assume it's Expo Go if we can't check
  }
};

export async function registerForPushNotifications() {
  try {
    // Skip all push notification setup in Expo Go
    if (isExpoGo()) {
      console.log('📱 Running in Expo Go - Push notifications disabled');
      console.log('💡 App will work normally without push notifications');
      return null;
    }

    // Only continue for development builds
    if (Platform.OS === 'web') {
      return null;
    }

    // Check permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Push notification permissions denied');
        return null;
      }
    }

    // Get project ID safely
    let projectId = null;
    try {
      projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                  Constants.expoConfig?.projectId;
    } catch (e) {
      console.log('No project ID available');
    }
    
    if (!projectId) {
      console.log('No Expo project ID found - skipping push notifications');
      return null;
    }

    // Get push token
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('Push token:', token.data);
    
    // Save to backend
    await savePushToken(token.data);
    
    return token.data;
  } catch (error) {
    console.log('Push notification setup skipped:', error.message);
    return null; // Don't throw error, just return null
  }
}

async function savePushToken(token) {
  try {
    await api.post('/notifications/device-token', { token });
  } catch (error) {
    console.log('Could not save push token (non-critical)');
  }
}

export async function scheduleLocalNotification(title, body, data = {}, seconds = 1) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: { seconds },
    });
  } catch (error) {
    console.log('Could not schedule notification (non-critical)');
  }
}

export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.log('Could not cancel notifications (non-critical)');
  }
}