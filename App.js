// App.js - Updated navigation handling
import { NavigationContainer } from '@react-navigation/native';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setNavigationRef } from './src/api/client';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { SocketProvider } from './src/context/SocketContext';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotifications } from './src/services/notificationService';
import { getToken } from './src/utils/tokenStorage';

// Check if running in Expo Go
const isRunningInExpoGo = () => {
  try {
    return Constants.appOwnership === 'expo';
  } catch (error) {
    return false;
  }
};

function AppContent() {
  const { user, isLoading: authLoading } = useAuth();
  const navigationRef = useRef();

  useEffect(() => {
    // Set navigation ref for API client
    if (navigationRef.current) {
      setNavigationRef(navigationRef.current);
    }
  }, [navigationRef.current]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf9fe' }}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={{ marginTop: 16, color: '#5b5b7a', fontSize: 14 }}>
          Loading Foundify...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={(state) => {
        if (state) {
          const route = state.routes[state.index];
          console.log('Current screen:', route?.name);
        }
      }}
    >
      <StatusBar style="auto" />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeApp();
    
    // AppState listener for when app comes to foreground
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Check if user is already logged in
      const token = await getToken();
      
      // Register for push notifications only if NOT in Expo Go
      if (Platform.OS !== 'web' && !isRunningInExpoGo()) {
        console.log('Running in development build - registering for push notifications');
        await registerForPushNotifications();
      } else if (isRunningInExpoGo()) {
        console.log('⚠️ Running in Expo Go - push notifications not supported');
        console.log('💡 For push notifications, create a development build: https://docs.expo.dev/develop/development-builds/');
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('App initialization error:', err);
      // Don't show error for push notification issues
      if (!err.message?.includes('notifications') && !err.message?.includes('projectId')) {
        setError(err.message);
      }
      setIsLoading(false);
    }
  };

  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      // App came to foreground - refresh if needed
      refreshData();
    }
  };

  const refreshData = async () => {
    try {
      // Only refresh if not in Expo Go
      if (!isRunningInExpoGo() && Platform.OS !== 'web') {
        await registerForPushNotifications();
      }
    } catch (error) {
      console.log('Failed to refresh:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf9fe' }}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={{ marginTop: 16, color: '#5b5b7a', fontSize: 14 }}>
          Loading Foundify...
        </Text>
      </View>
    );
  }

  if (error && !error.includes('notifications')) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf9fe', padding: 20 }}>
        <View style={{ 
          backgroundColor: '#fee2e2', 
          padding: 20, 
          borderRadius: 12, 
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#ef4444'
        }}>
          <Text style={{ fontSize: 24, marginBottom: 12 }}>⚠️</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#dc2626', marginBottom: 8 }}>
            Failed to load app
          </Text>
          <Text style={{ fontSize: 14, color: '#5b5b7a', textAlign: 'center', marginBottom: 16 }}>
            {error}
          </Text>
          <Text 
            onPress={() => {
              setError(null);
              setIsLoading(true);
              initializeApp();
            }}
            style={{ 
              color: '#7c3aed', 
              fontWeight: '600', 
              fontSize: 14,
              paddingVertical: 8,
              paddingHorizontal: 16,
              backgroundColor: '#ede9fe',
              borderRadius: 20
            }}
          >
            Try Again
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <AppContent />
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}