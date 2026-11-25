import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import HomeScreen from '../screens/HomeScreen';
import MoviesStack from './MoviesStack';
import TheatersScreen from '../screens/TheatersScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';

const Tab = createBottomTabNavigator();

// tab menu list
const TAB_CONFIG = {
  Home: {
    label: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  Movies: {
    label: 'Movies',
    activeIcon: 'film',
    inactiveIcon: 'film-outline',
  },
  Theaters: {
    label: 'Theaters',
    activeIcon: 'business',
    inactiveIcon: 'business-outline',
  },
  MyBookings: {
    label: 'Bookings',
    activeIcon: 'ticket',
    inactiveIcon: 'ticket-outline',
  },
};

function triggerLightHaptic() {
  try {
    // iOS ignores custom ms in Vibration.vibrate() and plays a heavy buzz,
    // so only run a tiny 4ms pulse on Android.
    if (Platform.OS === 'android') {
      Vibration.vibrate(4);
    }
  } catch (_) {}
}

// apple liquid glass style tab bar function
function AppleStyleTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 10);

  const [barWidth, setBarWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorStretch = useRef(new Animated.Value(1)).current;
  const tabCount = state.routes.length || 4;
  const innerWidth = Math.max(barWidth - 10, 0);
  const tabWidth = tabCount > 0 ? innerWidth / tabCount : 0;

  useEffect(() => {
    if (tabWidth > 0) {
      Animated.parallel([
        Animated.spring(indicatorX, {
          toValue: state.index * tabWidth,
          damping: 18,
          stiffness: 220,
          mass: 0.75,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(indicatorStretch, {
            toValue: 1.07,
            duration: 95,
            useNativeDriver: true,
          }),
          Animated.spring(indicatorStretch, {
            toValue: 1,
            damping: 16,
            stiffness: 240,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [state.index, tabWidth, indicatorX, indicatorStretch]);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: bottomOffset }]}
    >
      <View
        style={styles.pillContainer}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {/* Translucent glass layers & top specular highlight */}
        <View pointerEvents="none" style={styles.glassTintLayer} />
        <View pointerEvents="none" style={styles.glassTopSheen} />
        <View pointerEvents="none" style={styles.glassTopHighlight} />

        {tabWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.slidingPill,
              {
                width: tabWidth,
                transform: [
                  { translateX: indicatorX },
                  { scaleX: indicatorStretch },
                ],
              },
            ]}
          >
            <View style={styles.pillSpecularInner} />
          </Animated.View>
        ) : null}

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const cfg = TAB_CONFIG[route.name] || {
            label: route.name,
            activeIcon: 'ellipse',
            inactiveIcon: 'ellipse-outline',
          };

          const onPress = () => {
            triggerLightHaptic();

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.85}
              onPress={onPress}
              style={styles.tabItem}
            >
              <Ionicons
                name={isFocused ? cfg.activeIcon : cfg.inactiveIcon}
                size={18}
                color={isFocused ? COLORS.white : COLORS.textMuted}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  isFocused && styles.tabLabelActive,
                ]}
              >
                {cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function MainTabs({
  bookings = [],
  cancelledMap = {},
  reviewsMap = {},
  endedShowsMap = {},
  onAddBooking,
  onCancelBooking,
  onSaveReview,
  onMarkShowEnded,
  onResetDemoData,
  favorites = [],
  onToggleFavorite,
}) {
  return (
    <Tab.Navigator
      tabBar={(props) => <AppleStyleTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />

      <Tab.Screen name="Movies">
        {(props) => (
          <MoviesStack
            {...props}
            bookings={bookings}
            cancelledMap={cancelledMap}
            onAddBooking={onAddBooking}
            onCancelBooking={onCancelBooking}
            onResetDemoData={onResetDemoData}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Theaters" component={TheatersScreen} />

      <Tab.Screen name="MyBookings">
        {(props) => (
          <MyBookingsScreen
            {...props}
            bookings={bookings}
            cancelledMap={cancelledMap}
            reviewsMap={reviewsMap}
            endedShowsMap={endedShowsMap}
            onCancelBooking={onCancelBooking}
            onSaveReview={onSaveReview}
            onMarkShowEnded={onMarkShowEnded}
            onResetDemoData={onResetDemoData}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 6,
    zIndex: 50,
    elevation: 20,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(28, 22, 34, 0.78)',
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    padding: 5,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.42,
    shadowRadius: 20,
    elevation: 12,
  },
  glassTintLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  glassTopSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  glassTopHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1.2,
    backgroundColor: 'rgba(255, 255, 255, 0.36)',
  },
  slidingPill: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    left: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    overflow: 'hidden',
  },
  pillSpecularInner: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 22,
    zIndex: 1,
  },
  tabLabel: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
});