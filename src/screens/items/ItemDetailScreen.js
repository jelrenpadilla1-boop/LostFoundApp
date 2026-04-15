// src/screens/items/ItemDetailScreen.js
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { foundItemsAPI, lostItemsAPI } from '../../api/items';
import { matchesAPI } from '../../api/matches';
import { messagesAPI } from '../../api/messages';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'http://10.116.78.132:8092';

export default function ItemDetailScreen({ route, navigation }) {
  const { type, id } = route.params;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [matches, setMatches] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [claimDetails, setClaimDetails] = useState('');
  const [imageError, setImageError] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const { isDark } = useTheme();

  useFocusEffect(
    useCallback(() => {
      loadItem();
    }, [id, type])
  );

  // Safe number formatter helper
  const formatCoordinate = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value.toFixed(6);
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      return parseFloat(value).toFixed(6);
    }
    return null;
  };

  const getImageUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http')) return photoPath;
    let cleanPath = photoPath;
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    return `${API_BASE_URL}/storage/${cleanPath}`;
  };

  const loadItem = async () => {
    try {
      setLoading(true);
      console.log(`Loading ${type} item with ID: ${id}`);

      let response;
      if (type === 'lost') {
        response = await lostItemsAPI.getOne(id);
      } else {
        response = await foundItemsAPI.getOne(id);
      }

      let itemData;
      let matchesData = [];
      let ownerFromServer = null;

      if (response.data?.data) {
        itemData = response.data.data;
        matchesData = response.data.matches || [];
        ownerFromServer = response.data.is_owner;
      } else if (response.data?.item) {
        itemData = response.data.item;
        matchesData = response.data.matches || [];
        ownerFromServer = response.data.is_owner;
      } else {
        itemData = response.data;
        matchesData = response.data?.matches || [];
        ownerFromServer = response.data?.is_owner;
      }

      setItem(itemData);

      if (ownerFromServer !== null && ownerFromServer !== undefined) {
        setIsOwner(ownerFromServer);
      } else {
        setIsOwner(String(user?.id) === String(itemData?.user_id));
      }

      // If matches weren't included in the response, fetch them separately
      if (matchesData.length === 0) {
        try {
          if (type === 'lost') {
            const matchRes = await matchesAPI.getMatchesForLostItem(id);
            matchesData =
              matchRes.data?.matches ||
              matchRes.data?.data ||
              (Array.isArray(matchRes.data) ? matchRes.data : []);
          } else {
            const matchRes = await matchesAPI.getMyMatches();
            let all = [];
            if (matchRes.data?.data) {
              all = matchRes.data.data;
            } else if (matchRes.data?.matches) {
              all = matchRes.data.matches;
            } else if (Array.isArray(matchRes.data)) {
              all = matchRes.data;
            }
            
            matchesData = all.filter((m) => {
              const matchFoundItemId = String(m.found_item_id || m.found_item?.id || m.foundItem?.id);
              const currentItemId = String(id);
              return matchFoundItemId === currentItemId;
            });
          }
        } catch (matchErr) {
          console.log('Could not load matches:', matchErr?.response?.status);
        }
      }

      setMatches(matchesData);
      setImageError(false);

    } catch (error) {
      console.error('Error loading item:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again', [
          { text: 'OK', onPress: () => logout() }
        ]);
      } else if (error.response?.status === 403) {
        Alert.alert('Access Denied', "You don't have permission to view this item");
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
    if (deleting) return;
    
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item?.item_name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              console.log(`Deleting ${type} item with ID: ${id}`);
              
              let response;
              if (type === 'lost') {
                response = await lostItemsAPI.delete(id);
              } else {
                response = await foundItemsAPI.delete(id);
              }
              
              console.log('Delete response:', response.data);
              
              if (response.data?.success) {
                Alert.alert('Success', response.data.message || 'Item deleted successfully');
                navigation.goBack();
              } else {
                Alert.alert('Error', response.data?.message || 'Failed to delete item');
              }
            } catch (error) {
              console.error('Error deleting item:', error);
              console.error('Error response:', error.response?.data);
              
              let errorMessage = 'Failed to delete item. Please try again.';
              
              if (error.response?.status === 403) {
                errorMessage = 'You do not have permission to delete this item.';
              } else if (error.response?.status === 404) {
                errorMessage = 'Item not found.';
              } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              }
              
              Alert.alert('Error', errorMessage);
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  // Mark as Claimed for Found Items
  const handleMarkAsClaimed = async () => {
    if (!claimDetails.trim()) {
      Alert.alert('Error', 'Please provide claim details');
      return;
    }
    
    Alert.alert(
      'Mark as Claimed',
      `Are you sure you want to mark "${item?.item_name}" as claimed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            if (updating) return;
            
            try {
              setUpdating(true);
              console.log(`Marking found item ${id} as claimed`);
              
              const response = await foundItemsAPI.markAsClaimed(id, claimDetails);
              
              console.log('Mark as claimed response:', response.data);
              
              if (response.data?.success) {
                Alert.alert('Success', response.data.message || 'Item marked as claimed successfully!');
                setClaimModalVisible(false);
                setClaimDetails('');
                loadItem();
              } else {
                Alert.alert('Error', response.data?.message || 'Failed to mark item as claimed');
              }
            } catch (error) {
              console.error('Error marking item as claimed:', error);
              console.error('Error response:', error.response?.data);
              Alert.alert('Error', error.response?.data?.message || 'Failed to mark item as claimed');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  // Mark as Found for Lost Items
  const handleMarkAsFound = async () => {
    Alert.alert(
      'Mark as Found',
      `Are you sure you want to mark "${item?.item_name}" as found?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            if (updating) return;
            
            try {
              setUpdating(true);
              console.log(`Marking lost item ${id} as found`);
              
              const response = await lostItemsAPI.markAsFound(id);
              
              console.log('Mark as found response:', response.data);
              
              if (response.data?.success) {
                Alert.alert('Success', response.data.message || 'Item marked as found successfully!');
                loadItem();
              } else {
                Alert.alert('Error', response.data?.message || 'Failed to mark item as found');
              }
            } catch (error) {
              console.error('Error marking item as found:', error);
              console.error('Error response:', error.response?.data);
              Alert.alert('Error', error.response?.data?.message || 'Failed to mark item as found');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleApprove = async () => {
    Alert.alert(
      'Approve Item',
      `Are you sure you want to approve "${item?.item_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              if (type === 'lost') {
                await lostItemsAPI.approve(id);
              } else {
                await foundItemsAPI.approve(id);
              }
              Alert.alert('Success', 'Item approved successfully');
              loadItem();
            } catch (error) {
              console.error('Error approving item:', error);
              Alert.alert('Error', 'Failed to approve item');
            }
          }
        }
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a rejection reason');
      return;
    }
    
    Alert.alert(
      'Reject Item',
      `Are you sure you want to reject "${item?.item_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              if (type === 'lost') {
                await lostItemsAPI.reject(id, rejectionReason);
              } else {
                await foundItemsAPI.reject(id, rejectionReason);
              }
              Alert.alert('Success', 'Item rejected successfully');
              setRejectModalVisible(false);
              setRejectionReason('');
              loadItem();
            } catch (error) {
              console.error('Error rejecting item:', error);
              Alert.alert('Error', 'Failed to reject item');
            }
          }
        }
      ]
    );
  };

  // FIXED: Handle sending message to item owner/finder
  const handleSendMessage = async () => {
    if (!item?.user) {
      Alert.alert('Error', 'User information not available');
      return;
    }
    
    if (startingChat) return;
    
    setStartingChat(true);
    
    try {
      console.log('Starting conversation with user:', item.user.id);
      const startResponse = await messagesAPI.startConversation(item.user.id);
      console.log('Start conversation response:', startResponse.data);
      
      let conversationId = null;
      if (startResponse.data?.data?.id) {
        conversationId = startResponse.data.data.id;
      } else if (startResponse.data?.conversation?.id) {
        conversationId = startResponse.data.conversation.id;
      } else if (startResponse.data?.id) {
        conversationId = startResponse.data.id;
      } else if (startResponse.data?.conversation_id) {
        conversationId = startResponse.data.conversation_id;
      }
      
      if (conversationId) {
        navigation.navigate('Chat', { 
          conversationId: conversationId,
          userId: item.user.id,
          userName: item.user.name,
          userEmail: item.user.email
        });
      } else {
        Alert.alert('Error', 'Could not start conversation. Please try again.');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert('Error', error.response?.data?.message || 'Failed to start conversation. Please try again.');
    } finally {
      setStartingChat(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { color: '#f59e0b', bg: '#fef3c7', icon: 'clock', label: 'Pending' },
      approved: { color: '#10b981', bg: '#d1fae5', icon: 'check-circle', label: 'Active' },
      claimed: { color: '#10b981', bg: '#d1fae5', icon: 'handshake', label: 'Claimed' },
      returned: { color: '#7c3aed', bg: '#ede9fe', icon: 'home', label: 'Returned' },
      disposed: { color: '#5b5b7a', bg: '#f0f0f0', icon: 'trash-2', label: 'Disposed' },
      rejected: { color: '#ef4444', bg: '#fee2e2', icon: 'x-circle', label: 'Rejected' },
      found: { color: '#3b82f6', bg: '#dbeafe', icon: 'check-circle', label: 'Found' },
      recovered: { color: '#10b981', bg: '#d1fae5', icon: 'award', label: 'Recovered' },
    };
    return configs[status] || configs.pending;
  };

  const openLocation = () => {
    const location = item?.lost_location || item?.found_location;
    const lat = item?.latitude;
    const lng = item?.longitude;

    if (lat && lng && typeof lat === 'number' && typeof lng === 'number' && lat !== 0 && lng !== 0) {
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}`,
      });
      if (url) Linking.openURL(url);
    } else if (location && typeof location === 'string' && location.trim()) {
      const url = `https://maps.google.com/?q=${encodeURIComponent(location)}`;
      Linking.openURL(url);
    }
  };

  const styles = getStyles(isDark);
  const photoUrl = item?.photo ? getImageUrl(item.photo) : null;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? '#141414' : '#faf9fe' }]}>
        <ActivityIndicator size="large" color="#e50914" />
        <Text style={[styles.loadingText, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>Loading item details...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? '#141414' : '#faf9fe' }]}>
        <Feather name="alert-circle" size={64} color={isDark ? '#333333' : '#ccc'} />
        <Text style={[styles.emptyText, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>Item not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <LinearGradient colors={['#e50914', '#b20710']} style={styles.backButtonGradient}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isAdmin && !isOwner && item.status === 'pending') {
    return (
      <View style={[styles.accessDeniedContainer, { backgroundColor: isDark ? '#141414' : '#faf9fe' }]}>
        <View style={[styles.accessDeniedIcon, { backgroundColor: isDark ? 'rgba(229,9,20,0.2)' : '#fee2e2' }]}>
          <Feather name="lock" size={40} color="#ef4444" />
        </View>
        <Text style={[styles.accessDeniedTitle, { color: isDark ? '#ffffff' : '#1e1b2f' }]}>Access Denied</Text>
        <Text style={[styles.accessDeniedText, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>
          This item is pending approval and not yet visible to the public.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <LinearGradient colors={['#e50914', '#b20710']} style={styles.backButtonGradient}>
            <Text style={styles.backButtonText}>Back to Items</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  const statusConfig = getStatusConfig(item.status);
  const canEdit = isOwner || isAdmin;
  const canDelete = isOwner || isAdmin;
  const showActions = (item.status === 'pending' && (isAdmin || isOwner)) ||
                      (item.status === 'approved' && isOwner) ||
                      isAdmin;
  // Show contact button for non-owners when item is approved
  const showContactButton = !isOwner && item.status === 'approved' && item.user && item.user.id !== user?.id;

  const latFormatted = formatCoordinate(item?.latitude);
  const lngFormatted = formatCoordinate(item?.longitude);
  const hasValidCoordinates = latFormatted && lngFormatted && item?.latitude !== 0 && item?.longitude !== 0;
  const locationText = (item?.lost_location || item?.found_location || '').trim()
    || (hasValidCoordinates ? `${latFormatted}, ${lngFormatted}` : null);

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <ScrollView style={[styles.container, { backgroundColor: isDark ? '#141414' : '#faf9fe' }]} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={isDark ? ['#1a1a1a', '#141414'] : ['#ffffff', '#faf9fe']}
          style={styles.header}
        >
          {/* Header content removed as it was empty */}
        </LinearGradient>

        {/* Image Section */}
        <View style={styles.imageContainer}>
          {photoUrl ? (
            <>
              <Image
                source={{ uri: photoUrl }}
                style={styles.image}
                resizeMode="cover"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
              <TouchableOpacity 
                style={styles.imageExpandButton}
                onPress={() => setImageModalVisible(true)}
              >
                <Feather name="maximize-2" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={[styles.noImage, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
              <Feather name="image" size={48} color={isDark ? '#666666' : '#ccc'} />
              <Text style={[styles.noImageText, { color: isDark ? '#b3b3b3' : '#999' }]}>No Photo</Text>
            </View>
          )}

          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
            <Feather name={statusConfig.icon} size={12} color="#fff" />
            <Text style={styles.statusText}>{statusConfig.label}</Text>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <Text style={[styles.title, { color: isDark ? '#ffffff' : '#1e1b2f' }]}>{item.item_name}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="tag" size={14} color={isDark ? '#666666' : '#5b5b7a'} />
              <Text style={[styles.metaText, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>{item.category?.toUpperCase()}</Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={14} color={isDark ? '#666666' : '#5b5b7a'} />
              <Text style={[styles.metaText, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>
                {type === 'lost' ? 'Lost: ' : 'Found: '}
                {new Date(item.date_lost || item.date_found).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {isOwner && (
            <View style={[styles.ownerBadge, { backgroundColor: isDark ? 'rgba(229,9,20,0.2)' : '#ede9fe' }]}>
              <Feather name="star" size={10} color="#e50914" />
              <Text style={[styles.ownerBadgeText, { color: '#e50914' }]}>Your Item</Text>
            </View>
          )}

          {isAdmin && (
            <View style={[styles.adminBadge, { backgroundColor: isDark ? 'rgba(245,197,24,0.2)' : '#fef3c7' }]}>
              <Feather name="crown" size={10} color="#f59e0b" />
              <Text style={[styles.adminBadgeText, { color: '#f59e0b' }]}>Admin View</Text>
            </View>
          )}

          {/* Alerts */}
          {item.status === 'rejected' && item.rejection_reason && (isAdmin || isOwner) && (
            <View style={[styles.alertCard, styles.alertError]}>
              <Feather name="alert-circle" size={18} color="#ef4444" />
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: isDark ? '#ffffff' : '#1e1b2f' }]}>Item Rejected</Text>
                <Text style={[styles.alertText, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>{item.rejection_reason}</Text>
              </View>
            </View>
          )}

          {item.status === 'pending' && isOwner && !isAdmin && (
            <View style={[styles.alertCard, styles.alertWarning]}>
              <Feather name="clock" size={18} color="#f59e0b" />
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: isDark ? '#ffffff' : '#1e1b2f' }]}>Pending Approval</Text>
                <Text style={[styles.alertText, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>
                  Your item is awaiting admin review. It will be visible to others once approved.
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1e1b2f' }]}>Description</Text>
            <Text style={[styles.description, { 
              backgroundColor: isDark ? '#1a1a1a' : '#fff',
              borderColor: isDark ? '#333333' : '#edeef5',
              color: isDark ? '#e5e5e5' : '#5b5b7a'
            }]}>{item.description}</Text>
          </View>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={[styles.detailCard, { 
              backgroundColor: isDark ? '#1a1a1a' : '#fff',
              borderColor: isDark ? '#333333' : '#edeef5'
            }]}>
              <Text style={[styles.detailLabel, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>Category</Text>
              <Text style={[styles.detailValue, { color: isDark ? '#ffffff' : '#1e1b2f' }]}>{item.category?.toUpperCase()}</Text>
            </View>
            <View style={[styles.detailCard, { 
              backgroundColor: isDark ? '#1a1a1a' : '#fff',
              borderColor: isDark ? '#333333' : '#edeef5'
            }]}>
              <Text style={[styles.detailLabel, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>Date {type === 'lost' ? 'Lost' : 'Found'}</Text>
              <Text style={[styles.detailValue, { color: isDark ? '#ffffff' : '#1e1b2f' }]}>
                {new Date(item.date_lost || item.date_found).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </View>
            {(item.lost_location || item.found_location) && (
              <View style={[styles.detailCard, styles.detailCardFull, { 
                backgroundColor: isDark ? '#1a1a1a' : '#fff',
                borderColor: isDark ? '#333333' : '#edeef5'
              }]}>
                <Text style={[styles.detailLabel, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>Location</Text>
                <Text style={[styles.detailValue, { color: isDark ? '#ffffff' : '#1e1b2f' }]}>{item.lost_location || item.found_location}</Text>
              </View>
            )}
            
            {hasValidCoordinates && (
              <View style={[styles.detailCard, styles.detailCardFull, { 
                backgroundColor: isDark ? '#1a1a1a' : '#fff',
                borderColor: isDark ? '#333333' : '#edeef5'
              }]}>
                <Text style={[styles.detailLabel, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>Coordinates</Text>
                <Text style={[styles.detailValue, { color: isDark ? '#ffffff' : '#1e1b2f' }]}>
                  {latFormatted}, {lngFormatted}
                </Text>
              </View>
            )}
            
            <View style={[styles.detailCard, styles.detailCardFull, { 
              backgroundColor: isDark ? '#1a1a1a' : '#fff',
              borderColor: isDark ? '#333333' : '#edeef5'
            }]}>
              <Text style={[styles.detailLabel, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>{type === 'lost' ? 'Lost By' : 'Found By'}</Text>
              <Text style={[styles.detailValue, { color: isDark ? '#ffffff' : '#1e1b2f' }]}>
                {item.user?.name || 'Unknown User'}
                {item.user_id === user?.id && <Text style={[styles.youBadge, { color: '#e50914' }]}> (you)</Text>}
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          {showActions && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1e1b2f' }]}>Quick Actions</Text>
              <View style={styles.actionsGrid}>
                {type === 'found' && item.status === 'approved' && isOwner && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.successButton]}
                    onPress={() => setClaimModalVisible(true)}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Feather name="handshake" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Mark as Claimed</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                
                {type === 'lost' && item.status === 'approved' && isOwner && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.successButton]}
                    onPress={handleMarkAsFound}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Feather name="check-circle" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Mark as Found</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                
                {isAdmin && item.status === 'pending' && (
                  <>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={handleApprove}
                    >
                      <Feather name="check-circle" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => setRejectModalVisible(true)}
                    >
                      <Feather name="x-circle" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </>
                )}

                {canEdit && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => navigation.navigate('EditItem', { type, id })}
                  >
                    <Feather name="edit-2" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                )}

                {canDelete && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => setDeleteModalVisible(true)}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Feather name="trash-2" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Contact Button - For non-owners to message the item owner/finder */}
          {showContactButton && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.contactNowButton}
                onPress={handleSendMessage}
                disabled={startingChat}
              >
                <LinearGradient colors={['#e50914', '#b20710']} style={styles.contactNowGradient}>
                  {startingChat ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather name="message-circle" size={18} color="#fff" />
                      <Text style={styles.contactNowButtonText}>
                        {type === 'lost' ? 'Contact Finder' : 'Contact Owner'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Matches Section */}
          {matches.length > 0 && (item.status === 'approved' || isAdmin || isOwner) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1e1b2f' }]}>Potential Matches</Text>
                <View style={styles.matchesBadge}>
                  <Text style={styles.matchesBadgeText}>{matches.length}</Text>
                </View>
              </View>
              
              {matches.map((match) => {
                const paired = type === 'lost' ? match.found_item : match.lost_item;
                const matchScore = match.match_score;
                const scoreClass = matchScore >= 80 ? 'high' : (matchScore >= 60 ? 'medium' : 'low');
                
                return (
                  <TouchableOpacity
                    key={match.id}
                    style={[styles.matchCard, { 
                      backgroundColor: isDark ? '#1a1a1a' : '#fff',
                      borderColor: isDark ? '#333333' : '#edeef5'
                    }]}
                    onPress={() => navigation.navigate('MatchDetail', { id: match.id })}
                  >
                    <View style={styles.matchHeader}>
                      <View style={[styles.matchScore, styles[`score${scoreClass}`]]}>
                        <Text style={styles.matchScoreText}>{matchScore}%</Text>
                      </View>
                      <View style={styles.matchInfo}>
                        <Text style={[styles.matchItemName, { color: isDark ? '#ffffff' : '#1e1b2f' }]}>
                          {paired?.item_name || 'Unknown Item'}
                        </Text>
                        {paired?.user_id === user?.id && (
                          <View style={styles.yourItemBadge}>
                            <Text style={styles.yourItemBadgeText}>Your Item</Text>
                          </View>
                        )}
                      </View>
                      <Feather name="chevron-right" size={14} color={isDark ? '#666666' : '#7c3aed'} />
                    </View>
                    
                    <Text style={[styles.matchDescription, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]} numberOfLines={2}>
                      {paired?.description}
                    </Text>
                    
                    <View style={styles.matchFooter}>
                      <Text style={[styles.matchFooterText, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>
                        <Feather name="user" size={10} color={isDark ? '#666666' : '#5b5b7a'} /> {paired?.user?.name}
                      </Text>
                      <Text style={[styles.matchFooterText, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>
                        <Feather name="calendar" size={10} color={isDark ? '#666666' : '#5b5b7a'} /> {' '}
                        {new Date(paired?.date_lost || paired?.date_found).toLocaleDateString()}
                      </Text>
                    </View>

                    {match.status !== 'pending' && (
                      <View style={[styles.matchStatus, { borderTopColor: isDark ? '#333333' : '#edeef5' }]}>
                        <View style={[styles.matchStatusBadge, { backgroundColor: getStatusConfig(match.status).color }]}>
                          <Text style={styles.matchStatusText}>{match.status.toUpperCase()}</Text>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Location Map Card */}
          {(item.lost_location || item.found_location || hasValidCoordinates) &&
           (item.status !== 'pending' || isAdmin || isOwner) && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1e1b2f' }]}>{type === 'lost' ? 'Lost Location' : 'Found Location'}</Text>

              {locationText && (
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={14} color="#e50914" />
                  <Text style={[styles.locationNameText, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>{locationText}</Text>
                </View>
              )}

              {hasValidCoordinates && (
                <View style={styles.locationRow}>
                  <Feather name="navigation" size={14} color="#e50914" />
                  <Text style={[styles.locationNameText, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>
                    {latFormatted}, {lngFormatted}
                  </Text>
                </View>
              )}

              <View style={[styles.mapContainer, { borderColor: isDark ? '#333333' : '#edeef5' }]}>
                {hasValidCoordinates ? (
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: parseFloat(item.latitude),
                      longitude: parseFloat(item.longitude),
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                  >
                    <Marker
                      coordinate={{
                        latitude: parseFloat(item.latitude),
                        longitude: parseFloat(item.longitude),
                      }}
                      title={item.item_name}
                      description={locationText}
                      pinColor="#e50914"
                    />
                  </MapView>
                ) : (
                  <View style={[styles.mapNoCoords, { backgroundColor: isDark ? '#2a2a2a' : '#faf9fe' }]}>
                    <Feather name="map" size={32} color="#e50914" />
                    <Text style={[styles.mapNoCoordsText, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>No exact coordinates available</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.directionsButton} onPress={openLocation}>
                <LinearGradient colors={['#e50914', '#b20710']} style={styles.directionsButtonGradient}>
                  <Feather name="navigation" size={14} color="#fff" />
                  <Text style={styles.directionsButtonText}>Open in Maps</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.modalClose}
              onPress={() => setImageModalVisible(false)}
            >
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
            <Image
              source={{ uri: photoUrl }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          </View>
        </View>
      </Modal>

      {/* Claim Modal */}
      <Modal
        visible={claimModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setClaimModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <LinearGradient colors={['#e50914', '#b20710']} style={styles.modalCardHeader}>
              <Feather name="handshake" size={22} color="#fff" />
              <Text style={styles.modalCardTitle}>Mark as Claimed</Text>
              <TouchableOpacity onPress={() => setClaimModalVisible(false)}>
                <Feather name="x" size={22} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            
            <View style={styles.modalCardBody}>
              <Text style={[styles.modalLabel, { color: isDark ? '#b3b3b3' : '#1e1b2f' }]}>Claim Details</Text>
              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: isDark ? '#2a2a2a' : '#fff',
                  borderColor: isDark ? '#333333' : '#edeef5',
                  color: isDark ? '#ffffff' : '#1e1b2f'
                }]}
                multiline
                numberOfLines={4}
                placeholder="Add details about the claim..."
                placeholderTextColor={isDark ? '#666666' : '#aaa'}
                value={claimDetails}
                onChangeText={setClaimDetails}
              />
              
              <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(33,150,243,0.15)' : '#dbeafe' }]}>
                <Feather name="info" size={18} color="#3b82f6" />
                <Text style={[styles.infoBoxText, { color: isDark ? '#e5e5e5' : '#1e1b2f' }]}>
                  This will notify the finder and update the item status to "Claimed".
                </Text>
              </View>
            </View>
            
            <View style={[styles.modalCardFooter, { borderTopColor: isDark ? '#333333' : '#edeef5' }]}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setClaimModalVisible(false)}
              >
                <Text style={[styles.modalCancelButtonText, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleMarkAsClaimed}
                disabled={updating}
              >
                <LinearGradient colors={['#2e7d32', '#1b5e20']} style={styles.modalConfirmGradient}>
                  {updating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmButtonText}>Confirm</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <LinearGradient colors={['#e50914', '#b20710']} style={styles.modalCardHeader}>
              <Feather name="x-circle" size={22} color="#fff" />
              <Text style={styles.modalCardTitle}>Reject Item</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Feather name="x" size={22} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            
            <View style={styles.modalCardBody}>
              <Text style={[styles.modalLabel, { color: isDark ? '#b3b3b3' : '#1e1b2f' }]}>
                Rejection Reason <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: isDark ? '#2a2a2a' : '#fff',
                  borderColor: isDark ? '#333333' : '#edeef5',
                  color: isDark ? '#ffffff' : '#1e1b2f'
                }]}
                multiline
                numberOfLines={4}
                placeholder="Please provide a reason for rejection..."
                placeholderTextColor={isDark ? '#666666' : '#aaa'}
                value={rejectionReason}
                onChangeText={setRejectionReason}
              />
              
              <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(33,150,243,0.15)' : '#dbeafe' }]}>
                <Feather name="info" size={18} color="#3b82f6" />
                <Text style={[styles.infoBoxText, { color: isDark ? '#e5e5e5' : '#1e1b2f' }]}>
                  The user will be notified of this rejection reason.
                </Text>
              </View>
            </View>
            
            <View style={[styles.modalCardFooter, { borderTopColor: isDark ? '#333333' : '#edeef5' }]}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={[styles.modalCancelButtonText, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalRejectButton]}
                onPress={handleReject}
              >
                <LinearGradient colors={['#e50914', '#b20710']} style={styles.modalConfirmGradient}>
                  <Text style={styles.modalConfirmButtonText}>Reject</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <LinearGradient colors={['#e50914', '#b20710']} style={styles.modalCardHeader}>
              <Feather name="trash-2" size={22} color="#fff" />
              <Text style={styles.modalCardTitle}>Delete Item</Text>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <Feather name="x" size={22} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            
            <View style={styles.modalCardBody}>
              <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2' }]}>
                <Feather name="alert-triangle" size={24} color="#ef4444" />
                <Text style={[styles.infoBoxText, { color: isDark ? '#e5e5e5' : '#1e1b2f' }]}>
                  Are you sure you want to delete "{item?.item_name}"? This action cannot be undone.
                </Text>
              </View>
            </View>
            
            <View style={[styles.modalCardFooter, { borderTopColor: isDark ? '#333333' : '#edeef5' }]}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={[styles.modalCancelButtonText, { color: isDark ? '#b3b3b3' : '#666666' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalRejectButton]}
                onPress={handleDelete}
                disabled={deleting}
              >
                <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.modalConfirmGradient}>
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmButtonText}>Delete</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  backButton: {
    marginTop: 20,
    borderRadius: 25,
    overflow: 'hidden',
  },
  backButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  backButtonSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(229,9,20,0.15)' : '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  accessDeniedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  accessDeniedText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
    backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageExpandButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    marginTop: 12,
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
    fontSize: 11,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
  },
  alertError: {
    backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2',
    borderLeftColor: '#ef4444',
  },
  alertWarning: {
    backgroundColor: isDark ? 'rgba(245,197,24,0.15)' : '#fef3c7',
    borderLeftColor: '#f59e0b',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 12,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  detailCard: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailCardFull: {
    width: '100%',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  youBadge: {
    fontSize: 11,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 40,
  },
  editButton: {
    backgroundColor: '#7c3aed',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  successButton: {
    backgroundColor: '#10b981',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  contactNowButton: {
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 16,
  },
  contactNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  contactNowButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  matchesBadge: {
    backgroundColor: '#e50914',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 20,
  },
  matchesBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  matchCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  matchScore: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  scorehigh: {
    backgroundColor: '#d1fae5',
  },
  scoremedium: {
    backgroundColor: '#fef3c7',
  },
  scorelow: {
    backgroundColor: '#dbeafe',
  },
  matchScoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e1b2f',
  },
  matchInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  matchItemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  yourItemBadge: {
    backgroundColor: isDark ? 'rgba(229,9,20,0.2)' : '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  yourItemBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#e50914',
  },
  matchDescription: {
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 18,
  },
  matchFooter: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  matchFooterText: {
    fontSize: 10,
  },
  matchStatus: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  matchStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  matchStatusText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  locationNameText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  mapContainer: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
  },
  map: {
    flex: 1,
  },
  mapNoCoords: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  mapNoCoordsText: {
    fontSize: 12,
  },
  directionsButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  directionsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  directionsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    height: '80%',
    position: 'relative',
  },
  modalClose: {
    position: 'absolute',
    top: -40,
    right: 0,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalCard: {
    width: width - 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  modalCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginLeft: 12,
  },
  modalCardBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
  },
  modalCardFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 40,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: isDark ? '#333333' : '#edeef5',
  },
  modalCancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalConfirmButton: {
    overflow: 'hidden',
  },
  modalRejectButton: {
    overflow: 'hidden',
  },
  modalConfirmGradient: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});