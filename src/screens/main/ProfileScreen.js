// src/screens/profile/ProfileScreen.js
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'http://192.168.1.5:8092';

export default function ProfileScreen({ navigation }) {
  const { user, logout, isAdmin, updateUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    profile_photo: user?.profile_photo || null,
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageKey, setImageKey] = useState(Date.now());

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    setImageError(false);
    setImageKey(Date.now());
  }, [formData.profile_photo]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile');
      
      console.log('Full profile response:', JSON.stringify(response.data, null, 2));

      // Handle all possible response shapes
      const userData =
        response.data?.data ||
        response.data?.user ||
        response.data;

      if (userData) {
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          location: userData.location || '',
          profile_photo: userData.profile_photo || null,
        });

        if (typeof updateUser === 'function') {
          updateUser(userData);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const getImageUrl = (photo) => {
    if (!photo) return null;

    // If it's already a full URL
    if (photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo;
    }

    // If it's a local temp file
    if (photo.startsWith('/tmp/') || photo.startsWith('file://')) {
      return null;
    }

    // Remove any leading slash
    let cleanPath = photo;
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }

    // Build the URL correctly
    // The photo path from backend is like: "profile-photos/filename.jpg"
    // Full URL should be: http://192.168.1.5:8092/storage/profile-photos/filename.jpg
    return `${API_BASE_URL}/storage/${cleanPath}`;
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please grant permission to access your photos');
        return null;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: false,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // Get file extension
        const uriParts = asset.uri.split('.');
        const fileExt = uriParts[uriParts.length - 1] || 'jpg';
        const fileName = `profile_${Date.now()}.${fileExt}`;

        // Fix URI for Android
        let imageUri = asset.uri;
        if (Platform.OS === 'android' && !imageUri.startsWith('file://')) {
          imageUri = `file://${imageUri}`;
        }

        return {
          uri: imageUri,
          type: `image/${fileExt}`,
          name: fileName,
        };
      }
      return null;
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
      return null;
    }
  };

  const handleImagePick = async () => {
    const image = await pickImage();
    if (!image) return;

    // Create form data
    const photoForm = new FormData();
    photoForm.append('profile_photo', {
      uri: image.uri,
      name: image.name,
      type: image.type,
    });

    try {
      setUploadingPhoto(true);
      
      const response = await api.post('/profile/upload-photo', photoForm, {
        headers: { 
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Upload response:', JSON.stringify(response.data, null, 2));

      if (response.data?.success && response.data?.data) {
        const updatedUser = response.data.data;
        setFormData(prev => ({ 
          ...prev, 
          profile_photo: updatedUser.profile_photo,
        }));
        setImageError(false);
        setImageKey(Date.now());
        
        if (typeof updateUser === 'function') {
          updateUser(updatedUser);
        }
        
        Alert.alert('Success', 'Profile photo updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update profile photo');
      }
    } catch (error) {
      console.error('Upload error:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const response = await api.put('/profile', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
      });

      console.log('Update profile response:', JSON.stringify(response.data, null, 2));

      const updatedUser =
        response.data?.data ||
        response.data?.user ||
        response.data || {};

      setFormData(prev => ({
        ...prev,
        name: updatedUser.name || prev.name,
        email: updatedUser.email || prev.email,
        phone: updatedUser.phone || prev.phone,
        location: updatedUser.location || prev.location,
      }));

      if (typeof updateUser === 'function') {
        updateUser(updatedUser);
      }

      Alert.alert('Success', 'Profile updated successfully');
      setEditing(false);
    } catch (error) {
      console.error('Update profile error:', error.response?.data);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwordData.new_password !== passwordData.new_password_confirmation) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    try {
      setLoading(true);
      await api.put('/profile/password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        new_password_confirmation: passwordData.new_password_confirmation,
      });
      Alert.alert('Success', 'Password updated successfully');
      setShowPasswordModal(false);
      setPasswordData({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      });
    } catch (error) {
      console.error('Password update error:', error.response?.data);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  // Get the image URL to display
  const imageUrl = getImageUrl(formData.profile_photo);
  
  // Add cache buster to force refresh
  const finalImageUrl = imageUrl ? `${imageUrl}?t=${imageKey}` : null;

  console.log('Profile photo path:', formData.profile_photo);
  console.log('Generated image URL:', imageUrl);
  console.log('Final URL with cache buster:', finalImageUrl);

  const formatMemberSince = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    } catch (error) {
      return 'Not available';
    }
  };

  const s = getStyles(isDark);

  if (loading && !refreshing) {
    return (
      <View style={[s.center, { backgroundColor: isDark ? '#141414' : '#f8fafc' }]}>
        <ActivityIndicator size="large" color="#e50914" />
        <Text style={[s.loadingText, { color: isDark ? '#b3b3b3' : '#64748b' }]}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <ScrollView
        style={[s.container, { backgroundColor: isDark ? '#141414' : '#f8fafc' }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#e50914']}
            tintColor="#e50914"
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={isDark ? ['#1a1a1a', '#141414'] : ['#ffffff', '#f8fafc']}
          style={s.header}
        >
          <View style={s.headerContent}>
            <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()}>
              <Feather name="arrow-left" size={22} color="#e50914" />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: isDark ? '#ffffff' : '#1a1a1a' }]}>Profile</Text>
            <TouchableOpacity style={s.themeToggle} onPress={toggleTheme}>
              <Feather name={isDark ? 'sun' : 'moon'} size={18} color="#e50914" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Profile Card */}
        <View style={[s.profileCard, {
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          borderColor: isDark ? '#333333' : '#edeef5',
        }]}>
          <View style={s.avatarContainer}>
            <TouchableOpacity onPress={handleImagePick} style={s.avatarTouch} disabled={uploadingPhoto}>
              {finalImageUrl && !imageError ? (
                <Image
                  key={finalImageUrl}
                  source={{ uri: finalImageUrl }}
                  style={s.avatar}
                  onError={(e) => {
                    console.log('Image load error:', e.nativeEvent.error);
                    console.log('Failed URL:', finalImageUrl);
                    setImageError(true);
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', finalImageUrl);
                    setImageError(false);
                  }}
                />
              ) : (
                <View style={[s.avatarPlaceholder, { backgroundColor: '#e50914' }]}>
                  <Text style={s.avatarText}>
                    {formData.name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              {uploadingPhoto ? (
                <View style={s.editPhotoBadge}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              ) : (
                <View style={s.editPhotoBadge}>
                  <Feather name="camera" size={14} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Text style={[s.name, { color: isDark ? '#ffffff' : '#0f172a' }]}>
            {formData.name || 'User'}
          </Text>

          <View style={s.roleBadge}>
            <Feather
              name={isAdmin ? 'shield' : 'user'}
              size={12}
              color={isAdmin ? '#e50914' : '#10b981'}
            />
            <Text style={[s.roleText, isAdmin ? s.adminRole : s.userRole]}>
              {isAdmin ? 'Administrator' : 'Member'}
            </Text>
          </View>
        </View>

        {/* Profile Information */}
        <View style={[s.section, {
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          borderColor: isDark ? '#333333' : '#edeef5',
        }]}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleContainer}>
              <Feather name="user" size={18} color="#e50914" />
              <Text style={[s.sectionTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                Profile Information
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setEditing(!editing)}
              style={[s.editButton, { backgroundColor: isDark ? '#2a2a2a' : '#f1f5f9' }]}
            >
              <Feather name={editing ? 'x' : 'edit-2'} size={14} color="#e50914" />
              <Text style={s.editButtonText}>{editing ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          {editing ? (
            <View style={s.editForm}>
              {[
                { label: 'Full Name', key: 'name', placeholder: 'Enter your name', keyboard: 'default', capitalize: 'words' },
                { label: 'Email Address', key: 'email', placeholder: 'Enter your email', keyboard: 'email-address', capitalize: 'none' },
                { label: 'Phone Number', key: 'phone', placeholder: 'Enter your phone number', keyboard: 'phone-pad', capitalize: 'none' },
                { label: 'Location', key: 'location', placeholder: 'Enter your location', keyboard: 'default', capitalize: 'sentences' },
              ].map(({ label, key, placeholder, keyboard, capitalize }) => (
                <View key={key} style={s.inputGroup}>
                  <Text style={[s.inputLabel, { color: isDark ? '#b3b3b3' : '#475569' }]}>{label}</Text>
                  <TextInput
                    style={[s.input, {
                      backgroundColor: isDark ? '#2a2a2a' : '#f8fafc',
                      borderColor: isDark ? '#444444' : '#e2e8f0',
                      color: isDark ? '#ffffff' : '#0f172a',
                    }]}
                    placeholder={placeholder}
                    placeholderTextColor={isDark ? '#666666' : '#94a3b8'}
                    value={formData[key]}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, [key]: text }))}
                    keyboardType={keyboard}
                    autoCapitalize={capitalize}
                  />
                </View>
              ))}
              <TouchableOpacity style={s.saveButton} onPress={handleUpdateProfile}>
                <LinearGradient colors={['#e50914', '#b20710']} style={s.saveGradient}>
                  <Feather name="save" size={16} color="#fff" />
                  <Text style={s.saveButtonText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.infoContainer}>
              {[
                { icon: 'user', label: 'Name', value: formData.name },
                { icon: 'mail', label: 'Email', value: formData.email },
                { icon: 'phone', label: 'Phone', value: formData.phone },
                { icon: 'map-pin', label: 'Location', value: formData.location },
                { icon: 'calendar', label: 'Member Since', value: user?.created_at ? formatMemberSince(user.created_at) : null },
              ].map(({ icon, label, value }) => (
                <View key={label} style={s.infoRow}>
                  <View style={s.infoIcon}>
                    <Feather name={icon} size={14} color="#e50914" />
                  </View>
                  <Text style={[s.infoLabel, { color: isDark ? '#b3b3b3' : '#64748b' }]}>{label}</Text>
                  <Text style={[s.infoValue, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                    {value || 'Not set'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Security */}
        <View style={[s.section, {
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          borderColor: isDark ? '#333333' : '#edeef5',
        }]}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleContainer}>
              <Feather name="shield" size={18} color="#e50914" />
              <Text style={[s.sectionTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>Security</Text>
            </View>
          </View>
          <TouchableOpacity style={s.menuItem} onPress={() => setShowPasswordModal(true)}>
            <View style={s.menuIcon}>
              <Feather name="lock" size={18} color="#e50914" />
            </View>
            <Text style={[s.menuText, { color: isDark ? '#e5e5e5' : '#334155' }]}>Change Password</Text>
            <Feather name="chevron-right" size={18} color={isDark ? '#666666' : '#cbd5e1'} />
          </TouchableOpacity>
        </View>

        {/* Admin Section */}
        {isAdmin && (
          <View style={[s.section, {
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            borderColor: isDark ? '#333333' : '#edeef5',
          }]}>
            <View style={s.sectionHeader}>
              <View style={s.sectionTitleContainer}>
                <Feather name="settings" size={18} color="#e50914" />
                <Text style={[s.sectionTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>Administration</Text>
              </View>
            </View>
            <TouchableOpacity style={s.menuItem} onPress={() => navigation.navigate('AdminDashboard')}>
              <View style={s.menuIcon}>
                <Feather name="bar-chart-2" size={18} color="#e50914" />
              </View>
              <Text style={[s.menuText, { color: isDark ? '#e5e5e5' : '#334155' }]}>Admin Dashboard</Text>
              <Feather name="chevron-right" size={18} color={isDark ? '#666666' : '#cbd5e1'} />
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem} onPress={() => navigation.navigate('AdminUsers')}>
              <View style={s.menuIcon}>
                <Feather name="users" size={18} color="#e50914" />
              </View>
              <Text style={[s.menuText, { color: isDark ? '#e5e5e5' : '#334155' }]}>Manage Users</Text>
              <Feather name="chevron-right" size={18} color={isDark ? '#666666' : '#cbd5e1'} />
            </TouchableOpacity>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity
          style={[s.logoutButton, {
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            borderColor: isDark ? '#442222' : '#fee2e2',
          }]}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color="#ef4444" />
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Change Password Modal */}
        <Modal visible={showPasswordModal} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]}>
              <LinearGradient colors={['#e50914', '#b20710']} style={s.modalHeader}>
                <Text style={s.modalTitle}>Change Password</Text>
                <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                  <Feather name="x" size={22} color="#fff" />
                </TouchableOpacity>
              </LinearGradient>
              <View style={s.modalBody}>
                {[
                  { label: 'Current Password', key: 'current_password', placeholder: 'Enter current password' },
                  { label: 'New Password', key: 'new_password', placeholder: 'Enter new password (min 8 characters)' },
                  { label: 'Confirm New Password', key: 'new_password_confirmation', placeholder: 'Confirm new password' },
                ].map(({ label, key, placeholder }) => (
                  <View key={key} style={s.inputGroup}>
                    <Text style={[s.inputLabel, { color: isDark ? '#b3b3b3' : '#475569' }]}>{label}</Text>
                    <TextInput
                      style={[s.input, {
                        backgroundColor: isDark ? '#2a2a2a' : '#f8fafc',
                        borderColor: isDark ? '#444444' : '#e2e8f0',
                        color: isDark ? '#ffffff' : '#0f172a',
                      }]}
                      placeholder={placeholder}
                      placeholderTextColor={isDark ? '#666666' : '#94a3b8'}
                      secureTextEntry
                      value={passwordData[key]}
                      onChangeText={(text) => setPasswordData(prev => ({ ...prev, [key]: text }))}
                    />
                  </View>
                ))}
                <TouchableOpacity style={s.modalButton} onPress={handleUpdatePassword}>
                  <LinearGradient colors={['#e50914', '#b20710']} style={s.modalButtonGradient}>
                    <Text style={s.modalButtonText}>Update Password</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </>
  );
}

const getStyles = (isDark) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(229,9,20,0.15)' : '#fde8e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '600' },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(229,9,20,0.15)' : '#fde8e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    alignItems: 'center',
    marginTop: -30,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: { marginTop: -50, marginBottom: 12 },
  avatarTouch: { position: 'relative' },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#e50914',
    backgroundColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e50914',
  },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  editPhotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#e50914',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: isDark ? '#1a1a1a' : '#fff',
  },
  name: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: isDark ? '#2a2a2a' : '#f1f5f9',
  },
  roleText: { fontSize: 11, fontWeight: '600' },
  adminRole: { color: '#e50914' },
  userRole: { color: '#10b981' },
  section: {
    marginTop: 16,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editButtonText: { fontSize: 12, fontWeight: '500', color: '#e50914' },
  infoContainer: { gap: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoIcon: { width: 28 },
  infoLabel: { width: 85, fontSize: 12, fontWeight: '500' },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '500' },
  editForm: { gap: 14 },
  inputGroup: { gap: 6 },
  inputLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  saveButton: { marginTop: 8, borderRadius: 10, overflow: 'hidden' },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  saveButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  menuIcon: { width: 32 },
  menuText: { flex: 1, marginLeft: 4, fontSize: 14, fontWeight: '500' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 40,
    padding: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  logoutText: { fontSize: 14, color: '#ef4444', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: { borderRadius: 20, overflow: 'hidden' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  modalBody: { padding: 20, gap: 16 },
  modalButton: { borderRadius: 10, overflow: 'hidden', marginTop: 8 },
  modalButtonGradient: { paddingVertical: 14, alignItems: 'center' },
  modalButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
