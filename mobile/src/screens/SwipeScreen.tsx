import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Modal, ActivityIndicator, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSwipeStore } from '../store/useSwipeStore';
import { useAuthStore } from '../store/useAuthStore';
import { usePersonaIsLandlord } from '../navigation/AdminAppModeContext';
import SwipeableCard from '../components/SwipeableCard';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { dirType } from '../theme/textStyles';
import type { Apartment, SwipeDirection } from '../types';

const FREE_DAILY_LIMIT = 20;

export default function SwipeScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const personaLandlord = usePersonaIsLandlord();
  const {
    deck, currentIndex, isLoading, lastMatch, feedError, feedLoadState,
    dailyUsed, dailyLimit, quotaExceeded,
    loadFeed, loadQuota, swipe, undo, resetMatch, dismissQuota, clearFeedError,
  } = useSwipeStore();

  const undoOpacity = useRef(new Animated.Value(0)).current;
  const undoTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);

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
        <Ionicons name="business-outline" size={56} color={C.border} />
        <Text style={styles.emptyTitle}>ממשק השוכרים</Text>
        <Text style={[styles.emptySubtitle, styles.feedErrorDetail]}>
          גלילת דירות זמינה בממשק שוכר. עבור לשורת הבחירה למעלה ובחר “ממשק שוכר”, או השתמש בחשבון שוכר.
        </Text>
        <TouchableOpacity style={styles.reloadBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.reloadText}>חזרה לדף הבית</Text>
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
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={C.cyan} />
        <Text style={styles.loadingText}>טוען דירות...</Text>
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
        <Ionicons name="alert-circle-outline" size={56} color={C.coral} />
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={[styles.emptySubtitle, styles.feedErrorDetail]}>{detail}</Text>
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
      </SafeAreaView>
    );
  }

  if (!feedError && feedLoadState === 'success' && visibleCards.length === 0) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="home-outline" size={56} color={C.border} />
        <Text style={styles.emptyTitle}>ראית את כל הדירות!</Text>
        <Text style={styles.emptySubtitle}>נסה לשנות את פילטרי החיפוש</Text>
        <TouchableOpacity style={styles.reloadBtn} onPress={() => loadFeed()}>
          <Text style={styles.reloadText}>טען מחדש</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const quotaFilled = Math.min(
    5,
    Math.round((dailyUsed / Math.max(effectiveLimit, 1)) * 5),
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header (DirApp shell) ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Profile')} accessibilityRole="button">
            <Ionicons name="menu-outline" size={22} color={dirApp.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerBrand, dirType.heading, { color: dirApp.primary }]}>DirApp</Text>
        </View>
        <View style={styles.headerRight}>
          {!isPremium && (
            <View style={[
              styles.quotaBadge,
              dailyUsed >= effectiveLimit * 0.8 && styles.quotaBadgeWarn,
            ]}>
              <Text style={styles.quotaText}>{dailyUsed}/{effectiveLimit}</Text>
            </View>
          )}
          <View style={styles.deckCountBadge}>
            <Text style={styles.deckCountText}>{Math.max(0, deck.length - currentIndex)}</Text>
          </View>
        </View>
      </View>

      {!isPremium && (
        <View style={styles.quotaStrip}>
          <Text style={[styles.quotaStripLabel, dirType.label, { color: dirApp.primary }]}>סוויפים יומיים</Text>
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
          return (
            <SwipeableCard
              key={apartment.id}
              apartment={apartment}
              isTop={isTop}
              onSwipe={(dir) => handleSwipe(apartment, dir)}
            />
          );
        })}
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.actions}>
        <ActionButton
          icon="close"
          iconColor={C.danger}
          bgColor={C.bgCard}
          borderColor={dirApp.errorContainer}
          size={28}
          onPress={() => handleButtonSwipe('dislike')}
        />
        <ActionButton
          icon="star"
          iconColor={C.secondaryTeal}
          bgColor={C.bgCard}
          borderColor={dirApp.secondaryContainer}
          size={22}
          onPress={() => handleButtonSwipe('superlike')}
        />
        <ActionButton
          icon="heart"
          iconColor={C.onInverse.primary}
          bgColor={C.primary}
          borderColor="transparent"
          size={28}
          filled
          onPress={() => handleButtonSwipe('like')}
        />
      </View>

      {/* ── Undo FAB ── */}
      {undoVisible && (
        <Animated.View style={[styles.undoFab, { opacity: undoOpacity }]}>
          <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
            <Ionicons name="arrow-undo" size={16} color={dirApp.primary} />
            <Text style={styles.undoBtnText}>בטל</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Match modal ── */}
      <Modal visible={!!lastMatch} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.matchHeartsRow}>
              <Ionicons name="heart" size={28} color={C.coral} style={{ opacity: 0.45, marginRight: -6 }} />
              <View style={styles.matchIconRow}>
                <Ionicons name="heart" size={40} color={C.coral} />
              </View>
              <Ionicons name="heart" size={28} color={C.coral} style={{ opacity: 0.45, marginLeft: -6 }} />
            </View>
            <Text style={styles.matchTitle}>יש התאמה! 🎉</Text>
            {(lastMatch as any)?.apartment?.title ? (
              <View style={styles.matchAptRow}>
                <Ionicons name="home-outline" size={13} color={C.textSub} />
                <Text style={styles.matchAptName} numberOfLines={1}>{(lastMatch as any).apartment.title}</Text>
              </View>
            ) : null}
            <Text style={styles.matchSub}>
              {lastMatch?.status === 'accepted'
                ? 'המשכיר אישר — תוכלו לדבר עכשיו!'
                : 'ממתין לאישור המשכיר'}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={resetMatch}>
              <Text style={styles.primaryBtnText}>המשך לחפש</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={resetMatch}>
              <Text style={styles.secondaryBtnText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Quota modal ── */}
      <Modal visible={quotaExceeded} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={[styles.matchIconRow, { backgroundColor: `${dirApp.primary}0F` }]}>
              <Ionicons name="flash" size={36} color={dirApp.primary} />
            </View>
            <Text style={styles.matchTitle}>הגעת למגבלה</Text>
            <Text style={styles.matchSub}>
              השתמשת ב-{dailyUsed}/{effectiveLimit} הזמות היומיות.{'\n'}שדרג לפרמיום לזמות ללא הגבלה!
            </Text>
            <TouchableOpacity style={styles.premiumBtn} onPress={dismissQuota}>
              <Ionicons name="star" size={15} color={C.onInverse.primary} />
              <Text style={styles.primaryBtnText}>שדרג לפרמיום ₪29/חודש</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={dismissQuota}>
              <Text style={styles.secondaryBtnText}>המתן למחר</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ActionButton({
  icon,
  iconColor,
  bgColor,
  borderColor,
  size,
  filled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  size: number;
  filled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionBtn,
        filled ? styles.actionBtnFilled : null,
        { borderColor, backgroundColor: bgColor },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons name={icon} size={size} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dirApp.background },
  centered: { flex: 1, backgroundColor: dirApp.background, justifyContent: 'center', alignItems: 'center', gap: 12 },

  loadingText: { color: C.textSub, fontSize: 15, marginTop: 8 },
  emptyTitle:  { fontSize: 20, fontWeight: '700', color: C.text, marginTop: 8 },
  emptySubtitle: { fontSize: 14, color: C.textSub },
  reloadBtn: {
    marginTop: 16, backgroundColor: dirApp.primaryContainer,
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14,
  },
  reloadText: { color: C.onInverse.primary, fontWeight: '700' },
  feedErrorDetail: { textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },
  feedErrorOutlineBtn: {
    marginTop: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: dirApp.primary,
  },
  feedErrorOutlineBtnText: { color: dirApp.primary, fontWeight: '700' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8,
  },
  headerLeft: { flex: 1, alignItems: 'flex-start' },
  headerCenter: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  headerBrand: {},
  headerIconBtn: { padding: 6, borderRadius: 999 },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  quotaStrip: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: dirApp.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quotaStripLabel: {},
  quotaSegments: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quotaSeg: { width: 16, height: 6, borderRadius: 4 },
  quotaSegOn: { backgroundColor: dirApp.secondary },
  quotaSegOff: { backgroundColor: dirApp.outlineVariant },
  quotaBadge: {
    backgroundColor: C.cyanAlpha(0.12), borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: C.cyanAlpha(0.3),
  },
  quotaBadgeWarn: {
    backgroundColor: C.coralAlpha(0.12),
    borderColor: C.coralAlpha(0.3),
  },
  quotaText: { color: C.textSub, fontSize: 11, fontWeight: '600' },
  deckCountBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.border, justifyContent: 'center', alignItems: 'center',
  },
  deckCountText: { fontSize: 11, fontWeight: '700', color: C.textSub },

  // Cards
  deckContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Actions
  actions: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 18,
    paddingVertical: 18, paddingBottom: 24,
  },
  actionBtn: {
    width: 58, height: 58, borderRadius: 29,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
    shadowColor: dirApp.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  actionBtnFilled: {
    borderWidth: 0,
    width: 62,
    height: 62,
    borderRadius: 31,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },

  // Undo
  undoFab: { position: 'absolute', bottom: 108, left: 20 },
  undoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.bgCard, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: C.border,
    shadowColor: dirApp.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  undoBtnText: { color: dirApp.primary, fontSize: 13, fontWeight: '600' },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    backgroundColor: C.bgCard, borderRadius: 28, padding: 32,
    alignItems: 'center', width: '84%', gap: 12,
    shadowColor: dirApp.primary, shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15, shadowRadius: 30, elevation: 10,
  },
  matchHeartsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  matchAptRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.bgCard, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: C.border,
  },
  matchAptName: { color: C.textSub, fontSize: 13, maxWidth: 200 },
  matchIconRow: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.coralAlpha(0.1),
    justifyContent: 'center', alignItems: 'center',
  },
  matchTitle: { fontSize: 24, fontWeight: '800', color: C.text },
  matchSub:   { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  primaryBtn: {
    backgroundColor: dirApp.primaryContainer, borderRadius: 14,
    paddingHorizontal: 32, paddingVertical: 14,
    width: '100%', alignItems: 'center',
  },
  primaryBtnText: { color: C.onInverse.primary, fontWeight: '700', fontSize: 15 },
  premiumBtn: {
    flexDirection: 'row', gap: 8,
    backgroundColor: dirApp.primaryContainer, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 14,
    width: '100%', alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtn: { paddingVertical: 8 },
  secondaryBtnText: { color: C.textSub, fontSize: 14 },
});
