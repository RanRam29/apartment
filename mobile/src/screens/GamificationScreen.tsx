import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { gamificationApi } from '../services/api';
import { C, Dark } from '../theme';

// ─── Theme constants ──────────────────────────────────────────────────────────
const BG       = Dark.bg;
const CARD     = C.navyMid;
const ACCENT   = C.cyan;
const TEXT     = '#FFFFFF';
const TEXT_SUB = C.textMut;
const BORDER   = C.cyanAlpha(0.12);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Badge {
  id: string;
  name: string;
  earnedAt: string;
}

interface GamificationMe {
  userId: string;
  points: number;
  level: number;
  badges: Badge[];
  lastActivityAt: string | null;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  firstName: string;
  points: number;
  level: number;
  badges: Badge[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<number, string> = {
  1: 'Rookie',
  2: 'Explorer',
  3: 'Trusted',
  4: 'VIP',
};

const LEVEL_COLORS: Record<number, string> = {
  1: C.textMut,
  2: '#00B894',
  3: '#0984E3',
  4: C.gold,
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const BADGE_ICONS: Record<string, IoniconName> = {
  explorer:   'compass-outline',
  trusted:    'shield-checkmark-outline',
  vip:        'star-outline',
  verified:   'checkmark-circle-outline',
  deal_maker: 'briefcase-outline',
};

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('he-IL');
  } catch {
    return '';
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function LevelChip({ level }: { level: number }) {
  const color = LEVEL_COLORS[level] ?? C.textMut;
  const label = LEVEL_LABELS[level] ?? String(level);
  return (
    <View style={[styles.levelChip, { borderColor: color }]}>
      <Text style={[styles.levelChipText, { color }]}>{label}</Text>
    </View>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  const icon = BADGE_ICONS[badge.id] ?? 'ribbon-outline';
  return (
    <View style={styles.badgeCard}>
      <View style={styles.badgeIconWrap}>
        <Ionicons name={icon} size={26} color={ACCENT} />
      </View>
      <Text style={styles.badgeName}>{badge.name}</Text>
      <Text style={styles.badgeDate}>{fmtDate(badge.earnedAt)}</Text>
    </View>
  );
}

function LeaderRow({ entry }: { entry: LeaderboardEntry }) {
  const isTop3 = entry.rank <= 3;
  const rankColors = [C.gold, C.textMut, '#CD7F32'];
  const rankColor = isTop3 ? rankColors[entry.rank - 1] : TEXT_SUB;
  return (
    <View style={styles.leaderRow}>
      <Text style={[styles.leaderRank, { color: rankColor }]}>#{entry.rank}</Text>
      <Text style={styles.leaderName} numberOfLines={1}>{entry.firstName}</Text>
      <LevelChip level={entry.level} />
      <Text style={styles.leaderPoints}>{entry.points.toLocaleString()} נק'</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function GamificationScreen({ navigation }: any) {
  const { data: meData, isLoading: meLoading } = useQuery<GamificationMe>({
    queryKey: ['gamification-me'],
    queryFn:  () => gamificationApi.getMe().then((r) => r.data),
  });

  const { data: lbData, isLoading: lbLoading } = useQuery<{ leaderboard: LeaderboardEntry[] }>({
    queryKey: ['gamification-leaderboard'],
    queryFn:  () => gamificationApi.leaderboard().then((r) => r.data),
  });

  const me:          GamificationMe       = meData ?? { userId: '', points: 0, level: 1, badges: [], lastActivityAt: null };
  const leaderboard: LeaderboardEntry[]   = lbData?.leaderboard ?? [];
  const levelLabel                        = LEVEL_LABELS[me.level] ?? String(me.level);
  const levelColor                        = LEVEL_COLORS[me.level] ?? TEXT_SUB;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>הישגים ונקודות</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Points & Level */}
        {meLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : (
          <View style={styles.pointsCard}>
            <Text style={styles.pointsNumber}>{me.points.toLocaleString()}</Text>
            <Text style={styles.pointsLabel}>נקודות</Text>
            <View style={[styles.levelBadge, { borderColor: levelColor }]}>
              <Ionicons name="trophy-outline" size={14} color={levelColor} />
              <Text style={[styles.levelBadgeText, { color: levelColor }]}>{levelLabel}</Text>
            </View>

            {/* Progress bar to next level */}
            <ProgressBar points={me.points} level={me.level} />
          </View>
        )}

        {/* Badges */}
        <Text style={styles.sectionTitle}>התגים שלי</Text>
        {meLoading ? null : me.badges.length === 0 ? (
          <View style={styles.emptyBadges}>
            <Ionicons name="ribbon-outline" size={36} color={C.textMut} />
            <Text style={styles.emptyText}>צבור נקודות כדי לקבל תגים</Text>
          </View>
        ) : (
          <View style={styles.badgesGrid}>
            {me.badges.map((b) => <BadgeCard key={b.id} badge={b} />)}
          </View>
        )}

        {/* Leaderboard */}
        <Text style={styles.sectionTitle}>לוח מובילים</Text>
        {lbLoading ? (
          <ActivityIndicator color={ACCENT} style={{ marginVertical: 20 }} />
        ) : leaderboard.length === 0 ? (
          <View style={styles.emptyBadges}>
            <Text style={styles.emptyText}>אין נתונים עדיין</Text>
          </View>
        ) : (
          <View style={styles.leaderCard}>
            {leaderboard.map((entry) => (
              <React.Fragment key={entry.userId}>
                <LeaderRow entry={entry} />
                {entry.rank < leaderboard.length && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

const TIERS = [0, 100, 500, 1500];

function ProgressBar({ points, level }: { points: number; level: number }) {
  if (level >= 4) {
    return (
      <View style={styles.progressWrap}>
        <Text style={styles.progressLabel}>רמה מקסימלית!</Text>
      </View>
    );
  }
  const currentFloor = TIERS[level - 1];
  const nextFloor    = TIERS[level];
  const range        = nextFloor - currentFloor;
  const progress     = Math.min((points - currentFloor) / range, 1);
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
      </View>
      <Text style={styles.progressLabel}>
        {points} / {nextFloor} לרמה הבאה ({LEVEL_LABELS[level + 1]})
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn:     { padding: 4, width: 32 },
  headerTitle: { color: TEXT, fontSize: 17, fontWeight: '700' },

  scroll: { padding: 16, gap: 8, paddingBottom: 40 },
  center: { paddingVertical: 40, alignItems: 'center' },

  // Points card
  pointsCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 8,
  },
  pointsNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: ACCENT,
    letterSpacing: -2,
  },
  pointsLabel: {
    color: TEXT_SUB,
    fontSize: 14,
    fontWeight: '600',
    marginTop: -4,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
  },
  levelBadgeText: { fontSize: 13, fontWeight: '700' },

  // Progress bar
  progressWrap: { width: '100%', marginTop: 12, gap: 6 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: BORDER,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  progressLabel: { color: TEXT_SUB, fontSize: 11, textAlign: 'center' },

  // Section title
  sectionTitle: {
    color: TEXT_SUB,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'right',
  },

  // Empty state
  emptyBadges: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 8,
  },
  emptyText: { color: TEXT_SUB, fontSize: 14 },

  // Badges grid
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  badgeCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 90,
    borderWidth: 1,
    borderColor: BORDER,
  },
  badgeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.cyanAlpha(0.14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeName: { color: TEXT,     fontSize: 12, fontWeight: '700', textAlign: 'center' },
  badgeDate: { color: TEXT_SUB, fontSize: 10, textAlign: 'center' },

  // Leaderboard
  leaderCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 8,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  leaderRank:   { color: TEXT_SUB, fontSize: 13, fontWeight: '800', width: 28 },
  leaderName:   { color: TEXT, fontSize: 14, fontWeight: '600', flex: 1 },
  leaderPoints: { color: ACCENT, fontSize: 13, fontWeight: '700' },
  divider:      { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },

  // Level chip (used in leaderboard)
  levelChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  levelChipText: { fontSize: 10, fontWeight: '700' },
});
