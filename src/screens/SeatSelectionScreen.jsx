import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Vibration,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { MOVIES } from '../data/mockMovies';
import { fetchOccupiedSeats } from '../services/api';

const MAX_SEATS = 5;

const TIERS = [
  {
    key: 'classic',
    title: 'Classic',
    sub: '1st Tier • Lowest (Front)',
    multiplier: 1,
    color: '#38BDF8',
    rows: [
      { row: 'A', left: ['A1', 'A2', 'A3', 'A4'], right: ['A5', 'A6', 'A7', 'A8'] },
      { row: 'B', left: ['B1', 'B2', 'B3', 'B4'], right: ['B5', 'B6', 'B7', 'B8'] },
    ],
  },
  {
    key: 'prime',
    title: 'Prime',
    sub: 'Middle Tier',
    multiplier: 1.3,
    color: '#A855F7',
    rows: [
      { row: 'C', left: ['C1', 'C2', 'C3', 'C4'], right: ['C5', 'C6', 'C7', 'C8'] },
      { row: 'D', left: ['D1', 'D2', 'D3', 'D4'], right: ['D5', 'D6', 'D7', 'D8'] },
    ],
  },
  {
    key: 'royal',
    title: 'Royal VIP',
    sub: 'Last Tier • Upper Premium',
    multiplier: 1.6,
    color: '#F59E0B',
    rows: [
      { row: 'E', left: ['E1', 'E2', 'E3', 'E4'], right: ['E5', 'E6', 'E7', 'E8'] },
      { row: 'F', left: ['F1', 'F2', 'F3', 'F4'], right: ['F5', 'F6', 'F7', 'F8'] },
    ],
  },
];

function triggerSubtleTap(ms = 7) {
  try {
    Vibration.vibrate(ms);
  } catch (_) {}
}

function normalizeSeat(code) {
  return String(code || '').trim().toUpperCase();
}

function normalizeKeyPart(val) {
  return String(val || '').trim().toLowerCase();
}

function calcTierRate(basePrice, multiplier) {
  const base = Math.max(Number(basePrice) || 250, 50);
  if (multiplier === 1) return Math.round(base);
  return Math.max(Math.round((base * multiplier) / 10) * 10, base);
}

export default function SeatSelectionScreen({
  route,
  navigation,
  bookings = [],
  cancelledMap = {},
}) {
  const { width } = useWindowDimensions();
  const params = route?.params || {};
  const movie = params.movie || MOVIES[0];
  const selectedDate = params.selectedDate || '21 Nov';

  const routeBookings = useMemo(
    () => (Array.isArray(params.bookings) ? params.bookings : []),
    [params.bookings]
  );

  const allBookings = useMemo(
    () => [...(Array.isArray(bookings) ? bookings : []), ...routeBookings],
    [bookings, routeBookings]
  );

  const basePrice = useMemo(
    () => Number(movie?.pricePerSeat || movie?.showPrice || 250),
    [movie]
  );

  const seatPriceMap = useMemo(() => {
    const map = {};
    TIERS.forEach((tier) => {
      const rate = calcTierRate(basePrice, tier.multiplier);
      tier.rows.forEach((r) => {
        [...r.left, ...r.right].forEach((code) => {
          map[code] = {
            tierTitle: tier.title,
            price: rate,
            color: tier.color,
          };
        });
      });
    });
    return map;
  }, [basePrice]);

  const timingSlots = useMemo(() => {
    if (Array.isArray(params.timingSlots) && params.timingSlots.length > 0) {
      return params.timingSlots;
    }
    const fallbackTimes = movie.timings || ['12:50 PM', '04:15 PM', '07:45 PM'];
    return fallbackTimes.map((t, idx) => ({
      label: t,
      showId: params.initialShowId || `${movie.id}-show-${idx}`,
    }));
  }, [params.timingSlots, params.initialShowId, movie]);

  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [backendOccupiedSeats, setBackendOccupiedSeats] = useState(
    Array.isArray(movie.bookedSeats) ? movie.bookedSeats : []
  );
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [limitNotice, setLimitNotice] = useState('');

  const currentSlot = timingSlots[selectedSlotIndex] || timingSlots[0];
  const activeShowId = currentSlot?.showId;
  const currentSlotLabel = currentSlot?.label || '12:50 PM';

  const loadBackendSeats = useCallback(async () => {
    if (!activeShowId || String(activeShowId).includes('-show-')) {
      setBackendOccupiedSeats(
        Array.isArray(movie.bookedSeats) ? movie.bookedSeats : []
      );
      return;
    }

    setLoadingSeats(true);
    try {
      const res = await fetchOccupiedSeats(activeShowId);
      if (Array.isArray(res?.occupiedSeats)) {
        setBackendOccupiedSeats(res.occupiedSeats);
      } else {
        setBackendOccupiedSeats(
          Array.isArray(movie.bookedSeats) ? movie.bookedSeats : []
        );
      }
    } catch (_) {
      setBackendOccupiedSeats(
        Array.isArray(movie.bookedSeats) ? movie.bookedSeats : []
      );
    } finally {
      setLoadingSeats(false);
    }
  }, [activeShowId, movie.bookedSeats]);

  useEffect(() => {
    setSelectedSeats([]);
    setLimitNotice('');
    loadBackendSeats();
  }, [activeShowId, loadBackendSeats]);

  useFocusEffect(
    useCallback(() => {
      loadBackendSeats();
    }, [loadBackendSeats])
  );

  // Collect all seats booked in confirmed/active bookings for this movie, date & timing
  const userBookedSeatsForShow = useMemo(() => {
    const targetMovieId = normalizeKeyPart(movie?.id || movie?._id);
    const targetMovieTitle = normalizeKeyPart(movie?.title);
    const targetDate = normalizeKeyPart(selectedDate);
    const targetTime = normalizeKeyPart(currentSlotLabel);
    const targetShowId = normalizeKeyPart(activeShowId);

    const collected = [];

    allBookings.forEach((bk, idx) => {
      if (!bk || typeof bk !== 'object') return;

      const bookingId = bk.id || bk._id || bk.bookingId || `bk-${idx}`;
      const isCancelled =
        Boolean(cancelledMap?.[bookingId]) ||
        normalizeKeyPart(bk.status) === 'cancelled' ||
        normalizeKeyPart(bk.paymentStatus) === 'cancelled';

      if (isCancelled) return;

      const bkMovieId = normalizeKeyPart(
        bk.movieId || bk.movie?.id || bk.movie?._id
      );
      const bkMovieTitle = normalizeKeyPart(
        bk.movieTitle || bk.title || bk.movie?.title
      );
      const bkShowId = normalizeKeyPart(bk.showId);
      const bkDate = normalizeKeyPart(bk.selectedDate || bk.date);
      const bkTimeRaw = normalizeKeyPart(
        bk.selectedTime || bk.selectedTiming || bk.time
      );
      const bkLabelText = normalizeKeyPart(bk.showTimeLabel);

      const matchesMovie =
        (targetShowId && bkShowId && targetShowId === bkShowId) ||
        (targetMovieId && bkMovieId && targetMovieId === bkMovieId) ||
        (targetMovieTitle && bkMovieTitle && targetMovieTitle === bkMovieTitle);

      if (!matchesMovie) return;

      const dateMatches =
        !bkDate ||
        !targetDate ||
        bkDate === targetDate ||
        (bkLabelText && bkLabelText.includes(targetDate));

      const timeMatches =
        !bkTimeRaw ||
        !targetTime ||
        bkTimeRaw === targetTime ||
        (bkLabelText && bkLabelText.includes(targetTime));

      if (dateMatches && timeMatches) {
        const rawList = Array.isArray(bk.bookedSeats)
          ? bk.bookedSeats
          : Array.isArray(bk.seats)
            ? bk.seats
            : [];
        rawList.forEach((s) => {
          const norm = normalizeSeat(s);
          if (norm) collected.push(norm);
        });
      }
    });

    return collected;
  }, [
    allBookings,
    cancelledMap,
    movie,
    selectedDate,
    currentSlotLabel,
    activeShowId,
  ]);

  const occupiedSeats = useMemo(() => {
    const merged = new Set([
      ...(Array.isArray(movie.bookedSeats) ? movie.bookedSeats : []),
      ...(Array.isArray(backendOccupiedSeats) ? backendOccupiedSeats : []),
      ...userBookedSeatsForShow,
    ]);
    return Array.from(merged)
      .map(normalizeSeat)
      .filter(Boolean);
  }, [movie.bookedSeats, backendOccupiedSeats, userBookedSeatsForShow]);

  const bookedSet = useMemo(() => new Set(occupiedSeats), [occupiedSeats]);

  // Remove any newly booked seat from current selection automatically
  useEffect(() => {
    setSelectedSeats((prev) => prev.filter((code) => !bookedSet.has(code)));
  }, [bookedSet]);

  const seatSize = useMemo(() => {
    const gap = 3;
    const aisle = 12;
    const rowTag = 16;
    const horizontalAllowance = width - 24 - 16 - rowTag - aisle - gap * 6;
    const w = Math.floor(horizontalAllowance / 8);
    const clampedW = Math.min(Math.max(w, 24), 38);
    return {
      width: clampedW,
      height: Math.round(clampedW * 0.92),
      gap,
      aisle,
      rowTag,
      fontSize: clampedW < 30 ? 8 : 9,
    };
  }, [width]);

  const toggleSeat = (seatCode) => {
    const normCode = normalizeSeat(seatCode);
    if (bookedSet.has(normCode)) {
      triggerSubtleTap(6);
      setLimitNotice(`Seat ${normCode} is already booked and locked.`);
      return;
    }

    triggerSubtleTap(7);

    setSelectedSeats((prev) => {
      if (prev.includes(normCode)) {
        setLimitNotice('');
        return prev.filter((s) => s !== normCode);
      }
      if (prev.length >= MAX_SEATS) {
        setLimitNotice(`Maximum ${MAX_SEATS} seats allowed per booking.`);
        return prev;
      }
      setLimitNotice('');
      return [...prev, normCode];
    });
  };

  const seatBreakdown = useMemo(() => {
    return selectedSeats.map((code) => {
      const info = seatPriceMap[code] || {
        tierTitle: 'Classic',
        price: basePrice,
      };
      return {
        seat: code,
        tier: info.tierTitle,
        price: info.price,
      };
    });
  }, [selectedSeats, seatPriceMap, basePrice]);

  const totalAmount = useMemo(() => {
    return seatBreakdown.reduce((sum, item) => sum + item.price, 0);
  }, [seatBreakdown]);

  const renderSeat = (code, tierColor) => {
    const normCode = normalizeSeat(code);
    const isBooked = bookedSet.has(normCode);
    const isSelected = selectedSeats.includes(normCode);

    return (
      <TouchableOpacity
        key={normCode}
        disabled={isBooked}
        activeOpacity={isBooked ? 1 : 0.8}
        onPress={() => toggleSeat(normCode)}
        style={[
          styles.seatBox,
          {
            width: seatSize.width,
            height: seatSize.height,
            borderColor: isBooked
              ? '#2B2630'
              : isSelected
                ? COLORS.primary
                : tierColor,
          },
          !isBooked && !isSelected && styles.seatAvail,
          isSelected && styles.seatSel,
          isBooked && styles.seatBook,
        ]}
      >
        <View
          style={[
            styles.seatLip,
            {
              backgroundColor: isBooked
                ? '#221E27'
                : isSelected
                  ? '#FF859B'
                  : 'rgba(255,255,255,0.16)',
            },
          ]}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.seatText,
            { fontSize: seatSize.fontSize },
            isSelected && styles.seatTextSel,
            isBooked && styles.seatTextBook,
          ]}
        >
          {normCode}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => {
            triggerSubtleTap(7);
            navigation.goBack();
          }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {movie.title}
          </Text>
          <Text style={styles.headerSub}>
            {selectedDate} • Base ₹{basePrice} • Max {MAX_SEATS} seats
          </Text>
        </View>

        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.timingsCard}>
          <Text style={styles.timingsTitle}>Available Timings</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timingsRow}
          >
            {timingSlots.map((slot, idx) => {
              const active = idx === selectedSlotIndex;
              return (
                <TouchableOpacity
                  key={`${slot.label}-${idx}`}
                  activeOpacity={0.8}
                  onPress={() => {
                    triggerSubtleTap(7);
                    setSelectedSlotIndex(idx);
                  }}
                  style={[styles.timeChip, active && styles.timeChipActive]}
                >
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={active ? COLORS.white : COLORS.textSecondary}
                  />
                  <Text
                    style={[styles.timeText, active && styles.timeTextActive]}
                  >
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.screenSection}>
          <Text style={styles.screenHeading}>3D Cinema Seating</Text>
          <View style={styles.screenGlow} />
          <View style={styles.screenCurve} />
          <Text style={styles.screenHint}>SCREEN SIDE • 1ST TIER NEAREST</Text>
        </View>

        <View style={styles.rateStrip}>
          {TIERS.map((t) => (
            <View key={t.key} style={styles.ratePill}>
              <View style={[styles.rateDot, { backgroundColor: t.color }]} />
              <Text style={styles.rateName} numberOfLines={1}>
                {t.title}
              </Text>
              <Text style={styles.rateVal}>
                ₹{calcTierRate(basePrice, t.multiplier)}
              </Text>
            </View>
          ))}
        </View>

        {loadingSeats ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loaderText}>Checking seat availability...</Text>
          </View>
        ) : (
          <View style={styles.tiersList}>
            {TIERS.map((tier, idx) => {
              const tierRate = calcTierRate(basePrice, tier.multiplier);
              return (
                <View
                  key={tier.key}
                  style={[
                    styles.tierCard,
                    {
                      borderColor: `${tier.color}55`,
                      marginTop: idx === 0 ? 0 : 12,
                    },
                  ]}
                >
                  <View style={styles.tierTopBar}>
                    <View style={styles.tierLabelGroup}>
                      <View
                        style={[styles.tierAccent, { backgroundColor: tier.color }]}
                      />
                      <Text style={styles.tierName}>{tier.title}</Text>
                      <Text style={styles.tierSub}>{tier.sub}</Text>
                    </View>
                    <Text style={[styles.tierRate, { color: tier.color }]}>
                      ₹{tierRate}
                    </Text>
                  </View>

                  <View style={{ gap: seatSize.gap + 4 }}>
                    {tier.rows.map((r) => (
                      <View key={r.row} style={styles.seatRow}>
                        <Text style={[styles.rowCode, { width: seatSize.rowTag }]}>
                          {r.row}
                        </Text>

                        <View style={{ flexDirection: 'row', gap: seatSize.gap }}>
                          {r.left.map((code) => renderSeat(code, tier.color))}
                        </View>

                        <View style={{ width: seatSize.aisle, alignItems: 'center' }}>
                          <View style={styles.aisleDivider} />
                        </View>

                        <View style={{ flexDirection: 'row', gap: seatSize.gap }}>
                          {r.right.map((code) => renderSeat(code, tier.color))}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.seatAvail]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.seatSel]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.seatBook]} />
            <Text style={styles.legendText}>Booked</Text>
          </View>
        </View>

        {limitNotice ? (
          <View style={styles.limitBox}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.limitText}>{limitNotice}</Text>
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <Text style={styles.summarySeats} numberOfLines={1}>
              Seats ({selectedSeats.length}/{MAX_SEATS}):{' '}
              <Text style={styles.summaryBold}>
                {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
              </Text>
            </Text>
            <Text style={styles.summaryTotal}>₹{totalAmount}</Text>
          </View>

          {seatBreakdown.length > 0 ? (
            <Text style={styles.summarySub} numberOfLines={2}>
              {seatBreakdown
                .map((item) => `${item.seat} (${item.tier} ₹${item.price})`)
                .join(' • ')}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          activeOpacity={selectedSeats.length === 0 ? 1 : 0.85}
          onPress={() => {
            if (selectedSeats.length === 0) return;
            const filteredSeats = selectedSeats.filter((s) => !bookedSet.has(s));
            if (filteredSeats.length === 0) {
              setLimitNotice('Selected seats are already booked.');
              return;
            }
            triggerSubtleTap(8);
            navigation.navigate('BookingConfirm', {
              movie,
              showId: activeShowId,
              selectedDate,
              selectedTiming: currentSlotLabel,
              selectedSeats: filteredSeats,
              bookedSeats: occupiedSeats,
              seatBreakdown,
              totalAmount,
            });
          }}
          style={[
            styles.checkoutBtn,
            selectedSeats.length === 0 && styles.checkoutBtnDisabled,
          ]}
        >
          <Text style={styles.checkoutBtnText}>
            {selectedSeats.length > 0
              ? `Proceed to Checkout • ₹${totalAmount}`
              : 'Proceed to Checkout'}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  backBtn: {
    padding: 4,
  },
  headerTitleBox: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  headerSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 110,
  },
  timingsCard: {
    backgroundColor: COLORS.roseCard,
    borderWidth: 1,
    borderColor: COLORS.roseBorder,
    borderRadius: 12,
    padding: 12,
  },
  timingsTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  timingsRow: {
    gap: 8,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  timeChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  timeTextActive: {
    color: COLORS.white,
  },
  screenSection: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
  },
  screenHeading: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  screenGlow: {
    width: '82%',
    height: 10,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    backgroundColor: 'rgba(244, 63, 94, 0.24)',
  },
  screenCurve: {
    width: '78%',
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    marginTop: -6,
  },
  screenHint: {
    color: COLORS.textMuted,
    fontSize: 9.5,
    letterSpacing: 1,
    marginTop: 5,
    fontWeight: '600',
  },
  rateStrip: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  ratePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 9,
    paddingVertical: 6,
    paddingHorizontal: 5,
  },
  rateDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  rateName: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  rateVal: {
    color: COLORS.text,
    fontSize: 10.5,
    fontWeight: '800',
  },
  loaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 28,
  },
  loaderText: {
    color: COLORS.textMuted,
    fontSize: 12.5,
  },
  tiersList: {
    width: '100%',
  },
  tierCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  tierTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  tierLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  tierAccent: {
    width: 4,
    height: 14,
    borderRadius: 2,
  },
  tierName: {
    color: COLORS.text,
    fontSize: 12.5,
    fontWeight: '800',
  },
  tierSub: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  tierRate: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCode: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  aisleDivider: {
    width: 1.5,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 1,
  },
  seatBox: {
    borderRadius: 6,
    borderWidth: 1.2,
    borderBottomWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  seatAvail: {
    backgroundColor: '#19141C',
  },
  seatSel: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  seatBook: {
    backgroundColor: '#151217',
    borderColor: '#2A2530',
    opacity: 0.55,
  },
  seatLip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3.5,
  },
  seatText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginTop: 2,
  },
  seatTextSel: {
    color: COLORS.white,
    fontWeight: '800',
  },
  seatTextBook: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  legendText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  limitBox: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.roseCard,
    borderWidth: 1,
    borderColor: COLORS.roseBorder,
  },
  limitText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  summaryCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 5,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  summarySeats: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    flex: 1,
  },
  summaryBold: {
    color: COLORS.text,
    fontWeight: '700',
  },
  summaryTotal: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  summarySub: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  checkoutBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  checkoutBtnDisabled: {
    opacity: 0.45,
  },
  checkoutBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});