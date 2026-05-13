import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  SafeAreaView, RefreshControl, ActivityIndicator, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { matchesApi } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import MatchCard from '../components/MatchCard';
import { useAuthStore } from '../store/useAuthStore';
import { usePersonaIsLandlord } from '../navigation/AdminAppModeContext';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirApp } from '../theme/dirAppTokens';
import { dirType } from '../theme/textStyles';
import type { Match } from '../types';

type MatchTab = 'all' | 'active' | 'pending';

export default function MatchesScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const isLandlord = usePersonaIsLandlord();
  const [tab, setTab] = useState<MatchTab>('all');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['matches'],
    queryFn: () => matchesApi.list().then((r) => r.data.matches as Match[]),
    refetchInterval: 30_000,
  });

  const accepted = data?.filter((m: Match) => m.status === 'accepted') ?? [];
  const pending  = data?.filter((m: Match) => m.status === 'pending')  ?? [];

  const listData = useMemo(() => {
    if (tab === 'active') return accepted;
    if (tab === 'pending') return pending;
    return [...accepted, ...pending];
  }, [tab, accepted, pending]);

  const openChat = useCallback((match: Match) => {
    navigation.navigate('Chat', { matchId: match.id, title: match.apartment?.title ?? 'צ׳אט' });
  }, [navigation]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={dirApp.secondary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ResponsiveContainer style={{ flex: 1 }}>
        <View style={styles.shellHeader}>
          <Text style={[styles.headerBrand, dirType.heading, { color: dirApp.primary }]}>DirApp</Text>
          <Text style={[styles.header, dirType.subhead, { color: dirApp.primary }]}>
            {isLandlord ? 'צ׳אטים' : 'התאמות'}
          </Text>
        </View>

        <View style={styles.tabRow}>
          {(['all', 'active', 'pending'] as const).map((key) => {
            const label =
              key === 'all' ? `הכל (${accepted.length + pending.length})`
              : key === 'active' ? `פעיל (${accepted.length})`
              : `ממתין (${pending.length})`;
            const active = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
              >
                <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <FlatList
          data={listData}
          keyExtractor={(m) => m.id}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={dirApp.secondary}
            />
          }
          renderItem={({ item, index }) => {
            const showPendingHeader =
              tab === 'all' && index === accepted.length && pending.length > 0;
            return (
              <>
                {tab === 'all' && index === 0 && accepted.length > 0 && (
                  <Text style={styles.sectionLabel}>פעיל ({accepted.length})</Text>
                )}
                {showPendingHeader && (
                  <Text style={[styles.sectionLabel, accepted.length > 0 ? { marginTop: 8 } : null]}>
                    ממתין לאישור ({pending.length})
                  </Text>
                )}
                <MatchCard
                  match={item}
                  currentUserId={user!.id}
                  unreadCount={item.unreadCount}
                  onPress={() => {
                    if (item.status === 'accepted') openChat(item);
                  }}
                />
              </>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>
                {tab === 'pending'
                  ? 'אין בקשות ממתינות'
                  : tab === 'active'
                    ? (isLandlord ? 'אין שיחות פעילות' : 'אין התאמות פעילות')
                    : (isLandlord ? 'אין שיחות עדיין' : 'אין התאמות עדיין')}
              </Text>
              <Text style={styles.emptySub}>
                {isLandlord
                  ? 'כשתאשר ליד מדף הלידים — השיחה עם השוכר תופיע כאן.'
                  : 'המשך להחליק כדי למצוא דירות'}
              </Text>
            </View>
          }
        />
      </ResponsiveContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dirApp.background },
  centered: {
    flex: 1,
    backgroundColor: dirApp.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shellHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: `${dirApp.outlineVariant}55`,
    gap: 4,
  },
  headerBrand: {},
  header: {
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
    paddingTop: 4,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: dirApp.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: `${dirApp.outlineVariant}AA`,
  },
  tabBtnActive: {
    backgroundColor: dirApp.secondaryContainer,
    borderColor: dirApp.secondary,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: dirApp.onSurfaceVariant,
  },
  tabBtnTextActive: {
    color: dirApp.onSecondaryContainer,
  },
  list: { paddingBottom: 24, paddingTop: 4 },
  sectionLabel: {
    color: dirApp.outline,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: dirApp.primary },
  emptySub: { fontSize: 13, color: dirApp.outline },
});
