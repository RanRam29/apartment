import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Apartment } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
export const CARD_WIDTH  = SCREEN_WIDTH - 24;
export const CARD_HEIGHT = SCREEN_HEIGHT * 0.68;

interface Props {
  apartment: Apartment;
  isTop?: boolean;
}

export default function ApartmentCard({ apartment, isTop = false }: Props) {
  const firstImage = apartment.images?.[0]?.url;

  return (
    <View style={styles.card}>
      {/* Full-screen image */}
      <Image
        source={{ uri: firstImage || 'https://via.placeholder.com/400x600?text=No+Image' }}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
      />

      {/* Verified badge */}
      {apartment.landlord?.isVerified && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#fff" />
          <Text style={styles.verifiedText}>מאומת</Text>
        </View>
      )}

      {/* Image count */}
      {apartment.images?.length > 1 && (
        <View style={styles.imageCount}>
          <Text style={styles.imageCountText}>1 / {apartment.images.length}</Text>
        </View>
      )}

      {/* Bottom info — 4 key data points only */}
      <View style={styles.info}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>₪{apartment.price.toLocaleString()}</Text>
          <Text style={styles.priceLabel}>/חודש</Text>
        </View>

        <Text style={styles.title} numberOfLines={1}>{apartment.title}</Text>

        <View style={styles.metaRow}>
          <MetaChip icon="location-outline" label={`${apartment.city}${apartment.neighborhood ? ` · ${apartment.neighborhood}` : ''}`} />
          <MetaChip icon="bed-outline" label={`${apartment.rooms} חדרים`} />
          {apartment.sizeSqm && <MetaChip icon="resize-outline" label={`${apartment.sizeSqm} מ"ר`} />}
        </View>

        {/* Landlord */}
        <View style={styles.landlordRow}>
          <Text style={styles.landlordName}>
            {apartment.landlord?.firstName} {apartment.landlord?.lastName}
          </Text>
          {apartment.availableFrom && (
            <Text style={styles.availableFrom}>
              פנוי מ-{new Date(apartment.availableFrom).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function MetaChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={12} color="#fff" />
      <Text style={styles.chipText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#2A2A3E',
  },
  image: { width: '100%', height: '100%', position: 'absolute' },
  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
  },
  verifiedBadge: {
    position: 'absolute', top: 16, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(108,92,231,0.9)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  imageCount: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  imageCountText: { color: '#fff', fontSize: 11 },
  info: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 24,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 4 },
  price: { fontSize: 26, fontWeight: '800', color: '#fff' },
  priceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  title: { fontSize: 16, color: '#fff', fontWeight: '600', marginBottom: 10, textAlign: 'right' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  chipText: { color: '#fff', fontSize: 11 },
  landlordRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  landlordName: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  availableFrom: { color: '#6C5CE7', fontSize: 12, fontWeight: '600' },
});
