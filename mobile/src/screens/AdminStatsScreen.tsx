import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { adminApi } from '../services/api';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';
import { useColors } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

// ─── Types ──────────────────────────────────────────────────────────────────
interface StatsData {
  users: { total: number; tenants: number; landlords: number; admins: number; verified: number; locked: number; premium: number; activeToday: number; activeWeek: number; activeMonth: number; registeredToday: number; registeredWeek: number; registeredMonth: number; tosAccepted: number };
  listings: { active: number; inactive: number; avgPrice: number; totalViews: number; totalLikes: number; topCities: { city: string; count: number }[] };
  payments: { totalLedgerRows: number; paid: number; pending: number; overdue: number; paidAmountIls: number; overdueAmountIls: number; invoiceCount: number };
  contracts: { active: number; pendingSigning: number; ended: number; expiring: number; amendments: number; guarantorsApproved: number; guarantorsPending: number };
  interactions: { totalSwipes: number; swipesToday: number; swipesWeek: number; likes: number; dislikes: number; superlikes: number; avgSeenDurationMs: number; matchesActive: number; matchesPending: number; matchesExpired: number };
  maintenance: { open: number; inProgress: number; waitingInvoice: number; closedThisMonth: number };
  engagement: { avgTrustScore: number; avgPoints: number; levelDistribution: Record<string, number>; messagesToday: number };
  security: { securityEvents24h: number; systemErrors24h: number; loginsToday: number; failedLoginsToday: number };
}

interface StatCard { label: string; value: string | number; color?: string }
interface Section { title: string; icon: keyof typeof Ionicons.glyphMap; cards: StatCard[] }

const fmt = (n: number) => n?.toLocaleString('he-IL') ?? '0';
const ils = (n: number) => `₪${fmt(n)}`;

export default function AdminStatsScreen() {
  const colors = useColors();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchStats = async () => {
    try {
      setError(null);
      const res = await adminApi.getDetailedStats();
      setStats(res.data);
      setLastUpdated(new Date().toLocaleTimeString('he-IL'));
    } catch (err: any) {
      setError(err?.response?.data?.error || 'שגיאה בטעינת סטטיסטיקות');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchStats(); };
  const toggle = (t: string) => setCollapsed(p => ({ ...p, [t]: !p[t] }));

  const buildSections = (s: StatsData): Section[] => [
    {
      title: 'משתמשים', icon: 'people',
      cards: [
        { label: 'סה"כ', value: fmt(s.users.total) },
        { label: 'שוכרים', value: fmt(s.users.tenants) },
        { label: 'משכירים', value: fmt(s.users.landlords) },
        { label: 'מנהלים', value: fmt(s.users.admins) },
        { label: 'מאומתים (KYC)', value: fmt(s.users.verified), color: C.success },
        { label: 'נעולים', value: fmt(s.users.locked), color: s.users.locked > 0 ? C.danger : undefined },
        { label: 'פרימיום', value: fmt(s.users.premium), color: '#D4AF37' },
        { label: 'אישרו ToS', value: fmt(s.users.tosAccepted) },
        { label: 'פעילים 24h', value: fmt(s.users.activeToday) },
        { label: 'פעילים 7d', value: fmt(s.users.activeWeek) },
        { label: 'פעילים 30d', value: fmt(s.users.activeMonth) },
        { label: 'נרשמו היום', value: fmt(s.users.registeredToday) },
        { label: 'נרשמו השבוע', value: fmt(s.users.registeredWeek) },
        { label: 'נרשמו החודש', value: fmt(s.users.registeredMonth) },
      ],
    },
    {
      title: 'דירות ושוק', icon: 'home',
      cards: [
        { label: 'מודעות פעילות', value: fmt(s.listings.active) },
        { label: 'לא פעילות', value: fmt(s.listings.inactive) },
        { label: 'ממוצע מחיר', value: ils(s.listings.avgPrice) },
        { label: 'סה"כ צפיות', value: fmt(s.listings.totalViews) },
        { label: 'סה"כ לייקים', value: fmt(s.listings.totalLikes) },
        ...(s.listings.topCities || []).map((c: any) => ({
          label: c.city || 'לא ידוע', value: fmt(parseInt(c.count)),
        })),
      ],
    },
    {
      title: 'תשלומים', icon: 'card',
      cards: [
        { label: 'שורות ledger', value: fmt(s.payments.totalLedgerRows) },
        { label: 'שולמו', value: fmt(s.payments.paid), color: C.success },
        { label: 'בהמתנה', value: fmt(s.payments.pending) },
        { label: 'באיחור', value: fmt(s.payments.overdue), color: s.payments.overdue > 0 ? C.danger : undefined },
        { label: 'סכום ששולם', value: ils(s.payments.paidAmountIls), color: C.success },
        { label: 'סכום באיחור', value: ils(s.payments.overdueAmountIls), color: s.payments.overdueAmountIls > 0 ? C.danger : undefined },
        { label: 'חשבוניות תחזוקה', value: fmt(s.payments.invoiceCount) },
      ],
    },
    {
      title: 'חוזים', icon: 'document-text',
      cards: [
        { label: 'פעילים', value: fmt(s.contracts.active), color: C.success },
        { label: 'ממתינים לחתימה', value: fmt(s.contracts.pendingSigning) },
        { label: 'הסתיימו', value: fmt(s.contracts.ended) },
        { label: 'עומדים לפוג', value: fmt(s.contracts.expiring), color: s.contracts.expiring > 0 ? '#D4AF37' : undefined },
        { label: 'בקשות תיקון', value: fmt(s.contracts.amendments) },
        { label: 'ערבים אושרו', value: fmt(s.contracts.guarantorsApproved), color: C.success },
        { label: 'ערבים ממתינים', value: fmt(s.contracts.guarantorsPending) },
      ],
    },
    {
      title: 'אינטראקציות', icon: 'swap-horizontal',
      cards: [
        { label: 'סה"כ סוויפים', value: fmt(s.interactions.totalSwipes) },
        { label: 'סוויפים היום', value: fmt(s.interactions.swipesToday) },
        { label: 'סוויפים השבוע', value: fmt(s.interactions.swipesWeek) },
        { label: 'לייקים', value: fmt(s.interactions.likes), color: C.success },
        { label: 'דיסלייקים', value: fmt(s.interactions.dislikes) },
        { label: 'סופר-לייק', value: fmt(s.interactions.superlikes), color: '#D4AF37' },
        { label: 'צפייה ממוצעת (ms)', value: fmt(s.interactions.avgSeenDurationMs) },
        { label: 'התאמות פעילות', value: fmt(s.interactions.matchesActive), color: C.success },
        { label: 'התאמות ממתינות', value: fmt(s.interactions.matchesPending) },
        { label: 'התאמות שפגו', value: fmt(s.interactions.matchesExpired) },
      ],
    },
    {
      title: 'תחזוקה', icon: 'build',
      cards: [
        { label: 'פתוחות', value: fmt(s.maintenance.open), color: s.maintenance.open > 0 ? C.danger : undefined },
        { label: 'בטיפול', value: fmt(s.maintenance.inProgress) },
        { label: 'ממתין לחשבונית', value: fmt(s.maintenance.waitingInvoice) },
        { label: 'נסגרו החודש', value: fmt(s.maintenance.closedThisMonth), color: C.success },
      ],
    },
    {
      title: 'מעורבות', icon: 'game-controller',
      cards: [
        { label: 'Trust Score ממוצע', value: fmt(s.engagement.avgTrustScore) },
        { label: 'ממוצע נקודות', value: fmt(s.engagement.avgPoints) },
        { label: 'הודעות היום', value: fmt(s.engagement.messagesToday) },
        ...Object.entries(s.engagement.levelDistribution || {}).map(([lvl, cnt]) => ({
          label: `רמה ${lvl}`, value: fmt(cnt as number),
        })),
      ],
    },
    {
      title: 'אבטחה', icon: 'shield-checkmark',
      cards: [
        { label: 'אירועי אבטחה 24h', value: fmt(s.security.securityEvents24h), color: s.security.securityEvents24h > 0 ? '#D4AF37' : undefined },
        { label: 'שגיאות מערכת 24h', value: fmt(s.security.systemErrors24h), color: s.security.systemErrors24h > 0 ? C.danger : undefined },
        { label: 'כניסות היום', value: fmt(s.security.loginsToday) },
        { label: 'כניסות שנכשלו', value: fmt(s.security.failedLoginsToday), color: s.security.failedLoginsToday > 0 ? C.danger : undefined },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ResponsiveContainer style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="stats-chart" size={24} color={dirApp.secondary} />
            <Text style={[styles.title, dirType.title]}>סטטיסטיקות מערכת</Text>
          </View>
          {lastUpdated ? (
            <Text style={[styles.updated, { color: colors.textMut }]}>
              עודכן לאחרונה: {lastUpdated}
            </Text>
          ) : null}
        </View>

        {error && (
          <View style={styles.banner}>
            <Ionicons name="alert-circle-outline" size={18} color={C.danger} />
            <Text style={[styles.bannerText, { color: C.danger }]}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={dirApp.secondary} />
          </View>
        ) : stats ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[dirApp.secondary]} />}
          >
            {buildSections(stats).map(section => {
              const isCollapsed = collapsed[section.title] ?? false;
              return (
                <View key={section.title} style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <TouchableOpacity style={styles.sectionHeader} onPress={() => toggle(section.title)} activeOpacity={0.7}>
                    <Ionicons name={isCollapsed ? 'chevron-back' : 'chevron-down'} size={18} color={colors.textMut} />
                    <Text style={[styles.sectionCount, { color: colors.textMut }]}>{section.cards.length}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={[styles.sectionTitle, { color: dirApp.primary }]}>{section.title}</Text>
                    <Ionicons name={section.icon} size={20} color={dirApp.secondary} />
                  </TouchableOpacity>
                  {!isCollapsed && (
                    <View style={styles.grid}>
                      {section.cards.map((card, i) => (
                        <View key={i} style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                          <Text style={[styles.cardValue, { color: card.color || dirApp.primary }]}>
                            {card.value}
                          </Text>
                          <Text style={[styles.cardLabel, { color: colors.textSub }]}>{card.label}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
            <View style={{ height: 100 }} />
          </ScrollView>
        ) : null}
      </ResponsiveContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, alignItems: 'flex-end' },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: dirApp.primary },
  updated: { marginTop: 4, fontSize: 12, textAlign: 'right' },
  banner: {
    flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#FDF2F2',
    borderWidth: 1, borderColor: '#F8B4B4', borderRadius: 10,
    marginHorizontal: 16, marginBottom: 8, padding: 10, gap: 8,
  },
  bannerText: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 12, gap: 10 },
  section: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionCount: { fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingBottom: 12, gap: 8 },
  card: {
    width: '47%', borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  cardValue: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  cardLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
