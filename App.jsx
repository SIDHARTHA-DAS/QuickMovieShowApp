import React, { useState, useEffect, useRef } from 'react';
import {
  StatusBar,
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MainTabs from './src/navigation/MainTabs';
import { AuthProvider } from './src/context/AuthContext';
import { INITIAL_BOOKINGS } from './src/data/mockMovies';
import { COLORS } from './src/theme/colors';

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

function BrandSplash({ onDone }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.82)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 85,
        useNativeDriver: true,
      }),
    ]).start();

    const exitTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 450,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (typeof onDone === 'function') onDone();
      });
    }, 2400);

    const hardDone = setTimeout(() => {
      if (typeof onDone === 'function') onDone();
    }, 3200);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hardDone);
    };
  }, [opacity, scale, onDone]);

  return (
    <Animated.View style={[styles.splashOverlay, { opacity }]}>
      <LinearGradient
        colors={['#1E0611', COLORS.bg, '#070306']}
        locations={[0, 0.55, 1]}
        style={styles.splashFill}
      >
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <View style={styles.iconBox}>
            <Ionicons name="film" size={40} color={COLORS.white} />
          </View>

          <Text style={styles.splashTitle}>
            <Text style={styles.splashAccent}>Quick</Text>Show
          </Text>

          <Text style={styles.splashSub}>
            CINEMA • SHOWTIMES • INSTANT PASSES
          </Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

export default function App() {
  const [bookings, setBookings] = useState(INITIAL_BOOKINGS);
  const [favorites, setFavorites] = useState([]);
  const [showSplash, setShowSplash] = useState(true);

  const handleAddBooking = (newBooking) => {
    setBookings((prev) => [newBooking, ...prev]);
  };

  const handleToggleFavorite = (movie) => {
    if (!movie?.id) return;
    setFavorites((prev) => {
      const exists = prev.some((item) => String(item.id) === String(movie.id));
      if (exists) {
        return prev.filter((item) => String(item.id) !== String(movie.id));
      }
      return [movie, ...prev];
    });
  };

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={styles.root}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
          <NavigationContainer theme={QuickShowTheme}>
            <MainTabs
              bookings={bookings}
              onAddBooking={handleAddBooking}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
            />
          </NavigationContainer>

          {showSplash ? <BrandSplash onDone={() => setShowSplash(false)} /> : null}
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99,
    backgroundColor: COLORS.bg,
  },
  splashFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconBox: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  splashTitle: {
    color: COLORS.white,
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  splashAccent: {
    color: COLORS.primary,
  },
  splashSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 8,
    textAlign: 'center',
  },
});