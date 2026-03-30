// components/messages/TypingIndicator.js
import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export default function TypingIndicator({ name }) {
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

    const opacity = dot1.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 1],
    });

    return (
        <View style={styles.container}>
            <View style={styles.bubble}>
                <Text style={styles.name}>{name} is typing</Text>
                <View style={styles.dots}>
                    <Animated.View style={[styles.dot, { opacity: dot1 }]} />
                    <Animated.View style={[styles.dot, { opacity: dot2 }]} />
                    <Animated.View style={[styles.dot, { opacity: dot3 }]} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 8,
        alignItems: 'flex-start',
    },
    bubble: {
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#edeef5',
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        fontSize: 12,
        color: '#5b5b7a',
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
        backgroundColor: '#7c3aed',
        marginHorizontal: 2,
    },
});