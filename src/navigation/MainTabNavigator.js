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
  const { isDark } = useTheme();
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
    clearUnreadMatches,
    clearUnreadLost,
    clearUnreadFound,
    clearUnreadNotifications,
    clearUnreadMyLost,
    clearUnreadMyFound,
    clearUnreadAdminMatches,
    clearUnreadAdminUsers,
    refreshUnreadMessages,
  } = useSocket();

  const totalPendingItems = (pendingLostCount || 0) + (pendingFoundCount || 0);

  const theme = {
    background: isDark ? '#141414' : '#f8fafc',
    tabBar: isDark ? '#18181b' : '#ffffff',
    tabBarBorder: isDark ? '#2f3037' : '#e6e8ef',
    text: isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#9ca3af' : '#667085',
    red: '#e50914',
    redMuted: isDark ? 'rgba(229,9,20,0.16)' : '#fff1f2',
    cardBorder: isDark ? '#333333' : '#edeef5',
  };

  const tabBarStyle = {
    backgroundColor: theme.tabBar,
    borderTopColor: theme.tabBarBorder,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 72,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: isDark ? 0.35 : 0.08,
    shadowRadius: 12,
    elevation: 8,
  };

  const tabBarActiveTintColor = theme.red;
  const tabBarInactiveTintColor = isDark ? '#666688' : '#94a3b8';

  // ✅ FIXED: Badge container with overflow visible
  const TabBarIcon = ({ focused, iconName, badgeCount }) => (
    <View style={styles.tabIconContainer}>
      {focused && (
        <View
          style={[
            styles.activeIndicator,
            { backgroundColor: theme.red },
          ]}
        />
      )}
      <View
        style={[
          styles.iconWrapper,
          {
            backgroundColor: focused ? theme.redMuted : 'transparent',
            borderColor: focused ? theme.red : 'transparent',
          },
        ]}
      >
        <Feather
          name={iconName}
          size={22}
          color={focused ? tabBarActiveTintColor : tabBarInactiveTintColor}
        />
      </View>
      {badgeCount > 0 && (
        <View
          style={[
            styles.tabBadge,
            {
              backgroundColor: theme.red,
              borderColor: isDark ? '#1a1a1a' : '#ffffff',
            },
          ]}
        >
          <Text style={styles.tabBadgeText}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}
    </View>
  );

  // ---------- ADMIN TABS ----------
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
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
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

  // ---------- USER TABS ----------
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
              badgeCount = unreadMessages || 0;
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
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
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
        listeners={{ focus: refreshUnreadMessages }}
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
    width: 46,
    height: 38,
    overflow: 'visible',
  },
  activeIndicator: {
    position: 'absolute',
    top: 1,
    width: 18,
    height: 3,
    borderRadius: 2,
  },
  iconWrapper: {
    width: 36,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tabBadge: {
    position: 'absolute',
    top: 0,
    right: 2,
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
    fontSize: 10,
    fontWeight: '700',
    marginTop: -2,
    letterSpacing: 0,
    textTransform: 'none',
  },
  tabItem: {
    paddingVertical: 2,
    overflow: 'visible',
  },
});
