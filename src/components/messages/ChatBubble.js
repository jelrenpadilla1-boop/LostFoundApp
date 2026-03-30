// src/components/messages/ChatBubble.js
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

export default function ChatBubble({ message, isMine }) {
    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <View style={[
            styles.container,
            isMine ? styles.myMessage : styles.theirMessage
        ]}>
            {!isMine && (
                <View style={styles.avatar}>
                    <LinearGradient
                        colors={['#7c3aed', '#a855f7']}
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
                    <Text style={styles.senderName}>{message.user?.name}</Text>
                )}
                <Text style={[
                    styles.messageText,
                    isMine ? styles.myText : styles.theirText
                ]}>
                    {message.content}
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

const styles = StyleSheet.create({
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
    myBubble: {
        backgroundColor: '#7c3aed',
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        backgroundColor: '#f0f0f0',
        borderBottomLeftRadius: 4,
    },
    senderName: {
        fontSize: 10,
        fontWeight: '600',
        color: '#7c3aed',
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
        color: '#1e1b2f',
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
        color: '#999',
    },
});