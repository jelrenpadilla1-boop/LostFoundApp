// src/navigation/AppNavigator.js
import { Feather } from '@expo/vector-icons';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import CreateItemScreen from '../screens/items/CreateItemScreen';
import EditItemScreen from '../screens/items/EditItemScreen';
import ItemDetailScreen from '../screens/items/ItemDetailScreen';
import MyFoundItemsScreen from '../screens/items/MyFoundItemsScreen';
import MyLostItemsScreen from '../screens/items/MyLostItemsScreen';
import MapScreen from '../screens/main/MapScreen';
import MatchDetailScreen from '../screens/matches/MatchDetailScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import AuthStack from './AuthStack';
import MainTabNavigator from './MainTabNavigator';

// Admin Screens
import AdminCreateUserScreen from '../screens/admin/AdminCreateUserScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminItemsScreen from '../screens/admin/AdminItemsScreen';
import AdminMatchesScreen from '../screens/admin/AdminMatchesScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import AdminUserDetailScreen from '../screens/admin/AdminUserDetailScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { colors, isDark } = useTheme();
  const { unreadNotifications, clearUnreadNotifications } = useSocket();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Theme values matching Profile screen
  const theme = {
    background: isDark ? '#141414' : '#f8fafc',
    card: isDark ? '#1a1a1a' : '#ffffff',
    text: isDark ? '#ffffff' : '#0f172a',
    textSecondary: isDark ? '#e5e5e5' : '#334155',
    textMuted: isDark ? '#b3b3b3' : '#64748b',
    border: isDark ? '#333333' : '#edeef5',
    headerBg: isDark ? '#141414' : '#ffffff',
    shadow: isDark ? 'transparent' : '#000',
    red: '#e50914',
    redMuted: isDark ? 'rgba(229,9,20,0.15)' : '#fde8e8',
  };

  const NotificationBell = ({ navigation }) => (
    <TouchableOpacity
      onPress={() => {
        clearUnreadNotifications();
        navigation.navigate('Notifications');
      }}
      style={[styles.notificationBell, { backgroundColor: theme.redMuted }]}
      activeOpacity={0.8}
    >
      <Feather name="bell" size={20} color={theme.red} />
      {unreadNotifications > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.red }]}>
          <Text style={styles.badgeText}>
            {unreadNotifications > 99 ? '99+' : unreadNotifications}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const BackButton = ({ navigation }) => (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={[styles.backButton, { backgroundColor: theme.redMuted }]}
      activeOpacity={0.8}
    >
      <Feather name="chevron-left" size={22} color={theme.red} />
    </TouchableOpacity>
  );

  const headerStyle = {
    backgroundColor: theme.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    height: Platform.OS === 'ios' ? 100 : 80,
  };

  const headerTitleStyle = {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    letterSpacing: -0.3,
  };

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle,
        headerTitleStyle,
        headerBackTitleVisible: false,
        headerTintColor: theme.red,
        headerLeft: () => <BackButton navigation={navigation} />,
        headerRight: () => <NotificationBell navigation={navigation} />,
        headerTitleAlign: 'center',
        cardStyle: { backgroundColor: theme.background },
        cardShadowEnabled: false,
        cardOverlayEnabled: false,
      })}
    >
      {!user ? (
        <Stack.Screen
          name="Auth"
          component={AuthStack}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          {/* Main Tab Navigator */}
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          
          {/* Common Screens - Custom Header Style */}
          <Stack.Screen
            name="ItemDetail"
            component={ItemDetailScreen}
            options={{ 
              title: 'Item Details',
              headerTitleStyle,
            }}
          />
          <Stack.Screen
            name="CreateItem"
            component={CreateItemScreen}
            options={{ 
              title: 'Report Item',
              headerTitleStyle,
            }}
          />
          <Stack.Screen
            name="EditItem"
            component={EditItemScreen}
            options={{ 
              title: 'Edit Item',
              headerTitleStyle,
            }}
          />
          
          {/* FIXED: Chat Screen - Set headerShown to true */}
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ 
              title: 'Chat',
              headerShown: false,  // ← Changed from false to true
              headerTitleStyle,
            }}
          />
          
          <Stack.Screen
            name="MatchDetail"
            component={MatchDetailScreen}
            options={{ 
              title: 'Match Details',
              headerShown: false,
            }}
          />
          
          {/* My Items Screens */}
          <Stack.Screen
            name="MyLostItems"
            component={MyLostItemsScreen}
            options={{ title: 'My Lost Items', headerTitleStyle }}
          />
          <Stack.Screen
            name="MyFoundItems"
            component={MyFoundItemsScreen}
            options={{ title: 'My Found Items', headerTitleStyle }}
          />
          
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ 
              title: 'Notifications',
              headerTitleStyle,
            }}
          />
          <Stack.Screen
            name="Map"
            component={MapScreen}
            options={{ 
              title: 'Map',
              headerTitleStyle,
            }}
          />
          
          {/* Admin Screens */}
          <Stack.Screen
            name="AdminDashboard"
            component={AdminDashboardScreen}
            options={{ 
              title: 'Admin Dashboard',
              headerTitleStyle,
            }}
          />
          <Stack.Screen
            name="AdminUsers"
            component={AdminUsersScreen}
            options={{ 
              title: 'Manage Users',
              headerTitleStyle,
            }}
          />
          <Stack.Screen
            name="AdminUserDetail"
            component={AdminUserDetailScreen}
            options={{ 
              title: 'User Details',
              headerTitleStyle,
            }}
          />
          <Stack.Screen
            name="AdminCreateUser"
            component={AdminCreateUserScreen}
            options={{ 
              title: 'Create User',
              headerTitleStyle,
            }}
          />
          <Stack.Screen
            name="AdminItems"
            component={AdminItemsScreen}
            options={{ 
              title: 'Manage Items',
              headerTitleStyle,
            }}
          />
          <Stack.Screen
            name="AdminMatches"
            component={AdminMatchesScreen}
            options={{ 
              title: 'Manage Matches',
              headerTitleStyle,
            }}
          />
          <Stack.Screen
            name="AdminReports"
            component={AdminReportsScreen}
            options={{ 
              title: 'Reports',
              headerTitleStyle,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  notificationBell: {
    marginRight: 20,
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
  backButton: {
    marginLeft: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});