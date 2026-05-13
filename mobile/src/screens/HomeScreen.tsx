import React, { useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Animated, Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { usePersonaIsLandlord } from '../navigation/AdminAppModeContext';
import { C } from '../theme';
import SwipeHouseLogo from '../components/SwipeHouseLogo';

const { width: W } = Dimensions.get('window');
const TILE_SIZE = (W - 48 - 16) / 2;  // 2 columns, 24px margin each side, 16px gap

// ── Service definitions ────────────────────────────────────────────────────

const TENANT_SERVICES = [
  { id: 'Swipe',   label: 'Discover',  subLabel: 'Swipe apartments',  icon: 'home-outline' as const,   color: C.navy,  glow: C.navyAlpha(0.2) },
  { id: 'Matches', label: 'Matches',   subLabel: 'Your saved homes',  icon: 'heart-outline' as const,  color: C.coral, glow: C.coralAlpha(0.25) },
  { id: 'Search',  label: 'Search',    subLabel: 'Filter & explore',  icon: 'search-outline' as const, color: C.cyan,  glow: C.cyanAlpha(0.25) },
  { id: 'Profile', label: 'Profile',   subLabel: 'Your preferences',  icon: 'person-outline' as const, color: C.accent.violet, glow: C.violetAlpha(0.2) },
] as const;

const LANDLORD_SERVICES = [
  { id: 'Dashboard', label: 'Dashboard', subLabel: 'Stats & overview',  icon: 'stats-chart-outline' as const, color: C.navy,  glow: C.navyAlpha(0.2) },
  { id: 'Matches',   label: 'Chats',     subLabel: 'Tenant messages',    icon: 'chatbubbles-outline' as const,   color: C.accent.violet, glow: C.violetAlpha(0.22) },
  { id: 'Leads',     label: 'Leads',     subLabel: 'Interested tenants', icon: 'people-outline' as const,      color: C.coral, glow: C.coralAlpha(0.25) },
  { id: 'Listings',  label: 'Listings',  subLabel: 'Your properties',    icon: 'list-outline' as const,        color: C.cyan,  glow: C.cyanAlpha(0.25) },
  { id: 'Profile',   label: 'Profile',   subLabel: 'Account settings',   icon: 'person-outline' as const,      color: C.success, glow: C.successAlpha(0.2) },
] as const;

// ── ServiceTile component ──────────────────────────────────────────────────

type ServiceItem = typeof TENANT_SERVICES[number] | typeof LANDLORD_SERVICES[number];

function ServiceTile({ service, onPress }: { service: ServiceItem; onPress: () => void }) {
  const scale    = useRef(new Animated.Value(1)).current;
  const iconFloat = useRef(new Animated.Value(0)).current;
  const floatLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startFloat = useCallback(() => {
    floatLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(iconFloat, { toValue: -5, duration: 600, useNativeDriver: true }),
        Animated.timing(iconFloat, { toValue: 0,  duration: 600, useNativeDriver: true }),
      ])
    );
    floatLoop.current.start();
  }, [iconFloat]);

  const stopFloat = useCallback(() => {
    floatLoop.current?.stop();
    Animated.spring(iconFloat, { toValue: 0, useNativeDriver: true, ...C.duration.spring }).start();
  }, [iconFloat]);

  const handlePressIn = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, {
      toValue: 0.93,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
    startFloat();
  }, [scale, startFloat]);

  const handlePressOut = useCallback(() => {
    stopFloat();
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      ...C.duration.spring,
    }).start();
  }, [scale, stopFloat]);

  return (
    <Animated.View style={[styles.tileWrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.tile}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={service.label}
        accessibilityHint={service.subLabel}
      >
        {/* Icon container with glow */}
        <Animated.View
          style={[
            styles.iconContainer,
            { backgroundColor: service.color, transform: [{ translateY: iconFloat }] },
          ]}
        >
          <View style={[styles.iconGlow, { backgroundColor: service.glow }]} />
          <Ionicons name={service.icon} size={28} color={C.onInverse.primary} />
        </Animated.View>

        <Text style={styles.tileLabel}>{service.label}</Text>
        <Text style={styles.tileSubLabel}>{service.subLabel}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── HomeScreen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const isLandlord = usePersonaIsLandlord();
  const services = isLandlord ? LANDLORD_SERVICES : TENANT_SERVICES;
  const greeting = getGreeting();

  function handleServicePress(id: string) {
    Haptics.selectionAsync();
    navigation.navigate(id);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <SwipeHouseLogo size="sm" />
          <View style={styles.headerTextBlock}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.username}>
              {user?.firstName ?? (isLandlord ? 'Landlord' : 'Tenant')} 👋
            </Text>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons name="notifications-outline" size={22} color={C.navy} />
          </View>
        </View>

        {/* Hero card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>
            {isLandlord ? 'Manage your properties' : 'Find your perfect home'}
          </Text>
          <Text style={styles.heroSub}>
            {isLandlord
              ? 'Track leads, manage listings, and connect with tenants.'
              : 'Swipe through curated apartments matched to your lifestyle.'}
          </Text>
          <View style={styles.heroPill}>
            <View style={[styles.heroDot, { backgroundColor: C.cyan }]} />
            <Text style={styles.heroPillText}>
              {isLandlord ? 'Landlord Dashboard' : 'Tenant Mode'}
            </Text>
          </View>
        </View>

        {/* Section label */}
        <Text style={styles.sectionLabel}>Services</Text>

        {/* Service grid */}
        <View style={styles.grid}>
          {services.map((service) => (
            <ServiceTile
              key={service.id}
              service={service}
              onPress={() => handleServicePress(service.id)}
            />
          ))}
        </View>

        {/* Quick tip */}
        <View style={styles.tipCard}>
          <Ionicons name="information-circle-outline" size={18} color={C.cyan} />
          <Text style={styles.tipText}>
            {isLandlord
              ? 'Tip: Verified listings get 3× more views.'
              : 'Tip: Set your preferences for better matches.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 32 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 20, marginBottom: 24, gap: 12,
  },
  headerTextBlock: { flex: 1, alignItems: 'flex-end' },
  greeting:  { fontSize: 14, color: C.textMut, fontWeight: '400', marginBottom: 2 },
  username:  { fontSize: 26, color: C.navy,    fontWeight: '700', letterSpacing: -0.5 },
  headerBadge: {
    width: 44, height: 44,
    backgroundColor: C.glass.surfaceBg,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.glass.surfaceBorder,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.glass.shadowLight.shadowColor,
    shadowOffset: C.glass.shadowLight.shadowOffset,
    shadowOpacity: C.glass.shadowLight.shadowOpacity,
    shadowRadius: C.glass.shadowLight.shadowRadius,
    elevation: C.glass.shadowLight.elevation,
  },

  heroCard: {
    backgroundColor: C.glass.surfaceBg,
    borderRadius: 24,
    borderWidth: 1, borderColor: C.glass.surfaceBorder,
    padding: 24,
    marginBottom: 32,
    shadowColor: C.glass.shadowLight.shadowColor,
    shadowOffset: C.glass.shadowLight.shadowOffset,
    shadowOpacity: C.glass.shadowLight.shadowOpacity,
    shadowRadius: C.glass.shadowLight.shadowRadius,
    elevation: C.glass.shadowLight.elevation,
  },
  heroTitle: { fontSize: 20, fontWeight: '700', color: C.navy, marginBottom: 8, letterSpacing: -0.3 },
  heroSub:   { fontSize: 14, color: C.textSub,  lineHeight: 20, marginBottom: 16 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: C.navyAlpha(0.08),
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999,
  },
  heroDot:      { width: 6, height: 6, borderRadius: 3 },
  heroPillText: { fontSize: 12, fontWeight: '600', color: C.navy },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    textTransform: 'uppercase', color: C.textMut,
    marginBottom: 14,
  },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 16, marginBottom: 24,
  },

  tileWrapper: { width: TILE_SIZE },
  tile: {
    backgroundColor: C.bgCard,
    borderRadius: 24,
    borderWidth: 1, borderColor: C.glass.surfaceBorder,
    padding: 20,
    alignItems: 'flex-start',
    shadowColor: C.glass.shadowLight.shadowColor,
    shadowOffset: C.glass.shadowLight.shadowOffset,
    shadowOpacity: C.glass.shadowLight.shadowOpacity,
    shadowRadius: C.glass.shadowLight.shadowRadius,
    elevation: C.glass.shadowLight.elevation,
  },
  iconContainer: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14, overflow: 'hidden',
  },
  iconGlow: {
    position: 'absolute', width: 80, height: 80,
    borderRadius: 40, bottom: -20, right: -20,
    opacity: 0.6,
  },
  tileLabel:    { fontSize: 15, fontWeight: '700', color: C.text,    marginBottom: 4 },
  tileSubLabel: { fontSize: 12, color: C.textMut, lineHeight: 16 },

  tipCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.cyanAlpha(0.07),
    borderRadius: 14,
    borderWidth: 1, borderColor: C.cyanAlpha(0.15),
    padding: 14,
  },
  tipText: { flex: 1, fontSize: 13, color: C.textSub, lineHeight: 18 },
});
