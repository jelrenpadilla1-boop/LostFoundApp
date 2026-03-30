// src/screens/items/CreateItemScreen.js
import Icon from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { foundItemsAPI, lostItemsAPI } from '../../api/items';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export default function CreateItemScreen({ route, navigation }) {
  const { type } = route.params;
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    description: '',
    category: '',
    photo: null,
    photoUri: null,
    date_lost: new Date(),
    date_found: new Date(),
    latitude: user?.latitude || '',
    longitude: user?.longitude || '',
    lost_location: '',
    found_location: '',
  });

  const categories = [
    { value: 'Electronics', label: '📱 Electronics', icon: 'phone-portrait-outline' },
    { value: 'Documents', label: '📄 Documents', icon: 'document-text-outline' },
    { value: 'Jewelry', label: '💎 Jewelry', icon: 'diamond-outline' },
    { value: 'Clothing', label: '👕 Clothing', icon: 'shirt-outline' },
    { value: 'Bags', label: '🎒 Bags', icon: 'bag-outline' },
    { value: 'Keys', label: '🔑 Keys', icon: 'key-outline' },
    { value: 'Wallet', label: '👛 Wallet', icon: 'wallet-outline' },
    { value: 'Books', label: '📚 Books', icon: 'book-outline' },
    { value: 'Sports', label: '⚽ Sports', icon: 'basketball-outline' },
    { value: 'Other', label: '📦 Other', icon: 'cube-outline' },
  ];

  useEffect(() => {
    loadThemePreference();
    requestMediaPermissions();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('foundify-theme');
      if (savedTheme === 'dark') {
        setIsDarkMode(true);
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  const requestMediaPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please grant permission to access your photos to upload images.');
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const handleImagePick = async () => {
    try {
      // Launch image picker with Expo's ImagePicker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: false,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        // Check file size (2MB limit) - approximate by checking if we can read the file
        const fileInfo = await fetch(asset.uri).then(res => res.blob());
        if (fileInfo.size > 2 * 1024 * 1024) {
          Alert.alert('Error', 'File size must be less than 2MB');
          return;
        }
        
        // Get file extension
        const uriParts = asset.uri.split('.');
        const fileExt = uriParts[uriParts.length - 1] || 'jpg';
        const fileName = `photo_${Date.now()}.${fileExt}`;
        
        setFormData({
          ...formData,
          photo: {
            uri: asset.uri,
            type: `image/${fileExt}`,
            name: fileName,
          },
          photoUri: asset.uri,
        });
        
        console.log('Photo selected:', asset.uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location services to use this feature.');
        setGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const lat = location.coords.latitude.toFixed(6);
      const lng = location.coords.longitude.toFixed(6);
      
      setFormData({
        ...formData,
        latitude: lat,
        longitude: lng,
      });
      
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
        });
        
        if (reverseGeocode && reverseGeocode[0]) {
          const address = reverseGeocode[0];
          const formattedAddress = [
            address.name,
            address.street,
            address.city,
            address.region,
          ].filter(Boolean).join(', ');
          
          if (type === 'lost') {
            setFormData({ ...formData, lost_location: formattedAddress, latitude: lat, longitude: lng });
          } else {
            setFormData({ ...formData, found_location: formattedAddress, latitude: lat, longitude: lng });
          }
        } else {
          if (type === 'lost') {
            setFormData({ ...formData, lost_location: `${lat}, ${lng}`, latitude: lat, longitude: lng });
          } else {
            setFormData({ ...formData, found_location: `${lat}, ${lng}`, latitude: lat, longitude: lng });
          }
        }
      } catch (geoError) {
        console.log('Reverse geocoding failed:', geoError);
        if (type === 'lost') {
          setFormData({ ...formData, lost_location: `${lat}, ${lng}`, latitude: lat, longitude: lng });
        } else {
          setFormData({ ...formData, found_location: `${lat}, ${lng}`, latitude: lat, longitude: lng });
        }
      }
      
      Alert.alert('Success', 'Location retrieved successfully!');
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Unable to retrieve location. Please enter manually.');
    } finally {
      setGettingLocation(false);
    }
  };

  const clearLocation = () => {
    setFormData({
      ...formData,
      latitude: '',
      longitude: '',
      lost_location: '',
      found_location: '',
    });
    Alert.alert('Success', 'Location fields cleared');
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.item_name.trim()) {
      Alert.alert('Error', 'Please enter the item name');
      return;
    }
    if (!formData.category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('item_name', formData.item_name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      
      if (type === 'lost') {
        formDataToSend.append('date_lost', formData.date_lost.toISOString().split('T')[0]);
        if (formData.lost_location) {
          formDataToSend.append('lost_location', formData.lost_location);
        }
      } else {
        formDataToSend.append('date_found', formData.date_found.toISOString().split('T')[0]);
        if (formData.found_location) {
          formDataToSend.append('found_location', formData.found_location);
        }
      }
      
      if (formData.latitude) {
        formDataToSend.append('latitude', formData.latitude);
      }
      if (formData.longitude) {
        formDataToSend.append('longitude', formData.longitude);
      }
      
      // Fix: Properly format the photo for FormData on real devices
      if (formData.photo && formData.photoUri) {
        const uri = formData.photoUri;
        
        // Get file name from URI or generate one
        let filename = formData.photo.name || uri.split('/').pop() || `photo_${Date.now()}.jpg`;
        
        // For Android, the URI might need to be handled differently
        let fileUri = uri;
        if (Platform.OS === 'android') {
          // For Android, ensure the URI starts with file:// or content://
          if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
            fileUri = `file://${uri}`;
          }
        }
        
        // Determine mime type from filename
        const ext = filename.split('.').pop().toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === 'png') mimeType = 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        if (ext === 'gif') mimeType = 'image/gif';
        
        formDataToSend.append('photo', {
          uri: fileUri,
          type: mimeType,
          name: filename,
        });
        
        console.log('Photo appended:', { uri: fileUri, type: mimeType, name: filename });
      }
      
      console.log('Submitting form data...');
      
      let response;
      if (type === 'lost') {
        response = await lostItemsAPI.create(formDataToSend);
      } else {
        response = await foundItemsAPI.create(formDataToSend);
      }
      
      console.log('Response:', response.data);
      
      Alert.alert(
        'Success',
        type === 'lost' 
          ? 'Lost item reported successfully! It will be visible after admin approval.'
          : 'Found item reported successfully! It will be visible after admin approval.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Submit error:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to create item. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.errors) {
        const errors = Object.values(error.response.data.errors).flat();
        errorMessage = errors.join('\n');
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(isDarkMode);
  const isLost = type === 'lost';

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View>
            <View style={styles.titleRow}>
              <Icon name={isLost ? "search" : "checkmark-circle"} size={28} color="#7c3aed" />
              <Text style={styles.title}>
                {isLost ? 'Report Lost Item' : 'Report Found Item'}
              </Text>
            </View>
            <Text style={styles.subtitle}>
              {isLost 
                ? 'Help us help you find your lost item — provide as much detail as possible'
                : 'Help someone find their belonging — provide accurate details'
              }
            </Text>
          </View>
         
        </View>

        {/* Main Form Card */}
        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Icon name="add-circle-outline" size={18} color="#7c3aed" />
            <Text style={styles.cardTitle}>Item Details</Text>
          </View>

          <View style={styles.cardBody}>
            {/* Photo Upload */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>
                <Icon name="camera-outline" size={16} color="#7c3aed" />
                {'  '}Photo
              </Text>
              
              <TouchableOpacity style={styles.photoUpload} onPress={handleImagePick}>
                {formData.photoUri ? (
                  <View style={styles.photoPreview}>
                    <Image source={{ uri: formData.photoUri }} style={styles.previewImage} />
                    <TouchableOpacity 
                      style={styles.removePhoto}
                      onPress={() => setFormData({ ...formData, photo: null, photoUri: null })}
                    >
                      <Icon name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Icon name="cloud-upload-outline" size={48} color="#7c3aed" />
                    <Text style={styles.uploadText}>Click to upload photo</Text>
                    <Text style={styles.uploadHint}>JPG, PNG up to 2MB</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Basic Information */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>
                <Icon name="information-circle-outline" size={16} color="#7c3aed" />
                {'  '}Basic Information
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Item Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., iPhone 14 Pro, Brown Leather Wallet"
                  placeholderTextColor={isDarkMode ? '#938bb0' : '#7e7b9a'}
                  value={formData.item_name}
                  onChangeText={(text) => setFormData({ ...formData, item_name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Category <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity 
                  style={styles.categorySelector}
                  onPress={() => setShowCategoryModal(true)}
                >
                  <Text style={styles.categorySelectorText}>
                    {formData.category || 'Select Category'}
                  </Text>
                  <Icon name="chevron-down" size={16} color="#7c3aed" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Description <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="Describe your item in detail (color, brand, size, serial number, distinguishing marks, etc.)"
                  placeholderTextColor={isDarkMode ? '#938bb0' : '#7e7b9a'}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={5}
                />
                <View style={styles.formHint}>
                  <Icon name="information-circle-outline" size={12} color="#7c3aed" />
                  <Text style={styles.hintText}>
                    The more details you provide, the easier it is to match with found items.
                  </Text>
                </View>
              </View>
            </View>

            {/* Date Section */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>
                <Icon name="calendar-outline" size={16} color="#7c3aed" />
                {'  '}Date
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  {isLost ? 'Date Lost' : 'Date Found'} <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Icon name="calendar-outline" size={18} color="#7c3aed" />
                  <Text style={styles.dateText}>
                    {isLost 
                      ? formData.date_lost.toLocaleDateString()
                      : formData.date_found.toLocaleDateString()
                    }
                  </Text>
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={isLost ? formData.date_lost : formData.date_found}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        if (isLost) {
                          setFormData({ ...formData, date_lost: selectedDate });
                        } else {
                          setFormData({ ...formData, date_found: selectedDate });
                        }
                      }
                    }}
                  />
                )}
              </View>
            </View>

            {/* Location Section */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>
                <Icon name="location-outline" size={16} color="#7c3aed" />
                {'  '}Location
              </Text>

              <View style={styles.infoBox}>
                <Icon name="information-circle-outline" size={16} color="#3b82f6" />
                <Text style={styles.infoText}>
                  Providing accurate location helps our matching system find nearby items.
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  {isLost ? 'Lost Location' : 'Found Location'} <Text style={styles.optional}>(Optional)</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={isLost ? "e.g., Central Park, Starbucks on 5th Ave" : "e.g., Library, Bus Stop"}
                  placeholderTextColor={isDarkMode ? '#938bb0' : '#7e7b9a'}
                  value={isLost ? formData.lost_location : formData.found_location}
                  onChangeText={(text) => {
                    if (isLost) {
                      setFormData({ ...formData, lost_location: text });
                    } else {
                      setFormData({ ...formData, found_location: text });
                    }
                  }}
                />
              </View>

              <View style={styles.coordinatesRow}>
                <View style={[styles.formGroup, styles.coordinateField]}>
                  <Text style={styles.formLabel}>Latitude</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="40.7128"
                    placeholderTextColor={isDarkMode ? '#938bb0' : '#7e7b9a'}
                    value={formData.latitude?.toString()}
                    onChangeText={(text) => setFormData({ ...formData, latitude: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.formGroup, styles.coordinateField]}>
                  <Text style={styles.formLabel}>Longitude</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="-74.0060"
                    placeholderTextColor={isDarkMode ? '#938bb0' : '#7e7b9a'}
                    value={formData.longitude?.toString()}
                    onChangeText={(text) => setFormData({ ...formData, longitude: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.locationActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.primaryButton]} 
                  onPress={getCurrentLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="location-outline" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Use My Location</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.secondaryButton]} 
                  onPress={clearLocation}
                >
                  <Icon name="close-outline" size={16} color="#7c3aed" />
                  <Text style={[styles.actionButtonText, { color: '#7c3aed' }]}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Form Actions */}
            <View style={styles.formActions}>
              <TouchableOpacity 
                style={[styles.submitButton, styles.cancelButton]} 
                onPress={() => navigation.goBack()}
              >
                <Icon name="close-outline" size={18} color="#fff" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitButton, styles.primarySubmit]} 
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="send-outline" size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>
                      {isLost ? 'Report Lost Item' : 'Report Found Item'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tips Card */}
        <View style={[styles.formCard, styles.tipsCard]}>
          <View style={styles.cardHeader}>
            <Icon name="bulb-outline" size={18} color="#f59e0b" />
            <Text style={styles.cardTitle}>Tips for Better Results</Text>
          </View>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Icon name="checkmark-circle-outline" size={14} color="#10b981" />
              <Text style={styles.tipText}>Report as soon as possible — the sooner you report, the better your chances</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="checkmark-circle-outline" size={14} color="#10b981" />
              <Text style={styles.tipText}>Include clear, high-quality photos of your item</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="checkmark-circle-outline" size={14} color="#10b981" />
              <Text style={styles.tipText}>Mention unique details like serial numbers, engravings, or custom features</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="checkmark-circle-outline" size={14} color="#10b981" />
              <Text style={styles.tipText}>Be specific about the exact location and time you lost/found it</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="checkmark-circle-outline" size={14} color="#10b981" />
              <Text style={styles.tipText}>Check your notifications regularly for potential match alerts</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowCategoryModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Icon name="close" size={24} color="#7c3aed" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryOption,
                    formData.category === cat.value && styles.categoryOptionActive,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, category: cat.value });
                    setShowCategoryModal(false);
                  }}
                >
                  <Icon name={cat.icon} size={20} color={formData.category === cat.value ? '#fff' : '#7c3aed'} />
                  <Text style={[
                    styles.categoryOptionText,
                    formData.category === cat.value && styles.categoryOptionTextActive,
                  ]}>
                    {cat.label}
                  </Text>
                  {formData.category === cat.value && (
                    <Icon name="checkmark" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const getStyles = (isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#12101c' : '#faf9fe',
  },
  scrollView: {
    flex: 1,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#2a2438' : '#edeef5',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: isDarkMode ? '#f0edfc' : '#1e1b2f',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: isDarkMode ? '#b4adcf' : '#5b5b7a',
    maxWidth: width - 120,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDarkMode ? '#2d2648' : '#ede9fe',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 40,
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7c3aed',
  },
  formCard: {
    backgroundColor: isDarkMode ? '#191624' : '#ffffff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#2a2438' : '#edeef5',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  tipsCard: {
    marginBottom: 30,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: isDarkMode ? '#12101c' : '#faf9fe',
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#2a2438' : '#edeef5',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: isDarkMode ? '#f0edfc' : '#1e1b2f',
  },
  cardBody: {
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#2a2438' : '#edeef5',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: isDarkMode ? '#f0edfc' : '#1e1b2f',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? '#f0edfc' : '#1e1b2f',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  optional: {
    fontSize: 10,
    color: isDarkMode ? '#938bb0' : '#7e7b9a',
    fontWeight: '400',
  },
  formInput: {
    backgroundColor: isDarkMode ? '#1e1a2f' : '#ffffff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#2a2438' : '#edeef5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: isDarkMode ? '#f0edfc' : '#1e1b2f',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  formHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  hintText: {
    fontSize: 11,
    color: isDarkMode ? '#b4adcf' : '#5b5b7a',
    flex: 1,
  },
  photoUpload: {
    marginBottom: 8,
  },
  photoPreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 4,
  },
  uploadPlaceholder: {
    borderWidth: 2,
    borderColor: isDarkMode ? '#2a2438' : '#edeef5',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDarkMode ? '#f0edfc' : '#1e1b2f',
    marginTop: 12,
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 10,
    color: isDarkMode ? '#938bb0' : '#7e7b9a',
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#1e1a2f' : '#ffffff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#2a2438' : '#edeef5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  categorySelectorText: {
    fontSize: 14,
    color: isDarkMode ? '#f0edfc' : '#1e1b2f',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: isDarkMode ? '#1e1a2f' : '#ffffff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#2a2438' : '#edeef5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 14,
    color: isDarkMode ? '#f0edfc' : '#1e1b2f',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: isDarkMode ? '#b4adcf' : '#5b5b7a',
    flex: 1,
  },
  coordinatesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coordinateField: {
    flex: 1,
  },
  locationActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 40,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#7c3aed',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#2a2438' : '#edeef5',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 40,
    flex: 1,
  },
  primarySubmit: {
    backgroundColor: '#7c3aed',
  },
  cancelButton: {
    backgroundColor: isDarkMode ? '#2a2438' : '#f0f0f0',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? '#b4adcf' : '#5b5b7a',
  },
  tipsList: {
    padding: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#2a2438' : '#edeef5',
  },
  tipText: {
    fontSize: 12,
    color: isDarkMode ? '#b4adcf' : '#5b5b7a',
    flex: 1,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: isDarkMode ? '#191624' : '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#2a2438' : '#edeef5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDarkMode ? '#f0edfc' : '#1e1b2f',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? '#2a2438' : '#edeef5',
  },
  categoryOptionActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  categoryOptionText: {
    fontSize: 15,
    color: isDarkMode ? '#f0edfc' : '#1e1b2f',
    flex: 1,
  },
  categoryOptionTextActive: {
    color: '#fff',
  },
});