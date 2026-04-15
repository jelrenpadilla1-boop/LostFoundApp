// src/screens/matches/MatchesScreen.js
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { matchesAPI } from '../../api/matches';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function MatchesScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    rejected: 0,
    recovered: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const { user, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const floatingButtonAnim = useRef(new Animated.Value(0)).current;

  // ✅ Define styles FIRST
  const styles = getStyles(isDark);

  const filterOptions = [
    { key: 'all', label: 'All', icon: 'grid' },
    { key: 'pending', label: 'Pending', icon: 'clock' },
    { key: 'confirmed', label: 'Confirmed', icon: 'check-circle' },
    { key: 'rejected', label: 'Rejected', icon: 'x-circle' },
  ];

  useFocusEffect(
    useCallback(() => {
      loadMatches();
      loadStats();
    }, [activeFilter, searchQuery])
  );

  useEffect(() => {
    Animated.spring(floatingButtonAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (activeFilter !== 'all') {
        params.status = activeFilter;
      }
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      console.log('📤 Loading matches with params:', params);
      const response = await matchesAPI.getMyMatches(params);
      console.log('📥 Matches response status:', response.status);
      console.log('📊 Full response:', JSON.stringify(response.data, null, 2));
      
      let matchesData = [];
      if (response.data && response.data.data) {
        matchesData = response.data.data;
      } else if (response.data && response.data.matches) {
        matchesData = response.data.matches;
      } else if (Array.isArray(response.data)) {
        matchesData = response.data;
      } else if (response.data && response.data.items) {
        matchesData = response.data.items;
      }
      
      console.log('✅ Parsed matches count:', matchesData.length);
      setMatches(matchesData);
      
    } catch (error) {
      console.error('❌ Error loading matches:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
      } else {
        Alert.alert('Error', 'Failed to load matches. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      console.log('📤 Loading match stats...');
      const response = await matchesAPI.getMatchStats();
      console.log('📥 Stats response:', JSON.stringify(response.data, null, 2));
      
      let statsData = {};
      if (response.data && response.data.stats) {
        statsData = response.data.stats;
      } else if (response.data && response.data.data) {
        statsData = response.data.data;
      } else {
        statsData = response.data || {};
      }
      
      console.log('✅ Parsed stats:', statsData);
      
      setStats({
        total: statsData.total || 0,
        pending: statsData.pending || 0,
        confirmed: statsData.confirmed || 0,
        rejected: statsData.rejected || 0,
        recovered: statsData.recovered || 0
      });
      
    } catch (error) {
      console.error('❌ Error loading stats:', error);
      // Keep default stats (all zeros)
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMatches();
    loadStats();
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    // Debounced search
    const timeoutId = setTimeout(() => {
      loadMatches();
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  // Stats cards with dynamic values
  const statsCards = [
    { icon: 'git-branch', label: 'Total', value: stats.total, color: '#e50914' },
    { icon: 'clock', label: 'Pending', value: stats.pending, color: '#f5c518' },
    { icon: 'check-circle', label: 'Confirmed', value: stats.confirmed, color: '#2e7d32' },
    { icon: 'award', label: 'Recovered', value: stats.recovered, color: '#9c27b0' },
  ];

  // ✅ MatchCard component
  const MatchCard = ({ item, user, onPress, index, isDark }) => {
    const lostItem = item.lost_item;
    const foundItem = item.found_item;
    const isUserLost = lostItem?.user_id === user?.id;
    const isUserFound = foundItem?.user_id === user?.id;
    
    const cardAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, [index]);
    
    const getScoreGradient = (score) => {
      const numScore = parseFloat(score);
      if (numScore >= 80) return ['#2e7d32', '#4caf50'];
      if (numScore >= 60) return ['#f5c518', '#ffd700'];
      return ['#e50914', '#b20710'];
    };
    
    const getStatusBgColor = (status) => {
      switch (status) {
        case 'confirmed':
          return isDark ? 'rgba(46,125,50,0.2)' : '#d1fae5';
        case 'rejected':
          return isDark ? 'rgba(229,9,20,0.2)' : '#fee2e2';
        default:
          return isDark ? 'rgba(245,197,24,0.2)' : '#fef3c7';
      }
    };
    
    const getStatusColor = (status) => {
      switch (status) {
        case 'confirmed':
          return '#2e7d32';
        case 'rejected':
          return '#e50914';
        default:
          return '#f5c518';
      }
    };
    
    return (
      <Animated.View
        style={[
          styles.matchCardWrapper,
          {
            opacity: cardAnim,
            transform: [{
              translateY: cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.matchCard, { 
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            borderColor: isDark ? '#333333' : '#edeef5'
          }]}
          onPress={onPress}
          activeOpacity={0.9}
        >
          <View style={styles.matchHeader}>
            <LinearGradient
              colors={getScoreGradient(item.match_score)}
              style={styles.matchScore}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.matchScoreText}>{parseFloat(item.match_score).toFixed(1)}%</Text>
            </LinearGradient>
            <View style={[styles.matchStatus, { backgroundColor: getStatusBgColor(item.status) }]}>
              <Text style={[styles.matchStatusText, { color: getStatusColor(item.status) }]}>
                {item.status?.toUpperCase() || 'PENDING'}
              </Text>
            </View>
          </View>
          
          <View style={styles.matchItems}>
            <View style={[styles.matchItem, { backgroundColor: isDark ? '#2a2a2a' : '#faf9fe' }]}>
              <View style={styles.matchItemHeader}>
                <Feather name="search" size={12} color="#e50914" />
                <Text style={[styles.matchItemLabel, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>Lost</Text>
              </View>
              <Text style={[styles.matchItemName, { color: isDark ? '#ffffff' : '#1e1b2f' }]} numberOfLines={2}>
                {lostItem?.item_name || 'Unknown Item'}
              </Text>
              {isUserLost && (
                <View style={styles.yourBadgeContainer}>
                  <Text style={[styles.yourBadge, { backgroundColor: isDark ? 'rgba(229,9,20,0.2)' : '#fef3e8' }]}>Your item</Text>
                </View>
              )}
              {lostItem?.lost_location && (
                <View style={styles.matchItemLocation}>
                  <Feather name="map-pin" size={10} color={isDark ? '#666666' : '#94a3b8'} />
                  <Text style={[styles.matchItemLocationText, { color: isDark ? '#b3b3b3' : '#94a3b8' }]} numberOfLines={1}>
                    {lostItem.lost_location}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.matchArrow}>
              <LinearGradient
                colors={['#e50914', '#b20710']}
                style={styles.arrowCircle}
              >
                <Feather name="arrow-right" size={16} color="#fff" />
              </LinearGradient>
            </View>
            
            <View style={[styles.matchItem, { backgroundColor: isDark ? '#2a2a2a' : '#faf9fe' }]}>
              <View style={styles.matchItemHeader}>
                <Feather name="check-circle" size={12} color="#2e7d32" />
                <Text style={[styles.matchItemLabel, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>Found</Text>
              </View>
              <Text style={[styles.matchItemName, { color: isDark ? '#ffffff' : '#1e1b2f' }]} numberOfLines={2}>
                {foundItem?.item_name || 'Unknown Item'}
              </Text>
              {isUserFound && (
                <View style={styles.yourBadgeContainer}>
                  <Text style={[styles.yourBadge, { backgroundColor: isDark ? 'rgba(229,9,20,0.2)' : '#fef3e8' }]}>Your item</Text>
                </View>
              )}
              {foundItem?.found_location && (
                <View style={styles.matchItemLocation}>
                  <Feather name="map-pin" size={10} color={isDark ? '#666666' : '#94a3b8'} />
                  <Text style={[styles.matchItemLocationText, { color: isDark ? '#b3b3b3' : '#94a3b8' }]} numberOfLines={1}>
                    {foundItem.found_location}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={[styles.matchFooter, { borderTopColor: isDark ? '#333333' : '#edeef5' }]}>
            <View style={styles.matchDateContainer}>
              <Feather name="calendar" size={12} color={isDark ? '#666666' : '#94a3b8'} />
              <Text style={[styles.matchDate, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>
                {item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown date'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderStatsCard = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.statsScroll}
      contentContainerStyle={styles.statsContainer}
    >
      {statsCards.map((card, index) => (
        <View key={index} style={[styles.statCard, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderColor: isDark ? '#333333' : '#edeef5' }]}>
          <View style={[styles.statIcon, { backgroundColor: isDark ? 'rgba(229,9,20,0.15)' : '#fef3e8' }]}>
            <Feather name={card.icon} size={22} color={card.color} />
          </View>
          <Text style={[styles.statValue, { color: isDark ? '#ffffff' : '#0f172a' }]}>{card.value}</Text>
          <Text style={[styles.statLabel, { color: isDark ? '#b3b3b3' : '#64748b' }]}>{card.label}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {filterOptions.map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[styles.tab, activeFilter === filter.key && styles.tabActive, { 
            backgroundColor: isDark ? '#2a2a2a' : '#f1f5f9',
            borderColor: isDark ? '#333333' : '#e0e0e0'
          }]}
          onPress={() => setActiveFilter(filter.key)}
        >
          <Feather 
            name={filter.icon} 
            size={16} 
            color={activeFilter === filter.key ? '#e50914' : (isDark ? '#b3b3b3' : '#94a3b8')} 
          />
          <Text style={[styles.tabText, activeFilter === filter.key && styles.tabTextActive, { color: activeFilter === filter.key ? '#e50914' : (isDark ? '#b3b3b3' : '#94a3b8') }]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchWrapper}>
      <View style={[styles.searchContainer, { 
        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
        borderColor: isDark ? '#333333' : '#e0e0e0'
      }]}>
        <Feather name="search" size={20} color={isDark ? '#666666' : '#94a3b8'} />
        <TextInput
          style={[styles.searchInput, { color: isDark ? '#ffffff' : '#0f172a' }]}
          placeholder="Search matches..."
          placeholderTextColor={isDark ? '#666666' : '#94a3b8'}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
          onSubmitEditing={loadMatches}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => {
            setSearchQuery('');
            loadMatches();
          }}>
            <Feather name="x-circle" size={18} color={isDark ? '#666666' : '#94a3b8'} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderHeader = () => (
    <LinearGradient
      colors={isDark ? ['#1a1a1a', '#141414'] : ['#ffffff', '#f8fafc']}
      style={styles.header}
    >
      <View style={styles.headerTop}>
        <View>
          <Text style={[styles.welcomeText, { color: isDark ? '#ffffff' : '#0f172a' }]}>Matches</Text>
          <Text style={[styles.subText, { color: isDark ? '#b3b3b3' : '#64748b' }]}>Find your lost items</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <LinearGradient
            colors={['#e50914', '#b20710']}
            style={styles.profileGradient}
          >
            <Feather name="user" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      {renderSearchBar()}
      {renderStatsCard()}
      {renderTabs()}
    </LinearGradient>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? '#141414' : '#f8fafc' }]}>
        <LinearGradient
          colors={['#e50914', '#b20710']}
          style={styles.loaderGradient}
        >
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Finding matches...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={[styles.container, { backgroundColor: isDark ? '#141414' : '#f8fafc' }]}>
        <Animated.FlatList
          data={matches}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={({ item, index }) => (
            <MatchCard
              item={item}
              user={user}
              index={index}
              isDark={isDark}
              onPress={() => navigation.navigate('MatchDetail', { id: item.id })}
            />
          )}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#e50914']}
              tintColor="#e50914"
            />
          }
          contentContainerStyle={[
            styles.listContainer,
            matches.length === 0 && styles.emptyListContainer
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <LinearGradient
                colors={isDark ? ['#1a1a1a', '#1a1a1a'] : ['#fef9e3', '#fff']}
                style={styles.emptyGradient}
              >
                <Feather name="git-branch" size={64} color={isDark ? '#333333' : '#cbd5e1'} />
                <Text style={[styles.emptyTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                  {searchQuery ? 'No matches found' : 'No matches yet'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: isDark ? '#b3b3b3' : '#64748b' }]}>
                  {searchQuery 
                    ? 'Try a different search or clear filters'
                    : activeFilter !== 'all'
                    ? `No ${activeFilter} matches available`
                    : 'Matches will appear here when your items match with others'}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('LostItems')}>
                  <LinearGradient
                    colors={['#e50914', '#b20710']}
                    style={styles.emptyButton}
                  >
                    <Feather name="search" size={18} color="#fff" />
                    <Text style={styles.emptyButtonText}>Browse Items</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          }
        />
      </View>
    </>
  );
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderGradient: {
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e50914',
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
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subText: {
    fontSize: 14,
    marginTop: 4,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#e50914',
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
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  statsScroll: {
    marginBottom: 24,
  },
  statsContainer: {
    gap: 12,
    paddingRight: 16,
  },
  statCard: {
    width: 90,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  tabActive: {
    borderColor: '#e50914',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#e50914',
  },
  listContainer: {
    paddingBottom: 100,
  },
  emptyListContainer: {
    flex: 1,
  },
  matchCardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
  },
  matchCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  matchScore: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  matchScoreText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  matchStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  matchStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  matchItems: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 16,
    gap: 12,
  },
  matchItem: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
  },
  matchItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  matchItemLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  matchItemName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  yourBadgeContainer: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  yourBadge: {
    fontSize: 8,
    fontWeight: '700',
    color: '#e50914',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  matchItemLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  matchItemLocationText: {
    fontSize: 9,
    flex: 1,
  },
  matchArrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  matchDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchDate: {
    fontSize: 10,
  },
  empty: {
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  emptyGradient: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
  },
  emptyTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});