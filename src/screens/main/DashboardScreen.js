// src/screens/main/DashboardScreen.js
import Icon from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Appearance,
  Dimensions,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import api from '../../api/client';
import { matchesAPI } from '../../api/matches';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { user, isAdmin, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentLost, setRecentLost] = useState([]);
  const [recentFound, setRecentFound] = useState([]);
  const [pendingMatches, setPendingMatches] = useState([]);
  const [highMatches, setHighMatches] = useState([]);
  const [pendingLost, setPendingLost] = useState([]);
  const [pendingFound, setPendingFound] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const pollRef = useRef(null);

  useEffect(() => {
    loadThemePreference();
    startPolling();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('foundify-theme');
      if (savedTheme === 'dark') {
        setIsDarkMode(true);
      } else {
        const colorScheme = Appearance?.getColorScheme?.() || 'light';
        setIsDarkMode(colorScheme === 'dark');
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        await api.get('/notifications');
      } catch (err) {
        // Silently swallow
      }
    }, 15000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      const statsRes = await api.get('/dashboard/stats');
      const statsData = statsRes.data;
      
      const recentRes = await api.get('/dashboard/recent-items');
      const recentData = recentRes.data;
      
      const matchStatsRes = await matchesAPI.getMatchStats();
      const matchStatsData = matchStatsRes.data?.stats || matchStatsRes.data || {};
      
      if (isAdmin) {
        try {
          const pendingLostRes = await api.get('/lost-items', { params: { status: 'pending', per_page: 10 } });
          setPendingLost(pendingLostRes.data?.data || []);
          
          const pendingFoundRes = await api.get('/found-items', { params: { status: 'pending', per_page: 10 } });
          setPendingFound(pendingFoundRes.data?.data || []);
          
          const pendingMatchesRes = await api.get('/matches', { params: { status: 'pending', per_page: 10 } });
          setPendingMatches(pendingMatchesRes.data?.data || []);
        } catch (error) {
          console.error('Error fetching admin data:', error);
        }
      } else {
        try {
          const myMatchesRes = await matchesAPI.getMyMatches({ per_page: 10 });
          const matches = myMatchesRes.data?.data || [];
          const highMatchesData = matches.filter(m => parseFloat(m.match_score) >= 60);
          setHighMatches(highMatchesData);
        } catch (error) {
          console.error('Error fetching matches:', error);
        }
      }
      
      const lost = Array.isArray(recentData) ? recentData.filter((i) => i.type === 'lost') : [];
      const found = Array.isArray(recentData) ? recentData.filter((i) => i.type === 'found') : [];
      
      setRecentLost(lost);
      setRecentFound(found);
      
      setStats({
        total_users: statsData.total_users ?? 0,
        total_matches: statsData.total_matches ?? matchStatsData.total ?? 0,
        confirmed_matches: statsData.confirmed_matches ?? matchStatsData.confirmed ?? 0,
        pending_matches: statsData.pending_matches ?? matchStatsData.pending ?? 0,
        my_lost_items: statsData.my_lost_items ?? 0,
        my_found_items: statsData.my_found_items ?? 0,
        my_matches: statsData.my_matches ?? matchStatsData.total ?? 0,
        my_lost_recovered: statsData.my_lost_recovered ?? 0,
        my_found_claimed: statsData.my_found_claimed ?? 0,
      });
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const headerBackgroundColor = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)'],
    extrapolate: 'clamp',
  });

  const totalRecovered = (stats?.my_lost_recovered || 0) + (stats?.my_found_claimed || 0);
  const styles = getStyles(isDarkMode);

  if (loading) {
    return <LoadingSpinner />;
  }

  // Admin Dashboard View
  if (isAdmin) {
    return (
      <View style={styles.container}>
        <Animated.ScrollView
          style={styles.scrollView}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} tintColor="#7c3aed" />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Animated Header - White Background */}
          <Animated.View style={[styles.header, { backgroundColor: headerBackgroundColor }]}>
            <View style={styles.headerContent}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={styles.welcomeText}>Admin Dashboard</Text>
                  <Text style={styles.subText}>Welcome back, {user?.name}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                  <Icon name="log-out-outline" size={22} color="#7c3aed" />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statGradient}>
                <View style={[styles.statIcon, styles.iconPurpleLight]}>
                  <Icon name="people" size={24} color="#7c3aed" />
                </View>
                <Text style={styles.statValue}>{stats?.total_users || 0}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statGradient}>
                <View style={[styles.statIcon, styles.iconGreenLight]}>
                  <Icon name="git-compare" size={24} color="#10b981" />
                </View>
                <Text style={styles.statValue}>{stats?.total_matches || 0}</Text>
                <Text style={styles.statLabel}>Total Matches</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statGradient}>
                <View style={[styles.statIcon, styles.iconTealLight]}>
                  <Icon name="checkmark-done" size={24} color="#10b981" />
                </View>
                <Text style={styles.statValue}>{stats?.confirmed_matches || 0}</Text>
                <Text style={styles.statLabel}>Successful</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statGradient}>
                <View style={[styles.statIcon, styles.iconAmberLight]}>
                  <Icon name="time" size={24} color="#f59e0b" />
                </View>
                <Text style={styles.statValue}>{stats?.pending_matches || 0}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
          </View>

          {/* Pending Items */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleLeft}>
                <Icon name="search" size={20} color="#7c3aed" />
                <Text style={styles.sectionTitle}>Pending Lost Items</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Lost', { status: 'pending' })}>
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            </View>
            {pendingLost.length > 0 ? pendingLost.slice(0, 3).map((item) => (
              <View key={`lost-${item.id}`} style={styles.listItem}>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{item.item_name}</Text>
                  <Text style={styles.listItemSubtitle}>{item.user?.name || 'Unknown'}</Text>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApproveItem(item.id, 'lost')}>
                    <Icon name="checkmark" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleRejectItem(item.id, 'lost')}>
                    <Icon name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )) : (
              <View style={styles.emptyState}>
                <Icon name="checkmark-circle-outline" size={48} color="#cbd5e1" />
                <Text style={styles.emptyStateText}>No pending lost items</Text>
              </View>
            )}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleLeft}>
                <Icon name="checkmark-circle" size={20} color="#7c3aed" />
                <Text style={styles.sectionTitle}>Pending Found Items</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Found', { status: 'pending' })}>
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            </View>
            {pendingFound.length > 0 ? pendingFound.slice(0, 3).map((item) => (
              <View key={`found-${item.id}`} style={styles.listItem}>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{item.item_name}</Text>
                  <Text style={styles.listItemSubtitle}>{item.user?.name || 'Unknown'}</Text>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApproveItem(item.id, 'found')}>
                    <Icon name="checkmark" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleRejectItem(item.id, 'found')}>
                    <Icon name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )) : (
              <View style={styles.emptyState}>
                <Icon name="checkmark-circle-outline" size={48} color="#cbd5e1" />
                <Text style={styles.emptyStateText}>No pending found items</Text>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={styles.quickActionsTitle}>
              <Icon name="flash" size={16} color="#7c3aed" /> Quick Actions
            </Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('AdminUsers')}>
                <View style={styles.actionGradient}>
                  <Icon name="people" size={32} color="#7c3aed" />
                  <Text style={styles.actionText}>Manage Users</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Map')}>
                <View style={styles.actionGradient}>
                  <Icon name="map" size={32} color="#a855f7" />
                  <Text style={styles.actionText}>View Map</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Matches')}>
                <View style={styles.actionGradient}>
                  <Icon name="git-compare" size={32} color="#f59e0b" />
                  <Text style={styles.actionText}>All Matches</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.ScrollView>

        {/* Floating Action Button */}
        <Animated.View style={styles.floatingButton}>
          <TouchableOpacity onPress={() => navigation.navigate('CreateItem', { type: 'lost' })} activeOpacity={0.9}>
            <LinearGradient colors={['#7c3aed', '#a855f7']} style={styles.floatingButtonGradient}>
              <Icon name="add" size={28} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // Regular User Dashboard View
  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} tintColor="#7c3aed" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Header - White Background */}
        <Animated.View style={[styles.header, { backgroundColor: headerBackgroundColor }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.welcomeText}>Dashboard</Text>
                <Text style={styles.subText}>Welcome back, {user?.name}</Text>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Icon name="log-out-outline" size={22} color="#7c3aed" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Lost')}>
            <View style={styles.statGradient}>
              <View style={[styles.statIcon, styles.iconPurpleLight]}>
                <Icon name="search" size={24} color="#7c3aed" />
              </View>
              <Text style={styles.statValue}>{stats?.my_lost_items || 0}</Text>
              <Text style={styles.statLabel}>Lost Items</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Found')}>
            <View style={styles.statGradient}>
              <View style={[styles.statIcon, styles.iconGreenLight]}>
                <Icon name="checkmark-circle" size={24} color="#10b981" />
              </View>
              <Text style={styles.statValue}>{stats?.my_found_items || 0}</Text>
              <Text style={styles.statLabel}>Found Items</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Matches')}>
            <View style={styles.statGradient}>
              <View style={[styles.statIcon, styles.iconPurpleLight]}>
                <Icon name="git-compare" size={24} color="#7c3aed" />
              </View>
              <Text style={styles.statValue}>{stats?.my_matches || 0}</Text>
              <Text style={styles.statLabel}>Potential Matches</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Matches', { status: 'confirmed' })}>
            <View style={styles.statGradient}>
              <View style={[styles.statIcon, styles.iconAmberLight]}>
                <Icon name="trophy" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.statValue}>{totalRecovered}</Text>
              <Text style={styles.statLabel}>Recovered</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Potential Matches */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleLeft}>
              <Icon name="git-compare" size={20} color="#7c3aed" />
              <Text style={styles.sectionTitle}>Potential Matches</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Matches')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>
          {highMatches.length > 0 ? highMatches.slice(0, 3).map((match) => (
            <TouchableOpacity key={match.id} style={styles.matchRow} onPress={() => navigation.navigate('MatchDetail', { id: match.id })}>
              <View style={styles.matchInfo}>
                <Text style={styles.matchItemName}>
                  {match.lost_item?.user_id === user?.id ? match.lost_item?.item_name : match.found_item?.item_name}
                </Text>
                <View style={styles.matchTypeBadge}>
                  <Text style={styles.matchTypeText}>
                    {match.lost_item?.user_id === user?.id ? 'LOST' : 'FOUND'}
                  </Text>
                </View>
              </View>
              <View style={[styles.matchScore, parseFloat(match.match_score) >= 80 ? styles.scoreHigh : styles.scoreMedium]}>
                <Text style={styles.scoreText}>{parseFloat(match.match_score).toFixed(0)}%</Text>
              </View>
              <Icon name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          )) : (
            <View style={styles.emptyState}>
              <Icon name="git-compare-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyStateText}>No matches yet — keep reporting items!</Text>
            </View>
          )}
        </View>

        {/* Recent Items */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleLeft}>
              <Icon name="time-outline" size={20} color="#7c3aed" />
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
          </View>
          
          <View style={styles.recentGrid}>
            <View style={styles.recentCard}>
              <View style={styles.recentHeader}>
                <Icon name="search" size={16} color="#7c3aed" />
                <Text style={styles.recentTitle}>Lost Items</Text>
              </View>
              {recentLost.slice(0, 2).map((item) => (
                <TouchableOpacity key={item.id} style={styles.recentItem} onPress={() => navigation.navigate('ItemDetail', { type: 'lost', id: item.id })}>
                  <Text style={styles.recentItemName}>{item.item_name}</Text>
                  <Text style={styles.recentItemDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
              {recentLost.length === 0 && (
                <Text style={styles.recentEmpty}>No lost items</Text>
              )}
            </View>

            <View style={styles.recentCard}>
              <View style={styles.recentHeader}>
                <Icon name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.recentTitle}>Found Items</Text>
              </View>
              {recentFound.slice(0, 2).map((item) => (
                <TouchableOpacity key={item.id} style={styles.recentItem} onPress={() => navigation.navigate('ItemDetail', { type: 'found', id: item.id })}>
                  <Text style={styles.recentItemName}>{item.item_name}</Text>
                  <Text style={styles.recentItemDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
              {recentFound.length === 0 && (
                <Text style={styles.recentEmpty}>No found items</Text>
              )}
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>
            <Icon name="flash" size={16} color="#7c3aed" /> Quick Actions
          </Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('CreateItem', { type: 'lost' })}>
              <View style={styles.actionGradient}>
                <Icon name="add-circle" size={32} color="#7c3aed" />
                <Text style={styles.actionText}>Report Lost</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('CreateItem', { type: 'found' })}>
              <View style={styles.actionGradient}>
                <Icon name="checkmark-circle" size={32} color="#10b981" />
                <Text style={styles.actionText}>Report Found</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Map')}>
              <View style={styles.actionGradient}>
                <Icon name="map" size={32} color="#a855f7" />
                <Text style={styles.actionText}>View Map</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Matches')}>
              <View style={styles.actionGradient}>
                <Icon name="git-compare" size={32} color="#f59e0b" />
                <Text style={styles.actionText}>All Matches</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Floating Action Button */}
      <Animated.View style={styles.floatingButton}>
        <TouchableOpacity onPress={() => navigation.navigate('CreateItem', { type: 'lost' })} activeOpacity={0.9}>
          <LinearGradient colors={['#7c3aed', '#a855f7']} style={styles.floatingButtonGradient}>
            <Icon name="add" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const getStyles = (isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9fe',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#edeef5',
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e1b2f',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    color: '#5b5b7a',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 48) / 2 - 16,
  },
  statGradient: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? '#2a2438' : '#edeef5',
    backgroundColor: isDarkMode ? '#191624' : '#ffffff',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconPurpleLight: { backgroundColor: isDarkMode ? '#2d2648' : '#f3e8ff' },
  iconGreenLight: { backgroundColor: isDarkMode ? 'rgba(16,185,129,0.15)' : '#e6f7e6' },
  iconTealLight: { backgroundColor: isDarkMode ? 'rgba(16,185,129,0.15)' : '#e6f7e6' },
  iconAmberLight: { backgroundColor: isDarkMode ? 'rgba(245,158,11,0.15)' : '#fff3e0' },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: isDarkMode ? '#f0edfc' : '#1e1b2f',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: isDarkMode ? '#b4adcf' : '#5b5b7a',
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: isDarkMode ? '#191624' : '#ffffff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#2a2438' : '#edeef5',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#2a2438' : '#edeef5',
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: isDarkMode ? '#b4adcf' : '#5b5b7a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7c3aed',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#2a2438' : '#edeef5',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? '#f0edfc' : '#1e1b2f',
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 12,
    color: isDarkMode ? '#938bb0' : '#7e7b9a',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: '#10b981',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#2a2438' : '#edeef5',
  },
  matchInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  matchItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: isDarkMode ? '#f0edfc' : '#1e1b2f',
  },
  matchTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: isDarkMode ? '#2d2648' : '#f3e8ff',
  },
  matchTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7c3aed',
  },
  matchScore: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  scoreHigh: {
    backgroundColor: isDarkMode ? 'rgba(16,185,129,0.15)' : '#d1fae5',
  },
  scoreMedium: {
    backgroundColor: isDarkMode ? 'rgba(245,158,11,0.15)' : '#fef3c7',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  recentSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  recentGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  recentCard: {
    flex: 1,
    backgroundColor: isDarkMode ? '#191624' : '#ffffff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#2a2438' : '#edeef5',
    borderRadius: 16,
    padding: 12,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#2a2438' : '#edeef5',
    marginBottom: 10,
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? '#b4adcf' : '#5b5b7a',
  },
  recentItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#2a2438' : '#f1f5f9',
  },
  recentItemName: {
    fontSize: 13,
    fontWeight: '500',
    color: isDarkMode ? '#f0edfc' : '#1e1b2f',
    marginBottom: 2,
  },
  recentItemDate: {
    fontSize: 10,
    color: isDarkMode ? '#938bb0' : '#7e7b9a',
  },
  recentEmpty: {
    fontSize: 12,
    color: isDarkMode ? '#938bb0' : '#7e7b9a',
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 13,
    color: isDarkMode ? '#b4adcf' : '#5b5b7a',
  },
  quickActions: {
    marginHorizontal: 16,
    marginBottom: 30,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: isDarkMode ? '#b4adcf' : '#5b5b7a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: (width - 56) / 2 - 12,
  },
  actionGradient: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#2a2438' : '#edeef5',
    backgroundColor: isDarkMode ? '#191624' : '#ffffff',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDarkMode ? '#b4adcf' : '#5b5b7a',
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
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});