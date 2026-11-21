import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
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

function SmoothSceneWrapper({ isFocused, children }) {
  const opacity = useRef(new Animated.Value(isFocused ? 1 : 0.7)).current;
  const translateY = useRef(new Animated.Value(isFocused ? 0 : 10)).current;

  useEffect(() => {
    if (isFocused) {
      opacity.setValue(0.35);
      translateY.setValue(12);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 240,
          mass: 0.85,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isFocused, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.sceneContainer,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function AppleStyleTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 10);

  const [barWidth, setBarWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const tabCount = state.routes.length || 4;
  const innerWidth = Math.max(barWidth - 10, 0);
  const tabWidth = tabCount > 0 ? innerWidth / tabCount : 0;

  useEffect(() => {
    if (tabWidth > 0) {
      Animated.spring(indicatorX, {
        toValue: state.index * tabWidth,
        damping: 20,
        stiffness: 230,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    }
  }, [state.index, tabWidth, indicatorX]);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: bottomOffset }]}
    >
      <View
        style={styles.pillContainer}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {tabWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.slidingPill,
              {
                width: tabWidth,
                transform: [{ translateX: indicatorX }],
              },
            ]}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const cfg = TAB_CONFIG[route.name] || {
            label: route.name,
            activeIcon: 'ellipse',
            inactiveIcon: 'ellipse-outline',
          };

          const onPress = () => {
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
  onAddBooking,
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
      <Tab.Screen name="Home">
        {(props) => (
          <SmoothSceneWrapper isFocused={props.navigation.isFocused()}>
            <HomeScreen {...props} />
          </SmoothSceneWrapper>
        )}
      </Tab.Screen>

      <Tab.Screen name="Movies">
        {(props) => (
          <SmoothSceneWrapper isFocused={props.navigation.isFocused()}>
            <MoviesStack
              {...props}
              bookings={bookings}
              onAddBooking={onAddBooking}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
            />
          </SmoothSceneWrapper>
        )}
      </Tab.Screen>

      <Tab.Screen name="Theaters">
        {(props) => (
          <SmoothSceneWrapper isFocused={props.navigation.isFocused()}>
            <TheatersScreen {...props} />
          </SmoothSceneWrapper>
        )}
      </Tab.Screen>

      <Tab.Screen name="MyBookings">
        {(props) => (
          <SmoothSceneWrapper isFocused={props.navigation.isFocused()}>
            <MyBookingsScreen
              {...props}
              bookings={bookings}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
            />
          </SmoothSceneWrapper>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 14, 18, 0.96)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 5,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
  },
  slidingPill: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    left: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 22,
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