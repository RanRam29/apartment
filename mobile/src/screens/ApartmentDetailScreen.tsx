import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Dimensions, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apartmentsApi } from '../services/api';
import type { MainStackParamList, Amenity } from '../types';
import { C, Dark } from '../theme';

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
                    <Image source={{ uri }} style={styles.carouselImage} contentFit="contain" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            {hasMultipleImages && (
              <>
                <TouchableOpacity style={[styles.carouselArrow, styles.carouselArrowLeft]} onPress={prevImage} activeOpacity={0.85}>
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.carouselArrow, styles.carouselArrowRight]} onPress={nextImage} activeOpacity={0.85}>
                  <Ionicons name="chevron-forward" size={24} color="#fff" />
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
          </View>
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Ionicons name="home-outline" size={64} color={C.textMut} />
          </View>
        )}

        {/* Back button overlay */}
        <TouchableOpacity style={styles.floatingBack} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Price + verified badge */}
          <View style={styles.titleRow}>
            <Text style={styles.price}>₪{price.toLocaleString()}/חודש</Text>
            {apt.landlord?.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#00D2D3" />
                <Text style={styles.verifiedText}>מאומת</Text>
              </View>
            )}
          </View>

          {apt.title ? <Text style={styles.title}>{apt.title}</Text> : null}

          {/* Location */}
          {(apt.city || apt.neighborhood || apt.address) && (
            <Text style={styles.location}>
              <Ionicons name="location-outline" size={14} color={C.textMut} />
              {' '}
              {[apt.address, apt.neighborhood, apt.city].filter(Boolean).join(', ')}
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
              <View style={styles.landlordRow}>
                {apt.landlord.avatarUrl ? (
                  <Image source={{ uri: apt.landlord.avatarUrl }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Ionicons name="person" size={20} color={C.textMut} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.landlordName}>
                    {apt.landlord.firstName} {apt.landlord.lastName}
                  </Text>
                  {apt.landlord.isVerified && (
                    <Text style={styles.verifiedText}>✓ משתמש מאומת</Text>
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={isImageViewerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setImageViewerOpen(false)}
      >
        <View style={styles.viewerBackdrop}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setImageViewerOpen(false)}>
            <Ionicons name="close" size={28} color="#fff" />
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
                <Ionicons name="chevron-back" size={30} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.viewerArrow, styles.viewerArrowRight]} onPress={nextImage} activeOpacity={0.85}>
                <Ionicons name="chevron-forward" size={30} color="#fff" />
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Dark.bg },
  carouselSlide: { width: SCREEN_WIDTH, height: 320, backgroundColor: '#111122', justifyContent: 'center', alignItems: 'center' },
  carouselImage: { width: SCREEN_WIDTH, height: 320 },
  carouselArrow: {
    position: 'absolute',
    top: 145,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  carouselArrowLeft: { left: 12 },
  carouselArrowRight: { right: 12 },
  noImagePlaceholder: { height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: Dark.surface },
  floatingBack: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8,
  },
  dotRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, marginBottom: 4, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.navyMidAlpha(0.5) },
  dotActive: { backgroundColor: C.cyan, width: 20, borderRadius: 4 },
  content: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  price: { fontSize: 24, fontWeight: '800', color: C.cyan },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.cyanAlpha(0.12), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  verifiedText: { color: C.cyan, fontSize: 12, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'right', marginBottom: 6 },
  location: { fontSize: 14, color: C.textMut, textAlign: 'right', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Dark.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: Dark.border },
  statText: { color: '#fff', fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#fff', textAlign: 'right', marginBottom: 10, marginTop: 4 },
  amenitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  amenityChip: { backgroundColor: C.cyanAlpha(0.12), borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.cyan },
  amenityText: { color: C.cyan, fontSize: 13 },
  description: { color: '#C0C0D0', fontSize: 14, lineHeight: 22, textAlign: 'right', marginBottom: 20 },
  landlordRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: Dark.surface, justifyContent: 'center', alignItems: 'center' },
  landlordName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  detailsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Dark.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: Dark.border },
  detailChipText: { color: C.textMut, fontSize: 12 },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center', alignItems: 'center' },
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  viewerArrowLeft: { left: 14 },
  viewerArrowRight: { right: 14 },
  errorText: { color: C.danger, fontSize: 16, marginBottom: 16 },
  backBtn: { backgroundColor: C.cyan, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backBtnText: { color: C.navy, fontWeight: '700' },
  costCard: { backgroundColor: Dark.surface, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Dark.border },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  costLabel: { color: C.textMut, fontSize: 14, textAlign: 'right' },
  costLabelBold: { color: '#fff', fontWeight: '700', fontSize: 15 },
  costAmount: { color: '#C0C0D0', fontSize: 14 },
  costAmountBold: { color: C.cyan, fontWeight: '800', fontSize: 16 },
  costDivider: { height: 1, backgroundColor: Dark.border, marginVertical: 8 },
  costNote: { color: C.textMut, fontSize: 11, textAlign: 'right', marginTop: 8 },
});
