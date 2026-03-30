// src/screens/admin/AdminCreateUserScreen.js
import Icon from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { adminAPI } from '../../api/admin';

export default function AdminCreateUserScreen({ navigation }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'user',
    });

    const handleSubmit = async () => {
        if (!formData.name || !formData.email || !formData.password) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        if (formData.password !== formData.password_confirmation) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        try {
            await adminAPI.createUser(formData);
            Alert.alert('Success', 'User created successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Create user error:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create user';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Icon name="person-add" size={48} color="#7c3aed" />
                    </View>
                    <Text style={styles.title}>Create New User</Text>
                    <Text style={styles.subtitle}>Add a new user to the system</Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                        Full Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter full name"
                        placeholderTextColor="#999"
                        value={formData.name}
                        onChangeText={(text) => setFormData({ ...formData, name: text })}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                        Email Address <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter email address"
                        placeholderTextColor="#999"
                        value={formData.email}
                        onChangeText={(text) => setFormData({ ...formData, email: text })}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                        Password <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter password (min. 8 characters)"
                        placeholderTextColor="#999"
                        value={formData.password}
                        onChangeText={(text) => setFormData({ ...formData, password: text })}
                        secureTextEntry
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                        Confirm Password <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Confirm password"
                        placeholderTextColor="#999"
                        value={formData.password_confirmation}
                        onChangeText={(text) => setFormData({ ...formData, password_confirmation: text })}
                        secureTextEntry
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Role</Text>
                    <View style={styles.roleContainer}>
                        <TouchableOpacity
                            style={[styles.roleOption, formData.role === 'user' && styles.roleActive]}
                            onPress={() => setFormData({ ...formData, role: 'user' })}
                        >
                            <Icon name="person-outline" size={22} color={formData.role === 'user' ? '#fff' : '#5b5b7a'} />
                            <Text style={[styles.roleText, formData.role === 'user' && styles.roleTextActive]}>User</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.roleOption, formData.role === 'admin' && styles.roleActive]}
                            onPress={() => setFormData({ ...formData, role: 'admin' })}
                        >
                            <Icon name="shield-outline" size={22} color={formData.role === 'admin' ? '#fff' : '#5b5b7a'} />
                            <Text style={[styles.roleText, formData.role === 'admin' && styles.roleTextActive]}>Admin</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Icon name="checkmark-circle-outline" size={20} color="#fff" />
                            <Text style={styles.submitButtonText}>Create User</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#faf9fe',
    },
    form: {
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ede9fe',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1e1b2f',
        marginTop: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#5b5b7a',
        marginTop: 8,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e1b2f',
        marginBottom: 8,
    },
    required: {
        color: '#ef4444',
    },
    input: {
        borderWidth: 1,
        borderColor: '#edeef5',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        backgroundColor: '#fff',
        color: '#1e1b2f',
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    roleOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#edeef5',
    },
    roleActive: {
        backgroundColor: '#7c3aed',
        borderColor: '#7c3aed',
    },
    roleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5b5b7a',
    },
    roleTextActive: {
        color: '#fff',
    },
    submitButton: {
        backgroundColor: '#7c3aed',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
    },
    submitButtonDisabled: {
        backgroundColor: '#c4b5fd',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});