// src/screens/items/LostItemsScreen.js
import Icon from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { lostItemsAPI } from '../../api/items';
import ItemCard from '../../components/items/ItemCard';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = 'http://10.214.114.132:8092';

export default function LostItemsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('all');
  const { user, isAdmin } = useAuth();
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(1)).current;
  const floatingButtonAnim = useRef(new Animated.Value(0)).current;

  const categories = [
    { id: 'Electronics', label: 'Tech', icon: 'phone-portrait', color: '#3b82f6', gradient: ['#3b82f6', '#06b6d4'] },
    { id: 'Documents', label: 'Docs', icon: 'document-text', color: '#f59e0b', gradient: ['#f59e0b', '#f97316'] },
    { id: 'Accessories', label: 'Gear', icon: 'watch', color: '#ec489a', gradient: ['#ec489a', '#f43f5e'] },
    { id: 'Clothing', label: 'Wear', icon: 'shirt', color: '#14b8a6', gradient: ['#14b8a6', '#2dd4bf'] },
    { id: 'Bags', label: 'Bags', icon: 'bag', color: '#8b5cf6', gradient: ['#8b5cf6', '#a855f7'] },
    { id: 'Jewelry', label: 'Jewelry', icon: 'diamond', color: '#f43f5e', gradient: ['#f43f5e', '#fb7185'] },
    { id: 'Keys', label: 'Keys', icon: 'key', color: '#a855f7', gradient: ['#a855f7', '#c084fc'] },
    { id: 'Other', label: 'Other', icon: 'cube', color: '#6b7280', gradient: ['#6b7280', '#9ca3af'] }
  ];

  const statsCards = [
    { icon: 'analytics', label: 'Total Items', value: 0, color: '#6366f1', bg: '#eef2ff' },
    { icon: 'time', label: 'Pending', value: 0, color: '#f59e0b', bg: '#fffbeb' },
    { icon: 'checkmark-circle', label: 'Resolved', value: 0, color: '#10b981', bg: '#f0fdf4' },
    { icon: 'trending-up', label: 'This Week', value: 0, color: '#ec489a', bg: '#fdf2f8' },
  ];

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [selectedCategory, selectedStatus, activeTab])
  );

  useEffect(() => {
    Animated.spring(floatingButtonAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const getImageUrl = (photo) => {
    if (!photo) return null;
    if (photo.startsWith('http')) return photo;
    return `${API_BASE_URL}/storage/${photo}`;
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (searchQuery) params.search = searchQuery;
      
      const response = await lostItemsAPI.getAll(params);
      
      let itemsData = [];
      let statsData = null;
      
      if (response.data && response.data.data) {
        itemsData = response.data.data;
        statsData = response.data.stats;
      } else if (response.data && response.data.lostItems) {
        itemsData = response.data.lostItems;
        statsData = response.data.stats;
      } else if (Array.isArray(response.data)) {
        itemsData = response.data;
      } else {
        itemsData = response.data || [];
      }
      
      setItems(itemsData);
      setStats(statsData);
      
      // Update stats cards
      if (statsData) {
        const resolved = (statsData.returned || 0) + (statsData.found || 0);
        statsCards[0].value = statsData.total || itemsData.length;
        statsCards[1].value = statsData.pending || 0;
        statsCards[2].value = resolved;
        statsCards[3].value = statsData.thisWeek || 0;
      }
      
    } catch (error) {
      console.error('Error loading lost items:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
      } else {
        Alert.alert('Error', 'Failed to load lost items');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadItems();
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    const timeoutId = setTimeout(() => loadItems(), 500);
    return () => clearTimeout(timeoutId);
  };

  const headerBackgroundColor = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)'],
    extrapolate: 'clamp',
  });

  const renderStatsCard = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.statsScroll}
      contentContainerStyle={styles.statsContainer}
    >
      {statsCards.map((card, index) => (
        <LinearGradient
          key={index}
          colors={[card.bg, card.bg]}
          style={styles.statCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.statIcon, { backgroundColor: card.bg }]}>
            <Icon name={card.icon} size={24} color={card.color} />
          </View>
          <Text style={styles.statValue}>{card.value}</Text>
          <Text style={styles.statLabel}>{card.label}</Text>
        </LinearGradient>
      ))}
    </ScrollView>
  );

  const renderCategoryGrid = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.categoryScroll}
      contentContainerStyle={styles.categoryGrid}
    >
      <TouchableOpacity onPress={() => setSelectedCategory('all')} activeOpacity={0.8}>
        <LinearGradient
          colors={selectedCategory === 'all' ? ['#6366f1', '#8b5cf6'] : ['#fff', '#fff']}
          style={[styles.categoryCard, selectedCategory === 'all' && styles.categoryCardActive]}
        >
          <View style={[styles.categoryIconWrapper, selectedCategory === 'all' && styles.categoryIconWrapperActive]}>
            <Icon name="apps" size={28} color={selectedCategory === 'all' ? '#fff' : '#6366f1'} />
          </View>
          <Text style={[styles.categoryLabel, selectedCategory === 'all' && styles.categoryLabelActive]}>All</Text>
        </LinearGradient>
      </TouchableOpacity>
      
      {categories.map((category) => (
        <TouchableOpacity
          key={category.id}
          onPress={() => setSelectedCategory(category.id)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={selectedCategory === category.id ? category.gradient : ['#fff', '#fff']}
            style={[
              styles.categoryCard,
              selectedCategory === category.id && styles.categoryCardActive
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={[
              styles.categoryIconWrapper,
              selectedCategory === category.id && styles.categoryIconWrapperActive
            ]}>
              <Icon 
                name={category.icon} 
                size={28} 
                color={selectedCategory === category.id ? '#fff' : category.color} 
              />
            </View>
            <Text style={[
              styles.categoryLabel,
              selectedCategory === category.id && styles.categoryLabelActive
            ]}>
              {category.label}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'all' && styles.tabActive]}
        onPress={() => setActiveTab('all')}
      >
        <Icon 
          name="apps-outline" 
          size={20} 
          color={activeTab === 'all' ? '#6366f1' : '#94a3b8'} 
        />
        <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
          All Items
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'nearby' && styles.tabActive]}
        onPress={() => setActiveTab('nearby')}
      >
        <Icon 
          name="location-outline" 
          size={20} 
          color={activeTab === 'nearby' ? '#6366f1' : '#94a3b8'} 
        />
        <Text style={[styles.tabText, activeTab === 'nearby' && styles.tabTextActive]}>
          Nearby
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'trending' && styles.tabActive]}
        onPress={() => setActiveTab('trending')}
      >
        <Icon 
          name="flame-outline" 
          size={20} 
          color={activeTab === 'trending' ? '#6366f1' : '#94a3b8'} 
        />
        <Text style={[styles.tabText, activeTab === 'trending' && styles.tabTextActive]}>
          Trending
        </Text>
      </TouchableOpacity>

      <View style={styles.viewModeButtons}>
        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'grid' && styles.viewModeBtnActive]}
          onPress={() => setViewMode('grid')}
        >
          <Icon 
            name="grid-outline" 
            size={20} 
            color={viewMode === 'grid' ? '#6366f1' : '#94a3b8'} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Icon 
            name="list-outline" 
            size={20} 
            color={viewMode === 'list' ? '#6366f1' : '#94a3b8'} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchWrapper}>
      <LinearGradient
        colors={['#fff', '#fff']}
        style={styles.searchContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Icon name="search-outline" size={22} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search lost items..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
          onSubmitEditing={loadItems}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => {
            setSearchQuery('');
            loadItems();
          }}>
            <Icon name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );

  const renderGridItem = ({ item, index }) => (
    <Animated.View
      style={[
        styles.gridItem,
        {
          opacity: scrollY.interpolate({
            inputRange: [index * 100 - 50, index * 100],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          }),
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => navigation.navigate('ItemDetail', { type: 'lost', id: item.id })}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#fff', '#fefefe']}
          style={styles.gridCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.gridImageContainer}>
            {item.photo ? (
              <Image 
                source={{ uri: getImageUrl(item.photo) }} 
                style={styles.gridImage}
                onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
              />
            ) : (
              <LinearGradient
                colors={categories.find(c => c.id === item.category)?.gradient || ['#6366f1', '#8b5cf6']}
                style={styles.gridPlaceholder}
              >
                <Icon 
                  name={categories.find(c => c.id === item.category)?.icon || 'cube'} 
                  size={48} 
                  color="#fff" 
                />
              </LinearGradient>
            )}
            {item.status && (
              <View style={[styles.gridStatusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.gridStatusText}>
                  {item.status === 'pending' ? 'Pending' : 
                   item.status === 'approved' ? 'Active' : 
                   item.status === 'found' ? 'Found' : 
                   item.status === 'returned' ? 'Returned' : 
                   item.status === 'rejected' ? 'Rejected' : item.status}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.gridContent}>
            <Text style={styles.gridTitle} numberOfLines={1}>{item.item_name}</Text>
            <Text style={styles.gridCategory}>
              <Icon name="folder-outline" size={12} color="#94a3b8" />
              {' '}{item.category}
            </Text>
            <View style={styles.gridFooter}>
              <View style={styles.gridLocation}>
                <Icon name="location-outline" size={12} color="#94a3b8" />
                <Text style={styles.gridLocationText} numberOfLines={1}>
                  {item.lost_location || 'Unknown'}
                </Text>
              </View>
              <Text style={styles.gridDate}>
                {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      approved: '#10b981',
      found: '#3b82f6',
      returned: '#8b5cf6',
      rejected: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const renderHeader = () => (
    <Animated.View style={[styles.header, { backgroundColor: headerBackgroundColor }]}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.welcomeText}>Lost Items</Text>
          <Text style={styles.subText}>Help reunite lost items</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.profileGradient}
          >
            <Icon name="person-outline" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      {renderSearchBar()}
      {renderStatsCard()}
      {renderCategoryGrid()}
      {renderTabs()}
    </Animated.View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          style={styles.loaderGradient}
        >
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Finding lost items...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={items}
        key={viewMode === 'grid' ? 'grid' : 'list'}
        numColumns={viewMode === 'grid' ? 2 : 1}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={viewMode === 'grid' ? renderGridItem : ({ item }) => (
          <View style={styles.listItemWrapper}>
            <ItemCard
              item={item}
              type="lost"
              onPress={() => navigation.navigate('ItemDetail', { type: 'lost', id: item.id })}
            />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
        contentContainerStyle={[
          styles.listContainer,
          viewMode === 'grid' && styles.gridContainer
        ]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <View style={styles.empty}>
            <LinearGradient
              colors={['#fef9e3', '#fff']}
              style={styles.emptyGradient}
            >
              <Icon name="search-circle-outline" size={80} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No matches found' : 'No lost items yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery 
                  ? 'Try a different search or clear filters'
                  : 'Be the first to report a lost item'}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('CreateItem', { type: 'lost' })}>
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.emptyButton}
                >
                  <Icon name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.emptyButtonText}>Report Lost Item</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        }
      />

      <Animated.View 
        style={[
          styles.floatingButton,
          {
            transform: [
              { scale: floatingButtonAnim },
              {
                translateY: floatingButtonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateItem', { type: 'lost' })}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.floatingButtonGradient}
          >
            <Icon name="add" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loaderGradient: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingText: {
    marginTop: 12,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  profileGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  statsScroll: {
    marginBottom: 24,
  },
  statsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    width: 110,
    padding: 14,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryGrid: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    width: 80,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryCardActive: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconWrapperActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryLabelActive: {
    color: '#fff',
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 25,
    gap: 6,
    backgroundColor: '#f1f5f9',
  },
  tabActive: {
    backgroundColor: '#eef2ff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#6366f1',
  },
  viewModeButtons: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 8,
  },
  viewModeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModeBtnActive: {
    backgroundColor: '#eef2ff',
  },
  listContainer: {
    paddingBottom: 100,
  },
  gridContainer: {
    paddingHorizontal: 16,
  },
  listItemWrapper: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  gridItem: {
    flex: 1,
    margin: 6,
  },
  gridCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  gridImageContainer: {
    height: 140,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridStatusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gridStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  gridContent: {
    padding: 12,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  gridCategory: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
  },
  gridFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  gridLocationText: {
    fontSize: 10,
    color: '#94a3b8',
    flex: 1,
  },
  gridDate: {
    fontSize: 10,
    color: '#94a3b8',
  },
  empty: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyGradient: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 30,
  },
  emptyTitle: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 100,
  },
  floatingButtonGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});