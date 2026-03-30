// src/screens/admin/AdminUsersScreen.js
import Icon from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { adminAPI } from '../../api/admin';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function AdminUsersScreen({ navigation }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const loadUsers = useCallback(async () => {
        try {
            const response = await adminAPI.getUsers({ search: searchQuery || undefined });
            setUsers(response.data?.users || []);
        } catch (error) {
            if (error.response?.status === 401) {
                Alert.alert('Session Expired', 'Please login again');
            } else if (error.response?.status === 403) {
                Alert.alert('Access Denied', 'You do not have permission to view users');
            } else {
                console.error('Error loading users:', error);
                Alert.alert('Error', 'Failed to load users');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadUsers();
        }, 400);
        return () => clearTimeout(timer);
    }, [loadUsers]);

    const onRefresh = () => {
        setRefreshing(true);
        loadUsers();
    };

    const handleDeleteUser = (userId, userName) => {
        Alert.alert(
            'Delete User',
            `Are you sure you want to delete "${userName}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await adminAPI.deleteUser(userId);
                            Alert.alert('Success', 'User deleted successfully');
                            loadUsers();
                        } catch (error) {
                            console.error('Delete user error:', error);
                            Alert.alert('Error', 'Failed to delete user');
                        }
                    },
                },
            ]
        );
    };

    const renderUser = ({ item }) => (
        <TouchableOpacity
            style={styles.userCard}
            onPress={() => navigation.navigate('AdminUserDetail', { userId: item.id })}
            activeOpacity={0.7}
        >
            <View style={[styles.userAvatar, item.role === 'admin' && styles.adminAvatar]}>
                <Text style={styles.avatarText}>
                    {item.name?.charAt(0).toUpperCase() ?? '?'}
                </Text>
            </View>
            <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                <View style={styles.roleBadge}>
                    <Text style={[styles.userRole, item.role === 'admin' && styles.adminRoleText]}>
                        {item.role?.toUpperCase() ?? 'USER'}
                    </Text>
                </View>
            </View>
            <TouchableOpacity
                onPress={() => handleDeleteUser(item.id, item.name)}
                style={styles.deleteButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Icon name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.searchBar}>
                <Icon name="search" size={20} color="#5b5b7a" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search users..."
                    placeholderTextColor="#5b5b7a"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Icon name="close-circle" size={18} color="#5b5b7a" />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={users}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderUser}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#7c3aed']}
                        tintColor="#7c3aed"
                    />
                }
                contentContainerStyle={users.length === 0 && styles.emptyContainer}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Icon name="people-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>
                            {searchQuery ? `No users matching "${searchQuery}"` : 'No users found'}
                        </Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AdminCreateUser')}
            >
                <Icon name="add" size={24} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#faf9fe',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#edeef5',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1e1b2f',
    },
    emptyContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginVertical: 6,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#edeef5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1,
    },
    userAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#7c3aed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    adminAvatar: {
        backgroundColor: '#f59e0b',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    userInfo: {
        flex: 1,
        marginLeft: 14,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e1b2f',
    },
    userEmail: {
        fontSize: 12,
        color: '#5b5b7a',
        marginTop: 2,
    },
    roleBadge: {
        marginTop: 4,
    },
    userRole: {
        fontSize: 10,
        color: '#7c3aed',
        fontWeight: '600',
    },
    adminRoleText: {
        color: '#f59e0b',
    },
    deleteButton: {
        padding: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        backgroundColor: '#7c3aed',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    empty: {
        alignItems: 'center',
        padding: 48,
        flex: 1,
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#5b5b7a',
        textAlign: 'center',
    },
});