import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function SplashScreenOverlay({ onFinish }) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenScale = useRef(new Animated.Value(1)).current;

  const badgeScale = useRef(new Animated.Value(0.5)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;

  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameTranslateY = useRef(new Animated.Value(20)).current;

  const subOpacity = useRef(new Animated.Value(0)).current;
  const subTranslateY = useRef(new Animated.Value(12)).current;

  const glowScale = useRef(new Animated.Value(0.85)).current;
  const glowOpacity = useRef(new Animated.Value(0.22)).current;

  const pulseOpacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (typeof onFinish === 'function') {
        onFinish();
      }
    };

    const auraLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1.25,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.45,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 0.85,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.2,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const statusLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: 550,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0.35,
          duration: 550,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    auraLoop.start();
    statusLoop.start();

    const mainSequence = Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.spring(badgeScale, {
          toValue: 1,
          friction: 5.5,
          tension: 95,
          useNativeDriver: true,
        }),
        Animated.timing(badgeOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(nameOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(nameTranslateY, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(subOpacity, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(subTranslateY, {
          toValue: 0,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(750),
      Animated.parallel([
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 460,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(screenScale, {
          toValue: 1.05,
          duration: 460,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);

    mainSequence.start(() => {
      auraLoop.stop();
      statusLoop.stop();
      finish();
    });

    const hardFallback = setTimeout(() => {
      auraLoop.stop();
      statusLoop.stop();
      finish();
    }, 3400);

    return () => {
      auraLoop.stop();
      statusLoop.stop();
      clearTimeout(hardFallback);
    };
  }, [
    screenOpacity,
    screenScale,
    badgeScale,
    badgeOpacity,
    nameOpacity,
    nameTranslateY,
    subOpacity,
    subTranslateY,
    glowScale,
    glowOpacity,
    pulseOpacity,
    onFinish,
  ]);

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        styles.overlay,
        {
          opacity: screenOpacity,
          transform: [{ scale: screenScale }],
        },
      ]}
    >
      <LinearGradient
        colors={['#190711', COLORS.bg, '#070306']}
        locations={[0, 0.55, 1]}
        style={styles.fill}
      >
        <Animated.View
          style={[
            styles.glowCircle,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />

        <View style={styles.centerBox}>
          <Animated.View
            style={[
              styles.iconOuter,
              {
                opacity: badgeOpacity,
                transform: [{ scale: badgeScale }],
              },
            ]}
          >
            <LinearGradient
              colors={['#FF4D6D', COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconInner}
            >
              <Ionicons name="film" size={38} color={COLORS.white} />
            </LinearGradient>
          </Animated.View>

          <Animated.View
            style={{
              opacity: nameOpacity,
              transform: [{ translateY: nameTranslateY }],
            }}
          >
            <Text style={styles.title}>
              <Text style={styles.titleAccent}>Quick</Text>Show
            </Text>
          </Animated.View>

          <Animated.View
            style={{
              opacity: subOpacity,
              transform: [{ translateY: subTranslateY }],
            }}
          >
            <Text style={styles.subtitle}>CINEMA • SHOWTIMES • INSTANT PASSES</Text>
          </Animated.View>

          <Animated.Text style={[styles.loadingLabel, { opacity: pulseOpacity }]}>
            Preparing your cinema experience...
          </Animated.Text>
        </View>

        <Text style={styles.footerText}>QuickShow • Bhubaneswar</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 50,
    backgroundColor: COLORS.bg,
  },
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  glowCircle: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.primary,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOuter: {
    width: 88,
    height: 88,
    borderRadius: 26,
    padding: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    marginBottom: 18,
  },
  iconInner: {
    flex: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  titleAccent: {
    color: COLORS.primary,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingLabel: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 26,
  },
  footerText: {
    position: 'absolute',
    bottom: 34,
    color: COLORS.textMuted,
    fontSize: 11.5,
    fontWeight: '600',
  },
});