// src/screens/main/DashboardScreen.js
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/client';
import { matchesAPI } from '../../api/matches';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function DashboardScreen({ navigation }) {
  const { user, isAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { width } = useWindowDimensions();

  const [stats, setStats] = useState(null);
  const [recentLost, setRecentLost] = useState([]);
  const [recentFound, setRecentFound] = useState([]);
  const [pendingMatches, setPendingMatches] = useState([]);
  const [highMatches, setHighMatches] = useState([]);
  const [pendingLost, setPendingLost] = useState([]);
  const [pendingFound, setPendingFound] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pollRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const ph = isDesktop ? 40 : isTablet ? 24 : 20;

  useEffect(() => {
    startPolling();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  };

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try { await api.get('/notifications'); } catch {}
    }, 15000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [statsRes, recentRes, matchStatsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-items'),
        matchesAPI.getMatchStats(),
      ]);

      const statsData = statsRes.data;
      const matchStatsData = matchStatsRes.data?.stats || matchStatsRes.data || {};
      
      // Handle recent items response
      let recentData = [];
      if (recentRes.data) {
        if (Array.isArray(recentRes.data)) {
          recentData = recentRes.data;
        } else if (recentRes.data.data && Array.isArray(recentRes.data.data)) {
          recentData = recentRes.data.data;
        } else if (recentRes.data.items && Array.isArray(recentRes.data.items)) {
          recentData = recentRes.data.items;
        } else if (recentRes.data.recent_items && Array.isArray(recentRes.data.recent_items)) {
          recentData = recentRes.data.recent_items;
        } else {
          for (const key in recentRes.data) {
            if (Array.isArray(recentRes.data[key])) {
              recentData = recentRes.data[key];
              break;
            }
          }
        }
      }
      
      console.log('Recent items count:', recentData.length);
      
      // Filter items by type - EXCLUDE pending and rejected
      const lost = recentData.filter(i => 
        i.type === 'lost' && 
        i.status !== 'pending' && 
        i.status !== 'rejected'
      );
      const found = recentData.filter(i => 
        i.type === 'found' && 
        i.status !== 'pending' && 
        i.status !== 'rejected'
      );
      
      setRecentLost(lost);
      setRecentFound(found);

      if (isAdmin) {
        try {
          const [plRes, pfRes, pmRes] = await Promise.all([
            api.get('/lost-items', { params: { status: 'pending', per_page: 10 } }),
            api.get('/found-items', { params: { status: 'pending', per_page: 10 } }),
            api.get('/matches', { params: { status: 'pending', per_page: 10 } }),
          ]);
          setPendingLost(plRes.data?.data || []);
          setPendingFound(pfRes.data?.data || []);
          setPendingMatches(pmRes.data?.data || []);
        } catch (e) { console.error('Admin data error:', e); }
      } else {
        try {
          const myMatchesRes = await matchesAPI.getMyMatches({ per_page: 10 });
          const matches = myMatchesRes.data?.data || [];
          setHighMatches(matches.filter(m => parseFloat(m.match_score) >= 60));
        } catch (e) { console.error('Matches error:', e); }
      }

      setStats({
        total_lost_items: statsData.total_lost_items ?? 0,
        total_found_items: statsData.total_found_items ?? 0,
        pending_lost_items: statsData.pending_lost_items ?? 0,
        pending_found_items: statsData.pending_found_items ?? 0,
        total_matches: statsData.total_matches ?? matchStatsData.total ?? 0,
        confirmed_matches: statsData.confirmed_matches ?? matchStatsData.confirmed ?? 0,
        pending_matches: statsData.pending_matches ?? matchStatsData.pending ?? 0,
        my_lost_items: statsData.my_lost_items ?? 0,
        my_found_items: statsData.my_found_items ?? 0,
        my_lost_recovered: statsData.my_lost_recovered ?? 0,
        my_found_claimed: statsData.my_found_claimed ?? 0,
        total_users: statsData.total_users ?? 0,
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
      animateIn();
    }
  };

  useFocusEffect(useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    loadData();
  }, []));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: logout, style: 'destructive' },
    ]);
  };

  const handleApproveItem = (itemId, itemType = 'lost') => {
    Alert.alert('Approve Item', 'Approve this item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        try { await api.post(`/admin/${itemType}-items/${itemId}/approve`); loadData(); }
        catch { Alert.alert('Error', 'Failed to approve item'); }
      }},
    ]);
  };

  const handleRejectItem = (itemId, itemType = 'lost') => {
    Alert.alert('Reject Item', 'Reject this item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        try { await api.post(`/admin/${itemType}-items/${itemId}/reject`); loadData(); }
        catch { Alert.alert('Error', 'Failed to reject item'); }
      }},
    ]);
  };

  const handleApproveMatch = (matchId) => {
    Alert.alert('Confirm Match', 'Confirm this match?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        try { await api.post(`/matches/${matchId}/confirm`); loadData(); }
        catch { Alert.alert('Error', 'Failed to confirm match'); }
      }},
    ]);
  };

  const handleRejectMatch = (matchId) => {
    Alert.alert('Reject Match', 'Reject this match?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        try { await api.post(`/matches/${matchId}/reject`); loadData(); }
        catch { Alert.alert('Error', 'Failed to reject match'); }
      }},
    ]);
  };

  const totalRecovered = (stats?.my_lost_recovered || 0) + (stats?.my_found_claimed || 0);

  // ─── Color tokens ────────────────────────────────────────────────────────────
  const C = {
    bg:        isDark ? '#0f0f0f' : '#f7f7f5',
    surface:   isDark ? '#1a1a1a' : '#ffffff',
    surface2:  isDark ? '#222222' : '#f2f2f0',
    border:    isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
    text:      isDark ? '#f0f0ee' : '#111110',
    textMuted: isDark ? '#888884' : '#888884',
    textFaint: isDark ? '#444440' : '#ccccca',
    red:       '#e50914',
    redMuted:  isDark ? 'rgba(229,9,20,0.12)' : 'rgba(229,9,20,0.08)',
    green:     '#16a34a',
    greenMuted:isDark ? 'rgba(22,163,74,0.12)' : 'rgba(22,163,74,0.08)',
    amber:     '#d97706',
    amberMuted:isDark ? 'rgba(217,119,6,0.12)' : 'rgba(217,119,6,0.08)',
    blue:      '#2563eb',
    blueMuted: isDark ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.08)',
  };

  if (loading) return <LoadingSpinner />;

  // ─── Shared components ────────────────────────────────────────────────────────

  const SectionLabel = ({ icon, label, color = C.red, action, onAction }) => (
    <View style={[styles.sectionLabel, { paddingHorizontal: ph }]}>
      <View style={styles.sectionLabelLeft}>
        <View style={[styles.sectionDot, { backgroundColor: color }]} />
        <Text style={[styles.sectionLabelText, { color: C.textMuted }]}>{label}</Text>
      </View>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={[styles.sectionAction, { color: C.red }]}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const StatCard = ({ icon, value, label, color, colorMuted, onPress }) => (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.statIconWrap, { backgroundColor: colorMuted }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color: C.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: C.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );

  const PendingRow = ({ title, subtitle, onView, onApprove, onReject }) => (
    <View style={[styles.pendingRow, { borderBottomColor: C.border }]}>
      <View style={styles.pendingRowInfo}>
        <Text style={[styles.pendingRowTitle, { color: C.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.pendingRowSub, { color: C.textMuted }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={styles.pendingRowActions}>
        <TouchableOpacity style={[styles.rowBtn, { backgroundColor: C.surface2 }]} onPress={onView}>
          <Feather name="eye" size={13} color={C.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.rowBtn, { backgroundColor: C.greenMuted }]} onPress={onApprove}>
          <Feather name="check" size={13} color={C.green} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.rowBtn, { backgroundColor: C.redMuted }]} onPress={onReject}>
          <Feather name="x" size={13} color={C.red} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const EmptySlate = ({ message }) => (
    <View style={styles.emptySlate}>
      <View style={[styles.emptyIcon, { backgroundColor: C.surface2 }]}>
        <Feather name="inbox" size={18} color={C.textFaint} />
      </View>
      <Text style={[styles.emptyText, { color: C.textMuted }]}>{message}</Text>
    </View>
  );

  const ListCard = ({ title, accent, items, emptyMsg, renderItem, onViewAll }) => (
    <View style={[styles.listCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[styles.listCardHeader, { borderBottomColor: C.border }]}>
        <View style={[styles.listCardAccent, { backgroundColor: accent }]} />
        <Text style={[styles.listCardTitle, { color: C.text }]}>{title}</Text>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={[styles.listCardViewAll, { color: C.red }]}>See all</Text>
          </TouchableOpacity>
        )}
      </View>
      {items.length > 0 ? items.map(renderItem) : <EmptySlate message={emptyMsg} />}
    </View>
  );

  // ─── Admin Dashboard ──────────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.red} colors={[C.red]} />
          }
        >
          {/* ── Header ── */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={[styles.header, { paddingHorizontal: ph }]}>
              <View>
                <Text style={[styles.headerEyebrow, { color: C.textMuted }]}>Admin</Text>
                <Text style={[styles.headerTitle, { color: C.text }]}>Dashboard</Text>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: C.surface, borderColor: C.border }]} onPress={toggleTheme}>
                  <Feather name={isDark ? 'sun' : 'moon'} size={17} color={C.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: C.surface, borderColor: C.border }]} onPress={handleLogout}>
                  <Feather name="log-out" size={17} color={C.red} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Greeting strip ── */}
            <View style={[styles.greetingStrip, { marginHorizontal: ph, backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={[styles.avatarSmall, { backgroundColor: C.redMuted }]}>
                <Text style={[styles.avatarInitial, { color: C.red }]}>{user?.name?.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.greetingName, { color: C.text }]}>{user?.name}</Text>
                <Text style={[styles.greetingRole, { color: C.textMuted }]}>Administrator</Text>
              </View>
              <View style={[styles.onlineDot, { backgroundColor: C.green }]} />
            </View>
          </Animated.View>

          {/* ── Stat cards ── */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <SectionLabel icon="bar-chart-2" label="OVERVIEW" />
            <View style={[styles.statsRow, { paddingHorizontal: ph }]}>
              <StatCard icon="users" value={stats?.total_users || 0} label="Users" color={C.blue} colorMuted={C.blueMuted} onPress={() => navigation.navigate('AdminUsers')} />
              <StatCard icon="git-branch" value={stats?.total_matches || 0} label="Matches" color={C.amber} colorMuted={C.amberMuted} onPress={() => navigation.navigate('AdminMatches')} />
              <StatCard icon="check-circle" value={stats?.confirmed_matches || 0} label="Confirmed" color={C.green} colorMuted={C.greenMuted} onPress={() => navigation.navigate('AdminMatches', { status: 'confirmed' })} />
              <StatCard icon="clock" value={stats?.pending_matches || 0} label="Pending" color={C.red} colorMuted={C.redMuted} onPress={() => navigation.navigate('AdminMatches', { status: 'pending' })} />
            </View>
          </Animated.View>

          {/* ── Pending approvals ── */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <SectionLabel label="PENDING APPROVALS" />

            {/* Lost items */}
            <View style={{ paddingHorizontal: ph, marginBottom: 12 }}>
              <ListCard
                title={`Lost Items  ·  ${pendingLost.length}`}
                accent={C.red}
                items={pendingLost.slice(0, isTablet ? 5 : 3)}
                emptyMsg="No pending lost items"
                onViewAll={() => navigation.navigate('Lost', { status: 'pending' })}
                renderItem={(item) => (
                  <PendingRow
                    key={`lost-${item.id}`}
                    title={item.item_name}
                    subtitle={item.user?.name}
                    onView={() => navigation.navigate('ItemDetail', { type: 'lost', id: item.id })}
                    onApprove={() => handleApproveItem(item.id, 'lost')}
                    onReject={() => handleRejectItem(item.id, 'lost')}
                  />
                )}
              />
            </View>

            {/* Found items */}
            <View style={{ paddingHorizontal: ph, marginBottom: 12 }}>
              <ListCard
                title={`Found Items  ·  ${pendingFound.length}`}
                accent={C.green}
                items={pendingFound.slice(0, isTablet ? 5 : 3)}
                emptyMsg="No pending found items"
                onViewAll={() => navigation.navigate('Found', { status: 'pending' })}
                renderItem={(item) => (
                  <PendingRow
                    key={`found-${item.id}`}
                    title={item.item_name}
                    subtitle={item.user?.name}
                    onView={() => navigation.navigate('ItemDetail', { type: 'found', id: item.id })}
                    onApprove={() => handleApproveItem(item.id, 'found')}
                    onReject={() => handleRejectItem(item.id, 'found')}
                  />
                )}
              />
            </View>

            {/* Matches */}
            <View style={{ paddingHorizontal: ph, marginBottom: 12 }}>
              <ListCard
                title={`Matches  ·  ${pendingMatches.length}`}
                accent={C.amber}
                items={pendingMatches.slice(0, isTablet ? 5 : 3)}
                emptyMsg="No pending matches"
                onViewAll={() => navigation.navigate('AdminMatches', { status: 'pending' })}
                renderItem={(match) => (
                  <PendingRow
                    key={`match-${match.id}`}
                    title={`${match.lost_item?.item_name || '—'}  ↔  ${match.found_item?.item_name || '—'}`}
                    subtitle={`${parseFloat(match.match_score).toFixed(0)}% match score`}
                    onView={() => navigation.navigate('MatchDetail', { id: match.id })}
                    onApprove={() => handleApproveMatch(match.id)}
                    onReject={() => handleRejectMatch(match.id)}
                  />
                )}
              />
            </View>
          </Animated.View>

          {/* ── Quick actions ── */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <SectionLabel label="QUICK ACTIONS" />
            <View style={[styles.actionsRow, { paddingHorizontal: ph }]}>
              {[
                { icon: 'map', label: 'Map', color: C.blue, colorMuted: C.blueMuted, screen: 'Map' },
                { icon: 'git-branch', label: 'Matches', color: C.amber, colorMuted: C.amberMuted, screen: 'AdminMatches' },
                { icon: 'users', label: 'Users', color: C.red, colorMuted: C.redMuted, screen: 'AdminUsers' },
              ].map(a => (
                <TouchableOpacity
                  key={a.screen}
                  style={[styles.actionChip, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => navigation.navigate(a.screen)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.actionChipIcon, { backgroundColor: a.colorMuted }]}>
                    <Feather name={a.icon} size={16} color={a.color} />
                  </View>
                  <Text style={[styles.actionChipLabel, { color: C.text }]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateItem', { type: 'lost' })} activeOpacity={0.85}>
          <LinearGradient colors={['#e50914', '#b20710']} style={styles.fabInner}>
            <Feather name="plus" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── User Dashboard ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.red} colors={[C.red]} />
        }
      >
        {/* ── Header ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={[styles.header, { paddingHorizontal: ph }]}>
            <View>
              <Text style={[styles.headerEyebrow, { color: C.textMuted }]}>Welcome back</Text>
              <Text style={[styles.headerTitle, { color: C.text }]}>{user?.name?.split(' ')[0]}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={[styles.iconBtn, { backgroundColor: C.surface, borderColor: C.border }]} onPress={toggleTheme}>
                <Feather name={isDark ? 'sun' : 'moon'} size={17} color={C.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, { backgroundColor: C.surface, borderColor: C.border }]} onPress={handleLogout}>
                <Feather name="log-out" size={17} color={C.red} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ── Stats cards ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <SectionLabel label="MY STATS" />
          <View style={[styles.statsRow, { paddingHorizontal: ph }]}>
            <StatCard icon="alert-circle" value={stats?.my_lost_items || 0} label="Lost" color={C.red} colorMuted={C.redMuted} onPress={() => navigation.navigate('Lost')} />
            <StatCard icon="check-circle" value={stats?.my_found_items || 0} label="Found" color={C.green} colorMuted={C.greenMuted} onPress={() => navigation.navigate('Found')} />
            <StatCard icon="git-branch" value={highMatches.length} label="Matches" color={C.blue} colorMuted={C.blueMuted} onPress={() => navigation.navigate('Matches')} />
            <StatCard icon="award" value={totalRecovered} label="Recovered" color={C.amber} colorMuted={C.amberMuted} onPress={() => navigation.navigate('Matches', { status: 'confirmed' })} />
          </View>
        </Animated.View>

        {/* ── Potential matches ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <SectionLabel label="POTENTIAL MATCHES" action="See all" onAction={() => navigation.navigate('Matches')} />
          <View style={{ paddingHorizontal: ph, marginBottom: 12 }}>
            <ListCard
              title="High confidence matches"
              accent={C.blue}
              items={highMatches.slice(0, isTablet ? 5 : 3)}
              emptyMsg="No matches yet — keep reporting items!"
              renderItem={(match) => (
                <TouchableOpacity
                  key={match.id}
                  style={[styles.matchRow, { borderBottomColor: C.border }]}
                  onPress={() => navigation.navigate('MatchDetail', { id: match.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.matchRowLeft}>
                    <Text style={[styles.matchRowTitle, { color: C.text }]} numberOfLines={1}>
                      {match.lost_item?.user_id === user?.id ? match.lost_item?.item_name : match.found_item?.item_name}
                    </Text>
                    <Text style={[styles.matchRowSub, { color: C.textMuted }]} numberOfLines={1}>
                      {match.lost_item?.user_id === user?.id ? match.found_item?.item_name : match.lost_item?.item_name}
                    </Text>
                  </View>
                  <View style={styles.matchRowRight}>
                    <View style={[
                      styles.scorePill,
                      { backgroundColor: parseFloat(match.match_score) >= 80 ? C.greenMuted : C.amberMuted }
                    ]}>
                      <Text style={[
                        styles.scorePillText,
                        { color: parseFloat(match.match_score) >= 80 ? C.green : C.amber }
                      ]}>
                        {parseFloat(match.match_score).toFixed(0)}%
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={15} color={C.textFaint} />
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </Animated.View>

        {/* ── Recent items ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <SectionLabel label="RECENT ACTIVITY" />
          <View style={[styles.recentGrid, { paddingHorizontal: ph, flexDirection: isTablet ? 'row' : 'column', gap: 12 }]}>
            {/* Lost */}
            <View style={{ flex: 1 }}>
              <ListCard
                title="Lost"
                accent={C.red}
                items={recentLost.slice(0, 3)}
                emptyMsg="Nothing reported yet"
                onViewAll={() => navigation.navigate('Lost')}
                renderItem={(item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.recentRow, { borderBottomColor: C.border }]}
                    onPress={() => navigation.navigate('ItemDetail', { type: 'lost', id: item.id })}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.recentDot, { backgroundColor: C.redMuted }]}>
                      <Feather name="search" size={11} color={C.red} />
                    </View>
                    <View style={styles.recentRowInfo}>
                      <Text style={[styles.recentRowName, { color: C.text }]} numberOfLines={1}>{item.item_name}</Text>
                      <Text style={[styles.recentRowDate, { color: C.textMuted }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                    <StatusPill status={item.status} C={C} />
                  </TouchableOpacity>
                )}
              />
            </View>
            {/* Found */}
            <View style={{ flex: 1 }}>
              <ListCard
                title="Found"
                accent={C.green}
                items={recentFound.slice(0, 3)}
                emptyMsg="Nothing reported yet"
                onViewAll={() => navigation.navigate('Found')}
                renderItem={(item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.recentRow, { borderBottomColor: C.border }]}
                    onPress={() => navigation.navigate('ItemDetail', { type: 'found', id: item.id })}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.recentDot, { backgroundColor: C.greenMuted }]}>
                      <Feather name="check" size={11} color={C.green} />
                    </View>
                    <View style={styles.recentRowInfo}>
                      <Text style={[styles.recentRowName, { color: C.text }]} numberOfLines={1}>{item.item_name}</Text>
                      <Text style={[styles.recentRowDate, { color: C.textMuted }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                    <StatusPill status={item.status} C={C} />
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Animated.View>

        {/* ── Quick actions ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <SectionLabel label="QUICK ACTIONS" />
          <View style={[styles.actionsRow, { paddingHorizontal: ph }]}>
            {[
              { icon: 'plus-circle', label: 'Report Lost', color: C.red, colorMuted: C.redMuted, screen: 'CreateItem', params: { type: 'lost' } },
              { icon: 'check-circle', label: 'Report Found', color: C.green, colorMuted: C.greenMuted, screen: 'CreateItem', params: { type: 'found' } },
              { icon: 'map', label: 'Map', color: C.blue, colorMuted: C.blueMuted, screen: 'Map', params: {} },
              { icon: 'git-branch', label: 'Matches', color: C.amber, colorMuted: C.amberMuted, screen: 'Matches', params: {} },
            ].map(a => (
              <TouchableOpacity
                key={a.label}
                style={[styles.actionChip, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => navigation.navigate(a.screen, a.params)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionChipIcon, { backgroundColor: a.colorMuted }]}>
                  <Feather name={a.icon} size={16} color={a.color} />
                </View>
                <Text style={[styles.actionChipLabel, { color: C.text }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateItem', { type: 'lost' })} activeOpacity={0.85}>
        <LinearGradient colors={['#e50914', '#b20710']} style={styles.fabInner}>
          <Feather name="plus" size={22} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Status pill helper ────────────────────────────────────────────────────────
function StatusPill({ status, C }) {
  const map = {
    pending:  { bg: C.amberMuted, fg: C.amber },
    approved: { bg: C.greenMuted, fg: C.green },
    rejected: { bg: C.redMuted,   fg: C.red   },
    found:    { bg: C.blueMuted,  fg: C.blue  },
    claimed:  { bg: C.greenMuted, fg: C.green },
    returned: { bg: C.amberMuted, fg: C.amber },
    recovered: { bg: C.greenMuted, fg: C.green },
    disposed: { bg: C.textMuted,  fg: C.textFaint },
  };
  const s = map[status] || map.approved;
  return (
    <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusPillText, { color: s.fg }]}>{(status || 'approved').toUpperCase()}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingBottom: 20,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Greeting strip (admin)
  greetingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  avatarSmall: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 16, fontWeight: '700' },
  greetingName: { fontSize: 14, fontWeight: '600' },
  greetingRole: { fontSize: 11, marginTop: 1 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },

  // Section label
  sectionLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionLabelLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionDot: { width: 5, height: 5, borderRadius: 3 },
  sectionLabelText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  sectionAction: { fontSize: 11, fontWeight: '600' },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  statIconWrap: { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },

  // List card
  listCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  listCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  listCardAccent: { width: 3, height: 14, borderRadius: 2 },
  listCardTitle: { flex: 1, fontSize: 13, fontWeight: '600' },
  listCardViewAll: { fontSize: 11, fontWeight: '600' },

  // Pending rows
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    gap: 10,
  },
  pendingRowInfo: { flex: 1 },
  pendingRowTitle: { fontSize: 13, fontWeight: '500' },
  pendingRowSub: { fontSize: 11, marginTop: 2 },
  pendingRowActions: { flexDirection: 'row', gap: 6 },
  rowBtn: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  // Match row
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  matchRowLeft: { flex: 1 },
  matchRowTitle: { fontSize: 13, fontWeight: '500' },
  matchRowSub: { fontSize: 11, marginTop: 2 },
  matchRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scorePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  scorePillText: { fontSize: 11, fontWeight: '700' },

  // Recent row
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    gap: 10,
  },
  recentDot: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  recentRowInfo: { flex: 1 },
  recentRowName: { fontSize: 13, fontWeight: '500' },
  recentRowDate: { fontSize: 10, marginTop: 2 },
  recentGrid: { marginBottom: 20 },

  // Status pill
  statusPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  statusPillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  // Empty slate
  emptySlate: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 12 },

  // Actions
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  actionChip: {
    flexBasis: '22%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  actionChipIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionChipLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 24,
    right: 20,
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabInner: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
});