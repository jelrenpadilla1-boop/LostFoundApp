// src/screens/items/LostItemsScreen.js
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lostItemsAPI } from '../../api/items';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const API_BASE_URL = 'http://192.168.1.2:8092';

export default function LostItemsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('all');
  const [pendingItems, setPendingItems] = useState([]);
  const { user, isAdmin } = useAuth();
  const { isDark } = useTheme();
  
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const gridColumns = isDesktop ? 3 : isTablet ? 2 : 2;
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const floatingButtonAnim = useRef(new Animated.Value(0)).current;
  
  // Debounce timeout ref
  const searchTimeoutRef = useRef(null);

  const styles = getStyles(isDark);

  const categories = [
    { id: 'Electronics', label: 'Electronics', icon: 'cpu', color: '#e50914', gradient: ['#e50914', '#b20710'] },
    { id: 'Documents', label: 'Documents', icon: 'file-text', color: '#f5c518', gradient: ['#f5c518', '#d4a300'] },
    { id: 'Accessories', label: 'Accessories', icon: 'watch', color: '#2196f3', gradient: ['#2196f3', '#1976d2'] },
    { id: 'Clothing', label: 'Clothing', icon: 'shirt', color: '#2e7d32', gradient: ['#2e7d32', '#1b5e20'] },
    { id: 'Bags', label: 'Bags', icon: 'shopping-bag', color: '#9c27b0', gradient: ['#9c27b0', '#7b1fa2'] },
    { id: 'Jewelry', label: 'Jewelry', icon: 'gem', color: '#ff5722', gradient: ['#ff5722', '#e64a19'] },
    { id: 'Keys', label: 'Keys', icon: 'key', color: '#009688', gradient: ['#009688', '#00796b'] },
    { id: 'Other', label: 'Other', icon: 'box', color: '#757575', gradient: ['#757575', '#616161'] }
  ];

  const [statsCards, setStatsCards] = useState([
    { icon: 'search', label: 'Total Lost', value: 0, color: '#e50914' },
    { icon: 'clock', label: 'Pending', value: 0, color: '#f5c518' },
    { icon: 'check-circle', label: 'Found', value: 0, color: '#2196f3' },
    { icon: 'check', label: 'Returned', value: 0, color: '#2e7d32' },
  ]);

  // Memoize loadItems to avoid recreation on every render
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (searchQuery) params.search = searchQuery;
      
      const response = await lostItemsAPI.getAll(params);
      
      let itemsData = [];
      let pendingItemsData = [];
      let statsData = null;
      
      // Handle different response structures from backend
      if (response.data) {
        if (response.data.data) {
          itemsData = response.data.data;
          pendingItemsData = response.data.pending_items || [];
          statsData = response.data.stats;
        } else if (response.data.lostItems) {
          itemsData = response.data.lostItems;
          statsData = response.data.stats;
        } else if (Array.isArray(response.data)) {
          itemsData = response.data;
        } else if (response.data.items) {
          itemsData = response.data.items;
          statsData = response.data.stats;
        }
      }
      
      // Store pending items for admin view
      setPendingItems(pendingItemsData);
      
      // Apply tab filtering based on status
      let filteredItems = [...itemsData];
      
      if (activeTab === 'active') {
        filteredItems = itemsData.filter(item => 
          item.status === 'approved' || item.status === 'active'
        );
      } else if (activeTab === 'resolved') {
        filteredItems = itemsData.filter(item => 
          item.status === 'found' || item.status === 'returned' || item.status === 'recovered'
        );
      }
      
      setItems(filteredItems);
      setStats(statsData);
      
      // Calculate stats based on backend data or filtered items
      if (statsData) {
        if (isAdmin) {
          setStatsCards([
            { icon: 'search', label: 'Total Lost', value: statsData.total || 0, color: '#e50914' },
            { icon: 'clock', label: 'Pending', value: statsData.pending || 0, color: '#f5c518' },
            { icon: 'check-circle', label: 'Found', value: statsData.found || 0, color: '#2196f3' },
            { icon: 'check', label: 'Returned', value: (statsData.returned || 0) + (statsData.recovered || 0), color: '#2e7d32' },
          ]);
        } else {
          setStatsCards([
            { icon: 'search', label: 'Total Lost', value: statsData.total || 0, color: '#e50914' },
            { icon: 'clock', label: 'Pending', value: 0, color: '#f5c518' },
            { icon: 'check-circle', label: 'Found', value: statsData.found || 0, color: '#2196f3' },
            { icon: 'check', label: 'Returned', value: (statsData.returned || 0) + (statsData.recovered || 0), color: '#2e7d32' },
          ]);
        }
      } else {
        const visibleItems = filteredItems;
        const totalItems = visibleItems.length;
        const pendingCount = isAdmin ? pendingItemsData.length : 0;
        const foundCount = visibleItems.filter(item => item.status === 'found').length;
        const returnedCount = visibleItems.filter(item => 
          item.status === 'returned' || item.status === 'recovered'
        ).length;
        
        setStatsCards([
          { icon: 'search', label: 'Total Lost', value: totalItems, color: '#e50914' },
          { icon: 'clock', label: 'Pending', value: pendingCount, color: '#f5c518' },
          { icon: 'check-circle', label: 'Found', value: foundCount, color: '#2196f3' },
          { icon: 'check', label: 'Returned', value: returnedCount, color: '#2e7d32' },
        ]);
      }
      
    } catch (error) {
      console.error('Error loading lost items:', error);
      Alert.alert('Error', 'Failed to load lost items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedStatus, searchQuery, activeTab, isAdmin]);

  // Debounced search effect
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      loadItems();
    }, 500);
    
    // Cleanup on unmount or dependency change
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedCategory, selectedStatus, activeTab, loadItems]);

  // Initial load when screen mounts
  useEffect(() => {
    loadItems();
  }, []);

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
    if (photo.startsWith('/storage/')) {
      return `${API_BASE_URL}${photo}`;
    }
    return `${API_BASE_URL}/storage/${photo}`;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadItems();
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f5c518',
      approved: '#4caf50',
      active: '#4caf50',
      found: '#2196f3',
      returned: '#9c27b0',
      rejected: '#f44336',
      recovered: '#2e7d32',
    };
    return colors[status?.toLowerCase()] || '#757575';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      approved: 'Active',
      active: 'Active',
      found: 'Found',
      returned: 'Returned',
      rejected: 'Rejected',
      recovered: 'Recovered',
    };
    return labels[status?.toLowerCase()] || status || 'Unknown';
  };

  const renderHeader = () => (
    <LinearGradient
      colors={isDark ? ['#1a1a1a', '#141414'] : ['#ffffff', '#f8fafc']}
      style={styles.header}
    >
      <View style={styles.headerTop}>
        <View>
          <Text style={[styles.welcomeText, { fontSize: isTablet ? 34 : 28 }]}>Lost Items</Text>
          <Text style={[styles.subText, { fontSize: isTablet ? 15 : 14 }]}>Browse items reported as lost</Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
          <LinearGradient colors={['#e50914', '#b20710']} style={styles.profileGradient}>
            <Feather name="user" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchWrapper}>
        <View style={[styles.searchContainer, { 
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          borderColor: isDark ? '#333333' : '#e0e0e0'
        }]}>
          <Feather name="search" size={20} color={isDark ? '#666666' : '#94a3b8'} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#ffffff' : '#0f172a' }]}
            placeholder="Search lost items..."
            placeholderTextColor={isDark ? '#666666' : '#94a3b8'}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            onSubmitEditing={loadItems}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); }}>
              <Feather name="x-circle" size={18} color={isDark ? '#666666' : '#94a3b8'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={styles.statsContainer}>
        {statsCards.map((card, index) => (
          <View key={index} style={[styles.statCard, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderColor: isDark ? '#333333' : '#edeef5' }]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? 'rgba(229,9,20,0.15)' : '#fef3e8' }]}>
              <Feather name={card.icon} size={isTablet ? 24 : 20} color={card.color} />
            </View>
            <Text style={[styles.statValue, { fontSize: isTablet ? 26 : 22, color: isDark ? '#ffffff' : '#0f172a' }]}>{card.value}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#b3b3b3' : '#64748b' }]}>{card.label}</Text>
          </View>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContainer}>
        <TouchableOpacity onPress={() => setSelectedCategory('all')} activeOpacity={0.8}>
          <LinearGradient
            colors={selectedCategory === 'all' ? ['#e50914', '#b20710'] : [isDark ? '#1a1a1a' : '#ffffff', isDark ? '#1a1a1a' : '#ffffff']}
            style={[styles.categoryCard, selectedCategory === 'all' && styles.categoryCardActive]}
          >
            <View style={[styles.categoryIconWrapper, selectedCategory === 'all' && styles.categoryIconWrapperActive]}>
              <Feather name="grid" size={isTablet ? 28 : 24} color={selectedCategory === 'all' ? '#fff' : '#e50914'} />
            </View>
            <Text style={[styles.categoryLabel, selectedCategory === 'all' && styles.categoryLabelActive]}>All</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {categories.map((category) => (
          <TouchableOpacity key={category.id} onPress={() => setSelectedCategory(category.id)} activeOpacity={0.8}>
            <LinearGradient
              colors={selectedCategory === category.id ? category.gradient : [isDark ? '#1a1a1a' : '#ffffff', isDark ? '#1a1a1a' : '#ffffff']}
              style={[styles.categoryCard, selectedCategory === category.id && styles.categoryCardActive]}
            >
              <View style={[styles.categoryIconWrapper, selectedCategory === category.id && styles.categoryIconWrapperActive]}>
                <Feather name={category.icon} size={isTablet ? 28 : 24} color={selectedCategory === category.id ? '#fff' : category.color} />
              </View>
              <Text style={[styles.categoryLabel, selectedCategory === category.id && styles.categoryLabelActive]}>{category.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'all' && styles.tabActive, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderColor: isDark ? '#333333' : '#e0e0e0' }]} onPress={() => setActiveTab('all')}>
          <Feather name="grid" size={16} color={activeTab === 'all' ? '#e50914' : (isDark ? '#b3b3b3' : '#94a3b8')} />
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive, { color: activeTab === 'all' ? '#e50914' : (isDark ? '#b3b3b3' : '#94a3b8') }]}>All Items</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.tab, activeTab === 'active' && styles.tabActive, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderColor: isDark ? '#333333' : '#e0e0e0' }]} onPress={() => setActiveTab('active')}>
          <Feather name="check-circle" size={16} color={activeTab === 'active' ? '#e50914' : (isDark ? '#b3b3b3' : '#94a3b8')} />
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive, { color: activeTab === 'active' ? '#e50914' : (isDark ? '#b3b3b3' : '#94a3b8') }]}>Active</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.tab, activeTab === 'resolved' && styles.tabActive, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderColor: isDark ? '#333333' : '#e0e0e0' }]} onPress={() => setActiveTab('resolved')}>
          <Feather name="check" size={16} color={activeTab === 'resolved' ? '#e50914' : (isDark ? '#b3b3b3' : '#94a3b8')} />
          <Text style={[styles.tabText, activeTab === 'resolved' && styles.tabTextActive, { color: activeTab === 'resolved' ? '#e50914' : (isDark ? '#b3b3b3' : '#94a3b8') }]}>Resolved</Text>
        </TouchableOpacity>

        <View style={styles.viewModeButtons}>
          <TouchableOpacity style={[styles.viewModeBtn, viewMode === 'grid' && styles.viewModeBtnActive, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderColor: isDark ? '#333333' : '#e0e0e0' }]} onPress={() => setViewMode('grid')}>
            <Feather name="grid" size={16} color={viewMode === 'grid' ? '#e50914' : (isDark ? '#b3b3b3' : '#94a3b8')} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeBtnActive, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderColor: isDark ? '#333333' : '#e0e0e0' }]} onPress={() => setViewMode('list')}>
            <Feather name="list" size={16} color={viewMode === 'list' ? '#e50914' : (isDark ? '#b3b3b3' : '#94a3b8')} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Show pending items for admin */}
      {isAdmin && pendingItems.length > 0 && activeTab === 'all' && (
        <View style={styles.pendingSection}>
          <Text style={[styles.pendingTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
            Pending Review ({pendingItems.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pendingScroll}>
            {pendingItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.pendingCard, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderColor: isDark ? '#333333' : '#e0e0e0' }]}
                onPress={() => navigation.navigate('ItemDetail', { type: 'lost', id: item.id })}
              >
                <View style={styles.pendingImageContainer}>
                  {item.photo ? (
                    <Image source={{ uri: getImageUrl(item.photo) }} style={styles.pendingImage} />
                  ) : (
                    <LinearGradient
                      colors={categories.find(c => c.id === item.category)?.gradient || ['#e50914', '#b20710']}
                      style={styles.pendingPlaceholder}
                    >
                      <Feather name={categories.find(c => c.id === item.category)?.icon || 'box'} size={24} color="#fff" />
                    </LinearGradient>
                  )}
                </View>
                <View style={styles.pendingContent}>
                  <Text style={[styles.pendingItemName, { color: isDark ? '#ffffff' : '#0f172a' }]} numberOfLines={1}>{item.item_name}</Text>
                  <Text style={[styles.pendingUser, { color: isDark ? '#b3b3b3' : '#64748b' }]}>
                    By: {item.user?.name || 'Unknown'}
                  </Text>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </LinearGradient>
  );

  const renderGridItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.gridItem, { width: isDesktop ? '31%' : isTablet ? '48%' : '47%' }]}
      onPress={() => navigation.navigate('ItemDetail', { type: 'lost', id: item.id })}
      activeOpacity={0.9}
    >
      <View style={[styles.gridCard, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderColor: isDark ? '#333333' : '#e0e0e0' }]}>
        <View style={styles.gridImageContainer}>
          {item.photo ? (
            <Image source={{ uri: getImageUrl(item.photo) }} style={styles.gridImage} />
          ) : (
            <LinearGradient
              colors={categories.find(c => c.id === item.category)?.gradient || ['#e50914', '#b20710']}
              style={styles.gridPlaceholder}
            >
              <Feather name={categories.find(c => c.id === item.category)?.icon || 'box'} size={32} color="#fff" />
            </LinearGradient>
          )}
          
          {/* FIXED: Show status badge for ALL items including approved/active */}
          {item.status && (
            <View style={[styles.gridStatusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.gridStatusText}>{getStatusLabel(item.status)}</Text>
            </View>
          )}
        </View>
        <View style={styles.gridContent}>
          <Text style={[styles.gridTitle, { color: isDark ? '#ffffff' : '#0f172a' }]} numberOfLines={1}>{item.item_name}</Text>
          <Text style={[styles.gridCategory, { color: isDark ? '#b3b3b3' : '#64748b' }]}>{item.category}</Text>
          <View style={styles.gridFooter}>
            <View style={styles.gridLocation}>
              <Feather name="map-pin" size={10} color={isDark ? '#666666' : '#94a3b8'} />
              <Text style={[styles.gridLocationText, { color: isDark ? '#b3b3b3' : '#94a3b8' }]} numberOfLines={1}>{item.lost_location || 'Unknown'}</Text>
            </View>
            <Text style={[styles.gridDate, { color: isDark ? '#b3b3b3' : '#94a3b8' }]}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderListItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.listItem, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderColor: isDark ? '#333333' : '#e0e0e0' }]}
      onPress={() => navigation.navigate('ItemDetail', { type: 'lost', id: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.listImageContainer}>
        {item.photo ? (
          <Image source={{ uri: getImageUrl(item.photo) }} style={styles.listImage} />
        ) : (
          <LinearGradient
            colors={categories.find(c => c.id === item.category)?.gradient || ['#e50914', '#b20710']}
            style={styles.listPlaceholder}
          >
            <Feather name={categories.find(c => c.id === item.category)?.icon || 'box'} size={24} color="#fff" />
          </LinearGradient>
        )}
      </View>
      <View style={styles.listContent}>
        <Text style={[styles.listTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>{item.item_name}</Text>
        <Text style={[styles.listCategory, { color: isDark ? '#b3b3b3' : '#64748b' }]}>{item.category}</Text>
        <View style={styles.listMeta}>
          <View style={styles.listLocation}>
            <Feather name="map-pin" size={10} color={isDark ? '#666666' : '#94a3b8'} />
            <Text style={[styles.listLocationText, { color: isDark ? '#b3b3b3' : '#94a3b8' }]} numberOfLines={1}>{item.lost_location || 'Unknown'}</Text>
          </View>
          <Text style={[styles.listDate, { color: isDark ? '#b3b3b3' : '#94a3b8' }]}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}</Text>
        </View>
      </View>
      <View style={[styles.listStatusBadge, { backgroundColor: getStatusColor(item.status) }]}>
        <Text style={styles.listStatusText}>{getStatusLabel(item.status)}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={isDark ? '#666666' : '#cbd5e1'} />
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? '#141414' : '#f8fafc' }]}>
        <LinearGradient colors={['#e50914', '#b20710']} style={styles.loaderGradient}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading lost items...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#141414' : '#f8fafc' }]} edges={['top']}>
        <Animated.FlatList
          data={items}
          key={viewMode === 'grid' ? `grid-${gridColumns}` : 'list'}
          numColumns={viewMode === 'grid' ? gridColumns : 1}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e50914" colors={['#e50914']} />
          }
          contentContainerStyle={[
            styles.listContainer,
            viewMode === 'grid' && styles.gridContainer
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <LinearGradient colors={[isDark ? '#1a1a1a' : '#ffffff', isDark ? '#1a1a1a' : '#ffffff']} style={styles.emptyGradient}>
                <Feather name="search" size={64} color={isDark ? '#333333' : '#cbd5e1'} />
                <Text style={[styles.emptyTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>No lost items found</Text>
                <Text style={[styles.emptySubtitle, { color: isDark ? '#b3b3b3' : '#64748b' }]}>
                  {searchQuery ? 'Try a different search term' : 'Be the first to report a lost item'}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('CreateItem', { type: 'lost' })}>
                  <LinearGradient colors={['#e50914', '#b20710']} style={styles.emptyButton}>
                    <Feather name="plus-circle" size={18} color="#fff" />
                    <Text style={styles.emptyButtonText}>Report Lost Item</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          }
        />

        <Animated.View style={[styles.floatingButton, { transform: [{ scale: floatingButtonAnim }] }]}>
          <TouchableOpacity onPress={() => navigation.navigate('CreateItem', { type: 'lost' })} activeOpacity={0.9}>
            <LinearGradient colors={['#e50914', '#b20710']} style={styles.floatingButtonGradient}>
              <Feather name="plus" size={isTablet ? 28 : 24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </>
  );
}

const getStyles = (isDark) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderGradient: { padding: 30, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#e50914', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  loadingText: { marginTop: 12, color: '#fff', fontSize: 14, fontWeight: '600' },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingHorizontal: 16, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  welcomeText: { fontWeight: '800', letterSpacing: -0.5, color: isDark ? '#ffffff' : '#0f172a' },
  subText: { marginTop: 4, color: isDark ? '#b3b3b3' : '#64748b' },
  profileButton: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', shadowColor: '#e50914', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  profileGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchWrapper: { marginBottom: 20 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  statsScroll: { marginBottom: 20 },
  statsContainer: { gap: 12, paddingRight: 16 },
  statCard: { width: 90, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  statIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, fontWeight: '600' },
  categoryScroll: { marginBottom: 16 },
  categoryContainer: { gap: 12, paddingRight: 16 },
  categoryCard: { width: 80, alignItems: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: isDark ? '#333333' : '#e0e0e0' },
  categoryCardActive: { borderColor: '#e50914' },
  categoryIconWrapper: { width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  categoryIconWrapperActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  categoryLabel: { fontSize: 11, fontWeight: '600', color: isDark ? '#b3b3b3' : '#64748b' },
  categoryLabelActive: { color: '#fff' },
  tabsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, gap: 6, borderWidth: 1 },
  tabActive: { borderColor: '#e50914' },
  tabText: { fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#e50914' },
  viewModeButtons: { flexDirection: 'row', marginLeft: 'auto', gap: 8 },
  viewModeBtn: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  viewModeBtnActive: { borderColor: '#e50914' },
  pendingSection: { marginTop: 16, marginBottom: 8 },
  pendingTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  pendingScroll: { flexDirection: 'row' },
  pendingCard: { width: 200, marginRight: 12, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  pendingImageContainer: { height: 120, width: '100%' },
  pendingImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  pendingPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  pendingContent: { padding: 10 },
  pendingItemName: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  pendingUser: { fontSize: 11, marginBottom: 6 },
  pendingBadge: { backgroundColor: '#f5c518', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start' },
  pendingBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  listContainer: { paddingBottom: 100 },
  gridContainer: { paddingHorizontal: 12, gap: 12 },
  gridItem: { margin: 6 },
  gridCard: { borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  gridImageContainer: { height: 140, position: 'relative' },
  gridImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  gridPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  gridStatusBadge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  gridStatusText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  gridContent: { padding: 12 },
  gridTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  gridCategory: { fontSize: 11, marginBottom: 8 },
  gridFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gridLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  gridLocationText: { fontSize: 10, flex: 1 },
  gridDate: { fontSize: 10 },
  listItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  listImageContainer: { width: 60, height: 60, borderRadius: 10, overflow: 'hidden', marginRight: 12 },
  listImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  listPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  listContent: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  listCategory: { fontSize: 11, marginBottom: 4 },
  listMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  listLocationText: { fontSize: 10, flex: 1 },
  listDate: { fontSize: 10 },
  listStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
  listStatusText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  empty: { paddingTop: 60, paddingHorizontal: 20 },
  emptyGradient: { alignItems: 'center', padding: 40, borderRadius: 20 },
  emptyTitle: { marginTop: 20, fontSize: 18, fontWeight: '700' },
  emptySubtitle: { marginTop: 8, fontSize: 13, textAlign: 'center' },
  emptyButton: { marginTop: 24, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, gap: 8 },
  emptyButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  floatingButton: { position: 'absolute', bottom: 20, right: 20, zIndex: 100 },
  floatingButtonGradient: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#e50914', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
});
