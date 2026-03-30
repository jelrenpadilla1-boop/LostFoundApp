// src/screens/messages/ChatScreen.js
import Icon from '@expo/vector-icons/Ionicons';
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
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { messagesAPI } from '../../api/messages';
import ChatBubble from '../../components/messages/ChatBubble';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = 'http://10.214.114.132:8092';

export default function ChatScreen({ route, navigation }) {
    const { conversationId } = route.params;
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef(null);
    const pollIntervalRef = useRef(null);
    const lastMessageIdRef = useRef(0);
    const inputRef = useRef(null);
    const { user, logout } = useAuth();

    useFocusEffect(
        useCallback(() => {
            loadConversation();
            startPolling();
            
            return () => {
                stopPolling();
            };
        }, [conversationId])
    );

    const loadConversation = async () => {
        try {
            setLoading(true);
            console.log('Loading conversation:', conversationId);
            const response = await messagesAPI.getConversation(conversationId);
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
            
            // Update last message ID
            if (messagesData.length > 0) {
                lastMessageIdRef.current = messagesData[messagesData.length - 1].id;
            }
            
            // Mark messages as read
            try {
                await messagesAPI.markAsRead(conversationId);
            } catch (error) {
                console.log('Error marking as read:', error);
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
                Alert.alert('Error', 'Failed to load conversation');
                navigation.goBack();
            }
        } finally {
            setLoading(false);
        }
    };

    const startPolling = () => {
        pollIntervalRef.current = setInterval(async () => {
            if (lastMessageIdRef.current > 0) {
                try {
                    const response = await messagesAPI.pollNewMessages(conversationId, lastMessageIdRef.current);
                    if (response.data && response.data.length > 0) {
                        setMessages(prev => [...prev, ...response.data]);
                        const lastMessage = response.data[response.data.length - 1];
                        if (lastMessage && lastMessage.id > lastMessageIdRef.current) {
                            lastMessageIdRef.current = lastMessage.id;
                        }
                        const lastMsg = response.data[response.data.length - 1];
                        if (lastMsg && lastMsg.user_id !== user?.id) {
                            messagesAPI.markAsRead(conversationId).catch(() => {});
                        }
                        setTimeout(() => {
                            flatListRef.current?.scrollToEnd({ animated: true });
                        }, 100);
                    }
                } catch (error) {
                    console.error('Error polling messages:', error);
                    if (error.response?.status === 401) {
                        stopPolling();
                    }
                }
            }
        }, 3000);
    };

    const stopPolling = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        
        setSending(true);
        try {
            const response = await messagesAPI.sendMessage(conversationId, newMessage);
            let sentMessage = null;
            
            if (response.data && response.data.message) {
                sentMessage = response.data.message;
            } else if (response.data && response.data.data) {
                sentMessage = response.data.data;
            }
            
            if (sentMessage) {
                setMessages(prev => [...prev, sentMessage]);
                setNewMessage('');
                
                if (sentMessage.id > lastMessageIdRef.current) {
                    lastMessageIdRef.current = sentMessage.id;
                }
            }
            
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error) {
            console.error('Error sending message:', error);
            if (error.response?.status === 419) {
                Alert.alert('Error', 'Session expired. Please refresh the page.');
            } else {
                Alert.alert('Error', error.response?.data?.message || 'Failed to send message');
            }
        } finally {
            setSending(false);
        }
    };

    const getOtherUser = () => {
        if (!conversation) return null;
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

    if (loading) {
        return (
            <View style={styles.center}>
                <LinearGradient
                    colors={['#7c3aed', '#a855f7']}
                    style={styles.loaderGradient}
                >
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>Loading conversation...</Text>
                </LinearGradient>
            </View>
        );
    }

    const otherUser = getOtherUser();

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
            >
                {/* Header - Compact */}
                <LinearGradient
                    colors={['#7c3aed', '#a855f7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity 
                            onPress={() => navigation.goBack()} 
                            style={styles.backButton}
                            activeOpacity={0.7}
                        >
                            <Icon name="arrow-back" size={22} color="#fff" />
                        </TouchableOpacity>
                        
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerName} numberOfLines={1}>
                                {otherUser?.name || 'User'}
                            </Text>
                            <View style={styles.headerStatusContainer}>
                                <View style={[styles.statusDot, otherUser?.is_online ? styles.online : styles.offline]} />
                                <Text style={styles.headerStatus}>
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
                                <LinearGradient
                                    colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']}
                                    style={styles.headerAvatarPlaceholder}
                                >
                                    <Text style={styles.headerAvatarText}>
                                        {otherUser?.name?.charAt(0).toUpperCase() || '?'}
                                    </Text>
                                </LinearGradient>
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
                        />
                    )}
                    onContentSizeChange={scrollToBottom}
                    onLayout={scrollToBottom}
                    contentContainerStyle={styles.messagesContainer}
                    showsVerticalScrollIndicator={false}
                />

                {/* Input Area - Fixed at bottom */}
                <View style={styles.inputWrapper}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            ref={inputRef}
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor="#94a3b8"
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
                                colors={['#7c3aed', '#a855f7']}
                                style={styles.sendGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                {sending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Icon name="send" size={18} color="#fff" />
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#faf9fe',
    },
    container: {
        flex: 1,
        backgroundColor: '#faf9fe',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#faf9fe',
    },
    loaderGradient: {
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#7c3aed',
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
    header: {
        paddingTop: Platform.OS === 'ios' ? 8 : 12,
        paddingBottom: 8,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
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
        color: '#fff',
    },
    headerStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    online: {
        backgroundColor: '#10b981',
    },
    offline: {
        backgroundColor: '#94a3b8',
    },
    headerStatus: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.8)',
    },
    headerAvatarContainer: {
        width: 36,
        height: 36,
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    headerAvatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.5)',
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
    inputWrapper: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#edeef5',
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
        backgroundColor: '#f8fafc',
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
        maxHeight: 80,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        color: '#1e293b',
    },
    sendButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        overflow: 'hidden',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    sendGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.5,
        shadowOpacity: 0,
    },
});