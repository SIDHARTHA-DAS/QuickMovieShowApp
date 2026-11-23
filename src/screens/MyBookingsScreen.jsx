import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  Alert,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { fetchUserBookings, getTmdbImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_FILTERS = ['all', 'confirmed', 'cancelled'];
const QUICK_REVIEW_TAGS = [
  'Great Story',
  'Visual Treat',
  'Awesome Music',
  'Must Watch',
  'Gripping',
];
const RATING_LABELS = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Good Watch',
  4: 'Great Movie',
  5: 'Masterpiece!',
};

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

function parseRuntimeMinutes(durationStr, fallback = 150) {
  if (typeof durationStr === 'number' && !Number.isNaN(durationStr)) {
    return durationStr;
  }
  const str = String(durationStr || '');
  const hMatch = str.match(/(\d+)\s*h/i);
  const mMatch = str.match(/(\d+)\s*m/i);
  const hours = hMatch ? Number(hMatch[1]) : 0;
  const mins = mMatch ? Number(mMatch[1]) : 0;
  const total = hours * 60 + mins;
  return total > 0 ? total : fallback;
}

function inferShowEndTimestamp(item) {
  const explicitEnd =
    item?.showEndTime || item?.endDateTime || item?.show?.endDateTime;
  if (explicitEnd) {
    const parsedEnd = new Date(explicitEnd).getTime();
    if (!Number.isNaN(parsedEnd)) return parsedEnd;
  }

  const startRaw =
    item?.showDateTime || item?.show?.showDateTime || item?.dateTime;
  if (startRaw) {
    const startMs = new Date(startRaw).getTime();
    if (!Number.isNaN(startMs)) {
      const runtimeMins = parseRuntimeMinutes(item?.duration, 150);
      return startMs + runtimeMins * 60 * 1000;
    }
  }

  // Try parsing human-readable showTimeLabel e.g. "Fri, Nov 20, 7:30 PM"
  const label = String(item?.showTimeLabel || '');
  const monthMap = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  const dateMatch = label.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:,\s*(\d{4}))?/i
  );
  if (dateMatch) {
    const monthIdx = monthMap[dateMatch[1].toLowerCase()];
    const day = Number(dateMatch[2]);
    const now = new Date();
    const year = dateMatch[3] ? Number(dateMatch[3]) : now.getFullYear();

    let hours = 23;
    let minutes = 59;
    const timeMatch = label.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeMatch) {
      let h = Number(timeMatch[1]);
      const m = Number(timeMatch[2]);
      const meridiem = timeMatch[3].toUpperCase();
      if (meridiem === 'PM' && h < 12) h += 12;
      if (meridiem === 'AM' && h === 12) h = 0;
      hours = h;
      minutes = m;
    }

    const startDate = new Date(year, monthIdx, day, hours, minutes, 0, 0);
    if (!Number.isNaN(startDate.getTime())) {
      const runtimeMins = parseRuntimeMinutes(item?.duration, 150);
      return startDate.getTime() + runtimeMins * 60 * 1000;
    }
  }

  return null;
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
    showDateTime: b?.show?.showDateTime || b?.showDateTime || null,
    showTimeLabel: b?.showTimeLabel || formatBookingShowTime(b?.show),
    amount: Number(b?.amount ?? 0),
    seats,
    status: b?.status || 'Confirmed',
    poster:
      getTmdbImageUrl(movie.poster_path, 'w500') ||
      b?.poster ||
      'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
  };
}

function isTicketCancelled(ticket) {
  return String(ticket?.status || '').toLowerCase() === 'cancelled';
}

function copyPassIdToClipboard(passId) {
  const value = String(passId || '').toUpperCase();
  if (!value) return false;

  try {
    if (Clipboard && typeof Clipboard.setString === 'function') {
      Clipboard.setString(value);
      return true;
    }
  } catch (_) {
    // Fallback below
  }

  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator?.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      navigator.clipboard.writeText(value);
      return true;
    }
  } catch (_) {
    // Ignore clipboard failure
  }

  return false;
}

function buildQrMatrix(seedStr, size = 11) {
  let hash = 2166136261;
  const input = String(seedStr || 'QUICKSHOW-PASS');
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const grid = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
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
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    setCopied(false);
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, [ticket?.id]);

  if (!ticket) return null;

  const cancelled = isTicketCancelled(ticket);
  const amount = Number(ticket.amount ?? 0);
  const refundAmount =
    typeof ticket.refundAmount === 'number'
      ? ticket.refundAmount
      : Math.round(amount * 0.9);

  const formattedPassId = String(ticket.id || '').toUpperCase();
  const qrSeed = `${ticket.id}|${ticket.movieTitle}|${(ticket.seats || []).join(',')}|${ticket.showTimeLabel}|${ticket.status || 'Confirmed'}`;

  const handleCopyId = () => {
    copyPassIdToClipboard(formattedPassId);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      setCopied(false);
    }, 1800);
  };

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
              <Text
                style={[
                  styles.passSub,
                  cancelled ? styles.passSubCancelled : styles.passSubConfirmed,
                ]}
              >
                {cancelled
                  ? `Cancelled • 90% Refund (₹${refundAmount})`
                  : 'Confirmed • Show at Entrance'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.passCloseBtn}>
              <Ionicons name="close" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.passMovieRow}>
            <Image
              source={{ uri: ticket.poster }}
              style={[styles.passPoster, cancelled && styles.dimmedPoster]}
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
              <Text style={styles.passLabel}>
                {cancelled ? 'REFUND (90%)' : 'AMOUNT'}
              </Text>
              <Text style={styles.passValue}>
                ₹{cancelled ? refundAmount : amount}
              </Text>
            </View>
          </View>

          {cancelled ? (
            <View style={styles.qrRemovedBox}>
              <Ionicons name="ban-outline" size={26} color={COLORS.primary} />
              <Text style={styles.qrRemovedTitle}>QR Pass Invalidated</Text>
              <Text style={styles.qrRemovedSub}>
                This booking was cancelled. Entry QR has been permanently
                removed.
              </Text>
            </View>
          ) : (
            <View style={styles.qrSection}>
              <FakeQrCodeBox seed={qrSeed} />
              <View style={styles.passIdRow}>
                <Text style={styles.qrCodeLabel} numberOfLines={1}>
                  PASS ID: {formattedPassId}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleCopyId}
                  style={styles.copyIdBtn}
                >
                  <Ionicons
                    name={copied ? 'checkmark-circle' : 'copy-outline'}
                    size={12}
                    color={copied ? '#22C55E' : COLORS.primary}
                  />
                  <Text
                    style={[
                      styles.copyIdBtnText,
                      copied && styles.copyIdBtnTextSuccess,
                    ]}
                  >
                    {copied ? 'Copied' : 'Copy ID'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.qrGuestText} numberOfLines={1}>
                Guest: {guestName || 'QuickShow User'}
              </Text>
            </View>
          )}

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

function CancelBookingModal({ ticket, onConfirm, onClose }) {
  if (!ticket) return null;

  const totalPaid = Number(ticket.amount ?? 0);
  const refundAmount = Math.round(totalPaid * 0.9);
  const feeDeducted = Math.max(totalPaid - refundAmount, 0);

  return (
    <Modal
      visible={Boolean(ticket)}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.passBackdrop}>
        <View style={styles.cancelModalCard}>
          <View style={styles.cancelModalHeader}>
            <View style={styles.cancelWarnIcon}>
              <Ionicons name="alert-circle" size={22} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelModalTitle}>Cancel Booking?</Text>
              <Text style={styles.cancelModalSub}>
                90% instant simulated refund applies
              </Text>
            </View>
          </View>

          <View style={styles.cancelSummaryBox}>
            <Text style={styles.cancelMovieName} numberOfLines={1}>
              {ticket.movieTitle}
            </Text>
            <Text style={styles.cancelShowMeta} numberOfLines={1}>
              {ticket.showTimeLabel} • Seats:{' '}
              {(ticket.seats || []).join(', ') || 'C1'}
            </Text>

            <View style={styles.cancelBreakdownRow}>
              <Text style={styles.breakdownLabel}>Ticket Amount Paid</Text>
              <Text style={styles.breakdownVal}>₹{totalPaid}</Text>
            </View>
            <View style={styles.cancelBreakdownRow}>
              <Text style={styles.breakdownLabel}>Cancellation Fee (10%)</Text>
              <Text style={styles.breakdownFee}>-₹{feeDeducted}</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.cancelBreakdownRow}>
              <Text style={styles.refundHighlightLabel}>Refundable (90%)</Text>
              <Text style={styles.refundHighlightVal}>₹{refundAmount}</Text>
            </View>
          </View>

          <View style={styles.cancelBtnRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onClose}
              style={styles.keepTicketBtn}
            >
              <Text style={styles.keepTicketText}>Keep Ticket</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onConfirm(ticket)}
              style={styles.confirmCancelBtn}
            >
              <Text style={styles.confirmCancelText}>Confirm Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ReviewEditorModal({ ticket, existingReview, onSubmit, onClose }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);

  useEffect(() => {
    if (!ticket) return;
    setRating(existingReview?.rating ? Number(existingReview.rating) : 5);
    setComment(existingReview?.comment || '');
    setSelectedTags(
      Array.isArray(existingReview?.tags) ? existingReview.tags : []
    );
  }, [ticket, existingReview]);

  if (!ticket) return null;

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = () => {
    onSubmit(ticket, {
      rating,
      comment: comment.trim(),
      tags: selectedTags,
    });
  };

  return (
    <Modal
      visible={Boolean(ticket)}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.passBackdrop}
      >
        <View style={styles.reviewModalCard}>
          <View style={styles.passHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewModalTitle}>
                {existingReview ? 'Edit Your Rating' : 'Rate & Review'}
              </Text>
              <Text style={styles.reviewModalSub} numberOfLines={1}>
                {ticket.movieTitle}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.passCloseBtn}>
              <Ionicons name="close" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.starSelectorBox}>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((starNum) => {
                const filled = starNum <= rating;
                return (
                  <TouchableOpacity
                    key={starNum}
                    activeOpacity={0.8}
                    onPress={() => setRating(starNum)}
                    style={styles.starTouchBtn}
                  >
                    <Ionicons
                      name={filled ? 'star' : 'star-outline'}
                      size={32}
                      color={filled ? '#FBBF24' : COLORS.textMuted}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.ratingMoodText}>
              {rating}/5 • {RATING_LABELS[rating] || 'Great Watch'}
            </Text>
          </View>

          <Text style={styles.reviewFieldLabel}>Quick Highlights</Text>
          <View style={styles.tagsWrap}>
            {QUICK_REVIEW_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  activeOpacity={0.8}
                  onPress={() => toggleTag(tag)}
                  style={[styles.tagChip, active && styles.tagChipActive]}
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      active && styles.tagChipTextActive,
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.reviewFieldLabel}>Your Review (Optional)</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Share what you liked about the movie..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={3}
            maxLength={240}
            style={styles.reviewTextInput}
          />

          <View style={styles.cancelBtnRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onClose}
              style={styles.keepTicketBtn}
            >
              <Text style={styles.keepTicketText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSave}
              style={styles.confirmCancelBtn}
            >
              <Text style={styles.confirmCancelText}>Submit Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ViewSubmittedReviewModal({ ticket, review, onEdit, onClose }) {
  if (!ticket || !review) return null;

  const ratingVal = Number(review.rating || 5);
  const tags = Array.isArray(review.tags) ? review.tags : [];

  return (
    <Modal
      visible={Boolean(ticket && review)}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.passBackdrop}>
        <View style={styles.reviewModalCard}>
          <View style={styles.passHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewModalTitle}>Your Movie Review</Text>
              <Text style={styles.reviewModalSub} numberOfLines={1}>
                {ticket.movieTitle}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.passCloseBtn}>
              <Ionicons name="close" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.viewRatingCard}>
            <View style={styles.viewStarsRow}>
              {[1, 2, 3, 4, 5].map((num) => (
                <Ionicons
                  key={num}
                  name={num <= ratingVal ? 'star' : 'star-outline'}
                  size={22}
                  color={num <= ratingVal ? '#FBBF24' : COLORS.textMuted}
                />
              ))}
              <Text style={styles.viewRatingScore}>{ratingVal}/5</Text>
            </View>

            {tags.length > 0 ? (
              <View style={styles.viewTagsRow}>
                {tags.map((t) => (
                  <View key={t} style={styles.viewTagBadge}>
                    <Text style={styles.viewTagText}>{t}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.viewReviewBody}>
              {review.comment
                ? `"${review.comment}"`
                : 'No written comment added — rated with stars.'}
            </Text>
          </View>

          <View style={styles.cancelBtnRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onClose}
              style={styles.keepTicketBtn}
            >
              <Text style={styles.keepTicketText}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onEdit(ticket)}
              style={styles.confirmCancelBtn}
            >
              <Text style={styles.confirmCancelText}>Edit Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function MyBookingsScreen({
  navigation,
  bookings = [],
  cancelledMap = {},
  reviewsMap = {},
  endedShowsMap = {},
  onCancelBooking,
  onSaveReview,
  onMarkShowEnded,
  onResetDemoData,
  favorites = [],
  onToggleFavorite,
}) {
  const { user, userId, loginUser, logoutUser, useDemoUser } = useAuth();

  const [activeSubView, setActiveSubView] = useState('bookings');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPassTicket, setSelectedPassTicket] = useState(null);
  const [ticketToCancel, setTicketToCancel] = useState(null);
  const [ticketToReview, setTicketToReview] = useState(null);
  const [ticketToViewReview, setTicketToViewReview] = useState(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [apiBookings, setApiBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

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
      setNowMs(Date.now());
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

  const combinedBookings = useMemo(() => {
    const merged = [...bookings];
    const existingIds = new Set(merged.map((item) => String(item.id)));

    for (const item of apiBookings) {
      if (!existingIds.has(String(item.id))) {
        merged.push(item);
        existingIds.add(String(item.id));
      }
    }

    return merged.map((item) => {
      const cancelOverride = cancelledMap?.[String(item.id)];
      if (!cancelOverride) return item;
      return {
        ...item,
        ...cancelOverride,
      };
    });
  }, [bookings, apiBookings, cancelledMap]);

  const checkHasShowEnded = useCallback(
    (ticket) => {
      const idKey = String(ticket?.id || '');
      if (endedShowsMap?.[idKey]) return true;
      const endTs = inferShowEndTimestamp(ticket);
      if (typeof endTs === 'number' && !Number.isNaN(endTs)) {
        return nowMs >= endTs;
      }
      return false;
    },
    [endedShowsMap, nowMs]
  );

  const bookingCounts = useMemo(() => {
    let confirmed = 0;
    let cancelled = 0;
    for (const b of combinedBookings) {
      if (isTicketCancelled(b)) cancelled += 1;
      else confirmed += 1;
    }
    return {
      all: combinedBookings.length,
      confirmed,
      cancelled,
    };
  }, [combinedBookings]);

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'confirmed') {
      return combinedBookings.filter((b) => !isTicketCancelled(b));
    }
    if (statusFilter === 'cancelled') {
      return combinedBookings.filter((b) => isTicketCancelled(b));
    }
    return combinedBookings;
  }, [combinedBookings, statusFilter]);

  const executeTicketCancellation = useCallback(
    (ticket) => {
      if (!ticket) return;
      if (typeof onCancelBooking === 'function') {
        onCancelBooking(ticket);
      }
      if (
        selectedPassTicket &&
        String(selectedPassTicket.id) === String(ticket.id)
      ) {
        setSelectedPassTicket(null);
      }
      setTicketToCancel(null);
    },
    [onCancelBooking, selectedPassTicket]
  );

  const handleConfirmCancellation = (ticket) => {
    if (!ticket) return;

    const refundAmount = Math.round(Number(ticket.amount ?? 0) * 0.9);

    Alert.alert(
      'Are you sure?',
      `Do you really want to cancel "${ticket.movieTitle}"? Your entry QR will be removed and ₹${refundAmount} (90%) will be refunded.`,
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => executeTicketCancellation(ticket),
        },
      ],
      { cancelable: true }
    );
  };

  const handleReviewSubmit = (ticket, reviewData) => {
    if (!ticket) return;
    if (typeof onSaveReview === 'function') {
      onSaveReview(ticket.id, reviewData);
    }
    setTicketToReview(null);
  };

  const handleResetDemoPress = () => {
    Alert.alert(
      'Reset Demo Data?',
      'This will restore default bookings and clear local cancellations, reviews & favorites for this user.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setStatusFilter('all');
            setSelectedPassTicket(null);
            setTicketToCancel(null);
            setTicketToReview(null);
            setTicketToViewReview(null);
            if (typeof onResetDemoData === 'function') {
              onResetDemoData();
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const openFavoriteMovie = (movie) => {
    navigation.navigate('Movies', {
      screen: 'MovieDetails',
      params: { movieId: movie.id, movie },
    });
  };

  const activePassTicket = useMemo(() => {
    if (!selectedPassTicket) return null;
    const found = combinedBookings.find(
      (b) => String(b.id) === String(selectedPassTicket.id)
    );
    const target = found || selectedPassTicket;
    if (isTicketCancelled(target)) return null;
    return target;
  }, [selectedPassTicket, combinedBookings]);

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

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleResetDemoPress}
            style={styles.resetPillBtn}
          >
            <Ionicons
              name="refresh-outline"
              size={13}
              color={COLORS.textSecondary}
            />
            <Text style={styles.resetPillText}>Reset Demo</Text>
          </TouchableOpacity>
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
              <Text style={styles.helperCaption}>Tap active pass for QR</Text>
            </View>

            {/* Status Filter Chips: All / Confirmed / Cancelled */}
            <View style={styles.filterChipsRow}>
              {STATUS_FILTERS.map((key) => {
                const active = statusFilter === key;
                const label =
                  key === 'all'
                    ? `All (${bookingCounts.all})`
                    : key === 'confirmed'
                      ? `Confirmed (${bookingCounts.confirmed})`
                      : `Cancelled (${bookingCounts.cancelled})`;

                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.85}
                    onPress={() => setStatusFilter(key)}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {loading && combinedBookings.length === 0 ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loaderText}>Loading bookings...</Text>
              </View>
            ) : filteredBookings.length === 0 ? (
              <Text style={styles.emptyText}>
                {statusFilter === 'all'
                  ? 'No bookings yet.'
                  : `No ${statusFilter} bookings found.`}
              </Text>
            ) : (
              <View style={styles.list}>
                {filteredBookings.map((item) => {
                  const cancelled = isTicketCancelled(item);
                  const showEnded = !cancelled && checkHasShowEnded(item);
                  const submittedReview = reviewsMap?.[String(item.id)] || null;

                  const amount = Number(item.amount ?? 0);
                  const refundAmount =
                    typeof item.refundAmount === 'number'
                      ? item.refundAmount
                      : Math.round(amount * 0.9);

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.ticketCard,
                        cancelled && styles.ticketCardCancelled,
                      ]}
                    >
                      <TouchableOpacity
                        activeOpacity={cancelled ? 1 : 0.86}
                        disabled={cancelled}
                        onPress={() => {
                          if (!cancelled) setSelectedPassTicket(item);
                        }}
                        style={styles.ticketMainRow}
                      >
                        <Image
                          source={{ uri: item.poster }}
                          style={[
                            styles.poster,
                            cancelled && styles.dimmedPoster,
                          ]}
                          resizeMode="cover"
                        />

                        <View style={styles.midCol}>
                          <View style={styles.statusBadgeRow}>
                            <View
                              style={[
                                styles.statusBadge,
                                cancelled
                                  ? styles.statusBadgeCancelled
                                  : showEnded
                                    ? styles.statusBadgeCompleted
                                    : styles.statusBadgeConfirmed,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  cancelled
                                    ? styles.statusTextCancelled
                                    : showEnded
                                      ? styles.statusTextCompleted
                                      : styles.statusTextConfirmed,
                                ]}
                              >
                                {cancelled
                                  ? 'Cancelled'
                                  : showEnded
                                    ? 'Show Ended'
                                    : 'Confirmed'}
                              </Text>
                            </View>
                          </View>

                          <Text
                            style={[
                              styles.movieTitle,
                              cancelled && styles.cancelledTitleText,
                            ]}
                            numberOfLines={1}
                          >
                            {item.movieTitle}
                          </Text>
                          <Text style={styles.metaText}>{item.duration}</Text>
                          <Text style={styles.timeText}>
                            {item.showTimeLabel}
                          </Text>
                        </View>

                        <View style={styles.rightCol}>
                          <Text style={styles.priceText}>₹{amount}</Text>
                          <Text style={styles.ticketCount}>
                            Tickets : {item.seats?.length || 0}
                          </Text>
                          <Text style={styles.seatLine} numberOfLines={1}>
                            Seats : {(item.seats || []).join(', ')}
                          </Text>

                          {cancelled ? (
                            <View style={styles.voidBadgeMini}>
                              <Ionicons
                                name="ban-outline"
                                size={11}
                                color={COLORS.textMuted}
                              />
                              <Text style={styles.voidBadgeMiniText}>
                                QR Removed
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.qrBadgeMini}>
                              <Ionicons
                                name="qr-code-outline"
                                size={11}
                                color={COLORS.primary}
                              />
                              <Text style={styles.qrBadgeMiniText}>Pass</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>

                      {/* Smart Footer Slot: Cancel Ticket -> Rate & Review -> ★ Rating */}
                      <View style={styles.cardFooterBar}>
                        {cancelled ? (
                          <Text style={styles.refundInfoText}>
                            Refunded: ₹{refundAmount} (90% of ₹{amount})
                          </Text>
                        ) : showEnded ? (
                          <Text style={styles.refundHintText}>
                            {submittedReview
                              ? 'Tap rating to view your review'
                              : 'Show ended • Share your experience'}
                          </Text>
                        ) : (
                          <View style={styles.upcomingLeftGroup}>
                            <Text
                              style={styles.refundHintText}
                              numberOfLines={1}
                            >
                              90% refund (₹{refundAmount})
                            </Text>
                            {typeof onMarkShowEnded === 'function' ? (
                              <TouchableOpacity
                                activeOpacity={0.75}
                                onPress={() => onMarkShowEnded(item.id)}
                                style={styles.simulateEndPill}
                              >
                                <Text style={styles.simulateEndText}>
                                  Simulate End
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        )}

                        {cancelled ? null : !showEnded ? (
                          <TouchableOpacity
                            activeOpacity={0.82}
                            onPress={() => setTicketToCancel(item)}
                            style={styles.cancelActionBtn}
                          >
                            <Ionicons
                              name="close-circle-outline"
                              size={13}
                              color={COLORS.primary}
                            />
                            <Text style={styles.cancelActionText}>
                              Cancel Ticket
                            </Text>
                          </TouchableOpacity>
                        ) : submittedReview ? (
                          <TouchableOpacity
                            activeOpacity={0.82}
                            onPress={() => setTicketToViewReview(item)}
                            style={styles.ratedScorePill}
                          >
                            <Ionicons name="star" size={12} color="#FBBF24" />
                            <Text style={styles.ratedScoreText}>
                              {submittedReview.rating}/5
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            activeOpacity={0.82}
                            onPress={() => setTicketToReview(item)}
                            style={styles.rateReviewBtn}
                          >
                            <Ionicons
                              name="star-outline"
                              size={13}
                              color="#FBBF24"
                            />
                            <Text style={styles.rateReviewText}>
                              Rate & Review
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
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
                  No favorite movies yet. Open any movie and tap the heart icon
                  to save it here.
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
        ticket={activePassTicket}
        guestName={user?.name}
        onClose={() => setSelectedPassTicket(null)}
      />

      <CancelBookingModal
        ticket={ticketToCancel}
        onConfirm={handleConfirmCancellation}
        onClose={() => setTicketToCancel(null)}
      />

      <ReviewEditorModal
        ticket={ticketToReview}
        existingReview={
          ticketToReview ? reviewsMap?.[String(ticketToReview.id)] : null
        }
        onSubmit={handleReviewSubmit}
        onClose={() => setTicketToReview(null)}
      />

      <ViewSubmittedReviewModal
        ticket={ticketToViewReview}
        review={
          ticketToViewReview
            ? reviewsMap?.[String(ticketToViewReview.id)]
            : null
        }
        onEdit={(t) => {
          setTicketToViewReview(null);
          setTicketToReview(t);
        }}
        onClose={() => setTicketToViewReview(null)}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },
  brandAccent: {
    color: COLORS.primary,
  },
  resetPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  resetPillText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
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
    marginBottom: 10,
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
  filterChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  filterChipActive: {
    backgroundColor: 'rgba(244, 63, 94, 0.16)',
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.text,
    fontWeight: '700',
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
    backgroundColor: COLORS.roseCard,
    borderWidth: 1,
    borderColor: COLORS.roseBorder,
    borderRadius: 12,
    padding: 10,
  },
  ticketCardCancelled: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    opacity: 0.88,
  },
  ticketMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  poster: {
    width: 78,
    height: 62,
    borderRadius: 7,
    backgroundColor: COLORS.card,
  },
  dimmedPoster: {
    opacity: 0.55,
  },
  midCol: {
    flex: 1,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeConfirmed: {
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  statusBadgeCompleted: {
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    borderColor: 'rgba(251, 191, 36, 0.38)',
  },
  statusBadgeCancelled: {
    backgroundColor: 'rgba(244, 63, 94, 0.16)',
    borderColor: 'rgba(244, 63, 94, 0.42)',
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusTextConfirmed: {
    color: COLORS.success || '#22C55E',
  },
  statusTextCompleted: {
    color: '#FBBF24',
  },
  statusTextCancelled: {
    color: COLORS.primary,
  },
  movieTitle: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: '700',
  },
  cancelledTitleText: {
    color: COLORS.textSecondary,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  timeText: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    marginTop: 3,
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
  voidBadgeMini: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  voidBadgeMiniText: {
    color: COLORS.textMuted,
    fontSize: 9.5,
    fontWeight: '600',
  },
  cardFooterBar: {
    marginTop: 9,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  upcomingLeftGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refundHintText: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    flexShrink: 1,
  },
  simulateEndPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  simulateEndText: {
    color: COLORS.textSecondary,
    fontSize: 9.5,
    fontWeight: '600',
  },
  refundInfoText: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    fontWeight: '600',
    flex: 1,
  },
  cancelActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
  },
  cancelActionText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  rateReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.42)',
  },
  rateReviewText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '700',
  },
  ratedScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  ratedScoreText: {
    color: '#FDE68A',
    fontSize: 11.5,
    fontWeight: '800',
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
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  passSubConfirmed: {
    color: COLORS.success || '#22C55E',
  },
  passSubCancelled: {
    color: COLORS.primary,
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
  qrRemovedBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
  },
  qrRemovedTitle: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: '800',
    marginTop: 6,
  },
  qrRemovedSub: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 16,
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
  passIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  qrCodeLabel: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  copyIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  copyIdBtnText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  copyIdBtnTextSuccess: {
    color: '#22C55E',
  },
  qrGuestText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
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
  cancelModalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
  },
  cancelModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cancelWarnIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 63, 94, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  cancelModalSub: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    marginTop: 1,
  },
  cancelSummaryBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
  },
  cancelMovieName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  cancelShowMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
    marginBottom: 10,
  },
  cancelBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  breakdownLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  breakdownVal: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  breakdownFee: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 8,
  },
  refundHighlightLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  refundHighlightVal: {
    color: COLORS.success || '#22C55E',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  keepTicketBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  keepTicketText: {
    color: COLORS.text,
    fontSize: 12.5,
    fontWeight: '700',
  },
  confirmCancelBtn: {
    flex: 1.2,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  confirmCancelText: {
    color: COLORS.white,
    fontSize: 12.5,
    fontWeight: '700',
  },
  reviewModalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
  },
  reviewModalTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  reviewModalSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  starSelectorBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starTouchBtn: {
    padding: 3,
  },
  ratingMoodText: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  reviewFieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tagChipActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.16)',
    borderColor: '#FBBF24',
  },
  tagChipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  tagChipTextActive: {
    color: '#FDE68A',
    fontWeight: '700',
  },
  reviewTextInput: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 12.5,
    minHeight: 78,
    textAlignVertical: 'top',
  },
  viewRatingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
  },
  viewStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewRatingScore: {
    color: '#FDE68A',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 4,
  },
  viewTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  viewTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  viewTagText: {
    color: '#FDE68A',
    fontSize: 10.5,
    fontWeight: '700',
  },
  viewReviewBody: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
});