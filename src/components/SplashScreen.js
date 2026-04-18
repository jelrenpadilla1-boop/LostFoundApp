// src/components/SplashScreen.js
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Start animation sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();

    // Wait 2.5 seconds then fade out and finish
    const timeout = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#0a0a0a', '#141414']}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
          },
        ]}
      >
        <View style={styles.logoWrapper}>
          <Text style={styles.logo}>
            Found<Text style={styles.logoAccent}>ify</Text>
          </Text>
          <View style={styles.redBar} />
        </View>
        <Text style={styles.tagline}>Reuniting what matters</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
    color: '#ffffff',
    textAlign: 'center',
  },
  logoAccent: {
    color: '#e50914',
  },
  redBar: {
    width: 60,
    height: 3,
    backgroundColor: '#e50914',
    marginTop: 8,
    borderRadius: 2,
  },
  tagline: {
    fontSize: 14,
    color: '#b3b3b3',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
});