// src/screens/main/DashboardScreen.js
import Icon from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/client';
import { matchesAPI } from '../../api/matches';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { user, isAdmin, logout } = useAuth();
  const { isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [recentLost, setRecentLost] = useState([]);
  const [recentFound, setRecentFound] = useState([]);
  const [pendingMatches, setPendingMatches] = useState([]);
  const [highMatches, setHighMatches] = useState([]);
  const [pendingLost, setPendingLost] = useState([]);
  const [pendingFound, setPendingFound] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pollRef = useRef(null);

  useEffect(() => {
    startPolling();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

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

  const totalRecovered = (stats?.my_lost_recovered || 0) + (stats?.my_found_claimed || 0);
  const styles = getStyles(isDark);

  if (loading) {
    return <LoadingSpinner />;
  }

  // Admin Dashboard View
  if (isAdmin) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={[styles.container, { backgroundColor: isDark ? '#141414' : '#f8fafc' }]}>
          <SafeAreaView style={styles.safeArea}>
            <Animated.ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.contentContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e50914']} tintColor="#e50914" />
              }
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View>
                  <Text style={styles.headerTitle}>Admin Dashboard</Text>
                  <Text style={styles.headerSubtitle}>Welcome back, {user?.name}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                  <Icon name="log-out-outline" size={22} color="#e50914" />
                </TouchableOpacity>
              </Animated.View>

              {/* Stats Grid - 3 cards */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <LinearGradient colors={['#e50914', '#b20710']} style={styles.statIconLarge}>
                    <Icon name="people" size={28} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.statValueLarge}>{stats?.total_users || 0}</Text>
                  <Text style={styles.statLabel}>Total Users</Text>
                </View>

                <View style={styles.statCard}>
                  <LinearGradient colors={['#f5c518', '#d4a300']} style={styles.statIconLarge}>
                    <Icon name="git-compare" size={28} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.statValueLarge}>{stats?.total_matches || 0}</Text>
                  <Text style={styles.statLabel}>Total Matches</Text>
                  <View style={styles.statBadge}>
                    <Text style={styles.statBadgeText}>{stats?.pending_matches || 0} pending</Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <LinearGradient colors={['#2e7d32', '#4caf50']} style={styles.statIconLarge}>
                    <Icon name="checkmark-done" size={28} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.statValueLarge}>{stats?.confirmed_matches || 0}</Text>
                  <Text style={styles.statLabel}>Confirmed</Text>
                </View>
              </View>

              {/* Pending Reviews Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending Reviews</Text>
                
                {/* Pending Lost Items */}
                <View style={styles.listCard}>
                  <View style={styles.listHeader}>
                    <Icon name="search" size={18} color="#e50914" />
                    <Text style={styles.listTitle}>Lost Items</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Lost', { status: 'pending' })}>
                      <Text style={styles.viewAll}>View All →</Text>
                    </TouchableOpacity>
                  </View>
                  {pendingLost.length > 0 ? pendingLost.slice(0, 3).map((item) => (
                    <TouchableOpacity key={item.id} style={styles.listItem} onPress={() => navigation.navigate('ItemDetail', { type: 'lost', id: item.id })}>
                      <View style={styles.listItemContent}>
                        <Text style={styles.listItemTitle}>{item.item_name}</Text>
                        <Text style={styles.listItemSubtitle}>{item.user?.name}</Text>
                      </View>
                      <TouchableOpacity style={styles.approveButton}>
                        <Icon name="checkmark" size={16} color="#fff" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  )) : (
                    <View style={styles.emptyList}>
                      <Text style={styles.emptyText}>No pending lost items</Text>
                    </View>
                  )}
                </View>

                {/* Pending Found Items */}
                <View style={styles.listCard}>
                  <View style={styles.listHeader}>
                    <Icon name="checkmark-circle" size={18} color="#2e7d32" />
                    <Text style={styles.listTitle}>Found Items</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Found', { status: 'pending' })}>
                      <Text style={styles.viewAll}>View All →</Text>
                    </TouchableOpacity>
                  </View>
                  {pendingFound.length > 0 ? pendingFound.slice(0, 3).map((item) => (
                    <TouchableOpacity key={item.id} style={styles.listItem} onPress={() => navigation.navigate('ItemDetail', { type: 'found', id: item.id })}>
                      <View style={styles.listItemContent}>
                        <Text style={styles.listItemTitle}>{item.item_name}</Text>
                        <Text style={styles.listItemSubtitle}>{item.user?.name}</Text>
                      </View>
                      <TouchableOpacity style={styles.approveButton}>
                        <Icon name="checkmark" size={16} color="#fff" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  )) : (
                    <View style={styles.emptyList}>
                      <Text style={styles.emptyText}>No pending found items</Text>
                    </View>
                  )}
                </View>

                {/* Pending Matches */}
                <View style={styles.listCard}>
                  <View style={styles.listHeader}>
                    <Icon name="git-compare" size={18} color="#f5c518" />
                    <Text style={styles.listTitle}>Matches</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Matches', { status: 'pending' })}>
                      <Text style={styles.viewAll}>View All →</Text>
                    </TouchableOpacity>
                  </View>
                  {pendingMatches.length > 0 ? pendingMatches.slice(0, 3).map((match) => (
                    <TouchableOpacity key={match.id} style={styles.listItem} onPress={() => navigation.navigate('MatchDetail', { id: match.id })}>
                      <View style={styles.listItemContent}>
                        <Text style={styles.listItemTitle}>{match.lost_item?.item_name}</Text>
                        <Text style={styles.listItemSubtitle}>vs {match.found_item?.item_name}</Text>
                      </View>
                      <View style={[styles.scoreBadge, parseFloat(match.match_score) >= 70 ? styles.scoreHigh : styles.scoreMedium]}>
                        <Text style={styles.scoreText}>{match.match_score}%</Text>
                      </View>
                    </TouchableOpacity>
                  )) : (
                    <View style={styles.emptyList}>
                      <Text style={styles.emptyText}>No pending matches</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AdminUsers')}>
                    <LinearGradient colors={['#e50914', '#b20710']} style={styles.actionIconSmall}>
                      <Icon name="people" size={22} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.actionButtonText}>Users</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Map')}>
                    <LinearGradient colors={['#f5c518', '#d4a300']} style={styles.actionIconSmall}>
                      <Icon name="map" size={22} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.actionButtonText}>Map</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Matches')}>
                    <LinearGradient colors={['#9c27b0', '#7b1fa2']} style={styles.actionIconSmall}>
                      <Icon name="git-compare" size={22} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.actionButtonText}>Matches</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.ScrollView>
          </SafeAreaView>
        </View>
      </>
    );
  }

  // Regular User Dashboard View
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={[styles.container, { backgroundColor: isDark ? '#141414' : '#f8fafc' }]}>
        <SafeAreaView style={styles.safeArea}>
          <Animated.ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e50914']} tintColor="#e50914" />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View>
                <Text style={styles.headerTitle}>Dashboard</Text>
                <Text style={styles.headerSubtitle}>Welcome back, {user?.name}</Text>
              </View>
              <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
                <LinearGradient colors={['#e50914', '#b20710']} style={styles.profileGradient}>
                  <Icon name="person" size={22} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Stats Grid - 2x2 */}
            <View style={styles.statsGrid}>
              <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Lost')}>
                <LinearGradient colors={['#e50914', '#b20710']} style={styles.statIconSmall}>
                  <Icon name="search" size={24} color="#fff" />
                </LinearGradient>
                <Text style={styles.statValue}>{stats?.my_lost_items || 0}</Text>
                <Text style={styles.statLabel}>Lost Items</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Found')}>
                <LinearGradient colors={['#2e7d32', '#4caf50']} style={styles.statIconSmall}>
                  <Icon name="checkmark-circle" size={24} color="#fff" />
                </LinearGradient>
                <Text style={styles.statValue}>{stats?.my_found_items || 0}</Text>
                <Text style={styles.statLabel}>Found Items</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Matches')}>
                <LinearGradient colors={['#f5c518', '#d4a300']} style={styles.statIconSmall}>
                  <Icon name="git-compare" size={24} color="#fff" />
                </LinearGradient>
                <Text style={styles.statValue}>{stats?.my_matches || 0}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Matches', { status: 'confirmed' })}>
                <LinearGradient colors={['#9c27b0', '#7b1fa2']} style={styles.statIconSmall}>
                  <Icon name="trophy" size={24} color="#fff" />
                </LinearGradient>
                <Text style={styles.statValue}>{totalRecovered}</Text>
                <Text style={styles.statLabel}>Recovered</Text>
              </TouchableOpacity>
            </View>

            {/* Welcome Card */}
            <LinearGradient
              colors={isDark ? ['#1a1a1a', '#141414'] : ['#ffffff', '#f8fafc']}
              style={styles.welcomeCard}
            >
              <Text style={styles.welcomeText}>👋 Hello, {user?.name?.split(' ')[0]}!</Text>
              <Text style={styles.welcomeSubtext}>
                Track your lost and found items, review matches, and recover what's yours.
              </Text>
            </LinearGradient>

            {/* Potential Matches Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="hardware-chip" size={20} color="#e50914" />
                <Text style={styles.sectionTitle}>Potential Matches</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Matches')}>
                  <Text style={styles.viewAll}>See All →</Text>
                </TouchableOpacity>
              </View>
              
              {highMatches.length > 0 ? (
                highMatches.slice(0, 3).map((match, index) => (
                  <TouchableOpacity key={match.id} style={[styles.matchCard, index === highMatches.slice(0, 3).length - 1 && styles.lastMatchCard]} onPress={() => navigation.navigate('MatchDetail', { id: match.id })}>
                    <View style={styles.matchLeft}>
                      <LinearGradient
                        colors={parseFloat(match.match_score) >= 80 ? ['#2e7d32', '#4caf50'] : ['#f5c518', '#d4a300']}
                        style={styles.matchScoreCircle}
                      >
                        <Text style={styles.matchScoreCircleText}>{parseFloat(match.match_score).toFixed(0)}%</Text>
                      </LinearGradient>
                      <View style={styles.matchInfo}>
                        <Text style={styles.matchItemName}>
                          {match.lost_item?.user_id === user?.id ? match.lost_item?.item_name : match.found_item?.item_name}
                        </Text>
                        <View style={styles.matchTypeTag}>
                          <Text style={styles.matchTypeText}>
                            {match.lost_item?.user_id === user?.id ? 'Your Lost Item' : 'Your Found Item'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Icon name="chevron-forward" size={20} color={isDark ? '#666' : '#cbd5e1'} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Icon name="git-compare-outline" size={56} color={isDark ? '#333' : '#cbd5e1'} />
                  <Text style={styles.emptyTitle}>No matches yet</Text>
                  <Text style={styles.emptySubtext}>Keep reporting items to get matches</Text>
                </View>
              )}
            </View>

            {/* Recent Activity Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              
              <View style={styles.activityGrid}>
                {/* Recent Lost */}
                <View style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <Icon name="search" size={16} color="#e50914" />
                    <Text style={styles.activityTitle}>Lost Items</Text>
                  </View>
                  {recentLost.length > 0 ? (
                    recentLost.slice(0, 2).map((item) => (
                      <TouchableOpacity key={item.id} style={styles.activityItem} onPress={() => navigation.navigate('ItemDetail', { type: 'lost', id: item.id })}>
                        <Text style={styles.activityItemName} numberOfLines={1}>{item.item_name}</Text>
                        <View style={[styles.activityStatus, item.status === 'approved' ? styles.statusApproved : styles.statusPending]}>
                          <Text style={styles.activityStatusText}>{item.status === 'approved' ? 'Active' : 'Pending'}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.activityEmpty}>No lost items</Text>
                  )}
                  <TouchableOpacity style={styles.activityFooter} onPress={() => navigation.navigate('Lost', { filter: 'my' })}>
                    <Text style={styles.activityFooterText}>View all lost items →</Text>
                  </TouchableOpacity>
                </View>

                {/* Recent Found */}
                <View style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <Icon name="checkmark-circle" size={16} color="#2e7d32" />
                    <Text style={styles.activityTitle}>Found Items</Text>
                  </View>
                  {recentFound.length > 0 ? (
                    recentFound.slice(0, 2).map((item) => (
                      <TouchableOpacity key={item.id} style={styles.activityItem} onPress={() => navigation.navigate('ItemDetail', { type: 'found', id: item.id })}>
                        <Text style={styles.activityItemName} numberOfLines={1}>{item.item_name}</Text>
                        <View style={[styles.activityStatus, item.status === 'approved' ? styles.statusApproved : styles.statusPending]}>
                          <Text style={styles.activityStatusText}>{item.status === 'approved' ? 'Active' : 'Pending'}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.activityEmpty}>No found items</Text>
                  )}
                  <TouchableOpacity style={styles.activityFooter} onPress={() => navigation.navigate('Found', { filter: 'my' })}>
                    <Text style={styles.activityFooterText}>View all found items →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('CreateItem', { type: 'lost' })}>
                  <LinearGradient colors={['#e50914', '#b20710']} style={styles.actionIconSmall}>
                    <Icon name="add" size={22} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.actionButtonText}>Report Lost</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('CreateItem', { type: 'found' })}>
                  <LinearGradient colors={['#2e7d32', '#4caf50']} style={styles.actionIconSmall}>
                    <Icon name="checkmark" size={22} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.actionButtonText}>Report Found</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Map')}>
                  <LinearGradient colors={['#f5c518', '#d4a300']} style={styles.actionIconSmall}>
                    <Icon name="map" size={22} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.actionButtonText}>View Map</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#0f172a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: isDark ? '#b3b3b3' : '#64748b',
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
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDark ? 'rgba(229,9,20,0.1)' : '#fef3e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 56) / 2 - 12,
    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? '#333333' : '#edeef5',
  },
  statIconSmall: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: isDark ? '#ffffff' : '#0f172a',
    marginBottom: 4,
  },
  statValueLarge: {
    fontSize: 32,
    fontWeight: '800',
    color: isDark ? '#ffffff' : '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: isDark ? '#b3b3b3' : '#64748b',
    fontWeight: '500',
  },
  statBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(245,197,24,0.15)' : '#fef3c7',
  },
  statBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#f5c518',
  },
  welcomeCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? '#333333' : '#edeef5',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#0f172a',
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 13,
    color: isDark ? '#b3b3b3' : '#64748b',
    lineHeight: 20,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#0f172a',
    marginLeft: 8,
  },
  viewAll: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e50914',
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: isDark ? '#333333' : '#edeef5',
  },
  lastMatchCard: {
    marginBottom: 0,
  },
  matchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  matchScoreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchScoreCircleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  matchInfo: {
    flex: 1,
  },
  matchItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#0f172a',
    marginBottom: 4,
  },
  matchTypeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: isDark ? 'rgba(229,9,20,0.15)' : '#fef3e8',
  },
  matchTypeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#e50914',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDark ? '#333333' : '#edeef5',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#0f172a',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: isDark ? '#b3b3b3' : '#64748b',
    marginTop: 4,
  },
  activityGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  activityCard: {
    flex: 1,
    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: isDark ? '#333333' : '#edeef5',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#edeef5',
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#0f172a',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  activityItemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: isDark ? '#ffffff' : '#0f172a',
    marginRight: 8,
  },
  activityStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusApproved: {
    backgroundColor: isDark ? 'rgba(46,125,50,0.2)' : '#d1fae5',
  },
  statusPending: {
    backgroundColor: isDark ? 'rgba(245,197,24,0.2)' : '#fef3c7',
  },
  activityStatusText: {
    fontSize: 9,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#0f172a',
  },
  activityEmpty: {
    fontSize: 12,
    color: isDark ? '#b3b3b3' : '#64748b',
    textAlign: 'center',
    paddingVertical: 20,
  },
  activityFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#333333' : '#edeef5',
  },
  activityFooterText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#e50914',
    textAlign: 'center',
  },
  actionsSection: {
    marginHorizontal: 16,
    marginBottom: 30,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: isDark ? '#333333' : '#edeef5',
  },
  actionIconSmall: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#0f172a',
  },
  listCard: {
    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDark ? '#333333' : '#edeef5',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: isDark ? '#141414' : '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#edeef5',
  },
  listTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#0f172a',
    marginLeft: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#edeef5',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: isDark ? '#ffffff' : '#0f172a',
    marginBottom: 2,
  },
  listItemSubtitle: {
    fontSize: 11,
    color: isDark ? '#b3b3b3' : '#64748b',
  },
  approveButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2e7d32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  scoreHigh: {
    backgroundColor: isDark ? 'rgba(46,125,50,0.2)' : '#d1fae5',
  },
  scoreMedium: {
    backgroundColor: isDark ? 'rgba(245,197,24,0.2)' : '#fef3c7',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#0f172a',
  },
  emptyList: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 12,
    color: isDark ? '#b3b3b3' : '#64748b',
  },
});