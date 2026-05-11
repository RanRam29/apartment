import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Pressable, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, Modal,   Share, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';
import { landlordApi, apartmentsApi } from '../services/api';
import type { Apartment, MainStackParamList } from '../types';
import { C, Dark } from '../theme';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type CopyStyle = 'professional' | 'friendly' | 'luxury';

const COPY_STYLES: { key: CopyStyle; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'professional', label: 'מקצועי',  icon: 'briefcase-outline' },
  { key: 'friendly',     label: 'חברותי',   icon: 'happy-outline' },
  { key: 'luxury',       label: 'יוקרתי',   icon: 'diamond-outline' },
];

export default function ListingsScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();

  const [copyModal, setCopyModal] = React.useState<{
    visible: boolean;
    apt: Apartment | null;
    style: CopyStyle;
    copy: string;
    loading: boolean;
  }>({ visible: false, apt: null, style: 'professional', copy: '', loading: false });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['landlord-dashboard'],
    queryFn: () => landlordApi.dashboard().then((r) => r.data),
  });

  const listings: Apartment[] = data?.listings ?? [];

  function getThumbUrl(item: Apartment): string | undefined {
    const first: any = (item as any)?.images?.[0];
    if (!first) return undefined;
    if (typeof first === 'string') return first;
    if (typeof first === 'object' && typeof first.url === 'string') return first.url;
    return undefined;
  }

  function formatPrice(value: unknown): string {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? `₪${n.toLocaleString()}/חודש` : '—';
  }

  async function toggleActive(apt: Apartment) {
    const next = !apt.isActive;
    Alert.alert(
      next ? 'הפעל מודעה' : 'השבת מודעה',
      `האם ${next ? 'להפעיל' : 'להשבית'} את "${apt.title}"?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'אישור',
          onPress: async () => {
            try {
              await apartmentsApi.update(apt.id, { isActive: next });
              await queryClient.invalidateQueries({ queryKey: ['landlord-dashboard'] });
            } catch {
              Alert.alert('שגיאה', 'לא ניתן לעדכן את המודעה');
            }
          },
        },
      ]
    );
  }

  function openCopyModal(apt: Apartment) {
    setCopyModal({ visible: true, apt, style: 'professional', copy: '', loading: false });
  }

  async function generateCopy(apt: Apartment, style: CopyStyle) {
    setCopyModal((prev) => ({ ...prev, style, copy: '', loading: true }));
    try {
      const res = await apartmentsApi.generateMarketingCopy(apt.id, style);
      setCopyModal((prev) => ({ ...prev, copy: res.data.copy, loading: false }));
    } catch {
      setCopyModal((prev) => ({ ...prev, loading: false }));
      Alert.alert('שגיאה', 'לא ניתן ליצור תוכן כרגע. ודא שה-GEMINI_API_KEY מוגדר.');
    }
  }

  async function shareCopy(text: string) {
    try {
      await Share.share({ message: text });
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשתף');
    }
  }

  function confirmDelete(apt: Apartment) {
    const runDelete = () => {
      void (async () => {
        try {
          await apartmentsApi.deletePermanently(apt.id);
          await queryClient.invalidateQueries({ queryKey: ['landlord-dashboard'] });
          await queryClient.refetchQueries({ queryKey: ['landlord-dashboard'] });
        } catch (e: unknown) {
          let detail = 'לא ניתן למחוק את המודעה.';
          if (axios.isAxiosError(e)) {
            const server = (e.response?.data as { error?: string })?.error;
            const st = e.response?.status;
            if (server) detail = server;
            else if (st === 404) detail = 'המודעה לא נמצאה.';
            else if (st === 401 || st === 403) detail = 'אין הרשאה למחוק.';
          }
          Alert.alert('שגיאה', detail);
        }
      })();
    };

    Alert.alert(
      'מחיקת מודעה',
      `למחוק לצמיתות את "${apt.title}"? פעולה זו אינה הפיכה.`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: runDelete,
        },
      ],
      { cancelable: true }
    );
  }

  function renderItem({ item }: { item: Apartment }) {
    const thumb = getThumbUrl(item);
    const street = item.street ?? item.neighborhood;
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardMainPress}
          onPress={() => navigation.navigate('ApartmentDetail', { apartmentId: item.id })}
          activeOpacity={0.85}
        >
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]}>
              <Ionicons name="home-outline" size={28} color={C.textMut} />
            </View>
          )}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardSub}>
              {item.city}{street ? ` · ${street}` : ''} · {item.rooms} חד׳
            </Text>
            <Text style={styles.cardPrice}>{formatPrice((item as any).price)}</Text>
            <View style={styles.statsRow}>
              <Ionicons name="eye-outline" size={13} color={C.textMut} />
              <Text style={styles.statText}>{item.viewCount ?? 0}</Text>
              <Ionicons name="heart-outline" size={13} color={C.textMut} style={{ marginLeft: 8 }} />
              <Text style={styles.statText}>{item.likeCount ?? 0}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openCopyModal(item)}>
            <Ionicons name="sparkles-outline" size={22} color={C.statusTone.caution} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('EditListing', { apartmentId: item.id })}>
            <Ionicons name="create-outline" size={22} color={C.cyan} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => toggleActive(item)}>
            <Ionicons
              name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
              size={22}
              color={item.isActive ? C.cyan : C.textMut}
            />
          </TouchableOpacity>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={() => confirmDelete(item)}
            accessibilityLabel="מחק מודעה"
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          >
            <Ionicons name="trash-outline" size={22} color={C.statusTone.negativeSoft} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>המודעות שלי</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateListing')}
        >
          <Ionicons name="add" size={20} color={C.onInverse.primary} />
          <Text style={styles.createBtnText}>מודעה חדשה</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.cyan} />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="home-outline" size={56} color={C.textMut} />
          <Text style={styles.emptyText}>עדיין אין לך מודעות</Text>
          <TouchableOpacity
            style={styles.createBtnLarge}
            onPress={() => navigation.navigate('CreateListing')}
          >
            <Text style={styles.createBtnText}>פרסם את הדירה הראשונה שלך</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* F7: Marketing Copy Modal */}
      <Modal
        visible={copyModal.visible}
        animationType="slide"
        transparent
        onRequestClose={() => setCopyModal((p) => ({ ...p, visible: false }))}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Ionicons name="sparkles" size={20} color={C.statusTone.caution} />
              <Text style={styles.modalTitle}>יצירת תוכן שיווקי</Text>
              <TouchableOpacity onPress={() => setCopyModal((p) => ({ ...p, visible: false }))}>
                <Ionicons name="close" size={22} color={C.textMut} />
              </TouchableOpacity>
            </View>

            {copyModal.apt && (
              <Text style={styles.modalSub} numberOfLines={1}>{copyModal.apt.title}</Text>
            )}

            {/* Style selector */}
            <View style={styles.styleRow}>
              {COPY_STYLES.map(({ key, label, icon }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.styleBtn, copyModal.style === key && styles.styleBtnActive]}
                  onPress={() => setCopyModal((p) => ({ ...p, style: key, copy: '' }))}
                >
                  <Ionicons name={icon} size={16} color={copyModal.style === key ? C.onInverse.primary : C.textMut} />
                  <Text style={[styles.styleBtnText, copyModal.style === key && styles.styleBtnTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Generate button */}
            <TouchableOpacity
              style={[styles.generateBtn, copyModal.loading && styles.generateBtnDisabled]}
              disabled={copyModal.loading}
              onPress={() => copyModal.apt && generateCopy(copyModal.apt, copyModal.style)}
            >
              {copyModal.loading ? (
                <ActivityIndicator size="small" color={C.onInverse.primary} />
              ) : (
                <>
                  <Ionicons name="flash-outline" size={16} color={C.onInverse.primary} />
                  <Text style={styles.generateBtnText}>צור תוכן</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Generated copy */}
            {!!copyModal.copy && (
              <ScrollView style={styles.copyBox} showsVerticalScrollIndicator={false}>
                <Text style={styles.copyText}>{copyModal.copy}</Text>
              </ScrollView>
            )}

            {/* Share/copy action */}
            {!!copyModal.copy && (
              <TouchableOpacity style={styles.shareBtn} onPress={() => shareCopy(copyModal.copy)}>
                <Ionicons name="share-outline" size={16} color={C.cyan} />
                <Text style={styles.shareBtnText}>שתף / העתק</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Dark.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  header: { fontSize: 22, fontWeight: '800', color: C.onInverse.primary },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.cyan, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  createBtnText: { color: C.navy, fontWeight: '700', fontSize: 13 },
  createBtnLarge: { backgroundColor: C.cyan, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { flexDirection: 'row', backgroundColor: Dark.surface, borderRadius: 14, marginBottom: 12, overflow: 'hidden', alignItems: 'stretch', borderWidth: 1, borderColor: Dark.border },
  /** תמונה+טקסט בלבד — לא עוטף את עמודת הפעולות (מונע קינון TouchableOpacity שלא מקבל לחיצות) */
  cardMainPress: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 80 },
  thumb: { width: 80, height: 80 },
  thumbFallback: { backgroundColor: Dark.inset, justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, padding: 12 },
  cardTitle: { color: C.onInverse.primary, fontWeight: '700', fontSize: 14, textAlign: 'right', marginBottom: 2 },
  cardSub: { color: C.textMut, fontSize: 12, textAlign: 'right', marginBottom: 2 },
  cardPrice: { color: C.cyan, fontWeight: '700', fontSize: 14, textAlign: 'right', marginBottom: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statText: { color: C.textMut, fontSize: 12, marginLeft: 3 },
  cardActions: {
    flexDirection: 'column',
    paddingRight: 8,
    paddingLeft: 4,
    paddingVertical: 8,
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
    backgroundColor: Dark.surface,
  },
  actionBtn: { padding: 6 },
  actionBtnPressed: { opacity: 0.7 },
  emptyText: { color: C.textMut, fontSize: 16, textAlign: 'center' },
  // Modal
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: C.overlay.scrim60 },
  modalSheet: { backgroundColor: Dark.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: '75%', borderWidth: 1, borderColor: Dark.border },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  modalTitle: { flex: 1, color: C.onInverse.primary, fontWeight: '800', fontSize: 16, textAlign: 'right' },
  modalSub: { color: C.textMut, fontSize: 13, textAlign: 'right', marginBottom: 16 },
  styleRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  styleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: Dark.inset, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: Dark.border },
  styleBtnActive: { backgroundColor: C.cyan, borderColor: C.cyan },
  styleBtnText: { color: C.textMut, fontSize: 12, fontWeight: '600' },
  styleBtnTextActive: { color: C.navy },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.gold, paddingVertical: 12, borderRadius: 12, marginBottom: 14 },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: C.onInverse.primary, fontWeight: '700', fontSize: 14 },
  copyBox: { backgroundColor: Dark.inset, borderRadius: 12, padding: 14, marginBottom: 12, maxHeight: 160, borderWidth: 1, borderColor: Dark.border },
  copyText: { color: C.onInverse.secondary, fontSize: 14, lineHeight: 22, textAlign: 'right' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Dark.inset, borderWidth: 1, borderColor: C.cyan, paddingVertical: 11, borderRadius: 12 },
  shareBtnText: { color: C.cyan, fontWeight: '700', fontSize: 14 },
});
