// src/screens/profile/ProfileScreen.js
import Icon from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import api from '../../api/client';
import { pickImage } from '../../components/common/ImagePicker';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'http://10.214.114.132:8092';

export default function ProfileScreen({ navigation }) {
  const { user, logout, isAdmin, updateUser } = useAuth();
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

  // Load fresh user data when screen focuses
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile');
      const userData = response.data?.data || response.data?.user || response.data;
      
      console.log('Profile data received:', JSON.stringify(userData, null, 2));
      
      if (userData) {
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          location: userData.location || '',
          profile_photo: userData.profile_photo || null,
        });
        
        // Update auth context if available
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
    
    // If it's already a full URL, return it
    if (photo.startsWith('http')) {
      return photo;
    }
    
    // If the photo path is a temp file, return null (not uploaded yet)
    if (photo.startsWith('/tmp/')) {
      return null;
    }
    
    // Remove any leading slashes
    const cleanPath = photo.replace(/^\/+/, '');
    
    // Check if the photo path already includes 'storage'
    if (cleanPath.startsWith('storage/')) {
      return `${API_BASE_URL}/${cleanPath}`;
    }
    
    // Default: append to storage path
    return `${API_BASE_URL}/storage/${cleanPath}`;
  };

  const handleImagePick = async () => {
    const image = await pickImage();
    if (!image) return;

    const photoForm = new FormData();
    photoForm.append('profile_photo', {
      uri: image.uri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    });

    try {
      setUploadingPhoto(true);
      // Use PUT /profile endpoint for updating profile (including photo)
      // This is the correct endpoint based on your routes
      const response = await api.put('/profile', photoForm, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('Profile update response:', JSON.stringify(response.data, null, 2));

      const updatedUser = response.data?.data || response.data?.user || response.data;
      
      if (updatedUser) {
        // Update local form data with the new profile photo
        setFormData((prev) => ({
          ...prev,
          name: updatedUser.name || prev.name,
          email: updatedUser.email || prev.email,
          phone: updatedUser.phone || prev.phone,
          location: updatedUser.location || prev.location,
          profile_photo: updatedUser.profile_photo || null,
        }));
        
        setImageError(false);
        
        if (typeof updateUser === 'function') {
          updateUser(updatedUser);
        }
        
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
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

      const updatedUser = response.data?.data || response.data?.user || response.data || {};

      setFormData((prev) => ({
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

    if (passwordData.new_password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
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

  const imageUrl = getImageUrl(formData.profile_photo);
  
  // Debug log
  console.log('Profile photo path:', formData.profile_photo);
  console.log('Full image URL:', imageUrl);

  // Format date properly
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

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} tintColor="#7c3aed" />
      }
    >
      {/* Header Section - Clean White Background */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#7c3aed" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={handleImagePick} style={styles.avatarTouch}>
            {imageUrl && !imageError ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.avatar}
                onError={(e) => {
                  console.log('Image load error:', e.nativeEvent.error);
                  setImageError(true);
                }}
                onLoad={() => {
                  console.log('Image loaded successfully');
                  setImageError(false);
                }}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {formData.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            {uploadingPhoto ? (
              <View style={styles.editPhotoBadge}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : (
              <View style={styles.editPhotoBadge}>
                <Icon name="camera" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.name}>{formData.name || 'User'}</Text>
        <View style={styles.roleBadge}>
          <Icon
            name={isAdmin ? 'shield' : 'person'}
            size={12}
            color={isAdmin ? '#7c3aed' : '#10b981'}
          />
          <Text style={[styles.roleText, isAdmin ? styles.adminRole : styles.userRole]}>
            {isAdmin ? 'Administrator' : 'Member'}
          </Text>
        </View>
      </View>

      {/* Profile Information Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Icon name="person-outline" size={20} color="#7c3aed" />
            <Text style={styles.sectionTitle}>Profile Information</Text>
          </View>
          <TouchableOpacity
            onPress={() => setEditing(!editing)}
            style={styles.editButton}
          >
            <Icon name={editing ? 'close-outline' : 'create-outline'} size={18} color="#7c3aed" />
            <Text style={styles.editButtonText}>{editing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {editing ? (
          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your location"
                value={formData.location}
                onChangeText={(text) => setFormData({ ...formData, location: text })}
                placeholderTextColor="#94a3b8"
              />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
              <LinearGradient colors={['#7c3aed', '#a855f7']} style={styles.saveGradient}>
                <Icon name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="person-outline" size={16} color="#7c3aed" />
              </View>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{formData.name || 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="mail-outline" size={16} color="#7c3aed" />
              </View>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{formData.email || 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="call-outline" size={16} color="#7c3aed" />
              </View>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{formData.phone || 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="location-outline" size={16} color="#7c3aed" />
              </View>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{formData.location || 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="calendar-outline" size={16} color="#7c3aed" />
              </View>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {user?.created_at ? formatMemberSince(user.created_at) : 'Not available'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Security Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Icon name="shield-outline" size={20} color="#7c3aed" />
            <Text style={styles.sectionTitle}>Security</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowPasswordModal(true)}>
          <View style={styles.menuIcon}>
            <Icon name="lock-closed-outline" size={20} color="#7c3aed" />
          </View>
          <Text style={styles.menuText}>Change Password</Text>
          <Icon name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* Admin Section */}
      {isAdmin && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="settings-outline" size={20} color="#7c3aed" />
              <Text style={styles.sectionTitle}>Administration</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AdminDashboard')}
          >
            <View style={styles.menuIcon}>
              <Icon name="stats-chart-outline" size={20} color="#7c3aed" />
            </View>
            <Text style={styles.menuText}>Admin Dashboard</Text>
            <Icon name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ManageUsers')}
          >
            <View style={styles.menuIcon}>
              <Icon name="people-outline" size={20} color="#7c3aed" />
            </View>
            <Text style={styles.menuText}>Manage Users</Text>
            <Icon name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>
        </View>
      )}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#7c3aed', '#a855f7']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter current password"
                  secureTextEntry
                  value={passwordData.current_password}
                  onChangeText={(text) =>
                    setPasswordData({ ...passwordData, current_password: text })
                  }
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  secureTextEntry
                  value={passwordData.new_password}
                  onChangeText={(text) =>
                    setPasswordData({ ...passwordData, new_password: text })
                  }
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  secureTextEntry
                  value={passwordData.new_password_confirmation}
                  onChangeText={(text) =>
                    setPasswordData({
                      ...passwordData,
                      new_password_confirmation: text,
                    })
                  }
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <TouchableOpacity style={styles.modalButton} onPress={handleUpdatePassword}>
                <LinearGradient
                  colors={['#7c3aed', '#a855f7']}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonText}>Update Password</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#edeef5',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e1b2f',
  },
  headerRight: {
    width: 40,
  },
  profileCard: {
    alignItems: 'center',
    marginTop: -40,
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#edeef5',
  },
  avatarContainer: {
    marginTop: -64,
    marginBottom: 16,
  },
  avatarTouch: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#7c3aed',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  editPhotoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#7c3aed',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adminRole: {
    color: '#7c3aed',
  },
  userRole: {
    color: '#10b981',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#edeef5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7c3aed',
  },
  infoContainer: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 32,
  },
  infoLabel: {
    width: 80,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  editForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuIcon: {
    width: 32,
  },
  menuText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 40,
    padding: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  logoutText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  modalButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  modalButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});