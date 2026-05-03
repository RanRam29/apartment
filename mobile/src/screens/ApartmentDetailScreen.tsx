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
import { C } from '../theme';
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

export default function ApartmentDetailScreen({ route, navigation }: Props) {
  const { apartmentId } = route.params;

  const { data: apt, isLoading, isError } = useQuery({
    queryKey: ['apartment', apartmentId],
    queryFn: () => apartmentsApi.getById(apartmentId).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={C.navy} />
      </SafeAreaView>
    );
  }

  if (isError || !apt) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>לא ניתן לטעון את הדירה</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>חזור</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const [activeImage, setActiveImage] = React.useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image carousel */}
        {apt.images?.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setActiveImage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
              }
            >
              {apt.images.map((img: { url: string }, i: number) => (
                <Image key={i} source={{ uri: img.url }} style={styles.carouselImage} contentFit="cover" />
              ))}
            </ScrollView>
            <View style={styles.dotRow}>
              {apt.images.map((_: unknown, i: number) => (
                <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Ionicons name="home-outline" size={64} color={C.border} />
          </View>
        )}

        {/* Back button overlay */}
        <TouchableOpacity style={styles.floatingBack} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.titleRow}>
            <Text style={styles.price}>₪{apt.price.toLocaleString()}/חודש</Text>
            {apt.landlord?.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={C.cyan} />
                <Text style={styles.verifiedText}>מאומת</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{apt.title}</Text>
          <Text style={styles.location}>
            <Ionicons name="location-outline" size={14} color={C.textSub} />
            {' '}{apt.city}{apt.neighborhood ? ` · ${apt.neighborhood}` : ''}
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <Stat icon="bed-outline" value={`${apt.rooms} חד׳`} />
            {apt.floor !== null && <Stat icon="layers-outline" value={`קומה ${apt.floor}`} />}
            {apt.sizeSqm && <Stat icon="expand-outline" value={`${apt.sizeSqm} מ"ר`} />}
            <Stat icon="eye-outline" value={`${apt.viewCount} צפיות`} />
          </View>

          {/* Amenities */}
          {apt.amenities?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>שירותים</Text>
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
                    <Ionicons name="person" size={20} color={C.textSub} />
                  </View>
                )}
                <Text style={styles.landlordName}>
                  {apt.landlord.firstName} {apt.landlord.lastName}
                </Text>
                {apt.landlord.isVerified && (
                  <Ionicons name="checkmark-circle" size={16} color={C.cyan} style={{ marginLeft: 4 }} />
                )}
              </View>
            </>
          )}

          {apt.availableFrom && (
            <Text style={styles.availableFrom}>
              זמין מ: {new Date(apt.availableFrom).toLocaleDateString('he-IL')}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={C.navy} />
      <Text style={styles.statText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  carouselImage: { width: SCREEN_WIDTH, height: 280 },
  noImagePlaceholder: { height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bgCard },
  floatingBack: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8,
  },
  dotRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  dotActive: { backgroundColor: C.navy, width: 16 },
  content: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  price: { fontSize: 24, fontWeight: '800', color: C.navy },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.cyanAlpha(0.1), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  verifiedText: { color: C.cyan, fontSize: 12, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: C.text, textAlign: 'right', marginBottom: 6 },
  location: { fontSize: 14, color: C.textSub, textAlign: 'right', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  stat: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.bgCard, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
  },
  statText: { color: C.text, fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, textAlign: 'right', marginBottom: 10, marginTop: 4 },
  amenitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  amenityChip: {
    backgroundColor: C.navyAlpha(0.06), borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.navyAlpha(0.15),
  },
  amenityText: { color: C.navy, fontSize: 13 },
  description: { color: C.textSub, fontSize: 14, lineHeight: 22, textAlign: 'right', marginBottom: 20 },
  landlordRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: C.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  landlordName: { color: C.text, fontSize: 14, fontWeight: '600' },
  availableFrom: { color: C.textSub, fontSize: 13, textAlign: 'right', marginTop: 4 },
  errorText: { color: C.coral, fontSize: 16, marginBottom: 16 },
  backBtn: { backgroundColor: C.navy, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backBtnText: { color: '#fff', fontWeight: '700' },
});
