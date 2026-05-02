import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import type { Match } from '../types';

interface Props {
  match: Match;
  currentUserId: string;
  onPress: () => void;
}

export default function MatchCard({ match, currentUserId, onPress }: Props) {
  const isLandlord = match.landlordId === currentUserId;
  const otherParty = isLandlord ? match.tenant : match.landlord;
  const apartment  = match.apartment;
  const coverImage = apartment?.images?.[0]?.url;

  const timeAgo = match.lastMessageAt
    ? formatDistanceToNow(new Date(match.lastMessageAt), { addSuffix: true, locale: he })
    : formatDistanceToNow(new Date(match.createdAt), { addSuffix: true, locale: he });

  const isPending = match.status === 'pending';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.85}>
      {/* Apartment thumbnail */}
      <Image
        source={{ uri: coverImage || 'https://via.placeholder.com/80x80' }}
        style={styles.thumb}
        contentFit="cover"
      />

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {apartment?.title || 'דירה'}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {apartment?.city} · ₪{apartment?.price?.toLocaleString()}/חודש
        </Text>
        <View style={styles.partyRow}>
          {otherParty?.avatarUrl ? (
            <Image source={{ uri: otherParty.avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={12} color="#A0A0B2" />
            </View>
          )}
          <Text style={styles.partyName} numberOfLines={1}>
            {otherParty?.firstName} {otherParty?.lastName}
          </Text>
        </View>
      </View>

      {/* Right side */}
      <View style={styles.right}>
        <Text style={styles.time}>{timeAgo}</Text>
        {isPending ? (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>ממתין</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color="#A0A0B2" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A3E',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  thumb: { width: 64, height: 64, borderRadius: 12 },
  info: { flex: 1, gap: 3 },
  title: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'right' },
  location: { color: '#A0A0B2', fontSize: 12, textAlign: 'right' },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' },
  avatar: { width: 18, height: 18, borderRadius: 9 },
  avatarPlaceholder: { backgroundColor: '#3A3A5E', justifyContent: 'center', alignItems: 'center' },
  partyName: { color: '#A0A0B2', fontSize: 11 },
  right: { alignItems: 'flex-end', gap: 8 },
  time: { color: '#A0A0B2', fontSize: 11 },
  pendingBadge: {
    backgroundColor: 'rgba(108,92,231,0.2)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  pendingText: { color: '#6C5CE7', fontSize: 10, fontWeight: '600' },
});
