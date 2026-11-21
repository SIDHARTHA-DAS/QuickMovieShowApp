import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { MOVIES } from '../data/mockMovies';
import { fetchShowByMovieId } from '../services/api';
import { normalizeMovie } from '../utils/movieAdapter';
import SectionHeader from '../components/SectionHeader';
import MovieCard from '../components/MovieCard';

function formatReadableDate(isoDateStr) {
  if (!isoDateStr) return '21 Nov';
  const parsed = new Date(`${isoDateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(isoDateStr);
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

function formatTimeSlot(rawTime) {
  if (!rawTime) return '12:50 PM';
  if (typeof rawTime === 'string' && !rawTime.includes('T') && rawTime.length <= 10) {
    return rawTime;
  }
  const d = new Date(rawTime);
  if (Number.isNaN(d.getTime())) return String(rawTime);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function MovieDetailsScreen({
  route,
  navigation,
  favorites = [],
  onToggleFavorite,
}) {
  const { width } = useWindowDimensions();
  const params = route?.params || {};
  const fallbackRaw =
    params.movie ||
    MOVIES.find((m) => String(m.id) === String(params.movieId)) ||
    MOVIES[0];

  const [movie, setMovie] = useState(normalizeMovie(fallbackRaw));
  const [dateSlots, setDateSlots] = useState([]);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [loadingShow, setLoadingShow] = useState(true);

  const [popupText, setPopupText] = useState('');
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const popupTranslate = useRef(new Animated.Value(-16)).current;
  const popupTimer = useRef(null);

  const movieId = params.movieId || fallbackRaw?._id || fallbackRaw?.id;

  const isLiked = Array.isArray(favorites)
    ? favorites.some((item) => String(item.id) === String(movie.id))
    : false;

  const triggerFavPopup = (message) => {
    if (popupTimer.current) {
      clearTimeout(popupTimer.current);
    }
    setPopupText(message);
    popupOpacity.setValue(0);
    popupTranslate.setValue(-16);

    Animated.parallel([
      Animated.timing(popupOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(popupTranslate, {
        toValue: 0,
        damping: 18,
        stiffness: 220,
        useNativeDriver: true,
      }),
    ]).start();

    popupTimer.current = setTimeout(() => {
      Animated.timing(popupOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setPopupText(''));
    }, 1700);
  };

  useEffect(() => {
    return () => {
      if (popupTimer.current) clearTimeout(popupTimer.current);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadMovieShowDetails() {
      setLoadingShow(true);
      try {
        if (!movieId) {
          throw new Error('Missing movieId');
        }
        const res = await fetchShowByMovieId(movieId);
        if (!active) return;

        if (res?.movie) {
          setMovie(normalizeMovie(res.movie));
        }

        const dateTimeMap =
          res?.dateTime && typeof res.dateTime === 'object'
            ? res.dateTime
            : {};
        const dateKeys = Object.keys(dateTimeMap);

        if (dateKeys.length > 0) {
          const slots = dateKeys.map((key) => {
            const entries = Array.isArray(dateTimeMap[key])
              ? dateTimeMap[key]
              : [];
            const timings = entries.map((item) => ({
              label: formatTimeSlot(item?.time),
              showId: item?.showId || item?._id || null,
            }));
            return {
              rawDate: key,
              displayDate: formatReadableDate(key),
              timings:
                timings.length > 0
                  ? timings
                  : [{ label: '12:50 PM', showId: null }],
            };
          });
          setDateSlots(slots);
          setSelectedDateIndex(0);
        } else {
          const fallbackDates = (
            fallbackRaw?.dates || ['21 Nov', '22 Nov', '23 Nov']
          ).map((d, i) => ({
            rawDate: d,
            displayDate: d,
            timings: (
              fallbackRaw?.timings || ['12:50 PM', '04:15 PM', '07:45 PM']
            ).map((t, tIdx) => ({
              label: t,
              showId: `${movieId}-show-${i}-${tIdx}`,
            })),
          }));
          setDateSlots(fallbackDates);
          setSelectedDateIndex(0);
        }
      } catch (err) {
        if (!active) return;
        const fallbackDates = (
          fallbackRaw?.dates || ['21 Nov', '22 Nov', '23 Nov']
        ).map((d, i) => ({
          rawDate: d,
          displayDate: d,
          timings: (
            fallbackRaw?.timings || ['12:50 PM', '04:15 PM', '07:45 PM']
          ).map((t, tIdx) => ({
            label: t,
            showId: `${movieId || 'movie'}-show-${i}-${tIdx}`,
          })),
        }));
        setDateSlots(fallbackDates);
        setSelectedDateIndex(0);
      } finally {
        if (active) setLoadingShow(false);
      }
    }

    loadMovieShowDetails();
    return () => {
      active = false;
    };
  }, [movieId]);

  const handleHeartPress = () => {
    const nextIsFav = !isLiked;
    if (typeof onToggleFavorite === 'function') {
      onToggleFavorite(movie);
    }
    triggerFavPopup(
      nextIsFav
        ? `${movie.title} added to Favorites`
        : `${movie.title} removed from Favorites`
    );
  };

  const currentSlot = dateSlots[selectedDateIndex] || {
    rawDate: '21 Nov',
    displayDate: '21 Nov',
    timings: [{ label: '12:50 PM', showId: null }],
  };

  const cardWidth = (width - 16 * 2 - 12) / 2;
  const relatedMovies = MOVIES.map(normalizeMovie).filter(
    (m) => String(m.id) !== String(movie.id)
  );

  const handleCycleDate = (delta) => {
    if (dateSlots.length === 0) return;
    setSelectedDateIndex(
      (prev) => (prev + delta + dateSlots.length) % dateSlots.length
    );
  };

  const goToSeats = () => {
    navigation.navigate('SeatSelection', {
      movieId: movie.id,
      movie,
      selectedDate: currentSlot.displayDate,
      rawDate: currentSlot.rawDate,
      timingSlots: currentSlot.timings,
      initialShowId: currentSlot.timings?.[0]?.showId || null,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {popupText ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.popupToast,
            {
              opacity: popupOpacity,
              transform: [{ translateY: popupTranslate }],
            },
          ]}
        >
          <Ionicons name="heart" size={16} color={COLORS.primary} />
          <Text style={styles.popupText} numberOfLines={1}>
            {popupText}
          </Text>
        </Animated.View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backRow}
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>Back To Movies</Text>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>

        <View style={styles.heroRow}>
          <Image
            source={{ uri: movie.poster }}
            style={styles.poster}
            resizeMode="cover"
          />

          <View style={styles.infoCol}>
            <Text style={styles.langText}>{movie.language}</Text>
            <Text style={styles.title}>{movie.title}</Text>

            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={COLORS.primary} />
              <Text style={styles.ratingText}>
                {Number(movie.rating).toFixed(1)} User Rating
              </Text>
            </View>

            <Text style={styles.synopsis} numberOfLines={4}>
              {movie.synopsis}
            </Text>

            <Text style={styles.metaText}>
              {movie.duration} • {movie.genre} • {movie.year}
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.trailerBtn}
                onPress={goToSeats}
              >
                <Ionicons
                  name="play-circle-outline"
                  size={15}
                  color={COLORS.white}
                />
                <Text style={styles.trailerBtnText}>Watch Trailer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.buyBtn}
                onPress={goToSeats}
              >
                <Text style={styles.buyBtnText}>Buy Tickets</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleHeartPress}
                style={[
                  styles.heartBtn,
                  isLiked && styles.heartBtnActive,
                ]}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={17}
                  color={isLiked ? COLORS.primary : COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Favorite Cast</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.castRow}
          >
            {(movie.cast || []).map((person) => (
              <View key={person.id} style={styles.castItem}>
                <Image
                  source={{ uri: person.avatar }}
                  style={styles.castAvatar}
                  resizeMode="cover"
                />
                <Text style={styles.castName} numberOfLines={1}>
                  {person.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.dateBox}>
            <View>
              <Text style={styles.chooseDateLabel}>Choose Date</Text>
              {loadingShow ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <View style={styles.datePickerRow}>
                  <TouchableOpacity
                    onPress={() => handleCycleDate(-1)}
                    style={styles.arrowBtn}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={16}
                      color={COLORS.text}
                    />
                  </TouchableOpacity>

                  <View style={styles.dateChip}>
                    <Text style={styles.dateChipText}>
                      {currentSlot.displayDate}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleCycleDate(1)}
                    style={styles.arrowBtn}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={COLORS.text}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.bookNowBtn}
              onPress={goToSeats}
            >
              <Text style={styles.bookNowText}>Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="You May Also Like" />
          <View style={styles.grid}>
            {relatedMovies.map((item) => (
              <MovieCard
                key={item.id}
                movie={item}
                style={{ width: cardWidth }}
                onPress={() =>
                  navigation.push('MovieDetails', {
                    movieId: item.id,
                    movie: item,
                  })
                }
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  popupToast: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: 'rgba(28, 16, 22, 0.98)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  popupText: {
    color: COLORS.white,
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '500',
  },
  heroRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 14,
  },
  poster: {
    width: 118,
    height: 176,
    borderRadius: 12,
    backgroundColor: COLORS.card,
  },
  infoCol: {
    flex: 1,
  },
  langText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  ratingText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  synopsis: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 7,
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 7,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 11,
  },
  trailerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  trailerBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  buyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  buyBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  heartBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.roseCard,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 22,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  castRow: {
    gap: 14,
  },
  castItem: {
    width: 68,
    alignItems: 'center',
  },
  castAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.card,
    marginBottom: 5,
  },
  castName: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    textAlign: 'center',
  },
  dateBox: {
    backgroundColor: COLORS.roseCard,
    borderWidth: 1,
    borderColor: COLORS.roseBorder,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chooseDateLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowBtn: {
    padding: 4,
  },
  dateChip: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dateChipText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  bookNowBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bookNowText: {
    color: COLORS.white,
    fontSize: 12.5,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
});