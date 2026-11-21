import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { createBookingApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const UPI_APPS = [
  { id: 'gpay', label: 'GPay', suffix: '@okicici' },
  { id: 'phonepe', label: 'PhonePe', suffix: '@ybl' },
  { id: 'paytm', label: 'Paytm', suffix: '@paytm' },
];

function formatCardNumberInput(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiryInput(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function triggerSuccessVibration() {
  try {
    // Crisp double-pulse confirmation vibration on payment success
    Vibration.vibrate([0, 80, 65, 130]);
  } catch (e) {
    // Safe fallback if vibration is unavailable on a device
  }
}

export default function BookingConfirmScreen({ route, navigation, onAddBooking }) {
  const {
    movie,
    selectedDate,
    selectedTime,
    showId,
    selectedSeats = [],
    totalAmount = 0,
  } = route.params || {};

  const { userId } = useAuth();

  // Payment Method: 'upi' | 'card'
  const [paymentMethod, setPaymentMethod] = useState('upi');

  // Blank UPI State (user enters their own fake/test UPI ID)
  const [upiId, setUpiId] = useState('');
  const [selectedUpiApp, setSelectedUpiApp] = useState(null);

  // Blank Stripe-style Card State (user enters their own fake/test details)
  const [cardEmail, setCardEmail] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [formError, setFormError] = useState('');

  // Gateway Simulation Modal State: 'idle' | 'processing' | 'success'
  const [gatewayStage, setGatewayStage] = useState('idle');
  const [gatewayStatusText, setGatewayStatusText] = useState('');
  const [txnId, setTxnId] = useState('');

  const successScale = useRef(new Animated.Value(0.5)).current;
  const timersRef = useRef([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  const handleSelectUpiApp = (app) => {
    setSelectedUpiApp(app.id);
    const currentHandle = upiId.trim().split('@')[0];
    if (currentHandle) {
      setUpiId(`${currentHandle}${app.suffix}`);
    }
    setFormError('');
  };

  const validatePaymentInputs = () => {
    if (paymentMethod === 'upi') {
      const trimmed = upiId.trim();
      if (!trimmed || !trimmed.includes('@') || trimmed.length < 5) {
        setFormError('Please enter a valid UPI ID (e.g., user@okicici)');
        return false;
      }
      return true;
    }

    const cleanDigits = cardNumber.replace(/\s/g, '');
    if (!cardEmail.trim() || !cardEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return false;
    }
    if (!cardName.trim()) {
      setFormError('Please enter cardholder name.');
      return false;
    }
    if (cleanDigits.length < 16) {
      setFormError('Please enter a 16-digit card number.');
      return false;
    }
    if (cardExpiry.trim().length < 5) {
      setFormError('Please enter expiry date in MM/YY format.');
      return false;
    }
    if (cardCvv.trim().length < 3) {
      setFormError('Please enter a 3 or 4 digit CVV.');
      return false;
    }
    return true;
  };

  const finalizeAndRedirect = async (generatedTxnId) => {
    const showTimeLabel = `${selectedDate || 'Upcoming'}, 2026 at ${
      selectedTime || '07:00 PM'
    }`;

    let createdBookingId = generatedTxnId;

    if (showId && !String(showId).startsWith('fallback-')) {
      try {
        const apiRes = await createBookingApi({
          showId,
          selectedSeats,
          userId,
        });
        if (apiRes?.bookingId) {
          createdBookingId = String(apiRes.bookingId);
        }
      } catch (err) {
        // Proceed with local booking record smoothly
      }
    }

    const newTicket = {
      id: createdBookingId,
      movieTitle: movie?.title || 'QuickShow Movie',
      duration: movie?.duration || '2h 15m',
      showTimeLabel,
      amount: totalAmount,
      seats: selectedSeats,
      poster:
        movie?.poster ||
        movie?.backdrop ||
        'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      paymentMode:
        paymentMethod === 'upi' ? `UPI (${upiId.trim()})` : 'Card (Stripe)',
    };

    if (typeof onAddBooking === 'function') {
      onAddBooking(newTicket);
    }

    setGatewayStage('idle');

    navigation.reset({
      index: 0,
      routes: [{ name: 'MoviesList' }],
    });

    const parentNav = navigation.getParent();
    if (parentNav) {
      parentNav.navigate('MyBookings');
    }
  };

  const handleStartSimulatedPayment = () => {
    setFormError('');
    if (!validatePaymentInputs()) return;

    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    const newTxn = `QS${Date.now().toString().slice(-7)}`;
    setTxnId(newTxn);
    setGatewayStage('processing');

    if (paymentMethod === 'upi') {
      setGatewayStatusText(`Sending payment request to ${upiId.trim()}...`);
    } else {
      setGatewayStatusText('Connecting to Stripe checkout...');
    }

    const t1 = setTimeout(() => {
      if (paymentMethod === 'upi') {
        setGatewayStatusText('Verifying UPI handle & completing payment...');
      } else {
        setGatewayStatusText('Authorizing card details...');
      }
    }, 1100);

    const t2 = setTimeout(() => {
      setGatewayStage('success');
      triggerSuccessVibration();
      successScale.setValue(0.4);
      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }, 2300);

    const t3 = setTimeout(() => {
      finalizeAndRedirect(newTxn);
    }, 4000);

    timersRef.current.push(t1, t2, t3);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
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
        {/* Booking Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.movieTitle} numberOfLines={1}>
                {movie?.title || 'Movie Ticket'}
              </Text>
              <Text style={styles.showMeta}>
                {selectedDate || '21 Nov'} • {selectedTime || '07:00 PM'}
              </Text>
            </View>
            <View style={styles.amountBadge}>
              <Text style={styles.amountLabel}>TOTAL</Text>
              <Text style={styles.amountValue}>₹{totalAmount}</Text>
            </View>
          </View>

          <View style={styles.seatsRow}>
            <Text style={styles.seatsHeading}>Selected Seats:</Text>
            <Text style={styles.seatsList}>
              {selectedSeats.join(', ') || 'None'}
            </Text>
          </View>
        </View>

        {/* Payment Method Tabs */}
        <Text style={styles.sectionLabel}>Choose Payment Method</Text>
        <View style={styles.methodTabs}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setPaymentMethod('upi');
              setFormError('');
            }}
            style={[
              styles.methodTab,
              paymentMethod === 'upi' && styles.methodTabActive,
            ]}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={18}
              color={paymentMethod === 'upi' ? COLORS.white : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.methodTabText,
                paymentMethod === 'upi' && styles.methodTabTextActive,
              ]}
            >
              UPI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setPaymentMethod('card');
              setFormError('');
            }}
            style={[
              styles.methodTab,
              paymentMethod === 'card' && styles.methodTabActive,
            ]}
          >
            <Ionicons
              name="card-outline"
              size={18}
              color={paymentMethod === 'card' ? COLORS.white : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.methodTabText,
                paymentMethod === 'card' && styles.methodTabTextActive,
              ]}
            >
              Card (Stripe)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Payment Form Container */}
        {paymentMethod === 'upi' ? (
          <View style={styles.gatewayCard}>
            <View style={styles.gatewayHeaderRow}>
              <Text style={styles.gatewayTitle}>UPI Payment</Text>
              <View style={styles.secureTag}>
                <Ionicons name="shield-checkmark" size={12} color={COLORS.success} />
                <Text style={styles.secureTagText}>Simulated UPI</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>UPI App Handle Helper (Optional)</Text>
            <View style={styles.upiChipsRow}>
              {UPI_APPS.map((app) => {
                const active = selectedUpiApp === app.id;
                return (
                  <TouchableOpacity
                    key={app.id}
                    activeOpacity={0.82}
                    onPress={() => handleSelectUpiApp(app)}
                    style={[styles.upiChip, active && styles.upiChipActive]}
                  >
                    <Text
                      style={[
                        styles.upiChipText,
                        active && styles.upiChipTextActive,
                      ]}
                    >
                      {app.label} ({app.suffix})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Enter UPI ID</Text>
            <View style={styles.inputBox}>
              <Ionicons name="at-outline" size={17} color={COLORS.textMuted} />
              <TextInput
                value={upiId}
                onChangeText={(txt) => {
                  setUpiId(txt);
                  setFormError('');
                }}
                placeholder="Enter your UPI ID"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.textInput}
              />
            </View>
          </View>
        ) : (
          <View style={styles.gatewayCard}>
            <View style={styles.gatewayHeaderRow}>
              <View style={styles.stripeBrandRow}>
                <View style={styles.stripeLogoPill}>
                  <Text style={styles.stripeLogoText}>stripe</Text>
                </View>
                <Text style={styles.gatewayTitle}>Card Payment</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={16} color={COLORS.textMuted} />
              <TextInput
                value={cardEmail}
                onChangeText={(txt) => {
                  setCardEmail(txt);
                  setFormError('');
                }}
                placeholder="Enter email address"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.textInput}
              />
            </View>

            <Text style={styles.fieldLabel}>Cardholder Name</Text>
            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={16} color={COLORS.textMuted} />
              <TextInput
                value={cardName}
                onChangeText={(txt) => {
                  setCardName(txt);
                  setFormError('');
                }}
                placeholder="Enter cardholder name"
                placeholderTextColor={COLORS.textMuted}
                style={styles.textInput}
              />
            </View>

            <Text style={styles.fieldLabel}>Card Number</Text>
            <View style={styles.inputBox}>
              <Ionicons name="card" size={16} color={COLORS.primary} />
              <TextInput
                value={cardNumber}
                onChangeText={(txt) => {
                  setCardNumber(formatCardNumberInput(txt));
                  setFormError('');
                }}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={19}
                style={styles.textInput}
              />
            </View>

            <View style={styles.splitRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Expiry Date</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    value={cardExpiry}
                    onChangeText={(txt) => {
                      setCardExpiry(formatExpiryInput(txt));
                      setFormError('');
                    }}
                    placeholder="MM/YY"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                    maxLength={5}
                    style={styles.textInput}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>CVV</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    value={cardCvv}
                    onChangeText={(txt) => {
                      setCardCvv(txt.replace(/\D/g, '').slice(0, 4));
                      setFormError('');
                    }}
                    placeholder="CVV"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                    style={styles.textInput}
                  />
                  <Ionicons
                    name="lock-closed-outline"
                    size={15}
                    color={COLORS.textMuted}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {formError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={COLORS.primary} />
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        ) : null}

        {/* Pay Now CTA */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleStartSimulatedPayment}
          style={styles.payNowBtn}
        >
          <Ionicons name="lock-closed" size={16} color={COLORS.white} />
          <Text style={styles.payNowBtnText}>
            {paymentMethod === 'upi'
              ? `Pay ₹${totalAmount} via UPI`
              : `Pay ₹${totalAmount} with Card`}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Simulated Gateway Processing & Success Modal */}
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
                <Text style={styles.modalHeading}>
                  {paymentMethod === 'upi'
                    ? 'Processing UPI Payment'
                    : 'Stripe Card Checkout'}
                </Text>
                <Text style={styles.modalSubText}>{gatewayStatusText}</Text>
                <View style={styles.modalAmountPill}>
                  <Text style={styles.modalAmountText}>Amount: ₹{totalAmount}</Text>
                </View>
                <Text style={styles.doNotCloseText}>
                  Completing payment... please wait
                </Text>
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
                <Text style={styles.successHeading}>Payment Successful!</Text>
                <Text style={styles.modalSubText}>
                  ₹{totalAmount} paid via{' '}
                  {paymentMethod === 'upi' ? 'UPI' : 'Stripe Card'}
                </Text>
                <Text style={styles.txnCodeText}>TXN ID: {txnId}</Text>
                <Text style={styles.redirectHint}>
                  Redirecting to My Bookings...
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
    paddingBottom: 110,
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
  seatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  seatsHeading: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  seatsList: {
    color: COLORS.text,
    fontSize: 12.5,
    fontWeight: '700',
  },
  sectionLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 10,
  },
  methodTabs: {
    flexDirection: 'row',
    gap: 10,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  methodTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  methodTabText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  methodTabTextActive: {
    color: COLORS.white,
  },
  gatewayCard: {
    marginTop: 14,
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
    marginBottom: 12,
  },
  gatewayTitle: {
    color: COLORS.text,
    fontSize: 14.5,
    fontWeight: '700',
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
    color: COLORS.success,
    fontSize: 10.5,
    fontWeight: '700',
  },
  stripeBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stripeLogoPill: {
    backgroundColor: '#635BFF',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  stripeLogoText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 5,
  },
  upiChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  upiChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  upiChipActive: {
    backgroundColor: COLORS.roseCard,
    borderColor: COLORS.primary,
  },
  upiChipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  upiChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13.5,
    padding: 0,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 10,
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
  payNowBtnText: {
    color: COLORS.white,
    fontSize: 14.5,
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
    backgroundColor: COLORS.surface,
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
  doNotCloseText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 14,
    textAlign: 'center',
  },
  successCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.success,
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