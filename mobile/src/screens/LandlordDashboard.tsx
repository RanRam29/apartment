import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { landlordApi } from '../services/api';
import type { LandlordDashboard as DashboardData } from '../types';

export default function LandlordDashboard() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['landlord-dashboard'],
    queryFn: () => landlordApi.dashboard().then((r) => r.data as DashboardData),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </SafeAreaView>
    );
  }

  const { summary, listings, recentPendingMatches, swipeTrend } = data ?? {
    summary: { totalListings: 0, activeListings: 0, totalViews: 0, totalLikes: 0, conversionRate: '0.0', matches: { pending: 0, accepted: 0, rejected: 0, expired: 0 } },
    listings: [], recentPendingMatches: [], swipeTrend: [],
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6C5CE7" />}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.header}>דשבורד</Text>

        {/* KPI row */}
        <View style={styles.kpiRow}>
          <KPICard icon="eye-outline"       label="צפיות"      value={summary.totalViews}     color="#6C5CE7" />
          <KPICard icon="heart-outline"     label="לייקים"     value={summary.totalLikes}     color="#FF4757" />
          <KPICard icon="trending-up"       label="המרה"       value={`${summary.conversionRate}%`} color="#00E676" />
          <KPICard icon="home-outline"      label="פעילות"     value={summary.activeListings} color="#FFA502" />
        </View>

        {/* Matches summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>סטטוס התאמות</Text>
          <View style={styles.matchRow}>
            <MatchStat label="ממתין"  value={summary.matches.pending}  color="#FFA502" />
            <MatchStat label="אושר"   value={summary.matches.accepted} color="#00E676" />
            <MatchStat label="נדחה"   value={summary.matches.rejected} color="#FF4757" />
          </View>
        </View>

        {/* 30-day trend */}
        {swipeTrend.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>לייקים — 30 יום אחרונים</Text>
            <View style={styles.trendBar}>
              {swipeTrend.slice(-14).map((point, i) => {
                const maxCount = Math.max(...swipeTrend.map((p) => Number(p.count)), 1);
                const height = Math.max(4, (Number(point.count) / maxCount) * 60);
                return (
                  <View key={i} style={styles.trendBarItem}>
                    <View style={[styles.trendBarFill, { height }]} />
                    <Text style={styles.trendBarLabel}>
                      {new Date(point.date).getDate()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recent pending leads */}
        {recentPendingMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>לידים אחרונים</Text>
            {recentPendingMatches.map((match) => (
              <View key={match.id} style={styles.leadRow}>
                <View style={styles.leadInfo}>
                  <Text style={styles.leadName}>
                    {match.tenant?.firstName} {match.tenant?.lastName}
                  </Text>
                  <Text style={styles.leadApt} numberOfLines={1}>
                    {match.apartment?.title}
                  </Text>
                </View>
                <View style={styles.pendingTag}>
                  <Text style={styles.pendingTagText}>ממתין</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Listings overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>המודעות שלי ({listings.length})</Text>
          {listings.map((apt) => (
            <View key={apt.id} style={styles.listingRow}>
              <View style={[styles.activeIndicator, { backgroundColor: apt.isActive ? '#00E676' : '#FF4757' }]} />
              <View style={styles.listingInfo}>
                <Text style={styles.listingTitle} numberOfLines={1}>{apt.title}</Text>
                <Text style={styles.listingMeta}>{apt.city} · ₪{apt.price?.toLocaleString()}</Text>
              </View>
              <View style={styles.listingStats}>
                <Text style={styles.listingStatText}>
                  <Ionicons name="eye-outline" size={11} /> {apt.viewCount}
                </Text>
                <Text style={styles.listingStatText}>
                  <Ionicons name="heart-outline" size={11} /> {apt.likeCount}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function KPICard({ icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <View style={[styles.kpiCard, { borderTopColor: color }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function MatchStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.matchStat}>
      <Text style={[styles.matchStatValue, { color }]}>{value}</Text>
      <Text style={styles.matchStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  centered: { flex: 1, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 16, textAlign: 'right' },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  kpiCard: {
    flex: 1, backgroundColor: '#2A2A3E', borderRadius: 12, padding: 10,
    alignItems: 'center', gap: 4, borderTopWidth: 3,
  },
  kpiValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  kpiLabel: { fontSize: 10, color: '#A0A0B2' },
  section: { backgroundColor: '#2A2A3E', borderRadius: 16, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#fff', textAlign: 'right', marginBottom: 12 },
  matchRow: { flexDirection: 'row', justifyContent: 'space-around' },
  matchStat: { alignItems: 'center', gap: 4 },
  matchStatValue: { fontSize: 24, fontWeight: '800' },
  matchStatLabel: { fontSize: 11, color: '#A0A0B2' },
  trendBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 72 },
  trendBarItem: { flex: 1, alignItems: 'center', gap: 3 },
  trendBarFill: { width: '100%', backgroundColor: '#6C5CE7', borderRadius: 2 },
  trendBarLabel: { fontSize: 8, color: '#A0A0B2' },
  leadRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#3A3A5E',
  },
  leadInfo: { flex: 1 },
  leadName: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'right' },
  leadApt: { color: '#A0A0B2', fontSize: 11, textAlign: 'right' },
  pendingTag: { backgroundColor: 'rgba(255,165,2,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pendingTagText: { color: '#FFA502', fontSize: 11, fontWeight: '600' },
  listingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#3A3A5E',
  },
  activeIndicator: { width: 8, height: 8, borderRadius: 4 },
  listingInfo: { flex: 1 },
  listingTitle: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'right' },
  listingMeta: { color: '#A0A0B2', fontSize: 11, textAlign: 'right' },
  listingStats: { flexDirection: 'row', gap: 10 },
  listingStatText: { color: '#A0A0B2', fontSize: 11 },
});
