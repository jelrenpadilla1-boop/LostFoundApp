// src/screens/items/EditItemScreen.js
import { Feather } from '@expo/vector-icons';
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
const API_BASE_URL = 'http://192.168.1.5:8092';

export default function EditItemScreen({ route, navigation }) {
  const { type, id } = route.params;
  const { user, isAdmin } = useAuth();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [formData, setFormData] = useState({
    item_name: '',
    description: '',
    category: '',
    photo: null,
    photoUri: null,
    existing_photo: null,
    date_lost: new Date(),
    date_found: new Date(),
    latitude: '',
    longitude: '',
    lost_location: '',
    found_location: '',
    status: '',
  });

  const categories = [
    { value: 'Electronics', label: 'Electronics', emoji: '📱' },
    { value: 'Documents', label: 'Documents', emoji: '📄' },
    { value: 'Jewelry', label: 'Jewelry', emoji: '💎' },
    { value: 'Clothing', label: 'Clothing', emoji: '👕' },
    { value: 'Bags', label: 'Bags', emoji: '🎒' },
    { value: 'Keys', label: 'Keys', emoji: '🔑' },
    { value: 'Wallet', label: 'Wallet', emoji: '👛' },
    { value: 'Books', label: 'Books', emoji: '📚' },
    { value: 'Sports', label: 'Sports', emoji: '⚽' },
    { value: 'Other', label: 'Other', emoji: '📦' },
  ];

  const statusOptions = type === 'lost' 
    ? ['pending', 'approved', 'found', 'returned', 'rejected', 'recovered']
    : ['pending', 'approved', 'claimed', 'returned', 'disposed', 'rejected'];

  useEffect(() => {
    loadItem();
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

  const getImageUrl = (photo) => {
    if (!photo) return null;
    if (photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo;
    }
    if (photo.startsWith('/tmp/') || photo.startsWith('file://')) {
      return null;
    }
    let cleanPath = photo;
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }
    return `${API_BASE_URL}/storage/${cleanPath}`;
  };

  const loadItem = async () => {
    try {
      const response = await (type === 'lost'
        ? lostItemsAPI.getOne(id)
        : foundItemsAPI.getOne(id));
      const item = response.data?.data || response.data;
      
      setFormData({
        item_name: item.item_name || '',
        description: item.description || '',
        category: item.category || '',
        photo: null,
        photoUri: null,
        existing_photo: item.photo || null,
        date_lost: item.date_lost ? new Date(item.date_lost) : new Date(),
        date_found: item.date_found ? new Date(item.date_found) : new Date(),
        latitude: item.latitude?.toString() || '',
        longitude: item.longitude?.toString() || '',
        lost_location: item.lost_location || '',
        found_location: item.found_location || '',
        status: item.status || 'pending',
      });
    } catch (error) {
      console.error('Error loading item:', error);
      Alert.alert('Error', 'Failed to load item details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
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

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    setLocationError(null);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to get your current location.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.openSettings() }
          ]
        );
        setGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
      });
      
      const lat = location.coords.latitude.toFixed(6);
      const lng = location.coords.longitude.toFixed(6);
      
      setFormData(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng,
      }));
      
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
        }
      } catch (geoError) {
        console.log('Reverse geocoding failed:', geoError);
      }
      
      Alert.alert('Success', 'Location retrieved successfully!');
    } catch (error) {
      console.error('Location error:', error);
      setLocationError('Unable to retrieve location. Please check your GPS.');
      Alert.alert('Location Error', 'Unable to retrieve your location.');
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

    setSubmitting(true);
    
    try {
      const formDataToSend = new FormData();
      
      // Add _method for Laravel to interpret as PUT request
      formDataToSend.append('_method', 'PUT');
      formDataToSend.append('item_name', formData.item_name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      
      // Only admins can change status
      if (isAdmin && formData.status) {
        formDataToSend.append('status', formData.status);
      }
      
      // Date fields
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
      
      // Location coordinates
      if (formData.latitude) {
        formDataToSend.append('latitude', formData.latitude);
      }
      if (formData.longitude) {
        formDataToSend.append('longitude', formData.longitude);
      }
      
      // Handle remove photo
      if (formData.existing_photo === null && !formData.photo && formData.existing_photo !== null) {
        formDataToSend.append('remove_photo', '1');
      }
      
      // Handle new photo upload
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
      
      console.log('Sending update request...');
      
      let response;
      if (type === 'lost') {
        response = await lostItemsAPI.update(id, formDataToSend);
      } else {
        response = await foundItemsAPI.update(id, formDataToSend);
      }
      
      console.log('Update response:', response.data);
      
      if (response.data?.success) {
        Alert.alert(
          'Success',
          response.data.message || 'Item updated successfully!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to update item');
      }
    } catch (error) {
      console.error('Update error:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to update item. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const errors = Object.values(error.response.data.errors).flat();
        errorMessage = errors.join('\n');
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to edit this item.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Item not found.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;
  const styles = getStyles(isDark, theme);
  const isLost = type === 'lost';

  const photoUrl = formData.photoUri || getImageUrl(formData.existing_photo);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

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
                Edit {isLost ? 'Lost Item' : 'Found Item'}
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Update the details of this item
            </Text>
          </View>

          {/* Main Form Card */}
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.cardHeader, { backgroundColor: theme.dark, borderBottomColor: theme.border }]}>
              <Feather name="edit" size={18} color="#e50914" />
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Edit {isLost ? 'Lost Item' : 'Found Item'} Details
              </Text>
            </View>

            <View style={styles.cardBody}>
              {/* Two Column Layout - Matching Web Dashboard */}
              <View style={styles.formGrid}>
                {/* Left Column */}
                <View>
                  {/* Basic Information */}
                  <View style={[styles.formSection, { borderBottomColor: theme.border }]}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIcon} />
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

                    <View style={styles.formRow}>
                      <View style={[styles.formGroup, styles.halfWidth]}>
                        <Text style={[styles.formLabel, { color: theme.textSecondary }]}>
                          {isLost ? 'Date Lost' : 'Date Found'} <Text style={styles.required}>*</Text>
                        </Text>
                        <TouchableOpacity 
                          style={[styles.dateButton, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
                          onPress={() => setShowDatePicker(true)}
                        >
                          <Feather name="calendar" size={16} color="#e50914" />
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
                          The more details you provide, the easier it is to match with items.
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Status Section (Admin only) */}
                  {isAdmin && (
                    <View style={[styles.formSection, { borderBottomColor: theme.border }]}>
                      <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon} />
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Status</Text>
                      </View>

                      <View style={styles.formGroup}>
                        <TouchableOpacity 
                          style={[styles.categorySelector, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
                          onPress={() => setShowStatusModal(true)}
                        >
                          <Text style={[styles.categorySelectorText, { color: theme.text }]}>
                            {formData.status ? formData.status.toUpperCase() : 'Select Status'}
                          </Text>
                          <Feather name="chevron-down" size={16} color="#e50914" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                {/* Right Column */}
                <View>
                  {/* Photo Management */}
                  <View style={[styles.formSection, { borderBottomColor: theme.border }]}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIcon} />
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Photo</Text>
                    </View>
                    
                    <View style={styles.photoSection}>
                      {photoUrl ? (
                        <View style={styles.currentPhotoContainer}>
                          <Image
                            source={{ uri: photoUrl }}
                            style={styles.currentPhoto}
                            resizeMode="cover"
                          />
                          <View style={styles.photoActions}>
                            <TouchableOpacity
                              style={styles.removePhotoBtn}
                              onPress={() => {
                                setFormData(prev => ({ ...prev, photo: null, photoUri: null, existing_photo: null }));
                              }}
                            >
                              <Feather name="trash-2" size={16} color="#e50914" />
                              <Text style={styles.removePhotoText}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.noPhotoContainer, { borderColor: theme.border }]}>
                          <Feather name="image" size={48} color={theme.textMuted} />
                          <Text style={[styles.noPhotoText, { color: theme.textMuted }]}>No photo currently uploaded</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Upload New Photo */}
                  <View style={[styles.formSection, { borderBottomColor: theme.border }]}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIcon} />
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Upload New Photo</Text>
                    </View>

                    <View style={styles.formGroup}>
                      <TouchableOpacity 
                        style={[styles.fileUploadWrapper, { borderColor: theme.border, backgroundColor: theme.inputBg }]} 
                        onPress={handleImagePick}
                      >
                        <Feather name="cloud-upload" size={32} color="#e50914" />
                        <Text style={[styles.uploadText, { color: theme.text }]}>Click to upload</Text>
                        <Text style={[styles.uploadHint, { color: theme.textMuted }]}>JPG, PNG up to 2MB</Text>
                      </TouchableOpacity>
                    </View>

                    {/* New Photo Preview */}
                    <View style={[styles.photoPreview, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
                      {formData.photoUri ? (
                        <Image source={{ uri: formData.photoUri }} style={styles.previewImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.previewPlaceholder}>
                          <Feather name="image" size={40} color={theme.textMuted} />
                          <Text style={[styles.previewPlaceholderText, { color: theme.textMuted }]}>New photo preview</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Location Information */}
                  <View style={[styles.formSection, { borderBottomColor: theme.border }]}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIcon} />
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Location</Text>
                    </View>

                    <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(229,9,20,0.1)' : '#fff5f5' }]}>
                      <Feather name="info" size={16} color="#e50914" />
                      <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                        Update the location where you {isLost ? 'lost' : 'found'} the item.
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

                    <View style={styles.formRow}>
                      <View style={[styles.formGroup, styles.halfWidth]}>
                        <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Latitude</Text>
                        <TextInput
                          style={[styles.formInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                          placeholder="40.7128"
                          placeholderTextColor={theme.textMuted}
                          value={formData.latitude}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, latitude: text }))}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={[styles.formGroup, styles.halfWidth]}>
                        <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Longitude</Text>
                        <TextInput
                          style={[styles.formInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                          placeholder="-74.0060"
                          placeholderTextColor={theme.textMuted}
                          value={formData.longitude}
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
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather name="save" size={18} color="#fff" />
                      <Text style={styles.submitButtonText}>Update Item</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
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

      {/* Status Selection Modal (Admin only) */}
      {isAdmin && (
        <Modal
          visible={showStatusModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowStatusModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowStatusModal(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Select Status</Text>
                <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                  <Feather name="x" size={24} color="#e50914" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {statusOptions.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.categoryOption,
                      { borderColor: theme.border },
                      formData.status === status && styles.categoryOptionActive,
                    ]}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, status }));
                      setShowStatusModal(false);
                    }}
                  >
                    <Text style={styles.categoryEmoji}>
                      {status === 'approved' ? '✅' : status === 'pending' ? '⏳' : status === 'rejected' ? '❌' : '📌'}
                    </Text>
                    <Text style={[
                      styles.categoryOptionText,
                      { color: theme.text },
                      formData.status === status && styles.categoryOptionTextActive,
                    ]}>
                      {status.toUpperCase()}
                    </Text>
                    {formData.status === status && (
                      <Feather name="check" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  sectionIcon: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#e50914',
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
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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
  photoSection: {
    textAlign: 'center',
  },
  currentPhotoContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  currentPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  photoActions: {
    marginTop: 12,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: 'rgba(229,9,20,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.2)',
  },
  removePhotoText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e50914',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  noPhotoContainer: {
    padding: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  noPhotoText: {
    fontSize: 13,
    marginTop: 12,
  },
  fileUploadWrapper: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    cursor: 'pointer',
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
  photoPreview: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    minHeight: 160,
    overflow: 'hidden',
    marginTop: 16,
  },
  previewImage: {
    width: '100%',
    height: 160,
  },
  previewPlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceholderText: {
    fontSize: 12,
    marginTop: 8,
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
