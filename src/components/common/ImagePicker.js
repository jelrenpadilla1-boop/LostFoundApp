import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export const pickImage = async (options = {}) => {
  // Request permissions
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Please grant permission to access photos');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
    base64: false,
    ...options,
  });

  if (!result.canceled) {
    return result.assets[0];
  }
  
  return null;
};

export const takePhoto = async () => {
  // Request camera permissions
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Please grant permission to use camera');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    return result.assets[0];
  }
  
  return null;
};

export const createImageFormData = (imageUri, fieldName = 'photo') => {
  const formData = new FormData();
  
  // Get file extension from URI
  const uriParts = imageUri.split('.');
  const fileType = uriParts[uriParts.length - 1];
  
  formData.append(fieldName, {
    uri: imageUri,
    name: `photo.${fileType}`,
    type: `image/${fileType}`,
  });
  
  return formData;
};