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
import SwipeableCard from '../components/SwipeableCard';
import SwipeHouseLogo from '../components/SwipeHouseLogo';
import { C } from '../theme';
import type { Apartment, SwipeDirection } from '../types';

const FREE_DAILY_LIMIT = 20;

export default function SwipeScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const {
    deck, currentIndex, isLoading, lastMatch, feedError,
    dailyUsed, dailyLimit, quotaExceeded,
    loadFeed, loadQuota, swipe, undo, resetMatch, dismissQuota, clearFeedError,
  } = useSwipeStore();

  const undoOpacity = useRef(new Animated.Value(0)).current;
  const undoTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);

  useEffect(() => {
    loadFeed();
    loadQuota();
  }, []);

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

  if (isLoading && deck.length === 0 && !feedError) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={C.cyan} />
        <Text style={styles.loadingText}>טוען דירות...</Text>
      </SafeAreaView>
    );
  }

  if (feedError) {
    const { status } = feedError;
    const isLandlord = user?.role === 'landlord';
    const title =
      status === 401
        ? 'ההתחברות פגה'
        : status === 403 && isLandlord
          ? 'ממשק השוכר לחשבונות שוכר בלבד'
          : status === 403
            ? 'אין הרשאה לטעון דירות'
            : 'לא ניתן לטעון את הפיד';
    const detail =
      status === 403 && isLandlord
        ? 'נרשמת כמשכיר. השתמש בדשבורד ובניהול מודעות, או הירשם עם חשבון שוכר נפרד לגלילת דירות.'
        : status === 403
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

  if (!isLoading && visibleCards.length === 0) {
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

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <SwipeHouseLogo size="sm" />
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
          color={C.coral}
          bgColor={C.coralAlpha(0.08)}
          size={26}
          onPress={() => handleButtonSwipe('dislike')}
        />
        <ActionButton
          icon="star"
          color={C.navy}
          bgColor={C.navyAlpha(0.06)}
          size={20}
          onPress={() => handleButtonSwipe('superlike')}
        />
        <ActionButton
          icon="heart"
          color={C.cyan}
          bgColor={C.cyanAlpha(0.08)}
          size={26}
          onPress={() => handleButtonSwipe('like')}
        />
      </View>

      {/* ── Undo FAB ── */}
      {undoVisible && (
        <Animated.View style={[styles.undoFab, { opacity: undoOpacity }]}>
          <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
            <Ionicons name="arrow-undo" size={16} color={C.navy} />
            <Text style={styles.undoBtnText}>בטל</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Match modal ── */}
      <Modal visible={!!lastMatch} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.matchIconRow}>
              <Ionicons name="heart" size={36} color={C.coral} />
            </View>
            <Text style={styles.matchTitle}>יש התאמה!</Text>
            <Text style={styles.matchSub}>
              {lastMatch?.status === 'accepted'
                ? 'המשכיר אישר — תוכלו לדבר עכשיו!'
                : 'ממתין לאישור המשכיר'}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={resetMatch}>
              <Text style={styles.primaryBtnText}>המשך לחפש</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Quota modal ── */}
      <Modal visible={quotaExceeded} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={[styles.matchIconRow, { backgroundColor: C.navyAlpha(0.06) }]}>
              <Ionicons name="flash" size={36} color={C.navy} />
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

function ActionButton({ icon, color, bgColor, size, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  size: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { borderColor: color, backgroundColor: bgColor }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons name={icon} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },

  loadingText: { color: C.textSub, fontSize: 15, marginTop: 8 },
  emptyTitle:  { fontSize: 20, fontWeight: '700', color: C.text, marginTop: 8 },
  emptySubtitle: { fontSize: 14, color: C.textSub },
  reloadBtn: {
    marginTop: 16, backgroundColor: C.navy,
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
    borderColor: C.navy,
  },
  feedErrorOutlineBtnText: { color: C.navy, fontWeight: '700' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10,
  },
  headerSide: { flex: 1 },
  headerRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
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
  },

  // Undo
  undoFab: { position: 'absolute', bottom: 108, left: 20 },
  undoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.bgCard, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.navy, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  undoBtnText: { color: C.navy, fontSize: 13, fontWeight: '600' },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    backgroundColor: C.bgCard, borderRadius: 28, padding: 32,
    alignItems: 'center', width: '84%', gap: 12,
    shadowColor: C.navy, shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15, shadowRadius: 30, elevation: 10,
  },
  matchIconRow: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.coralAlpha(0.1),
    justifyContent: 'center', alignItems: 'center',
  },
  matchTitle: { fontSize: 24, fontWeight: '800', color: C.text },
  matchSub:   { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  primaryBtn: {
    backgroundColor: C.navy, borderRadius: 14,
    paddingHorizontal: 32, paddingVertical: 14,
    width: '100%', alignItems: 'center',
  },
  primaryBtnText: { color: C.onInverse.primary, fontWeight: '700', fontSize: 15 },
  premiumBtn: {
    flexDirection: 'row', gap: 8,
    backgroundColor: C.navy, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 14,
    width: '100%', alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtn: { paddingVertical: 8 },
  secondaryBtnText: { color: C.textSub, fontSize: 14 },
});
