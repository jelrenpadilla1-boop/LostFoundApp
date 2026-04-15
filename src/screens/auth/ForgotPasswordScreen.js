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
import api from '../../api/client';
import { useTheme } from '../../context/ThemeContext';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const { isDark, toggleTheme } = useTheme();

  const handleSend = async () => {
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await api.post('/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (error) {
      setErrorMessage(error.userMessage || error.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const s = getStyles(isDark);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={s.root}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

        {/* ── Hero Section ── */}
        <LinearGradient
          colors={isDark ? ['#141414', '#0a0a0a'] : ['#f5f5f5', '#ffffff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroOverlay} />

          <TouchableOpacity style={s.themeToggle} onPress={toggleTheme} activeOpacity={0.7}>
            <Feather name={isDark ? 'sun' : 'moon'} size={18} color="#e50914" />
          </TouchableOpacity>

          <View style={s.brand}>
            <Feather name="compass" size={32} color="#e50914" />
            <Text style={[s.brandName, { color: isDark ? '#ffffff' : '#1a1a1a' }]}>
              Found<Text style={s.brandAccent}>ify</Text>
            </Text>
          </View>
        </LinearGradient>

        {/* ── Form Card ── */}
        <KeyboardAvoidingView
          style={s.cardWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={[s.card, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]}
            contentContainerStyle={s.cardContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {sent ? (
              /* ── Success State ── */
              <View style={s.successContainer}>
                <View style={s.successIcon}>
                  <Feather name="mail" size={32} color="#e50914" />
                </View>
                <Text style={[s.title, { color: isDark ? '#ffffff' : '#1a1a1a' }]}>Check your email</Text>
                <Text style={[s.subtitle, { color: isDark ? '#b3b3b3' : '#666666' }]}>
                  We sent a password reset link to{'\n'}
                  <Text style={s.emailHighlight}>{email}</Text>
                </Text>
                <Text style={[s.successNote, { color: isDark ? '#b3b3b3' : '#666666' }]}>
                  Didn't receive it? Check your spam folder or try again.
                </Text>

                <TouchableOpacity
                  style={s.submitWrapper}
                  onPress={() => { setSent(false); setEmail(''); setErrorMessage(''); }}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#e50914', '#b20710']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.submitBtn}
                  >
                    <Feather name="refresh-cw" size={16} color="#fff" />
                    <Text style={s.submitText}>Try again</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={s.backRow} onPress={() => navigation.navigate('Login')}>
                  <Feather name="arrow-left" size={14} color="#e50914" />
                  <Text style={s.backText}> Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ── Input State ── */
              <>
                <Text style={[s.title, { color: isDark ? '#ffffff' : '#1a1a1a' }]}>Forgot password?</Text>
                <Text style={[s.subtitle, { color: isDark ? '#b3b3b3' : '#666666' }]}>
                  Enter your email and we'll send you a link to reset your password.
                </Text>

                {/* Error Message */}
                {errorMessage ? (
                  <View style={s.errorAlert}>
                    <Feather name="alert-triangle" size={16} color="#e50914" />
                    <View style={s.errorContent}>
                      <Text style={s.errorTitle}>Unable to send reset link</Text>
                      <Text style={s.errorText}>{errorMessage}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Email Field */}
                <View style={s.fieldGroup}>
                  <Text style={[s.label, { color: isDark ? '#b3b3b3' : '#666666' }]}>Email Address</Text>
                  <View style={[s.inputRow, focusedField === 'email' && s.inputRowFocused]}>
                    <Feather
                      name="mail"
                      size={18}
                      color={focusedField === 'email' ? '#e50914' : isDark ? '#666666' : '#999999'}
                      style={s.fieldIcon}
                    />
                    <TextInput
                      style={[s.textInput, { color: isDark ? '#ffffff' : '#1a1a1a' }]}
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

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={loading}
                  activeOpacity={0.88}
                  style={s.submitWrapper}
                >
                  <LinearGradient
                    colors={['#e50914', '#b20710']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.submitBtn}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={s.submitText}>Send reset link</Text>
                        <Feather name="send" size={16} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Back to Login */}
                <TouchableOpacity style={s.backRow} onPress={() => navigation.navigate('Login')}>
                  <Feather name="arrow-left" size={14} color="#e50914" />
                  <Text style={s.backText}> Back to Sign In</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const HERO_H = 200;
const CARD_RADIUS = 0;

const getStyles = (isDark) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: isDark ? '#141414' : '#f5f5f5',
    },

    /* ── Hero ── */
    hero: {
      height: HERO_H,
      paddingTop: Platform.OS === 'ios' ? 56 : 48,
      paddingHorizontal: 24,
      paddingBottom: 20,
      justifyContent: 'flex-end',
      position: 'relative',
    },
    heroOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.05)',
    },
    themeToggle: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 56 : 48,
      right: 24,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(229,9,20,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#333333' : '#e0e0e0',
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    brandName: {
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    brandAccent: {
      color: '#e50914',
    },

    /* ── Card ── */
    cardWrapper: {
      flex: 1,
      marginTop: 0,
    },
    card: {
      flex: 1,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
    },
    cardContent: {
      paddingHorizontal: 28,
      paddingTop: 32,
      paddingBottom: 40,
    },

    title: {
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      marginBottom: 32,
      lineHeight: 20,
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
      color: isDark ? '#e5e5e5' : '#666666',
    },

    /* ── Fields ── */
    fieldGroup: {
      marginBottom: 24,
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
      borderColor: isDark ? '#333333' : '#e0e0e0',
      borderRadius: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fafafa',
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

    /* ── Submit ── */
    submitWrapper: {
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 24,
    },
    submitBtn: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    submitText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },

    /* ── Back link ── */
    backRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    backText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#e50914',
    },

    /* ── Success State ── */
    successContainer: {
      alignItems: 'center',
    },
    successIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: 'rgba(229,9,20,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    emailHighlight: {
      fontWeight: '700',
      color: '#e50914',
    },
    successNote: {
      fontSize: 13,
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 18,
    },
  });