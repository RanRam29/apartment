import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apartmentsApi } from '../services/api';
import type { MainStackParamList, Amenity } from '../types';

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

  const { data: rawData, isLoading, isError } = useQuery({
    queryKey: ['apartment', apartmentId],
    queryFn: () => apartmentsApi.getById(apartmentId).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#6C5CE7" />
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image carousel */}
        {images.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setActiveImage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
              }
            >
              {images.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.carouselImage} contentFit="cover" />
              ))}
            </ScrollView>
            {images.length > 1 && (
              <View style={styles.dotRow}>
                {images.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Ionicons name="home-outline" size={64} color="#3A3A5E" />
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
              <Ionicons name="location-outline" size={14} color="#A0A0B2" />
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
                    <Ionicons name="person" size={20} color="#A0A0B2" />
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
    </SafeAreaView>
  );
}

function Stat({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color="#6C5CE7" />
      <Text style={styles.statText}>{value}</Text>
    </View>
  );
}

function DetailChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.detailChip}>
      <Ionicons name={icon} size={14} color="#A0A0B2" />
      <Text style={styles.detailChipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A2E' },
  carouselImage: { width: SCREEN_WIDTH, height: 280 },
  noImagePlaceholder: { height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2A2A3E' },
  floatingBack: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8,
  },
  dotRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3A3A5E' },
  dotActive: { backgroundColor: '#6C5CE7', width: 16 },
  content: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  price: { fontSize: 24, fontWeight: '800', color: '#6C5CE7' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,210,211,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  verifiedText: { color: '#00D2D3', fontSize: 12, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'right', marginBottom: 6 },
  location: { fontSize: 14, color: '#A0A0B2', textAlign: 'right', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2A2A3E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statText: { color: '#fff', fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#fff', textAlign: 'right', marginBottom: 10, marginTop: 4 },
  amenitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  amenityChip: { backgroundColor: 'rgba(108,92,231,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#6C5CE7' },
  amenityText: { color: '#6C5CE7', fontSize: 13 },
  description: { color: '#C0C0D0', fontSize: 14, lineHeight: 22, textAlign: 'right', marginBottom: 20 },
  landlordRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: '#2A2A3E', justifyContent: 'center', alignItems: 'center' },
  landlordName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  detailsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#2A2A3E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  detailChipText: { color: '#A0A0B2', fontSize: 12 },
  errorText: { color: '#FF4757', fontSize: 16, marginBottom: 16 },
  backBtn: { backgroundColor: '#6C5CE7', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backBtnText: { color: '#fff', fontWeight: '700' },
});
