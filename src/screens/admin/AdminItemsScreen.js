import Icon from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView, // Add this import
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function AdminItemsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, lost, found, pending
  const [showFilters, setShowFilters] = useState(false);

  const loadItems = async () => {
    try {
      let endpoint = '/admin/items';
      if (filterType === 'pending') {
        endpoint = '/admin/items/pending';
      } else if (filterType === 'lost') {
        endpoint = '/admin/items/lost';
      } else if (filterType === 'found') {
        endpoint = '/admin/items/found';
      }
      
      const response = await api.get(endpoint, {
        params: { search: searchQuery }
      });
      setItems(response.data.items || []);
    } catch (error) {
      console.error('Error loading items:', error);
      Alert.alert('Error', 'Failed to load items');
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
              await api.post(`/${type}-items/${itemId}/approve`);
              Alert.alert('Success', 'Item approved successfully');
              loadItems();
            } catch (error) {
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
              await api.post(`/${type}-items/${itemId}/reject`);
              Alert.alert('Success', 'Item rejected successfully');
              loadItems();
            } catch (error) {
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
              await api.delete(`/${type}-items/${itemId}`);
              Alert.alert('Success', 'Item deleted successfully');
              loadItems();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#4caf50';
      case 'pending': return '#ff9800';
      case 'rejected': return '#f44336';
      case 'found':
      case 'claimed': return '#2196f3';
      case 'returned': return '#9c27b0';
      default: return '#999';
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => navigation.navigate('ItemDetail', { type: item.type, id: item.id })}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.item_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.itemCategory}>{item.category}</Text>
      <Text style={styles.itemUser}>Reported by: {item.user?.name}</Text>
      <Text style={styles.itemDate}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
      <View style={styles.itemActions}>
        {item.status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => handleApproveItem(item.id, item.type)}
            >
              <Icon name="checkmark" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleRejectItem(item.id, item.type)}
            >
              <Icon name="close" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDeleteItem(item.id, item.type, item.item_name)}
        >
          <Icon name="trash" size={18} color="#fff" />
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
        <Icon name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={() => setShowFilters(true)}>
          <Icon name="options-outline" size={24} color="#666" />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
              <Text>All Items</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setFilterType('pending');
                setShowFilters(false);
              }}
            >
              <Text>Pending Approval</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setFilterType('lost');
                setShowFilters(false);
              }}
            >
              <Text>Lost Items</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setFilterType('found');
                setShowFilters(false);
              }}
            >
              <Text>Found Items</Text>
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
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterChips: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#00f0c8',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextActive: {
    color: '#fff',
  },
  itemCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  itemCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemUser: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 11,
    color: '#999',
    marginBottom: 12,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  approveBtn: {
    backgroundColor: '#4caf50',
  },
  rejectBtn: {
    backgroundColor: '#f44336',
  },
  deleteBtn: {
    backgroundColor: '#ff9800',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  filterOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
});