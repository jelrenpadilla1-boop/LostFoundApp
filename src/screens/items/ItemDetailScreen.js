// src/screens/items/ItemDetailScreen.js
import Icon from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { foundItemsAPI, lostItemsAPI } from '../../api/items';
import { useAuth } from '../../context/AuthContext';

export default function ItemDetailScreen({ route, navigation }) {
  const { type, id } = route.params;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const { user, isAdmin, logout } = useAuth();

  useFocusEffect(
    useCallback(() => {
      loadItem();
    }, [id, type])
  );

  const loadItem = async () => {
    try {
      setLoading(true);
      console.log(`Loading ${type} item with ID: ${id}`);
      
      // Use getOne method instead of getLostItem/getFoundItem
      let response;
      if (type === 'lost') {
        response = await lostItemsAPI.getOne(id);
      } else {
        response = await foundItemsAPI.getOne(id);
      }
      
      console.log('Item response status:', response.status);
      
      // Handle response data
      let itemData;
      if (response.data && response.data.data) {
        itemData = response.data.data;
        setMatches(response.data.matches || []);
      } else if (response.data && response.data.item) {
        itemData = response.data.item;
      } else {
        itemData = response.data;
      }
      
      console.log('Item loaded:', itemData?.item_name);
      setItem(itemData);
      
    } catch (error) {
      console.error('Error loading item:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again', [
          { text: 'OK', onPress: () => logout() }
        ]);
      } else if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'You don\'t have permission to view this item');
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to load item details');
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (type === 'lost') {
                await lostItemsAPI.delete(id);
              } else {
                await foundItemsAPI.delete(id);
              }
              Alert.alert('Success', 'Item deleted successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          }
        }
      ]
    );
  };

  const handleMarkAsFound = async () => {
    Alert.alert(
      'Mark as Found',
      'Have you found this item? This will update the status and notify potential matches.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await lostItemsAPI.update(id, { status: 'found' });
              Alert.alert('Success', 'Item marked as found');
              loadItem();
            } catch (error) {
              console.error('Error marking item:', error);
              Alert.alert('Error', 'Failed to update item status');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'found': return '#3b82f6';
      case 'returned': return '#7c3aed';
      case 'rejected': return '#ef4444';
      default: return '#5b5b7a';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'approved': return 'checkmark-circle';
      case 'found': return 'checkmark-done';
      case 'returned': return 'home';
      case 'rejected': return 'close-circle';
      default: return 'information-circle';
    }
  };

  const openLocation = () => {
    const location = item?.lost_location || item?.found_location;
    const lat = item?.latitude;
    const lng = item?.longitude;
    
    if (lat && lng) {
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}`,
      });
      Linking.openURL(url);
    } else if (location) {
      const url = `https://maps.google.com/?q=${encodeURIComponent(location)}`;
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading item details...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <Icon name="alert-circle-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>Item not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = user?.id === item.user_id;
  const canEdit = isOwner || isAdmin;
  const canDelete = isOwner || isAdmin;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Image Section */}
      <View style={styles.imageContainer}>
        {item.photo ? (
          <Image 
            source={{ uri: item.photo.startsWith('http') ? item.photo : `http://10.214.114.132:8092/storage/${item.photo}` }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImage}>
            <Icon name="image-outline" size={64} color="#ccc" />
            <Text style={styles.noImageText}>No Image Available</Text>
          </View>
        )}
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Icon name={getStatusIcon(item.status)} size={14} color="#fff" />
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        <Text style={styles.title}>{item.item_name}</Text>
        
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon name="pricetag-outline" size={16} color="#5b5b7a" />
            <Text style={styles.metaText}>{item.category?.toUpperCase()}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="calendar-outline" size={16} color="#5b5b7a" />
            <Text style={styles.metaText}>
              {type === 'lost' ? 'Lost: ' : 'Found: '}
              {new Date(item.date_lost || item.date_found).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>

        {/* Location */}
        {(item.lost_location || item.found_location || (item.latitude && item.longitude)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <TouchableOpacity style={styles.locationCard} onPress={openLocation}>
              <Icon name="location-outline" size={24} color="#7c3aed" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationText}>
                  {item.lost_location || item.found_location || `${item.latitude}, ${item.longitude}`}
                </Text>
                <Text style={styles.locationAction}>Tap to view on map →</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Reporter Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reported By</Text>
          <View style={styles.reporterCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.user?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.reporterInfo}>
              <Text style={styles.reporterName}>{item.user?.name || 'Unknown User'}</Text>
              <Text style={styles.reporterDate}>
                Reported {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            {!isOwner && item.user && (
              <TouchableOpacity 
                style={styles.messageButton}
                onPress={() => navigation.navigate('Chat', { userId: item.user.id })}
              >
                <Icon name="chatbubble-outline" size={20} color="#7c3aed" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Matches Section (for lost items) */}
        {type === 'lost' && matches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Potential Matches ({matches.length})</Text>
            {matches.map((match) => (
              <TouchableOpacity 
                key={match.id}
                style={styles.matchCard}
                onPress={() => navigation.navigate('MatchDetail', { id: match.id })}
              >
                <View style={styles.matchHeader}>
                  <View style={[styles.matchScore, 
                    match.match_score >= 80 ? styles.scoreHigh : 
                    match.match_score >= 60 ? styles.scoreMedium : styles.scoreLow
                  ]}>
                    <Text style={styles.scoreText}>{match.match_score}%</Text>
                  </View>
                  <Text style={styles.matchItemName}>{match.found_item?.item_name}</Text>
                </View>
                <Text style={styles.matchDescription} numberOfLines={2}>
                  {match.found_item?.description}
                </Text>
                <Icon name="chevron-forward" size={16} color="#5b5b7a" style={styles.matchArrow} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        {(canEdit || canDelete || (type === 'lost' && isOwner && item.status === 'approved')) && (
          <View style={styles.actionContainer}>
            {canEdit && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.editButton]}
                onPress={() => navigation.navigate('EditItem', { type, id })}
              >
                <Icon name="create-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
            
            {type === 'lost' && isOwner && item.status === 'approved' && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.foundButton]}
                onPress={handleMarkAsFound}
              >
                <Icon name="checkmark-done-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Mark as Found</Text>
              </TouchableOpacity>
            )}
            
            {canDelete && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <Icon name="trash-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9fe',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#faf9fe',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#5b5b7a',
    fontSize: 14,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#5b5b7a',
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#7c3aed',
    borderRadius: 25,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  noImageText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e1b2f',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#5b5b7a',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e1b2f',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#5b5b7a',
    lineHeight: 22,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#edeef5',
  },
  locationInfo: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: '#1e1b2f',
    marginBottom: 4,
  },
  locationAction: {
    fontSize: 12,
    color: '#7c3aed',
  },
  reporterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#edeef5',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  reporterInfo: {
    flex: 1,
  },
  reporterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e1b2f',
    marginBottom: 4,
  },
  reporterDate: {
    fontSize: 12,
    color: '#5b5b7a',
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#edeef5',
    marginBottom: 12,
    position: 'relative',
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  matchScore: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  scoreHigh: {
    backgroundColor: '#d1fae5',
  },
  scoreMedium: {
    backgroundColor: '#fef3c7',
  },
  scoreLow: {
    backgroundColor: '#dbeafe',
  },
  scoreText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e1b2f',
  },
  matchItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e1b2f',
    flex: 1,
  },
  matchDescription: {
    fontSize: 12,
    color: '#5b5b7a',
    marginBottom: 8,
  },
  matchArrow: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  editButton: {
    backgroundColor: '#7c3aed',
  },
  foundButton: {
    backgroundColor: '#10b981',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});