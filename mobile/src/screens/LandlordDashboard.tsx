import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { landlordApi } from '../services/api';
import type { LandlordDashboard as DashboardData } from '../types';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { useResponsive } from '../hooks/useResponsive';
import { useColors } from '../context/ThemeContext';

const PERIODS: { label: string; days: number }[] = [
  { label: '7 ימים', days: 7 },
  { label: '14 ימים', days: 14 },
  { label: '30 ימים', days: 30 },
];

export default function LandlordDashboard() {
  const colors = useColors();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { contentMaxWidth } = useResponsive();
  const chartWidth = Math.max(220, contentMaxWidth - 28);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['landlord-dashboard'],
    queryFn: () => landlordApi.dashboard().then((r) => r.data as DashboardData),
    refetchInterval: 60_000,
  });

  const [period, setPeriod] = useState(14);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={dirApp.secondary} />
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

  // BUG-007: Safe conversion rate sanitization (if denominator=0 → 0.0%)
  const rawRate = summary.conversionRate;
  const isInvalid = rawRate === 'Infinity' || rawRate === 'NaN' || !rawRate || Number(rawRate) === Infinity || isNaN(Number(rawRate)) || !isFinite(Number(rawRate));
  const conversionRateVal = isInvalid ? '0.0' : String(rawRate);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={dirApp.secondary} />}
        contentContainerStyle={styles.scroll}
      >
        <ResponsiveContainer>
        <Text style={styles.header}>דשבורד</Text>

        {/* ToS warning banner */}
        {!user?.tosAcceptedAt && (
          <TouchableOpacity
            style={styles.tosWarningBanner}
            onPress={() => navigation.navigate('Terms')}
            activeOpacity={0.9}
          >
            <View style={styles.tosWarningLeft}>
              <Ionicons name="chevron-back" size={16} color="#ffffff" />
            </View>
            <View style={styles.tosWarningTextContainer}>
              <Text style={styles.tosWarningTitle}>אישור תנאי השימוש נדרש ⚠️</Text>
              <Text style={styles.tosWarningSub}>
                טרם אישרת את תנאי השימוש. לחץ כאן לקריאה ואישור כדי לפתוח את האפשרות לפרסם ולמחוק מודעות.
              </Text>
            </View>
            <Ionicons name="warning-outline" size={24} color="#f59e0b" style={styles.tosWarningIcon} />
          </TouchableOpacity>
        )}

        {/* KPI row */}
        <View style={styles.kpiRow}>
          <KPICard icon="eye-outline"   label="צפיות"   value={summary.totalViews}              color={C.cyan} />
          <KPICard icon="heart-outline" label="לייקים"  value={summary.totalLikes}              color={C.coral} />
          <KPICard icon="trending-up"  label="המרה"    value={`${conversionRateVal}%`}    color={C.statusTone.positive} />
          <KPICard icon="home-outline"  label="פעילות"  value={summary.activeListings}          color={C.statusTone.caution} />
        </View>

        {/* Match status */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.sectionTitle}>סטטוס התאמות</Text>
          <View style={styles.matchRow}>
            <MatchStat label="ממתין"  value={summary.matches.pending}  color={C.statusTone.caution} />
            <MatchStat label="אושר"   value={summary.matches.accepted} color={C.statusTone.positive} />
            <MatchStat label="נדחה"   value={summary.matches.rejected} color={C.danger} />
          </View>
        </View>

        {/* Swipe trend chart */}
        {swipeTrend.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.chartHeader}>
              <PeriodToggle period={period} onChange={setPeriod} />
              <Text style={styles.sectionTitle}>לייקים לפי תאריך</Text>
            </View>
            <SwipeTrendChart data={swipeTrend} days={period} chartWidth={chartWidth} />
          </View>
        )}

        {/* Recent leads */}
        {recentPendingMatches.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
        </ResponsiveContainer>
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

function SwipeTrendChart({
  data,
  days,
  chartWidth,
}: {
  data: { date: string; count: number }[];
  days: number;
  chartWidth: number;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const sliced = data.slice(-days);
  const maxCount = Math.max(...sliced.map((p) => Number(p.count)), 1);
  const CHART_HEIGHT = 90;

  // Week-over-week comparison
  const thisWeek = sliced.slice(-7).reduce((s, p) => s + Number(p.count), 0);
  const lastWeek = sliced.slice(-14, -7).reduce((s, p) => s + Number(p.count), 0);
  const wowChange = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
  const totalPeriod = sliced.reduce((s, p) => s + Number(p.count), 0);

  const barWidth = Math.max(4, (chartWidth / sliced.length) - 2);

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
  const colors = useColors();
  return (
    <View style={[styles.kpiCard, { borderTopColor: color, backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: colors.textMut }]}>{label}</Text>
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
  container: { flex: 1, backgroundColor: dirApp.background },
  centered: { flex: 1, backgroundColor: dirApp.background, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 40, paddingTop: 8 },
  header: { fontSize: 22, fontWeight: '800', color: dirApp.primary, marginBottom: 16, textAlign: 'right' },

  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpiCard: {
    flex: 1,
    backgroundColor: dirApp.surfaceContainerLowest,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: `${dirApp.outlineVariant}AA`,
    shadowColor: dirApp.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiValue: { fontSize: 18, fontWeight: '800', color: dirApp.primary },
  kpiLabel: { fontSize: 10, color: dirApp.outline },

  section: {
    backgroundColor: dirApp.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${dirApp.outlineVariant}AA`,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: dirApp.primary, textAlign: 'right', marginBottom: 10 },

  matchRow: { flexDirection: 'row', justifyContent: 'space-around' },
  matchStat: { alignItems: 'center', gap: 4 },
  matchStatValue: { fontSize: 24, fontWeight: '800' },
  matchStatLabel: { fontSize: 11, color: dirApp.outline },

  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  periodRow: { flexDirection: 'row', gap: 4 },
  periodBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: dirApp.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: `${dirApp.outlineVariant}88`,
  },
  periodBtnActive: { backgroundColor: dirApp.secondaryContainer, borderColor: dirApp.secondary },
  periodBtnText: { color: dirApp.outline, fontSize: 10, fontWeight: '600' },
  periodBtnTextActive: { color: dirApp.onSecondaryContainer },

  chartSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chartTotal: { fontSize: 22, fontWeight: '800', color: dirApp.primary, textAlign: 'right' },
  chartTotalLabel: { fontSize: 10, color: dirApp.outline, textAlign: 'right' },
  wowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  wowBadgeUp: { backgroundColor: C.successAlpha(0.12) },
  wowBadgeDown: { backgroundColor: C.dangerMutedAlpha(0.12) },
  wowText: { fontSize: 11, fontWeight: '700' },

  tooltip: {
    alignSelf: 'center',
    backgroundColor: dirApp.surfaceContainerLowest,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${dirApp.outlineVariant}AA`,
  },
  tooltipDate: { color: dirApp.outline, fontSize: 10 },
  tooltipCount: { color: dirApp.primary, fontSize: 13, fontWeight: '700' },

  barsContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barWrap: { alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  bar: { backgroundColor: dirApp.secondary, borderRadius: 3, opacity: 0.85 },
  barSelected: { backgroundColor: dirApp.secondary, opacity: 1 },
  barWeekend: { backgroundColor: dirApp.outlineVariant, opacity: 0.95 },
  barLabel: { fontSize: 8, color: dirApp.outline, width: '100%', textAlign: 'center' },

  tosWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  tosWarningIcon: {
    marginLeft: 4,
  },
  tosWarningTextContainer: {
    flex: 1,
  },
  tosWarningTitle: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 2,
  },
  tosWarningSub: {
    color: '#e0e0e0',
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 18,
  },
  tosWarningLeft: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: `${dirApp.outlineVariant}66`,
  },
  leadInfo: { flex: 1 },
  leadName: { color: dirApp.primary, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  leadApt: { color: dirApp.outline, fontSize: 11, textAlign: 'right' },
  pendingTag: { backgroundColor: C.goldAlpha(0.15), borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pendingTagText: { color: C.statusTone.caution, fontSize: 11, fontWeight: '600' },

  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: `${dirApp.outlineVariant}66`,
  },
  activeIndicator: { width: 8, height: 8, borderRadius: 4 },
  listingInfo: { flex: 1, gap: 3 },
  listingTitle: { color: dirApp.primary, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  listingMeta: { color: dirApp.outline, fontSize: 11, textAlign: 'right' },
  perfBarTrack: { height: 3, backgroundColor: `${dirApp.outlineVariant}55`, borderRadius: 2, overflow: 'hidden' },
  perfBarFill: { height: 3, backgroundColor: dirApp.secondary, borderRadius: 2 },
  listingStats: { gap: 4, alignItems: 'flex-end' },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  listingStatText: { color: dirApp.outline, fontSize: 11 },
});
