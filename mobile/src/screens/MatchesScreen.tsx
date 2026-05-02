import React, { useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import MatchCard from '../components/MatchCard';
import type { Match } from '../types';

export default function MatchesScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['matches'],
    queryFn: () => matchesApi.list().then((r) => r.data.matches as Match[]),
    refetchInterval: 30_000,
  });

  const accepted = data?.filter((m) => m.status === 'accepted') ?? [];
  const pending  = data?.filter((m) => m.status === 'pending')  ?? [];

  const openChat = useCallback((match: Match) => {
    navigation.navigate('Chat', {
      matchId: match.id,
      title: match.apartment?.title ?? 'צ׳אט',
    });
  }, [navigation]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>התאמות</Text>

      <FlatList
        data={[...accepted, ...pending]}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#6C5CE7"
          />
        }
        ListHeaderComponent={
          accepted.length > 0 ? (
            <Text style={styles.sectionLabel}>פעיל ({accepted.length})</Text>
          ) : null
        }
        ItemSeparatorComponent={() => null}
        renderItem={({ item, index }) => {
          const showPendingHeader = index === accepted.length && pending.length > 0;
          return (
            <>
              {showPendingHeader && (
                <Text style={styles.sectionLabel}>ממתין לאישור ({pending.length})</Text>
              )}
              <MatchCard
                match={item}
                currentUserId={user!.id}
                onPress={() => item.status === 'accepted' ? openChat(item) : null}
              />
            </>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>אין התאמות עדיין</Text>
            <Text style={styles.emptySub}>המשך להחליק כדי למצוא דירות</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  centered: { flex: 1, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: '800', color: '#fff', padding: 20, paddingBottom: 8, textAlign: 'right' },
  list: { padding: 16, paddingTop: 8 },
  sectionLabel: { color: '#A0A0B2', fontSize: 12, fontWeight: '600', textAlign: 'right', marginBottom: 8, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptySub: { fontSize: 13, color: '#A0A0B2' },
});
