import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function MovieCard({ movie, onPress, style }) {
  const metaLine = `${movie.year} • ${movie.genre} • ${movie.duration}`;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, style]}
    >
      <View style={styles.posterWrap}>
        <Image
          source={{ uri: movie.poster }}
          style={styles.poster}
          resizeMode="cover"
        />
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {movie.title}
        </Text>

        <Text style={styles.meta} numberOfLines={1}>
          {metaLine}
        </Text>

        <View style={styles.footerRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            style={styles.buyBtn}
          >
            <Text style={styles.buyBtnText}>Buy Tickets</Text>
          </TouchableOpacity>

          <View style={styles.ratingBox}>
            <Ionicons name="star" size={13} color={COLORS.primary} />
            <Text style={styles.ratingText}>{Number(movie.rating).toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  posterWrap: {
    width: '100%',
    aspectRatio: 16 / 11,
    backgroundColor: COLORS.surface,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  body: {
    padding: 11,
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 11,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  buyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  buyBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});