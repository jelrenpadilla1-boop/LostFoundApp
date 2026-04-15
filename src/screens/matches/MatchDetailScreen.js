// src/screens/matches/MatchDetailScreen.js
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { matchesAPI } from '../../api/matches';
import { messagesAPI } from '../../api/messages';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'http://10.116.78.132:8092';

export default function MatchDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, isAdmin } = useAuth();
  const { isDark } = useTheme();
  
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
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMatch();
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
    if (numScore >= 80) return '#2e7d32';
    if (numScore >= 60) return '#f5c518';
    return '#e50914';
  };

  const styles = getStyles(isDark);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? '#141414' : '#f8fafc' }]}>
        <ActivityIndicator size="large" color="#e50914" />
        <Text style={[styles.loadingText, { color: isDark ? '#b3b3b3' : '#64748b' }]}>Loading match details...</Text>
      </View>
    );
  }

  if (!match) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? '#141414' : '#f8fafc' }]}>
        <Feather name="alert-circle" size={64} color={isDark ? '#333333' : '#cbd5e1'} />
        <Text style={[styles.emptyTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>Match Not Found</Text>
        <Text style={[styles.emptySubtitle, { color: isDark ? '#b3b3b3' : '#64748b' }]}>The match you're looking for doesn't exist</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.goBack()}>
          <LinearGradient colors={['#e50914', '#b20710']} style={styles.emptyButtonGradient}>
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  const lostItem = match.lost_item;
  const foundItem = match.found_item;
  const isOwnerLost = user?.id === lostItem?.user_id;
  const isOwnerFound = user?.id === foundItem?.user_id;
  const canConfirm = match.status === 'pending' && isAdmin;

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <ScrollView 
        style={[styles.container, { backgroundColor: isDark ? '#141414' : '#f8fafc' }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e50914']} tintColor="#e50914" />
        }
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={isDark ? ['#1a1a1a', '#141414'] : ['#ffffff', '#f8fafc']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Feather name="arrow-left" size={22} color="#e50914" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: isDark ? '#ffffff' : '#1a1a1a' }]}>Match Details</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>

        {/* Match Score Card */}
        <View style={[styles.scoreCard, { 
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          borderColor: isDark ? '#333333' : '#edeef5'
        }]}>
          <View style={styles.scoreHeader}>
            <Text style={[styles.scoreHeaderTitle, { color: isDark ? '#b3b3b3' : '#64748b' }]}>Match Score</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(match.match_score) }]}>
              {parseFloat(match.match_score).toFixed(1)}%
            </Text>
          </View>
          <View style={styles.scoreBar}>
            <View style={[styles.scoreFill, { width: `${match.match_score}%`, backgroundColor: getScoreColor(match.match_score) }]} />
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isDark ? '#2a2a2a' : '#f1f5f9' }]}>
            <Text style={[styles.statusText, { color: isDark ? '#e5e5e5' : '#475569' }]}>
              {match.status?.toUpperCase() || 'PENDING'}
            </Text>
          </View>
        </View>

        {/* Items Grid */}
        <View style={styles.itemsGrid}>
          {/* Lost Item Card */}
          <View style={[styles.itemCard, { 
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            borderColor: isDark ? '#333333' : '#edeef5'
          }]}>
            <View style={styles.itemHeader}>
              <View style={[styles.itemBadge, styles.lostBadge]}>
                <Feather name="alert-triangle" size={10} color="#e50914" />
                <Text style={styles.itemBadgeText}>LOST</Text>
              </View>
              {isOwnerLost && (
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerBadgeText}>Your item</Text>
                </View>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.itemContent}
              onPress={() => navigation.navigate('ItemDetail', { type: 'lost', id: lostItem?.id })}
              activeOpacity={0.7}
            >
              <View style={styles.imageContainer}>
                {lostItem?.photo ? (
                  <Image source={{ uri: getImageUrl(lostItem.photo) }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.imagePlaceholder, styles.lostPlaceholder]}>
                    <Feather name="image" size={32} color="#e50914" />
                  </View>
                )}
              </View>
              
              <Text style={[styles.itemName, { color: isDark ? '#ffffff' : '#0f172a' }]}>{lostItem?.item_name || 'Unknown Item'}</Text>
              <Text style={[styles.itemCategory, { color: '#e50914' }]}>{lostItem?.category || 'Uncategorized'}</Text>
              
              <View style={styles.itemDetails}>
                <View style={styles.itemDetail}>
                  <Feather name="map-pin" size={10} color={isDark ? '#666666' : '#94a3b8'} />
                  <Text style={[styles.itemDetailText, { color: isDark ? '#b3b3b3' : '#64748b' }]} numberOfLines={1}>
                    {lostItem?.lost_location || 'No location'}
                  </Text>
                </View>
                <View style={styles.itemDetail}>
                  <Feather name="calendar" size={10} color={isDark ? '#666666' : '#94a3b8'} />
                  <Text style={[styles.itemDetailText, { color: isDark ? '#b3b3b3' : '#64748b' }]}>
                    {lostItem?.date_lost ? new Date(lostItem.date_lost).toLocaleDateString() : 'Unknown'}
                  </Text>
                </View>
              </View>
              
              <Text style={[styles.itemReporter, { color: isDark ? '#b3b3b3' : '#94a3b8' }]}>
                By: {lostItem?.user?.name || 'Unknown'}
              </Text>
            </TouchableOpacity>
            
            {!isOwnerLost && lostItem?.user && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handleContact(lostItem.user_id)}
              >
                <LinearGradient colors={['#e50914', '#b20710']} style={styles.contactGradient}>
                  <Feather name="message-circle" size={14} color="#fff" />
                  <Text style={styles.contactButtonText}>Message Owner</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Found Item Card */}
          <View style={[styles.itemCard, { 
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            borderColor: isDark ? '#333333' : '#edeef5'
          }]}>
            <View style={styles.itemHeader}>
              <View style={[styles.itemBadge, styles.foundBadge]}>
                <Feather name="check-circle" size={10} color="#2e7d32" />
                <Text style={styles.itemBadgeText}>FOUND</Text>
              </View>
              {isOwnerFound && (
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerBadgeText}>Your item</Text>
                </View>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.itemContent}
              onPress={() => navigation.navigate('ItemDetail', { type: 'found', id: foundItem?.id })}
              activeOpacity={0.7}
            >
              <View style={styles.imageContainer}>
                {foundItem?.photo ? (
                  <Image source={{ uri: getImageUrl(foundItem.photo) }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.imagePlaceholder, styles.foundPlaceholder]}>
                    <Feather name="image" size={32} color="#2e7d32" />
                  </View>
                )}
              </View>
              
              <Text style={[styles.itemName, { color: isDark ? '#ffffff' : '#0f172a' }]}>{foundItem?.item_name || 'Unknown Item'}</Text>
              <Text style={[styles.itemCategory, { color: '#e50914' }]}>{foundItem?.category || 'Uncategorized'}</Text>
              
              <View style={styles.itemDetails}>
                <View style={styles.itemDetail}>
                  <Feather name="map-pin" size={10} color={isDark ? '#666666' : '#94a3b8'} />
                  <Text style={[styles.itemDetailText, { color: isDark ? '#b3b3b3' : '#64748b' }]} numberOfLines={1}>
                    {foundItem?.found_location || 'No location'}
                  </Text>
                </View>
                <View style={styles.itemDetail}>
                  <Feather name="calendar" size={10} color={isDark ? '#666666' : '#94a3b8'} />
                  <Text style={[styles.itemDetailText, { color: isDark ? '#b3b3b3' : '#64748b' }]}>
                    {foundItem?.date_found ? new Date(foundItem.date_found).toLocaleDateString() : 'Unknown'}
                  </Text>
                </View>
              </View>
              
              <Text style={[styles.itemReporter, { color: isDark ? '#b3b3b3' : '#94a3b8' }]}>
                By: {foundItem?.user?.name || 'Unknown'}
              </Text>
            </TouchableOpacity>
            
            {!isOwnerFound && foundItem?.user && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handleContact(foundItem.user_id)}
              >
                <LinearGradient colors={['#e50914', '#b20710']} style={styles.contactGradient}>
                  <Feather name="message-circle" size={14} color="#fff" />
                  <Text style={styles.contactButtonText}>Message Finder</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Action Buttons - Admin Only */}
        {canConfirm && (
          <View style={styles.actionContainer}>
            <TouchableOpacity style={[styles.actionButton, styles.confirmButton]} onPress={handleConfirm}>
              <LinearGradient colors={['#2e7d32', '#1b5e20']} style={styles.actionGradient}>
                <Feather name="check-circle" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Confirm Match</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={handleReject}>
              <LinearGradient colors={['#e50914', '#b20710']} style={styles.actionGradient}>
                <Feather name="x-circle" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Reject Match</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer Info */}
        <View style={[styles.footerInfo, { borderTopColor: isDark ? '#333333' : '#e2e8f0' }]}>
          <Feather name="calendar" size={12} color={isDark ? '#666666' : '#94a3b8'} />
          <Text style={[styles.footerText, { color: isDark ? '#b3b3b3' : '#94a3b8' }]}>
            Match created on {match.created_at ? new Date(match.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown date'}
          </Text>
        </View>
      </ScrollView>
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
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 20,
    borderRadius: 25,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(229,9,20,0.15)' : '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  scoreCard: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  scoreBar: {
    height: 8,
    backgroundColor: isDark ? '#333333' : '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  scoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 24,
  },
  itemCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lostBadge: {
    backgroundColor: isDark ? 'rgba(229,9,20,0.2)' : '#fee2e2',
  },
  foundBadge: {
    backgroundColor: isDark ? 'rgba(46,125,50,0.2)' : '#d1fae5',
  },
  itemBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#1f2937',
  },
  ownerBadge: {
    backgroundColor: isDark ? 'rgba(229,9,20,0.2)' : '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ownerBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#e50914',
  },
  itemContent: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: isDark ? '#2a2a2a' : '#f8fafc',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lostPlaceholder: {
    backgroundColor: isDark ? 'rgba(229,9,20,0.1)' : '#fff5f5',
  },
  foundPlaceholder: {
    backgroundColor: isDark ? 'rgba(46,125,50,0.1)' : '#f0fdf4',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 6,
  },
  itemDetails: {
    marginBottom: 6,
    gap: 4,
  },
  itemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemDetailText: {
    fontSize: 9,
    flex: 1,
  },
  itemReporter: {
    fontSize: 9,
    marginBottom: 10,
  },
  contactButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  contactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  contactButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  confirmButton: {
    shadowColor: '#2e7d32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  rejectButton: {
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 30,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 11,
  },
});