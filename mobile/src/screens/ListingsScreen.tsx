import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { landlordApi, apartmentsApi } from '../services/api';
import type { Apartment, MainStackParamList } from '../types';

type Props = NativeStackScreenProps<MainStackParamList, 'Tabs'>;

export default function ListingsScreen({ navigation }: Props) {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['landlord-dashboard'],
    queryFn: () => landlordApi.dashboard().then((r) => r.data),
  });

  const listings: Apartment[] = data?.listings ?? [];

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

  function renderItem({ item }: { item: Apartment }) {
    const thumb = item.images?.[0]?.url;
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
          <Text style={styles.cardPrice}>₪{item.price.toLocaleString()}/חודש</Text>
          <View style={styles.statsRow}>
            <Ionicons name="eye-outline" size={13} color="#A0A0B2" />
            <Text style={styles.statText}>{item.viewCount}</Text>
            <Ionicons name="heart-outline" size={13} color="#A0A0B2" style={{ marginLeft: 8 }} />
            <Text style={styles.statText}>{item.likeCount}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.toggleBtn} onPress={() => toggleActive(item)}>
          <Ionicons
            name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
            size={26}
            color={item.isActive ? '#6C5CE7' : '#A0A0B2'}
          />
        </TouchableOpacity>
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
  toggleBtn: { paddingRight: 12 },
  emptyText: { color: '#A0A0B2', fontSize: 16, textAlign: 'center' },
});
