// src/screens/admin/AdminItemsScreen.js
import Icon from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { adminAPI } from '../../api/admin';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function AdminItemsScreen({ navigation }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    const loadItems = async () => {
        try {
            let response;
            if (filterType === 'pending') {
                response = await adminAPI.getPendingItems({ search: searchQuery });
            } else if (filterType === 'lost') {
                response = await adminAPI.getLostItems({ search: searchQuery });
            } else if (filterType === 'found') {
                response = await adminAPI.getFoundItems({ search: searchQuery });
            } else {
                response = await adminAPI.getItems({ search: searchQuery });
            }
            
            const itemsData = response.data?.items || response.data?.data || [];
            setItems(itemsData);
        } catch (error) {
            console.error('Error loading items:', error);
            if (error.response?.status === 401) {
                Alert.alert('Session Expired', 'Please login again');
            } else {
                Alert.alert('Error', 'Failed to load items');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, [filterType, searchQuery]);

    const onRefresh = () => {
        setRefreshing(true);
        loadItems();
    };

    const handleApproveItem = async (itemId, type) => {
        Alert.alert(
            'Approve Item',
            'Are you sure you want to approve this item?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        try {
                            if (type === 'lost') {
                                await adminAPI.approveLostItem(itemId);
                            } else {
                                await adminAPI.approveFoundItem(itemId);
                            }
                            Alert.alert('Success', 'Item approved successfully');
                            loadItems();
                        } catch (error) {
                            console.error('Approve error:', error);
                            Alert.alert('Error', 'Failed to approve item');
                        }
                    },
                },
            ]
        );
    };

    const handleRejectItem = async (itemId, type) => {
        Alert.alert(
            'Reject Item',
            'Are you sure you want to reject this item?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (type === 'lost') {
                                await adminAPI.rejectLostItem(itemId);
                            } else {
                                await adminAPI.rejectFoundItem(itemId);
                            }
                            Alert.alert('Success', 'Item rejected successfully');
                            loadItems();
                        } catch (error) {
                            console.error('Reject error:', error);
                            Alert.alert('Error', 'Failed to reject item');
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteItem = async (itemId, type, itemName) => {
        Alert.alert(
            'Delete Item',
            `Are you sure you want to delete "${itemName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await adminAPI.bulkDeleteItems([itemId], type);
                            Alert.alert('Success', 'Item deleted successfully');
                            loadItems();
                        } catch (error) {
                            console.error('Delete error:', error);
                            Alert.alert('Error', 'Failed to delete item');
                        }
                    },
                },
            ]
        );
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return '#10b981';
            case 'pending': return '#f59e0b';
            case 'rejected': return '#ef4444';
            case 'found':
            case 'claimed': return '#3b82f6';
            case 'returned': return '#7c3aed';
            default: return '#5b5b7a';
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.itemCard}
            onPress={() => navigation.navigate('ItemDetail', { type: item.type || (item.lost_location ? 'lost' : 'found'), id: item.id })}
        >
            <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.item_name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>
            <Text style={styles.itemCategory}>{item.category?.toUpperCase()}</Text>
            <Text style={styles.itemUser}>Reported by: {item.user?.name}</Text>
            <Text style={styles.itemDate}>
                {new Date(item.created_at).toLocaleDateString()}
            </Text>
            <View style={styles.itemActions}>
                {item.status === 'pending' && (
                    <>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.approveBtn]}
                            onPress={() => handleApproveItem(item.id, item.type || (item.lost_location ? 'lost' : 'found'))}
                        >
                            <Icon name="checkmark" size={16} color="#fff" />
                            <Text style={styles.actionBtnText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => handleRejectItem(item.id, item.type || (item.lost_location ? 'lost' : 'found'))}
                        >
                            <Icon name="close" size={16} color="#fff" />
                            <Text style={styles.actionBtnText}>Reject</Text>
                        </TouchableOpacity>
                    </>
                )}
                <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDeleteItem(item.id, item.type || (item.lost_location ? 'lost' : 'found'), item.item_name)}
                >
                    <Icon name="trash" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Delete</Text>
                </TouchableOpacity>
            </View>
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
                    placeholder="Search items..."
                    placeholderTextColor="#5b5b7a"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                <TouchableOpacity onPress={() => setShowFilters(true)}>
                    <Icon name="options-outline" size={24} color="#5b5b7a" />
                </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                <TouchableOpacity
                    style={[styles.chip, filterType === 'all' && styles.chipActive]}
                    onPress={() => setFilterType('all')}
                >
                    <Text style={[styles.chipText, filterType === 'all' && styles.chipTextActive]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.chip, filterType === 'pending' && styles.chipActive]}
                    onPress={() => setFilterType('pending')}
                >
                    <Text style={[styles.chipText, filterType === 'pending' && styles.chipTextActive]}>Pending</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.chip, filterType === 'lost' && styles.chipActive]}
                    onPress={() => setFilterType('lost')}
                >
                    <Text style={[styles.chipText, filterType === 'lost' && styles.chipTextActive]}>Lost</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.chip, filterType === 'found' && styles.chipActive]}
                    onPress={() => setFilterType('found')}
                >
                    <Text style={[styles.chipText, filterType === 'found' && styles.chipTextActive]}>Found</Text>
                </TouchableOpacity>
            </ScrollView>

            <FlatList
                data={items}
                keyExtractor={(item) => `${item.id}-${item.type}`}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#7c3aed']}
                        tintColor="#7c3aed"
                    />
                }
                contentContainerStyle={items.length === 0 && styles.emptyContainer}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Icon name="cube-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>No items found</Text>
                    </View>
                }
            />

            {/* Filters Modal */}
            <Modal visible={showFilters} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Filter Items</Text>
                        <TouchableOpacity
                            style={styles.filterOption}
                            onPress={() => {
                                setFilterType('all');
                                setShowFilters(false);
                            }}
                        >
                            <Text style={styles.filterOptionText}>All Items</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.filterOption}
                            onPress={() => {
                                setFilterType('pending');
                                setShowFilters(false);
                            }}
                        >
                            <Text style={styles.filterOptionText}>Pending Approval</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.filterOption}
                            onPress={() => {
                                setFilterType('lost');
                                setShowFilters(false);
                            }}
                        >
                            <Text style={styles.filterOptionText}>Lost Items</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.filterOption}
                            onPress={() => {
                                setFilterType('found');
                                setShowFilters(false);
                            }}
                        >
                            <Text style={styles.filterOptionText}>Found Items</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowFilters(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    filterChips: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    chip: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 24,
        backgroundColor: '#fff',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#edeef5',
    },
    chipActive: {
        backgroundColor: '#7c3aed',
        borderColor: '#7c3aed',
    },
    chipText: {
        fontSize: 14,
        color: '#5b5b7a',
    },
    chipTextActive: {
        color: '#fff',
    },
    itemCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#edeef5',
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e1b2f',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: 'bold',
    },
    itemCategory: {
        fontSize: 12,
        color: '#7c3aed',
        marginBottom: 4,
    },
    itemUser: {
        fontSize: 12,
        color: '#5b5b7a',
        marginBottom: 4,
    },
    itemDate: {
        fontSize: 11,
        color: '#5b5b7a',
        marginBottom: 12,
    },
    itemActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
        flex: 1,
    },
    approveBtn: {
        backgroundColor: '#10b981',
    },
    rejectBtn: {
        backgroundColor: '#ef4444',
    },
    deleteBtn: {
        backgroundColor: '#f59e0b',
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e1b2f',
        marginBottom: 16,
    },
    filterOption: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#edeef5',
    },
    filterOptionText: {
        fontSize: 16,
        color: '#1e1b2f',
    },
    closeButton: {
        marginTop: 16,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#5b5b7a',
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