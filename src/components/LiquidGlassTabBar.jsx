import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

function triggerTactileFeedback(pattern = [0, 18, 20, 18]) {
  try {
    Vibration.vibrate(pattern);
  } catch (_) {
    try {
      Vibration.vibrate(20);
    } catch (__) {}
  }
}

function LiquidGlassTabItem({
  routeKey,
  label,
  iconName,
  isFocused,
  onPress,
  onLongPress,
}) {
  const scaleAnim = useRef(new Animated.Value(isFocused ? 1.05 : 1)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.05 : 1,
      friction: 6,
      tension: 170,
      useNativeDriver: true,
    }).start();
  }, [isFocused, scaleAnim]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.92,
      friction: 7,
      tension: 260,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 6,
      tension: 220,
      useNativeDriver: true,
    }).start();
  };

  const combinedScale = Animated.multiply(scaleAnim, pressAnim);

  return (
    <Animated.View
      style={[styles.tabSlot, { transform: [{ scale: combinedScale }] }]}
    >
      <TouchableOpacity
        key={routeKey}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        onLongPress={onLongPress}
        style={[styles.tabItem, isFocused && styles.tabItemActive]}
      >
        {isFocused ? <View style={styles.activeInnerGlow} /> : null}
        <Ionicons
          name={iconName}
          size={19}
          color={isFocused ? '#FFFFFF' : COLORS.textSecondary}
        />
        <Text
          numberOfLines={1}
          style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
        >
          {String(label)}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function LiquidGlassTabBar({
  state,
  descriptors,
  navigation,
  insetsBottom = 0,
}) {
  if (!state || !Array.isArray(state.routes)) return null;

  const bottomOffset = Math.max(insetsBottom, 14);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: bottomOffset }]}
    >
      <View style={styles.glassOuter}>
        {/* iOS Liquid Glass translucent & specular layers */}
        <View pointerEvents="none" style={styles.glassFrostBase} />
        <View pointerEvents="none" style={styles.glassTopHighlight} />
        <View pointerEvents="none" style={styles.glassBottomShade} />
        <View pointerEvents="none" style={styles.topRimBeam} />

        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors?.[route.key] || {};
            const label =
              options?.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options?.title !== undefined
                  ? options.title
                  : route.name;

            const isFocused = state.index === index;

            const iconName =
              options?.tabBarIconName ||
              (route.name === 'MoviesList'
                ? isFocused
                  ? 'film'
                  : 'film-outline'
                : route.name === 'MyBookings'
                  ? isFocused
                    ? 'ticket'
                    : 'ticket-outline'
                  : isFocused
                    ? 'sparkles'
                    : 'sparkles-outline');

            const onPress = () => {
              triggerTactileFeedback([0, 18, 22, 18]);

              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              triggerTactileFeedback([0, 35]);
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <LiquidGlassTabItem
                key={route.key}
                routeKey={route.key}
                label={label}
                iconName={iconName}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 50,
  },
  glassOuter: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'rgba(28, 24, 38, 0.72)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.42,
    shadowRadius: 24,
    elevation: 14,
  },
  glassFrostBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  glassTopHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  glassBottomShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(10, 8, 16, 0.28)',
  },
  topRimBeam: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 6,
    gap: 6,
  },
  tabSlot: {
    flex: 1,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 24,
    overflow: 'hidden',
  },
  tabItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.34)',
  },
  activeInnerGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});