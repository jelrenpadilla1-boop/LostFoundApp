import Icon from '@expo/vector-icons/Ionicons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminItemsScreen from '../screens/admin/AdminItemsScreen';
import AdminMatchesScreen from '../screens/admin/AdminMatchesScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import FoundItemsScreen from '../screens/items/FoundItemsScreen';
import LostItemsScreen from '../screens/items/LostItemsScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import MapScreen from '../screens/main/MapScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import MatchesScreen from '../screens/matches/MatchesScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { isAdmin } = useAuth();

  // Admin Tab Configuration
  if (isAdmin) {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            switch (route.name) {
              case 'AdminDashboard':
                iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                break;
              case 'AdminUsers':
                iconName = focused ? 'people' : 'people-outline';
                break;
              case 'AdminItems':
                iconName = focused ? 'cube' : 'cube-outline';
                break;
              case 'AdminMatches':
                iconName = focused ? 'git-compare' : 'git-compare-outline';
                break;
              case 'AdminReports':
                iconName = focused ? 'bar-chart' : 'bar-chart-outline';
                break;
              case 'Profile':
                iconName = focused ? 'person' : 'person-outline';
                break;
              default:
                iconName = 'home-outline';
            }
            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#00f0c8',
          tabBarInactiveTintColor: '#999',
          headerShown: false,
        })}
      >
        <Tab.Screen 
          name="AdminDashboard" 
          component={AdminDashboardScreen} 
          options={{ title: 'Dashboard' }}
        />
        <Tab.Screen 
          name="AdminUsers" 
          component={AdminUsersScreen} 
          options={{ title: 'Users' }}
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
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Lost':
              iconName = focused ? 'alert-circle' : 'alert-circle-outline';
              break;
            case 'Found':
              iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
              break;
            case 'Map':
              iconName = focused ? 'map' : 'map-outline';
              break;
            case 'Matches':
              iconName = focused ? 'git-compare' : 'git-compare-outline';
              break;
            case 'Messages':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'home-outline';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#00f0c8',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Lost" component={LostItemsScreen} />
      <Tab.Screen name="Found" component={FoundItemsScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}