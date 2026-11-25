import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { MOVIES } from '../data/mockMovies';
import { fetchAllShows } from '../services/api';
import { normalizeMovie } from '../utils/movieAdapter';
import SectionHeader from '../components/SectionHeader';
import MovieCard from '../components/MovieCard';

const GENRES = ['All', 'Action', 'Sci-Fi', 'Drama', 'Thriller', 'Adventure'];
const INITIAL_MOVIES_COUNT = 4;
const LOAD_MORE_STEP = 4;

function ShimmerBlock({ pulseAnim, style }) {
  const opacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.38, 0.85, 0.38],
  });

  return <Animated.View style={[styles.shimmerBase, { opacity }, style]} />;
}

function MovieCardSkeleton({ width, pulseAnim }) {
  const posterHeight = Math.round(width * 1.42);

  return (
    <View style={[styles.skeletonCard, { width }]}>
      <ShimmerBlock
        pulseAnim={pulseAnim}
        style={[styles.skeletonPoster, { height: posterHeight }]}
      />
      <ShimmerBlock pulseAnim={pulseAnim} style={styles.skeletonTitleLine} />
      <ShimmerBlock pulseAnim={pulseAnim} style={styles.skeletonMetaLine} />
    </View>
  );
}

export default function MoviesScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [movies, setMovies] = useState(MOVIES.map(normalizeMovie));
  const [visibleCount, setVisibleCount] = useState(INITIAL_MOVIES_COUNT);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const loadTimerRef = useRef(null);

  const horizontalPadding = 16;
  const gap = 12;
  const cardWidth = Math.max((width - horizontalPadding * 2 - gap) / 2, 140);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1250,
        useNativeDriver: true,
      })
    );
    loop.start();

    return () => {
      loop.stop();
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
      }
    };
  }, [shimmerAnim]);

  const loadMovies = useCallback(async (isPullRefresh = false) => {
    try {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await fetchAllShows();
      const rawList = Array.isArray(data?.shows) ? data.shows : [];
      const list =
        rawList.length > 0
          ? rawList.map(normalizeMovie).filter(Boolean)
          : MOVIES.map(normalizeMovie);

      setMovies(list);
      setVisibleCount(Math.min(INITIAL_MOVIES_COUNT, list.length));
    } catch (err) {
      const fallback = MOVIES.map(normalizeMovie);
      setMovies(fallback);
      setVisibleCount(Math.min(INITIAL_MOVIES_COUNT, fallback.length));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMovies(false);
  }, [loadMovies]);

  const filteredMovies = useMemo(() => {
    return movies.filter((m) => {
      const matchesGenre =
        selectedGenre === 'All' ||
        String(m.genre || '')
          .toLowerCase()
          .includes(selectedGenre.toLowerCase());

      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.genre.toLowerCase().includes(q) ||
        m.language.toLowerCase().includes(q);

      return matchesGenre && matchesQuery;
    });
  }, [movies, selectedGenre, query]);

  useEffect(() => {
    setVisibleCount(Math.min(INITIAL_MOVIES_COUNT, filteredMovies.length));
  }, [selectedGenre, query, filteredMovies.length]);

  const visibleMovies = useMemo(
    () => filteredMovies.slice(0, visibleCount),
    [filteredMovies, visibleCount]
  );

  const hasMore = visibleCount < filteredMovies.length;

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);

    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
    }

    loadTimerRef.current = setTimeout(() => {
      setVisibleCount((prev) =>
        Math.min(prev + LOAD_MORE_STEP, filteredMovies.length)
      );
      setLoadingMore(false);
    }, 240);
  }, [loading, loadingMore, hasMore, filteredMovies.length]);

  const handleScroll = useCallback(
    (event) => {
      if (!hasMore || loading || loadingMore) return;
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (layoutMeasurement.height + contentOffset.y);

      if (distanceFromBottom < 240) {
        handleLoadMore();
      }
    },
    [hasMore, loading, loadingMore, handleLoadMore]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={180}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadMovies(true)}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.topBar}>
          <Text style={styles.brandText}>
            <Text style={styles.brandAccent}>Quick</Text>Show
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color={COLORS.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search movies, language or genre..."
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreRow}
        >
          {GENRES.map((genre) => {
            const active = genre === selectedGenre;
            return (
              <TouchableOpacity
                key={genre}
                activeOpacity={0.82}
                onPress={() => setSelectedGenre(genre)}
                style={[styles.genreChip, active && styles.genreChipActive]}
              >
                <Text
                  style={[
                    styles.genreChipText,
                    active && styles.genreChipTextActive,
                  ]}
                >
                  {genre}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.section}>
          <SectionHeader
            title={
              selectedGenre === 'All' ? 'Now Showing' : `${selectedGenre} Movies`
            }
          />

          {loading ? (
            <View style={styles.grid}>
              {[0, 1, 2, 3].map((idx) => (
                <MovieCardSkeleton
                  key={`mskel-${idx}`}
                  width={cardWidth}
                  pulseAnim={shimmerAnim}
                />
              ))}
            </View>
          ) : visibleMovies.length === 0 ? (
            <Text style={styles.emptyText}>No matching movies found.</Text>
          ) : (
            <>
              <View style={styles.grid}>
                {visibleMovies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    style={{ width: cardWidth }}
                    onPress={() =>
                      navigation.navigate('MovieDetails', {
                        movieId: movie.id,
                        movie,
                      })
                    }
                  />
                ))}
              </View>

              {loadingMore ? (
                <View style={styles.grid}>
                  {[0, 1].map((idx) => (
                    <MovieCardSkeleton
                      key={`mlazy-${idx}`}
                      width={cardWidth}
                      pulseAnim={shimmerAnim}
                    />
                  ))}
                </View>
              ) : null}

              {hasMore && !loadingMore ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleLoadMore}
                  style={styles.loadMoreBtn}
                >
                  <Text style={styles.loadMoreText}>
                    Load More ({filteredMovies.length - visibleCount} more)
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={15}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              ) : null}
            </>
          )}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  brandText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },
  brandAccent: {
    color: COLORS.primary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    padding: 0,
  },
  genreRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 13,
    paddingVertical: 6.5,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  genreChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genreChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  genreChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 18,
  },
  shimmerBase: {
    backgroundColor: '#27202A',
    borderRadius: 8,
  },
  skeletonCard: {
    gap: 8,
  },
  skeletonPoster: {
    width: '100%',
    borderRadius: 12,
  },
  skeletonTitleLine: {
    width: '82%',
    height: 14,
    borderRadius: 6,
  },
  skeletonMetaLine: {
    width: '52%',
    height: 11,
    borderRadius: 5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    marginTop: 12,
  },
  loadMoreBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  loadMoreText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
});