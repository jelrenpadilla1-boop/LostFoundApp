import { createStackNavigator } from '@react-navigation/stack';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import CreateItemScreen from '../screens/items/CreateItemScreen';
import EditItemScreen from '../screens/items/EditItemScreen';
import ItemDetailScreen from '../screens/items/ItemDetailScreen';
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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Stack.Navigator>
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
          
          {/* Common Screens */}
          <Stack.Screen
            name="ItemDetail"
            component={ItemDetailScreen}
            options={{ title: 'Item Details' }}
          />
          <Stack.Screen
            name="CreateItem"
            component={CreateItemScreen}
            options={{ title: 'Report Item' }}
          />
          <Stack.Screen
            name="EditItem"
            component={EditItemScreen}
            options={{ title: 'Edit Item' }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ title: 'Chat' }}
          />
          <Stack.Screen
            name="MatchDetail"
            component={MatchDetailScreen}
            options={{ title: 'Match Details' }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ title: 'Notifications' }}
          />
          
          {/* Admin Screens */}
          <Stack.Screen
            name="AdminDashboard"
            component={AdminDashboardScreen}
            options={{ title: 'Admin Dashboard' }}
          />
          <Stack.Screen
            name="AdminUsers"
            component={AdminUsersScreen}
            options={{ title: 'Manage Users' }}
          />
          <Stack.Screen
            name="AdminUserDetail"
            component={AdminUserDetailScreen}
            options={{ title: 'User Details' }}
          />
          <Stack.Screen
            name="AdminCreateUser"
            component={AdminCreateUserScreen}
            options={{ title: 'Create User' }}
          />
          <Stack.Screen
            name="AdminItems"
            component={AdminItemsScreen}
            options={{ title: 'Manage Items' }}
          />
          <Stack.Screen
            name="AdminMatches"
            component={AdminMatchesScreen}
            options={{ title: 'Manage Matches' }}
          />
          <Stack.Screen
            name="AdminReports"
            component={AdminReportsScreen}
            options={{ title: 'Reports' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}