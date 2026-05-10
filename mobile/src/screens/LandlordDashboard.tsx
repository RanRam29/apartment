import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl, TouchableOpacity, Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { landlordApi } from '../services/api';
import type { LandlordDashboard as DashboardData } from '../types';
import { C, Dark } from '../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 64; // padding 16*2 + section padding 14*2

const PERIODS: { label: string; days: number }[] = [
  { label: '7 ימים', days: 7 },
  { label: '14 ימים', days: 14 },
  { label: '30 ימים', days: 30 },
];

export default function LandlordDashboard() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['landlord-dashboard'],
    queryFn: () => landlordApi.dashboard().then((r) => r.data as DashboardData),
    refetchInterval: 60_000,
  });

  const [period, setPeriod] = useState(14);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={C.cyan} />
      </SafeAreaView>
    );
  }

  const { summary, listings, recentPendingMatches, swipeTrend } = data ?? {
    summary: {
      totalListings: 0, activeListings: 0, totalViews: 0, totalLikes: 0,
      conversionRate: '0.0',
      matches: { pending: 0, accepted: 0, rejected: 0, expired: 0 },
    },
    listings: [], recentPendingMatches: [], swipeTrend: [],
  };

  const maxLikes = Math.max(...listings.map((l) => l.likeCount ?? 0), 1);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.cyan} />}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.header}>דשבורד</Text>

        {/* KPI row */}
        <View style={styles.kpiRow}>
          <KPICard icon="eye-outline"   label="צפיות"   value={summary.totalViews}              color={C.cyan} />
          <KPICard icon="heart-outline" label="לייקים"  value={summary.totalLikes}              color={C.coral} />
          <KPICard icon="trending-up"  label="המרה"    value={`${summary.conversionRate}%`}    color="#00E676" />
          <KPICard icon="home-outline"  label="פעילות"  value={summary.activeListings}          color="#FFA502" />
        </View>

        {/* Match status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>סטטוס התאמות</Text>
          <View style={styles.matchRow}>
            <MatchStat label="ממתין"  value={summary.matches.pending}  color="#FFA502" />
            <MatchStat label="אושר"   value={summary.matches.accepted} color="#00E676" />
            <MatchStat label="נדחה"   value={summary.matches.rejected} color={C.danger} />
          </View>
        </View>

        {/* Swipe trend chart */}
        {swipeTrend.length > 0 && (
          <View style={styles.section}>
            <View style={styles.chartHeader}>
              <PeriodToggle period={period} onChange={setPeriod} />
              <Text style={styles.sectionTitle}>לייקים לפי תאריך</Text>
            </View>
            <SwipeTrendChart data={swipeTrend} days={period} />
          </View>
        )}

        {/* Recent leads */}
        {recentPendingMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>לידים אחרונים</Text>
            {recentPendingMatches.map((match) => (
              <View key={match.id} style={styles.leadRow}>
                <View style={styles.leadInfo}>
                  <Text style={styles.leadName}>
                    {match.tenant?.firstName} {match.tenant?.lastName}
                  </Text>
                  <Text style={styles.leadApt} numberOfLines={1}>{match.apartment?.title}</Text>
                </View>
                <View style={styles.pendingTag}>
                  <Text style={styles.pendingTagText}>ממתין</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Listings with performance bars */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>המודעות שלי ({listings.length})</Text>
          {listings.map((apt) => {
            const likeRatio = (apt.likeCount ?? 0) / maxLikes;
            return (
              <View key={apt.id} style={styles.listingRow}>
                <View style={[styles.activeIndicator, { backgroundColor: apt.isActive ? C.success : C.danger }]} />
                <View style={styles.listingInfo}>
                  <Text style={styles.listingTitle} numberOfLines={1}>{apt.title}</Text>
                  <Text style={styles.listingMeta}>{apt.city} · ₪{apt.price?.toLocaleString()}</Text>
                  {/* Performance bar */}
                  <View style={styles.perfBarTrack}>
                    <View style={[styles.perfBarFill, { width: `${Math.round(likeRatio * 100)}%` }]} />
                  </View>
                </View>
                <View style={styles.listingStats}>
                  <View style={styles.statPill}>
                    <Ionicons name="eye-outline" size={11} color={C.textMut} />
                    <Text style={styles.listingStatText}>{apt.viewCount}</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Ionicons name="heart-outline" size={11} color={C.coral} />
                    <Text style={styles.listingStatText}>{apt.likeCount}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PeriodToggle({ period, onChange }: { period: number; onChange: (d: number) => void }) {
  return (
    <View style={styles.periodRow}>
      {PERIODS.map((p) => (
        <TouchableOpacity
          key={p.days}
          style={[styles.periodBtn, period === p.days && styles.periodBtnActive]}
          onPress={() => onChange(p.days)}
        >
          <Text style={[styles.periodBtnText, period === p.days && styles.periodBtnTextActive]}>
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SwipeTrendChart({ data, days }: { data: { date: string; count: number }[]; days: number }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const sliced = data.slice(-days);
  const maxCount = Math.max(...sliced.map((p) => Number(p.count)), 1);
  const CHART_HEIGHT = 90;

  // Week-over-week comparison
  const thisWeek = sliced.slice(-7).reduce((s, p) => s + Number(p.count), 0);
  const lastWeek = sliced.slice(-14, -7).reduce((s, p) => s + Number(p.count), 0);
  const wowChange = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
  const totalPeriod = sliced.reduce((s, p) => s + Number(p.count), 0);

  const barWidth = Math.max(4, (CHART_WIDTH / sliced.length) - 2);

  return (
    <View>
      {/* Summary row */}
      <View style={styles.chartSummary}>
        <View>
          <Text style={styles.chartTotal}>{totalPeriod}</Text>
          <Text style={styles.chartTotalLabel}>סה״כ בתקופה</Text>
        </View>
        {wowChange !== null && days >= 14 && (
          <View style={[styles.wowBadge, wowChange >= 0 ? styles.wowBadgeUp : styles.wowBadgeDown]}>
            <Ionicons
              name={wowChange >= 0 ? 'trending-up' : 'trending-down'}
              size={13}
              color={wowChange >= 0 ? C.success : C.danger}
            />
            <Text style={[styles.wowText, { color: wowChange >= 0 ? C.success : C.danger }]}>
              {wowChange >= 0 ? '+' : ''}{wowChange}% שבוע
            </Text>
          </View>
        )}
      </View>

      {/* Tooltip */}
      {selectedIdx !== null && sliced[selectedIdx] && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipDate}>
            {new Date(sliced[selectedIdx].date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
          </Text>
          <Text style={styles.tooltipCount}>{sliced[selectedIdx].count} לייקים</Text>
        </View>
      )}

      {/* Bars */}
      <View style={[styles.barsContainer, { height: CHART_HEIGHT }]}>
        {sliced.map((point, i) => {
          const count = Number(point.count);
          const barH = Math.max(4, (count / maxCount) * (CHART_HEIGHT - 16));
          const isSelected = selectedIdx === i;
          const isWeekEnd = new Date(point.date).getDay() === 6;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.barWrap, { width: barWidth }]}
              onPress={() => setSelectedIdx(selectedIdx === i ? null : i)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.bar,
                  { height: barH, width: barWidth - 2 },
                  isSelected && styles.barSelected,
                  isWeekEnd && styles.barWeekend,
                ]}
              />
              {/* Day label — only show every few bars if many */}
              {(sliced.length <= 14 || i % 3 === 0) && (
                <Text style={styles.barLabel} numberOfLines={1}>
                  {new Date(point.date).getDate()}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Dark.bg },
  centered: { flex: 1, backgroundColor: Dark.bg, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 16, textAlign: 'right' },

  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpiCard: {
    flex: 1, backgroundColor: Dark.surface, borderRadius: 12, padding: 10,
    alignItems: 'center', gap: 4, borderTopWidth: 3,
    borderWidth: 1,
    borderColor: Dark.border,
  },
  kpiValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  kpiLabel: { fontSize: 10, color: C.textMut },

  section: { backgroundColor: Dark.surface, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Dark.border },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#fff', textAlign: 'right', marginBottom: 10 },

  matchRow: { flexDirection: 'row', justifyContent: 'space-around' },
  matchStat: { alignItems: 'center', gap: 4 },
  matchStatValue: { fontSize: 24, fontWeight: '800' },
  matchStatLabel: { fontSize: 11, color: C.textMut },

  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  periodRow: { flexDirection: 'row', gap: 4 },
  periodBtn: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: Dark.inset,
  },
  periodBtnActive: { backgroundColor: Dark.periodActive },
  periodBtnText: { color: C.textMut, fontSize: 10, fontWeight: '600' },
  periodBtnTextActive: { color: C.cyan },

  chartSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chartTotal: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'right' },
  chartTotalLabel: { fontSize: 10, color: C.textMut, textAlign: 'right' },
  wowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  wowBadgeUp: { backgroundColor: 'rgba(16,185,129,0.12)' },
  wowBadgeDown: { backgroundColor: 'rgba(186,26,26,0.12)' },
  wowText: { fontSize: 11, fontWeight: '700' },

  tooltip: {
    alignSelf: 'center', backgroundColor: Dark.surface,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    marginBottom: 6, alignItems: 'center',
    borderWidth: 1,
    borderColor: Dark.border,
  },
  tooltipDate: { color: C.textMut, fontSize: 10 },
  tooltipCount: { color: '#fff', fontSize: 13, fontWeight: '700' },

  barsContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barWrap: { alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  bar: { backgroundColor: C.cyan, borderRadius: 3, opacity: 0.85 },
  barSelected: { backgroundColor: '#7AEFFF', opacity: 1 },
  barWeekend: { backgroundColor: C.navyMid, opacity: 0.95 },
  barLabel: { fontSize: 8, color: C.textMut, width: '100%', textAlign: 'center' },

  leadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Dark.border,
  },
  leadInfo: { flex: 1 },
  leadName: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'right' },
  leadApt: { color: C.textMut, fontSize: 11, textAlign: 'right' },
  pendingTag: { backgroundColor: 'rgba(255,165,2,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pendingTagText: { color: '#FFA502', fontSize: 11, fontWeight: '600' },

  listingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Dark.border,
  },
  activeIndicator: { width: 8, height: 8, borderRadius: 4 },
  listingInfo: { flex: 1, gap: 3 },
  listingTitle: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'right' },
  listingMeta: { color: C.textMut, fontSize: 11, textAlign: 'right' },
  perfBarTrack: { height: 3, backgroundColor: C.navyMidAlpha(0.6), borderRadius: 2, overflow: 'hidden' },
  perfBarFill: { height: 3, backgroundColor: C.cyan, borderRadius: 2 },
  listingStats: { gap: 4, alignItems: 'flex-end' },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  listingStatText: { color: C.textMut, fontSize: 11 },
});
