import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [locationExpanded, setLocationExpanded] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ level: 'None', width: '0%', color: '#5b5b7a' });
  const { register } = useAuth();

  // Load theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('foundify-theme');
      if (savedTheme === 'dark') {
        setIsDarkMode(true);
      } else if (savedTheme === 'light') {
        setIsDarkMode(false);
      } else {
        // Use system preference
        const colorScheme = Appearance?.getColorScheme?.() || 'light';
        setIsDarkMode(colorScheme === 'dark');
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    try {
      await AsyncStorage.setItem('foundify-theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  // Password strength calculator
  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    
    if (pwd.length === 0) {
      return { level: 'None', width: '0%', color: '#5b5b7a' };
    } else if (strength <= 1) {
      return { level: 'Weak', width: '20%', color: '#ef4444' };
    } else if (strength === 2) {
      return { level: 'Fair', width: '40%', color: '#f59e0b' };
    } else if (strength === 3) {
      return { level: 'Good', width: '60%', color: '#10b981' };
    } else if (strength === 4) {
      return { level: 'Strong', width: '80%', color: '#7c3aed' };
    } else {
      return { level: 'Very strong', width: '100%', color: '#7c3aed' };
    }
  };

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

  const handleRegister = async () => {
    if (!name || !email || !password || !passwordConfirmation) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password !== passwordConfirmation) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Error', 'You must accept the Terms of Service');
      return;
    }

    setLoading(true);
    const result = await register({
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
      terms: true,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
    });
    setLoading(false);

    if (result.success) {
      Alert.alert(
        'Success',
        'Registration successful! Please login with your credentials.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } else {
      Alert.alert('Registration Failed', result.error);
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

      const location = await Location.getCurrentPositionAsync({});
      setLatitude(location.coords.latitude.toFixed(6));
      setLongitude(location.coords.longitude.toFixed(6));
      Alert.alert('Success', 'Location set successfully!');
    } catch (error) {
      Alert.alert('Error', 'Unable to retrieve location. Please enter manually.');
    } finally {
      setGettingLocation(false);
    }
  };

  const styles = getStyles(isDarkMode);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Dark Mode Toggle */}
          <View style={styles.themeToggleWrapper}>
            <TouchableOpacity
              style={styles.themeToggleBtn}
              onPress={toggleTheme}
              activeOpacity={0.8}
            >
              <Text style={styles.themeIcon}>
                {isDarkMode ? '☀️' : '🌙'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Logo */}
          <View style={styles.logoWrapper}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoIconText}>🧭</Text>
              </View>
              <Text style={styles.logoText}>
                Found<Text style={styles.logoAccent}>ify</Text>
              </Text>
            </View>
          </View>

          {/* Form Header */}
          <View style={styles.formHeader}>
            <View style={styles.formTag}>
              <Text style={styles.formTagIcon}>👤</Text>
              <Text style={styles.formTagText}>new member</Text>
            </View>
            <Text style={styles.formTitle}>Get started</Text>
            <Text style={styles.formSubtitle}>
              Join thousands who've reunited with their belongings
            </Text>
          </View>

          {/* Registration Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full name</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor={isDarkMode ? '#938bb0' : '#7e7b9a'}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email address</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="hello@foundify.com"
                  placeholderTextColor={isDarkMode ? '#938bb0' : '#7e7b9a'}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor={isDarkMode ? '#938bb0' : '#7e7b9a'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  style={styles.togglePassword}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.toggleIcon}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Password Strength Indicator */}
              <View style={styles.passwordStrength}>
                <View style={styles.strengthLabels}>
                  <Text style={styles.strengthLabel}>Strength:</Text>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.level}
                  </Text>
                </View>
                <View style={styles.strengthBar}>
                  <View style={[styles.strengthFill, { width: passwordStrength.width, backgroundColor: passwordStrength.color }]} />
                </View>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm password</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor={isDarkMode ? '#938bb0' : '#7e7b9a'}
                  value={passwordConfirmation}
                  onChangeText={setPasswordConfirmation}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  style={styles.togglePassword}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Text style={styles.toggleIcon}>
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Location Section (Optional) */}
            <View style={styles.locationSection}>
              <TouchableOpacity
                style={styles.locationToggle}
                onPress={() => setLocationExpanded(!locationExpanded)}
                activeOpacity={0.7}
              >
                <View style={styles.locationToggleLeft}>
                  <Text style={styles.locationIcon}>📍</Text>
                  <Text style={styles.locationToggleText}>Add location (optional)</Text>
                </View>
                <Text style={[styles.chevronIcon, locationExpanded && styles.chevronRotated]}>
                  ▼
                </Text>
              </TouchableOpacity>

              {locationExpanded && (
                <View style={styles.locationContent}>
                  <View style={styles.locationHelp}>
                    <Text style={styles.locationHelpIcon}>ℹ️</Text>
                    <Text style={styles.locationHelpText}>Better local matches with your location</Text>
                  </View>

                  <View style={styles.locationGrid}>
                    <View style={styles.locationInputGroup}>
                      <Text style={styles.locationLabel}>Latitude</Text>
                      <TextInput
                        style={styles.locationInput}
                        placeholder="e.g., 40.7128"
                        placeholderTextColor={isDarkMode ? '#938bb0' : '#7e7b9a'}
                        value={latitude}
                        onChangeText={setLatitude}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.locationInputGroup}>
                      <Text style={styles.locationLabel}>Longitude</Text>
                      <TextInput
                        style={styles.locationInput}
                        placeholder="e.g., -74.0060"
                        placeholderTextColor={isDarkMode ? '#938bb0' : '#7e7b9a'}
                        value={longitude}
                        onChangeText={setLongitude}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.locationBtn}
                    onPress={getCurrentLocation}
                    disabled={gettingLocation}
                  >
                    {gettingLocation ? (
                      <ActivityIndicator size="small" color="#7c3aed" />
                    ) : (
                      <>
                        <Text style={styles.locationBtnIcon}>📍</Text>
                        <Text style={styles.locationBtnText}>Use current location</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Terms Agreement */}
            <View style={styles.termsSection}>
              <TouchableOpacity
                style={styles.checkboxLabel}
                onPress={() => setTermsAccepted(!termsAccepted)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxText}>
                  I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Create account</Text>
                  <Text style={styles.submitBtnIcon}>→</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>already have an account?</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Login Link */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginLinkText}>
                Sign in →
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#12101c' : '#faf9fe',
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: Platform.OS === 'ios' ? 20 : 40,
      paddingBottom: 40,
    },
    themeToggleWrapper: {
      alignItems: 'flex-end',
      marginBottom: 24,
    },
    themeToggleBtn: {
      width: 44,
      height: 44,
      borderRadius: 60,
      backgroundColor: isDarkMode ? '#2d2648' : '#ede9fe',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? '#2a2438' : '#edeef5',
    },
    themeIcon: {
      fontSize: 20,
    },
    logoWrapper: {
      alignItems: 'center',
      marginBottom: 28,
    },
    logoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logoIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: '#7c3aed',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#7c3aed',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 5,
    },
    logoIconText: {
      fontSize: 24,
    },
    logoText: {
      fontSize: 28,
      fontWeight: '800',
      color: isDarkMode ? '#f0edfc' : '#1e1b2f',
      letterSpacing: -0.5,
    },
    logoAccent: {
      color: '#7c3aed',
    },
    formHeader: {
      alignItems: 'center',
      marginBottom: 28,
    },
    formTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDarkMode ? '#2d2648' : '#ede9fe',
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 60,
      marginBottom: 16,
    },
    formTagIcon: {
      fontSize: 12,
    },
    formTagText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#7c3aed',
      textTransform: 'uppercase',
    },
    formTitle: {
      fontSize: 32,
      fontWeight: '800',
      color: isDarkMode ? '#f0edfc' : '#1e1b2f',
      marginBottom: 8,
    },
    formSubtitle: {
      fontSize: 14,
      color: isDarkMode ? '#b4adcf' : '#5b5b7a',
      textAlign: 'center',
    },
    form: {
      gap: 20,
    },
    inputGroup: {
      gap: 8,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: isDarkMode ? '#f0edfc' : '#1e1b2f',
      marginLeft: 4,
    },
    inputWrapper: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
    },
    inputIcon: {
      position: 'absolute',
      left: 16,
      zIndex: 1,
      fontSize: 16,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 48,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#2a2438' : '#edeef5',
      borderRadius: 16,
      fontSize: 15,
      backgroundColor: isDarkMode ? '#1e1a2f' : '#ffffff',
      color: isDarkMode ? '#f0edfc' : '#1e1b2f',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    passwordInput: {
      paddingRight: 48,
    },
    togglePassword: {
      position: 'absolute',
      right: 12,
      padding: 8,
    },
    toggleIcon: {
      fontSize: 18,
    },
    passwordStrength: {
      marginTop: 8,
    },
    strengthLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    strengthLabel: {
      fontSize: 11,
      color: isDarkMode ? '#b4adcf' : '#5b5b7a',
    },
    strengthText: {
      fontSize: 11,
      fontWeight: '600',
    },
    strengthBar: {
      height: 4,
      backgroundColor: isDarkMode ? '#2a2438' : '#edeef5',
      borderRadius: 2,
      overflow: 'hidden',
    },
    strengthFill: {
      height: '100%',
      borderRadius: 2,
    },
    locationSection: {
      marginTop: 4,
      borderWidth: 1,
      borderColor: isDarkMode ? '#2a2438' : '#edeef5',
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    },
    locationToggle: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    locationToggleLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    locationIcon: {
      fontSize: 14,
    },
    locationToggleText: {
      fontSize: 13,
      fontWeight: '500',
      color: isDarkMode ? '#b4adcf' : '#5b5b7a',
    },
    chevronIcon: {
      fontSize: 12,
      color: isDarkMode ? '#b4adcf' : '#5b5b7a',
      transition: 'transform 0.3s',
    },
    chevronRotated: {
      transform: [{ rotate: '180deg' }],
    },
    locationContent: {
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#2a2438' : '#edeef5',
    },
    locationHelp: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 16,
      paddingBottom: 8,
    },
    locationHelpIcon: {
      fontSize: 12,
    },
    locationHelpText: {
      fontSize: 11,
      color: isDarkMode ? '#b4adcf' : '#5b5b7a',
    },
    locationGrid: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    locationInputGroup: {
      flex: 1,
    },
    locationLabel: {
      fontSize: 11,
      color: isDarkMode ? '#b4adcf' : '#5b5b7a',
      marginBottom: 4,
    },
    locationInput: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#2a2438' : '#edeef5',
      borderRadius: 12,
      fontSize: 13,
      backgroundColor: isDarkMode ? '#1e1a2f' : '#ffffff',
      color: isDarkMode ? '#f0edfc' : '#1e1b2f',
    },
    locationBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#2a2438' : '#edeef5',
      borderRadius: 14,
      backgroundColor: 'transparent',
    },
    locationBtnIcon: {
      fontSize: 14,
    },
    locationBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#7c3aed',
    },
    termsSection: {
      marginTop: 8,
    },
    checkboxLabel: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: '#7c3aed',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: '#7c3aed',
      borderColor: '#7c3aed',
    },
    checkmark: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: 'bold',
    },
    checkboxText: {
      flex: 1,
      fontSize: 13,
      color: isDarkMode ? '#b4adcf' : '#5b5b7a',
      lineHeight: 20,
    },
    termsLink: {
      color: '#7c3aed',
      fontWeight: '500',
    },
    submitBtn: {
      backgroundColor: '#7c3aed',
      borderRadius: 60,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginTop: 8,
      shadowColor: '#7c3aed',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 14,
      elevation: 5,
    },
    submitBtnText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    submitBtnIcon: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 8,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: isDarkMode ? '#2a2438' : '#edeef5',
    },
    dividerText: {
      marginHorizontal: 16,
      fontSize: 11,
      color: isDarkMode ? '#938bb0' : '#7e7b9a',
      textTransform: 'uppercase',
    },
    loginLink: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    loginLinkText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#7c3aed',
    },
  });