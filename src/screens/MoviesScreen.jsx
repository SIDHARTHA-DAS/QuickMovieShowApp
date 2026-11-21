import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  RefreshControl,
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

export default function MoviesScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [movies, setMovies] = useState(MOVIES.map(normalizeMovie));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const horizontalPadding = 16;
  const gap = 12;
  const cardWidth = (width - horizontalPadding * 2 - gap) / 2;

  const loadMovies = useCallback(async (isPullRefresh = false) => {
    try {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await fetchAllShows();
      const rawList = Array.isArray(data?.shows) ? data.shows : [];
      if (rawList.length > 0) {
        setMovies(rawList.map(normalizeMovie).filter(Boolean));
      } else {
        setMovies(MOVIES.map(normalizeMovie));
      }
    } catch (err) {
      setMovies(MOVIES.map(normalizeMovie));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMovies(false);
  }, [loadMovies]);

  const filteredMovies = movies.filter((m) => {
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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

        {/* Genre Filter Chips */}
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
            <View style={styles.loaderBox}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loaderText}>Fetching movies...</Text>
            </View>
          ) : filteredMovies.length === 0 ? (
            <Text style={styles.emptyText}>No matching movies found.</Text>
          ) : (
            <View style={styles.grid}>
              {filteredMovies.map((movie) => (
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
  loaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  loaderText: {
    color: COLORS.textMuted,
    fontSize: 12.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
});