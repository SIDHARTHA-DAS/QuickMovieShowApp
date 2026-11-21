import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { COLORS } from '../theme/colors';
import { MOVIES, TRAILERS } from '../data/mockMovies';
import { fetchAllShows } from '../services/api';
import { normalizeMovie } from '../utils/movieAdapter';
import { useAuth } from '../context/AuthContext';
import SectionHeader from '../components/SectionHeader';
import MovieCard from '../components/MovieCard';

const HERO_FALLBACK_URI =
  'https://image.tmdb.org/t/p/w1280/r2J02Z2OpNTctfOSN1Ydgii51I3.jpg';

const DEFAULT_TRAILERS =
  Array.isArray(TRAILERS) && TRAILERS.length > 0
    ? TRAILERS
    : [
        {
          id: 'tr-1',
          title: 'Official Trailer Preview',
          subtitle: 'QuickShow Cinema Showcase',
          youtubeId: 'nb_dikpE_-Y',
          thumb: HERO_FALLBACK_URI,
        },
      ];

function buildYoutubeEmbedHtml(videoId) {
  const safeId = String(videoId || 'nb_dikpE_-Y').replace(/[^a-zA-Z0-9_-]/g, '');
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; background: #090508; overflow: hidden; }
          iframe { width: 100%; height: 100%; border: 0; }
        </style>
      </head>
      <body>
        <iframe
          src="https://www.youtube-nocookie.com/embed/${safeId}?autoplay=1&playsinline=1&rel=0&modestbranding=1"
          title="Trailer Player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
      </body>
    </html>
  `;
}

export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { user } = useAuth();

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedTrailer, setSelectedTrailer] = useState(DEFAULT_TRAILERS[0]);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [playerSessionKey, setPlayerSessionKey] = useState(0);
  const [videoLoading, setVideoLoading] = useState(false);

  const horizontalPadding = 16;
  const gap = 12;
  const cardWidth = Math.max((width - horizontalPadding * 2 - gap) / 2, 140);

  const loadShows = useCallback(async (isPullRefresh = false) => {
    try {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await fetchAllShows();
      const rawList = Array.isArray(data?.shows) ? data.shows : [];

      if (rawList.length > 0) {
        const normalized = rawList.map(normalizeMovie).filter(Boolean);
        setMovies(normalized);
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
    loadShows(false);
  }, [loadShows]);

  const featuredMovie = movies[0] || normalizeMovie(MOVIES[0]);
  const heroUri =
    featuredMovie?.backdrop || featuredMovie?.poster || HERO_FALLBACK_URI;

  const openMovieDetails = (movie) => {
    if (!movie) return;
    navigation.navigate('Movies', {
      screen: 'MovieDetails',
      params: {
        movieId: movie.id,
        movie,
      },
    });
  };

  const goToAllMovies = () => {
    navigation.navigate('Movies', { screen: 'MoviesList' });
  };

  const handleSelectTrailer = (item) => {
    setSelectedTrailer(item);
    setIsPlayingTrailer(false);
    setVideoLoading(false);
    setPlayerSessionKey((k) => k + 1);
  };

  const handleStartTrailerPlay = () => {
    setIsPlayingTrailer(true);
    setVideoLoading(true);
    setPlayerSessionKey((k) => k + 1);
  };

  const openExternalYoutube = () => {
    const vid = selectedTrailer?.youtubeId;
    if (!vid) return;
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(vid)}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadShows(true)}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Brand Header */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brandText}>
              <Text style={styles.brandAccent}>Quick</Text>Show
            </Text>
            <Text style={styles.userSubText} numberOfLines={1}>
              {user ? `Hi, ${user.name}` : 'Guest Mode'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.searchPill}
            activeOpacity={0.8}
            onPress={goToAllMovies}
          >
            <Ionicons name="film-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.searchPillText}>Browse</Text>
          </TouchableOpacity>
        </View>

        {/* Static Hero Banner */}
        <View style={styles.heroWrapper}>
          <ImageBackground
            source={{ uri: heroUri }}
            style={styles.heroImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={[
                'rgba(9, 5, 8, 0.22)',
                'rgba(9, 5, 8, 0.75)',
                COLORS.bg,
              ]}
              style={styles.heroGradient}
            >
              <View style={styles.studioBadge}>
                <Text style={styles.studioBadgeText}>
                  {featuredMovie?.language || 'FEATURED'}
                </Text>
              </View>

              <Text style={styles.heroTitle} numberOfLines={2}>
                {featuredMovie?.title || 'QuickShow Cinema'}
              </Text>

              <Text style={styles.heroMeta} numberOfLines={1}>
                {featuredMovie?.genre} • {featuredMovie?.year} •{' '}
                {featuredMovie?.duration}
              </Text>

              <Text style={styles.heroDesc} numberOfLines={3}>
                {featuredMovie?.synopsis}
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={goToAllMovies}
                style={styles.exploreBtn}
              >
                <Text style={styles.exploreBtnText}>Explore Movies</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Now Showing Section */}
        <View style={styles.section}>
          <SectionHeader
            title="Now Showing"
            actionLabel="View All"
            onActionPress={goToAllMovies}
          />

          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loaderText}>Loading shows...</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  style={{ width: cardWidth }}
                  onPress={() => openMovieDetails(movie)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Trailers Section (Click-to-Play + Error-153-Free YouTube Embed) */}
        <View style={styles.section}>
          <SectionHeader title="Trailers" />

          <View style={styles.trailerPlayerCard}>
            {isPlayingTrailer ? (
              <>
                <WebView
                  key={`${selectedTrailer?.id}-${playerSessionKey}`}
                  source={{
                    html: buildYoutubeEmbedHtml(selectedTrailer?.youtubeId),
                    baseUrl: 'https://www.youtube-nocookie.com',
                  }}
                  originWhitelist={['*']}
                  style={styles.webviewBox}
                  javaScriptEnabled
                  domStorageEnabled
                  allowsInlineMediaPlayback
                  allowsFullscreenVideo
                  mediaPlaybackRequiresUserAction={false}
                  onLoadStart={() => setVideoLoading(true)}
                  onLoadEnd={() => setVideoLoading(false)}
                />

                {videoLoading ? (
                  <View style={styles.videoLoadingOverlay} pointerEvents="none">
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.videoLoadingText}>Starting video...</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleStartTrailerPlay}
                style={styles.previewPosterWrap}
              >
                <Image
                  source={{ uri: selectedTrailer?.thumb || HERO_FALLBACK_URI }}
                  style={styles.trailerMainImg}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(9, 5, 8, 0.12)', 'rgba(9, 5, 8, 0.88)']}
                  style={styles.trailerOverlay}
                >
                  <View style={styles.playCircle}>
                    <Ionicons name="play" size={24} color={COLORS.white} />
                  </View>
                  <Text style={styles.tapPlayHint}>Tap to Watch Trailer</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.trailerInfoBar}>
            <View style={styles.trailerTitleCol}>
              <Text style={styles.trailerActiveTitle} numberOfLines={1}>
                {selectedTrailer?.title}
              </Text>
              <Text style={styles.trailerActiveSub} numberOfLines={1}>
                {selectedTrailer?.subtitle}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={openExternalYoutube}
              style={styles.ytOpenBtn}
            >
              <Ionicons name="logo-youtube" size={15} color={COLORS.primary} />
              <Text style={styles.ytOpenBtnText}>YouTube</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trailerThumbRow}
          >
            {DEFAULT_TRAILERS.map((item) => {
              const active = item.id === selectedTrailer?.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  onPress={() => handleSelectTrailer(item)}
                  style={[
                    styles.trailerThumbCard,
                    active && styles.trailerThumbActive,
                  ]}
                >
                  <Image
                    source={{ uri: item.thumb }}
                    style={styles.trailerThumbImg}
                    resizeMode="cover"
                  />
                  <View style={styles.thumbPlayBadge}>
                    <Ionicons
                      name={active && isPlayingTrailer ? 'volume-high' : 'play'}
                      size={12}
                      color={COLORS.white}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.brandText}>
            <Text style={styles.brandAccent}>Quick</Text>Show
          </Text>
          <Text style={styles.footerDesc}>
            Step into a world where stories come alive. Discover endless
            entertainment with the latest movies, timeless classics, and
            exclusive content—all in one place.
          </Text>
          <Text style={styles.copyright}>
            Copyright 2026. All Right Reserved. ©Sidharth
          </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.bg,
  },
  brandText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  brandAccent: {
    color: COLORS.primary,
  },
  userSubText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  searchPillText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  heroWrapper: {
    width: '100%',
    minHeight: 340,
  },
  heroImage: {
    width: '100%',
    minHeight: 340,
  },
  heroGradient: {
    flex: 1,
    minHeight: 340,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 22,
  },
  studioBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  studioBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 35,
    marginBottom: 6,
  },
  heroMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  heroDesc: {
    color: '#D4D4DF',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 14,
  },
  exploreBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  exploreBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 22,
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
  trailerPlayerCard: {
    width: '100%',
    height: 205,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
    position: 'relative',
  },
  previewPosterWrap: {
    width: '100%',
    height: '100%',
  },
  trailerMainImg: {
    width: '100%',
    height: '100%',
  },
  trailerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  playCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(244, 63, 94, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  tapPlayHint: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    backgroundColor: 'rgba(9, 5, 8, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  webviewBox: {
    flex: 1,
    backgroundColor: '#090508',
  },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 5, 8, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  videoLoadingText: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  trailerInfoBar: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  trailerTitleCol: {
    flex: 1,
  },
  trailerActiveTitle: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: '700',
  },
  trailerActiveSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  ytOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  ytOpenBtnText: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '700',
  },
  trailerThumbRow: {
    gap: 10,
    marginTop: 12,
    paddingRight: 4,
  },
  trailerThumbCard: {
    width: 116,
    height: 68,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    position: 'relative',
  },
  trailerThumbActive: {
    borderColor: COLORS.primary,
  },
  trailerThumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbPlayBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(9, 5, 8, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 30,
    paddingTop: 22,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  footerDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  copyright: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 14,
    textAlign: 'center',
  },
});