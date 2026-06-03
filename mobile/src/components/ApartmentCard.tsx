import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
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
  const hasValidImage = !!firstImage && firstImage.indexOf('via.placeholder.com') === -1;

  return (
    <View style={styles.card}>
      {hasValidImage ? (
        <Image
          source={{ uri: firstImage }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          accessibilityLabel={apartment.title ? `תמונת דירה: ${apartment.title}` : 'תמונת דירה'}
        />
      ) : (
        <View style={styles.noImageContainer}>
          <LinearGradient
            colors={[dirApp.surfaceContainerLowest, dirApp.surfaceContainerHigh]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.noImageContent}>
            <View style={styles.noImageIconWrapper}>
              <Ionicons name="home" size={48} color={dirApp.primary} />
              <Ionicons name="image-outline" size={24} color={dirApp.secondary} style={styles.noImageSubIcon} />
            </View>
            <Text style={styles.noImageTitle}>טרם הועלו תמונות</Text>
            <Text style={styles.noImageSubtitle}>הפרטים המלאים מופיעים מטה</Text>
          </View>
        </View>
      )}

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
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
            <Text style={styles.landlordName}>
              {apartment.landlord?.firstName} {apartment.landlord?.lastName}
            </Text>
            {apartment.landlord?.trustScore != null && apartment.landlord.trustScore > 70 && (
              <View style={styles.verifiedLandlordBadge}>
                <Ionicons name="shield-checkmark" size={11} color="#10B981" />
                <Text style={styles.verifiedLandlordText}>משכיר מאומת</Text>
              </View>
            )}
          </View>
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
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: dirApp.surfaceContainer,
    borderWidth: 1,
    borderColor: `${dirApp.outlineVariant}55`,
    shadowColor: dirApp.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  image: { width: '100%', height: '100%', position: 'absolute' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '58%' },
  noImageContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: dirApp.surfaceContainer,
  },
  noImageContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginBottom: 40,
  },
  noImageIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${dirApp.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  noImageSubIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: dirApp.surfaceContainerLowest,
    borderRadius: 14,
    padding: 4,
    borderWidth: 2,
    borderColor: dirApp.surfaceContainerHigh,
  },
  noImageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: dirApp.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  noImageSubtitle: {
    fontSize: 13,
    color: C.textSub,
    textAlign: 'center',
    opacity: 0.8,
  },

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
  verifiedLandlordBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  verifiedLandlordText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '700',
  },
});
