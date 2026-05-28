import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import type { Match } from '../types';

interface Props {
  match: Match;
  currentUserId: string;
  unreadCount?: number;
  onPress: () => void;
}

export default function MatchCard({ match, currentUserId, unreadCount, onPress }: Props) {
  const isLandlord  = match.landlordId === currentUserId;
  const otherParty  = isLandlord ? match.tenant : match.landlord;
  const apartment   = match.apartment;
  const coverImage  = apartment?.images?.[0]?.url;
  const isPending   = match.status === 'pending';

  const timeAgo = formatDistanceToNow(
    new Date(match.lastMessageAt ?? match.createdAt),
    { addSuffix: true, locale: he }
  );

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      {coverImage ? (
        <Image
          source={{ uri: coverImage }}
          style={styles.thumb}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name="home-outline" size={24} color={C.textMut} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{apartment?.title || 'דירה'}</Text>
        <Text style={styles.location} numberOfLines={1}>
          {apartment?.city} · ₪{apartment?.price?.toLocaleString()}/חודש
        </Text>
        <View style={styles.partyRow}>
          {otherParty?.avatarUrl && !otherParty.avatarUrl.includes('via.placeholder.com') ? (
            <Image source={{ uri: otherParty.avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={{width:40,height:40,borderRadius:20,backgroundColor:'#334',justifyContent:'center',alignItems:'center'}}>
              <Ionicons name="person" size={20} color={C.textMut} />
            </View>
          )}
          <Text style={styles.partyName} numberOfLines={1}>
            {otherParty?.firstName} {otherParty?.lastName}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.time}>{timeAgo}</Text>
        {isPending ? (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>ממתין</Text>
          </View>
        ) : unreadCount && unreadCount > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={C.textMut} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: dirApp.surfaceContainerLowest,
    borderRadius: 16, padding: 12, marginBottom: 10, gap: 12,
    borderWidth: 1, borderColor: `${dirApp.outlineVariant}AA`,
    shadowColor: dirApp.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  thumb: { width: 62, height: 62, borderRadius: 12 },
  thumbFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info:  { flex: 1, gap: 3 },
  title: { color: dirApp.primary, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  location: { color: C.textSub, fontSize: 12, textAlign: 'right' },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'flex-end' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { backgroundColor: C.border, justifyContent: 'center', alignItems: 'center' },
  partyName: { color: C.textMut, fontSize: 11 },
  right: { alignItems: 'flex-end', gap: 8 },
  time:  { color: C.textMut, fontSize: 11 },
  pendingBadge: {
    backgroundColor: `${dirApp.secondaryContainer}66`,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  pendingText: { color: dirApp.secondary, fontSize: 10, fontWeight: '600' },
  unreadBadge: {
    backgroundColor: dirApp.secondary,
    borderRadius: 10,
    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  unreadText: { color: dirApp.onSecondary, fontSize: 11, fontWeight: '700' },
});
