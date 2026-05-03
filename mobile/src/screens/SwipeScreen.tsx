import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Modal, Dimensions, ActivityIndicator, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSwipeStore } from '../store/useSwipeStore';
import SwipeableCard from '../components/SwipeableCard';
import type { Apartment, SwipeDirection } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const FREE_DAILY_LIMIT = 20;

export default function SwipeScreen() {
  const {
    deck, currentIndex, isLoading, lastMatch, lastSwipedApartment,
    dailyUsed, dailyLimit, quotaExceeded,
    loadFeed, loadQuota, swipe, undo, resetMatch, dismissQuota,
  } = useSwipeStore();

  const undoOpacity = useRef(new Animated.Value(0)).current;
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  if (isLoading && deck.length === 0) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>טוען דירות...</Text>
      </SafeAreaView>
    );
  }

  if (!isLoading && visibleCards.length === 0) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyEmoji}>🏠</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DirApp 🏠</Text>
        <View style={styles.headerRight}>
          {!isPremium && (
            <View style={[styles.quotaBadge, dailyUsed >= effectiveLimit * 0.8 && styles.quotaBadgeWarn]}>
              <Text style={styles.quotaText}>{dailyUsed}/{effectiveLimit} היום</Text>
            </View>
          )}
          <Text style={styles.deckCount}>
            {Math.max(0, deck.length - currentIndex)} דירות
          </Text>
        </View>
      </View>

      {/* Card stack */}
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

      {/* Action buttons */}
      <View style={styles.actions}>
        <ActionButton icon="close" color="#FF4757" size={28} onPress={() => handleButtonSwipe('dislike')} />
        <ActionButton icon="star" color="#6C5CE7" size={22} onPress={() => handleButtonSwipe('superlike')} />
        <ActionButton icon="heart" color="#00E676" size={28} onPress={() => handleButtonSwipe('like')} />
      </View>

      {/* Undo FAB */}
      {undoVisible && (
        <Animated.View style={[styles.undoFab, { opacity: undoOpacity }]}>
          <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
            <Ionicons name="arrow-undo" size={20} color="#fff" />
            <Text style={styles.undoBtnText}>בטל</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Match modal */}
      <Modal visible={!!lastMatch} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.matchEmoji}>🎉</Text>
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

      {/* Quota exceeded modal */}
      <Modal visible={quotaExceeded} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.matchEmoji}>⚡</Text>
            <Text style={styles.matchTitle}>הגעת למגבלה</Text>
            <Text style={styles.matchSub}>
              השתמשת ב-{dailyUsed}/{effectiveLimit} הזמות היומיות.{'\n'}שדרג לפרמיום לזמות ללא הגבלה!
            </Text>
            <TouchableOpacity style={styles.premiumBtn} onPress={dismissQuota}>
              <Ionicons name="star" size={16} color="#fff" />
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

function ActionButton({ icon, color, size, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  centered: { flex: 1, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#A0A0B2', fontSize: 15, marginTop: 12 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  emptySubtitle: { fontSize: 14, color: '#A0A0B2' },
  reloadBtn: { marginTop: 16, backgroundColor: '#6C5CE7', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  reloadText: { color: '#fff', fontWeight: '700' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quotaBadge: {
    backgroundColor: 'rgba(108,92,231,0.2)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(108,92,231,0.4)',
  },
  quotaBadgeWarn: { backgroundColor: 'rgba(255,71,87,0.15)', borderColor: 'rgba(255,71,87,0.4)' },
  quotaText: { color: '#A0A0B2', fontSize: 11, fontWeight: '600' },
  deckCount: { fontSize: 13, color: '#A0A0B2' },
  deckContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 20,
    paddingVertical: 20, paddingBottom: 28,
  },
  actionBtn: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  undoFab: {
    position: 'absolute', bottom: 110, left: 24,
  },
  undoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2A2A3E', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: '#3A3A5E',
  },
  undoBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#2A2A3E', borderRadius: 24, padding: 36, alignItems: 'center', width: '82%', gap: 12 },
  matchEmoji: { fontSize: 64 },
  matchTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  matchSub: { fontSize: 14, color: '#A0A0B2', textAlign: 'center' },
  primaryBtn: { backgroundColor: '#6C5CE7', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, width: '100%', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  premiumBtn: { flexDirection: 'row', gap: 6, backgroundColor: '#6C5CE7', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, width: '100%', alignItems: 'center', justifyContent: 'center' },
  secondaryBtn: { paddingVertical: 8 },
  secondaryBtnText: { color: '#A0A0B2', fontSize: 14 },
});
