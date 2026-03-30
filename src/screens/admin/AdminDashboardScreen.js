// src/screens/admin/AdminDashboardScreen.js
import Icon from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { adminAPI } from '../../api/admin';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardScreen({ navigation }) {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState({
        total_users: 0,
        new_users_this_week: 0,
        total_lost_items: 0,
        total_found_items: 0,
        pending_lost_items: 0,
        pending_found_items: 0,
        pending_matches: 0,
        confirmed_matches: 0,
        active_users: 0,
        items_this_week: 0,
        recovery_rate: 0
    });
    const [recentUsers, setRecentUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            setLoading(true);
            
            // Get dashboard stats
            const statsRes = await adminAPI.getDashboardStats();
            console.log('Dashboard stats response:', statsRes.data);
            
            // Get recent users
            let usersData = [];
            try {
                const usersRes = await adminAPI.getRecentUsers();
                console.log('Recent users response:', usersRes.data);
                usersData = usersRes.data?.users || usersRes.data || [];
            } catch (userError) {
                console.error('Error loading recent users:', userError);
                // Don't fail the whole dashboard if users don't load
            }
            
            // Handle different stats response structures
            const statsData = statsRes.data?.stats || statsRes.data || {};
            
            setStats({
                total_users: statsData.total_users || 0,
                new_users_this_week: statsData.new_users_this_week || statsData.new_users || 0,
                total_lost_items: statsData.total_lost_items || statsData.lost_items || 0,
                total_found_items: statsData.total_found_items || statsData.found_items || 0,
                pending_lost_items: statsData.pending_lost_items || 0,
                pending_found_items: statsData.pending_found_items || 0,
                pending_matches: statsData.pending_matches || 0,
                confirmed_matches: statsData.confirmed_matches || 0,
                active_users: statsData.active_users || 0,
                items_this_week: statsData.items_this_week || 0,
                recovery_rate: statsData.recovery_rate || 0
            });
            
            setRecentUsers(usersData);
        } catch (error) {
            console.error('Error loading admin dashboard:', error);
            if (error.response?.status === 401) {
                Alert.alert('Session Expired', 'Please login again');
            } else if (error.response?.status === 500) {
                // Don't show alert for server errors, just log
                console.log('Server error, using default values');
            } else {
                Alert.alert('Error', 'Failed to load dashboard data');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    const totalItems = (stats.total_lost_items || 0) + (stats.total_found_items || 0);
    const pendingItems = (stats.pending_lost_items || 0) + (stats.pending_found_items || 0);

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={onRefresh}
                    colors={['#7c3aed']}
                    tintColor="#7c3aed"
                />
            }
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Admin Dashboard</Text>
                    <Text style={styles.nameText}>Hello, {user?.name || 'Admin'}</Text>
                </View>
                <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                    <Icon name="log-out-outline" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <TouchableOpacity
                    style={styles.statCard}
                    onPress={() => navigation.navigate('AdminUsers')}
                >
                    <View style={[styles.statIcon, styles.iconPurple]}>
                        <Icon name="people" size={28} color="#7c3aed" />
                    </View>
                    <View style={styles.statContent}>
                        <Text style={styles.statNumber}>{stats.total_users || 0}</Text>
                        <Text style={styles.statLabel}>Total Users</Text>
                        <View style={styles.statTrend}>
                            <Text style={styles.trendText}>+{stats.new_users_this_week || 0} this week</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.statCard}
                    onPress={() => navigation.navigate('AdminItems')}
                >
                    <View style={[styles.statIcon, styles.iconGreen]}>
                        <Icon name="cube" size={28} color="#10b981" />
                    </View>
                    <View style={styles.statContent}>
                        <Text style={styles.statNumber}>{totalItems}</Text>
                        <Text style={styles.statLabel}>Total Items</Text>
                        <View style={styles.statTrend}>
                            <Text style={styles.trendText}>
                                Lost: {stats.total_lost_items || 0} | Found: {stats.total_found_items || 0}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.statCard}
                    onPress={() => navigation.navigate('AdminMatches')}
                >
                    <View style={[styles.statIcon, styles.iconOrange]}>
                        <Icon name="git-compare" size={28} color="#f59e0b" />
                    </View>
                    <View style={styles.statContent}>
                        <Text style={styles.statNumber}>{stats.pending_matches || 0}</Text>
                        <Text style={styles.statLabel}>Pending Matches</Text>
                        <View style={styles.statTrend}>
                            <Text style={styles.trendText}>
                                {stats.confirmed_matches || 0} confirmed
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.statCard}
                    onPress={() => navigation.navigate('AdminItems', { status: 'pending' })}
                >
                    <View style={[styles.statIcon, styles.iconRed]}>
                        <Icon name="time" size={28} color="#ef4444" />
                    </View>
                    <View style={styles.statContent}>
                        <Text style={styles.statNumber}>{pendingItems}</Text>
                        <Text style={styles.statLabel}>Pending Approval</Text>
                        <View style={styles.statTrend}>
                            <Text style={styles.trendText}>
                                Lost: {stats.pending_lost_items || 0} | Found: {stats.pending_found_items || 0}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Additional Stats Row */}
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <View style={[styles.statIcon, styles.iconBlue]}>
                        <Icon name="trending-up" size={28} color="#3b82f6" />
                    </View>
                    <View style={styles.statContent}>
                        <Text style={styles.statNumber}>{stats.recovery_rate || 0}%</Text>
                        <Text style={styles.statLabel}>Recovery Rate</Text>
                        <View style={styles.statTrend}>
                            <Text style={styles.trendText}>Successfully matched</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.statCard}>
                    <View style={[styles.statIcon, styles.iconTeal]}>
                        <Icon name="calendar" size={28} color="#14b8a6" />
                    </View>
                    <View style={styles.statContent}>
                        <Text style={styles.statNumber}>{stats.items_this_week || 0}</Text>
                        <Text style={styles.statLabel}>Items This Week</Text>
                        <View style={styles.statTrend}>
                            <Text style={styles.trendText}>New reports</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.statCard}>
                    <View style={[styles.statIcon, styles.iconPink]}>
                        <Icon name="checkmark-circle" size={28} color="#ec489a" />
                    </View>
                    <View style={styles.statContent}>
                        <Text style={styles.statNumber}>{stats.active_users || 0}</Text>
                        <Text style={styles.statLabel}>Active Users</Text>
                        <View style={styles.statTrend}>
                            <Text style={styles.trendText}>Last 30 days</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Recent Users */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Users</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('AdminUsers')}>
                        <Text style={styles.viewAllText}>View All →</Text>
                    </TouchableOpacity>
                </View>
                {recentUsers.length > 0 ? (
                    recentUsers.slice(0, 5).map((userItem) => (
                        <TouchableOpacity
                            key={userItem.id}
                            style={styles.userCard}
                            onPress={() => navigation.navigate('AdminUserDetail', { userId: userItem.id })}
                        >
                            <View style={[styles.userAvatar, userItem.role === 'admin' && styles.adminAvatar]}>
                                <Text style={styles.userAvatarText}>
                                    {userItem.name?.charAt(0).toUpperCase() || '?'}
                                </Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName} numberOfLines={1}>{userItem.name}</Text>
                                <Text style={styles.userEmail} numberOfLines={1}>{userItem.email}</Text>
                                <View style={styles.roleBadge}>
                                    <Text style={[styles.userRole, userItem.role === 'admin' && styles.adminRoleText]}>
                                        {userItem.role?.toUpperCase() || 'USER'}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.userDate}>
                                {userItem.created_at ? new Date(userItem.created_at).toLocaleDateString() : 'N/A'}
                            </Text>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Icon name="people-outline" size={32} color="#ccc" />
                        <Text style={styles.emptyText}>No users yet</Text>
                    </View>
                )}
            </View>

            {/* Pending Items */}
            {(stats.pending_lost_items > 0 || stats.pending_found_items > 0 || stats.pending_matches > 0) && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Pending Approvals</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('AdminItems', { status: 'pending' })}>
                            <Text style={styles.viewAllText}>Review →</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.pendingStats}>
                        <View style={styles.pendingCard}>
                            <Icon name="alert-circle" size={24} color="#ef4444" />
                            <Text style={styles.pendingNumber}>{stats.pending_lost_items || 0}</Text>
                            <Text style={styles.pendingLabel}>Lost Items</Text>
                        </View>
                        <View style={styles.pendingCard}>
                            <Icon name="checkmark-circle" size={24} color="#10b981" />
                            <Text style={styles.pendingNumber}>{stats.pending_found_items || 0}</Text>
                            <Text style={styles.pendingLabel}>Found Items</Text>
                        </View>
                        <View style={styles.pendingCard}>
                            <Icon name="git-compare" size={24} color="#f59e0b" />
                            <Text style={styles.pendingNumber}>{stats.pending_matches || 0}</Text>
                            <Text style={styles.pendingLabel}>Matches</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Quick Actions */}
            <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.addUserButton]}
                        onPress={() => navigation.navigate('AdminCreateUser')}
                    >
                        <Icon name="person-add" size={20} color="#fff" />
                        <Text style={styles.actionText}>Add User</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.itemsButton]}
                        onPress={() => navigation.navigate('AdminItems')}
                    >
                        <Icon name="cube" size={20} color="#fff" />
                        <Text style={styles.actionText}>Manage Items</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.matchesButton]}
                        onPress={() => navigation.navigate('AdminMatches')}
                    >
                        <Icon name="git-compare" size={20} color="#fff" />
                        <Text style={styles.actionText}>View Matches</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#faf9fe',
    },
    header: {
        backgroundColor: '#1e1b2f',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 14,
        color: '#b4adcf',
        marginBottom: 4,
    },
    nameText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    logoutButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
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
        minWidth: '45%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#edeef5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 2,
    },
    statIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconPurple: {
        backgroundColor: '#ede9fe',
    },
    iconGreen: {
        backgroundColor: '#d1fae5',
    },
    iconOrange: {
        backgroundColor: '#fef3c7',
    },
    iconRed: {
        backgroundColor: '#fee2e2',
    },
    iconBlue: {
        backgroundColor: '#dbeafe',
    },
    iconTeal: {
        backgroundColor: '#ccfbf1',
    },
    iconPink: {
        backgroundColor: '#fce7f3',
    },
    statContent: {
        flex: 1,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e1b2f',
    },
    statLabel: {
        fontSize: 12,
        color: '#5b5b7a',
        marginTop: 2,
    },
    statTrend: {
        marginTop: 4,
    },
    trendText: {
        fontSize: 10,
        color: '#7c3aed',
    },
    section: {
        backgroundColor: '#fff',
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#edeef5',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e1b2f',
    },
    viewAllText: {
        fontSize: 12,
        color: '#7c3aed',
        fontWeight: '600',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#edeef5',
    },
    userAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#7c3aed',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    adminAvatar: {
        backgroundColor: '#f59e0b',
    },
    userAvatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e1b2f',
    },
    userEmail: {
        fontSize: 12,
        color: '#5b5b7a',
        marginTop: 2,
    },
    roleBadge: {
        marginTop: 2,
    },
    userRole: {
        fontSize: 10,
        color: '#7c3aed',
        fontWeight: '600',
    },
    adminRoleText: {
        color: '#f59e0b',
    },
    userDate: {
        fontSize: 11,
        color: '#5b5b7a',
    },
    emptyState: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#5b5b7a',
        marginTop: 8,
    },
    pendingStats: {
        flexDirection: 'row',
        gap: 12,
    },
    pendingCard: {
        flex: 1,
        backgroundColor: '#faf9fe',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#edeef5',
    },
    pendingNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e1b2f',
        marginTop: 8,
    },
    pendingLabel: {
        fontSize: 11,
        color: '#5b5b7a',
        marginTop: 4,
    },
    actionsSection: {
        backgroundColor: '#fff',
        marginTop: 16,
        marginBottom: 24,
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    addUserButton: {
        backgroundColor: '#7c3aed',
    },
    itemsButton: {
        backgroundColor: '#10b981',
    },
    matchesButton: {
        backgroundColor: '#f59e0b',
    },
    actionText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
});