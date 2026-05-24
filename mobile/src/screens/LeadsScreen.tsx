import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { landlordApi, matchesApi } from '../services/api';
import type { Match } from '../types';
import { C, Dark } from '../theme';
import { dirApp } from '../theme/dirAppTokens';

const STATUS_TABS = ['pending', 'accepted', 'rejected'] as const;
type StatusTab = typeof STATUS_TABS[number];

const STATUS_LABEL: Record<StatusTab, string> = {
  pending: 'ממתין',
  accepted: 'אושר',
  rejected: 'נדחה',
};

function leadScoreStyle(score: number | null | undefined) {
  if (score == null) return { bg: `${dirApp.outlineVariant}44`, color: dirApp.outline, label: '—' };
  const pct = Math.min(100, Math.round(score));
  if (pct >= 80) return { bg: `${C.statusTone.positive}22`, color: C.statusTone.positive, label: `${pct}%` };
  if (pct >= 60) return { bg: `${dirApp.secondary}33`, color: dirApp.secondary, label: `${pct}%` };
  return { bg: `${C.statusTone.caution}22`, color: C.statusTone.caution, label: `${pct}%` };
}

export default function LeadsScreen() {
  const [activeTab, setActiveTab] = useState<StatusTab>('pending');
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leads', activeTab],
    queryFn: () =>
      landlordApi.leads({ status: activeTab }).then((r) => r.data.leads as Match[]),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => matchesApi.accept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-dashboard'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => matchesApi.reject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  function confirmAction(id: string, action: 'accept' | 'reject') {
    Alert.alert(
      action === 'accept' ? 'אישור ליד' : 'דחיית ליד',
      action === 'accept' ? 'לאשר את הליד הזה?' : 'לדחות את הליד הזה?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: action === 'accept' ? 'אשר' : 'דחה',
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: () => (action === 'accept' ? acceptMutation.mutate(id) : rejectMutation.mutate(id)),
        },
      ]
    );
  }

  function openChat(match: Match) {
    if (match.status !== 'accepted') return;
    navigation.navigate('Chat', {
      matchId: match.id,
      title: match.apartment?.title ?? 'צ׳אט',
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>לידים</Text>
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={14} color={dirApp.secondary} />
          <Text style={styles.aiBadgeText}>AI Score</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {STATUS_LABEL[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.cyan} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={false}
          renderItem={({ item }) => (
            <LeadRow
              match={item}
              onAccept={() => confirmAction(item.id, 'accept')}
              onReject={() => confirmAction(item.id, 'reject')}
              showActions={activeTab === 'pending'}
              onOpenChat={() => openChat(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>אין לידים ב{STATUS_LABEL[activeTab]}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function LeadRow({ match, onAccept, onReject, showActions, onOpenChat }: {
  match: Match;
  onAccept: () => void;
  onReject: () => void;
  showActions: boolean;
  onOpenChat: () => void;
}) {
  const isAcceptedChatRow = !showActions && match.status === 'accepted';
  const score = leadScoreStyle(match.leadScore);

  return (
    <TouchableOpacity
      style={styles.leadCard}
      onPress={isAcceptedChatRow ? onOpenChat : undefined}
      disabled={!isAcceptedChatRow}
      activeOpacity={isAcceptedChatRow ? 0.85 : 1}
    >
      <View style={styles.leadTop}>
        {match.tenant?.avatarUrl ? (
          <Image source={{ uri: match.tenant.avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={20} color={C.textMut} />
          </View>
        )}
        <View style={styles.leadInfo}>
          <View style={styles.nameRow}>
            <View style={[styles.scoreBadge, { backgroundColor: score.bg }]}>
              <Text style={[styles.scoreText, { color: score.color }]}>{score.label}</Text>
            </View>
            <Text style={styles.tenantName}>
              {match.tenant?.firstName} {match.tenant?.lastName}
            </Text>
          </View>
          <Text style={styles.aptName} numberOfLines={1}>
            {match.apartment?.title}
          </Text>
          <Text style={styles.aptMeta}>
            {match.apartment?.city} · ₪{match.apartment?.price?.toLocaleString()}/חודש
          </Text>
        </View>
      </View>

      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
            <Ionicons name="close" size={18} color={C.statusTone.negative} />
            <Text style={styles.rejectText}>דחה</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
            <Ionicons name="checkmark" size={18} color={dirApp.primary} />
            <Text style={styles.acceptText}>אשר</Text>
          </TouchableOpacity>
        </View>
      )}
      {isAcceptedChatRow && (
        <TouchableOpacity style={styles.chatBtn} onPress={onOpenChat}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={dirApp.primary} />
          <Text style={styles.chatText}>פתח צ׳אט</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Dark.bg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  header: { fontSize: 22, fontWeight: '800', color: C.onInverse.primary, textAlign: 'right', flex: 1 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: `${dirApp.secondaryContainer}55`,
  },
  aiBadgeText: { color: dirApp.secondary, fontSize: 11, fontWeight: '700' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Dark.surface, alignItems: 'center',
  },
  tabActive: { backgroundColor: C.cyan },
  tabText: { color: C.textMut, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: dirApp.primary },
  list: { padding: 16, gap: 10 },
  leadCard: { backgroundColor: Dark.surface, borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: Dark.border },
  leadTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { backgroundColor: C.navyMidAlpha(0.7), justifyContent: 'center', alignItems: 'center' },
  leadInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  scoreText: { fontSize: 11, fontWeight: '800' },
  tenantName: { color: C.onInverse.primary, fontSize: 15, fontWeight: '700', textAlign: 'right' },
  aptName: { color: C.textMut, fontSize: 13, textAlign: 'right', marginTop: 2 },
  aptMeta: { color: C.cyan, fontSize: 12, textAlign: 'right', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: C.danger,
  },
  rejectText: { color: C.danger, fontWeight: '600' },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: C.cyan,
  },
  acceptText: { color: dirApp.primary, fontWeight: '600' },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.cyan,
  },
  chatText: { color: dirApp.primary, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: C.textMut, fontSize: 14 },
});
