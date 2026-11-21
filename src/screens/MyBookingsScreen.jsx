import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { fetchUserBookings, getTmdbImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';

function formatBookingShowTime(show) {
  if (!show?.showDateTime) return 'Upcoming Show';
  const d = new Date(show.showDateTime);
  if (Number.isNaN(d.getTime())) return 'Upcoming Show';
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDurationMinutes(runtime) {
  const mins = Number(runtime);
  if (!mins || Number.isNaN(mins)) return '2h 0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function normalizeBackendBooking(b, idx) {
  const movie = b?.show?.movie || {};
  const seats = Array.isArray(b?.bookedSeats)
    ? b.bookedSeats
    : Array.isArray(b?.seats)
      ? b.seats
      : [];

  return {
    id: String(b?._id || b?.id || `api-bk-${idx}`),
    movieTitle: movie.title || b?.movieTitle || 'Movie Ticket',
    duration: formatDurationMinutes(movie.runtime) || b?.duration || '2h 0m',
    showTimeLabel: b?.showTimeLabel || formatBookingShowTime(b?.show),
    amount: Number(b?.amount ?? 0),
    seats,
    poster:
      getTmdbImageUrl(movie.poster_path, 'w500') ||
      b?.poster ||
      'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
  };
}

function buildQrMatrix(seedStr, size = 11) {
  let hash = 2166136261;
  const input = String(seedStr || 'QUICKSKOW-PASS');
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const grid = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      // Corner finder pattern squares (top-left, top-right, bottom-left)
      const inTopLeft = r < 3 && c < 3;
      const inTopRight = r < 3 && c >= size - 3;
      const inBottomLeft = r >= size - 3 && c < 3;

      if (inTopLeft || inTopRight || inBottomLeft) {
        const isBorder =
          r === 0 ||
          r === 2 ||
          r === size - 3 ||
          r === size - 1 ||
          c === 0 ||
          c === 2 ||
          c === size - 3 ||
          c === size - 1;
        const isCenter =
          (r === 1 && c === 1) ||
          (r === 1 && c === size - 2) ||
          (r === size - 2 && c === 1);
        row.push(isBorder || isCenter ? 1 : 0);
      } else {
        const bit = ((hash >>> ((r * size + c) % 24)) ^ (r * 7 + c * 13)) & 1;
        row.push(bit === 1 ? 1 : 0);
      }
    }
    grid.push(row);
  }
  return grid;
}

function FakeQrCodeBox({ seed }) {
  const matrix = useMemo(() => buildQrMatrix(seed, 11), [seed]);

  return (
    <View style={styles.qrOuterFrame}>
      <View style={styles.qrGrid}>
        {matrix.map((row, rIdx) => (
          <View key={rIdx} style={styles.qrRow}>
            {row.map((cell, cIdx) => (
              <View
                key={cIdx}
                style={[
                  styles.qrCell,
                  cell === 1 ? styles.qrCellDark : styles.qrCellLight,
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function TicketPassModal({ ticket, guestName, onClose }) {
  if (!ticket) return null;

  const qrSeed = `${ticket.id}|${ticket.movieTitle}|${(ticket.seats || []).join(',')}|${ticket.showTimeLabel}`;

  return (
    <Modal
      visible={Boolean(ticket)}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.passBackdrop}>
        <View style={styles.passCard}>
          <View style={styles.passHeader}>
            <View>
              <Text style={styles.passBrand}>
                <Text style={styles.brandAccent}>Quick</Text>Show Pass
              </Text>
              <Text style={styles.passSub}>Confirmed • Show at Entrance</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.passCloseBtn}>
              <Ionicons name="close" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.passMovieRow}>
            <Image
              source={{ uri: ticket.poster }}
              style={styles.passPoster}
              resizeMode="cover"
            />
            <View style={styles.passMovieInfo}>
              <Text style={styles.passMovieTitle} numberOfLines={2}>
                {ticket.movieTitle}
              </Text>
              <Text style={styles.passMeta}>{ticket.duration}</Text>
              <Text style={styles.passTime}>{ticket.showTimeLabel}</Text>
            </View>
          </View>

          <View style={styles.passDividerRow}>
            <View style={styles.passNotchLeft} />
            <View style={styles.passDashedLine} />
            <View style={styles.passNotchRight} />
          </View>

          <View style={styles.passMetaGrid}>
            <View style={styles.passCell}>
              <Text style={styles.passLabel}>SEATS</Text>
              <Text style={styles.passValue} numberOfLines={1}>
                {(ticket.seats || []).join(', ') || 'C1'}
              </Text>
            </View>
            <View style={styles.passCell}>
              <Text style={styles.passLabel}>TICKETS</Text>
              <Text style={styles.passValue}>{ticket.seats?.length || 1}</Text>
            </View>
            <View style={styles.passCell}>
              <Text style={styles.passLabel}>AMOUNT</Text>
              <Text style={styles.passValue}>₹{ticket.amount}</Text>
            </View>
          </View>

          <View style={styles.qrSection}>
            <FakeQrCodeBox seed={qrSeed} />
            <Text style={styles.qrCodeLabel} numberOfLines={1}>
              PASS ID: {String(ticket.id).toUpperCase()}
            </Text>
            <Text style={styles.qrGuestText} numberOfLines={1}>
              Guest: {guestName || 'QuickShow User'}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onClose}
            style={styles.passDoneBtn}
          >
            <Text style={styles.passDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function MyBookingsScreen({
  navigation,
  bookings = [],
  favorites = [],
  onToggleFavorite,
}) {
  const { user, userId, loginUser, logoutUser, useDemoUser } = useAuth();

  const [activeSubView, setActiveSubView] = useState('bookings');
  const [selectedPassTicket, setSelectedPassTicket] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [apiBookings, setApiBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = useCallback(
    async (isPull = false) => {
      try {
        if (isPull) setRefreshing(true);
        else setLoading(true);

        const res = await fetchUserBookings(userId);
        if (res?.success && Array.isArray(res?.bookings)) {
          setApiBookings(res.bookings.map(normalizeBackendBooking));
        }
      } catch (err) {
        // Keep local/session bookings smoothly
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useFocusEffect(
    useCallback(() => {
      loadBookings(false);
    }, [loadBookings])
  );

  const handleLoginSubmit = () => {
    loginUser({
      name: nameInput.trim() || 'QuickShow User',
      email: emailInput.trim() || 'user@quickshow.app',
    });
    setNameInput('');
    setEmailInput('');
  };

  const combinedBookings = [...bookings];
  const existingIds = new Set(combinedBookings.map((item) => String(item.id)));
  for (const item of apiBookings) {
    if (!existingIds.has(String(item.id))) {
      combinedBookings.push(item);
      existingIds.add(String(item.id));
    }
  }

  const openFavoriteMovie = (movie) => {
    navigation.navigate('Movies', {
      screen: 'MovieDetails',
      params: { movieId: movie.id, movie },
    });
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
            onRefresh={() => loadBookings(true)}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.topBar}>
          <Text style={styles.brandText}>
            <Text style={styles.brandAccent}>Quick</Text>Show
          </Text>
        </View>

        {/* Normal Auth / Profile Card */}
        <View style={styles.authCard}>
          {user ? (
            <View style={styles.profileRow}>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {user.name}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={logoutUser}
                style={styles.outlineBtn}
              >
                <Text style={styles.outlineBtnText}>Switch / Logout</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.loginHeading}>Quick Sign In (Normal Auth)</Text>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Your Name"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
              />
              <TextInput
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="Email (optional)"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
              <View style={styles.loginBtnRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleLoginSubmit}
                  style={styles.primarySmallBtn}
                >
                  <Text style={styles.primarySmallText}>Continue</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={useDemoUser}
                  style={styles.outlineBtn}
                >
                  <Text style={styles.outlineBtnText}>Use Demo User</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Switcher: My Bookings vs Favorites */}
        <View style={styles.segmentRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveSubView('bookings')}
            style={[
              styles.segmentBtn,
              activeSubView === 'bookings' && styles.segmentBtnActive,
            ]}
          >
            <Ionicons
              name={
                activeSubView === 'bookings' ? 'ticket' : 'ticket-outline'
              }
              size={15}
              color={
                activeSubView === 'bookings' ? COLORS.white : COLORS.textMuted
              }
            />
            <Text
              style={[
                styles.segmentText,
                activeSubView === 'bookings' && styles.segmentTextActive,
              ]}
            >
              My Bookings ({combinedBookings.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveSubView('favorites')}
            style={[
              styles.segmentBtn,
              activeSubView === 'favorites' && styles.segmentBtnActive,
            ]}
          >
            <Ionicons
              name={
                activeSubView === 'favorites' ? 'heart' : 'heart-outline'
              }
              size={15}
              color={
                activeSubView === 'favorites' ? COLORS.white : COLORS.textMuted
              }
            />
            <Text
              style={[
                styles.segmentText,
                activeSubView === 'favorites' && styles.segmentTextActive,
              ]}
            >
              Favorites ({favorites.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeSubView === 'bookings' ? (
          <>
            <View style={styles.titleHelperRow}>
              <Text style={styles.pageTitleNoPad}>My Bookings</Text>
              <Text style={styles.helperCaption}>Tap pass for QR</Text>
            </View>

            {loading && combinedBookings.length === 0 ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loaderText}>Loading bookings...</Text>
              </View>
            ) : combinedBookings.length === 0 ? (
              <Text style={styles.emptyText}>No bookings yet.</Text>
            ) : (
              <View style={styles.list}>
                {combinedBookings.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.86}
                    onPress={() => setSelectedPassTicket(item)}
                    style={styles.ticketCard}
                  >
                    <Image
                      source={{ uri: item.poster }}
                      style={styles.poster}
                      resizeMode="cover"
                    />

                    <View style={styles.midCol}>
                      <Text style={styles.movieTitle} numberOfLines={1}>
                        {item.movieTitle}
                      </Text>
                      <Text style={styles.metaText}>{item.duration}</Text>
                      <Text style={styles.timeText}>{item.showTimeLabel}</Text>
                    </View>

                    <View style={styles.rightCol}>
                      <Text style={styles.priceText}>₹{item.amount}</Text>
                      <Text style={styles.ticketCount}>
                        Total Tickets : {item.seats?.length || 0}
                      </Text>
                      <Text style={styles.seatLine} numberOfLines={1}>
                        Seat Number : {(item.seats || []).join(', ')}
                      </Text>
                      <View style={styles.qrBadgeMini}>
                        <Ionicons
                          name="qr-code-outline"
                          size={11}
                          color={COLORS.primary}
                        />
                        <Text style={styles.qrBadgeMiniText}>View Pass</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.pageTitle}>Favorite Movies</Text>

            {favorites.length === 0 ? (
              <View style={styles.favEmptyCard}>
                <Ionicons
                  name="heart-outline"
                  size={22}
                  color={COLORS.textMuted}
                />
                <Text style={styles.favEmptyText}>
                  No favorite movies yet. Open any movie and tap the heart icon to
                  save it here.
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {favorites.map((favMovie) => (
                  <TouchableOpacity
                    key={favMovie.id}
                    activeOpacity={0.85}
                    onPress={() => openFavoriteMovie(favMovie)}
                    style={styles.favCard}
                  >
                    <Image
                      source={{ uri: favMovie.poster }}
                      style={styles.favPoster}
                      resizeMode="cover"
                    />

                    <View style={styles.midCol}>
                      <Text style={styles.movieTitle} numberOfLines={1}>
                        {favMovie.title}
                      </Text>
                      <Text style={styles.metaText} numberOfLines={1}>
                        {favMovie.year} • {favMovie.genre} • {favMovie.duration}
                      </Text>
                      <View style={styles.ratingRow}>
                        <Ionicons
                          name="star"
                          size={12}
                          color={COLORS.primary}
                        />
                        <Text style={styles.ratingText}>
                          {Number(favMovie.rating || 7.5).toFixed(1)}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        typeof onToggleFavorite === 'function' &&
                        onToggleFavorite(favMovie)
                      }
                      style={styles.removeFavBtn}
                    >
                      <Ionicons
                        name="heart"
                        size={19}
                        color={COLORS.primary}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <TicketPassModal
        ticket={selectedPassTicket}
        guestName={user?.name}
        onClose={() => setSelectedPassTicket(null)}
      />
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
  authCard: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: '700',
  },
  profileEmail: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  loginHeading: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 12.5,
    marginBottom: 8,
  },
  loginBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  primarySmallBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primarySmallText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  outlineBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  outlineBtnText: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 4,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  titleHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 14,
  },
  pageTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 14,
  },
  pageTitleNoPad: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  helperCaption: {
    color: COLORS.textMuted,
    fontSize: 11,
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
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.roseCard,
    borderWidth: 1,
    borderColor: COLORS.roseBorder,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  poster: {
    width: 78,
    height: 56,
    borderRadius: 7,
    backgroundColor: COLORS.card,
  },
  midCol: {
    flex: 1,
  },
  movieTitle: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: '700',
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  timeText: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    marginTop: 4,
  },
  rightCol: {
    alignItems: 'flex-end',
    maxWidth: '34%',
  },
  priceText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  ticketCount: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    marginTop: 3,
  },
  seatLine: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  qrBadgeMini: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  qrBadgeMiniText: {
    color: COLORS.text,
    fontSize: 9.5,
    fontWeight: '700',
  },
  favEmptyCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  favEmptyText: {
    color: COLORS.textMuted,
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  favCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  favPoster: {
    width: 54,
    height: 72,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  ratingText: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  removeFavBtn: {
    padding: 8,
  },
  passBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 18,
  },
  passCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  passBrand: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  passSub: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  passCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passMovieRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  passPoster: {
    width: 66,
    height: 86,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  passMovieInfo: {
    flex: 1,
  },
  passMovieTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  passMeta: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    marginTop: 3,
  },
  passTime: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  passDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  passNotchLeft: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.bg,
    marginLeft: -23,
  },
  passNotchRight: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.bg,
    marginRight: -23,
  },
  passDashedLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  passMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  passCell: {
    flex: 1,
    alignItems: 'center',
  },
  passLabel: {
    color: COLORS.textMuted,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  passValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  qrSection: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  qrOuterFrame: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: COLORS.white,
  },
  qrGrid: {
    gap: 2,
  },
  qrRow: {
    flexDirection: 'row',
    gap: 2,
  },
  qrCell: {
    width: 11,
    height: 11,
    borderRadius: 1.5,
  },
  qrCellDark: {
    backgroundColor: '#090508',
  },
  qrCellLight: {
    backgroundColor: '#FFFFFF',
  },
  qrCodeLabel: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  qrGuestText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  passDoneBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  passDoneText: {
    color: COLORS.white,
    fontSize: 13.5,
    fontWeight: '700',
  },
});