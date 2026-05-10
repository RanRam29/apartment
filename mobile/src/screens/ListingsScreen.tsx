import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, Modal, Share, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { landlordApi, apartmentsApi } from '../services/api';
import type { Apartment, MainStackParamList } from '../types';

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
    Alert.alert(
      'מחיקת מודעה',
      `למחוק לצמיתות את "${apt.title}"? פעולה זו אינה הפיכה.`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await apartmentsApi.deletePermanently(apt.id);
              await queryClient.invalidateQueries({ queryKey: ['landlord-dashboard'] });
            } catch {
              Alert.alert('שגיאה', 'לא ניתן למחוק את המודעה');
            }
          },
        },
      ]
    );
  }

  function renderItem({ item }: { item: Apartment }) {
    const thumb = getThumbUrl(item);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ApartmentDetail', { apartmentId: item.id })}
        activeOpacity={0.85}
      >
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Ionicons name="home-outline" size={28} color="#3A3A5E" />
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardSub}>
            {item.city}{item.neighborhood ? ` · ${item.neighborhood}` : ''} · {item.rooms} חד׳
          </Text>
          <Text style={styles.cardPrice}>{formatPrice((item as any).price)}</Text>
          <View style={styles.statsRow}>
            <Ionicons name="eye-outline" size={13} color="#A0A0B2" />
            <Text style={styles.statText}>{item.viewCount ?? 0}</Text>
            <Ionicons name="heart-outline" size={13} color="#A0A0B2" style={{ marginLeft: 8 }} />
            <Text style={styles.statText}>{item.likeCount ?? 0}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openCopyModal(item)}>
            <Ionicons name="sparkles-outline" size={22} color="#F39C12" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('EditListing', { apartmentId: item.id })}>
            <Ionicons name="create-outline" size={22} color="#6C5CE7" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => toggleActive(item)}>
            <Ionicons
              name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
              size={22}
              color={item.isActive ? '#6C5CE7' : '#A0A0B2'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => confirmDelete(item)}
            accessibilityLabel="מחק מודעה"
          >
            <Ionicons name="trash-outline" size={22} color="#FF7675" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createBtnText}>מודעה חדשה</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="home-outline" size={56} color="#3A3A5E" />
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
              <Ionicons name="sparkles" size={20} color="#F39C12" />
              <Text style={styles.modalTitle}>יצירת תוכן שיווקי</Text>
              <TouchableOpacity onPress={() => setCopyModal((p) => ({ ...p, visible: false }))}>
                <Ionicons name="close" size={22} color="#A0A0B2" />
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
                  <Ionicons name={icon} size={16} color={copyModal.style === key ? '#fff' : '#A0A0B2'} />
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
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="flash-outline" size={16} color="#fff" />
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
                <Ionicons name="share-outline" size={16} color="#fff" />
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
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  header: { fontSize: 22, fontWeight: '800', color: '#fff' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6C5CE7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  createBtnLarge: { backgroundColor: '#6C5CE7', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { flexDirection: 'row', backgroundColor: '#2A2A3E', borderRadius: 14, marginBottom: 12, overflow: 'hidden', alignItems: 'center' },
  thumb: { width: 80, height: 80 },
  thumbFallback: { backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, padding: 12 },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 14, textAlign: 'right', marginBottom: 2 },
  cardSub: { color: '#A0A0B2', fontSize: 12, textAlign: 'right', marginBottom: 2 },
  cardPrice: { color: '#6C5CE7', fontWeight: '700', fontSize: 14, textAlign: 'right', marginBottom: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statText: { color: '#A0A0B2', fontSize: 12, marginLeft: 3 },
  cardActions: { flexDirection: 'column', paddingRight: 10, gap: 6, alignItems: 'center' },
  actionBtn: { padding: 4 },
  emptyText: { color: '#A0A0B2', fontSize: 16, textAlign: 'center' },
  // Modal
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { backgroundColor: '#22223A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  modalTitle: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 16, textAlign: 'right' },
  modalSub: { color: '#A0A0B2', fontSize: 13, textAlign: 'right', marginBottom: 16 },
  styleRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  styleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#2A2A3E', paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#3A3A5E' },
  styleBtnActive: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  styleBtnText: { color: '#A0A0B2', fontSize: 12, fontWeight: '600' },
  styleBtnTextActive: { color: '#fff' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F39C12', paddingVertical: 12, borderRadius: 12, marginBottom: 14 },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  copyBox: { backgroundColor: '#2A2A3E', borderRadius: 12, padding: 14, marginBottom: 12, maxHeight: 160 },
  copyText: { color: '#E0E0F0', fontSize: 14, lineHeight: 22, textAlign: 'right' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2A2A3E', borderWidth: 1, borderColor: '#6C5CE7', paddingVertical: 11, borderRadius: 12 },
  shareBtnText: { color: '#6C5CE7', fontWeight: '700', fontSize: 14 },
});
