// src/api/messages.js
import api from './client';

export const messagesAPI = {
    // Get all conversations for current user
    getConversations: async () => {
        try {
            const response = await api.get('/messages');
            return response;
        } catch (error) {
            console.error('Error fetching conversations:', error);
            if (error.response?.status === 401) {
                return { data: { success: false, conversations: [], message: 'Unauthenticated' } };
            }
            throw error;
        }
    },
    
    // Get specific conversation with messages
    getConversation: async (conversationId) => {
        try {
            const response = await api.get(`/messages/${conversationId}`);
            return response;
        } catch (error) {
            console.error('Error fetching conversation:', error);
            throw error;
        }
    },
    
    // Send a message
    sendMessage: async (conversationId, content) => {
        try {
            const response = await api.post(`/messages/${conversationId}/send`, { message: content });
            return response;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    },
    
    // Start a new conversation with a user
    startConversation: async (userId) => {
        try {
            const response = await api.post(`/messages/start/${userId}`);
            return response;
        } catch (error) {
            console.error('Error starting conversation:', error);
            throw error;
        }
    },
    
    // Get unread messages count
    getUnreadCount: async () => {
        try {
            const response = await api.get('/messages/unread-count');
            return response;
        } catch (error) {
            console.error('Error fetching unread count:', error);
            return { data: { count: 0 } };
        }
    },
    
    // Get recent messages for sidebar
    getRecentMessages: async () => {
        try {
            const response = await api.get('/messages/recent');
            return response;
        } catch (error) {
            console.error('Error fetching recent messages:', error);
            return { data: { messages: [] } };
        }
    },
    
    // Poll for new messages
    pollNewMessages: async (conversationId, lastMessageId) => {
        try {
            const response = await api.post(`/messages/${conversationId}/poll`, { last_message_id: lastMessageId });
            return response;
        } catch (error) {
            console.error('Error polling messages:', error);
            return { data: [] };
        }
    },
    
    // Mark conversation as read
    markAsRead: async (conversationId) => {
        try {
            const response = await api.post(`/messages/${conversationId}/read`);
            return response;
        } catch (error) {
            console.error('Error marking as read:', error);
            return { data: { success: false } };
        }
    },
};