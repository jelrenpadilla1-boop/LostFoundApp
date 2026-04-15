// src/components/messages/TypingIndicator.js
import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function TypingIndicator({ name }) {
    const { isDark } = useTheme();
    const [dot1] = React.useState(new Animated.Value(0));
    const [dot2] = React.useState(new Animated.Value(0));
    const [dot3] = React.useState(new Animated.Value(0));

    React.useEffect(() => {
        const animateDot = (dot, delay) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        animateDot(dot1, 0);
        animateDot(dot2, 200);
        animateDot(dot3, 400);
    }, []);

    const styles = getStyles(isDark);

    return (
        <View style={styles.container}>
            <View style={[styles.bubble, { 
                backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                borderColor: isDark ? '#333333' : '#edeef5'
            }]}>
                <Text style={[styles.name, { color: isDark ? '#b3b3b3' : '#5b5b7a' }]}>
                    {name} is typing
                </Text>
                <View style={styles.dots}>
                    <Animated.View style={[styles.dot, { opacity: dot1 }]} />
                    <Animated.View style={[styles.dot, { opacity: dot2 }]} />
                    <Animated.View style={[styles.dot, { opacity: dot3 }]} />
                </View>
            </View>
        </View>
    );
}

const getStyles = (isDark) => StyleSheet.create({
    container: {
        marginVertical: 8,
        alignItems: 'flex-start',
    },
    bubble: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    name: {
        fontSize: 12,
        marginRight: 8,
    },
    dots: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#e50914',
        marginHorizontal: 2,
    },
});