import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Dimensions, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apartmentsApi, swipeApi, matchesApi } from '../services/api';
import { showAlert } from '../utils/alert';
import { useAuthStore } from '../store/useAuthStore';
import type { MainStackParamList, Amenity } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { C, Dark } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import SwipeHouseLogo from '../components/SwipeHouseLogo';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { fontFamily } from '../theme/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AMENITY_LABELS: Record<Amenity, string> = {
  parking:     '🚗 חניה',
  balcony:     '🌿 מרפסת',
  elevator:    '🛗 מעלית',
  ac:          '❄️ מזגן',
  storage:     '📦 מחסן',
  furnished:   '🛋️ מרוהטת',
  sun_boiler:  '☀️ דוד שמש',
  pets_allowed:'🐾 חיות מותרות',
};

type Props = NativeStackScreenProps<MainStackParamList, 'ApartmentDetail'>;

function normalizeApartment(raw: any): any {
  // API may return { apartment: {...} } or the flat object directly
  return raw?.apartment ?? raw;
}

function getImageUrl(img: unknown): string | null {
  if (typeof img === 'string') return img;
  if (img && typeof (img as any).url === 'string') return (img as any).url;
  return null;
}

export default function ApartmentDetailScreen({ route, navigation }: Props) {
  const { apartmentId } = route.params;
  const { user } = useAuthStore();

  const getScoreColor = (score: number) => {
    if (score <= 30) return '#EF4444';
    if (score <= 60) return '#F59E0B';
    if (score <= 80) return '#10B981';
    return '#047857';
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerLogoWrap}>
          <SwipeHouseLogo size="sm" />
        </View>
      ),
      headerTitleAlign: 'center',
    });
  }, [navigation]);

  const [activeImage, setActiveImage] = React.useState(0);
  const [isImageViewerOpen, setImageViewerOpen] = React.useState(false);
  const carouselRef = React.useRef<any>(null);
  const viewerRef = React.useRef<any>(null);

  const { data: rawData, isLoading, isError } = useQuery({
    queryKey: ['apartment', apartmentId],
    queryFn: () => apartmentsApi.getById(apartmentId).then((r) => r.data),
  });

  React.useEffect(() => {
    if (!isImageViewerOpen || !viewerRef.current) return;
    const t = setTimeout(() => {
      viewerRef.current?.scrollTo({ x: activeImage * SCREEN_WIDTH, animated: false });
    }, 0);
    return () => clearTimeout(t);
  }, [isImageViewerOpen, activeImage]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={C.cyan} />
      </SafeAreaView>
    );
  }

  if (isError || !rawData) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>לא ניתן לטעון את הדירה</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>חזור</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Normalize here (after guard) so hooks are never called conditionally
  const apt = normalizeApartment(rawData);
  const street = apt.street ?? apt.neighborhood;

  const images: string[] = (apt.images ?? [])
    .map(getImageUrl)
    .filter((u: string | null): u is string => u !== null);

  const price = Number(apt.price ?? 0);
  const rooms = apt.rooms != null ? Number(apt.rooms) : null;
  const floor = apt.floor != null ? Number(apt.floor) : null;
  const totalFloors = apt.totalFloors != null ? Number(apt.totalFloors) : null;
  const sizeSqm = apt.sizeSqm != null ? Number(apt.sizeSqm) : null;
  const viewCount = apt.viewCount != null ? Number(apt.viewCount) : 0;
  const minLease = apt.minLeasePeriod != null ? Number(apt.minLeasePeriod) : null;
  const hasMultipleImages = images.length > 1;
  const isLuxury = price > 15000;

  function scrollToImage(index: number) {
    if (!images.length) return;
    const normalized = ((index % images.length) + images.length) % images.length;
    carouselRef.current?.scrollTo({ x: normalized * SCREEN_WIDTH, animated: true });
    viewerRef.current?.scrollTo({ x: normalized * SCREEN_WIDTH, animated: true });
    setActiveImage(normalized);
  }

  function nextImage() {
    scrollToImage(activeImage + 1);
  }

  function prevImage() {
    scrollToImage(activeImage - 1);
  }

  const isOwner = apt.landlordId === user?.id;

  const handleScheduleVisit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const matchesRes = await matchesApi.list();
      const existingMatch = matchesRes.data.matches?.find(
        (m: any) => m.apartmentId === apt.id
      );

      if (existingMatch) {
        navigation.navigate('Chat', {
          matchId: existingMatch.id,
          title: apt.landlord?.firstName + ' ' + apt.landlord?.lastName
        });
        return;
      }

      const swipeRes = await swipeApi.record(apt.id, 'like');
      const { match } = swipeRes.data;

      if (match?.status === 'accepted') {
        showAlert('יש התאמה! 🎉', 'המשכיר אישר — תוכלו לדבר עכשיו!', [
          {
            text: 'פתח צ׳אט',
            onPress: () => {
              navigation.navigate('Chat', {
                matchId: match.id,
                title: apt.landlord?.firstName + ' ' + apt.landlord?.lastName
              });
            }
          }
        ]);
      } else {
        showAlert(
          'הבקשה נשלחה ✉️',
          'המשכיר קיבל התראה על ההתעניינות שלך. ברגע שיאשר, ייפתח ביניכם צ׳אט.'
        );
      }
    } catch (err: any) {
      showAlert('שגיאה', 'לא ניתן לשלוח בקשה כרגע. אנא נסה שנית מאוחר יותר.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 80 }}>
        {/* Image carousel */}
        {images.length > 0 ? (
          <View>
            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveImage(idx);
              }}
            >
              {images.map((uri, i) => (
                <View key={i} style={styles.carouselSlide}>
                  <TouchableOpacity
                    activeOpacity={0.95}
                    onPress={() => {
                      setActiveImage(i);
                      setImageViewerOpen(true);
                    }}
                  >
                    <Image source={{ uri }} style={styles.carouselImage} contentFit="cover" />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.5)']}
                      style={styles.carouselGradient}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            {hasMultipleImages && (
              <>
                <TouchableOpacity style={[styles.carouselArrow, styles.carouselArrowLeft]} onPress={prevImage} activeOpacity={0.85}>
                  <Ionicons name="chevron-back" size={24} color={C.onInverse.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.carouselArrow, styles.carouselArrowRight]} onPress={nextImage} activeOpacity={0.85}>
                  <Ionicons name="chevron-forward" size={24} color={C.onInverse.primary} />
                </TouchableOpacity>
              </>
            )}
            {hasMultipleImages && (
              <View style={styles.dotRow}>
                {images.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dot, i === activeImage && styles.dotActive]}
                    onPress={() => {
                      carouselRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true });
                      setActiveImage(i);
                    }}
                    activeOpacity={0.7}
                  />
                ))}
              </View>
            )}
            {isLuxury && (
              <View style={styles.luxuryBadge}>
                <Ionicons name="diamond-outline" size={11} color={C.navy} />
                <Text style={styles.luxuryBadgeText}>יוקרה</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Ionicons name="home-outline" size={64} color={C.textMut} />
          </View>
        )}

        {/* Back button overlay */}
        <TouchableOpacity style={styles.floatingBack} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={C.onInverse.primary} />
        </TouchableOpacity>

        <ResponsiveContainer>
        <View style={styles.content}>
          {/* Price + verified badge */}
          <View style={styles.titleRow}>
            <Text style={styles.price}>₪{price.toLocaleString()}/חודש</Text>
            {apt.landlord?.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={C.cyan} />
                <Text style={styles.verifiedText}>מאומת</Text>
              </View>
            )}
          </View>

          {apt.title ? <Text style={styles.title}>{apt.title}</Text> : null}

          {/* Location */}
          {(apt.city || street || apt.address) && (
            <Text style={styles.location}>
              <Ionicons name="location-outline" size={14} color={C.textMut} />
              {' '}
              {[apt.address, street, apt.city].filter(Boolean).join(', ')}
            </Text>
          )}

          {/* Stats row */}
          <View style={styles.statsRow}>
            {rooms != null && <Stat icon="bed-outline" value={`${rooms % 1 === 0 ? rooms : rooms.toFixed(1)} חד׳`} />}
            {floor != null && (
              <Stat
                icon="layers-outline"
                value={totalFloors != null ? `קומה ${floor}/${totalFloors}` : `קומה ${floor}`}
              />
            )}
            {sizeSqm != null && <Stat icon="expand-outline" value={`${sizeSqm} מ"ר`} />}
            <Stat icon="eye-outline" value={`${viewCount} צפיות`} />
          </View>

          {/* Extra details row */}
          <View style={styles.detailsWrap}>
            {apt.availableFrom && (
              <DetailChip
                icon="calendar-outline"
                label={`זמין מ: ${new Date(apt.availableFrom).toLocaleDateString('he-IL')}`}
              />
            )}
            {minLease != null && (
              <DetailChip icon="time-outline" label={`מינימום ${minLease} חודשים`} />
            )}
            {apt.petsAllowed && (
              <DetailChip icon="paw-outline" label="חיות מחמד מותרות" />
            )}
          </View>

          {/* Monthly cost breakdown (F4) */}
          {apt.costBreakdown && (
            <>
              <Text style={styles.sectionTitle}>עלות חודשית משוערת</Text>
              <View style={styles.costCard}>
                <CostRow label="שכר דירה" amount={apt.costBreakdown.rent} />
                <CostRow label="ארנונה (הערכה)" amount={apt.costBreakdown.arnonaEstimate} />
                <CostRow label="ועד בית (הערכה)" amount={apt.costBreakdown.buildingFeeEstimate} />
                <View style={styles.costDivider} />
                <CostRow label="סה״כ משוער" amount={apt.costBreakdown.total} bold />
                <Text style={styles.costNote}>{apt.costBreakdown.note}</Text>
              </View>
            </>
          )}

          {/* Amenities */}
          {apt.amenities?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>שירותים ומתקנים</Text>
              <View style={styles.amenitiesWrap}>
                {apt.amenities.map((a: Amenity) => (
                  <View key={a} style={styles.amenityChip}>
                    <Text style={styles.amenityText}>{AMENITY_LABELS[a] ?? a}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Description */}
          {apt.description ? (
            <>
              <Text style={styles.sectionTitle}>תיאור</Text>
              <Text style={styles.description}>{apt.description}</Text>
            </>
          ) : null}

          {/* Landlord info */}
          {apt.landlord && (
            <>
              <Text style={styles.sectionTitle}>בעל הדירה</Text>
              <TouchableOpacity
                style={styles.landlordRow}
                onPress={() => {
                  navigation.navigate('LandlordProfile', {
                    landlord: apt.landlord,
                    apartmentId: apt.id,
                  });
                }}
                activeOpacity={0.8}
              >
                {apt.landlord.avatarUrl ? (
                  <Image source={{ uri: apt.landlord.avatarUrl }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Ionicons name="person" size={20} color={C.textMut} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                    <Text style={styles.landlordName}>
                      {apt.landlord.firstName} {apt.landlord.lastName}
                    </Text>
                    {apt.landlord.trustScore != null && (
                      <TouchableOpacity
                        onLongPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                          showAlert(
                            'מדד אמינות משכיר',
                            `ציון אמינות: ${apt.landlord.trustScore}/100\n\nהציון מחושב אוטומטית לפי פרמטרים של אימות זהות (KYC), היסטוריית חוזים מוצלחת, אישור בעלות על הנכס ומהירות הטיפול בתקלות.`
                          );
                        }}
                        activeOpacity={0.7}
                        style={[
                          styles.trustBadgeMini,
                          { backgroundColor: getScoreColor(apt.landlord.trustScore) }
                        ]}
                      >
                        <Text style={styles.trustBadgeMiniText}>{apt.landlord.trustScore}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {apt.landlord.isVerified && (
                    <Text style={[styles.verifiedText, { textAlign: 'right', marginTop: 2 }]}>✓ משתמש מאומת</Text>
                  )}
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
        </ResponsiveContainer>
      </ScrollView>

      {/* ── Sticky bottom CTA ── */}
      <View style={styles.ctaBar}>
        <View style={styles.ctaPrice}>
          <Text style={styles.ctaPriceAmount}>₪{price.toLocaleString()}</Text>
          <Text style={styles.ctaPriceLabel}>/חודש</Text>
        </View>
        {isOwner ? (
          <TouchableOpacity
            style={[styles.ctaMainBtn, { backgroundColor: dirApp.secondary }]}
            onPress={() => {
              navigation.navigate('EditListing', { apartmentId: apt.id });
            }}
          >
            <Ionicons name="pencil-outline" size={16} color={Dark.bg} />
            <Text style={styles.ctaMainBtnText}>ערוך מודעה</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.ctaMainBtn} onPress={handleScheduleVisit}>
            <Ionicons name="calendar-outline" size={16} color={Dark.bg} />
            <Text style={styles.ctaMainBtnText}>קבע ביקור</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={isImageViewerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setImageViewerOpen(false)}
      >
        <View style={styles.viewerBackdrop}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setImageViewerOpen(false)}>
            <Ionicons name="close" size={28} color={C.onInverse.primary} />
          </TouchableOpacity>
          <ScrollView
            ref={viewerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.viewerCarousel}
            contentOffset={{ x: activeImage * SCREEN_WIDTH, y: 0 }}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveImage(idx);
            }}
          >
            {images.map((uri, i) => (
              <View key={`viewer-${i}`} style={styles.viewerSlide}>
                <Image source={{ uri }} style={styles.viewerImage} contentFit="contain" />
              </View>
            ))}
          </ScrollView>
          {hasMultipleImages && (
            <>
              <TouchableOpacity style={[styles.viewerArrow, styles.viewerArrowLeft]} onPress={prevImage} activeOpacity={0.85}>
                <Ionicons name="chevron-back" size={30} color={C.onInverse.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.viewerArrow, styles.viewerArrowRight]} onPress={nextImage} activeOpacity={0.85}>
                <Ionicons name="chevron-forward" size={30} color={C.onInverse.primary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={C.cyan} />
      <Text style={styles.statText}>{value}</Text>
    </View>
  );
}

function DetailChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.detailChip}>
      <Ionicons name={icon} size={14} color={C.textMut} />
      <Text style={styles.detailChipText}>{label}</Text>
    </View>
  );
}

function CostRow({ label, amount, bold }: { label: string; amount: number; bold?: boolean }) {
  return (
    <View style={styles.costRow}>
      <Text style={[styles.costAmount, bold && styles.costAmountBold]}>₪{amount.toLocaleString()}</Text>
      <Text style={[styles.costLabel, bold && styles.costLabelBold]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Dark.bg },
  headerLogoWrap: { alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Dark.bg },
  carouselSlide: { width: SCREEN_WIDTH, height: 380, backgroundColor: C.surface.imageCarousel, justifyContent: 'center', alignItems: 'center' },
  carouselImage: { width: SCREEN_WIDTH, height: 380 },
  carouselGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
  luxuryBadge: {
    position: 'absolute', top: 16, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.cyan, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  luxuryBadgeText: { color: C.navy, fontSize: 11, fontWeight: '700', fontFamily: fontFamily.bold },
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Dark.surface, paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: Dark.border,
  },
  ctaPrice: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  ctaPriceAmount: { fontSize: 20, fontWeight: '800', color: C.cyan, fontFamily: fontFamily.bold },
  ctaPriceLabel: { fontSize: 12, color: C.textMut, fontFamily: fontFamily.regular },
  ctaMainBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.cyan, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 12,
  },
  ctaMainBtnText: { color: Dark.bg, fontWeight: '700', fontSize: 14, fontFamily: fontFamily.bold },
  carouselArrow: {
    position: 'absolute',
    top: 178,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.overlay.scrim45,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  carouselArrowLeft: { left: 12 },
  carouselArrowRight: { right: 12 },
  noImagePlaceholder: { height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: Dark.surface },
  floatingBack: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: C.overlay.scrim50, borderRadius: 20, padding: 8,
  },
  dotRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, marginBottom: 4, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.navyMidAlpha(0.5) },
  dotActive: { backgroundColor: C.cyan, width: 20, borderRadius: 4 },
  content: { paddingVertical: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  price: { fontSize: 24, fontWeight: '800', color: C.cyan, fontFamily: fontFamily.bold },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.cyanAlpha(0.12), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  verifiedText: { color: C.cyan, fontSize: 12, fontWeight: '600', fontFamily: fontFamily.semibold },
  title: { fontSize: 18, fontWeight: '700', color: C.onInverse.primary, textAlign: 'right', marginBottom: 6, fontFamily: fontFamily.bold },
  location: { fontSize: 14, color: C.textMut, textAlign: 'right', marginBottom: 16, fontFamily: fontFamily.regular },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Dark.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: Dark.border },
  statText: { color: C.onInverse.primary, fontSize: 13, fontFamily: fontFamily.regular },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.onInverse.primary, textAlign: 'right', marginBottom: 10, marginTop: 4, fontFamily: fontFamily.bold },
  amenitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  amenityChip: { backgroundColor: C.cyanAlpha(0.12), borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.cyan },
  amenityText: { color: C.cyan, fontSize: 13, fontFamily: fontFamily.regular },
  description: { color: C.onInverse.tertiary, fontSize: 14, lineHeight: 22, textAlign: 'right', marginBottom: 20, fontFamily: fontFamily.regular },
  landlordRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: Dark.surface, justifyContent: 'center', alignItems: 'center' },
  landlordName: { color: C.onInverse.primary, fontSize: 14, fontWeight: '600', fontFamily: fontFamily.semibold },
  detailsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Dark.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: Dark.border },
  detailChipText: { color: C.textMut, fontSize: 12, fontFamily: fontFamily.regular },
  viewerBackdrop: { flex: 1, backgroundColor: C.overlay.scrim94, justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 48, right: 20, zIndex: 10, padding: 8 },
  viewerCarousel: { width: SCREEN_WIDTH, height: '85%' },
  viewerSlide: { width: SCREEN_WIDTH, height: '100%', justifyContent: 'center', alignItems: 'center' },
  viewerImage: { width: SCREEN_WIDTH, height: '100%' },
  viewerArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.overlay.scrim45,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  viewerArrowLeft: { left: 14 },
  viewerArrowRight: { right: 14 },
  errorText: { color: C.danger, fontSize: 16, marginBottom: 16, fontFamily: fontFamily.regular },
  backBtn: { backgroundColor: C.cyan, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backBtnText: { color: dirApp.primary, fontWeight: '700', fontFamily: fontFamily.bold },
  costCard: { backgroundColor: Dark.surface, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Dark.border },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  costLabel: { color: C.textMut, fontSize: 14, textAlign: 'right', fontFamily: fontFamily.regular },
  costLabelBold: { color: C.onInverse.primary, fontWeight: '700', fontSize: 15, fontFamily: fontFamily.bold },
  costAmount: { color: C.onInverse.tertiary, fontSize: 14, fontFamily: fontFamily.regular },
  costAmountBold: { color: C.cyan, fontWeight: '800', fontSize: 16, fontFamily: fontFamily.bold },
  costDivider: { height: 1, backgroundColor: Dark.border, marginVertical: 8 },
  costNote: { color: C.textMut, fontSize: 11, textAlign: 'right', marginTop: 8, fontFamily: fontFamily.regular },
  trustBadgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustBadgeMiniText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
});
