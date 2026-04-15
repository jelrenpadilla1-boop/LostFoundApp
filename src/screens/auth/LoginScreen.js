import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator,
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
  View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const handleLogin = async () => {
    setErrorMessage('');
    
    if (!email || !password) {
      setErrorMessage('Please fill in all fields');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    
    if (!result.success) {
      setErrorMessage('Invalid email or password. Please try again.');
    }
  };

  const s = getStyles(isDark);

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
                style={styles.themeToggle}
                activeOpacity={0.8}
                onPress={toggleTheme}
              >
                <Feather name={isDark ? 'sun' : 'moon'} size={18} color="#e50914" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navSignUp, { borderColor: isDark ? '#333333' : '#e0e0e0' }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={[styles.navSignUpText, { color: isDark ? '#b3b3b3' : '#666666' }]}>Sign Up</Text>
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
                <Text style={styles.heroBadgeText}>WELCOME BACK</Text>
              </View>

              <Text style={[styles.heroHeadline, { color: isDark ? '#ffffff' : '#1a1a1a' }]}>
                Sign in to <Text style={styles.heroHeadlineAccent}>Foundify</Text>
              </Text>
              <Text style={[styles.heroSub, { color: isDark ? '#b3b3b3' : '#666666' }]}>
                Access your matches, track lost items, and reconnect with what matters most.
              </Text>
            </View>
          </View>

          {/* ── Form Card (matching Landing Page feature cards) ── */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.formCard, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderColor: isDark ? '#333333' : '#e0e0e0' }]}>
              {/* Error Message */}
              {errorMessage ? (
                <View style={styles.errorAlert}>
                  <Feather name="alert-triangle" size={16} color="#e50914" />
                  <View style={styles.errorContent}>
                    <Text style={styles.errorTitle}>Unable to sign in</Text>
                    <Text style={[styles.errorText, { color: isDark ? '#e5e5e5' : '#666666' }]}>{errorMessage}</Text>
                  </View>
                </View>
              ) : null}

              {/* Email Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: isDark ? '#b3b3b3' : '#666666' }]}>Email Address</Text>
                <View style={[styles.inputRow, focusedField === 'email' && styles.inputRowFocused, { borderColor: isDark ? '#333333' : '#e0e0e0', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fafafa' }]}>
                  <Feather name="mail" size={18} color={focusedField === 'email' ? '#e50914' : (isDark ? '#666666' : '#999999')} style={styles.fieldIcon} />
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

              {/* Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: isDark ? '#b3b3b3' : '#666666' }]}>Password</Text>
                <View style={[styles.inputRow, focusedField === 'password' && styles.inputRowFocused, { borderColor: isDark ? '#333333' : '#e0e0e0', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fafafa' }]}>
                  <Feather name="lock" size={18} color={focusedField === 'password' ? '#e50914' : (isDark ? '#666666' : '#999999')} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, styles.passwordInput, { color: isDark ? '#ffffff' : '#1a1a1a' }]}
                    placeholder="Enter your password"
                    placeholderTextColor={isDark ? '#666666' : '#999999'}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setErrorMessage('');
                    }}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={isDark ? '#666666' : '#999999'} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity style={styles.forgotRow} onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Submit Button - Matching Landing CTA */}
              <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.88}>
                <LinearGradient colors={['#e50914', '#b20710']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.submitText}>Sign In</Text>
                      <Feather name="chevron-right" size={18} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign Up Link */}
              <View style={styles.signupRow}>
                <Text style={[styles.signupText, { color: isDark ? '#b3b3b3' : '#666666' }]}>Don't have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.signupLink}> Create account →</Text>
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
    paddingBottom: 8,
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
  navSignUp: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  navSignUpText: {
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
    marginBottom: 24,
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

  /* ── Form Card (matching Landing feature cards) ── */
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

  /* ── Forgot ── */
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 28,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e50914',
  },

  /* ── Submit Button (matching Landing CTA) ── */
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

  /* ── Sign Up Link ── */
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signupText: {
    fontSize: 14,
  },
  signupLink: {
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