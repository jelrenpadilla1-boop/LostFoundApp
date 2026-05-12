// src/screens/messages/MessagesScreen.js
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { messagesAPI } from '../../api/messages';
import { usersAPI } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';

const API_BASE_URL = 'http://192.168.1.2:8092';

export default function MessagesScreen({ navigation }) {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const { user } = useAuth();
    const { addNotificationListener, refreshUnreadMessages } = useSocket();
    const { isDark, toggleTheme } = useTheme();

    // Refresh conversation list when a new message or match notification arrives
    useEffect(() => {
        const remove = addNotificationListener((data) => {
            if (data.type === 'message' || data.type === 'match') {
                loadConversations();
                refreshUnreadMessages();
            }
        });
        return remove;
    }, [addNotificationListener, refreshUnreadMessages]);

    useFocusEffect(
        useCallback(() => {
            loadConversations();
            refreshUnreadMessages();
            loadUsers();
            return () => {};
        }, [refreshUnreadMessages])
    );

    const loadConversations = async () => {
        try {
            setLoading(true);
            console.log('Loading conversations...');
            const response = await messagesAPI.getConversations();
            console.log('Conversations response:', JSON.stringify(response.data, null, 2));
            
            if (response.data && response.data.success === false && response.data.message === 'Unauthenticated') {
                console.log('Auth error, but staying on page');
                setConversations([]);
                return;
            }
            
            let conversationsData = [];
            if (response.data && response.data.success === true) {
                conversationsData = response.data.conversations || [];
            } else if (response.data && response.data.conversations) {
                conversationsData = response.data.conversations;
            } else if (response.data && response.data.data) {
                conversationsData = response.data.data;
            } else if (Array.isArray(response.data)) {
                conversationsData = response.data;
            }
            
            console.log('Conversations loaded:', conversationsData.length);
            setConversations(conversationsData);
        } catch (error) {
            console.error('Error loading conversations:', error);
            if (error.response?.status !== 401) {
                Alert.alert('Error', error.userMessage || 'Failed to load conversations');
            }
            setConversations([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadUsers = async () => {
        try {
            const response = await usersAPI.getUsers();
            if (!response.success) {
                setUsers([]);
                return;
            }
            const usersData = (response.data || []).filter(u => u.id !== user?.id);
            console.log('Users loaded:', usersData.length);
            setUsers(usersData);
        } catch (error) {
            console.error('Error loading users:', error);
            setUsers([]);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadConversations();
        loadUsers();
    };

    const startConversation = async (userId) => {
        try {
            console.log('Starting conversation with user:', userId);
            const response = await messagesAPI.startConversation(userId);
            console.log('Conversation started:', response.data);
            setShowNewChat(false);
            setSearchQuery('');
            
            let conversationId = null;
            if (response.data && response.data.id) {
                conversationId = response.data.id;
            } else if (response.data && response.data.data && response.data.data.id) {
                conversationId = response.data.data.id;
            } else if (response.data && response.data.conversation_id) {
                conversationId = response.data.conversation_id;
            } else if (response.data && response.data.conversation && response.data.conversation.id) {
                conversationId = response.data.conversation.id;
            }
            
            if (conversationId) {
                navigation.navigate('Chat', { conversationId });
            } else {
                Alert.alert('Error', 'Failed to start conversation');
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to start conversation');
        }
    };

    const deleteConversation = async () => {
        if (!selectedConversation) return;
        
        try {
            const response = await messagesAPI.deleteConversation(selectedConversation.id);
            if (response.data && response.data.success) {
                Alert.alert('Success', 'Conversation deleted successfully');
                setShowDeleteModal(false);
                setSelectedConversation(null);
                loadConversations();
            } else {
                Alert.alert('Error', response.data?.message || 'Failed to delete conversation');
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to delete conversation');
        }
    };

    const confirmDelete = (conversation) => {
        setSelectedConversation(conversation);
        setShowDeleteModal(true);
    };

    const getOtherUser = (conversation) => {
        if (!conversation) return null;
        if (conversation.user1_id === user?.id) {
            return conversation.user2;
        }
        return conversation.user1;
    };

    const getLastMessageTime = (conversation) => {
        if (!conversation) return '';
        const lastMessage = conversation.last_message || conversation.lastMessage;
        if (!lastMessage || !lastMessage.created_at) return '';
        
        const date = new Date(lastMessage.created_at);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString();
    };

    const getLastMessagePreview = (conversation) => {
        const lastMessage = conversation.last_message || conversation.lastMessage;
        if (!lastMessage) return 'No messages yet';
        
        // Check if it's a photo message
        if (lastMessage.type === 'photo' || (lastMessage.photo && !lastMessage.content)) {
            return '📷 Photo';
        }
        
        // Check if it's a text message
        if (lastMessage.content) {
            return lastMessage.content.length > 40 
                ? lastMessage.content.substring(0, 40) + '...' 
                : lastMessage.content;
        }
        
        return 'No messages yet';
    };

    const getImageUrl = (photo) => {
        if (!photo) return null;
        if (photo.startsWith('http')) return photo;
        return `${API_BASE_URL}/storage/${photo}`;
    };

    const filteredUsers = users.filter(u => 
        u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const styles = getStyles(isDark);

    const renderConversation = ({ item }) => {
        const otherUser = getOtherUser(item);
        const lastMessage = item.last_message || item.lastMessage;
        const unreadCount = item.unread_count || 0;

        if (!otherUser) return null;

        return (
            <TouchableOpacity
                style={[styles.conversationCard, { 
                    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                    borderColor: isDark ? '#333333' : '#edeef5'
                }]}
                onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
                activeOpacity={0.7}
                onLongPress={() => confirmDelete(item)}
            >
                <View style={styles.avatarContainer}>
                    {getImageUrl(otherUser.profile_photo) ? (
                        <Image 
                            source={{ uri: getImageUrl(otherUser.profile_photo) }} 
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: '#e50914' }]}>
                            <Text style={styles.avatarText}>
                                {otherUser.name?.charAt(0).toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                    {otherUser.is_online && (
                        <View style={styles.onlineDot} />
                    )}
                </View>
                <View style={styles.conversationInfo}>
                    <View style={styles.conversationHeader}>
                        <Text style={[styles.userName, { color: isDark ? '#ffffff' : '#1e1b2f' }]} numberOfLines={1}>
                            {otherUser.name}
                        </Text>
                        <Text style={[styles.timeText, { color: isDark ? '#666666' : '#94a3b8' }]}>
                            {getLastMessageTime(item)}
                        </Text>
                    </View>
                    <View style={styles.messagePreview}>
                        <Text style={[styles.lastMessage, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]} numberOfLines={1}>
                            {getLastMessagePreview(item)}
                        </Text>
                        {unreadCount > 0 && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadText}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
                <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => confirmDelete(item)}
                >
                    <Feather name="trash-2" size={18} color={isDark ? '#666666' : '#ef4444'} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={[styles.center, { backgroundColor: isDark ? '#141414' : '#f8fafc' }]}>
                <ActivityIndicator size="large" color="#e50914" />
                <Text style={[styles.loadingText, { color: isDark ? '#b3b3b3' : '#64748b' }]}>Loading conversations...</Text>
            </View>
        );
    }

    return (
        <>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
            <View style={[styles.container, { backgroundColor: isDark ? '#141414' : '#f8fafc' }]}>
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
                        
                        <View style={styles.headerTitleContainer}>
                            <Text style={[styles.headerTitle, { color: isDark ? '#ffffff' : '#1a1a1a' }]}>Messages</Text>
                            <Text style={[styles.headerSubtitle, { color: isDark ? '#b3b3b3' : '#666666' }]}>
                                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                        
                       
                    </View>
                </LinearGradient>

                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                    renderItem={renderConversation}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh}
                            colors={['#e50914']}
                            tintColor="#e50914"
                        />
                    }
                    contentContainerStyle={[
                        styles.listContainer,
                        conversations.length === 0 && styles.emptyContainer
                    ]}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Feather name="message-circle" size={64} color={isDark ? '#333333' : '#cbd5e1'} />
                            <Text style={[styles.emptyTitle, { color: isDark ? '#ffffff' : '#1a1a1a' }]}>No messages yet</Text>
                            <Text style={[styles.emptySubtext, { color: isDark ? '#b3b3b3' : '#64748b' }]}>
                                Start a conversation by tapping the + button
                            </Text>
                        </View>
                    }
                />
                
                {/* Floating Action Button */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => { setShowNewChat(true); loadUsers(); }}
                    activeOpacity={0.9}
                >
                    <LinearGradient colors={['#e50914', '#b20710']} style={styles.fabGradient}>
                        <Feather name="plus" size={24} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* New Chat Modal */}
                <Modal 
                    visible={showNewChat} 
                    animationType="slide" 
                    transparent
                    onRequestClose={() => setShowNewChat(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]}>
                            <LinearGradient colors={['#e50914', '#b20710']} style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>New Message</Text>
                                <TouchableOpacity onPress={() => setShowNewChat(false)}>
                                    <Feather name="x" size={24} color="#fff" />
                                </TouchableOpacity>
                            </LinearGradient>
                            
                            <View style={styles.modalBody}>
                                <View style={[styles.searchContainer, { 
                                    backgroundColor: isDark ? '#2a2a2a' : '#f1f5f9',
                                    borderColor: isDark ? '#333333' : '#e0e0e0'
                                }]}>
                                    <Feather name="search" size={20} color={isDark ? '#666666' : '#94a3b8'} />
                                    <TextInput
                                        style={[styles.searchInput, { color: isDark ? '#ffffff' : '#0f172a' }]}
                                        placeholder="Search users..."
                                        placeholderTextColor={isDark ? '#666666' : '#94a3b8'}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                                            <Feather name="x-circle" size={20} color={isDark ? '#666666' : '#94a3b8'} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                
                                <FlatList
                                    data={filteredUsers}
                                    keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[styles.userItem, { borderBottomColor: isDark ? '#333333' : '#f1f5f9' }]}
                                            onPress={() => startConversation(item.id)}
                                            activeOpacity={0.7}
                                        >
                                            {getImageUrl(item.profile_photo) ? (
                                                <Image 
                                                    source={{ uri: getImageUrl(item.profile_photo) }} 
                                                    style={styles.userAvatar}
                                                />
                                            ) : (
                                                <View style={[styles.userAvatarPlaceholder, { backgroundColor: '#e50914' }]}>
                                                    <Text style={styles.userAvatarText}>
                                                        {item.name?.charAt(0).toUpperCase() || '?'}
                                                    </Text>
                                                </View>
                                            )}
                                            <View style={styles.userInfo}>
                                                <Text style={[styles.userName, { color: isDark ? '#ffffff' : '#1e1b2f' }]}>{item.name}</Text>
                                                <Text style={[styles.userEmail, { color: isDark ? '#b3b3b3' : '#94a3b8' }]}>{item.email}</Text>
                                            </View>
                                            <Feather name="chevron-right" size={20} color={isDark ? '#666666' : '#cbd5e1'} />
                                        </TouchableOpacity>
                                    )}
                                    ListEmptyComponent={
                                        <View style={styles.noUsersContainer}>
                                            <Feather name="users" size={48} color={isDark ? '#333333' : '#cbd5e1'} />
                                            <Text style={[styles.noUsersText, { color: isDark ? '#b3b3b3' : '#94a3b8' }]}>
                                                {searchQuery ? 'No users found' : 'No other users available'}
                                            </Text>
                                        </View>
                                    }
                                    showsVerticalScrollIndicator={false}
                                />
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal 
                    visible={showDeleteModal} 
                    animationType="fade" 
                    transparent
                    onRequestClose={() => setShowDeleteModal(false)}
                >
                    <View style={styles.deleteModalOverlay}>
                        <View style={[styles.deleteModalContent, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]}>
                            <View style={styles.deleteModalHeader}>
                                <Feather name="trash-2" size={40} color="#ef4444" />
                                <Text style={[styles.deleteModalTitle, { color: isDark ? '#ffffff' : '#1a1a1a' }]}>
                                    Delete Conversation?
                                </Text>
                                <Text style={[styles.deleteModalMessage, { color: isDark ? '#b3b3b3' : '#64748b' }]}>
                                    This will permanently delete the entire conversation. This action cannot be undone.
                                </Text>
                            </View>
                            <View style={styles.deleteModalButtons}>
                                <TouchableOpacity
                                    style={[styles.deleteModalButton, styles.deleteModalCancelButton]}
                                    onPress={() => setShowDeleteModal(false)}
                                >
                                    <Text style={styles.deleteModalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.deleteModalButton, styles.deleteModalConfirmButton]}
                                    onPress={deleteConversation}
                                >
                                    <Text style={styles.deleteModalConfirmText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
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
    },
    loadingText: {
        marginTop: 12,
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
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    headerSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    themeToggle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgba(229,9,20,0.15)' : '#f3e8ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContainer: {
        padding: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    conversationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 2,
        borderColor: '#e50914',
    },
    avatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e50914',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10b981',
        borderWidth: 2,
        borderColor: isDark ? '#1a1a1a' : '#fff',
    },
    conversationInfo: {
        flex: 1,
        marginLeft: 14,
    },
    conversationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    timeText: {
        fontSize: 11,
        marginLeft: 8,
    },
    messagePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    lastMessage: {
        flex: 1,
        fontSize: 13,
    },
    unreadBadge: {
        backgroundColor: '#e50914',
        borderRadius: 12,
        minWidth: 22,
        height: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        paddingHorizontal: 6,
    },
    unreadText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#fff',
    },
    deleteButton: {
        padding: 8,
        marginLeft: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        shadowColor: '#e50914',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        overflow: 'hidden',
    },
    fabGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyTitle: {
        marginTop: 20,
        fontSize: 20,
        fontWeight: '700',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    modalBody: {
        padding: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 20,
        gap: 10,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#e50914',
    },
    userAvatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e50914',
    },
    userAvatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    userInfo: {
        flex: 1,
        marginLeft: 14,
    },
    userEmail: {
        fontSize: 12,
        marginTop: 2,
    },
    noUsersContainer: {
        alignItems: 'center',
        paddingTop: 40,
    },
    noUsersText: {
        marginTop: 12,
        fontSize: 14,
        textAlign: 'center',
    },
    // Delete Modal Styles
    deleteModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteModalContent: {
        width: '85%',
        borderRadius: 20,
        overflow: 'hidden',
        padding: 24,
        alignItems: 'center',
    },
    deleteModalHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    deleteModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 8,
    },
    deleteModalMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    deleteModalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    deleteModalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    deleteModalCancelButton: {
        backgroundColor: isDark ? '#2a2a2a' : '#f1f5f9',
    },
    deleteModalConfirmButton: {
        backgroundColor: '#ef4444',
    },
    deleteModalCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: isDark ? '#b3b3b3' : '#64748b',
    },
    deleteModalConfirmText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
});
