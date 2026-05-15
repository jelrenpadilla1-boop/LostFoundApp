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
const API_BASE_URL = 'http://192.168.1.5:8092';

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

  const handleContact = async (userId, userName) => {
    try {
      const response = await messagesAPI.startConversation(userId);
      let conversationId = null;
      
      if (response.data?.data?.id) {
        conversationId = response.data.data.id;
      } else if (response.data?.conversation?.id) {
        conversationId = response.data.conversation.id;
      } else if (response.data?.id) {
        conversationId = response.data.id;
      }
      
      if (conversationId) {
        navigation.navigate('Chat', { 
          conversationId: conversationId,
          userId: userId,
          userName: userName
        });
      } else {
        Alert.alert('Error', 'Could not start conversation');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
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

  const getScoreClass = (score) => {
    const numScore = parseFloat(score);
    if (numScore >= 80) return 'high';
    if (numScore >= 60) return 'medium';
    return 'low';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
  const scoreClass = getScoreClass(match.match_score);
  const matchScore = parseFloat(match.match_score).toFixed(1);

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
        <Animated.View style={[styles.scoreCard, { 
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          borderColor: isDark ? '#333333' : '#edeef5',
          opacity: fadeAnim
        }]}>
          <View style={styles.scoreHeader}>
            <Text style={[styles.scoreHeaderTitle, { color: isDark ? '#b3b3b3' : '#64748b' }]}>Match Score</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(matchScore) }]}>
              {matchScore}%
            </Text>
          </View>
          <View style={styles.scoreBar}>
            <View style={[styles.scoreFill, { width: `${matchScore}%`, backgroundColor: getScoreColor(matchScore) }]} />
          </View>
          <View style={styles.scoreBreakdown}>
            <View style={styles.scoreBreakdownItem}>
              <View style={styles.scoreBreakdownLabel}>
                <Text style={[styles.scoreBreakdownLabelText, { color: isDark ? '#b3b3b3' : '#64748b' }]}>Item Name</Text>
                <Text style={[styles.scoreBreakdownValue, { color: '#e50914' }]}>30%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '30%', backgroundColor: '#e50914' }]} />
              </View>
            </View>
            <View style={styles.scoreBreakdownItem}>
              <View style={styles.scoreBreakdownLabel}>
                <Text style={[styles.scoreBreakdownLabelText, { color: isDark ? '#b3b3b3' : '#64748b' }]}>Description</Text>
                <Text style={[styles.scoreBreakdownValue, { color: '#16a34a' }]}>25%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '25%', backgroundColor: '#16a34a' }]} />
              </View>
            </View>
            <View style={styles.scoreBreakdownItem}>
              <View style={styles.scoreBreakdownLabel}>
                <Text style={[styles.scoreBreakdownLabelText, { color: isDark ? '#b3b3b3' : '#64748b' }]}>Category</Text>
                <Text style={[styles.scoreBreakdownValue, { color: '#f5c518' }]}>20%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '20%', backgroundColor: '#f5c518' }]} />
              </View>
            </View>
            <View style={styles.scoreBreakdownItem}>
              <View style={styles.scoreBreakdownLabel}>
                <Text style={[styles.scoreBreakdownLabelText, { color: isDark ? '#b3b3b3' : '#64748b' }]}>Location</Text>
                <Text style={[styles.scoreBreakdownValue, { color: '#2196f3' }]}>15%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '15%', backgroundColor: '#2196f3' }]} />
              </View>
            </View>
            <View style={styles.scoreBreakdownItem}>
              <View style={styles.scoreBreakdownLabel}>
                <Text style={[styles.scoreBreakdownLabelText, { color: isDark ? '#b3b3b3' : '#64748b' }]}>Date</Text>
                <Text style={[styles.scoreBreakdownValue, { color: '#e50914' }]}>10%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '10%', backgroundColor: '#e50914' }]} />
              </View>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isDark ? '#2a2a2a' : '#f1f5f9' }]}>
            <Text style={[styles.statusText, { color: isDark ? '#e5e5e5' : '#475569' }]}>
              {match.status?.toUpperCase() || 'PENDING'}
            </Text>
          </View>
        </Animated.View>

        {/* Items Comparison Grid */}
        <Animated.View style={[styles.itemsGrid, { opacity: fadeAnim }]}>
          {/* Lost Item Card */}
          <View style={[styles.itemCard, { 
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            borderColor: isDark ? '#333333' : '#edeef5'
          }]}>
            <View style={[styles.itemHeader, styles.lostHeader]}>
              <View style={[styles.itemBadge, styles.lostBadge]}>
                <Feather name="search" size={12} color="#e50914" />
                <Text style={styles.itemBadgeText}>LOST ITEM</Text>
              </View>
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
              <Text style={[styles.itemCategory, { color: isDark ? '#b3b3b3' : '#64748b' }]}>{lostItem?.category || 'Uncategorized'}</Text>
              
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
                    Lost: {formatDate(lostItem?.date_lost)}
                  </Text>
                </View>
                <View style={styles.itemDetail}>
                  <Feather name="user" size={10} color={isDark ? '#666666' : '#94a3b8'} />
                  <Text style={[styles.itemDetailText, { color: isDark ? '#b3b3b3' : '#64748b' }]}>
                    {lostItem?.user?.name || 'Unknown'} {isOwnerLost && <Text style={{ color: '#e50914' }}>(You)</Text>}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.descriptionSection, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }]}>
                <Text style={[styles.descriptionText, { color: isDark ? '#b3b3b3' : '#64748b' }]} numberOfLines={2}>
                  {lostItem?.description || 'No description provided'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Found Item Card */}
          <View style={[styles.itemCard, { 
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            borderColor: isDark ? '#333333' : '#edeef5'
          }]}>
            <View style={[styles.itemHeader, styles.foundHeader]}>
              <View style={[styles.itemBadge, styles.foundBadge]}>
                <Feather name="check-circle" size={12} color="#2e7d32" />
                <Text style={styles.itemBadgeText}>FOUND ITEM</Text>
              </View>
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
              <Text style={[styles.itemCategory, { color: isDark ? '#b3b3b3' : '#64748b' }]}>{foundItem?.category || 'Uncategorized'}</Text>
              
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
                    Found: {formatDate(foundItem?.date_found)}
                  </Text>
                </View>
                <View style={styles.itemDetail}>
                  <Feather name="user" size={10} color={isDark ? '#666666' : '#94a3b8'} />
                  <Text style={[styles.itemDetailText, { color: isDark ? '#b3b3b3' : '#64748b' }]}>
                    {foundItem?.user?.name || 'Unknown'} {isOwnerFound && <Text style={{ color: '#2e7d32' }}>(You)</Text>}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.descriptionSection, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }]}>
                <Text style={[styles.descriptionText, { color: isDark ? '#b3b3b3' : '#64748b' }]} numberOfLines={2}>
                  {foundItem?.description || 'No description provided'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Contact Information Section */}
        <Animated.View style={[styles.contactSection, { opacity: fadeAnim }]}>
          <Text style={[styles.contactTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>Contact Information</Text>
          
          <View style={[styles.contactCard, { 
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            borderColor: isDark ? '#333333' : '#edeef5'
          }]}>
            <View style={styles.contactRow}>
              <View style={[styles.contactAvatar, { backgroundColor: isDark ? 'rgba(229,9,20,0.2)' : '#fee2e2' }]}>
                <Feather name="user" size={16} color="#e50914" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: isDark ? '#ffffff' : '#0f172a' }]}>Lost Owner</Text>
                <Text style={[styles.contactEmail, { color: isDark ? '#b3b3b3' : '#64748b' }]}>{lostItem?.user?.name || 'Unknown'}</Text>
                <Text style={[styles.contactEmailSmall, { color: isDark ? '#b3b3b3' : '#64748b' }]}>{lostItem?.user?.email || 'No email'}</Text>
              </View>
              {!isOwnerLost && lostItem?.user && (
                <TouchableOpacity
                  style={styles.contactMessageButton}
                  onPress={() => handleContact(lostItem.user_id, lostItem.user.name)}
                >
                  <LinearGradient colors={['#e50914', '#b20710']} style={styles.contactMessageGradient}>
                    <Feather name="message-circle" size={14} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.contactRow}>
              <View style={[styles.contactAvatar, { backgroundColor: isDark ? 'rgba(46,125,50,0.2)' : '#d1fae5' }]}>
                <Feather name="user" size={16} color="#2e7d32" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: isDark ? '#ffffff' : '#0f172a' }]}>Finder</Text>
                <Text style={[styles.contactEmail, { color: isDark ? '#b3b3b3' : '#64748b' }]}>{foundItem?.user?.name || 'Unknown'}</Text>
                <Text style={[styles.contactEmailSmall, { color: isDark ? '#b3b3b3' : '#64748b' }]}>{foundItem?.user?.email || 'No email'}</Text>
              </View>
              {!isOwnerFound && foundItem?.user && (
                <TouchableOpacity
                  style={styles.contactMessageButton}
                  onPress={() => handleContact(foundItem.user_id, foundItem.user.name)}
                >
                  <LinearGradient colors={['#e50914', '#b20710']} style={styles.contactMessageGradient}>
                    <Feather name="message-circle" size={14} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Action Buttons - Admin Only */}
        {canConfirm && (
          <Animated.View style={[styles.actionContainer, { opacity: fadeAnim }]}>
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
          </Animated.View>
        )}

        {/* Timeline Section */}
        <Animated.View style={[styles.timelineSection, { opacity: fadeAnim }]}>
          <Text style={[styles.timelineTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>Timeline</Text>
          
          <View style={[styles.timelineCard, { 
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            borderColor: isDark ? '#333333' : '#edeef5'
          }]}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineMarker, { backgroundColor: '#e50914' }]} />
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineItemTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>Match Created</Text>
                <Text style={[styles.timelineItemDate, { color: isDark ? '#b3b3b3' : '#64748b' }]}>{formatDateTime(match.created_at)}</Text>
              </View>
            </View>
            
            {match.status !== 'pending' && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineMarker, { 
                  backgroundColor: match.status === 'confirmed' ? '#2e7d32' : '#e50914' 
                }]} />
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineItemTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                    Match {match.status.toUpperCase()}
                  </Text>
                  <Text style={[styles.timelineItemDate, { color: isDark ? '#b3b3b3' : '#64748b' }]}>{formatDateTime(match.updated_at)}</Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Quick Actions Footer */}
        <Animated.View style={[styles.quickActions, { opacity: fadeAnim }]}>
          <TouchableOpacity 
            style={[styles.quickActionBtn, styles.quickActionLost]}
            onPress={() => navigation.navigate('ItemDetail', { type: 'lost', id: lostItem?.id })}
          >
            <Feather name="search" size={16} color="#e50914" />
            <Text style={[styles.quickActionBtnText, { color: '#e50914' }]}>View Lost Item</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.quickActionBtn, styles.quickActionFound]}
            onPress={() => navigation.navigate('ItemDetail', { type: 'found', id: foundItem?.id })}
          >
            <Feather name="check-circle" size={16} color="#2e7d32" />
            <Text style={[styles.quickActionBtnText, { color: '#2e7d32' }]}>View Found Item</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer Info */}
        <View style={[styles.footerInfo, { borderTopColor: isDark ? '#333333' : '#e2e8f0' }]}>
          <Feather name="info" size={12} color={isDark ? '#666666' : '#94a3b8'} />
          <Text style={[styles.footerText, { color: isDark ? '#b3b3b3' : '#94a3b8' }]}>
            Only administrators can confirm or reject matches
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
    marginBottom: 20,
  },
  scoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreBreakdown: {
    marginBottom: 16,
    gap: 12,
  },
  scoreBreakdownItem: {
    gap: 4,
  },
  scoreBreakdownLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scoreBreakdownLabelText: {
    fontSize: 11,
    fontWeight: '500',
  },
  scoreBreakdownValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: isDark ? '#333333' : '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
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
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 24,
  },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#edeef5',
  },
  lostHeader: {
    backgroundColor: isDark ? 'rgba(229,9,20,0.1)' : '#fff5f5',
  },
  foundHeader: {
    backgroundColor: isDark ? 'rgba(46,125,50,0.1)' : '#f0fdf4',
  },
  itemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lostBadge: {
    color: '#e50914',
  },
  foundBadge: {
    color: '#2e7d32',
  },
  itemBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemContent: {
    padding: 14,
  },
  imageContainer: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
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
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 11,
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
    gap: 6,
  },
  itemDetailText: {
    fontSize: 10,
    flex: 1,
  },
  descriptionSection: {
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  descriptionText: {
    fontSize: 11,
    lineHeight: 16,
  },
  contactSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  contactCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 12,
  },
  contactEmailSmall: {
    fontSize: 11,
  },
  contactMessageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  contactMessageGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: isDark ? '#333333' : '#edeef5',
    marginVertical: 12,
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
  timelineSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  timelineCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    position: 'relative',
  },
  timelineMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 20,
  },
  timelineItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  timelineItemDate: {
    fontSize: 10,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    borderColor: isDark ? '#333333' : '#edeef5',
  },
  quickActionLost: {
    borderColor: 'rgba(229,9,20,0.3)',
  },
  quickActionFound: {
    borderColor: 'rgba(46,125,50,0.3)',
  },
  quickActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
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
