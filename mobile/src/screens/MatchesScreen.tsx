import React, { useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import MatchCard from '../components/MatchCard';
import { C } from '../theme';
import type { Match } from '../types';

export default function MatchesScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const isLandlord = user?.role === 'landlord';

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['matches'],
    queryFn: () => matchesApi.list().then((r) => r.data.matches as Match[]),
    refetchInterval: 30_000,
  });

  const accepted = data?.filter((m) => m.status === 'accepted') ?? [];
  const pending  = data?.filter((m) => m.status === 'pending')  ?? [];

  const openChat = useCallback((match: Match) => {
    navigation.navigate('Chat', { matchId: match.id, title: match.apartment?.title ?? 'צ׳אט' });
  }, [navigation]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={C.navy} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>{isLandlord ? 'צ׳אטים' : 'התאמות'}</Text>

      <FlatList
        data={[...accepted, ...pending]}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={C.navy}
          />
        }
        ListHeaderComponent={
          accepted.length > 0 ? (
            <Text style={styles.sectionLabel}>פעיל ({accepted.length})</Text>
          ) : null
        }
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
                unreadCount={item.unreadCount}
                onPress={() => item.status === 'accepted' ? openChat(item) : null}
              />
            </>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>
              {isLandlord ? 'אין שיחות עדיין' : 'אין התאמות עדיין'}
            </Text>
            <Text style={styles.emptySub}>
              {isLandlord
                ? 'כשתאשר ליד מדף הלידים — השיחה עם השוכר תופיע כאן.'
                : 'המשך להחליק כדי למצוא דירות'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered:  { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  header: {
    fontSize: 22, fontWeight: '800', color: C.text,
    padding: 20, paddingBottom: 8, textAlign: 'right',
  },
  list: { padding: 16, paddingTop: 8 },
  sectionLabel: {
    color: C.textSub, fontSize: 11, fontWeight: '700',
    textAlign: 'right', marginBottom: 8, marginTop: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  emptySub:   { fontSize: 13, color: C.textSub },
});
