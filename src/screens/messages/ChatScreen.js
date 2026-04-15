// src/screens/messages/ChatScreen.js
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
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
import ChatBubble from '../../components/messages/ChatBubble';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';

const API_BASE_URL = 'http://10.116.78.132:8092';

export default function ChatScreen({ route, navigation }) {
    // Handle both conversationId and userId parameters
    const { conversationId, userId, userName, userEmail } = route.params || {};
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sending, setSending] = useState(false);
    const [currentConversationId, setCurrentConversationId] = useState(conversationId || null);
    const flatListRef = useRef(null);
    const subscriptionRef = useRef(null);
    const lastMessageIdRef = useRef(0);
    const inputRef = useRef(null);
    const { user, logout } = useAuth();
    const { subscribeToConversation } = useSocket();
    const { isDark } = useTheme();

    useFocusEffect(
        useCallback(() => {
            loadConversation();

            // Start real-time subscription if we have a conversation ID
            if (currentConversationId) {
                const sub = subscribeToConversation(currentConversationId, {
                    onNewMessage: ({ message }) => {
                        setMessages(prev => {
                            // Avoid duplicates
                            if (prev.some(m => m.id === message.id)) return prev;
                            return [...prev, message];
                        });
                        if (message.id > lastMessageIdRef.current) {
                            lastMessageIdRef.current = message.id;
                        }
                        if (message.user_id !== user?.id) {
                            messagesAPI.markAsRead(currentConversationId).catch(() => {});
                        }
                        setTimeout(() => {
                            flatListRef.current?.scrollToEnd({ animated: true });
                        }, 100);
                    },
                });
                subscriptionRef.current = sub;
            }

            return () => {
                subscriptionRef.current?.unsubscribe();
                subscriptionRef.current = null;
            };
        }, [currentConversationId, userId])
    );

    const loadConversation = async () => {
        try {
            setLoading(true);
            
            // If we have userId but no conversationId, start a new conversation
            if (userId && !currentConversationId) {
                console.log('Starting conversation with user:', userId);
                const startResponse = await messagesAPI.startConversation(userId);
                const newConversation = startResponse.data?.data || startResponse.data;
                
                if (newConversation && newConversation.id) {
                    setCurrentConversationId(newConversation.id);
                    setConversation(newConversation);
                    
                    // Load messages for this conversation
                    const response = await messagesAPI.getConversation(newConversation.id);
                    console.log('Conversation response:', JSON.stringify(response.data, null, 2));
                    
                    let conversationData = null;
                    let messagesData = [];
                    
                    if (response.data && response.data.success === true) {
                        conversationData = response.data.conversation;
                        messagesData = response.data.messages || [];
                    } else if (response.data && response.data.conversation) {
                        conversationData = response.data.conversation;
                        messagesData = response.data.messages || [];
                    } else if (response.data && response.data.data) {
                        conversationData = response.data.data.conversation;
                        messagesData = response.data.data.messages || [];
                    }
                    
                    setConversation(conversationData);
                    setMessages(messagesData);
                    
                    if (messagesData.length > 0) {
                        lastMessageIdRef.current = messagesData[messagesData.length - 1].id;
                        if (subscriptionRef.current) {
                            subscriptionRef.current.setLastMessageId(lastMessageIdRef.current);
                        }
                    }
                    
                    // Set header title
                    navigation.setOptions({ title: userName || conversationData?.other_user?.name || 'Chat' });
                } else {
                    throw new Error('Failed to create conversation');
                }
            } 
            // If we have conversationId, load existing conversation
            else if (currentConversationId) {
                console.log('Loading conversation:', currentConversationId);
                const response = await messagesAPI.getConversation(currentConversationId);
                console.log('Conversation response:', JSON.stringify(response.data, null, 2));
                
                let conversationData = null;
                let messagesData = [];
                
                if (response.data && response.data.success === true) {
                    conversationData = response.data.conversation;
                    messagesData = response.data.messages || [];
                } else if (response.data && response.data.conversation) {
                    conversationData = response.data.conversation;
                    messagesData = response.data.messages || [];
                } else if (response.data && response.data.data) {
                    conversationData = response.data.data.conversation;
                    messagesData = response.data.data.messages || [];
                }
                
                setConversation(conversationData);
                setMessages(messagesData);
                
                if (messagesData.length > 0) {
                    lastMessageIdRef.current = messagesData[messagesData.length - 1].id;
                    if (subscriptionRef.current) {
                        subscriptionRef.current.setLastMessageId(lastMessageIdRef.current);
                    }
                }
                
                // Set header title if we have user info
                if (userName) {
                    navigation.setOptions({ title: userName });
                }
            }
            
            // Mark messages as read
            if (currentConversationId) {
                try {
                    await messagesAPI.markAsRead(currentConversationId);
                } catch (error) {
                    console.log('Error marking as read:', error);
                }
            }
            
            // Scroll to bottom
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
        } catch (error) {
            console.error('Error loading conversation:', error);
            if (error.response?.status === 401) {
                Alert.alert('Session Expired', 'Please login again', [
                    { text: 'OK', onPress: () => logout() }
                ]);
            } else {
                Alert.alert('Error', error.response?.data?.message || 'Failed to load conversation');
                navigation.goBack();
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadConversation();
    };

    const handleSend = async () => {
        if (!newMessage.trim() || sending || !currentConversationId) return;
        
        setSending(true);
        const messageText = newMessage.trim();
        setNewMessage('');
        
        // Add optimistic message
        const optimisticMessage = {
            id: Date.now(),
            message: messageText,
            user_id: user?.id,
            created_at: new Date().toISOString(),
            is_optimistic: true
        };
        setMessages(prev => [...prev, optimisticMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        
        try {
            const response = await messagesAPI.sendMessage(currentConversationId, messageText);
            let sentMessage = null;
            
            if (response.data && response.data.message) {
                sentMessage = response.data.message;
            } else if (response.data && response.data.data) {
                sentMessage = response.data.data;
            } else if (response.data) {
                sentMessage = response.data;
            }
            
            if (sentMessage && sentMessage.id) {
                // Replace optimistic message with real one
                setMessages(prev => prev.map(msg => 
                    msg.id === optimisticMessage.id ? sentMessage : msg
                ));
                
                if (sentMessage.id > lastMessageIdRef.current) {
                    lastMessageIdRef.current = sentMessage.id;
                }
            } else {
                // If no proper response, remove optimistic message and reload
                setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
                await loadConversation();
            }
            
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error) {
            console.error('Error sending message:', error);
            // Remove optimistic message on error
            setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
            Alert.alert('Error', error.response?.data?.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const getOtherUser = () => {
        if (!conversation) {
            // If we have userId from params, use that
            if (userId) {
                return { id: userId, name: userName || 'User' };
            }
            return null;
        }
        if (conversation.user1_id === user?.id) {
            return conversation.user2;
        }
        return conversation.user1;
    };

    const getImageUrl = (photo) => {
        if (!photo) return null;
        if (photo.startsWith('http')) return photo;
        return `${API_BASE_URL}/storage/${photo}`;
    };

    const scrollToBottom = () => {
        flatListRef.current?.scrollToEnd({ animated: true });
    };

    const styles = getStyles(isDark);

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: isDark ? '#141414' : '#f8fafc' }]}>
                <ActivityIndicator size="large" color="#e50914" />
                <Text style={[styles.loadingText, { color: isDark ? '#b3b3b3' : '#64748b' }]}>Loading conversation...</Text>
            </View>
        );
    }

    const otherUser = getOtherUser();

    return (
        <>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
            <View style={[styles.container, { backgroundColor: isDark ? '#141414' : '#f8fafc' }]}>
                <KeyboardAvoidingView
                    style={styles.keyboardView}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
                >
                    {/* Header with Gradient */}
                    <LinearGradient
                        colors={isDark ? ['#1a1a1a', '#141414'] : ['#ffffff', '#f8fafc']}
                        style={styles.header}
                    >
                        <View style={styles.headerContent}>
                            <TouchableOpacity 
                                onPress={() => navigation.goBack()} 
                                style={styles.backButton}
                                activeOpacity={0.7}
                            >
                                <Feather name="arrow-left" size={22} color="#e50914" />
                            </TouchableOpacity>
                            
                            <View style={styles.headerInfo}>
                                <Text style={[styles.headerName, { color: isDark ? '#ffffff' : '#1e1b2f' }]} numberOfLines={1}>
                                    {otherUser?.name || userName || 'User'}
                                </Text>
                                <View style={styles.headerStatusContainer}>
                                    <View style={[styles.statusDot, otherUser?.is_online ? styles.online : styles.offline]} />
                                    <Text style={[styles.headerStatus, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>
                                        {otherUser?.is_online ? 'Online' : 'Offline'}
                                    </Text>
                                </View>
                            </View>
                            
                            <View style={styles.headerAvatarContainer}>
                                {getImageUrl(otherUser?.profile_photo) ? (
                                    <Image 
                                        source={{ uri: getImageUrl(otherUser?.profile_photo) }} 
                                        style={styles.headerAvatar}
                                    />
                                ) : (
                                    <View style={[styles.headerAvatarPlaceholder, { backgroundColor: '#e50914' }]}>
                                        <Text style={styles.headerAvatarText}>
                                            {(otherUser?.name || userName || 'U')?.charAt(0).toUpperCase() || '?'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Messages List */}
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                        renderItem={({ item }) => (
                            <ChatBubble
                                message={item}
                                isMine={item.user_id === user?.id}
                                isDark={isDark}
                            />
                        )}
                        onContentSizeChange={scrollToBottom}
                        onLayout={scrollToBottom}
                        contentContainerStyle={styles.messagesContainer}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl 
                                refreshing={refreshing} 
                                onRefresh={onRefresh} 
                                colors={['#e50914']} 
                                tintColor="#e50914" 
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Feather name="message-circle" size={48} color={isDark ? '#333333' : '#ccc'} />
                                <Text style={[styles.emptyText, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>
                                    No messages yet
                                </Text>
                                <Text style={[styles.emptySubtext, { color: isDark ? '#666666' : '#94a3b8' }]}>
                                    Send a message to start the conversation
                                </Text>
                            </View>
                        }
                    />

                    {/* Input Area */}
                    <View style={[styles.inputWrapper, { 
                        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                        borderTopColor: isDark ? '#333333' : '#edeef5'
                    }]}>
                        <View style={styles.inputContainer}>
                            <TextInput
                                ref={inputRef}
                                style={[styles.input, { 
                                    backgroundColor: isDark ? '#2a2a2a' : '#f8fafc',
                                    borderColor: isDark ? '#444444' : '#e2e8f0',
                                    color: isDark ? '#ffffff' : '#1e293b'
                                }]}
                                placeholder="Type a message..."
                                placeholderTextColor={isDark ? '#666666' : '#94a3b8'}
                                value={newMessage}
                                onChangeText={setNewMessage}
                                multiline
                                maxLength={500}
                                editable={!sending}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.sendButton, 
                                    (!newMessage.trim() || sending) && styles.sendButtonDisabled
                                ]}
                                onPress={handleSend}
                                disabled={sending || !newMessage.trim()}
                                activeOpacity={0.8}
                            >
                                <LinearGradient 
                                    colors={['#e50914', '#b20710']} 
                                    style={styles.sendGradient}
                                >
                                    {sending ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Feather name="send" size={18} color="#fff" />
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </>
    );
}

const getStyles = (isDark) => StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
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
        paddingBottom: 12,
        paddingHorizontal: 16,
    },
    headerContent: {
        flexDirection: 'row',
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
    headerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '600',
    },
    headerStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    online: {
        backgroundColor: '#10b981',
    },
    offline: {
        backgroundColor: isDark ? '#666666' : '#94a3b8',
    },
    headerStatus: {
        fontSize: 11,
    },
    headerAvatarContainer: {
        width: 40,
        height: 40,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#e50914',
    },
    headerAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e50914',
    },
    headerAvatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    messagesContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexGrow: 1,
        paddingBottom: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
    },
    emptySubtext: {
        fontSize: 12,
        textAlign: 'center',
    },
    inputWrapper: {
        borderTopWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === 'ios' ? 10 : 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
    },
    input: {
        flex: 1,
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
        maxHeight: 80,
        borderWidth: 1,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        shadowColor: '#e50914',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    sendGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
});