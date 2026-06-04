import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Alert,
  Platform, Linking,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { landlordApi, matchesApi } from '../services/api';
import type { Match } from '../types';
import { C, Dark } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { fontFamily } from '../theme/fonts';
import { useColors } from '../context/ThemeContext';

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

function showAlert(
  title: string,
  message: string,
  buttons?: Array<{text:string; onPress?:()=>void; style?:'cancel'|'destructive'|'default'}>,
  options?: {cancelable?:boolean}
) {
  if (Platform.OS === 'web') {
    const action = buttons?.find(b => b.style !== 'cancel');
    if (!buttons || !action) {
      window.alert(`${title}\n\n${message}`);
      buttons?.[0]?.onPress?.();
      return;
    }
    if (window.confirm(`${title}\n\n${message}`)) action.onPress?.();
    return;
  }
  Alert.alert(title, message, buttons as any, options);
}

export default function LeadsScreen() {
  const [activeTab, setActiveTab] = useState<StatusTab>('pending');
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();


  const colors = useColors();

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
    if (!user?.tosAcceptedAt) {
      showAlert(
        'אישור תנאי שימוש נדרש ⚠️',
        'על מנת לבצע פעולות בלידים, עליך לאשר את תנאי השימוש ומדיניות הפרטיות.',
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'לאישור התנאים', onPress: () => navigation.navigate('Terms') }
        ]
      );
      return;
    }
    showAlert(
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: colors.text }]}>לידים</Text>
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={14} color={dirApp.secondary} />
          <Text style={styles.aiBadgeText}>AI Score</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {STATUS_TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab, 
                { backgroundColor: colors.bgCard }, 
                active && styles.tabActive,
                active && { 
                  backgroundColor: colors.isDark ? colors.surface : dirApp.secondaryContainer,
                }
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabText, 
                { color: colors.textSub },
                active && styles.tabTextActive,
                active && { color: colors.isDark ? colors.text : dirApp.onSecondaryContainer }
              ]}>
                {STATUS_LABEL[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.isDark ? C.cyan : dirApp.secondary} />
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
              <Text style={[styles.emptyText, { color: colors.textMut }]}>אין לידים ב{STATUS_LABEL[activeTab]}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function TenantContactBar({ phone, email }: { phone?: string | null; email?: string | null }) {
  if (!phone && !email) return null;
  const colors = useColors();
  const brandColor = colors.isDark ? C.cyan : dirApp.secondary;
  const btnBg = colors.isDark ? `${C.cyan}18` : 'rgba(0, 71, 186, 0.08)';

  function call() {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  }

  function whatsapp() {
    if (!phone) return;
    // strip non-digits, prefix with Israel country code if local
    const digits = phone.replace(/\D/g, '');
    const international = digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
    Linking.openURL(`https://wa.me/${international}`);
  }

  function sendEmail() {
    if (!email) return;
    Linking.openURL(`mailto:${email}`);
  }

  return (
    <View style={[styles.contactBar, { borderTopColor: colors.border }]}>
      {phone && (
        <>
          <TouchableOpacity style={[styles.contactBtn, { backgroundColor: btnBg }]} onPress={call}>
            <Ionicons name="call-outline" size={15} color={brandColor} />
            <Text style={[styles.contactBtnText, { color: brandColor }]}>{phone}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.contactBtn, styles.waBtn, { backgroundColor: '#25D36618' }]} onPress={whatsapp}>
            <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
            <Text style={[styles.contactBtnText, { color: '#25D366' }]}>WhatsApp</Text>
          </TouchableOpacity>
        </>
      )}
      {email && !phone && (
        <TouchableOpacity style={[styles.contactBtn, { backgroundColor: btnBg }]} onPress={sendEmail}>
          <Ionicons name="mail-outline" size={15} color={brandColor} />
          <Text style={[styles.contactBtnText, { color: brandColor }]}>{email}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function LeadRow({ match, onAccept, onReject, showActions, onOpenChat }: {
  match: Match;
  onAccept: () => void;
  onReject: () => void;
  showActions: boolean;
  onOpenChat: () => void;
}) {
  const colors = useColors();
  const isAcceptedChatRow = !showActions && match.status === 'accepted';
  const score = leadScoreStyle(match.leadScore);
  const tenant = match.tenant;

  return (
    <TouchableOpacity
      style={[styles.leadCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
      onPress={isAcceptedChatRow ? onOpenChat : undefined}
      disabled={!isAcceptedChatRow}
      activeOpacity={isAcceptedChatRow ? 0.85 : 1}
    >
      {/* ── שורה עליונה: אווטאר + שם + ציון ── */}
      <View style={styles.leadTop}>
        <View>
          {tenant?.avatarUrl ? (
            <Image source={{ uri: tenant.avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
              <Ionicons name="person" size={20} color={colors.textMut} />
            </View>
          )}
          {tenant?.isVerified && (
            <View style={[styles.verifiedBadge, { backgroundColor: colors.bgCard }]}>
              <Ionicons name="checkmark-circle" size={16} color={C.cyan} />
            </View>
          )}
        </View>

        <View style={styles.leadInfo}>
          <View style={styles.nameRow}>
            <View style={[styles.scoreBadge, { backgroundColor: score.bg }]}>
              <Text style={[styles.scoreText, { color: score.color }]}>{score.label}</Text>
            </View>
            <Text style={[styles.tenantName, { color: colors.text }]}>
              {tenant?.firstName} {tenant?.lastName}
            </Text>
          </View>
          <Text style={[styles.aptName, { color: colors.textSub }]} numberOfLines={1}>
            {match.apartment?.title}
          </Text>
          <Text style={[styles.aptMeta, { color: colors.isDark ? C.cyan : dirApp.secondary }]}>
            {match.apartment?.city} · ₪{match.apartment?.price?.toLocaleString()}/חודש
          </Text>
        </View>
      </View>

      {/* ── פרטי יצירת קשר ── */}
      <TenantContactBar phone={tenant?.phone} email={tenant?.email} />

      {/* ── כפתורי פעולה ── */}
      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.rejectBtn, { borderColor: colors.isDark ? C.danger : 'rgba(239, 68, 68, 0.4)' }]} onPress={onReject}>
            <Ionicons name="close" size={18} color={C.statusTone.negative} />
            <Text style={styles.rejectText}>דחה</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: colors.isDark ? C.cyan : dirApp.secondary }]} onPress={onAccept}>
            <Ionicons name="checkmark" size={18} color={colors.isDark ? dirApp.primary : '#ffffff'} />
            <Text style={[styles.acceptText, { color: colors.isDark ? dirApp.primary : '#ffffff' }]}>אשר</Text>
          </TouchableOpacity>
        </View>
      )}
      {isAcceptedChatRow && (
        <TouchableOpacity style={[styles.chatBtn, { backgroundColor: colors.isDark ? C.cyan : dirApp.secondary }]} onPress={onOpenChat}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.isDark ? dirApp.primary : '#ffffff'} />
          <Text style={[styles.chatText, { color: colors.isDark ? dirApp.primary : '#ffffff' }]}>פתח צ׳אט</Text>
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
  header: { fontSize: 22, fontWeight: '800', color: C.onInverse.primary, textAlign: 'right', flex: 1, fontFamily: fontFamily.bold },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: `${dirApp.secondaryContainer}55`,
  },
  aiBadgeText: { color: dirApp.secondary, fontSize: 11, fontWeight: '700', fontFamily: fontFamily.bold },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Dark.surface, alignItems: 'center',
  },
  tabActive: { backgroundColor: C.cyan },
  tabText: { color: C.textMut, fontSize: 13, fontWeight: '600', fontFamily: fontFamily.semibold },
  tabTextActive: { color: dirApp.primary },
  list: { padding: 16, gap: 10 },
  leadCard: { backgroundColor: Dark.surface, borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: Dark.border },
  leadTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { backgroundColor: C.navyMidAlpha(0.7), justifyContent: 'center', alignItems: 'center' },
  leadInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  scoreText: { fontSize: 11, fontWeight: '800', fontFamily: fontFamily.bold },
  tenantName: { color: C.onInverse.primary, fontSize: 15, fontWeight: '700', textAlign: 'right', fontFamily: fontFamily.bold },
  aptName: { color: C.textMut, fontSize: 13, textAlign: 'right', marginTop: 2, fontFamily: fontFamily.regular },
  aptMeta: { color: C.cyan, fontSize: 12, textAlign: 'right', marginTop: 2, fontFamily: fontFamily.semibold },
  actions: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: C.danger,
  },
  rejectText: { color: C.danger, fontWeight: '600', fontFamily: fontFamily.semibold },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: C.cyan,
  },
  acceptText: { color: dirApp.primary, fontWeight: '600', fontFamily: fontFamily.semibold },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.cyan,
  },
  chatText: { color: dirApp.primary, fontWeight: '600', fontFamily: fontFamily.semibold },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: C.textMut, fontSize: 14, fontFamily: fontFamily.regular },

  // tenant contact bar
  contactBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Dark.border,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${C.cyan}18`,
  },
  waBtn: {
    backgroundColor: '#25D36618',
  },
  contactBtnText: {
    color: C.cyan,
    fontSize: 12,
    fontWeight: '600',
    direction: 'ltr',
    fontFamily: fontFamily.semibold,
  },

  // verified badge on avatar
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Dark.surface,
    borderRadius: 8,
  },
});
