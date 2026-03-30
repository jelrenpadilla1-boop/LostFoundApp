import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function LoadingSpinner({ size = 'large', color = '#00f0c8' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});