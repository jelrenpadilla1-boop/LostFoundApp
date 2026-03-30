import AsyncStorage from '@react-native-async-storage/async-storage';
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
  useColorScheme,
  View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { login } = useAuth();
  const colorScheme = useColorScheme();

  // Load saved theme preference on mount
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Login Failed', result.error);
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
            <Text style={styles.formTitle}>Sign in</Text>
            <Text style={styles.formSubtitle}>
              Access your account to continue reuniting
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            {/* Email Input */}
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

            {/* Password Input */}
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
                  autoComplete="password"
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
            </View>

            {/* Form Options */}
            <View style={styles.formOptions}>
              <TouchableOpacity
                style={styles.checkboxLabel}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxText}>Keep me signed in</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Sign in</Text>
                  <Text style={styles.submitBtnIcon}>→</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialButtons}>
              <TouchableOpacity style={styles.socialBtn}>
                <Text style={styles.socialIcon}>G</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Text style={styles.socialIcon}>🐙</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Text style={styles.socialIcon}>🍎</Text>
              </TouchableOpacity>
            </View>

            {/* Signup Link */}
            <View style={styles.signupLink}>
              <Text style={styles.signupText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signupLinkText}>
                  Create free account →
                </Text>
              </TouchableOpacity>
            </View>
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
      color: isDarkMode ? '#938bb0' : '#7e7b9a',
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
      color: isDarkMode ? '#938bb0' : '#7e7b9a',
    },
    formOptions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    checkboxLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: isDarkMode ? '#a78bfa' : '#7c3aed',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    checkboxChecked: {
      backgroundColor: '#7c3aed',
      borderColor: '#7c3aed',
    },
    checkmark: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: 'bold',
    },
    checkboxText: {
      fontSize: 13,
      color: isDarkMode ? '#b4adcf' : '#5b5b7a',
    },
    forgotLink: {
      fontSize: 13,
      fontWeight: '500',
      color: '#7c3aed',
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
      fontSize: 12,
      color: isDarkMode ? '#938bb0' : '#7e7b9a',
      textTransform: 'uppercase',
    },
    socialButtons: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
    },
    socialBtn: {
      width: 52,
      height: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDarkMode ? '#2a2438' : '#edeef5',
      backgroundColor: isDarkMode ? '#191624' : '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    socialIcon: {
      fontSize: 24,
      color: isDarkMode ? '#b4adcf' : '#5b5b7a',
    },
    signupLink: {
      alignItems: 'center',
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#2a2438' : '#edeef5',
      gap: 6,
    },
    signupText: {
      fontSize: 13,
      color: isDarkMode ? '#b4adcf' : '#5b5b7a',
    },
    signupLinkText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#7c3aed',
    },
  });