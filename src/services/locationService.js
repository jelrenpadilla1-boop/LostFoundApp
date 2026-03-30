import * as Location from 'expo-location';
import { Alert } from 'react-native';

export const getCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Location permission is required to show nearby items');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
};

export const getAddressFromCoordinates = async (latitude, longitude) => {
  try {
    const address = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    
    if (address.length > 0) {
      const addr = address[0];
      return `${addr.name || ''} ${addr.street || ''} ${addr.city || ''} ${addr.region || ''}`.trim();
    }
    return null;
  } catch (error) {
    console.error('Error getting address:', error);
    return null;
  }
};

export const watchLocation = (callback) => {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
    },
    (location) => {
      callback({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    }
  );
};