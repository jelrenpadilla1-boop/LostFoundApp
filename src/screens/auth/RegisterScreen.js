import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ level: 'None', width: '0%', color: '#666666' });
  const { register } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const calculatePasswordStrength = (pwd) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    if (pwd.length === 0) return { level: 'None', width: '0%', color: '#666666' };
    if (strength <= 1) return { level: 'Weak', width: '25%', color: '#e50914' };
    if (strength === 2) return { level: 'Fair', width: '50%', color: '#f5c518' };
    if (strength === 3) return { level: 'Good', width: '75%', color: '#2e7d32' };
    return { level: 'Strong', width: '100%', color: '#2e7d32' };
  };

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

  const handleRegister = async () => {
    setErrorMessage('');

    if (!name || !email || !password || !passwordConfirmation) {
      setErrorMessage('Please fill in all fields');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    if (password !== passwordConfirmation) {
      setErrorMessage('Passwords do not match');
      return;
    }
    if (!termsAccepted) {
      setErrorMessage('You must accept the Terms of Service');
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
      Alert.alert('Success', 'Registration successful! Please login with your credentials.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } else {
      setErrorMessage(result.error || 'Registration failed. Please try again.');
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
    } catch {
      Alert.alert('Error', 'Unable to retrieve location. Please enter manually.');
    } finally {
      setGettingLocation(false);
    }
  };

  const s = getStyles(isDark);

  const iconColor = (field) =>
    focusedField === field ? '#e50914' : isDark ? '#666666' : '#999999';

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={s.root}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top Nav (matching Landing Page) ── */}
          <View style={[styles.nav, { paddingTop: Platform.OS === 'ios' ? 56 : 44 }]}>
            <TouchableOpacity style={styles.navBrand} activeOpacity={0.7} onPress={() => navigation.navigate('Landing')}>
              <Feather name="compass" size={24} color="#e50914" />
              <Text style={[styles.navLogo, { color: isDark ? '#ffffff' : '#1a1a1a' }]}>
                Found<Text style={styles.navLogoAccent}>ify</Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.navActions}>
              
              <TouchableOpacity
                style={[styles.navSignIn, { borderColor: isDark ? '#333333' : '#e0e0e0' }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={[styles.navSignInText, { color: isDark ? '#b3b3b3' : '#666666' }]}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Hero Section with Gradient ── */}
          <View style={styles.heroWrap}>
            <LinearGradient
              colors={isDark ? ['rgba(229,9,20,0.3)', 'transparent'] : ['rgba(229,9,20,0.08)', 'transparent']}
              style={styles.heroGradientTop}
            />
            <LinearGradient
              colors={isDark ? ['transparent', '#141414'] : ['transparent', '#f5f5f5']}
              style={styles.heroGradientBottom}
            />

            <View style={styles.heroBlob} />

            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Feather name="star" size={11} color="#e50914" />
                <Text style={styles.heroBadgeText}>JOIN US</Text>
              </View>

              <Text style={[styles.heroHeadline, { color: isDark ? '#ffffff' : '#1a1a1a' }]}>
                Create your <Text style={styles.heroHeadlineAccent}>Foundify</Text> account
              </Text>
              <Text style={[styles.heroSub, { color: isDark ? '#b3b3b3' : '#666666' }]}>
                Join thousands of users reuniting with their lost items every day.
              </Text>
            </View>
          </View>

          {/* ── Form Card ── */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.formCard, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderColor: isDark ? '#333333' : '#e0e0e0' }]}>
              {/* Error Message */}
              {errorMessage ? (
                <View style={styles.errorAlert}>
                  <Feather name="alert-triangle" size={16} color="#e50914" />
                  <View style={styles.errorContent}>
                    <Text style={styles.errorTitle}>Unable to create account</Text>
                    <Text style={[styles.errorText, { color: isDark ? '#e5e5e5' : '#666666' }]}>{errorMessage}</Text>
                  </View>
                </View>
              ) : null}

              {/* Full Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: isDark ? '#b3b3b3' : '#666666' }]}>Full Name</Text>
                <View style={[styles.inputRow, focusedField === 'name' && styles.inputRowFocused, { borderColor: isDark ? '#333333' : '#e0e0e0', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fafafa' }]}>
                  <Feather name="user" size={18} color={iconColor('name')} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { color: isDark ? '#ffffff' : '#1a1a1a' }]}
                    placeholder="John Doe"
                    placeholderTextColor={isDark ? '#666666' : '#999999'}
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      setErrorMessage('');
                    }}
                    autoCapitalize="words"
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: isDark ? '#b3b3b3' : '#666666' }]}>Email Address</Text>
                <View style={[styles.inputRow, focusedField === 'email' && styles.inputRowFocused, { borderColor: isDark ? '#333333' : '#e0e0e0', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fafafa' }]}>
                  <Feather name="mail" size={18} color={iconColor('email')} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { color: isDark ? '#ffffff' : '#1a1a1a' }]}
                    placeholder="hello@foundify.com"
                    placeholderTextColor={isDark ? '#666666' : '#999999'}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setErrorMessage('');
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: isDark ? '#b3b3b3' : '#666666' }]}>Password</Text>
                <View style={[styles.inputRow, focusedField === 'password' && styles.inputRowFocused, { borderColor: isDark ? '#333333' : '#e0e0e0', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fafafa' }]}>
                  <Feather name="lock" size={18} color={iconColor('password')} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, styles.passwordInput, { color: isDark ? '#ffffff' : '#1a1a1a' }]}
                    placeholder="Create a strong password"
                    placeholderTextColor={isDark ? '#666666' : '#999999'}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={isDark ? '#666666' : '#999999'} />
                  </TouchableOpacity>
                </View>

                {/* Password strength */}
                {password.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthHeader}>
                      <Text style={[styles.strengthLabel, { color: isDark ? '#b3b3b3' : '#666666' }]}>Password strength:</Text>
                      <Text style={[styles.strengthValue, { color: passwordStrength.color }]}>{passwordStrength.level}</Text>
                    </View>
                    <View style={[styles.strengthBar, { backgroundColor: isDark ? '#333333' : '#e0e0e0' }]}>
                      <View style={[styles.strengthFill, { width: passwordStrength.width, backgroundColor: passwordStrength.color }]} />
                    </View>
                  </View>
                )}
              </View>

              {/* Confirm Password */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: isDark ? '#b3b3b3' : '#666666' }]}>Confirm Password</Text>
                <View style={[styles.inputRow, focusedField === 'confirm' && styles.inputRowFocused, { borderColor: isDark ? '#333333' : '#e0e0e0', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fafafa' }]}>
                  <Feather name="lock" size={18} color={iconColor('confirm')} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, styles.passwordInput, { color: isDark ? '#ffffff' : '#1a1a1a' }]}
                    placeholder="Confirm your password"
                    placeholderTextColor={isDark ? '#666666' : '#999999'}
                    value={passwordConfirmation}
                    onChangeText={(text) => {
                      setPasswordConfirmation(text);
                      setErrorMessage('');
                    }}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="new-password"
                    onFocus={() => setFocusedField('confirm')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name={showConfirmPassword ? 'eye' : 'eye-off'} size={18} color={isDark ? '#666666' : '#999999'} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Location (Optional) */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: isDark ? '#b3b3b3' : '#666666' }]}>Location (Optional)</Text>
                <TouchableOpacity style={[styles.locationBtn, { borderColor: isDark ? '#333333' : '#e0e0e0', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fafafa' }]} onPress={getCurrentLocation} disabled={gettingLocation}>
                  {gettingLocation ? (
                    <ActivityIndicator size="small" color="#e50914" />
                  ) : (
                    <>
                      <Feather name="map-pin" size={18} color="#e50914" />
                      <Text style={[styles.locationBtnText, { color: isDark ? '#b3b3b3' : '#666666' }]}>Use my current location</Text>
                    </>
                  )}
                </TouchableOpacity>
                {(latitude || longitude) && (
                  <Text style={[styles.locationText, { color: isDark ? '#b3b3b3' : '#666666' }]}>
                    📍 {latitude}, {longitude}
                  </Text>
                )}
              </View>

              {/* Terms Agreement */}
              <TouchableOpacity style={styles.termsRow} onPress={() => setTermsAccepted((v) => !v)} activeOpacity={0.7}>
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && <Feather name="check" size={11} color="#fff" />}
                </View>
                <Text style={[styles.termsText, { color: isDark ? '#b3b3b3' : '#666666' }]}>
                  I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.88}>
                <LinearGradient colors={['#e50914', '#b20710']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.submitText}>Create Account</Text>
                      <Feather name="chevron-right" size={18} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign In Link */}
              <View style={styles.signinRow}>
                <Text style={[styles.signinText, { color: isDark ? '#b3b3b3' : '#666666' }]}>Already have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.signinLink}> Sign in →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* ── Nav (matching Landing) ── */
nav: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 24,
  paddingBottom: 8,      // was 16
  zIndex: 10,
},
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navLogo: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  navLogoAccent: {
    color: '#e50914',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(229,9,20,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navSignIn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  navSignInText: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* ── Hero (matching Landing) ── */
 heroWrap: {
  minHeight: 220,        // was 340
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 24,
  paddingTop: 8,         // was 20
  paddingBottom: 20,     // was 40
  overflow: 'hidden',
},
  heroGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  heroGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  heroBlob: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(229,9,20,0.08)',
    top: -20,
    alignSelf: 'center',
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 2,
  },
 heroBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  backgroundColor: 'rgba(229,9,20,0.18)',
  borderWidth: 1,
  borderColor: 'rgba(229,9,20,0.4)',
  borderRadius: 4,
  paddingHorizontal: 12,
  paddingVertical: 5,
  marginBottom: 12,      // was 24
},
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e50914',
    letterSpacing: 1,
  },
  heroHeadline: {
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 42,
    marginBottom: 16,
  },
  heroHeadlineAccent: {
    color: '#e50914',
  },
  heroSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },

  /* ── Form Card ── */
  formCard: {
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  /* ── Error Alert ── */
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(229,9,20,0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#e50914',
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e50914',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 11,
  },

  /* ── Fields ── */
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 14,
    height: 52,
  },
  inputRowFocused: {
    borderColor: '#e50914',
    borderWidth: 2,
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  passwordInput: {
    paddingRight: 36,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
  },

  /* ── Password strength ── */
  strengthContainer: {
    marginTop: 10,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  strengthLabel: {
    fontSize: 11,
  },
  strengthValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },

  /* ── Location ── */
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 14,
    height: 52,
  },
  locationBtnText: {
    fontSize: 14,
  },
  locationText: {
    fontSize: 11,
    marginTop: 8,
  },

  /* ── Terms ── */
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e50914',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#e50914',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  termsLink: {
    color: '#e50914',
    fontWeight: '600',
  },

  /* ── Submit Button ── */
  submitBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 4,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  /* ── Sign In Link ── */
  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signinText: {
    fontSize: 14,
  },
  signinLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e50914',
  },
});

const getStyles = (isDark) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: isDark ? '#141414' : '#f5f5f5',
  },
});