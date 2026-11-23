import React, { useState, useEffect, useCallback } from 'react';
import {
  StatusBar,
  View,
  StyleSheet,
  Vibration,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainTabs from './src/navigation/MainTabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { INITIAL_BOOKINGS } from './src/data/mockMovies';
import { COLORS } from './src/theme/colors';
import SplashScreenOverlay from './src/components/SplashScreenOverlay';

const STORAGE_KEY = '@quickshow_persisted_state_v3';

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

function getInitialBookings() {
  return (Array.isArray(INITIAL_BOOKINGS) ? INITIAL_BOOKINGS : []).map(
    (b) => ({
      ...b,
      status: b?.status || 'Confirmed',
    })
  );
}

function QuickShowRoot() {
  const { userId } = useAuth();
  const activeUserKey = String(userId || 'mobile_demo_user_01');

  const [bookings, setBookings] = useState(getInitialBookings);
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

          if (Array.isArray(parsed?.bookings) && parsed.bookings.length > 0) {
            setBookings(parsed.bookings);
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
          bookings,
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
    bookings,
    cancelledByUser,
    favoritesByUser,
    reviewsByUser,
    endedShowsByUser,
    hydrated,
  ]);

  const currentCancelledMap = cancelledByUser[activeUserKey] || {};
  const currentFavorites = favoritesByUser[activeUserKey] || [];
  const currentReviewsMap = reviewsByUser[activeUserKey] || {};
  const currentEndedShowsMap = endedShowsByUser[activeUserKey] || {};

  const handleAddBooking = useCallback((newBooking) => {
    if (!newBooking) return;
    setBookings((prev) => [
      {
        ...newBooking,
        status: newBooking.status || 'Confirmed',
      },
      ...prev,
    ]);
  }, []);

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

      setBookings((prev) =>
        prev.map((item) => {
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
        })
      );

      try {
        Vibration.vibrate([0, 60, 50, 80]);
      } catch (_) {
        // Ignore vibration errors on unsupported devices
      }
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

      const safeRating = Math.min(Math.max(Number(reviewPayload.rating) || 5, 1), 5);
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
    setBookings(freshBookings);

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
          bookings={bookings}
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