import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { MOVIES } from '../data/mockMovies';
import { fetchOccupiedSeats } from '../services/api';

const MAX_SEATS = 5;

const SEAT_ROWS_LEFT = [
  ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'],
  ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'],
];

const SEAT_ROWS_RIGHT = [
  ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'],
  ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'],
];

export default function SeatSelectionScreen({ route, navigation }) {
  const params = route?.params || {};
  const movie = params.movie || MOVIES[0];
  const selectedDate = params.selectedDate || '21 Nov';

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
  const [occupiedSeats, setOccupiedSeats] = useState(movie.bookedSeats || []);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [limitNotice, setLimitNotice] = useState('');

  const currentSlot = timingSlots[selectedSlotIndex] || timingSlots[0];
  const activeShowId = currentSlot?.showId;

  useEffect(() => {
    let active = true;
    setSelectedSeats([]);
    setLimitNotice('');

    async function loadSeats() {
      if (!activeShowId || String(activeShowId).includes('-show-')) {
        setOccupiedSeats(movie.bookedSeats || []);
        return;
      }

      setLoadingSeats(true);
      try {
        const res = await fetchOccupiedSeats(activeShowId);
        if (!active) return;
        if (Array.isArray(res?.occupiedSeats)) {
          setOccupiedSeats(res.occupiedSeats);
        } else {
          setOccupiedSeats(movie.bookedSeats || []);
        }
      } catch (err) {
        if (active) {
          setOccupiedSeats(movie.bookedSeats || []);
        }
      } finally {
        if (active) setLoadingSeats(false);
      }
    }

    loadSeats();
    return () => {
      active = false;
    };
  }, [activeShowId]);

  const bookedSet = useMemo(() => new Set(occupiedSeats), [occupiedSeats]);

  const toggleSeat = (seatCode) => {
    if (bookedSet.has(seatCode)) return;

    setSelectedSeats((prev) => {
      if (prev.includes(seatCode)) {
        setLimitNotice('');
        return prev.filter((s) => s !== seatCode);
      }

      if (prev.length >= MAX_SEATS) {
        setLimitNotice(`Maximum ${MAX_SEATS} seats allowed per booking.`);
        return prev;
      }

      setLimitNotice('');
      return [...prev, seatCode];
    });
  };

  const renderSeatButton = (seatCode) => {
    const isBooked = bookedSet.has(seatCode);
    const isSelected = selectedSeats.includes(seatCode);

    return (
      <TouchableOpacity
        key={seatCode}
        activeOpacity={isBooked ? 1 : 0.75}
        onPress={() => toggleSeat(seatCode)}
        style={[
          styles.seatBtn,
          isBooked && styles.seatBooked,
          isSelected && styles.seatSelected,
        ]}
      >
        <Text
          style={[
            styles.seatText,
            isBooked && styles.seatTextBooked,
            isSelected && styles.seatTextSelected,
          ]}
        >
          {seatCode}
        </Text>
      </TouchableOpacity>
    );
  };

  const totalAmount = selectedSeats.length * (movie.pricePerSeat || 250);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBackBtn}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {movie.title}
          </Text>
          <Text style={styles.headerSub}>
            {selectedDate} • ₹{movie.pricePerSeat || 250}/seat • Max {MAX_SEATS} seats
          </Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.timingsCard}>
          <Text style={styles.timingsHeading}>Available Timings</Text>
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
                  onPress={() => setSelectedSlotIndex(idx)}
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

        <View style={styles.screenWrap}>
          <Text style={styles.selectSeatTitle}>Select your seat</Text>
          <View style={styles.screenCurve} />
          <Text style={styles.screenLabel}>SCREEN SIDE</Text>
        </View>

        {loadingSeats ? (
          <View style={styles.loadingSeatsBox}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingSeatsText}>Checking seat availability...</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.seatsHorizontal}
          >
            <View style={styles.block}>
              {SEAT_ROWS_LEFT.map((row, idx) => (
                <View key={idx} style={styles.seatRow}>
                  {row.map(renderSeatButton)}
                </View>
              ))}
            </View>

            <View style={styles.aisleGap} />

            <View style={styles.block}>
              {SEAT_ROWS_RIGHT.map((row, idx) => (
                <View key={idx} style={styles.seatRow}>
                  {row.map(renderSeatButton)}
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.seatBtn]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.seatSelected]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.seatBooked]} />
            <Text style={styles.legendText}>Booked</Text>
          </View>
        </View>

        {limitNotice ? (
          <View style={styles.limitBanner}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.limitText}>{limitNotice}</Text>
          </View>
        ) : null}

        <View style={styles.summaryBox}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.summaryText}>
              Seats ({selectedSeats.length}/{MAX_SEATS}):{' '}
              <Text style={styles.summaryHighlight}>
                {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
              </Text>
            </Text>
            <Text style={styles.summaryText}>
              Total: <Text style={styles.summaryHighlight}>₹{totalAmount}</Text>
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={selectedSeats.length === 0 ? 1 : 0.85}
          onPress={() => {
            if (selectedSeats.length === 0) return;
            navigation.navigate('BookingConfirm', {
              movie,
              showId: activeShowId,
              selectedDate,
              selectedTiming: currentSlot?.label || '12:50 PM',
              selectedSeats,
              totalAmount,
            });
          }}
          style={[
            styles.checkoutBtn,
            selectedSeats.length === 0 && styles.checkoutDisabled,
          ]}
        >
          <Text style={styles.checkoutText}>Proceed to Checkout</Text>
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
  iconBackBtn: {
    padding: 4,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
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
    padding: 16,
    paddingBottom: 96,
  },
  timingsCard: {
    backgroundColor: COLORS.roseCard,
    borderWidth: 1,
    borderColor: COLORS.roseBorder,
    borderRadius: 12,
    padding: 12,
  },
  timingsHeading: {
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
  screenWrap: {
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 16,
  },
  selectSeatTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  screenCurve: {
    width: '72%',
    height: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  screenLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 1.2,
    marginTop: 6,
  },
  loadingSeatsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 28,
  },
  loadingSeatsText: {
    color: COLORS.textMuted,
    fontSize: 12.5,
  },
  seatsHorizontal: {
    paddingVertical: 6,
  },
  block: {
    gap: 8,
  },
  aisleGap: {
    width: 18,
  },
  seatRow: {
    flexDirection: 'row',
    gap: 6,
  },
  seatBtn: {
    width: 34,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  seatBooked: {
    backgroundColor: '#1E1B20',
    borderColor: '#2E2A32',
  },
  seatText: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    fontWeight: '600',
  },
  seatTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  seatTextBooked: {
    color: COLORS.textMuted,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 18,
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
  },
  legendText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  limitBanner: {
    marginTop: 14,
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
  summaryBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
  },
  summaryHighlight: {
    color: COLORS.text,
    fontWeight: '700',
  },
  checkoutBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  checkoutDisabled: {
    opacity: 0.45,
  },
  checkoutText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});