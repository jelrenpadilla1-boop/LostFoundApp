// src/screens/matches/MatchesScreen.js
import Icon from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { matchesAPI } from '../../api/matches';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

// Match Card Component
const MatchCard = ({ item, user, onPress, index }) => {
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
  }, []);
  
  const getScoreColor = (score) => {
    const numScore = parseFloat(score);
    if (numScore >= 80) return '#10b981';
    if (numScore >= 60) return '#f59e0b';
    return '#ef4444';
  };
  
  const getScoreGradient = (score) => {
    const numScore = parseFloat(score);
    if (numScore >= 80) return ['#10b981', '#34d399'];
    if (numScore >= 60) return ['#f59e0b', '#fbbf24'];
    return ['#ef4444', '#f87171'];
  };
  
  const getStatusBgColor = (status) => {
    switch (status) {
      case 'confirmed':
        return '#d1fae5';
      case 'rejected':
        return '#fee2e2';
      default:
        return '#fef3c7';
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#f59e0b';
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
        style={styles.matchCard}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#fff', '#fefefe']}
          style={styles.matchGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.matchHeader}>
            <LinearGradient
              colors={getScoreGradient(item.match_score)}
              style={styles.matchScore}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.matchScoreText}>{parseFloat(item.match_score).toFixed(1)}% Match</Text>
            </LinearGradient>
            <View style={[styles.matchStatus, { backgroundColor: getStatusBgColor(item.status) }]}>
              <Text style={[styles.matchStatusText, { color: getStatusColor(item.status) }]}>
                {item.status?.toUpperCase() || 'PENDING'}
              </Text>
            </View>
          </View>
          
          <View style={styles.matchItems}>
            <View style={styles.matchItem}>
              <View style={styles.matchItemHeader}>
                <Icon name="search" size={14} color="#6366f1" />
                <Text style={styles.matchItemLabel}>Lost Item</Text>
              </View>
              <Text style={styles.matchItemName} numberOfLines={2}>
                {lostItem?.item_name || 'Unknown Item'}
              </Text>
              {isUserLost && (
                <View style={styles.yourBadgeContainer}>
                  <Text style={styles.yourBadge}>Your item</Text>
                </View>
              )}
              {lostItem?.lost_location && (
                <View style={styles.matchItemLocation}>
                  <Icon name="location-outline" size={10} color="#94a3b8" />
                  <Text style={styles.matchItemLocationText} numberOfLines={1}>
                    {lostItem.lost_location}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.matchArrow}>
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                style={styles.arrowCircle}
              >
                <Icon name="arrow-forward" size={16} color="#fff" />
              </LinearGradient>
            </View>
            
            <View style={styles.matchItem}>
              <View style={styles.matchItemHeader}>
                <Icon name="checkmark-circle" size={14} color="#10b981" />
                <Text style={styles.matchItemLabel}>Found Item</Text>
              </View>
              <Text style={styles.matchItemName} numberOfLines={2}>
                {foundItem?.item_name || 'Unknown Item'}
              </Text>
              {isUserFound && (
                <View style={styles.yourBadgeContainer}>
                  <Text style={styles.yourBadge}>Your item</Text>
                </View>
              )}
              {foundItem?.found_location && (
                <View style={styles.matchItemLocation}>
                  <Icon name="location-outline" size={10} color="#94a3b8" />
                  <Text style={styles.matchItemLocationText} numberOfLines={1}>
                    {foundItem.found_location}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.matchFooter}>
            <View style={styles.matchDateContainer}>
              <Icon name="calendar-outline" size={12} color="#94a3b8" />
              <Text style={styles.matchDate}>
                {item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown date'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function MatchesScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const { user, isAdmin } = useAuth();
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const floatingButtonAnim = useRef(new Animated.Value(0)).current;

  const statsCards = [
    { icon: 'git-compare', label: 'Total Matches', value: 0, color: '#6366f1', bg: '#eef2ff' },
    { icon: 'time', label: 'Pending', value: 0, color: '#f59e0b', bg: '#fffbeb' },
    { icon: 'checkmark-circle', label: 'Confirmed', value: 0, color: '#10b981', bg: '#f0fdf4' },
    { icon: 'trophy', label: 'Recovered', value: 0, color: '#ec489a', bg: '#fdf2f8' },
  ];

  const filterOptions = [
    { key: 'all', label: 'All', icon: 'apps-outline' },
    { key: 'pending', label: 'Pending', icon: 'time-outline' },
    { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline' },
    { key: 'rejected', label: 'Rejected', icon: 'close-circle-outline' },
  ];

  useFocusEffect(
    useCallback(() => {
      loadMatches();
      loadStats();
    }, [activeFilter])
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
      
      // Only add status filter if not 'all'
      if (activeFilter !== 'all') {
        params.status = activeFilter;
      }
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      console.log('Loading matches with params:', params);
      const response = await matchesAPI.getMyMatches(params);
      console.log('Matches response received:', response.status);
      
      // Extract matches data from response
      let matchesData = [];
      if (response.data && response.data.data) {
        matchesData = response.data.data;
        console.log('Matches found:', matchesData.length);
      } else if (response.data && response.data.matches) {
        matchesData = response.data.matches;
        console.log('Matches found (matches key):', matchesData.length);
      } else if (Array.isArray(response.data)) {
        matchesData = response.data;
        console.log('Matches found (array):', matchesData.length);
      } else if (response.data && response.data.items) {
        matchesData = response.data.items;
        console.log('Matches found (items key):', matchesData.length);
      } else {
        console.log('No matches data found in response structure');
      }
      
      // Log each match for debugging
      if (matchesData.length > 0) {
        matchesData.forEach((match, idx) => {
          console.log(`Match ${idx + 1}: ID=${match.id}, Status=${match.status}, Score=${match.match_score}`);
          console.log(`  Lost: ${match.lost_item?.item_name} (ID: ${match.lost_item?.id})`);
          console.log(`  Found: ${match.found_item?.item_name} (ID: ${match.found_item?.id})`);
        });
      } else {
        console.log('No matches to display');
      }
      
      setMatches(matchesData);
      
    } catch (error) {
      console.error('Error loading matches:', error);
      console.error('Error details:', error.response?.data);
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
      console.log('Loading match stats...');
      const response = await matchesAPI.getMatchStats();
      console.log('Stats response received:', response.status);
      
      let statsData = {};
      if (response.data && response.data.stats) {
        statsData = response.data.stats;
        console.log('Stats data:', statsData);
      } else if (response.data && response.data.data) {
        statsData = response.data.data;
      } else {
        statsData = response.data || {};
      }
      
      setStats(statsData);
      
      // Update stats cards
      statsCards[0].value = statsData.total || 0;
      statsCards[1].value = statsData.pending || 0;
      statsCards[2].value = statsData.confirmed || 0;
      statsCards[3].value = statsData.recovered || 0;
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMatches();
    loadStats();
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    const timeoutId = setTimeout(() => loadMatches(), 500);
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

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {filterOptions.map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[styles.tab, activeFilter === filter.key && styles.tabActive]}
          onPress={() => setActiveFilter(filter.key)}
        >
          <Icon 
            name={filter.icon} 
            size={20} 
            color={activeFilter === filter.key ? '#6366f1' : '#94a3b8'} 
          />
          <Text style={[styles.tabText, activeFilter === filter.key && styles.tabTextActive]}>
            {filter.label}
          </Text>
          {activeFilter === filter.key && filter.key !== 'all' && (
            <View style={styles.filterActiveIndicator} />
          )}
        </TouchableOpacity>
      ))}
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
          placeholder="Search matches..."
          placeholderTextColor="#94a3b8"
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
            <Icon name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );

  const renderHeader = () => (
    <Animated.View style={[styles.header, { backgroundColor: headerBackgroundColor }]}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.welcomeText}>Matches</Text>
          <Text style={styles.subText}>Find your lost items</Text>
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
          <Text style={styles.loadingText}>Finding matches...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={matches}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={({ item, index }) => (
          <MatchCard
            item={item}
            user={user}
            index={index}
            onPress={() => navigation.navigate('MatchDetail', { id: item.id })}
          />
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
          matches.length === 0 && styles.emptyListContainer
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
              <Icon name="git-compare-outline" size={80} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No matches found' : 'No matches yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery 
                  ? 'Try a different search or clear filters'
                  : activeFilter !== 'all'
                  ? `No ${activeFilter} matches available at the moment`
                  : 'Matches will appear here when your items match with others'}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Lost')}>
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.emptyButton}
                >
                  <Icon name="search-outline" size={20} color="#fff" />
                  <Text style={styles.emptyButtonText}>Browse Items</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        }
      />
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
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 25,
    gap: 6,
    backgroundColor: '#f1f5f9',
    position: 'relative',
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
  filterActiveIndicator: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 3,
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  listContainer: {
    paddingBottom: 100,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  matchCardWrapper: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  matchCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  matchGradient: {
    padding: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#edeef5',
    borderRadius: 20,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  matchScore: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 24,
  },
  matchScoreText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  matchStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  matchStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  matchItems: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  matchItem: {
    flex: 1,
    backgroundColor: '#faf9fe',
    padding: 12,
    borderRadius: 16,
  },
  matchItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  matchItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5b5b7a',
    textTransform: 'uppercase',
  },
  matchItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e1b2f',
    marginBottom: 6,
  },
  yourBadgeContainer: {
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  yourBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  matchItemLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  matchItemLocationText: {
    fontSize: 10,
    color: '#94a3b8',
    flex: 1,
  },
  matchArrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#edeef5',
  },
  matchDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchDate: {
    fontSize: 11,
    color: '#5b5b7a',
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
});