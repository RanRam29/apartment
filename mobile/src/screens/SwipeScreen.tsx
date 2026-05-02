import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Modal, Dimensions, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSwipeStore } from '../store/useSwipeStore';
import SwipeableCard from '../components/SwipeableCard';
import type { Apartment, SwipeDirection } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SwipeScreen() {
  const { deck, currentIndex, isLoading, lastMatch, loadFeed, swipe, resetMatch } = useSwipeStore();

  useEffect(() => { loadFeed(); }, []);

  const visibleCards = deck.slice(currentIndex, currentIndex + 3);

  const handleSwipe = useCallback(async (apartment: Apartment, direction: SwipeDirection) => {
    if (direction === 'like' || direction === 'superlike') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await swipe(apartment, direction);
  }, [swipe]);

  const handleButtonSwipe = (direction: SwipeDirection) => {
    const current = deck[currentIndex];
    if (current) handleSwipe(current, direction);
  };

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
        <Text style={styles.deckCount}>
          {Math.max(0, deck.length - currentIndex)} דירות
        </Text>
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
        <ActionButton
          icon="close"
          color="#FF4757"
          size={28}
          onPress={() => handleButtonSwipe('dislike')}
        />
        <ActionButton
          icon="star"
          color="#6C5CE7"
          size={22}
          onPress={() => handleButtonSwipe('superlike')}
        />
        <ActionButton
          icon="heart"
          color="#00E676"
          size={28}
          onPress={() => handleButtonSwipe('like')}
        />
      </View>

      {/* Match modal */}
      <Modal visible={!!lastMatch} transparent animationType="fade">
        <View style={styles.matchOverlay}>
          <View style={styles.matchCard}>
            <Text style={styles.matchEmoji}>🎉</Text>
            <Text style={styles.matchTitle}>יש התאמה!</Text>
            <Text style={styles.matchSub}>
              {lastMatch?.status === 'accepted'
                ? 'המשכיר אישר — תוכלו לדבר עכשיו!'
                : 'ממתין לאישור המשכיר'}
            </Text>
            <TouchableOpacity style={styles.matchBtn} onPress={resetMatch}>
              <Text style={styles.matchBtnText}>המשך לחפש</Text>
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
  deckCount: { fontSize: 13, color: '#A0A0B2' },
  deckContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  matchOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center',
  },
  matchCard: {
    backgroundColor: '#2A2A3E', borderRadius: 24,
    padding: 36, alignItems: 'center', width: '80%',
  },
  matchEmoji: { fontSize: 64, marginBottom: 12 },
  matchTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 8 },
  matchSub: { fontSize: 14, color: '#A0A0B2', textAlign: 'center', marginBottom: 28 },
  matchBtn: { backgroundColor: '#6C5CE7', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  matchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
