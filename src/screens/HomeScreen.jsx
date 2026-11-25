import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { COLORS } from '../theme/colors';
import { MOVIES, TRAILERS } from '../data/mockMovies';
import { fetchAllShows } from '../services/api';
import { normalizeMovie } from '../utils/movieAdapter';
import { useAuth, USER_ICON_OPTIONS } from '../context/AuthContext';
import SectionHeader from '../components/SectionHeader';
import MovieCard from '../components/MovieCard';
import CinemaFooter from '../components/CinemaFooter';

const HERO_FALLBACK_URI =
  'https://image.tmdb.org/t/p/w1280/r2J02Z2OpNTctfOSN1Ydgii51I3.jpg';

const INITIAL_VISIBLE_COUNT = 4;
const LOAD_MORE_STEP = 4;

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

// YouTube-style smooth animated shimmer block
function ShimmerBlock({ pulseAnim, style }) {
  const opacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.38, 0.85, 0.38],
  });

  return <Animated.View style={[styles.shimmerBase, { opacity }, style]} />;
}

// 2-column MovieCard skeleton matching card width & layout
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

export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const {
    user,
    userId,
    avatarIcon,
    loginUser,
    updateProfile,
    logoutUser,
    useDemoUser,
  } = useAuth();

  const [movies, setMovies] = useState([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedTrailer, setSelectedTrailer] = useState(DEFAULT_TRAILERS[0]);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [playerSessionKey, setPlayerSessionKey] = useState(0);
  const [videoLoading, setVideoLoading] = useState(false);

  const [profilePopoverVisible, setProfilePopoverVisible] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftIcon, setDraftIcon] = useState(avatarIcon || 'person');

  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const loadMoreTimerRef = useRef(null);

  const horizontalPadding = 16;
  const gap = 12;
  const cardWidth = Math.max((width - horizontalPadding * 2 - gap) / 2, 140);

  // Continuous YouTube-style skeleton shimmer loop
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
      if (loadMoreTimerRef.current) {
        clearTimeout(loadMoreTimerRef.current);
      }
    };
  }, [shimmerAnim]);

  useEffect(() => {
    setDraftName(user?.name || '');
    setDraftEmail(user?.email || '');
    setDraftIcon(user?.avatarIcon || avatarIcon || 'person');
  }, [user, avatarIcon, profilePopoverVisible]);

  const loadShows = useCallback(async (isPullRefresh = false) => {
    try {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await fetchAllShows();
      const rawList = Array.isArray(data?.shows) ? data.shows : [];

      const normalizedList =
        rawList.length > 0
          ? rawList.map(normalizeMovie).filter(Boolean)
          : MOVIES.map(normalizeMovie);

      setMovies(normalizedList);
      setVisibleCount(Math.min(INITIAL_VISIBLE_COUNT, normalizedList.length));
    } catch (err) {
      const fallbackList = MOVIES.map(normalizeMovie);
      setMovies(fallbackList);
      setVisibleCount(Math.min(INITIAL_VISIBLE_COUNT, fallbackList.length));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadShows(false);
  }, [loadShows]);

  const visibleMovies = useMemo(
    () => movies.slice(0, visibleCount),
    [movies, visibleCount]
  );

  const hasMoreMovies = visibleCount < movies.length;

  const handleLoadMoreMovies = useCallback(() => {
    if (loading || loadingMore || !hasMoreMovies) return;

    setLoadingMore(true);
    if (loadMoreTimerRef.current) {
      clearTimeout(loadMoreTimerRef.current);
    }

    loadMoreTimerRef.current = setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + LOAD_MORE_STEP, movies.length));
      setLoadingMore(false);
    }, 260);
  }, [loading, loadingMore, hasMoreMovies, movies.length]);

  const handleScroll = useCallback(
    (event) => {
      if (!hasMoreMovies || loading || loadingMore) return;
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (layoutMeasurement.height + contentOffset.y);

      if (distanceFromBottom < 260) {
        handleLoadMoreMovies();
      }
    },
    [hasMoreMovies, loading, loadingMore, handleLoadMoreMovies]
  );

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

  const goToBookings = () => {
    navigation.navigate('MyBookings');
  };

  const goToTheaters = () => {
    navigation.navigate('Theaters');
  };

  const handleOpenProfilePopover = () => {
    setIsEditingProfile(false);
    setDraftName(user?.name || '');
    setDraftEmail(user?.email || '');
    setDraftIcon(user?.avatarIcon || avatarIcon || 'person');
    setProfilePopoverVisible(true);
  };

  const handleSaveProfile = () => {
    const cleanName = draftName.trim();
    const cleanEmail = draftEmail.trim();

    if (!user) {
      loginUser({
        name: cleanName || 'QuickShow User',
        email: cleanEmail || 'user@quickshow.app',
        avatarIcon: draftIcon,
        isLoggedIn: true,
      });
    } else if (typeof updateProfile === 'function') {
      updateProfile({
        name: cleanName || user.name,
        email: cleanEmail || user.email,
        avatarIcon: draftIcon,
      });
    }
    setIsEditingProfile(false);
  };

  const handleLogoutFromPopover = () => {
    setProfilePopoverVisible(false);
    setIsEditingProfile(false);
    if (typeof logoutUser === 'function') {
      logoutUser();
    }
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
        onScroll={handleScroll}
        scrollEventThrottle={180}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadShows(true)}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Brand Header + Top-Right User Icon */}
        <View style={styles.topBar}>
          <View style={styles.brandLeftCol}>
            <Text style={styles.brandText}>
              <Text style={styles.brandAccent}>Quick</Text>Show
            </Text>
            <Text style={styles.userSubText} numberOfLines={1}>
              {user ? `Hi, ${user.name}` : 'Guest Mode'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.userPill}
            activeOpacity={0.82}
            onPress={handleOpenProfilePopover}
            accessibilityLabel="User profile and edit"
          >
            <View style={styles.userAvatarBadge}>
              <Ionicons
                name={user ? avatarIcon || 'person' : 'person-outline'}
                size={15}
                color={COLORS.white}
              />
            </View>
            <Text style={styles.userPillText} numberOfLines={1}>
              {user?.name ? user.name.split(' ')[0] : 'Profile'}
            </Text>
            <Ionicons
              name="chevron-down"
              size={13}
              color={COLORS.textSecondary}
              style={styles.userChevron}
            />
          </TouchableOpacity>
        </View>

        {/* Hero Banner (YouTube-style Skeleton while loading) */}
        {loading ? (
          <View style={styles.heroSkeletonWrap}>
            <ShimmerBlock pulseAnim={shimmerAnim} style={styles.heroSkeletonBg} />
            <View style={styles.heroSkeletonContent}>
              <ShimmerBlock pulseAnim={shimmerAnim} style={styles.heroSkeletonBadge} />
              <ShimmerBlock pulseAnim={shimmerAnim} style={styles.heroSkeletonTitle} />
              <ShimmerBlock pulseAnim={shimmerAnim} style={styles.heroSkeletonMeta} />
              <ShimmerBlock pulseAnim={shimmerAnim} style={styles.heroSkeletonBtn} />
            </View>
          </View>
        ) : (
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
        )}

        {/* Now Showing Section with YouTube Shimmer Skeleton + Lazy Loading */}
        <View style={styles.section}>
          <SectionHeader
            title="Now Showing"
            actionLabel="View All"
            onActionPress={goToAllMovies}
          />

          {loading ? (
            <View style={styles.grid}>
              {[0, 1, 2, 3].map((idx) => (
                <MovieCardSkeleton
                  key={`skel-${idx}`}
                  width={cardWidth}
                  pulseAnim={shimmerAnim}
                />
              ))}
            </View>
          ) : (
            <>
              <View style={styles.grid}>
                {visibleMovies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    style={{ width: cardWidth }}
                    onPress={() => openMovieDetails(movie)}
                  />
                ))}
              </View>

              {loadingMore ? (
                <View style={styles.grid}>
                  {[0, 1].map((idx) => (
                    <MovieCardSkeleton
                      key={`lazy-skel-${idx}`}
                      width={cardWidth}
                      pulseAnim={shimmerAnim}
                    />
                  ))}
                </View>
              ) : null}

              {hasMoreMovies && !loadingMore ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleLoadMoreMovies}
                  style={styles.loadMoreBtn}
                >
                  <Text style={styles.loadMoreText}>
                    Load More Shows ({movies.length - visibleCount} more)
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

        {/* Upgraded Cinema Footer */}
        <CinemaFooter
          onExploreMovies={goToAllMovies}
          onOpenBookings={goToBookings}
          onOpenTheaters={goToTheaters}
        />
      </ScrollView>

      {/* Apple-Style Compact Floating User Popover */}
      <Modal
        visible={profilePopoverVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfilePopoverVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setProfilePopoverVisible(false)}
          style={styles.popoverBackdrop}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.popoverPositioner}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}}
              style={styles.appleFloatingCard}
            >
              <View style={styles.popoverHeader}>
                <View style={styles.popoverIdentity}>
                  <View style={styles.popoverAvatarCircle}>
                    <Ionicons
                      name={
                        isEditingProfile
                          ? draftIcon
                          : user
                            ? avatarIcon || 'person'
                            : 'person-outline'
                      }
                      size={19}
                      color={COLORS.white}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.popoverName} numberOfLines={1}>
                      {user?.name || 'Guest User'}
                    </Text>
                    <Text style={styles.popoverEmail} numberOfLines={1}>
                      {user?.email || 'Tap Edit to set profile'}
                    </Text>
                  </View>
                </View>

                <View style={styles.popoverTopActions}>
                  {!isEditingProfile ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setIsEditingProfile(true)}
                      style={styles.editBtn}
                    >
                      <Ionicons
                        name="create-outline"
                        size={13}
                        color={COLORS.primary}
                      />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setProfilePopoverVisible(false)}
                    style={styles.closeBtn}
                  >
                    <Ionicons
                      name="close"
                      size={16}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.popoverDivider} />

              {!isEditingProfile ? (
                <View style={styles.infoList}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Name</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {user?.name || 'Not signed in'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {user?.email || '—'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>User ID</Text>
                    <Text style={styles.infoValueMuted} numberOfLines={1}>
                      {userId}
                    </Text>
                  </View>

                  {!user ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        useDemoUser();
                        setIsEditingProfile(false);
                      }}
                      style={styles.restoreDemoBtn}
                    >
                      <Text style={styles.restoreDemoText}>
                        Use Demo Profile
                      </Text>
                    </TouchableOpacity>
                  ) : typeof logoutUser === 'function' ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleLogoutFromPopover}
                      style={styles.logoutSmallBtn}
                    >
                      <Ionicons
                        name="log-out-outline"
                        size={14}
                        color="#FDA4AF"
                      />
                      <Text style={styles.logoutSmallText}>Log Out</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <View style={styles.editForm}>
                  <Text style={styles.fieldLabel}>User Icon</Text>
                  <View style={styles.iconRow}>
                    {USER_ICON_OPTIONS.map((iconName) => {
                      const selected = draftIcon === iconName;
                      return (
                        <TouchableOpacity
                          key={iconName}
                          activeOpacity={0.8}
                          onPress={() => setDraftIcon(iconName)}
                          style={[
                            styles.iconChoice,
                            selected && styles.iconChoiceActive,
                          ]}
                        >
                          <Ionicons
                            name={iconName}
                            size={16}
                            color={
                              selected ? COLORS.white : COLORS.textSecondary
                            }
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.fieldLabel}>Full Name</Text>
                  <TextInput
                    value={draftName}
                    onChangeText={setDraftName}
                    placeholder="Your Name"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.popoverInput}
                  />

                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    value={draftEmail}
                    onChangeText={setDraftEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.popoverInput}
                  />

                  <View style={styles.editFooterRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        setDraftName(user?.name || '');
                        setDraftEmail(user?.email || '');
                        setDraftIcon(user?.avatarIcon || avatarIcon || 'person');
                        setIsEditingProfile(false);
                      }}
                      style={styles.cancelSmallBtn}
                    >
                      <Text style={styles.cancelSmallText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleSaveProfile}
                      style={styles.saveSmallBtn}
                    >
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={COLORS.white}
                      />
                      <Text style={styles.saveSmallText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
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
    paddingBottom: 104,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.bg,
  },
  brandLeftCol: {
    flex: 1,
    minWidth: 0,
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
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingLeft: 5,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: 999,
    maxWidth: 162,
    overflow: 'hidden',
  },
  userAvatarBadge: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userPillText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
    includeFontPadding: false,
  },
  userChevron: {
    flexShrink: 0,
    marginTop: 1,
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
  shimmerBase: {
    backgroundColor: '#27202A',
    borderRadius: 8,
  },
  heroSkeletonWrap: {
    width: '100%',
    minHeight: 320,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroSkeletonBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  heroSkeletonContent: {
    paddingHorizontal: 16,
    paddingBottom: 22,
    gap: 10,
  },
  heroSkeletonBadge: {
    width: 82,
    height: 20,
    borderRadius: 6,
  },
  heroSkeletonTitle: {
    width: '74%',
    height: 30,
    borderRadius: 8,
  },
  heroSkeletonMeta: {
    width: '54%',
    height: 14,
    borderRadius: 6,
  },
  heroSkeletonBtn: {
    width: 138,
    height: 38,
    borderRadius: 999,
    marginTop: 4,
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
  popoverBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 58,
    paddingHorizontal: 14,
  },
  popoverPositioner: {
    width: '100%',
    alignItems: 'flex-end',
  },
  appleFloatingCard: {
    width: '100%',
    maxWidth: 326,
    borderRadius: 22,
    backgroundColor: 'rgba(24, 16, 21, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 20,
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  popoverIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  popoverAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popoverName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  popoverEmail: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  popoverTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 63, 94, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
  },
  editBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popoverDivider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 11,
  },
  infoList: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    fontWeight: '600',
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    maxWidth: '72%',
  },
  infoValueMuted: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    maxWidth: '72%',
  },
  restoreDemoBtn: {
    marginTop: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  restoreDemoText: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '700',
  },
  logoutSmallBtn: {
    marginTop: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  logoutSmallText: {
    color: '#FDA4AF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  editForm: {
    gap: 6,
  },
  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 2,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginVertical: 3,
  },
  iconChoice: {
    width: 38,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChoiceActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  popoverInput: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: COLORS.text,
    fontSize: 12,
  },
  editFooterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  cancelSmallBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  cancelSmallText: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '700',
  },
  saveSmallBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  saveSmallText: {
    color: COLORS.white,
    fontSize: 11.5,
    fontWeight: '700',
  },
});