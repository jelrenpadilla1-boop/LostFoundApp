// src/screens/items/MyFoundItemsScreen.js
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { foundItemsAPI } from '../../api/items';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const API_BASE_URL = 'http://10.116.78.132:8092';

export default function MyFoundItemsScreen({ navigation }) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    claimed: 0,
    returned: 0,
    disposed: 0,
    rejected: 0,
  });

  const loadItems = async () => {
    try {
      const response = await foundItemsAPI.getMyItems();
      const data = response.data?.data || response.data || [];
      
      // FILTER: Exclude pending and rejected items
      const filteredItems = data.filter(item => 
        item.status !== 'pending' && item.status !== 'rejected'
      );
      
      setItems(filteredItems);
      
      // Calculate stats based on filtered items
      setStats({
        total: filteredItems.length,
        pending: 0, // Don't show pending count since we're filtering them out
        approved: filteredItems.filter(i => i.status === 'approved').length,
        claimed: filteredItems.filter(i => i.status === 'claimed').length,
        returned: filteredItems.filter(i => i.status === 'returned').length,
        disposed: filteredItems.filter(i => i.status === 'disposed').length,
        rejected: 0, // Don't show rejected count since we're filtering them out
      });
    } catch (error) {
      console.error('Error loading my found items:', error);
      Alert.alert('Error', 'Failed to load your found items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadItems();
  };

  const getImageUrl = (photo) => {
    if (!photo) return null;
    if (photo.startsWith('http')) return photo;
    let cleanPath = photo;
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    return `${API_BASE_URL}/storage/${cleanPath}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#16a34a';
      case 'claimed': return '#3b82f6';
      case 'returned': return '#8b5cf6';
      case 'disposed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return 'check-circle';
      case 'claimed': return 'user-check';
      case 'returned': return 'home';
      case 'disposed': return 'trash-2';
      default: return 'circle';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      approved: 'Approved',
      claimed: 'Claimed',
      returned: 'Returned',
      disposed: 'Disposed',
    };
    return labels[status] || status || 'Unknown';
  };

  const renderItem = ({ item }) => {
    const theme = isDark ? darkTheme : lightTheme;
    const statusColor = getStatusColor(item.status);
    
    return (
      <TouchableOpacity
        style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => navigation.navigate('ItemDetail', { type: 'found', id: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.itemImageContainer}>
          {item.photo ? (
            <Image source={{ uri: getImageUrl(item.photo) }} style={styles.itemImage} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: 'rgba(229,9,20,0.1)' }]}>
              <Feather name="image" size={32} color="#e50914" />
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Feather name={getStatusIcon(item.status)} size={10} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(item.status).toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.itemDetails}>
          <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
            {item.item_name}
          </Text>
          <Text style={[styles.itemCategory, { color: theme.textMuted }]}>
            {item.category}
          </Text>
          <Text style={[styles.itemDate, { color: theme.textMuted }]}>
            Found: {new Date(item.date_found).toLocaleDateString()}
          </Text>
          {item.found_location && (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={12} color={theme.textMuted} />
              <Text style={[styles.itemLocation, { color: theme.textMuted }]} numberOfLines={1}>
                {item.found_location}
              </Text>
            </View>
          )}
        </View>
        
        <Feather name="chevron-right" size={20} color={theme.textMuted} />
      </TouchableOpacity>
    );
  };

  // Custom Header Component
  const CustomHeader = () => {
    const theme = isDark ? darkTheme : lightTheme;
    return (
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={[styles.headerBackButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
        >
          <Feather name="chevron-left" size={24} color={isDark ? '#ffffff' : '#1a1a1a'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Found Items</Text>
        <View style={{ width: 40 }} />
      </View>
    );
  };

  const theme = isDark ? darkTheme : lightTheme;
  const styles = getStyles(isDark, theme);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <CustomHeader />
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      
      {/* Custom Header */}
      <CustomHeader />
      
      {/* Stats Cards - Only showing visible statuses */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsContainer}
        decelerationRate="fast"
        snapToAlignment="center"
      >
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.statIconContainer, { backgroundColor: 'rgba(229,9,20,0.1)' }]}>
            <Feather name="package" size={20} color="#e50914" />
          </View>
          <Text style={[styles.statValue, { color: '#e50914' }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total Items</Text>
        </View>
        
        {stats.approved > 0 && (
          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(22,163,74,0.1)' }]}>
              <Feather name="check-circle" size={20} color="#16a34a" />
            </View>
            <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.approved}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Approved</Text>
          </View>
        )}
        
        {stats.claimed > 0 && (
          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
              <Feather name="user-check" size={20} color="#3b82f6" />
            </View>
            <Text style={[styles.statValue, { color: '#3b82f6' }]}>{stats.claimed}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Claimed</Text>
          </View>
        )}
        
        {stats.returned > 0 && (
          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(139,92,246,0.1)' }]}>
              <Feather name="home" size={20} color="#8b5cf6" />
            </View>
            <Text style={[styles.statValue, { color: '#8b5cf6' }]}>{stats.returned}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Returned</Text>
          </View>
        )}
        
        {stats.disposed > 0 && (
          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
              <Feather name="trash-2" size={20} color="#ef4444" />
            </View>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.disposed}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Disposed</Text>
          </View>
        )}
      </ScrollView>
      
      {/* Items List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e50914" colors={['#e50914']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(229,9,20,0.1)' : 'rgba(229,9,20,0.05)' }]}>
              <Feather name="inbox" size={64} color="#e50914" />
            </View>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              No visible found items yet
            </Text>
            <Text style={[styles.emptySubText, { color: theme.textMuted }]}>
              Items pending or rejected are not shown here
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreateItem', { type: 'found' })}
            >
              <LinearGradient colors={['#e50914', '#b20710']} style={styles.emptyButtonGradient}>
                <Feather name="plus" size={18} color="#fff" />
                <Text style={styles.emptyButtonText}>Report Found Item</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />
      
      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateItem', { type: 'found' })}
        activeOpacity={0.85}
      >
        <LinearGradient colors={['#e50914', '#b20710']} style={styles.fabInner}>
          <Feather name="plus" size={22} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const darkTheme = {
  background: '#141414',
  card: '#1a1a1a',
  text: '#ffffff',
  textMuted: '#b3b3b3',
  border: '#333333',
};

const lightTheme = {
  background: '#f5f5f5',
  card: '#ffffff',
  text: '#1a1a1a',
  textMuted: '#666666',
  border: '#e0e0e0',
};

const getStyles = (isDark, theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  // Stats Styles
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '700',
  },
  itemDetails: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemCategory: {
    fontSize: 12,
  },
  itemDate: {
    fontSize: 11,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemLocation: {
    fontSize: 11,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    maxWidth: '80%',
  },
  emptySubText: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: '80%',
    marginBottom: 8,
  },
  emptyButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 20,
    right: 20,
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
});