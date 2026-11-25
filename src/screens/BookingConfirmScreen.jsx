import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  ActivityIndicator,
  Vibration,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { verifyRazorpayPaymentOnBackend } from '../services/razorpayPayment';

const API_URL = String(
  process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000'
).replace(/\/+$/, '');

const UPI_APPS = ['GPay', 'PhonePe', 'Paytm', 'BHIM'];
const BANKS = ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank'];
const REQUEST_TIMEOUT_MS = 9000;

function triggerHaptic(type = 'light') {
  try {
    if (type === 'success') {
      Vibration.vibrate([0, 75, 50, 120]);
    } else if (type === 'error') {
      Vibration.vibrate([0, 110, 55, 110]);
    } else if (type === 'medium') {
      Vibration.vibrate([0, 32, 20, 24]);
    } else {
      Vibration.vibrate(20);
    }
  } catch (_) {}
}

function normalizeSeatCode(code) {
  return String(code || '').trim().toUpperCase();
}

function areArraysEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function formatCardNumber(raw) {
  const digits = String(raw || '')
    .replace(/\D/g, '')
    .slice(0, 16);
  return (digits.match(/.{1,4}/g) || []).join(' ');
}

function formatExpiry(raw) {
  const digits = String(raw || '')
    .replace(/\D/g, '')
    .slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function detectCardBrand(formattedCard) {
  const digits = String(formattedCard || '').replace(/\D/g, '');
  if (!digits) return 'CARD';
  if (digits.startsWith('4')) return 'VISA';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'MASTERCARD';
  if (/^(60|65|81|82|508)/.test(digits)) return 'RUPAY';
  return 'CARD';
}

function YouTubeGlareBlock({ sweepAnim, pulseAnim, style }) {
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.45, 0.72, 0.45],
  });

  const glareTranslateX = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 260],
  });

  return (
    <Animated.View
      style={[styles.ytSkeletonBlock, { opacity: pulseOpacity }, style]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ytGlareBeam,
          { transform: [{ translateX: glareTranslateX }, { rotate: '18deg' }] },
        ]}
      />
    </Animated.View>
  );
}

function YouTubeSeatingSkeleton({ sweepAnim, pulseAnim }) {
  const rows = ['A', 'B'];
  const cols = [1, 2, 3, 4];

  return (
    <View style={styles.ytSeatingCard}>
      <View style={styles.ytTopBar}>
        <YouTubeGlareBlock
          sweepAnim={sweepAnim}
          pulseAnim={pulseAnim}
          style={styles.ytScreenBar}
        />
        <YouTubeGlareBlock
          sweepAnim={sweepAnim}
          pulseAnim={pulseAnim}
          style={styles.ytLiveBadgeSkel}
        />
      </View>

      {rows.map((rowLetter) => (
        <View key={`yt-row-${rowLetter}`} style={styles.ytRow}>
          <YouTubeGlareBlock
            sweepAnim={sweepAnim}
            pulseAnim={pulseAnim}
            style={styles.ytRowLabelSkel}
          />
          <View style={styles.ytSeatsGroup}>
            {cols.map((colNum) => (
              <YouTubeGlareBlock
                key={`yt-seat-${rowLetter}-${colNum}`}
                sweepAnim={sweepAnim}
                pulseAnim={pulseAnim}
                style={styles.ytSeatSkel}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function BookingConfirmScreen({ route, navigation, onAddBooking }) {
  const params = route?.params || {};
  const {
    movie,
    selectedDate,
    selectedTime,
    selectedTiming,
    showId,
    selectedSeats = [],
    bookedSeats = [],
    lockedSeats = [],
    totalAmount = 0,
    isLoadingSeats = false,
  } = params;

  const authContext = useAuth() || {};
  const { userId, user, getToken, token } = authContext;

  const activeUserId = userId || user?.uid || user?._id || 'demo-user-001';
  const displayTime = selectedTime || selectedTiming || '07:00 PM';

  const selectedSeatsKey = JSON.stringify(
    Array.isArray(selectedSeats) ? selectedSeats : []
  );
  const bookedSeatsKey = JSON.stringify([
    ...(Array.isArray(bookedSeats) ? bookedSeats : []),
    ...(Array.isArray(lockedSeats) ? lockedSeats : []),
  ]);

  const [serverBookedSeats, setServerBookedSeats] = useState([]);
  const [initialSelectableSeats, setInitialSelectableSeats] = useState([]);
  const [activeSeats, setActiveSeats] = useState([]);

  useEffect(() => {
    let parsedBooked = [];
    let parsedSelected = [];
    try {
      parsedBooked = Array.from(
        new Set(
          JSON.parse(bookedSeatsKey)
            .map(normalizeSeatCode)
            .filter(Boolean)
        )
      );
    } catch (_) {}

    const bookedLookup = new Set(parsedBooked);

    try {
      parsedSelected = Array.from(
        new Set(
          JSON.parse(selectedSeatsKey)
            .map(normalizeSeatCode)
            .filter((code) => code && !bookedLookup.has(code))
        )
      );
    } catch (_) {}

    setServerBookedSeats((prev) =>
      areArraysEqual(prev, parsedBooked) ? prev : parsedBooked
    );
    setInitialSelectableSeats((prev) =>
      areArraysEqual(prev, parsedSelected) ? prev : parsedSelected
    );
    setActiveSeats((prev) =>
      areArraysEqual(prev, parsedSelected) ? prev : parsedSelected
    );
  }, [selectedSeatsKey, bookedSeatsKey]);

  const occupiedSet = useMemo(
    () => new Set(serverBookedSeats.map(normalizeSeatCode)),
    [serverBookedSeats]
  );

  const perSeatPrice = useMemo(() => {
    const passed = Number(totalAmount || 0);
    const totalCount = Array.isArray(selectedSeats) ? selectedSeats.length : 0;
    if (passed > 0 && totalCount > 0) {
      return Math.round(passed / totalCount);
    }
    return 180;
  }, [totalAmount, selectedSeats]);

  const removedSeats = useMemo(
    () =>
      initialSelectableSeats.filter(
        (s) => !activeSeats.includes(s) && !occupiedSet.has(s)
      ),
    [initialSelectableSeats, activeSeats, occupiedSet]
  );

  const computedBaseAmount = useMemo(
    () => activeSeats.length * perSeatPrice,
    [activeSeats.length, perSeatPrice]
  );

  const convenienceFee =
    computedBaseAmount > 0
      ? Math.max(Math.round(computedBaseAmount * 0.04), 10)
      : 0;
  const payableAmount = computedBaseAmount + convenienceFee;

  const [formError, setFormError] = useState('');
  const [sheetError, setSheetError] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [selectedUpiApp, setSelectedUpiApp] = useState('GPay');
  const [upiId, setUpiId] = useState('sidharth@okicici');

  const [cardNumber, setCardNumber] = useState('4532 8910 2234 4242');
  const [cardHolder, setCardHolder] = useState(user?.name || 'Sidharth Das');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('424');

  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [activeOrder, setActiveOrder] = useState(null);

  const [gatewayStage, setGatewayStage] = useState('idle');
  const [gatewayStatusText, setGatewayStatusText] = useState('');
  const [failureMessage, setFailureMessage] = useState('');
  const [seatsUnlocked, setSeatsUnlocked] = useState(false);
  const [txnId, setTxnId] = useState('');

  const ytSweepAnim = useRef(new Animated.Value(0)).current;
  const ytPulseAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.5)).current;
  const stepTimerRef = useRef(null);
  const redirectTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  const cardBrand = useMemo(() => detectCardBrand(cardNumber), [cardNumber]);

  useEffect(() => {
    isMountedRef.current = true;

    const sweepLoop = Animated.loop(
      Animated.timing(ytSweepAnim, {
        toValue: 1,
        duration: 1350,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ytPulseAnim, {
          toValue: 1,
          duration: 675,
          useNativeDriver: true,
        }),
        Animated.timing(ytPulseAnim, {
          toValue: 0,
          duration: 675,
          useNativeDriver: true,
        }),
      ])
    );

    sweepLoop.start();
    pulseLoop.start();

    return () => {
      isMountedRef.current = false;
      sweepLoop.stop();
      pulseLoop.stop();
      if (stepTimerRef.current) {
        clearTimeout(stepTimerRef.current);
        stepTimerRef.current = null;
      }
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [ytSweepAnim, ytPulseAnim]);

  useEffect(() => {
    if (user?.name) {
      setCardHolder((prev) => prev || user.name);
    }
  }, [user?.name]);

  const resolveAuthToken = useCallback(async () => {
    try {
      if (typeof user?.getIdToken === 'function') {
        return await user.getIdToken(true);
      }
      if (typeof getToken === 'function') {
        return await getToken();
      }
      if (typeof token === 'string' && token.length > 0) {
        return token;
      }
      if (typeof user?.token === 'string' && user.token.length > 0) {
        return user.token;
      }
    } catch (_) {}
    return '';
  }, [user, getToken, token]);

  const handleToggleSeat = useCallback(
    (seatCode) => {
      const code = normalizeSeatCode(seatCode);
      if (!code) return;

      if (occupiedSet.has(code)) {
        triggerHaptic('error');
        setActiveSeats((prev) => prev.filter((item) => item !== code));
        setFormError(`Seat ${code} is already booked and cannot be selected.`);
        return;
      }

      triggerHaptic('light');
      setFormError('');
      setActiveSeats((prev) => {
        if (prev.includes(code)) {
          return prev.filter((item) => item !== code);
        }
        return [...prev, code];
      });
    },
    [occupiedSet]
  );

  const handleRestoreAllSeats = useCallback(() => {
    triggerHaptic('light');
    setFormError('');
    setActiveSeats(initialSelectableSeats.filter((s) => !occupiedSet.has(s)));
  }, [initialSelectableSeats, occupiedSet]);

  const createBackendOrderWithFallback = useCallback(async () => {
    const authToken = await resolveAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      'x-user-id': String(activeUserId),
    };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const controller =
      typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      : null;

    try {
      const response = await fetch(`${API_URL}/api/booking/create`, {
        method: 'POST',
        headers,
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify({
          showId,
          selectedSeats: activeSeats,
          userId: activeUserId,
          amount: payableAmount,
        }),
      });

      if (timeoutId) clearTimeout(timeoutId);

      const data = await response.json();

      const conflictSeats = Array.isArray(data?.bookedSeats)
        ? data.bookedSeats.map(normalizeSeatCode)
        : Array.isArray(data?.alreadyBookedSeats)
          ? data.alreadyBookedSeats.map(normalizeSeatCode)
          : [];

      if (conflictSeats.length > 0) {
        setServerBookedSeats((prev) =>
          Array.from(new Set([...prev, ...conflictSeats]))
        );
        setActiveSeats((prev) =>
          prev.filter((s) => !conflictSeats.includes(s))
        );
      }

      if (response.status === 409 || data?.code === 'SEAT_ALREADY_BOOKED') {
        return {
          conflictError:
            data?.message ||
            'Some selected seats were just booked by another user.',
          isSimulated: false,
        };
      }

      if (response.ok && data && data.orderId) {
        return {
          ...data,
          isSimulated: false,
        };
      }
      throw new Error(data?.message || 'Order response incomplete');
    } catch (_) {
      if (timeoutId) clearTimeout(timeoutId);
      return {
        success: true,
        orderId: `order_sim_${Date.now()}`,
        bookingId: `bk_sim_${Date.now()}`,
        amount: payableAmount,
        isSimulated: true,
      };
    }
  }, [resolveAuthToken, activeUserId, showId, activeSeats, payableAmount]);

  const handleOpenPaymentSheet = async () => {
    setFormError('');
    setSheetError('');
    setFailureMessage('');
    setSeatsUnlocked(false);

    const validSeats = activeSeats.filter((s) => !occupiedSet.has(s));
    if (validSeats.length !== activeSeats.length) {
      setActiveSeats(validSeats);
      triggerHaptic('error');
      setFormError(
        'Already booked seats were removed. Please review your seats.'
      );
      return;
    }

    if (validSeats.length === 0) {
      triggerHaptic('error');
      setFormError('Select or restore at least one available seat before paying.');
      return;
    }

    triggerHaptic('medium');
    setIsCreatingOrder(true);
    setGatewayStage('processing');
    setGatewayStatusText('Checking seat availability & preparing checkout...');

    const orderMeta = await createBackendOrderWithFallback();

    if (!isMountedRef.current) return;
    setIsCreatingOrder(false);

    if (orderMeta?.conflictError) {
      setGatewayStage('idle');
      triggerHaptic('error');
      setFormError(orderMeta.conflictError);
      return;
    }

    setActiveOrder(orderMeta);
    setGatewayStage('idle');
    setPaymentSheetVisible(true);
  };

  const validateInputs = () => {
    if (paymentMethod === 'upi') {
      const cleanUpi = String(upiId || '').trim().toLowerCase();
      if (!/^[a-z0-9._-]{2,40}@[a-z]{2,20}$/.test(cleanUpi)) {
        return 'Enter a valid UPI ID (example: name@okicici).';
      }
      return '';
    }

    if (paymentMethod === 'card') {
      const digits = String(cardNumber || '').replace(/\D/g, '');
      if (digits.length < 15 || digits.length > 16) {
        return 'Enter a valid 15 or 16-digit card number.';
      }
      if (String(cardHolder || '').trim().length < 2) {
        return 'Enter cardholder name.';
      }
      const parts = String(cardExpiry || '').split('/');
      const mm = Number(parts[0] || 0);
      const yy = Number(parts[1] || 0);
      if (
        parts.length !== 2 ||
        String(cardExpiry).length !== 5 ||
        mm < 1 ||
        mm > 12 ||
        yy < 26
      ) {
        return 'Enter valid expiry in MM/YY format.';
      }
      const cleanCvv = String(cardCvv || '').replace(/\D/g, '');
      if (cleanCvv.length < 3 || cleanCvv.length > 4) {
        return 'Enter valid 3 or 4-digit CVV.';
      }
      return '';
    }

    if (!String(selectedBank || '').trim()) {
      return 'Select a bank to continue.';
    }
    return '';
  };

  const handleConfirmPayment = async () => {
    if (isVerifying) return;

    const validationErr = validateInputs();
    if (validationErr) {
      triggerHaptic('error');
      setSheetError(validationErr);
      return;
    }

    triggerHaptic('medium');

    const currentOrder = activeOrder || {
      orderId: `order_sim_${Date.now()}`,
      bookingId: `bk_sim_${Date.now()}`,
      isSimulated: true,
    };

    setFormError('');
    setSheetError('');
    setFailureMessage('');
    setSeatsUnlocked(false);
    setPaymentSheetVisible(false);
    setIsVerifying(true);
    setGatewayStage('processing');

    const cardDigits = String(cardNumber || '').replace(/\D/g, '');
    const last4 = cardDigits.slice(-4) || '4242';

    if (paymentMethod === 'upi') {
      setGatewayStatusText(
        `Sending ${selectedUpiApp} payment request to ${upiId.trim()}...`
      );
    } else if (paymentMethod === 'card') {
      setGatewayStatusText(
        `Processing ${cardBrand} card ending in ${last4}...`
      );
    } else {
      setGatewayStatusText(`Authorizing payment with ${selectedBank}...`);
    }

    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    stepTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setGatewayStatusText('Locking seats & generating confirmed pass...');
      }
    }, 650);

    const simulatedPaymentId = `pay_${paymentMethod}_${Date.now()}`;
    const simulatedSignature = `sig_${paymentMethod}_${last4}_${Date.now()}`;

    let verifiedBooking = null;
    let verifiedPaymentRef = simulatedPaymentId;

    try {
      if (!currentOrder.isSimulated) {
        const authToken = await resolveAuthToken();
        const verifyRes = await Promise.race([
          verifyRazorpayPaymentOnBackend({
            apiUrl: API_URL,
            bookingId: currentOrder.bookingId,
            paymentResponse: {
              razorpay_order_id: currentOrder.orderId,
              razorpay_payment_id: simulatedPaymentId,
              razorpay_signature: simulatedSignature,
            },
            authToken,
            userId: activeUserId,
          }),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Verification timed out.'));
            }, REQUEST_TIMEOUT_MS);
          }),
        ]);

        if (verifyRes && verifyRes.success) {
          verifiedBooking = verifyRes.booking || null;
          verifiedPaymentRef =
            verifiedBooking?.razorpayPaymentId || simulatedPaymentId;
        }
      }
    } catch (_) {
      verifiedPaymentRef = simulatedPaymentId;
    }

    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }

    if (!isMountedRef.current) return;

    setServerBookedSeats((prev) =>
      Array.from(new Set([...prev, ...activeSeats]))
    );

    const paymentModeText =
      paymentMethod === 'upi'
        ? `${selectedUpiApp} (${String(upiId || '').trim().toLowerCase()})`
        : paymentMethod === 'card'
          ? `${cardBrand} •••• ${last4}`
          : `NetBanking (${selectedBank})`;

    setIsVerifying(false);
    setTxnId(String(verifiedPaymentRef));
    setGatewayStage('success');
    setGatewayStatusText('');
    triggerHaptic('success');

    successScale.setValue(0.45);
    Animated.spring(successScale, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();

    const showTimeText = `${selectedDate || 'Upcoming'}, 2026 at ${displayTime}`;
    const ticketData = {
      id: String(
        verifiedBooking?._id || currentOrder.bookingId || verifiedPaymentRef
      ),
      userId: activeUserId,
      movieTitle: movie?.title || 'QuickShow Movie',
      duration: movie?.duration || '2h 15m',
      showTimeLabel: showTimeText,
      amount: payableAmount,
      seats: activeSeats,
      bookedSeats: activeSeats,
      status: 'Confirmed',
      paymentStatus: 'Paid',
      isPaid: true,
      razorpayOrderId: currentOrder.orderId,
      razorpayPaymentId: verifiedPaymentRef,
      poster:
        movie?.poster ||
        movie?.poster_path ||
        movie?.backdrop ||
        'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      paymentMode: paymentModeText,
    };

    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = setTimeout(() => {
      if (typeof onAddBooking === 'function') {
        onAddBooking(ticketData);
      }
      if (!isMountedRef.current) return;
      setGatewayStage('idle');

      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MoviesList' }],
        });
        const parentNav =
          typeof navigation.getParent === 'function'
            ? navigation.getParent()
            : null;
        if (parentNav && typeof parentNav.navigate === 'function') {
          parentNav.navigate('MyBookings');
        }
      } catch (_) {}
    }, 1500);
  };

  const handleRetryAfterFailure = async () => {
    triggerHaptic('medium');
    setGatewayStage('idle');
    setFailureMessage('');
    setSheetError('');
    setFormError('');
    await handleConfirmPayment();
  };

  const showSeatingSkeleton = Boolean(isLoadingSeats || isCreatingOrder);
  const isBusy =
    showSeatingSkeleton ||
    isVerifying ||
    paymentSheetVisible ||
    gatewayStage !== 'idle';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            navigation.goBack();
          }}
          disabled={isBusy}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout & Payment</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.movieTitle} numberOfLines={1}>
                {movie?.title || 'Movie Ticket'}
              </Text>
              <Text style={styles.showMeta}>
                {selectedDate || '25 Nov'} • {displayTime}
              </Text>
            </View>
            <View style={styles.amountBadge}>
              <Text style={styles.amountLabel}>TOTAL</Text>
              <Text style={styles.amountValue}>₹{payableAmount}</Text>
            </View>
          </View>

          <View style={styles.seatsSection}>
            <View style={styles.seatsHeaderRow}>
              <Text style={styles.seatsHeading}>Selected Seats</Text>
              <View style={styles.seatsHeaderRight}>
                {removedSeats.length > 0 && !showSeatingSkeleton ? (
                  <TouchableOpacity
                    onPress={handleRestoreAllSeats}
                    style={styles.restoreAllBtn}
                  >
                    <Ionicons
                      name="refresh"
                      size={11}
                      color={COLORS.primary}
                    />
                    <Text style={styles.restoreAllText}>Restore All</Text>
                  </TouchableOpacity>
                ) : null}
                <Text style={styles.seatsCountBadge}>
                  {activeSeats.length}{' '}
                  {activeSeats.length === 1 ? 'Seat' : 'Seats'}
                </Text>
              </View>
            </View>

            {showSeatingSkeleton ? (
              <YouTubeSeatingSkeleton
                sweepAnim={ytSweepAnim}
                pulseAnim={ytPulseAnim}
              />
            ) : activeSeats.length > 0 ? (
              <View style={styles.seatChipsWrap}>
                {activeSeats.map((seatCode) => (
                  <TouchableOpacity
                    key={seatCode}
                    activeOpacity={0.8}
                    disabled={isBusy}
                    onPress={() => handleToggleSeat(seatCode)}
                    style={styles.seatChip}
                  >
                    <Text style={styles.seatChipText}>{seatCode}</Text>
                    <Ionicons
                      name="close-circle"
                      size={14}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.emptySeatsText}>
                No available seats active. Restore seats or pick new seats.
              </Text>
            )}

            {!showSeatingSkeleton && serverBookedSeats.length > 0 ? (
              <View style={styles.bookedSection}>
                <Text style={styles.bookedLabel}>
                  Booked (Locked - Cannot Book Again):
                </Text>
                <View style={styles.seatChipsWrap}>
                  {serverBookedSeats.map((bookedCode) => (
                    <TouchableOpacity
                      key={`booked-${bookedCode}`}
                      activeOpacity={0.9}
                      onPress={() => handleToggleSeat(bookedCode)}
                      style={styles.bookedSeatChip}
                    >
                      <Ionicons
                        name="lock-closed"
                        size={11}
                        color="#F87171"
                      />
                      <Text style={styles.bookedSeatText}>{bookedCode}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            {!showSeatingSkeleton && removedSeats.length > 0 ? (
              <View style={styles.removedSection}>
                <Text style={styles.removedLabel}>
                  Removed (tap to add back):
                </Text>
                <View style={styles.seatChipsWrap}>
                  {removedSeats.map((seatCode) => (
                    <TouchableOpacity
                      key={`rem-${seatCode}`}
                      activeOpacity={0.8}
                      disabled={isBusy}
                      onPress={() => handleToggleSeat(seatCode)}
                      style={styles.removedSeatChip}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={13}
                        color={COLORS.textSecondary}
                      />
                      <Text style={styles.removedSeatText}>{seatCode}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          {convenienceFee > 0 ? (
            <Text style={styles.feeNote}>
              {activeSeats.length} × ₹{perSeatPrice} (₹{computedBaseAmount}) +
              Fee ₹{convenienceFee}
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Payment Methods</Text>
        <View style={styles.gatewayCard}>
          <View style={styles.gatewayHeaderRow}>
            <View style={styles.gatewayBrandRow}>
              <View style={styles.razorpayBadge}>
                <Text style={styles.razorpayBadgeText}>Razorpay</Text>
              </View>
              <Text style={styles.gatewayTitle}>UPI • Card • NetBanking</Text>
            </View>

            <View style={styles.secureTag}>
              <Ionicons
                name="shield-checkmark"
                size={12}
                color={COLORS.success || '#22C55E'}
              />
              <Text style={styles.secureTagText}>Haptic Pay</Text>
            </View>
          </View>

          <Text style={styles.infoNote}>
            Pay via UPI ID, Card, or NetBanking with instant seat lock & haptic
            feedback.
          </Text>
        </View>

        {formError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={COLORS.primary} />
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={isBusy ? 1 : 0.88}
          onPress={handleOpenPaymentSheet}
          disabled={isBusy}
          style={[styles.payNowBtn, isBusy && styles.payNowBtnDisabled]}
        >
          {isCreatingOrder || isVerifying ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons name="lock-closed" size={16} color={COLORS.white} />
          )}
          <Text style={styles.payNowBtnText}>
            {isCreatingOrder
              ? 'Preparing Order...'
              : isVerifying
                ? 'Processing Payment...'
                : `Pay ₹${payableAmount}`}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={paymentSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          triggerHaptic('light');
          setPaymentSheetVisible(false);
          setSheetError('');
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetBackdrop}
        >
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetBrand}>Razorpay Checkout</Text>
                <Text style={styles.sheetOrder} numberOfLines={1}>
                  Order: {activeOrder?.orderId || 'order_ready'} • ₹
                  {payableAmount}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('light');
                  setPaymentSheetVisible(false);
                  setSheetError('');
                }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.methodRow}>
              {[
                { key: 'upi', label: 'UPI' },
                { key: 'card', label: 'CARD' },
                { key: 'netbanking', label: 'NETBANKING' },
              ].map((item) => {
                const active = paymentMethod === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => {
                      triggerHaptic('light');
                      setPaymentMethod(item.key);
                      setSheetError('');
                    }}
                    style={[
                      styles.methodChip,
                      active && styles.methodChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.methodText,
                        active && styles.methodTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {paymentMethod === 'upi' && (
              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Popular UPI Apps</Text>
                <View style={styles.upiAppsRow}>
                  {UPI_APPS.map((app) => {
                    const active = selectedUpiApp === app;
                    return (
                      <TouchableOpacity
                        key={app}
                        onPress={() => {
                          triggerHaptic('light');
                          setSelectedUpiApp(app);
                        }}
                        style={[
                          styles.upiAppChip,
                          active && styles.upiAppChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.upiAppText,
                            active && styles.upiAppTextActive,
                          ]}
                        >
                          {app}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>UPI ID</Text>
                <TextInput
                  value={upiId}
                  onChangeText={(text) => {
                    setUpiId(text);
                    if (sheetError) setSheetError('');
                  }}
                  placeholder="yourname@okicici"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.fieldInput}
                />
              </View>
            )}

            {paymentMethod === 'card' && (
              <View style={styles.fieldBox}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.fieldLabel}>Card Number</Text>
                  <View style={styles.cardBrandBadge}>
                    <Text style={styles.cardBrandText}>{cardBrand}</Text>
                  </View>
                </View>
                <TextInput
                  value={cardNumber}
                  onChangeText={(text) => {
                    setCardNumber(formatCardNumber(text));
                    if (sheetError) setSheetError('');
                  }}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  maxLength={19}
                  style={styles.fieldInput}
                />

                <Text style={styles.fieldLabel}>Cardholder Name</Text>
                <TextInput
                  value={cardHolder}
                  onChangeText={(text) => {
                    setCardHolder(text);
                    if (sheetError) setSheetError('');
                  }}
                  placeholder="Name on card"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.fieldInput}
                />

                <View style={styles.cardSplitRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Expiry (MM/YY)</Text>
                    <TextInput
                      value={cardExpiry}
                      onChangeText={(text) => {
                        setCardExpiry(formatExpiry(text));
                        if (sheetError) setSheetError('');
                      }}
                      placeholder="12/28"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="number-pad"
                      maxLength={5}
                      style={styles.fieldInput}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>CVV</Text>
                    <TextInput
                      value={cardCvv}
                      onChangeText={(text) => {
                        setCardCvv(text.replace(/\D/g, '').slice(0, 4));
                        if (sheetError) setSheetError('');
                      }}
                      placeholder="123"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={4}
                      style={styles.fieldInput}
                    />
                  </View>
                </View>
              </View>
            )}

            {paymentMethod === 'netbanking' && (
              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Choose Bank</Text>
                <View style={styles.banksList}>
                  {BANKS.map((bank) => {
                    const active = selectedBank === bank;
                    return (
                      <TouchableOpacity
                        key={bank}
                        onPress={() => {
                          triggerHaptic('light');
                          setSelectedBank(bank);
                          if (sheetError) setSheetError('');
                        }}
                        style={[
                          styles.bankOption,
                          active && styles.bankOptionActive,
                        ]}
                      >
                        <Ionicons
                          name={active ? 'radio-button-on' : 'radio-button-off'}
                          size={15}
                          color={active ? '#2B84EA' : COLORS.textMuted}
                        />
                        <Text
                          style={[
                            styles.bankOptionText,
                            active && styles.bankOptionTextActive,
                          ]}
                        >
                          {bank}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {sheetError ? (
              <View style={styles.sheetErrorBox}>
                <Ionicons name="warning" size={14} color="#FDA4AF" />
                <Text style={styles.sheetErrorText}>{sheetError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleConfirmPayment}
              style={styles.confirmPayBtn}
            >
              <Text style={styles.confirmPayText}>
                Confirm & Pay ₹{payableAmount}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={gatewayStage !== 'idle'}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.gatewayModalCard}>
            {gatewayStage === 'processing' ? (
              <>
                <View style={styles.spinnerRing}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
                <Text style={styles.modalHeading}>Please Wait</Text>
                <Text style={styles.modalSubText}>{gatewayStatusText}</Text>
                <View style={styles.modalAmountPill}>
                  <Text style={styles.modalAmountText}>
                    Amount: ₹{payableAmount}
                  </Text>
                </View>
              </>
            ) : gatewayStage === 'failed' ? (
              <>
                <View style={styles.failedCircle}>
                  <Ionicons
                    name="alert-outline"
                    size={32}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.modalHeading}>Payment Paused</Text>
                <Text style={styles.modalSubText}>{failureMessage}</Text>
                <Text style={styles.unlockStatusText}>
                  {seatsUnlocked
                    ? 'Seats unlocked on server'
                    : 'Seats ready for retry'}
                </Text>
                <View style={styles.failedRow}>
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic('light');
                      setGatewayStage('idle');
                      setPaymentSheetVisible(true);
                    }}
                    style={styles.secondaryActionBtn}
                  >
                    <Text style={styles.secondaryActionText}>Edit Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleRetryAfterFailure}
                    style={styles.primaryRetryBtn}
                  >
                    <Text style={styles.primaryRetryText}>Retry Pay</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Animated.View
                  style={[
                    styles.successCircle,
                    { transform: [{ scale: successScale }] },
                  ]}
                >
                  <Ionicons name="checkmark" size={36} color={COLORS.white} />
                </Animated.View>
                <Text style={styles.successHeading}>Booking Confirmed!</Text>
                <Text style={styles.modalSubText}>
                  ₹{payableAmount} paid successfully
                </Text>
                {txnId ? (
                  <Text style={styles.txnCodeText}>REF: {txnId}</Text>
                ) : null}
                <Text style={styles.redirectHint}>
                  Opening My Bookings...
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 115,
  },
  ytSkeletonBlock: {
    backgroundColor: '#2B2432',
    overflow: 'hidden',
    borderRadius: 8,
  },
  ytGlareBeam: {
    width: 58,
    height: '240%',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  ytSeatingCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 10,
  },
  ytTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 2,
  },
  ytScreenBar: {
    flex: 1,
    height: 10,
    borderRadius: 999,
  },
  ytLiveBadgeSkel: {
    width: 56,
    height: 14,
    borderRadius: 6,
  },
  ytRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ytRowLabelSkel: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  ytSeatsGroup: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  ytSeatSkel: {
    flex: 1,
    height: 28,
    borderRadius: 7,
  },
  summaryCard: {
    backgroundColor: COLORS.roseCard,
    borderWidth: 1,
    borderColor: COLORS.roseBorder,
    borderRadius: 14,
    padding: 14,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  movieTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  showMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  amountBadge: {
    alignItems: 'flex-end',
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  amountLabel: {
    color: COLORS.textMuted,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  amountValue: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '800',
  },
  seatsSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  seatsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  seatsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seatsHeading: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  restoreAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  restoreAllText: {
    color: COLORS.primary,
    fontSize: 10.5,
    fontWeight: '700',
  },
  seatsCountBadge: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  seatChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 9,
  },
  seatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  seatChipText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  emptySeatsText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  bookedSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(248, 113, 113, 0.2)',
  },
  bookedLabel: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '700',
  },
  bookedSeatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    opacity: 0.72,
  },
  bookedSeatText: {
    color: '#FCA5A5',
    fontSize: 11.5,
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  removedSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  removedLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  removedSeatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.cardBorder,
  },
  removedSeatText: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  feeNote: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 8,
  },
  sectionLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 10,
  },
  gatewayCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    padding: 14,
  },
  gatewayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 6,
  },
  gatewayBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  razorpayBadge: {
    backgroundColor: '#2B84EA',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  razorpayBadgeText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  gatewayTitle: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  secureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  secureTagText: {
    color: COLORS.success || '#22C55E',
    fontSize: 10.5,
    fontWeight: '700',
  },
  infoNote: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  errorBanner: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.roseCard,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  errorText: {
    color: COLORS.text,
    fontSize: 12,
    flex: 1,
  },
  payNowBtn: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payNowBtnDisabled: {
    opacity: 0.65,
  },
  payNowBtnText: {
    color: COLORS.white,
    fontSize: 14.5,
    fontWeight: '800',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetBrand: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  sheetOrder: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  methodChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  methodChipActive: {
    backgroundColor: '#2B84EA',
    borderColor: '#2B84EA',
  },
  methodText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  methodTextActive: {
    color: COLORS.white,
  },
  fieldBox: {
    marginBottom: 12,
  },
  upiAppsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  upiAppChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  upiAppChipActive: {
    borderColor: '#2B84EA',
    backgroundColor: 'rgba(43, 132, 234, 0.16)',
  },
  upiAppText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  upiAppTextActive: {
    color: COLORS.text,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardBrandBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardBrandText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  cardSplitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  banksList: {
    gap: 7,
  },
  bankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  bankOptionActive: {
    borderColor: '#2B84EA',
    backgroundColor: 'rgba(43, 132, 234, 0.12)',
  },
  bankOptionText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  bankOptionTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 5,
  },
  fieldInput: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: COLORS.text,
    fontSize: 13,
    marginBottom: 8,
  },
  sheetErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.45)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  sheetErrorText: {
    color: '#FDA4AF',
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  confirmPayBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
  },
  confirmPayText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.84)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  gatewayModalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 22,
    alignItems: 'center',
  },
  spinnerRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: COLORS.roseCard,
    borderWidth: 1,
    borderColor: COLORS.roseBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  failedCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(244, 63, 94, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  unlockStatusText: {
    color: '#86EFAC',
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 8,
  },
  failedRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 16,
  },
  secondaryActionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  primaryRetryBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryRetryText: {
    color: COLORS.white,
    fontSize: 12.5,
    fontWeight: '800',
  },
  modalHeading: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSubText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 6,
  },
  modalAmountPill: {
    marginTop: 12,
    backgroundColor: COLORS.surface || COLORS.bg,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalAmountText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  successCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.success || '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successHeading: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
  },
  txnCodeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  redirectHint: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    marginTop: 10,
    textAlign: 'center',
  },
});