import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StatusBar,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Platform,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MainTabs from './src/navigation/MainTabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { INITIAL_BOOKINGS } from './src/data/mockMovies';
import { COLORS } from './src/theme/colors';
import SplashScreenOverlay from './src/components/SplashScreenOverlay';

const STORAGE_KEY = '@quickshow_persisted_state_v4';

const QuickShowTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.bg,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.cardBorder,
    primary: COLORS.primary,
  },
};

function lightBuzz() {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate(4);
    }
  } catch (_) {}
}

function getInitialBookings() {
  return (Array.isArray(INITIAL_BOOKINGS) ? INITIAL_BOOKINGS : []).map(
    (b) => ({
      ...b,
      status: b?.status || 'Confirmed',
    })
  );
}

function AuthGateModal({ visible, onCompleteAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [fullName, setFullName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleFormSubmit = () => {
    lightBuzz();
    setErrorText('');

    const cleanContact = String(emailOrPhone || '').trim();
    const cleanName = String(fullName || '').trim();
    const cleanPass = String(password || '').trim();

    if (mode === 'signup' && cleanName.length < 2) {
      setErrorText('Please enter your full name.');
      return;
    }

    if (!cleanContact || cleanContact.length < 4) {
      setErrorText('Please enter a valid email or phone number.');
      return;
    }

    if (!cleanPass || cleanPass.length < 4) {
      setErrorText('Password must be at least 4 characters.');
      return;
    }

    const isEmail = cleanContact.includes('@');
    const finalName =
      cleanName || (isEmail ? cleanContact.split('@')[0] : 'QuickShow Member');

    onCompleteAuth({
      id: `user_${cleanContact.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: finalName,
      email: isEmail ? cleanContact.toLowerCase() : 'member@quickshow.app',
      phone: !isEmail ? cleanContact : '+91 98765 43210',
      avatarIcon: 'person',
      isLoggedIn: true,
    });
  };

  const handleDemoLogin = () => {
    lightBuzz();
    setErrorText('');
    onCompleteAuth({
      id: 'mobile_demo_user_01',
      name: 'Demo User',
      email: 'demo@quickshow.app',
      phone: '+91 90000 11111',
      avatarIcon: 'person',
      isLoggedIn: true,
    });
  };

  return (
    <Modal
      visible={Boolean(visible)}
      animationType="fade"
      transparent={false}
      onRequestClose={() => {}}
    >
      <SafeAreaView style={authStyles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={authStyles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={authStyles.brandBlock}>
              <View style={authStyles.iconBadge}>
                <Ionicons name="film" size={26} color={COLORS.white} />
              </View>
              <Text style={authStyles.brandTitle}>
                <Text style={{ color: COLORS.primary }}>Quick</Text>Show
              </Text>
              <Text style={authStyles.subtitle}>
                {mode === 'login'
                  ? 'Log in to access your tickets & book seats'
                  : 'Sign up to start booking movie tickets'}
              </Text>
            </View>

            <View style={authStyles.tabSwitch}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  lightBuzz();
                  setMode('login');
                  setErrorText('');
                }}
                style={[
                  authStyles.tabBtn,
                  mode === 'login' && authStyles.tabBtnActive,
                ]}
              >
                <Text
                  style={[
                    authStyles.tabText,
                    mode === 'login' && authStyles.tabTextActive,
                  ]}
                >
                  Log In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  lightBuzz();
                  setMode('signup');
                  setErrorText('');
                }}
                style={[
                  authStyles.tabBtn,
                  mode === 'signup' && authStyles.tabBtnActive,
                ]}
              >
                <Text
                  style={[
                    authStyles.tabText,
                    mode === 'signup' && authStyles.tabTextActive,
                  ]}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            <View style={authStyles.card}>
              {mode === 'signup' ? (
                <View style={authStyles.fieldGroup}>
                  <Text style={authStyles.label}>Full Name</Text>
                  <View style={authStyles.inputBox}>
                    <Ionicons
                      name="person-outline"
                      size={17}
                      color={COLORS.textMuted}
                    />
                    <TextInput
                      value={fullName}
                      onChangeText={(val) => {
                        setFullName(val);
                        if (errorText) setErrorText('');
                      }}
                      placeholder="Enter full name"
                      placeholderTextColor={COLORS.textMuted}
                      style={authStyles.input}
                    />
                  </View>
                </View>
              ) : null}

              <View style={authStyles.fieldGroup}>
                <Text style={authStyles.label}>Email or Phone</Text>
                <View style={authStyles.inputBox}>
                  <Ionicons
                    name="mail-outline"
                    size={17}
                    color={COLORS.textMuted}
                  />
                  <TextInput
                    value={emailOrPhone}
                    onChangeText={(val) => {
                      setEmailOrPhone(val);
                      if (errorText) setErrorText('');
                    }}
                    placeholder="you@example.com or 9876543210"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={authStyles.input}
                  />
                </View>
              </View>

              <View style={authStyles.fieldGroup}>
                <Text style={authStyles.label}>Password</Text>
                <View style={authStyles.inputBox}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={17}
                    color={COLORS.textMuted}
                  />
                  <TextInput
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (errorText) setErrorText('');
                    }}
                    placeholder="Enter password"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showPassword}
                    style={authStyles.input}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      lightBuzz();
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

              {errorText ? (
                <View style={authStyles.errorBox}>
                  <Ionicons name="alert-circle" size={15} color="#FDA4AF" />
                  <Text style={authStyles.errorText}>{errorText}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleFormSubmit}
                style={authStyles.submitBtn}
              >
                <Text style={authStyles.submitText}>
                  {mode === 'login' ? 'Log In & View Bookings' : 'Sign Up & Continue'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleDemoLogin}
                style={authStyles.demoBtn}
              >
                <Ionicons
                  name="flash-outline"
                  size={15}
                  color={COLORS.textSecondary}
                />
                <Text style={authStyles.demoText}>Quick Demo Login</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function QuickShowRoot() {
  const auth = useAuth() || {};
  const { user, userId, loginUser, useDemoUser } = auth;

  const isLoggedIn = Boolean(user && (user.isLoggedIn !== false));
  const activeUserKey = String(user?.id || userId || 'mobile_demo_user_01');

  const [bookingsByUser, setBookingsByUser] = useState(() => ({
    mobile_demo_user_01: getInitialBookings(),
  }));
  const [cancelledByUser, setCancelledByUser] = useState({});
  const [favoritesByUser, setFavoritesByUser] = useState({});
  const [reviewsByUser, setReviewsByUser] = useState({});
  const [endedShowsByUser, setEndedShowsByUser] = useState({});
  const [hydrated, setHydrated] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function hydrateFromStorage() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isMounted) return;

        if (raw) {
          const parsed = JSON.parse(raw);

          if (
            parsed?.bookingsByUser &&
            typeof parsed.bookingsByUser === 'object'
          ) {
            setBookingsByUser(parsed.bookingsByUser);
          } else if (Array.isArray(parsed?.bookings) && parsed.bookings.length > 0) {
            setBookingsByUser({
              mobile_demo_user_01: parsed.bookings,
            });
          }

          if (
            parsed?.cancelledByUser &&
            typeof parsed.cancelledByUser === 'object'
          ) {
            setCancelledByUser(parsed.cancelledByUser);
          }

          if (
            parsed?.favoritesByUser &&
            typeof parsed.favoritesByUser === 'object'
          ) {
            setFavoritesByUser(parsed.favoritesByUser);
          }

          if (
            parsed?.reviewsByUser &&
            typeof parsed.reviewsByUser === 'object'
          ) {
            setReviewsByUser(parsed.reviewsByUser);
          }

          if (
            parsed?.endedShowsByUser &&
            typeof parsed.endedShowsByUser === 'object'
          ) {
            setEndedShowsByUser(parsed.endedShowsByUser);
          }
        }
      } catch (_) {
        // Fallback safely to default state if storage read fails
      } finally {
        if (isMounted) {
          setHydrated(true);
        }
      }
    }

    hydrateFromStorage();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    async function persistState() {
      try {
        const payload = {
          bookingsByUser,
          cancelledByUser,
          favoritesByUser,
          reviewsByUser,
          endedShowsByUser,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (_) {
        // Ignore storage write errors on constrained devices
      }
    }

    persistState();
  }, [
    bookingsByUser,
    cancelledByUser,
    favoritesByUser,
    reviewsByUser,
    endedShowsByUser,
    hydrated,
  ]);

  // When a user logs in, show their own saved bookings;
  // if a newly logged-in user has no bookings yet, give them starter bookings so MyBookings is populated cleanly.
  const currentBookings = useMemo(() => {
    if (!isLoggedIn) return [];
    const existing = bookingsByUser[activeUserKey];
    if (Array.isArray(existing)) {
      return existing;
    }
    return bookingsByUser.mobile_demo_user_01 || getInitialBookings();
  }, [isLoggedIn, bookingsByUser, activeUserKey]);

  const currentCancelledMap = isLoggedIn
    ? cancelledByUser[activeUserKey] || {}
    : {};
  const currentFavorites = isLoggedIn
    ? favoritesByUser[activeUserKey] || []
    : [];
  const currentReviewsMap = isLoggedIn
    ? reviewsByUser[activeUserKey] || {}
    : {};
  const currentEndedShowsMap = isLoggedIn
    ? endedShowsByUser[activeUserKey] || {}
    : {};

  const handleCompleteAuth = useCallback(
    (userProfile) => {
      if (typeof loginUser === 'function') {
        loginUser(userProfile);
      } else if (typeof useDemoUser === 'function') {
        useDemoUser();
      }

      const nextUserKey = String(userProfile?.id || 'mobile_demo_user_01');
      setBookingsByUser((prev) => {
        if (Array.isArray(prev[nextUserKey])) {
          return prev;
        }
        return {
          ...prev,
          [nextUserKey]: prev.mobile_demo_user_01 || getInitialBookings(),
        };
      });
    },
    [loginUser, useDemoUser]
  );

  const handleAddBooking = useCallback(
    (newBooking) => {
      if (!newBooking) return;
      const targetUserKey = String(newBooking.userId || activeUserKey);
      const formattedBooking = {
        ...newBooking,
        userId: targetUserKey,
        status: newBooking.status || 'Confirmed',
      };

      setBookingsByUser((prev) => {
        const baseList = Array.isArray(prev[targetUserKey])
          ? prev[targetUserKey]
          : prev.mobile_demo_user_01 || getInitialBookings();

        return {
          ...prev,
          [targetUserKey]: [formattedBooking, ...baseList],
        };
      });
    },
    [activeUserKey]
  );

  const handleCancelBooking = useCallback(
    (bookingItem) => {
      const targetId = String(bookingItem?.id || '');
      if (!targetId) return;

      const baseAmount = Number(bookingItem?.amount ?? 0);
      const refundAmount = Math.round(baseAmount * 0.9);
      const cancelledAt = new Date().toISOString();

      setCancelledByUser((prev) => {
        const userMap = prev[activeUserKey] || {};
        if (userMap[targetId]) return prev;

        return {
          ...prev,
          [activeUserKey]: {
            ...userMap,
            [targetId]: {
              status: 'Cancelled',
              refundAmount,
              refundPercent: 90,
              cancelledAt,
              cancelledByUserId: activeUserKey,
            },
          },
        };
      });

      setBookingsByUser((prev) => {
        const list = Array.isArray(prev[activeUserKey])
          ? prev[activeUserKey]
          : prev.mobile_demo_user_01 || getInitialBookings();

        return {
          ...prev,
          [activeUserKey]: list.map((item) => {
            if (String(item?.id) !== targetId) return item;
            const amt = Number(item?.amount ?? baseAmount);
            return {
              ...item,
              status: 'Cancelled',
              refundAmount: Math.round(amt * 0.9),
              refundPercent: 90,
              cancelledAt,
              cancelledByUserId: activeUserKey,
            };
          }),
        };
      });

      lightBuzz();
    },
    [activeUserKey]
  );

  const handleToggleFavorite = useCallback(
    (movie) => {
      if (!movie?.id) return;
      setFavoritesByUser((prev) => {
        const list = prev[activeUserKey] || [];
        const exists = list.some(
          (item) => String(item.id) === String(movie.id)
        );
        const nextList = exists
          ? list.filter((item) => String(item.id) !== String(movie.id))
          : [movie, ...list];

        return {
          ...prev,
          [activeUserKey]: nextList,
        };
      });
    },
    [activeUserKey]
  );

  const handleSaveReview = useCallback(
    (bookingId, reviewPayload) => {
      const targetId = String(bookingId || '');
      if (!targetId || !reviewPayload) return;

      const safeRating = Math.min(
        Math.max(Number(reviewPayload.rating) || 5, 1),
        5
      );
      const cleanComment = String(reviewPayload.comment || '').trim();
      const tags = Array.isArray(reviewPayload.tags) ? reviewPayload.tags : [];

      setReviewsByUser((prev) => {
        const userReviews = prev[activeUserKey] || {};
        return {
          ...prev,
          [activeUserKey]: {
            ...userReviews,
            [targetId]: {
              rating: safeRating,
              comment: cleanComment,
              tags,
              updatedAt: new Date().toISOString(),
            },
          },
        };
      });
    },
    [activeUserKey]
  );

  const handleMarkShowEnded = useCallback(
    (bookingId) => {
      const targetId = String(bookingId || '');
      if (!targetId) return;

      setEndedShowsByUser((prev) => {
        const userEnded = prev[activeUserKey] || {};
        return {
          ...prev,
          [activeUserKey]: {
            ...userEnded,
            [targetId]: true,
          },
        };
      });
    },
    [activeUserKey]
  );

  const handleResetDemoData = useCallback(async () => {
    const freshBookings = getInitialBookings();
    setBookingsByUser((prev) => ({
      ...prev,
      [activeUserKey]: freshBookings,
      mobile_demo_user_01: freshBookings,
    }));

    setCancelledByUser((prev) => {
      const next = { ...prev };
      delete next[activeUserKey];
      return next;
    });

    setFavoritesByUser((prev) => {
      const next = { ...prev };
      delete next[activeUserKey];
      return next;
    });

    setReviewsByUser((prev) => {
      const next = { ...prev };
      delete next[activeUserKey];
      return next;
    });

    setEndedShowsByUser((prev) => {
      const next = { ...prev };
      delete next[activeUserKey];
      return next;
    });

    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      // Ignore storage clear errors
    }
  }, [activeUserKey]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <NavigationContainer theme={QuickShowTheme}>
        <MainTabs
          bookings={currentBookings}
          cancelledMap={currentCancelledMap}
          reviewsMap={currentReviewsMap}
          endedShowsMap={currentEndedShowsMap}
          onAddBooking={handleAddBooking}
          onCancelBooking={handleCancelBooking}
          onSaveReview={handleSaveReview}
          onMarkShowEnded={handleMarkShowEnded}
          onResetDemoData={handleResetDemoData}
          favorites={currentFavorites}
          onToggleFavorite={handleToggleFavorite}
        />
      </NavigationContainer>

      {hydrated && !showSplash && !isLoggedIn ? (
        <AuthGateModal visible={!isLoggedIn} onCompleteAuth={handleCompleteAuth} />
      ) : null}

      {showSplash ? <SplashScreenOverlay onFinish={handleSplashFinish} /> : null}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <QuickShowRoot />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
});

const authStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 22,
  },
  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  brandTitle: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 5,
  },
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 4,
    marginBottom: 14,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: COLORS.white,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
  },
  fieldGroup: {
    marginBottom: 13,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputBox: {
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
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
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
  demoText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
  },
});