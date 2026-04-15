// src/components/messages/ChatBubble.js
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function ChatBubble({ message, isMine, onPhotoPress }) {
    const { isDark } = useTheme();

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isPhotoMessage = message.type === 'photo' && message.photo;
    const isTextMessage = message.type === 'text' || (!message.type && message.content);

    const styles = getStyles(isDark);

    // Render photo message
    if (isPhotoMessage) {
        return (
            <View style={[
                styles.container,
                isMine ? styles.myMessage : styles.theirMessage
            ]}>
                {!isMine && (
                    <View style={styles.avatar}>
                        <LinearGradient
                            colors={['#e50914', '#b20710']}
                            style={styles.avatarGradient}
                        >
                            <Text style={styles.avatarText}>
                                {message.user?.name?.charAt(0).toUpperCase() || '?'}
                            </Text>
                        </LinearGradient>
                    </View>
                )}
                <View style={[
                    styles.bubble,
                    styles.photoBubble,
                    isMine ? styles.myPhotoBubble : styles.theirPhotoBubble
                ]}>
                    {!isMine && (
                        <Text style={[styles.senderName, { color: isDark ? '#e50914' : '#e50914' }]}>
                            {message.user?.name}
                        </Text>
                    )}
                    <TouchableOpacity 
                        onPress={() => onPhotoPress && onPhotoPress(message.photo)}
                        activeOpacity={0.9}
                    >
                        <Image 
                            source={{ uri: message.photo }} 
                            style={styles.photo}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                    <Text style={[
                        styles.timeText,
                        isMine ? styles.myTime : styles.theirTime
                    ]}>
                        {formatTime(message.created_at)}
                    </Text>
                </View>
            </View>
        );
    }

    // Render text message (existing)
    return (
        <View style={[
            styles.container,
            isMine ? styles.myMessage : styles.theirMessage
        ]}>
            {!isMine && (
                <View style={styles.avatar}>
                    <LinearGradient
                        colors={['#e50914', '#b20710']}
                        style={styles.avatarGradient}
                    >
                        <Text style={styles.avatarText}>
                            {message.user?.name?.charAt(0).toUpperCase() || '?'}
                        </Text>
                    </LinearGradient>
                </View>
            )}
            <View style={[
                styles.bubble,
                isMine ? styles.myBubble : styles.theirBubble
            ]}>
                {!isMine && (
                    <Text style={[styles.senderName, { color: isDark ? '#e50914' : '#e50914' }]}>
                        {message.user?.name}
                    </Text>
                )}
                <Text style={[
                    styles.messageText,
                    isMine ? styles.myText : styles.theirText
                ]}>
                    {message.content || message.message}
                </Text>
                <Text style={[
                    styles.timeText,
                    isMine ? styles.myTime : styles.theirTime
                ]}>
                    {formatTime(message.created_at)}
                </Text>
            </View>
        </View>
    );
}

const getStyles = (isDark) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginVertical: 6,
        alignItems: 'flex-end',
    },
    myMessage: {
        justifyContent: 'flex-end',
    },
    theirMessage: {
        justifyContent: 'flex-start',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e50914',
    },
    avatarGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    bubble: {
        maxWidth: '75%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
    },
    photoBubble: {
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    myBubble: {
        backgroundColor: '#e50914',
        borderBottomRightRadius: 4,
        shadowColor: '#e50914',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    theirBubble: {
        backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0',
        borderBottomLeftRadius: 4,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? '#333333' : 'transparent',
    },
    myPhotoBubble: {
        backgroundColor: '#e50914',
        borderBottomRightRadius: 4,
        shadowColor: '#e50914',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    theirPhotoBubble: {
        backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0',
        borderBottomLeftRadius: 4,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? '#333333' : 'transparent',
    },
    senderName: {
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 18,
    },
    myText: {
        color: '#fff',
    },
    theirText: {
        color: isDark ? '#ffffff' : '#1e1b2f',
    },
    timeText: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    myTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    theirTime: {
        color: isDark ? '#666666' : '#999',
    },
    photo: {
        width: 200,
        height: 200,
        borderRadius: 12,
    },
});