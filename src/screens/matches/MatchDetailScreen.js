// src/screens/matches/MatchDetailScreen.js
import Icon from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { matchesAPI } from '../../api/matches';
import { messagesAPI } from '../../api/messages';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'http://10.214.114.132:8092';

export default function MatchDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      loadMatch();
    }, [id])
  );

  const loadMatch = async () => {
    try {
      setLoading(true);
      const response = await matchesAPI.getMatch(id);
      
      let matchData = null;
      if (response.data && response.data.data) {
        matchData = response.data.data;
      } else if (response.data && response.data.match) {
        matchData = response.data.match;
      } else {
        matchData = response.data;
      }
      
      setMatch(matchData);
    } catch (error) {
      console.error('Error loading match:', error);
      Alert.alert('Error', 'Failed to load match details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    Alert.alert(
      'Confirm Match',
      'Great! Confirm this match to help reunite the item with its owner.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Match',
          onPress: async () => {
            try {
              await matchesAPI.confirmMatch(id);
              Alert.alert('Success!', 'Match confirmed successfully! 🎉');
              loadMatch();
            } catch (error) {
              Alert.alert('Error', 'Failed to confirm match');
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    Alert.alert(
      'Reject Match',
      'Are you sure this isn\'t the right match?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await matchesAPI.rejectMatch(id);
              Alert.alert('Rejected', 'Match has been rejected');
              loadMatch();
            } catch (error) {
              Alert.alert('Error', 'Failed to reject match');
            }
          },
        },
      ]
    );
  };

  const handleContact = async (userId) => {
    try {
      const response = await messagesAPI.startConversation(userId);
      navigation.navigate('Chat', { conversationId: response.data.id });
    } catch (error) {
      Alert.alert('Error', 'Could not start conversation');
    }
  };

  const getImageUrl = (photo) => {
    if (!photo) return null;
    if (photo.startsWith('http')) return photo;
    return `${API_BASE_URL}/storage/${photo}`;
  };

  const getScoreColor = (score) => {
    const numScore = parseFloat(score);
    if (numScore >= 80) return '#10b981';
    if (numScore >= 60) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.loaderGradient}
        >
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading match details...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.center}>
        <LinearGradient
          colors={['#fef9e3', '#fff']}
          style={styles.emptyGradient}
        >
          <Icon name="alert-circle-outline" size={80} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Match Not Found</Text>
          <Text style={styles.emptySubtitle}>The match you're looking for doesn't exist</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.emptyButton}>
              <Icon name="arrow-back" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  const lostItem = match.lost_item;
  const foundItem = match.found_item;
  const isOwnerLost = user?.id === lostItem?.user_id;
  const isOwnerFound = user?.id === foundItem?.user_id;
  // Only admin can confirm/reject matches
  const canConfirm = match.status === 'pending' && isAdmin;

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Hero Section */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSection}
      >
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Potential Match Found</Text>
          <View style={styles.scoreCircle}>
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.scoreCircleInner}
            >
              <Text style={[styles.scoreValue, { color: getScoreColor(match.match_score) }]}>
                {parseFloat(match.match_score).toFixed(1)}%
              </Text>
              <Text style={styles.scoreLabel}>Match Score</Text>
            </LinearGradient>
          </View>
          <View style={styles.statusChip}>
            <View style={[styles.statusDot, { backgroundColor: getScoreColor(match.match_score) }]} />
            <Text style={styles.statusText}>
              {match.status?.toUpperCase() || 'PENDING'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Items Connection */}
      <View style={styles.connectionSection}>
        <View style={styles.connectionLine} />
        <View style={styles.connectionIcon}>
          <Icon name="git-compare" size={32} color="#667eea" />
        </View>
      </View>

      {/* Items Container - Fixed layout to avoid overlap */}
      <View style={styles.itemsWrapper}>
        {/* Lost Item Card */}
        <View style={styles.itemCard}>
          <View style={styles.itemCardHeader}>
            <View style={[styles.itemBadge, styles.lostBadge]}>
              <Icon name="alert-circle" size={14} color="#ef4444" />
              <Text style={styles.itemBadgeText}>LOST</Text>
            </View>
            {isOwnerLost && (
              <View style={styles.ownerTag}>
                <Icon name="person" size={10} color="#667eea" />
                <Text style={styles.ownerTagText}>Yours</Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.itemContent}
            onPress={() => navigation.navigate('ItemDetail', { type: 'lost', id: lostItem?.id })}
            activeOpacity={0.8}
          >
            <View style={styles.itemImageWrapper}>
              {lostItem?.photo ? (
                <Image source={{ uri: getImageUrl(lostItem.photo) }} style={styles.itemImage} />
              ) : (
                <LinearGradient
                  colors={['#fee2e2', '#fff']}
                  style={styles.itemImagePlaceholder}
                >
                  <Icon name="image-outline" size={48} color="#ef4444" />
                </LinearGradient>
              )}
            </View>
            
            <Text style={styles.itemName}>{lostItem?.item_name || 'Unknown Item'}</Text>
            <Text style={styles.itemCategory}>{lostItem?.category || 'Uncategorized'}</Text>
            
            <View style={styles.itemDetails}>
              <View style={styles.itemDetail}>
                <Icon name="location-outline" size={12} color="#94a3b8" />
                <Text style={styles.itemDetailText} numberOfLines={1}>
                  {lostItem?.lost_location || 'No location'}
                </Text>
              </View>
              <View style={styles.itemDetail}>
                <Icon name="calendar-outline" size={12} color="#94a3b8" />
                <Text style={styles.itemDetailText}>
                  {lostItem?.date_lost ? new Date(lostItem.date_lost).toLocaleDateString() : 'Unknown'}
                </Text>
              </View>
            </View>
            
            <Text style={styles.itemReporter}>
              By: {lostItem?.user?.name || 'Unknown'}
            </Text>
          </TouchableOpacity>
          
          {!isOwnerLost && lostItem?.user && (
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => handleContact(lostItem.user_id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.messageGradient}
              >
                <Icon name="chatbubble" size={16} color="#fff" />
                <Text style={styles.messageButtonText}>Message Owner</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* VS Divider - Fixed positioning */}
        <View style={styles.vsDividerWrapper}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.vsCircle}
          >
            <Text style={styles.vsText}>VS</Text>
          </LinearGradient>
        </View>

        {/* Found Item Card */}
        <View style={styles.itemCard}>
          <View style={styles.itemCardHeader}>
            <View style={[styles.itemBadge, styles.foundBadge]}>
              <Icon name="checkmark-circle" size={14} color="#10b981" />
              <Text style={styles.itemBadgeText}>FOUND</Text>
            </View>
            {isOwnerFound && (
              <View style={styles.ownerTag}>
                <Icon name="person" size={10} color="#667eea" />
                <Text style={styles.ownerTagText}>Yours</Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.itemContent}
            onPress={() => navigation.navigate('ItemDetail', { type: 'found', id: foundItem?.id })}
            activeOpacity={0.8}
          >
            <View style={styles.itemImageWrapper}>
              {foundItem?.photo ? (
                <Image source={{ uri: getImageUrl(foundItem.photo) }} style={styles.itemImage} />
              ) : (
                <LinearGradient
                  colors={['#d1fae5', '#fff']}
                  style={styles.itemImagePlaceholder}
                >
                  <Icon name="image-outline" size={48} color="#10b981" />
                </LinearGradient>
              )}
            </View>
            
            <Text style={styles.itemName}>{foundItem?.item_name || 'Unknown Item'}</Text>
            <Text style={styles.itemCategory}>{foundItem?.category || 'Uncategorized'}</Text>
            
            <View style={styles.itemDetails}>
              <View style={styles.itemDetail}>
                <Icon name="location-outline" size={12} color="#94a3b8" />
                <Text style={styles.itemDetailText} numberOfLines={1}>
                  {foundItem?.found_location || 'No location'}
                </Text>
              </View>
              <View style={styles.itemDetail}>
                <Icon name="calendar-outline" size={12} color="#94a3b8" />
                <Text style={styles.itemDetailText}>
                  {foundItem?.date_found ? new Date(foundItem.date_found).toLocaleDateString() : 'Unknown'}
                </Text>
              </View>
            </View>
            
            <Text style={styles.itemReporter}>
              By: {foundItem?.user?.name || 'Unknown'}
            </Text>
          </TouchableOpacity>
          
          {!isOwnerFound && foundItem?.user && (
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => handleContact(foundItem.user_id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.messageGradient}
              >
                <Icon name="chatbubble" size={16} color="#fff" />
                <Text style={styles.messageButtonText}>Message Finder</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Action Buttons - Only show for admin users */}
      {canConfirm && (
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} activeOpacity={0.8}>
            <LinearGradient
              colors={['#10b981', '#34d399']}
              style={styles.actionButtonGradient}
            >
              <Icon name="checkmark-circle" size={24} color="#fff" />
              <View>
                <Text style={styles.actionButtonTitle}>Confirm Match</Text>
                <Text style={styles.actionButtonSubtitle}>Help reunite items</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.rejectButton} onPress={handleReject} activeOpacity={0.8}>
            <LinearGradient
              colors={['#ef4444', '#f87171']}
              style={styles.actionButtonGradient}
            >
              <Icon name="close-circle" size={24} color="#fff" />
              <View>
                <Text style={styles.actionButtonTitle}>Reject Match</Text>
                <Text style={styles.actionButtonSubtitle}>Not a match</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Footer Info */}
      <View style={styles.footerInfo}>
        <Icon name="calendar-outline" size={14} color="#94a3b8" />
        <Text style={styles.footerText}>
          Match created on {match.created_at ? new Date(match.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown date'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  loaderGradient: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  emptyGradient: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 30,
  },
  emptyTitle: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  heroSection: {
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  matchBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreCircleInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  connectionSection: {
    alignItems: 'center',
    marginTop: -20,
    marginBottom: 20,
  },
  connectionLine: {
    width: 2,
    height: 30,
    backgroundColor: '#e2e8f0',
  },
  connectionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemsWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 24,
    position: 'relative',
  },
  itemCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  itemContent: {
    flex: 1,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  lostBadge: {
    backgroundColor: '#fee2e2',
  },
  foundBadge: {
    backgroundColor: '#d1fae5',
  },
  itemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1f2937',
  },
  ownerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  ownerTagText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#667eea',
  },
  itemImageWrapper: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 11,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 8,
  },
  itemDetails: {
    marginBottom: 8,
    gap: 4,
  },
  itemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemDetailText: {
    fontSize: 10,
    color: '#64748b',
    flex: 1,
  },
  itemReporter: {
    fontSize: 9,
    color: '#94a3b8',
    marginBottom: 12,
  },
  messageButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  messageGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  vsDividerWrapper: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -20,
    marginTop: -20,
    zIndex: 10,
  },
  vsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  actionContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  confirmButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  rejectButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  actionButtonSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 11,
    color: '#94a3b8',
  },
});