import Icon from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'; // ScrollView is not needed here
import { adminAPI } from '../../api/admin';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function AdminMatchesScreen({ navigation }) {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');

    const loadMatches = async () => {
        try {
            let response;
            if (filter === 'pending') {
                response = await adminAPI.getPendingMatches();
            } else {
                response = await adminAPI.getMatches();
            }
            setMatches(response.data?.matches || response.data?.data || []);
        } catch (error) {
            console.error('Error loading matches:', error);
            if (error.response?.status === 401) {
                Alert.alert('Session Expired', 'Please login again');
            } else {
                Alert.alert('Error', 'Failed to load matches');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadMatches();
    }, [filter]);

    const onRefresh = () => {
        setRefreshing(true);
        loadMatches();
    };

    const handleConfirmMatch = async (matchId) => {
        Alert.alert(
            'Confirm Match',
            'Are you sure you want to confirm this match?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            await adminAPI.bulkUpdateMatches([matchId], 'confirmed');
                            Alert.alert('Success', 'Match confirmed successfully');
                            loadMatches();
                        } catch (error) {
                            console.error('Confirm error:', error);
                            Alert.alert('Error', 'Failed to confirm match');
                        }
                    },
                },
            ]
        );
    };

    const handleRejectMatch = async (matchId) => {
        Alert.alert(
            'Reject Match',
            'Are you sure you want to reject this match?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await adminAPI.bulkUpdateMatches([matchId], 'rejected');
                            Alert.alert('Success', 'Match rejected successfully');
                            loadMatches();
                        } catch (error) {
                            console.error('Reject error:', error);
                            Alert.alert('Error', 'Failed to reject match');
                        }
                    },
                },
            ]
        );
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed': return '#10b981';
            case 'pending': return '#f59e0b';
            case 'rejected': return '#ef4444';
            default: return '#5b5b7a';
        }
    };

    const getStatusBgColor = (status) => {
        switch (status) {
            case 'confirmed': return '#d1fae5';
            case 'pending': return '#fef3c7';
            case 'rejected': return '#fee2e2';
            default: return '#f0f0f0';
        }
    };

    const renderMatch = ({ item }) => (
        <TouchableOpacity
            style={styles.matchCard}
            onPress={() => navigation.navigate('MatchDetail', { id: item.id })}
        >
            <View style={styles.matchHeader}>
                <View style={styles.matchScore}>
                    <Text style={styles.matchScoreText}>{item.match_score}% Match</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(item.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status?.toUpperCase()}
                    </Text>
                </View>
            </View>
            <View style={styles.itemsContainer}>
                <View style={styles.itemBox}>
                    <Text style={styles.itemLabel}>Lost:</Text>
                    <Text style={styles.itemName} numberOfLines={1}>{item.lost_item?.item_name}</Text>
                    <Text style={styles.itemUser}>by {item.lost_item?.user?.name}</Text>
                </View>
                <Icon name="arrow-forward" size={18} color="#5b5b7a" />
                <View style={styles.itemBox}>
                    <Text style={styles.itemLabel}>Found:</Text>
                    <Text style={styles.itemName} numberOfLines={1}>{item.found_item?.item_name}</Text>
                    <Text style={styles.itemUser}>by {item.found_item?.user?.name}</Text>
                </View>
            </View>
            <Text style={styles.matchDate}>
                {new Date(item.created_at).toLocaleDateString()}
            </Text>
            {item.status === 'pending' && (
                <View style={styles.matchActions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.confirmBtn]}
                        onPress={() => handleConfirmMatch(item.id)}
                    >
                        <Icon name="checkmark" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleRejectMatch(item.id)}
                    >
                        <Icon name="close" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>
                </View>
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return <LoadingSpinner />;
    }

    const filters = [
        { key: 'all', label: 'All Matches' },
        { key: 'pending', label: 'Pending' },
        { key: 'confirmed', label: 'Confirmed' },
        { key: 'rejected', label: 'Rejected' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.filterContainer}>
                {filters.map((item) => (
                    <TouchableOpacity
                        key={item.key}
                        style={[styles.filterTab, filter === item.key && styles.filterTabActive]}
                        onPress={() => setFilter(item.key)}
                    >
                        <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={matches}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderMatch}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#7c3aed']}
                        tintColor="#7c3aed"
                    />
                }
                contentContainerStyle={matches.length === 0 && styles.emptyContainer}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Icon name="git-compare-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>No matches found</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#faf9fe',
    },
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#edeef5',
        gap: 8,
    },
    filterTab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 24,
    },
    filterTabActive: {
        backgroundColor: '#7c3aed',
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#5b5b7a',
    },
    filterTextActive: {
        color: '#fff',
    },
    matchCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#edeef5',
    },
    matchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    matchScore: {
        backgroundColor: '#ede9fe',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    matchScoreText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#7c3aed',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    itemsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 12,
    },
    itemBox: {
        flex: 1,
    },
    itemLabel: {
        fontSize: 10,
        color: '#5b5b7a',
        marginBottom: 2,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e1b2f',
    },
    itemUser: {
        fontSize: 10,
        color: '#5b5b7a',
        marginTop: 2,
    },
    matchDate: {
        fontSize: 10,
        color: '#5b5b7a',
        marginBottom: 12,
    },
    matchActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    confirmBtn: {
        backgroundColor: '#10b981',
    },
    rejectBtn: {
        backgroundColor: '#ef4444',
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    empty: {
        alignItems: 'center',
        padding: 48,
    },
    emptyContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#5b5b7a',
    },
});