import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Modal, ActivityIndicator, Animated,
  ScrollView, RefreshControl, Dimensions,
} from 'react-native';
import SkeletonLoader from '../components/SkeletonLoader';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSwipeStore } from '../store/useSwipeStore';
import { useAuthStore } from '../store/useAuthStore';
import { usePersonaIsLandlord } from '../navigation/AdminAppModeContext';
import SwipeableCard from '../components/SwipeableCard';
import type { Apartment, SwipeDirection } from '../types';
import { C } from '../theme';
import { fontFamily } from '../theme/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FREE_DAILY_LIMIT = 20;

const colorsV3 = {
  primary: '#00091b',
  primaryContainer: '#002045',
  onPrimaryContainer: '#7089b3',
  secondary: '#006b5f',
  secondaryContainer: '#9cefdf',
  onSecondaryContainer: '#0b6f63',
  onTertiaryContainer: '#009a7f',
  background: '#f8f9ff',
  surface: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f3f9',
  surfaceContainer: '#eceef3',
  surfaceContainerHigh: '#e7e8ee',
  surfaceContainerHighest: '#e1e2e8',
  onSurface: '#191c20',
  onSurfaceVariant: '#44474e',
  outline: '#74777f',
  outlineVariant: '#c4c6cf',
  actionCta: '#00cba9',
  error: '#ba1a1a',
};

export default function SwipeScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const personaLandlord = usePersonaIsLandlord();
  const {
    deck, currentIndex, isLoading, lastMatch, feedError, feedLoadState,
    dailyUsed, dailyLimit, quotaExceeded,
    loadFeed, loadQuota, swipe, undo, resetMatch, dismissQuota, clearFeedError,
  } = useSwipeStore();

  const undoOpacity = useRef(new Animated.Value(0)).current;
  const undoTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadFeed(), loadQuota()]);
    } catch (_) {}
    setRefreshing(false);
  }, [loadFeed, loadQuota]);

  useEffect(() => {
    if (personaLandlord) return;
    loadFeed();
    loadQuota();
  }, [user?.id, personaLandlord]);

  function showUndoFab() {
    setUndoVisible(true);
    undoOpacity.setValue(1);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      Animated.timing(undoOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() =>
        setUndoVisible(false)
      );
    }, 4500);
  }

  const visibleCards = deck.slice(currentIndex, currentIndex + 3);

  const handleSwipe = useCallback(async (apartment: Apartment, direction: SwipeDirection) => {
    if (direction === 'like' || direction === 'superlike') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await swipe(apartment, direction);
    showUndoFab();
  }, [swipe]);

  const handleButtonSwipe = (direction: SwipeDirection) => {
    const current = deck[currentIndex];
    if (current) handleSwipe(current, direction);
  };

  const handleUndo = async () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoVisible(false);
    undoOpacity.setValue(0);
    await undo();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const effectiveLimit = dailyLimit ?? FREE_DAILY_LIMIT;
  const isPremium = dailyLimit === null;

  if (personaLandlord) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="business-outline" size={56} color={colorsV3.outlineVariant} />
        <Text style={styles.emptyTitle}>ממשק השוכרים</Text>
        <Text style={[styles.emptySubtitle, styles.feedErrorDetail]}>
          גלילת דירות זמינה בממשק שוכר. עבור לשורת הבחירה למעלה ובחר “ממשק שוכר”, או השתמש בחשבון שוכר.
        </Text>
        <TouchableOpacity style={styles.reloadBtn} onPress={() => navigation.navigate('Dashboard')}>
          <Text style={styles.reloadText}>חזרה לדשבורד</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const awaitingFeed =
    feedLoadState === 'pending'
    || feedLoadState === 'loading'
    || (isLoading && deck.length === 0 && !feedError);

  if (awaitingFeed && !feedError) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header skeleton */}
        <View style={styles.header}>
          <SkeletonLoader width={36} height={36} borderRadius={18} />
          <SkeletonLoader width={100} height={24} borderRadius={6} />
          <View style={{ flexDirection: 'row-reverse', gap: 4 }}>
            <SkeletonLoader width={36} height={36} borderRadius={18} />
            <SkeletonLoader width={36} height={36} borderRadius={18} />
          </View>
        </View>

        {/* Card skeleton */}
        <View style={[styles.deckContainer, { paddingHorizontal: 16 }]}>
          <View style={{ backgroundColor: '#ffffff', borderColor: '#e1e2e8', borderWidth: 1, borderRadius: 24, padding: 16, width: '100%', height: '90%' }}>
            <SkeletonLoader width="100%" height="60%" borderRadius={16} style={{ marginBottom: 16 }} />
            <SkeletonLoader width="80%" height={24} borderRadius={6} style={{ marginBottom: 12 }} />
            <SkeletonLoader width="40%" height={20} borderRadius={6} style={{ marginBottom: 16 }} />
            <View style={{ flexDirection: 'row-reverse', gap: 8, marginBottom: 16 }}>
              <SkeletonLoader width={60} height={24} borderRadius={12} />
              <SkeletonLoader width={60} height={24} borderRadius={12} />
              <SkeletonLoader width={60} height={24} borderRadius={12} />
            </View>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
              <SkeletonLoader width={120} height={32} borderRadius={16} />
              <SkeletonLoader width={36} height={36} borderRadius={18} />
            </View>
          </View>
        </View>

        {/* Action buttons skeleton */}
        <View style={styles.actions}>
          <SkeletonLoader width={58} height={58} borderRadius={29} />
          <SkeletonLoader width={48} height={48} borderRadius={24} />
          <SkeletonLoader width={62} height={62} borderRadius={31} />
        </View>
      </SafeAreaView>
    );
  }

  if (feedError) {
    const { status } = feedError;
    const title =
      status === 401
        ? 'ההתחברות פגה'
        : status === 403
          ? 'אין הרשאה לטעון דירות'
          : 'לא ניתן לטעון את הפיד';
    const detail =
      status === 403
        ? 'אם זה חשבון שוכר — התנתק והתחבר מחדש. ודא שקיבלת אימות אימייל אם נדרש.'
        : feedError.message;

    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={56} color={colorsV3.error} />
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={[styles.emptySubtitle, styles.feedErrorDetail]}>{detail}</Text>
        {status === 401 ? (
          <TouchableOpacity
            style={styles.reloadBtn}
            onPress={() => { logout(); }}
          >
            <Text style={styles.reloadText}>התחבר מחדש</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.reloadBtn}
              onPress={() => {
                clearFeedError();
                loadFeed();
                loadQuota();
              }}
            >
              <Text style={styles.reloadText}>נסה שוב</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.feedErrorOutlineBtn} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.feedErrorOutlineBtnText}>פתח פרופיל</Text>
            </TouchableOpacity>
          </>
        )}
      </SafeAreaView>
    );
  }

  if (!feedError && feedLoadState === 'success' && visibleCards.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colorsV3.background }}>
        <ScrollView
          contentContainerStyle={[styles.centered, { flexGrow: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colorsV3.secondary]} tintColor={colorsV3.secondary} />}
        >
          <Ionicons name="home-outline" size={56} color={colorsV3.outlineVariant} />
          <Text style={styles.emptyTitle}>ראית את כל הדירות!</Text>
          <Text style={styles.emptySubtitle}>נסה לשנות את פילטרי החיפוש</Text>
          <TouchableOpacity style={styles.reloadBtn} onPress={() => loadFeed()}>
            <Text style={styles.reloadText}>טען מחדש</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const quotaFilled = Math.min(
    5,
    Math.round((dailyUsed / Math.max(effectiveLimit, 1)) * 5),
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header (Stitch Discovery alignment) ── */}
      <View style={styles.header}>
        {/* Menu Button (Right-aligned in RTL, left in AppNavigator) */}
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <Ionicons name="menu-outline" size={24} color={colorsV3.primary} />
        </TouchableOpacity>


        <Text style={styles.headerBrand}>DirApp</Text>

        <View style={styles.headerActions}>
          {/* Notification Button */}
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Matches')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={colorsV3.primary} />
          </TouchableOpacity>

          {/* Preferences Filter Tune Button */}
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Preferences')}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={22} color={colorsV3.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {!isPremium && (
        <View style={styles.quotaStrip}>
          <Text style={styles.quotaStripLabel}>סוויפים יומיים</Text>
          <View style={styles.quotaSegments}>
            {Array.from({ length: 5 }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.quotaSeg,
                  i < quotaFilled ? styles.quotaSegOn : styles.quotaSegOff,
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/* ── Card stack ── */}
      <View style={styles.deckContainer}>
        {[...visibleCards].reverse().map((apartment, i) => {
          const isTop = i === visibleCards.length - 1;
          const trustScore = apartment.landlord?.trustScore;

          return (
            <View key={apartment.id} style={styles.cardWrapper}>
              <SwipeableCard
                apartment={apartment}
                isTop={isTop}
                onSwipe={(dir) => handleSwipe(apartment, dir)}
                onPress={() => navigation.navigate('ApartmentDetail', { apartmentId: apartment.id })}
              />

              {/* Float Trust Score Badge Overlay (mockup styling) */}
              {isTop && trustScore != null && (
                <View style={styles.trustScoreBadge}>
                  <Text style={styles.trustScoreText}>{trustScore}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* ── Action buttons (Mockup styled circles) ── */}
      <View style={styles.actions}>
        {/* Pass Button */}
        <TouchableOpacity
          style={styles.actionBtnPass}
          onPress={() => handleButtonSwipe('dislike')}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={32} color={colorsV3.error} />
        </TouchableOpacity>

        {/* Superlike Button */}
        <TouchableOpacity
          style={styles.actionBtnSuper}
          onPress={() => handleButtonSwipe('superlike')}
          activeOpacity={0.8}
        >
          <Ionicons name="star" size={22} color="#FFD700" />
        </TouchableOpacity>

        {/* Like Button */}
        <TouchableOpacity
          style={styles.actionBtnLike}
          onPress={() => handleButtonSwipe('like')}
          activeOpacity={0.8}
        >
          <Ionicons name="heart" size={32} color={colorsV3.onSecondaryContainer} />
        </TouchableOpacity>
      </View>

      {/* ── Undo FAB ── */}
      {undoVisible && (
        <Animated.View style={[styles.undoFab, { opacity: undoOpacity }]}>
          <TouchableOpacity onPress={handleUndo} style={styles.undoBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-undo" size={16} color={colorsV3.primary} />
            <Text style={styles.undoBtnText}>בטל</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Match modal ── */}
      <Modal visible={!!lastMatch} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            {lastMatch?.status === 'accepted' ? (
              <View style={styles.matchHeartsRow}>
                <Ionicons name="heart" size={28} color={C.coral} style={{ opacity: 0.45, marginRight: -6 }} />
                <View style={styles.matchIconRow}>
                  <Ionicons name="heart" size={40} color={C.coral} />
                </View>
                <Ionicons name="heart" size={28} color={C.coral} style={{ opacity: 0.45, marginLeft: -6 }} />
              </View>
            ) : (
              <View style={styles.matchIconRow}>
                <Ionicons name="mail-outline" size={40} color={colorsV3.secondary} />
              </View>
            )}
            <Text style={styles.matchTitle}>
              {lastMatch?.status === 'accepted' ? 'יש התאמה! 🎉' : 'הבקשה נשלחה! ✉️'}
            </Text>
            {(lastMatch as any)?.apartment?.title ? (
              <View style={styles.matchAptRow}>
                <Ionicons name="home-outline" size={13} color={colorsV3.onSurfaceVariant} />
                <Text style={styles.matchAptName} numberOfLines={1}>{(lastMatch as any).apartment.title}</Text>
              </View>
            ) : null}
            <Text style={styles.matchSub}>
              {lastMatch?.status === 'accepted'
                ? 'המשכיר אישר — תוכלו לדבר עכשיו!'
                : 'המשכיר קיבל התראה על ההתעניינות שלך. ברגע שיאשר, ייפתח ביניכם צ׳אט.'}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={resetMatch} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>המשך לחפש</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={resetMatch} activeOpacity={0.8}>
              <Text style={styles.secondaryBtnText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Quota modal ── */}
      <Modal visible={quotaExceeded} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={[styles.matchIconRow, { backgroundColor: 'rgba(0, 9, 27, 0.06)' }]}>
              <Ionicons name="flash" size={36} color={colorsV3.primary} />
            </View>
            <Text style={styles.matchTitle}>הגעת למגבלה</Text>
            <Text style={styles.matchSub}>
              השתמשת ב-{dailyUsed}/{effectiveLimit} הזמות היומיות.{'\n'}שדרג לפרמיום לזמות ללא הגבלה!
            </Text>
            <TouchableOpacity style={styles.premiumBtn} onPress={dismissQuota} activeOpacity={0.85}>
              <Ionicons name="star" size={15} color="#ffffff" />
              <Text style={styles.primaryBtnText}>שדרג לפרמיום ₪29/חודש</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={dismissQuota} activeOpacity={0.8}>
              <Text style={styles.secondaryBtnText}>המתן למחר</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colorsV3.background },
  centered: { flex: 1, backgroundColor: colorsV3.background, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle:  { fontSize: 20, fontWeight: '700', color: colorsV3.primary, marginTop: 8, fontFamily: fontFamily.bold },
  emptySubtitle: { fontSize: 14, color: colorsV3.onSurfaceVariant, fontFamily: fontFamily.regular },
  reloadBtn: {
    marginTop: 16, backgroundColor: colorsV3.primaryContainer,
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14,
  },
  reloadText: { color: '#ffffff', fontWeight: '700', fontFamily: fontFamily.bold },
  feedErrorDetail: { textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },
  feedErrorOutlineBtn: {
    marginTop: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colorsV3.primary,
  },
  feedErrorOutlineBtnText: { color: colorsV3.primary, fontWeight: '700', fontFamily: fontFamily.bold },
  header: {
    flexDirection: 'row-reverse', // RTL header layout
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerBrand: {
    fontSize: 24,
    fontWeight: '800',
    color: colorsV3.primary,
    fontFamily: fontFamily.bold,
  },
  headerIconBtn: {
    padding: 8,
    borderRadius: 20,
  },
  headerActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  quotaStrip: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colorsV3.surfaceContainerLow,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quotaStripLabel: {
    fontSize: 13,
    color: colorsV3.primary,
    fontFamily: fontFamily.medium,
  },
  quotaSegments: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  quotaSeg: { width: 16, height: 6, borderRadius: 4 },
  quotaSegOn: { backgroundColor: colorsV3.secondary },
  quotaSegOff: { backgroundColor: colorsV3.outlineVariant },

  // Card deck
  deckContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustScoreBadge: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colorsV3.onTertiaryContainer, // Teal trust indicator background (#009a7f)
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: colorsV3.onTertiaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 6,
    zIndex: 999,
  },
  trustScoreText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },

  // Actions row
  actions: {
    flexDirection: 'row-reverse', // RTL alignment
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingVertical: 20,
    paddingBottom: 90,
  },
  actionBtnPass: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(196, 201, 207, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colorsV3.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBtnSuper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(196, 201, 207, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colorsV3.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBtnLike: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(196, 201, 207, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colorsV3.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  // Undo button
  undoFab: { position: 'absolute', bottom: 170, left: 20 },
  undoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ffffff', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: colorsV3.outlineVariant,
    shadowColor: colorsV3.primaryContainer, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  undoBtnText: { color: colorsV3.primary, fontSize: 13, fontWeight: '600', fontFamily: fontFamily.semibold },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    backgroundColor: '#ffffff', borderRadius: 28, padding: 32,
    alignItems: 'center', width: '84%', gap: 12,
    shadowColor: colorsV3.primary, shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15, shadowRadius: 30, elevation: 10,
  },
  matchHeartsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  matchAptRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ffffff', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colorsV3.outlineVariant,
  },
  matchAptName: { color: colorsV3.onSurfaceVariant, fontSize: 13, maxWidth: 200, fontFamily: fontFamily.regular },
  matchIconRow: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  matchTitle: { fontSize: 24, fontWeight: '800', color: colorsV3.primary, fontFamily: fontFamily.bold },
  matchSub:   { fontSize: 14, color: colorsV3.onSurfaceVariant, textAlign: 'center', lineHeight: 20, fontFamily: fontFamily.regular },
  primaryBtn: {
    backgroundColor: colorsV3.primaryContainer, borderRadius: 14,
    paddingHorizontal: 32, paddingVertical: 14,
    width: '100%', alignItems: 'center',
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15, fontFamily: fontFamily.bold },
  premiumBtn: {
    flexDirection: 'row', gap: 8,
    backgroundColor: colorsV3.primaryContainer, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 14,
    width: '100%', alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtn: { paddingVertical: 8 },
  secondaryBtnText: { color: colorsV3.onSurfaceVariant, fontSize: 14, fontFamily: fontFamily.regular },
});
