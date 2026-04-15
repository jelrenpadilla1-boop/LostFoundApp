// src/screens/items/CreateItemScreen.js
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
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
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { foundItemsAPI, lostItemsAPI } from '../../api/items';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function CreateItemScreen({ route, navigation }) {
  const { type } = route.params;
  const { user, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
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
    { value: 'Electronics', label: 'Electronics', icon: 'smartphone', emoji: '📱' },
    { value: 'Documents', label: 'Documents', icon: 'file-text', emoji: '📄' },
    { value: 'Jewelry', label: 'Jewelry', icon: 'diamond', emoji: '💎' },
    { value: 'Clothing', label: 'Clothing', icon: 'shirt', emoji: '👕' },
    { value: 'Bags', label: 'Bags', icon: 'briefcase', emoji: '🎒' },
    { value: 'Keys', label: 'Keys', icon: 'key', emoji: '🔑' },
    { value: 'Wallet', label: 'Wallet', icon: 'credit-card', emoji: '👛' },
    { value: 'Books', label: 'Books', icon: 'book', emoji: '📚' },
    { value: 'Sports', label: 'Sports', icon: 'activity', emoji: '⚽' },
    { value: 'Other', label: 'Other', icon: 'box', emoji: '📦' },
  ];

  useEffect(() => {
    requestMediaPermissions();
  }, []);

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

  const normalizeUri = (uri) => {
    if (!uri) return null;
    if (uri.startsWith('content://') || uri.startsWith('http://') || uri.startsWith('https://')) {
      return uri;
    }
    if (!uri.startsWith('file://')) {
      return `file://${uri}`;
    }
    return uri;
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: false,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
          Alert.alert('Error', 'File size must be less than 2MB');
          return;
        }

        const uriParts = asset.uri.split('.');
        const fileExt = uriParts[uriParts.length - 1].split('?')[0] || 'jpg';
        const fileName = `photo_${Date.now()}.${fileExt}`;
        const normalizedUri = normalizeUri(asset.uri);

        setFormData(prev => ({
          ...prev,
          photo: {
            uri: normalizedUri,
            type: asset.mimeType || `image/${fileExt}`,
            name: fileName,
          },
          photoUri: normalizedUri,
        }));
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // FIXED: Improved location function with better error handling
  const getCurrentLocation = async () => {
    setGettingLocation(true);
    setLocationError(null);
    
    try {
      // First, check and request permissions (this will also prompt the user)
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to get your current location. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.openSettings() }
          ]
        );
        setGettingLocation(false);
        return;
      }

      // Now try to get the current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000, // Increased timeout
      });
      
      const lat = location.coords.latitude.toFixed(6);
      const lng = location.coords.longitude.toFixed(6);
      
      setFormData(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng,
      }));
      
      // Try reverse geocoding to get address
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
        });
        
        if (reverseGeocode && reverseGeocode.length > 0) {
          const address = reverseGeocode[0];
          const addressParts = [];
          
          if (address.name) addressParts.push(address.name);
          if (address.street) addressParts.push(address.street);
          if (address.district) addressParts.push(address.district);
          if (address.city) addressParts.push(address.city);
          if (address.region) addressParts.push(address.region);
          
          const formattedAddress = addressParts.join(', ');
          const locationField = type === 'lost' ? 'lost_location' : 'found_location';
          
          setFormData(prev => ({
            ...prev,
            [locationField]: formattedAddress || `${lat}, ${lng}`,
          }));
        } else {
          const locationField = type === 'lost' ? 'lost_location' : 'found_location';
          setFormData(prev => ({
            ...prev,
            [locationField]: `${lat}, ${lng}`,
          }));
        }
      } catch (geoError) {
        console.log('Reverse geocoding failed:', geoError);
        const locationField = type === 'lost' ? 'lost_location' : 'found_location';
        setFormData(prev => ({
          ...prev,
          [locationField]: `${lat}, ${lng}`,
        }));
      }
      
      Alert.alert('Success', 'Location retrieved successfully!');
    } catch (error) {
      console.error('Location error:', error);
      
      // Handle specific error cases
      let errorMessage = 'Unable to retrieve location.';
      
      if (error.code === Location.LocationErrorCode.LocationUnavailable) {
        errorMessage = 'Location service is unavailable. Please check your device settings and try again.';
      } else if (error.code === Location.LocationErrorCode.Timeout) {
        errorMessage = 'Location request timed out. Please try again in an area with better GPS signal.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setLocationError(errorMessage);
      Alert.alert('Location Error', errorMessage);
    } finally {
      setGettingLocation(false);
    }
  };

  const clearLocation = () => {
    setFormData(prev => ({
      ...prev,
      latitude: '',
      longitude: '',
      lost_location: '',
      found_location: '',
    }));
    setLocationError(null);
    Alert.alert('Info', 'Location fields cleared');
  };

  const handleSubmit = async () => {
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
      
      if (formData.photo && formData.photoUri) {
        const uri = formData.photoUri;
        const filename = formData.photo.name || `photo_${Date.now()}.jpg`;
        const ext = filename.split('.').pop().toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === 'png') mimeType = 'image/png';
        if (ext === 'gif') mimeType = 'image/gif';
        
        formDataToSend.append('photo', {
          uri,
          type: mimeType,
          name: filename,
        });
      }
      
      let response;
      if (type === 'lost') {
        response = await lostItemsAPI.create(formDataToSend);
      } else {
        response = await foundItemsAPI.create(formDataToSend);
      }
      
      Alert.alert(
        'Success',
        type === 'lost' 
          ? 'Lost item reported successfully! It will be visible after admin approval.'
          : 'Found item reported successfully! It will be visible after admin approval.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Submit error:', error);
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

  const theme = isDark ? darkTheme : lightTheme;
  const styles = getStyles(isDark, theme);
  const isLost = type === 'lost';

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
         
          {/* Page Header */}
          <View style={styles.pageHeader}>
            <View style={styles.titleRow}>
              <View style={styles.iconBadge}>
                <Feather name={isLost ? "search" : "check-circle"} size={28} color="#e50914" />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                {isLost ? 'Report Lost Item' : 'Report Found Item'}
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {isLost 
                ? 'Help us help you find your lost item — provide as much detail as possible'
                : 'Help someone find their belonging — provide accurate details'
              }
            </Text>
          </View>

          {/* Main Form Card */}
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.cardHeader, { backgroundColor: theme.dark, borderBottomColor: theme.border }]}>
              <Feather name="plus-circle" size={18} color="#e50914" />
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {isLost ? 'Lost Item Details' : 'Found Item Details'}
              </Text>
            </View>

            <View style={styles.cardBody}>
              {/* Two Column Layout */}
              <View style={styles.formGrid}>
                {/* Left Column */}
                <View>
                  {/* Basic Information */}
                  <View style={[styles.formSection, { borderBottomColor: theme.border }]}>
                    <View style={styles.sectionHeader}>
                      <Feather name="info" size={16} color="#e50914" />
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Basic Information</Text>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={[styles.formLabel, { color: theme.textSecondary }]}>
                        Item Name <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                        placeholder="e.g., iPhone 14 Pro, Brown Leather Wallet"
                        placeholderTextColor={theme.textMuted}
                        value={formData.item_name}
                        onChangeText={(text) => setFormData({ ...formData, item_name: text })}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={[styles.formLabel, { color: theme.textSecondary }]}>
                        Category <Text style={styles.required}>*</Text>
                      </Text>
                      <TouchableOpacity 
                        style={[styles.categorySelector, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
                        onPress={() => setShowCategoryModal(true)}
                      >
                        <Text style={[styles.categorySelectorText, { color: theme.text }]}>
                          {formData.category || 'Select Category'}
                        </Text>
                        <Feather name="chevron-down" size={16} color="#e50914" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={[styles.formLabel, { color: theme.textSecondary }]}>
                        Description <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={[styles.formInput, styles.textArea, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                        placeholder="Describe your item in detail (color, brand, size, serial number, distinguishing marks, etc.)"
                        placeholderTextColor={theme.textMuted}
                        value={formData.description}
                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                        multiline
                        numberOfLines={5}
                      />
                      <View style={[styles.infoBoxSmall, { backgroundColor: isDark ? 'rgba(33,150,243,0.1)' : '#e3f2fd' }]}>
                        <Feather name="info" size={12} color="#2196f3" />
                        <Text style={[styles.hintText, { color: theme.textSecondary }]}>
                          The more details you provide, the easier it is to match with found items.
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Location Information (moved to left column) */}
                  <View style={[styles.formSection, { borderBottomColor: theme.border }]}>
                    <View style={styles.sectionHeader}>
                      <Feather name="map-pin" size={16} color="#e50914" />
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Location</Text>
                    </View>

                    <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(229,9,20,0.1)' : '#fff5f5' }]}>
                      <Feather name="info" size={16} color="#e50914" />
                      <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                        Providing accurate location helps our matching system find nearby items.
                      </Text>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={[styles.formLabel, { color: theme.textSecondary }]}>
                        {isLost ? 'Lost Location' : 'Found Location'} <Text style={styles.optional}>(Optional)</Text>
                      </Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                        placeholder={isLost ? "e.g., Central Park, Starbucks on 5th Ave" : "e.g., Library, Bus Stop"}
                        placeholderTextColor={theme.textMuted}
                        value={isLost ? formData.lost_location : formData.found_location}
                        onChangeText={(text) => {
                          if (isLost) {
                            setFormData(prev => ({ ...prev, lost_location: text }));
                          } else {
                            setFormData(prev => ({ ...prev, found_location: text }));
                          }
                        }}
                      />
                    </View>

                    <View style={styles.coordinatesRow}>
                      <View style={[styles.formGroup, styles.coordinateField]}>
                        <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Latitude</Text>
                        <TextInput
                          style={[styles.formInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                          placeholder="40.7128"
                          placeholderTextColor={theme.textMuted}
                          value={formData.latitude?.toString()}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, latitude: text }))}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={[styles.formGroup, styles.coordinateField]}>
                        <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Longitude</Text>
                        <TextInput
                          style={[styles.formInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                          placeholder="-74.0060"
                          placeholderTextColor={theme.textMuted}
                          value={formData.longitude?.toString()}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, longitude: text }))}
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
                            <Feather name="navigation" size={16} color="#fff" />
                            <Text style={styles.actionButtonText}>Use My Location</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.secondaryButton, { borderColor: theme.border }]} 
                        onPress={clearLocation}
                      >
                        <Feather name="x" size={16} color="#e50914" />
                        <Text style={[styles.actionButtonText, { color: '#e50914' }]}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {locationError && (
                      <View style={[styles.locationErrorBox, { backgroundColor: isDark ? 'rgba(229,9,20,0.15)' : '#fee' }]}>
                        <Feather name="alert-circle" size={16} color="#e50914" />
                        <Text style={[styles.locationErrorText, { color: '#e50914' }]}>{locationError}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Right Column */}
                <View>
                  {/* Date & Photo (moved to right column) */}
                  <View style={[styles.formSection, { borderBottomColor: theme.border }]}>
                    <View style={styles.sectionHeader}>
                      <Feather name="calendar" size={16} color="#e50914" />
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Date & Photo</Text>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={[styles.formLabel, { color: theme.textSecondary }]}>
                        {isLost ? 'Date Lost' : 'Date Found'} <Text style={styles.required}>*</Text>
                      </Text>
                      <TouchableOpacity 
                        style={[styles.dateButton, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Feather name="calendar" size={18} color="#e50914" />
                        <Text style={[styles.dateText, { color: theme.text }]}>
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
                            setShowDatePicker(Platform.OS === 'ios');
                            if (selectedDate) {
                              if (isLost) {
                                setFormData(prev => ({ ...prev, date_lost: selectedDate }));
                              } else {
                                setFormData(prev => ({ ...prev, date_found: selectedDate }));
                              }
                            }
                          }}
                        />
                      )}
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={[styles.formLabel, { color: theme.textSecondary }]}>
                        Photo <Text style={styles.optional}>(Optional)</Text>
                      </Text>
                      
                      {formData.photoUri ? (
                        <TouchableOpacity
                          style={styles.photoPreviewContainer}
                          onPress={handleImagePick}
                          activeOpacity={0.9}
                        >
                          <Image
                            source={{ uri: formData.photoUri }}
                            style={styles.previewImage}
                            resizeMode="cover"
                          />
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.7)']}
                            style={styles.photoOverlay}
                          >
                            <Feather name="camera" size={18} color="#fff" />
                            <Text style={styles.photoOverlayText}>Tap to change</Text>
                          </LinearGradient>
                          <TouchableOpacity
                            style={styles.removePhoto}
                            onPress={(e) => {
                              e.stopPropagation();
                              setFormData(prev => ({ ...prev, photo: null, photoUri: null }));
                            }}
                          >
                            <Feather name="x-circle" size={28} color="#e50914" />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity 
                          style={[styles.uploadPlaceholder, { borderColor: theme.border, backgroundColor: theme.inputBg }]} 
                          onPress={handleImagePick}
                        >
                          <Feather name="cloud-upload" size={48} color="#e50914" />
                          <Text style={[styles.uploadText, { color: theme.text }]}>Click to upload photo</Text>
                          <Text style={[styles.uploadHint, { color: theme.textMuted }]}>JPG, PNG up to 2MB</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Photo Preview */}
                  <View style={[styles.formSection, { borderBottomColor: theme.border }]}>
                    <View style={styles.sectionHeader}>
                      <Feather name="image" size={16} color="#e50914" />
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Photo Preview</Text>
                    </View>

                    <View style={[styles.photoPreview, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
                      {formData.photoUri ? (
                        <Image source={{ uri: formData.photoUri }} style={styles.previewThumb} resizeMode="cover" />
                      ) : (
                        <View style={styles.previewPlaceholder}>
                          <Feather name="image" size={48} color={theme.textMuted} />
                          <Text style={[styles.previewPlaceholderText, { color: theme.textMuted }]}>No photo selected</Text>
                          <Text style={[styles.previewPlaceholderSmall, { color: theme.textMuted }]}>Preview will appear here</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Form Actions */}
              <View style={[styles.formActions, { borderTopColor: theme.border }]}>
                <TouchableOpacity 
                  style={[styles.submitButton, styles.cancelButton, { backgroundColor: theme.inputBg, borderColor: theme.border }]} 
                  onPress={() => navigation.goBack()}
                >
                  <Feather name="x" size={18} color={theme.textSecondary} />
                  <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
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
                      <Feather name="send" size={18} color="#fff" />
                      <Text style={styles.submitButtonText}>
                        {isLost ? 'Report Lost Item' : 'Report Found Item'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Help Card */}
          <View style={[styles.helpCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.cardHeader, { backgroundColor: theme.dark, borderBottomColor: theme.border }]}>
              <Feather name="lightbulb" size={18} color="#f5c518" />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Tips for Better Results</Text>
            </View>
            <View style={styles.tipsList}>
              {[
                'Report as soon as possible — the sooner you report, the better your chances',
                'Include clear, high-quality photos of your item',
                'Mention unique details like serial numbers, engravings, or custom features',
                'Be specific about the exact location and time you lost/found it',
                'Check your notifications regularly for potential match alerts',
                'Keep your contact information up to date in your profile',
              ].map((tip, i) => (
                <View key={i} style={[styles.tipItem, { borderBottomColor: theme.border }]}>
                  <Feather name="check-circle" size={14} color="#2e7d32" />
                  <Text style={[styles.tipText, { color: theme.textSecondary }]}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>

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
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Feather name="x" size={24} color="#e50914" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryOption,
                    { borderColor: theme.border },
                    formData.category === cat.value && styles.categoryOptionActive,
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, category: cat.value }));
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[
                    styles.categoryOptionText,
                    { color: theme.text },
                    formData.category === cat.value && styles.categoryOptionTextActive,
                  ]}>
                    {cat.label}
                  </Text>
                  {formData.category === cat.value && (
                    <Feather name="check" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Themes matching web version
const darkTheme = {
  background: '#141414',
  card: '#1a1a1a',
  dark: '#0a0a0a',
  inputBg: 'rgba(255,255,255,0.05)',
  text: '#ffffff',
  textSecondary: '#e5e5e5',
  textMuted: '#b3b3b3',
  border: '#333333',
};

const lightTheme = {
  background: '#f5f5f5',
  card: '#ffffff',
  dark: '#fafafa',
  inputBg: 'rgba(0,0,0,0.02)',
  text: '#1a1a1a',
  textSecondary: '#333333',
  textMuted: '#666666',
  border: '#e0e0e0',
};

const getStyles = (isDark, theme) => StyleSheet.create({
  root: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(229,9,20,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageHeader: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(229,9,20,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 24,
    marginBottom: 16,
    overflow: 'hidden',
  },
  helpCard: {
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 24,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardBody: {
    padding: 20,
  },
  formGrid: {
    gap: 24,
  },
  formSection: {
    marginBottom: 24,
    borderBottomWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  required: {
    color: '#e50914',
  },
  optional: {
    fontSize: 10,
    fontWeight: '400',
    textTransform: 'none',
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoBoxSmall: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    padding: 10,
    borderRadius: 4,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
  },
  hintText: {
    fontSize: 11,
    flex: 1,
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  categorySelectorText: {
    fontSize: 14,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 14,
  },
  photoPreviewContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  photoOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  removePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 2,
  },
  uploadPlaceholder: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 10,
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
    borderRadius: 4,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#e50914',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  locationErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 4,
    padding: 10,
    marginTop: 12,
  },
  locationErrorText: {
    fontSize: 12,
    flex: 1,
  },
  photoPreview: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewThumb: {
    width: '100%',
    height: 220,
  },
  previewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  previewPlaceholderText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 12,
  },
  previewPlaceholderSmall: {
    fontSize: 10,
    marginTop: 4,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 4,
    flex: 1,
  },
  primarySubmit: {
    backgroundColor: '#e50914',
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  },
  tipText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  bottomSpacing: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  categoryOptionActive: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryOptionText: {
    fontSize: 15,
    flex: 1,
  },
  categoryOptionTextActive: {
    color: '#fff',
  },
});