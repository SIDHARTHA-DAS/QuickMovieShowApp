import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function CinemaFooter({
  onExploreMovies,
  onOpenBookings,
  onOpenTheaters,
}) {
  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.03)', 'rgba(244, 63, 94, 0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Ionicons name="film" size={15} color={COLORS.white} />
          </View>
          <View style={styles.brandTextCol}>
            <Text style={styles.brandName}>
              <Text style={styles.accent}>Quick</Text>Show
            </Text>
            <Text style={styles.tagline}>
              Showtimes • Seat picks • Instant passes
            </Text>
          </View>
        </View>

        <Text style={styles.desc}>
          Step into a world where stories come alive. Discover endless
          entertainment with the latest movies, trailers, and smooth ticket
          booking—all in one place.
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onExploreMovies}
            style={styles.primaryBtn}
          >
            <Ionicons name="ticket-outline" size={14} color={COLORS.white} />
            <Text style={styles.primaryBtnText}>Browse Movies</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onOpenBookings}
            style={styles.secondaryBtn}
          >
            <Ionicons name="receipt-outline" size={14} color={COLORS.text} />
            <Text style={styles.secondaryBtnText}>Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onOpenTheaters}
            style={styles.secondaryBtn}
          >
            <Ionicons name="business-outline" size={14} color={COLORS.text} />
            <Text style={styles.secondaryBtnText}>Theaters</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <Text style={styles.copyright}>
          Copyright 2026. All Right Reserved. ©Sidharth
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 28,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
    padding: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextCol: {
    flex: 1,
  },
  brandName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  accent: {
    color: COLORS.primary,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  desc: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  primaryBtn: {
    flex: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  secondaryBtnText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginTop: 14,
    marginBottom: 10,
  },
  copyright: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
});