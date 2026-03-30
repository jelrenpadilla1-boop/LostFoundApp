// src/screens/admin/AdminUserDetailScreen.js
import Icon from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { adminAPI } from '../../api/admin';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function AdminUserDetailScreen({ route, navigation }) {
    const { userId } = route.params;
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: '',
    });
    const [passwordData, setPasswordData] = useState({
        new_password: '',
        new_password_confirmation: '',
    });

    const loadUser = async () => {
        try {
            const userRes = await adminAPI.getUser(userId);
            setUser(userRes.data.user);
            setFormData({
                name: userRes.data.user.name,
                email: userRes.data.user.email,
                role: userRes.data.user.role,
            });
        } catch (error) {
            console.error('Error loading user:', error);
            Alert.alert('Error', 'Failed to load user details');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUser();
    }, [userId]);

    const handleUpdateUser = async () => {
        if (!formData.name || !formData.email) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        try {
            await adminAPI.updateUser(userId, formData);
            Alert.alert('Success', 'User updated successfully');
            setEditing(false);
            loadUser();
        } catch (error) {
            console.error('Update user error:', error);
            Alert.alert('Error', 'Failed to update user');
        }
    };

    const handleResetPassword = async () => {
        if (passwordData.new_password !== passwordData.new_password_confirmation) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (passwordData.new_password.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters');
            return;
        }
        try {
            await adminAPI.resetPassword(userId, passwordData.new_password);
            Alert.alert('Success', 'Password reset successfully');
            setShowPasswordModal(false);
            setPasswordData({ new_password: '', new_password_confirmation: '' });
        } catch (error) {
            console.error('Reset password error:', error);
            Alert.alert('Error', 'Failed to reset password');
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* User Header */}
            <View style={styles.header}>
                <View style={[styles.avatar, user?.role === 'admin' && styles.adminAvatar]}>
                    <Text style={styles.avatarText}>
                        {user?.name?.charAt(0).toUpperCase()}
                    </Text>
                </View>
                {!editing && (
                    <>
                        <Text style={styles.userName}>{user?.name}</Text>
                        <Text style={styles.userEmail}>{user?.email}</Text>
                        <View style={styles.badgeContainer}>
                            <View style={[styles.roleBadge, user?.role === 'admin' && styles.adminBadge]}>
                                <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
                            </View>
                            <View style={[styles.statusBadge, user?.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                                <Text style={styles.statusText}>
                                    {user?.is_active ? 'Active' : 'Inactive'}
                                </Text>
                            </View>
                        </View>
                    </>
                )}
            </View>

            {/* Edit Form */}
            {editing && (
                <View style={styles.editForm}>
                    <TextInput
                        style={styles.input}
                        placeholder="Name"
                        value={formData.name}
                        onChangeText={(text) => setFormData({ ...formData, name: text })}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        value={formData.email}
                        onChangeText={(text) => setFormData({ ...formData, email: text })}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <View style={styles.roleSelector}>
                        <TouchableOpacity
                            style={[styles.roleOption, formData.role === 'user' && styles.roleActive]}
                            onPress={() => setFormData({ ...formData, role: 'user' })}
                        >
                            <Text style={[styles.roleOptionText, formData.role === 'user' && styles.roleOptionTextActive]}>User</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.roleOption, formData.role === 'admin' && styles.roleActive]}
                            onPress={() => setFormData({ ...formData, role: 'admin' })}
                        >
                            <Text style={[styles.roleOptionText, formData.role === 'admin' && styles.roleOptionTextActive]}>Admin</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.editActions}>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateUser}>
                            <Text style={styles.saveBtnText}>Save Changes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Action Buttons */}
            {!editing && (
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setEditing(true)}>
                        <Icon name="create-outline" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setShowPasswordModal(true)}>
                        <Icon name="lock-closed-outline" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Reset Password</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* User Stats */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Statistics</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{user?.lost_items_count || 0}</Text>
                        <Text style={styles.statLabel}>Lost Items</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{user?.found_items_count || 0}</Text>
                        <Text style={styles.statLabel}>Found Items</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{user?.matches_count || 0}</Text>
                        <Text style={styles.statLabel}>Matches</Text>
                    </View>
                </View>
            </View>

            {/* Account Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Information</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Member Since:</Text>
                    <Text style={styles.infoValue}>
                        {new Date(user?.created_at).toLocaleDateString()}
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Last Updated:</Text>
                    <Text style={styles.infoValue}>
                        {new Date(user?.updated_at).toLocaleDateString()}
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>User ID:</Text>
                    <Text style={styles.infoValue}>{user?.id}</Text>
                </View>
            </View>

            {/* Reset Password Modal */}
            <Modal visible={showPasswordModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Reset Password</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="New Password"
                            placeholderTextColor="#999"
                            secureTextEntry
                            value={passwordData.new_password}
                            onChangeText={(text) => setPasswordData({ ...passwordData, new_password: text })}
                        />
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Confirm New Password"
                            placeholderTextColor="#999"
                            secureTextEntry
                            value={passwordData.new_password_confirmation}
                            onChangeText={(text) => setPasswordData({ ...passwordData, new_password_confirmation: text })}
                        />
                        <TouchableOpacity style={styles.modalButton} onPress={handleResetPassword}>
                            <Text style={styles.modalButtonText}>Reset Password</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelModalBtn]}
                            onPress={() => setShowPasswordModal(false)}
                        >
                            <Text style={styles.cancelModalText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#faf9fe',
    },
    header: {
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingVertical: 32,
        borderBottomWidth: 1,
        borderBottomColor: '#edeef5',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#7c3aed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    adminAvatar: {
        backgroundColor: '#f59e0b',
    },
    avatarText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#fff',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e1b2f',
    },
    userEmail: {
        fontSize: 14,
        color: '#5b5b7a',
        marginTop: 4,
    },
    badgeContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    roleBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: '#ede9fe',
    },
    adminBadge: {
        backgroundColor: '#fef3c7',
    },
    roleText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#7c3aed',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    activeBadge: {
        backgroundColor: '#d1fae5',
    },
    inactiveBadge: {
        backgroundColor: '#fee2e2',
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#10b981',
    },
    editForm: {
        backgroundColor: '#fff',
        padding: 20,
        marginTop: 16,
        marginHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#edeef5',
    },
    input: {
        borderWidth: 1,
        borderColor: '#edeef5',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        marginBottom: 16,
        backgroundColor: '#faf9fe',
        color: '#1e1b2f',
    },
    roleSelector: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    roleOption: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#faf9fe',
        borderWidth: 1,
        borderColor: '#edeef5',
        alignItems: 'center',
    },
    roleActive: {
        backgroundColor: '#7c3aed',
        borderColor: '#7c3aed',
    },
    roleOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5b5b7a',
    },
    roleOptionTextActive: {
        color: '#fff',
    },
    editActions: {
        flexDirection: 'row',
        gap: 12,
    },
    saveBtn: {
        flex: 1,
        backgroundColor: '#7c3aed',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    cancelBtn: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#5b5b7a',
        fontWeight: 'bold',
    },
    actionButtons: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#7c3aed',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    section: {
        backgroundColor: '#fff',
        marginTop: 16,
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#edeef5',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e1b2f',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    statItem: {
        flex: 1,
        backgroundColor: '#faf9fe',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#edeef5',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#7c3aed',
    },
    statLabel: {
        fontSize: 11,
        color: '#5b5b7a',
        marginTop: 4,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#edeef5',
    },
    infoLabel: {
        fontSize: 13,
        color: '#5b5b7a',
    },
    infoValue: {
        fontSize: 13,
        color: '#1e1b2f',
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e1b2f',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#edeef5',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        marginBottom: 16,
        backgroundColor: '#faf9fe',
        color: '#1e1b2f',
    },
    modalButton: {
        backgroundColor: '#7c3aed',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        marginTop: 12,
    },
    modalButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelModalBtn: {
        backgroundColor: '#f0f0f0',
    },
    cancelModalText: {
        color: '#5b5b7a',
        fontWeight: 'bold',
    },
});