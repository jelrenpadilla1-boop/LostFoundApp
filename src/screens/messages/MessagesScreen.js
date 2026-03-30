// src/screens/messages/MessagesScreen.js
import Icon from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { messagesAPI } from '../../api/messages';
import { usersAPI } from '../../api/users';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = 'http://10.214.114.132:8092';

export default function MessagesScreen({ navigation }) {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const { user } = useAuth();

    useFocusEffect(
        useCallback(() => {
            loadConversations();
            loadUsers();
            return () => {};
        }, [])
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
            console.log('Loading users...');
            const response = await usersAPI.getUsers();
            console.log('Users response:', response);
            
            if (response && response.success === false && response.message === 'Unauthenticated') {
                console.log('Users API returned 401, but continuing');
                setUsers([]);
                return;
            }
            
            let usersData = [];
            if (response.success && response.data) {
                usersData = response.data;
            } else if (response.data && response.data.success === true) {
                usersData = response.data.users || response.data.data || [];
            } else if (response.data && response.data.users) {
                usersData = response.data.users;
            } else if (response.data && response.data.data) {
                usersData = response.data.data;
            } else if (Array.isArray(response.data)) {
                usersData = response.data;
            } else if (Array.isArray(response)) {
                usersData = response;
            }
            
            usersData = usersData.filter(u => u.id !== user?.id);
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

    const getImageUrl = (photo) => {
        if (!photo) return null;
        if (photo.startsWith('http')) return photo;
        return `${API_BASE_URL}/storage/${photo}`;
    };

    const filteredUsers = users.filter(u => 
        u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderConversation = ({ item }) => {
        const otherUser = getOtherUser(item);
        const lastMessage = item.last_message || item.lastMessage;
        const unreadCount = item.unread_count || 0;

        if (!otherUser) return null;

        return (
            <TouchableOpacity
                style={styles.conversationCard}
                onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
                activeOpacity={0.7}
            >
                <View style={styles.avatarContainer}>
                    {getImageUrl(otherUser.profile_photo) ? (
                        <Image 
                            source={{ uri: getImageUrl(otherUser.profile_photo) }} 
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
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
                        <Text style={styles.userName} numberOfLines={1}>
                            {otherUser.name}
                        </Text>
                        <Text style={styles.timeText}>{getLastMessageTime(item)}</Text>
                    </View>
                    <View style={styles.messagePreview}>
                        <Text style={styles.lastMessage} numberOfLines={1}>
                            {lastMessage?.content || 'No messages yet'}
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
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#7c3aed" />
                <Text style={styles.loadingText}>Loading conversations...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header - Clean White Background */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <Text style={styles.headerSubtitle}>
                        {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            </View>

            <FlatList
                data={conversations}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={renderConversation}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh}
                        colors={['#7c3aed']}
                        tintColor="#7c3aed"
                    />
                }
                contentContainerStyle={[
                    styles.listContainer,
                    conversations.length === 0 && styles.emptyContainer
                ]}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Icon name="chatbubbles-outline" size={80} color="#cbd5e1" />
                        <Text style={styles.emptyTitle}>No messages yet</Text>
                        <Text style={styles.emptySubtext}>
                            Start a conversation by tapping the + button
                        </Text>
                    </View>
                }
            />
            
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setShowNewChat(true)}
                activeOpacity={0.9}
            >
                <LinearGradient
                    colors={['#7c3aed', '#a855f7']}
                    style={styles.fabGradient}
                >
                    <Icon name="add" size={28} color="#fff" />
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
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Message</Text>
                            <TouchableOpacity onPress={() => setShowNewChat(false)}>
                                <Icon name="close" size={24} color="#7c3aed" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.modalBody}>
                            <View style={styles.searchContainer}>
                                <Icon name="search-outline" size={20} color="#94a3b8" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search users..."
                                    placeholderTextColor="#94a3b8"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Icon name="close-circle" size={20} color="#94a3b8" />
                                    </TouchableOpacity>
                                )}
                            </View>
                            
                            <FlatList
                                data={filteredUsers}
                                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.userItem}
                                        onPress={() => startConversation(item.id)}
                                        activeOpacity={0.7}
                                    >
                                        {getImageUrl(item.profile_photo) ? (
                                            <Image 
                                                source={{ uri: getImageUrl(item.profile_photo) }} 
                                                style={styles.userAvatar}
                                            />
                                        ) : (
                                            <View style={styles.userAvatarPlaceholder}>
                                                <Text style={styles.userAvatarText}>
                                                    {item.name?.charAt(0).toUpperCase() || '?'}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.userInfo}>
                                            <Text style={styles.userName}>{item.name}</Text>
                                            <Text style={styles.userEmail}>{item.email}</Text>
                                        </View>
                                        <Icon name="chevron-forward" size={20} color="#cbd5e1" />
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <View style={styles.noUsersContainer}>
                                        <Icon name="people-outline" size={48} color="#cbd5e1" />
                                        <Text style={styles.noUsersText}>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748b',
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#edeef5',
    },
    headerContent: {
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1e1b2f',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#5b5b7a',
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
        backgroundColor: '#ffffff',
        padding: 16,
        marginBottom: 12,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#edeef5',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    avatarPlaceholder: {
        backgroundColor: '#7c3aed',
        justifyContent: 'center',
        alignItems: 'center',
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
        borderColor: '#fff',
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
        color: '#1e1b2f',
        flex: 1,
    },
    timeText: {
        fontSize: 11,
        color: '#94a3b8',
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
        color: '#5b5b7a',
    },
    unreadBadge: {
        backgroundColor: '#7c3aed',
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
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    fabGradient: {
        width: 60,
        height: 60,
        borderRadius: 30,
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
        color: '#0f172a',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#edeef5',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e1b2f',
    },
    modalBody: {
        padding: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 20,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#0f172a',
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    userAvatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#7c3aed',
        justifyContent: 'center',
        alignItems: 'center',
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
        color: '#94a3b8',
        marginTop: 2,
    },
    noUsersContainer: {
        alignItems: 'center',
        paddingTop: 40,
    },
    noUsersText: {
        marginTop: 12,
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
    },
}); 