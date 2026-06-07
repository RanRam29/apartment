import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  SafeAreaView, RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { matchesApi } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { usePersonaIsLandlord } from '../navigation/AdminAppModeContext';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import type { Match } from '../types';
import { useColors } from '../context/ThemeContext';
import { fontFamily } from '../theme/fonts';

type MatchTab = 'all' | 'active' | 'pending';

const colorsV3 = {
  primary: '#00091b',
  primaryContainer: '#002045',
  onPrimaryContainer: '#7089b3',
  secondary: '#006b5f',
  secondaryContainer: '#9cefdf',
  onSecondaryContainer: '#0b6f63',
  background: '#f8f9ff',
  surface: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f3f9',
  surfaceContainer: '#eceef3',
  onSurface: '#191c20',
  onSurfaceVariant: '#44474e',
  outline: '#74777f',
  outlineVariant: '#c4c6cf',
  actionCta: '#00cba9',
  error: '#ba1a1a',
};

export default function MatchesScreen() {
  const colors = useColors();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const isLandlord = usePersonaIsLandlord();
  const [tab, setTab] = useState<MatchTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['matches'],
    queryFn: () => matchesApi.list().then((r) => r.data.matches as Match[]),
    refetchInterval: 30_000,
  });

  const accepted = useMemo(() => data?.filter((m: Match) => m.status === 'accepted') ?? [], [data]);
  const pending  = useMemo(() => data?.filter((m: Match) => m.status === 'pending')  ?? [], [data]);

  const filteredMatches = useMemo(() => {
    let list: Match[] = [];
    if (tab === 'active') list = accepted;
    else if (tab === 'pending') list = pending;
    else list = [...accepted, ...pending];

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase();
    return list.filter((m) => {
      const isLand = m.landlordId === user?.id;
      const other = isLand ? m.tenant : m.landlord;
      const name = `${other?.firstName || ''} ${other?.lastName || ''}`.toLowerCase();
      const aptTitle = (m.apartment?.title || '').toLowerCase();
      const city = (m.apartment?.city || '').toLowerCase();
      return name.includes(query) || aptTitle.includes(query) || city.includes(query);
    });
  }, [tab, accepted, pending, searchQuery, user?.id]);

  const openChat = useCallback((match: Match) => {
    navigation.navigate('Chat', { matchId: match.id, title: match.apartment?.title ?? 'צ׳אט' });
  }, [navigation]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colorsV3.secondary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ResponsiveContainer style={{ flex: 1 }}>
        {/* Top App Bar */}
        <View style={[styles.shellHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            <Ionicons name="menu-outline" size={24} color={colorsV3.primary} />
          </TouchableOpacity>
          <h1 style={{ display: 'none' }}>רשימת התכתבויות</h1>
          <Text style={styles.headerTitle}>{isLandlord ? 'הודעות' : 'התאמות'}</Text>
          <TouchableOpacity 
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={colorsV3.primary} />
          </TouchableOpacity>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchWrapper}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border }]}
              placeholder="חפש שיחה..."
              placeholderTextColor={colors.textMut}
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign="right"
            />
            <Ionicons name="search" size={20} color={colors.textMut} style={styles.searchIcon} />
          </View>
        </View>

        {/* Tab Filter Row */}
        <View style={styles.tabRow}>
          {(['all', 'active', 'pending'] as const).map((key) => {
            const label =
              key === 'all' ? `הכל (${accepted.length + pending.length})`
              : key === 'active' ? `פעיל (${accepted.length})`
              : `ממתין (${pending.length})`;
            const active = tab === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setTab(key)}
                activeOpacity={0.8}
                style={[
                  styles.tabBtn, 
                  active && { 
                    backgroundColor: colorsV3.secondaryContainer,
                    borderColor: colorsV3.secondary 
                  }
                ]}
              >
                <Text style={[
                  styles.tabBtnText, 
                  active && { color: colorsV3.onSecondaryContainer, fontWeight: '700' }
                ]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Matches List */}
        <FlatList
          data={filteredMatches}
          keyExtractor={(m) => m.id}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colorsV3.secondary}
            />
          }
          renderItem={({ item, index }) => {
            const isLand = item.landlordId === user?.id;
            const otherParty = isLand ? item.tenant : item.landlord;
            const apartment = item.apartment;
            const coverImage = otherParty?.avatarUrl;
            const unreadCount = item.unreadCount;
            const isPending = item.status === 'pending';

            let timeAgo = '';
            try {
              timeAgo = formatDistanceToNow(
                new Date(item.lastMessageAt ?? item.createdAt),
                { addSuffix: false, locale: he }
              );
            } catch {
              timeAgo = 'עכשיו';
            }

            // Online status indicator (standard mockup feature)
            const isOnline = index % 2 === 0; 

            return (
              <TouchableOpacity 
                style={[styles.chatCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                onPress={() => openChat(item)}
                activeOpacity={0.8}
              >
                {/* Right Column: Avatar with online dot */}
                <View style={styles.avatarWrapper}>
                  {coverImage && !coverImage.includes('via.placeholder.com') ? (
                    <Image source={{ uri: coverImage }} style={styles.chatAvatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.chatAvatarFallback, { backgroundColor: colors.bg }]}>
                      <Ionicons name="person" size={20} color={colors.textMut} />
                    </View>
                  )}
                  {isOnline && <View style={styles.onlineDot} />}
                </View>

                {/* Middle Column: Info Details */}
                <View style={styles.chatDetails}>
                  <View style={styles.chatHeaderRow}>
                    <Text style={[styles.chatTime, { color: colors.textMut }]}>{timeAgo}</Text>
                    <Text style={[styles.chatName, { color: colors.text }]} numberOfLines={1}>
                      {otherParty?.firstName} {otherParty?.lastName}
                    </Text>
                  </View>
                  
                  {apartment && (
                    <View style={styles.chatLocationRow}>
                      <Ionicons name="location-outline" size={13} color={colorsV3.secondary} />
                      <Text style={[styles.chatLocationText, { color: colors.textSub }]} numberOfLines={1}>
                        {apartment.city}{apartment.street ? `, ${apartment.street}` : ''}
                      </Text>
                    </View>
                  )}

                  <Text 
                    style={[
                      styles.chatSnippet, 
                      { color: colors.textSub }, 
                      unreadCount && unreadCount > 0 ? styles.chatSnippetUnread : null
                    ]} 
                    numberOfLines={1}
                  >
                    {unreadCount && unreadCount > 0 
                      ? 'היי, האם הדירה עדיין רלוונטית לצפייה מחר בצהריים?' 
                      : 'שלחתי לך את חוזה השכירות המעודכן לבדיקה...'}
                  </Text>
                </View>

                {/* Left Column: Badges */}
                <View style={styles.chatBadgeCol}>
                  {isPending ? (
                    <View style={styles.pendingTag}>
                      <Text style={styles.pendingTagText}>ממתין</Text>
                    </View>
                  ) : unreadCount && unreadCount > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{unreadCount}</Text>
                    </View>
                  ) : (
                    <Ionicons name="chevron-back" size={16} color={colors.textMut} />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {tab === 'pending'
                  ? 'אין בקשות ממתינות'
                  : tab === 'active'
                    ? (isLandlord ? 'אין שיחות פעילות' : 'אין התאמות פעילות')
                    : (isLandlord ? 'אין שיחות עדיין' : 'אין התאמות עדיין')}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSub }]}>
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
  container: { flex: 1, backgroundColor: colorsV3.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shellHeader: {
    flexDirection: 'row-reverse', // RTL App Bar
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colorsV3.primary,
    fontFamily: fontFamily.bold,
  },
  headerIconBtn: {
    padding: 6,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchWrapper: {
    position: 'relative',
    height: 48,
    width: '100%',
    justifyContent: 'center',
  },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1.5,
    height: '100%',
    width: '100%',
    paddingRight: 44,
    paddingLeft: 16,
    textAlign: 'right',
    fontSize: 15,
    fontFamily: fontFamily.regular,
  },
  searchIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  tabRow: {
    flexDirection: 'row-reverse', // RTL filter tags
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: colorsV3.outlineVariant,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colorsV3.onSurfaceVariant,
    fontFamily: fontFamily.medium,
  },
  list: { paddingBottom: 24, paddingHorizontal: 16 },
  
  // Chats list item card
  chatCard: {
    flexDirection: 'row-reverse', // RTL columns layout
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#002045',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  chatAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c4c6cf',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colorsV3.secondary, // Teal online dot indicator
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  chatDetails: {
    flex: 1,
    alignItems: 'flex-end', // Text right alignment
    gap: 2,
  },
  chatHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  chatName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  chatTime: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
  },
  chatLocationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  chatLocationText: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
  },
  chatSnippet: {
    fontSize: 13,
    marginTop: 4,
    fontFamily: fontFamily.regular,
  },
  chatSnippetUnread: {
    fontWeight: '700',
    color: '#000000',
  },
  chatBadgeCol: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 24,
  },
  unreadBadge: {
    backgroundColor: colorsV3.onSecondaryContainer, // Dark teal count badge (#0b6f63)
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  pendingTag: {
    backgroundColor: 'rgba(0, 107, 95, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingTagText: {
    color: colorsV3.secondary,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fontFamily.semibold,
  },

  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colorsV3.primary, fontFamily: fontFamily.bold },
  emptySub: { fontSize: 13, color: colorsV3.onSurfaceVariant, fontFamily: fontFamily.regular },
});
