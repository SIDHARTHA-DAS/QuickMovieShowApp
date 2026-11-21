import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { BBSR_THEATERS } from '../data/bbsrTheaters';

const AREAS = [
  'All',
  'Rasulgarh',
  'Saheed Nagar',
  'Gajapati Nagar',
  'Master Canteen',
  'Khandagiri',
];

function AnimatedTheaterCard({ theater, index, onOpenShowcase }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const [expanded, setExpanded] = useState(index === 0);

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(18);

    const delay = Math.min(index * 70, 280);
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 18,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [theater.id, index, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => setExpanded((prev) => !prev)}
      >
        <View style={styles.bannerWrap}>
          <Image
            source={{ uri: theater.banner }}
            style={styles.bannerImg}
            resizeMode="cover"
          />
          <View style={styles.bannerBadge}>
            <Text style={styles.bannerBadgeText}>{theater.badge}</Text>
          </View>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={12} color={COLORS.primary} />
            <Text style={styles.ratingPillText}>{theater.rating}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <Text style={styles.theaterName} numberOfLines={1}>
                {theater.name}
              </Text>
              <View style={styles.locationRow}>
                <Ionicons
                  name="location-outline"
                  size={13}
                  color={COLORS.textMuted}
                />
                <Text style={styles.addressText} numberOfLines={1}>
                  {theater.address}
                </Text>
              </View>
            </View>

            <View style={styles.priceBox}>
              <Text style={styles.fromText}>From</Text>
              <Text style={styles.priceText}>₹{theater.startingPrice}</Text>
            </View>
          </View>

          <View style={styles.chipsRow}>
            {theater.screenTypes.map((type) => (
              <View key={type} style={styles.screenChip}>
                <Ionicons
                  name="tv-outline"
                  size={12}
                  color={COLORS.primary}
                />
                <Text style={styles.screenChipText}>{type}</Text>
              </View>
            ))}
            <View style={styles.screensCountChip}>
              <Text style={styles.screensCountText}>
                {theater.screensCount} Screens
              </Text>
            </View>
          </View>

          {expanded ? (
            <View style={styles.detailsDrawer}>
              <Text style={styles.subHeading}>Facilities & Experience</Text>
              <View style={styles.amenitiesGrid}>
                {theater.amenities.map((item) => (
                  <View key={item} style={styles.amenityTag}>
                    <Ionicons
                      name="checkmark-circle"
                      size={13}
                      color={COLORS.success}
                    />
                    <Text style={styles.amenityText}>{item}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.subHeading}>Sample Show Slots</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.slotsRow}
              >
                {theater.timings.map((slot) => (
                  <View key={slot} style={styles.slotPill}>
                    <Text style={styles.slotText}>{slot}</Text>
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => onOpenShowcase(theater)}
                style={styles.bookActionBtn}
              >
                <Ionicons name="sparkles-outline" size={15} color={COLORS.white} />
                <Text style={styles.bookActionText}>
                  Screens, Images & Seat Types
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={15}
                  color={COLORS.white}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.expandHintRow}>
              <Text style={styles.expandHintText}>
                Tap to view facilities & screen seat showcase
              </Text>
              <Ionicons
                name="chevron-down"
                size={15}
                color={COLORS.textMuted}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function TheaterScreenShowcaseModal({
  theater,
  onClose,
  onExploreMovies,
}) {
  const screens = theater?.screens || [];
  const [selectedScreenIdx, setSelectedScreenIdx] = useState(0);
  const [selectedSeatTypeIdx, setSelectedSeatTypeIdx] = useState(0);

  const previewAnim = useRef(new Animated.Value(1)).current;
  const previewSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setSelectedScreenIdx(0);
    setSelectedSeatTypeIdx(0);
  }, [theater?.id]);

  useEffect(() => {
    setSelectedSeatTypeIdx(0);
    previewAnim.setValue(0.35);
    previewSlide.setValue(10);

    Animated.parallel([
      Animated.timing(previewAnim, {
        toValue: 1,
        duration: 230,
        useNativeDriver: true,
      }),
      Animated.spring(previewSlide, {
        toValue: 0,
        damping: 18,
        stiffness: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedScreenIdx, previewAnim, previewSlide]);

  if (!theater || screens.length === 0) return null;

  const activeScreen = screens[selectedScreenIdx] || screens[0];
  const seatTypes = activeScreen.seatTypes || [];
  const activeSeatType = seatTypes[selectedSeatTypeIdx] || seatTypes[0];

  return (
    <Modal
      visible={Boolean(theater)}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderTextCol}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {theater.name}
            </Text>
            <Text style={styles.modalSub} numberOfLines={1}>
              {theater.area} • Step-by-Step Screen & Seat Guide
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeIconBtn}>
            <Ionicons name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Step 1: Screen Selector */}
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepPill}>
              <Text style={styles.stepPillText}>STEP 1</Text>
            </View>
            <Text style={styles.stepTitle}>Select Screen / Auditorium</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.screenTabsRow}
          >
            {screens.map((scr, idx) => {
              const active = idx === selectedScreenIdx;
              return (
                <TouchableOpacity
                  key={scr.id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedScreenIdx(idx)}
                  style={[
                    styles.screenTabCard,
                    active && styles.screenTabCardActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.screenTabTitle,
                      active && styles.screenTabTitleActive,
                    ]}
                  >
                    {scr.name}
                  </Text>
                  <Text style={styles.screenTabMeta}>{scr.soundSystem}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Animated Screen Image Preview */}
          <Animated.View
            style={[
              styles.screenPreviewCard,
              {
                opacity: previewAnim,
                transform: [{ translateY: previewSlide }],
              },
            ]}
          >
            <Image
              source={{ uri: activeScreen.screenImage }}
              style={styles.screenPreviewImg}
              resizeMode="cover"
            />
            <View style={styles.screenPreviewOverlay}>
              <View style={styles.screenTagBadge}>
                <Text style={styles.screenTagText}>
                  {activeScreen.screenType}
                </Text>
              </View>
              <Text style={styles.screenPreviewCaption}>
                {activeScreen.soundSystem}
              </Text>
            </View>
            <View style={styles.virtualScreenBar}>
              <View style={styles.virtualScreenLine} />
              <Text style={styles.virtualScreenLabel}>SCREEN VIEW</Text>
            </View>
          </Animated.View>

          {/* Step 2: Seat Types */}
          <View style={[styles.stepHeaderRow, { marginTop: 20 }]}>
            <View style={styles.stepPill}>
              <Text style={styles.stepPillText}>STEP 2</Text>
            </View>
            <Text style={styles.stepTitle}>Compare Seat Types & Comfort</Text>
          </View>

          <View style={styles.seatTypesList}>
            {seatTypes.map((st, idx) => {
              const active = idx === selectedSeatTypeIdx;
              return (
                <TouchableOpacity
                  key={st.tier}
                  activeOpacity={0.85}
                  onPress={() => setSelectedSeatTypeIdx(idx)}
                  style={[
                    styles.seatTypeCard,
                    active && styles.seatTypeCardActive,
                  ]}
                >
                  <View style={styles.seatTypeTop}>
                    <View>
                      <Text style={styles.seatTierName}>{st.tier}</Text>
                      <Text style={styles.seatRowsLabel}>{st.rows}</Text>
                    </View>
                    <Text style={styles.seatTierPrice}>₹{st.price}</Text>
                  </View>
                  <Text style={styles.seatComfortText}>{st.comfort}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected Seat Type Mini Preview */}
          {activeSeatType ? (
            <View style={styles.miniSeatPreviewBox}>
              <Text style={styles.miniPreviewTitle}>
                {activeSeatType.tier} Sample Row Preview
              </Text>
              <View style={styles.miniSeatRow}>
                {(activeSeatType.pattern || ['A', 'S', 'S', 'S', 'A', 'A']).map(
                  (mode, i) => {
                    const isSampleSelected = mode === 'S';
                    return (
                      <View
                        key={i}
                        style={[
                          styles.miniSeatBox,
                          isSampleSelected && styles.miniSeatBoxSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.miniSeatLabel,
                            isSampleSelected && styles.miniSeatLabelSelected,
                          ]}
                        >
                          {activeSeatType.tier.slice(0, 1)}
                          {i + 1}
                        </Text>
                      </View>
                    );
                  }
                )}
              </View>
            </View>
          ) : null}

          {/* Step 3: Screen Showtimes */}
          <View style={[styles.stepHeaderRow, { marginTop: 18 }]}>
            <View style={styles.stepPill}>
              <Text style={styles.stepPillText}>STEP 3</Text>
            </View>
            <Text style={styles.stepTitle}>Screen Show Timings</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.slotsRow}
          >
            {(activeScreen.timings || theater.timings).map((t) => (
              <View key={t} style={styles.slotPill}>
                <Text style={styles.slotText}>{t}</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onExploreMovies}
            style={styles.modalPrimaryBtn}
          >
            <Text style={styles.modalPrimaryBtnText}>
              Select Movie & Book Seats
            </Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function TheatersScreen({ navigation }) {
  const [selectedArea, setSelectedArea] = useState('All');
  const [activeShowcaseTheater, setActiveShowcaseTheater] = useState(null);

  const visibleTheaters =
    selectedArea === 'All'
      ? BBSR_THEATERS
      : BBSR_THEATERS.filter((t) => t.area === selectedArea);

  const handleExploreFromModal = () => {
    setActiveShowcaseTheater(null);
    navigation.navigate('Movies', { screen: 'MoviesList' });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brandText}>
              <Text style={styles.brandAccent}>Quick</Text>Show
            </Text>
            <Text style={styles.citySub}>Bhubaneswar Cinema Halls</Text>
          </View>
          <View style={styles.cityBadge}>
            <Ionicons
              name="business-outline"
              size={14}
              color={COLORS.primary}
            />
            <Text style={styles.cityBadgeText}>Bhubaneswar</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {AREAS.map((area) => {
            const active = area === selectedArea;
            return (
              <TouchableOpacity
                key={area}
                activeOpacity={0.82}
                onPress={() => setSelectedArea(area)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {area}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.list}>
          {visibleTheaters.map((theater, idx) => (
            <AnimatedTheaterCard
              key={theater.id}
              theater={theater}
              index={idx}
              onOpenShowcase={(item) => setActiveShowcaseTheater(item)}
            />
          ))}
        </View>
      </ScrollView>

      <TheaterScreenShowcaseModal
        theater={activeShowcaseTheater}
        onClose={() => setActiveShowcaseTheater(null)}
        onExploreMovies={handleExploreFromModal}
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
    paddingBottom: 102,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  citySub: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    marginTop: 1,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.roseCard,
    borderWidth: 1,
    borderColor: COLORS.roseBorder,
  },
  cityBadgeText: {
    color: COLORS.text,
    fontSize: 11.5,
    fontWeight: '700',
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  bannerWrap: {
    height: 120,
    width: '100%',
    backgroundColor: COLORS.surface,
    position: 'relative',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  bannerBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(9, 5, 8, 0.82)',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bannerBadgeText: {
    color: COLORS.white,
    fontSize: 10.5,
    fontWeight: '700',
  },
  ratingPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(9, 5, 8, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingPillText: {
    color: COLORS.white,
    fontSize: 11.5,
    fontWeight: '700',
  },
  cardBody: {
    padding: 13,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  titleCol: {
    flex: 1,
  },
  theaterName: {
    color: COLORS.text,
    fontSize: 15.5,
    fontWeight: '800',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  addressText: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    flex: 1,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  fromText: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  priceText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 11,
  },
  screenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.roseCard,
    borderWidth: 1,
    borderColor: COLORS.roseBorder,
  },
  screenChipText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
  },
  screensCountChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  screensCountText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  detailsDrawer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  subHeading: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  amenityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  amenityText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  slotsRow: {
    gap: 8,
    marginBottom: 14,
  },
  slotPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  slotText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
  },
  bookActionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bookActionText: {
    color: COLORS.white,
    fontSize: 12.5,
    fontWeight: '700',
  },
  expandHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  expandHintText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalHeaderTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  modalSub: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    marginTop: 2,
  },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 16,
    paddingBottom: 36,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  stepPill: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepPillText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stepTitle: {
    color: COLORS.text,
    fontSize: 14.5,
    fontWeight: '700',
  },
  screenTabsRow: {
    gap: 8,
    marginBottom: 12,
  },
  screenTabCard: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  screenTabCardActive: {
    backgroundColor: COLORS.roseCard,
    borderColor: COLORS.primary,
  },
  screenTabTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  screenTabTitleActive: {
    color: COLORS.white,
  },
  screenTabMeta: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    marginTop: 2,
  },
  screenPreviewCard: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  screenPreviewImg: {
    width: '100%',
    height: 155,
  },
  screenPreviewOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTagBadge: {
    backgroundColor: 'rgba(9, 5, 8, 0.85)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  screenTagText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  screenPreviewCaption: {
    backgroundColor: 'rgba(9, 5, 8, 0.82)',
    color: COLORS.textSecondary,
    fontSize: 10.5,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  virtualScreenBar: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
  },
  virtualScreenLine: {
    width: '68%',
    height: 4,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  virtualScreenLabel: {
    color: COLORS.textMuted,
    fontSize: 9.5,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  seatTypesList: {
    gap: 10,
  },
  seatTypeCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  seatTypeCardActive: {
    backgroundColor: COLORS.roseCard,
    borderColor: COLORS.primary,
  },
  seatTypeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seatTierName: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: '700',
  },
  seatRowsLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  seatTierPrice: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  seatComfortText: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    marginTop: 6,
    lineHeight: 16,
  },
  miniSeatPreviewBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  miniPreviewTitle: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 10,
  },
  miniSeatRow: {
    flexDirection: 'row',
    gap: 7,
  },
  miniSeatBox: {
    width: 34,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniSeatBoxSelected: {
    backgroundColor: COLORS.primary,
  },
  miniSeatLabel: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    fontWeight: '700',
  },
  miniSeatLabelSelected: {
    color: COLORS.white,
  },
  modalPrimaryBtn: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalPrimaryBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});