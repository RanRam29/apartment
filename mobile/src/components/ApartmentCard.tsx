import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import type { Apartment } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
export const CARD_WIDTH  = SCREEN_WIDTH - 24;
export const CARD_HEIGHT = SCREEN_HEIGHT * 0.67;

interface Props {
  apartment: Apartment;
  isTop?: boolean;
}

export default function ApartmentCard({ apartment, isTop: _isTop = false }: Props) {
  const firstImage = apartment.images?.[0]?.url;
  const street = apartment.street ?? apartment.neighborhood;

  return (
    <View style={styles.card}>
      <Image
        source={{ uri: firstImage || 'https://via.placeholder.com/400x600?text=No+Image' }}
        style={styles.image}
        contentFit="cover"
        transition={200}
        accessibilityLabel={apartment.title ? `תמונת דירה: ${apartment.title}` : 'תמונת דירה'}
      />

      {/* Soft gradient — lighter than before */}
      <LinearGradient
        colors={['transparent', C.overlay.imageGradientEnd]}
        style={styles.gradient}
      />

      {/* Verified badge */}
      {apartment.landlord?.isVerified && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={13} color={C.cyan} />
          <Text style={styles.verifiedText}>מאומת</Text>
        </View>
      )}

      {/* Image count */}
      {(apartment.images?.length ?? 0) > 1 && (
        <View style={styles.imageCount}>
          <Ionicons name="images-outline" size={11} color={C.onInverse.primary} />
          <Text style={styles.imageCountText}>{apartment.images.length}</Text>
        </View>
      )}

      {/* Bottom info */}
      <View style={styles.info}>
        {/* Price row */}
        <View style={styles.priceRow}>
          <View style={styles.pricePill}>
            <Text style={styles.price}>₪{apartment.price.toLocaleString()}</Text>
            <Text style={styles.priceLabel}>/חודש</Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={1}>{apartment.title}</Text>

        <View style={styles.metaRow}>
          <MetaChip icon="location-outline" label={`${apartment.city}${street ? ` · ${street}` : ''}`} />
          <MetaChip icon="bed-outline" label={`${apartment.rooms} חד׳`} />
          {apartment.sizeSqm ? <MetaChip icon="resize-outline" label={`${apartment.sizeSqm} מ"ר`} /> : null}
        </View>

        <View style={styles.landlordRow}>
          <Text style={styles.availableFrom}>
            {apartment.availableFrom
              ? `פנוי מ-${new Date(apartment.availableFrom).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}`
              : 'פנוי עכשיו'}
          </Text>
          <Text style={styles.landlordName}>
            {apartment.landlord?.firstName} {apartment.landlord?.lastName}
          </Text>
        </View>
      </View>
    </View>
  );
}

function MetaChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={11} color={C.onInverse.secondary} />
      <Text style={styles.chipText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: C.border,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  image: { width: '100%', height: '100%', position: 'absolute' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '58%' },

  verifiedBadge: {
    position: 'absolute', top: 16, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.overlay.scrim45,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  verifiedText: { color: C.onInverse.primary, fontSize: 11, fontWeight: '600' },

  imageCount: {
    position: 'absolute', top: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.overlay.scrim50,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  imageCountText: { color: C.onInverse.primary, fontSize: 11 },

  info: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 26 },

  priceRow: { marginBottom: 6 },
  pricePill: {
    flexDirection: 'row', alignItems: 'baseline', gap: 3,
    alignSelf: 'flex-end',
  },
  price: { fontSize: 27, fontWeight: '800', color: C.onInverse.primary },
  priceLabel: { fontSize: 13, color: C.onInverse.muted },

  title: { fontSize: 15, color: C.onInverse.primary, fontWeight: '600', marginBottom: 10, textAlign: 'right' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10, justifyContent: 'flex-end' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  chipText: { color: C.onInverse.primary, fontSize: 11 },

  landlordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  landlordName: { color: C.onInverse.subtle, fontSize: 12 },
  availableFrom: { color: C.cyan, fontSize: 12, fontWeight: '600' },
});
