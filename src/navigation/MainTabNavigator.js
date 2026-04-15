// src/navigation/MainTabNavigator.js
import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminItemsScreen from '../screens/admin/AdminItemsScreen';
import AdminMatchesScreen from '../screens/admin/AdminMatchesScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import FoundItemsScreen from '../screens/items/FoundItemsScreen';
import LostItemsScreen from '../screens/items/LostItemsScreen';
import MyFoundItemsScreen from '../screens/items/MyFoundItemsScreen';
import MyLostItemsScreen from '../screens/items/MyLostItemsScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import MapScreen from '../screens/main/MapScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import MatchesScreen from '../screens/matches/MatchesScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { isAdmin } = useAuth();
  const { colors, isDark } = useTheme();
  const {
    // User unread counts
    unreadMessages,
    unreadMatches,
    unreadLost,
    unreadFound,
    unreadNotifications,
    // My items unread counts
    unreadMyLost,
    unreadMyFound,
    // Admin unread counts
    unreadAdminMatches,
    unreadAdminUsers,
    // Pending counts
    pendingLostCount,
    pendingFoundCount,
    pendingMatchesCount,
    pendingUsersCount,
    // Clear functions
    clearUnreadMessages,
    clearUnreadMatches,
    clearUnreadLost,
    clearUnreadFound,
    clearUnreadNotifications,
    clearUnreadMyLost,
    clearUnreadMyFound,
    clearUnreadAdminMatches,
    clearUnreadAdminUsers,
  } = useSocket();

  // Format badge count (show 99+ for large numbers)
  const formatBadgeCount = (count) => {
    if (!count || count === 0) return undefined;
    if (count > 99) return '99+';
    return count;
  };

  // Calculate total badges for admin tabs
  const totalPendingItems = (pendingLostCount || 0) + (pendingFoundCount || 0);

  // Theme colors matching Profile screen
  const theme = {
    background: isDark ? '#141414' : '#f8fafc',
    tabBar: isDark ? '#1a1a1a' : '#ffffff',
    tabBarBorder: isDark ? '#333333' : '#edeef5',
    text: isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#b3b3b3' : '#64748b',
    red: '#e50914',
    cardBorder: isDark ? '#333333' : '#edeef5',
  };

  const tabBarStyle = {
    backgroundColor: theme.tabBar,
    borderTopColor: theme.tabBarBorder,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  };

  const tabBarActiveTintColor = theme.red;
  const tabBarInactiveTintColor = isDark ? '#666688' : '#94a3b8';

  // Custom Tab Bar Icon with badge (matching Profile screen's badge style)
  const TabBarIcon = ({ focused, iconName, badgeCount }) => (
    <View style={styles.tabIconContainer}>
      <View style={[
        styles.iconWrapper,
        focused && styles.iconWrapperActive,
        { backgroundColor: focused ? (isDark ? 'rgba(229,9,20,0.15)' : '#fde8e8') : 'transparent' }
      ]}>
        <Feather 
          name={iconName} 
          size={22} 
          color={focused ? tabBarActiveTintColor : tabBarInactiveTintColor} 
        />
      </View>
      {badgeCount > 0 && (
        <View style={[
          styles.tabBadge, 
          { 
            backgroundColor: theme.red,
            borderColor: isDark ? '#1a1a1a' : '#ffffff'
          }
        ]}>
          <Text style={styles.tabBadgeText}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}
    </View>
  );

  // Admin Tab Configuration
  if (isAdmin) {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => {
            let iconName;
            let badgeCount = 0;

            switch (route.name) {
              case 'AdminDashboard':
                iconName = 'pie-chart';
                badgeCount = unreadNotifications;
                break;
              case 'AdminUsers':
                iconName = 'users';
                badgeCount = pendingUsersCount;
                break;
              case 'AdminItems':
                iconName = 'package';
                badgeCount = totalPendingItems;
                break;
              case 'AdminMatches':
                iconName = 'git-branch';
                badgeCount = pendingMatchesCount;
                break;
              case 'Profile':
                iconName = 'user';
                badgeCount = 0;
                break;
              default:
                iconName = 'circle';
            }

            return (
              <TabBarIcon 
                focused={focused}
                iconName={iconName}
                badgeCount={badgeCount}
              />
            );
          },
          tabBarActiveTintColor,
          tabBarInactiveTintColor,
          tabBarStyle,
          headerShown: false,
          tabBarShowLabel: true,
          tabBarLabelStyle: [
            styles.tabLabel,
            { color: isDark ? '#b3b3b3' : '#64748b' }
          ],
        })}
      >
        <Tab.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          options={{ title: 'Home' }}
          listeners={{ focus: clearUnreadNotifications }}
        />
        <Tab.Screen
          name="AdminUsers"
          component={AdminUsersScreen}
          options={{ title: 'Users' }}
          listeners={{ focus: clearUnreadAdminUsers }}
        />
        <Tab.Screen
          name="AdminItems"
          component={AdminItemsScreen}
          options={{ title: 'Items' }}
        />
        <Tab.Screen
          name="AdminMatches"
          component={AdminMatchesScreen}
          options={{ title: 'Matches' }}
          listeners={{ focus: clearUnreadAdminMatches }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Profile' }}
        />
      </Tab.Navigator>
    );
  }

  // Regular User Tab Configuration
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let iconName;
          let badgeCount = 0;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'pie-chart';
              badgeCount = unreadNotifications;
              break;
            case 'Lost':
              iconName = 'alert-triangle';
              badgeCount = unreadLost;
              break;
            case 'Found':
              iconName = 'check-circle';
              badgeCount = unreadFound;
              break;
            case 'MyLost':
              iconName = 'archive';
              badgeCount = unreadMyLost;
              break;
            case 'MyFound':
              iconName = 'archive';
              badgeCount = unreadMyFound;
              break;
            case 'Map':
              iconName = 'map-pin';
              badgeCount = 0;
              break;
            case 'Matches':
              iconName = 'git-branch';
              badgeCount = unreadMatches;
              break;
            case 'Messages':
              iconName = 'message-circle';
              badgeCount = unreadMessages;
              break;
            case 'Profile':
              iconName = 'user';
              badgeCount = 0;
              break;
            default:
              iconName = 'circle';
          }

          return (
            <TabBarIcon 
              focused={focused}
              iconName={iconName}
              badgeCount={badgeCount}
            />
          );
        },
        tabBarActiveTintColor,
        tabBarInactiveTintColor,
        tabBarStyle,
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: [
          styles.tabLabel,
          { color: isDark ? '#b3b3b3' : '#64748b' }
        ],
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Home' }}
        listeners={{ focus: clearUnreadNotifications }}
      />
      <Tab.Screen
        name="Lost"
        component={LostItemsScreen}
        options={{ title: 'Lost' }}
        listeners={{ focus: clearUnreadLost }}
      />
      <Tab.Screen
        name="Found"
        component={FoundItemsScreen}
        options={{ title: 'Found' }}
        listeners={{ focus: clearUnreadFound }}
      />
      <Tab.Screen
        name="MyLost"
        component={MyLostItemsScreen}
        options={{ title: 'My Lost' }}
        listeners={{ focus: clearUnreadMyLost }}
      />
      <Tab.Screen
        name="MyFound"
        component={MyFoundItemsScreen}
        options={{ title: 'My Found' }}
        listeners={{ focus: clearUnreadMyFound }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ title: 'Map' }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{ title: 'Matches' }}
        listeners={{ focus: clearUnreadMatches }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ title: 'Chat' }}
        listeners={{ focus: clearUnreadMessages }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    transform: [{ scale: 1 }],
  },
  tabBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
    textAlign: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.3,
    textTransform: 'none',
  },
});