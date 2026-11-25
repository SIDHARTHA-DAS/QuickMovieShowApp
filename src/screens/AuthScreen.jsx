import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

function lightTap() {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate(4);
    }
  } catch (_) {}
}

export default function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = () => {
    lightTap();
    setErrorMsg('');

    const cleanIdentifier = String(emailOrPhone || '').trim();
    const cleanName = String(name || '').trim();
    const cleanPass = String(password || '').trim();

    if (mode === 'signup' && cleanName.length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!cleanIdentifier || cleanIdentifier.length < 4) {
      setErrorMsg('Please enter a valid email or phone number.');
      return;
    }

    if (!cleanPass || cleanPass.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }

    const isEmail = cleanIdentifier.includes('@');
    const derivedName =
      cleanName ||
      (isEmail ? cleanIdentifier.split('@')[0] : 'Movie Lover');

    const userPayload = {
      id: `user_${cleanIdentifier.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: derivedName,
      email: isEmail ? cleanIdentifier.toLowerCase() : 'member@quickshow.app',
      phone: !isEmail ? cleanIdentifier : '+91 98765 43210',
      isLoggedIn: true,
      loggedInAt: new Date().toISOString(),
    };

    if (typeof onAuthSuccess === 'function') {
      onAuthSuccess(userPayload);
    }
  };

  const handleQuickDemoLogin = () => {
    lightTap();
    setErrorMsg('');
    const demoUser = {
      id: 'user_demo_001',
      name: 'Demo User',
      email: 'demo@quickshow.app',
      phone: '+91 90000 11111',
      isLoggedIn: true,
      loggedInAt: new Date().toISOString(),
    };

    if (typeof onAuthSuccess === 'function') {
      onAuthSuccess(demoUser);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Ionicons name="film" size={26} color={COLORS.white} />
            </View>
            <Text style={styles.appName}>QuickShow</Text>
            <Text style={styles.tagline}>
              {mode === 'login'
                ? 'Sign in to view your bookings & book seats'
                : 'Create your account to start booking'}
            </Text>
          </View>

          <View style={styles.switcherRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                lightTap();
                setMode('login');
                setErrorMsg('');
              }}
              style={[styles.switchBtn, mode === 'login' && styles.switchBtnActive]}
            >
              <Text
                style={[
                  styles.switchText,
                  mode === 'login' && styles.switchTextActive,
                ]}
              >
                Log In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                lightTap();
                setMode('signup');
                setErrorMsg('');
              }}
              style={[styles.switchBtn, mode === 'signup' && styles.switchBtnActive]}
            >
              <Text
                style={[
                  styles.switchText,
                  mode === 'signup' && styles.switchTextActive,
                ]}
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formCard}>
            {mode === 'signup' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="person-outline"
                    size={17}
                    color={COLORS.textMuted}
                  />
                  <TextInput
                    value={name}
                    onChangeText={(t) => {
                      setName(t);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Enter your name"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.input}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email or Phone</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="mail-outline"
                  size={17}
                  color={COLORS.textMuted}
                />
                <TextInput
                  value={emailOrPhone}
                  onChangeText={(t) => {
                    setEmailOrPhone(t);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="you@example.com or 9876543210"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color={COLORS.textMuted}
                />
                <TextInput
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Enter password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={() => {
                    lightTap();
                    setShowPassword((prev) => !prev);
                  }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={15} color="#FDA4AF" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleSubmit}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>
                {mode === 'login' ? 'Continue to App' : 'Create Account'}
              </Text>
              <Ionicons name="arrow-forward" size={17} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleQuickDemoLogin}
              style={styles.demoBtn}
            >
              <Ionicons
                name="flash-outline"
                size={15}
                color={COLORS.textSecondary}
              />
              <Text style={styles.demoBtnText}>Quick Demo Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  switcherRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  switchBtnActive: {
    backgroundColor: COLORS.primary,
  },
  switchText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  switchTextActive: {
    color: COLORS.white,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(244, 63, 94, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.45)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#FDA4AF',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  demoBtn: {
    marginTop: 10,
    borderRadius: 999,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  demoBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
  },
});