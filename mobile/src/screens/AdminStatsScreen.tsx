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
  Platform,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { adminApi } from '../services/api';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';
import { useColors } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../utils/alert';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    'משתמשים': true,
    'דירות ושוק': true,
    'תשלומים': true,
    'חוזים': true,
    'אינטראקציות': true,
    'תחזוקה': true,
    'מעורבות': true,
    'אבטחה': true,
  });
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Mock static completed ticket state for the Pending Approvals Queue (Stitch Layout)
  const [completedTickets, setCompletedTickets] = useState([
    {
      id: 'TK-8842',
      title: 'Kitchen Pipe Replacement',
      address: '14 Rothschild Blvd, Apt 4C, Tel Aviv',
      technician: 'Rami Mizrahi',
      technicianRole: 'Plumbing Specialist',
      image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
      status: 'Awaiting Audit',
      audited: false,
    },
    {
      id: 'TK-9011',
      title: 'AC Unit Maintenance',
      address: '7 HaYarkon St, Herzliya',
      technician: 'Sarah Levi',
      technicianRole: 'HVAC Specialist',
      status: 'Awaiting Audit',
      audited: false,
    },
    {
      id: 'TK-9055',
      title: 'Elevator Sensor Recalibration',
      address: '42 Ibn Gabirol, Tel Aviv',
      technician: 'David Azulay',
      technicianRole: 'Senior Engineer',
      status: 'Awaiting Audit',
      audited: false,
    },
    {
      id: 'TK-9122',
      title: 'Emergency Panel Repair',
      address: '22 Dizengoff Sq, Tel Aviv',
      description: 'Full electrical panel replacement in building lobby completed. All circuits tested stable.',
      technician: 'Yosef Cohen',
      technicianRole: 'Senior Electrician',
      status: 'URGENT',
      audited: false,
    }
  ]);

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

  const handleAuditTicket = (ticketId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    showAlert(
      'אישור סגירת קריאה',
      `האם אתה מאשר את סיום העבודה עבור כרטיס ${ticketId} ושחרור התשלום לטכנאי?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'אשר וחתום',
          onPress: () => {
            setCompletedTickets(prev =>
              prev.map(t => (t.id === ticketId ? { ...t, audited: true } : t))
            );
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            showAlert('הצלחה', `כרטיס ${ticketId} אושר ונחתם בהצלחה.`);
          },
        },
      ]
    );
  };

  const pendingReviewsCount = completedTickets.filter(t => !t.audited).length;

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
      ],
    },
    {
      title: 'אינטראקציות', icon: 'swap-horizontal',
      cards: [
        { label: 'סה"כ סוויפים', value: fmt(s.interactions.totalSwipes) },
        { label: 'סוויפים היום', value: fmt(s.interactions.swipesToday) },
        { label: 'לייקים', value: fmt(s.interactions.likes), color: C.success },
        { label: 'דיסלייקים', value: fmt(s.interactions.dislikes) },
        { label: 'סופר-לייק', value: fmt(s.interactions.superlikes), color: '#D4AF37' },
        { label: 'התאמות פעילות', value: fmt(s.interactions.matchesActive), color: C.success },
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
            <Text style={[styles.title, dirType.title]}>סטטיסטיקות ומעקב</Text>
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
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[dirApp.secondary]} />}
          >
            {/* STITCH MOCKUP: PENDING APPROVALS QUEUE HEADER */}
            <View style={[styles.glassCard, { borderColor: colors.border }]}>
              <View style={styles.queueHeaderRow}>
                <View style={styles.queueBadge}>
                  <Ionicons name="time" size={16} color="#005db6" style={{ marginLeft: 4 }} />
                  <Text style={styles.queueBadgeText}>{pendingReviewsCount} ממתינים לביקורת</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.queueTitle}>תור אישורי עבודות</Text>
                  <Text style={styles.queueSubtitle}>בצע ביקורת על עבודות תחזוקה שהושלמו ואשר תשלום.</Text>
                </View>
              </View>
            </View>

            {/* STITCH TICKET CARDS LIST */}
            <View style={styles.ticketsList}>
              {completedTickets.map(t => {
                if (t.audited) return null;
                const isUrgent = t.status === 'URGENT';
                
                // Card 1: Kitchen Pipe (Large with Image)
                if (t.id === 'TK-8842') {
                  return (
                    <View key={t.id} style={[styles.ticketCard, { borderColor: colors.border }]}>
                      <Image source={{ uri: t.image }} style={styles.ticketCardImg} contentFit="cover" />
                      <View style={styles.ticketDetails}>
                        <View style={styles.ticketRowHeader}>
                          <View style={styles.auditBadge}>
                            <Ionicons name="eye-outline" size={12} color="#74777f" style={{ marginLeft: 3 }} />
                            <Text style={styles.auditBadgeText}>ממתין לביקורת</Text>
                          </View>
                          <Text style={styles.ticketIdText}>קריאה #{t.id}</Text>
                        </View>

                        <Text style={styles.ticketTitleText}>{t.title}</Text>
                        <View style={styles.locationRow}>
                          <Ionicons name="location-outline" size={14} color="#74777f" style={{ marginLeft: 4 }} />
                          <Text style={styles.locationText}>{t.address}</Text>
                        </View>

                        <View style={styles.techRow}>
                          <View style={styles.techAvatar}>
                            <Text style={styles.techInitials}>RM</Text>
                          </View>
                          <Text style={styles.techNameText}>טכנאי: {t.technician}</Text>
                        </View>

                        <TouchableOpacity 
                          style={styles.actionBtn} 
                          onPress={() => handleAuditTicket(t.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.actionBtnText}>בצע ביקורת וחתום</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                // Card 2: Urgent panel repair (Full width custom alert layout)
                if (isUrgent) {
                  return (
                    <View key={t.id} style={[styles.urgentCard, { borderColor: C.danger }]}>
                      <View style={styles.urgentHeader}>
                        <View style={styles.urgentBadge}>
                          <Ionicons name="flash" size={12} color="#ffffff" style={{ marginLeft: 3 }} />
                          <Text style={styles.urgentBadgeText}>דחוף ביותר</Text>
                        </View>
                        <Text style={styles.urgentIdText}>קריאה #{t.id} • {t.address}</Text>
                      </View>
                      <Text style={styles.urgentTitle}>{t.title}</Text>
                      <Text style={styles.urgentDesc}>{t.description}</Text>

                      <View style={styles.urgentFooter}>
                        <View style={styles.techRow}>
                          <View style={[styles.techAvatar, { backgroundColor: '#ffdad6' }]}>
                            <Text style={[styles.techInitials, { color: '#ba1a1a' }]}>YC</Text>
                          </View>
                          <Text style={[styles.techNameText, { color: '#002045' }]}>{t.technician} • הושלם לפני שעתיים</Text>
                        </View>
                        <TouchableOpacity 
                          style={[styles.actionBtn, { backgroundColor: '#ba1a1a' }]} 
                          onPress={() => handleAuditTicket(t.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.actionBtnText}>אשר בדחיפות</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                // Cards 3 & 4: HVAC & Elevator (Standard cards)
                return (
                  <View key={t.id} style={[styles.standardTicketCard, { borderColor: colors.border }]}>
                    <View style={styles.ticketRowHeader}>
                      <View style={styles.auditBadge}>
                        <Text style={styles.auditBadgeText}>ממתין לביקורת</Text>
                      </View>
                      <Text style={styles.ticketIdText}>קריאה #{t.id}</Text>
                    </View>

                    <Text style={styles.standardTitleText}>{t.title}</Text>
                    <Text style={styles.standardLocText}>{t.address}</Text>

                    <View style={styles.techAvatarRow}>
                      <View style={styles.techAvatarContainer}>
                        <View style={styles.techAvatar}>
                          <Text style={styles.techInitials}>{t.id === 'TK-9011' ? 'SL' : 'DA'}</Text>
                        </View>
                        <View>
                          <Text style={styles.techNameTextSmall}>{t.technician}</Text>
                          <Text style={styles.techRoleText}>{t.technicianRole}</Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={styles.standardActionBtn} 
                      onPress={() => handleAuditTicket(t.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.standardActionBtnText}>בצע ביקורת כעת</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {pendingReviewsCount === 0 && (
                <View style={styles.allAuditedCard}>
                  <Ionicons name="checkmark-circle" size={32} color={C.success} />
                  <Text style={styles.allAuditedText}>כל העבודות אושרו ונחתמו בהצלחה!</Text>
                </View>
              )}
            </View>

            {/* STITCH: COMPLIANCE CHECK CARD */}
            <View style={styles.complianceCard}>
              <View style={styles.complianceHeader}>
                <Ionicons name="document-lock-outline" size={24} color="#ffffff" style={{ marginLeft: 8 }} />
                <Text style={styles.complianceTitle}>בקרת תקינות רגולטורית</Text>
              </View>
              <Text style={styles.complianceBody}>
                כל קריאות התחזוקה שהושלמו דורשות ביקורת מנהל משנית לצורך שחרור בטוח של כספי הפיקדון או התשלום לטכנאי, בהתאם לתקנות הבטיחות העירוניות.
              </Text>
              <TouchableOpacity style={styles.complianceLink}>
                <Ionicons name="arrow-back" size={16} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.complianceLinkText}>צפה בהנחיות הביקורת</Text>
              </TouchableOpacity>
            </View>

            {/* SYSTEM METRICS TITLE */}
            <View style={styles.metricsHeaderRow}>
              <Text style={[styles.metricsTitle, { color: dirApp.primary }]}>מדדי מערכת כלליים</Text>
            </View>

            {/* METRICS COLLAPSIBLE SECTIONS */}
            {stats && buildSections(stats).map(section => {
              const isCollapsed = collapsed[section.title] ?? true;
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
        )}
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
  scrollContent: { padding: 16, gap: 14 },
  // Stitch Style Queue Card
  glassCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#002045',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  queueHeaderRow: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 12,
  },
  queueTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#002045',
  },
  queueSubtitle: {
    fontSize: 12,
    color: '#74777f',
    textAlign: 'right',
    marginTop: 2,
  },
  queueBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 93, 182, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-end',
  },
  queueBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#005db6',
  },
  // Completed Tickets List
  ticketsList: {
    gap: 12,
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  ticketCardImg: {
    width: '100%',
    height: 150,
  },
  ticketDetails: {
    padding: 16,
    alignItems: 'flex-end',
  },
  ticketRowHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#005db6',
  },
  auditBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#eff4ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  auditBadgeText: {
    fontSize: 9,
    color: '#43474e',
    fontWeight: '700',
  },
  ticketTitleText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0b1c30',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: '#74777f',
  },
  techRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  techAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d3e4fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  techInitials: {
    fontSize: 10,
    fontWeight: '900',
    color: '#002045',
  },
  techNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#43474e',
  },
  actionBtn: {
    backgroundColor: '#002045',
    borderRadius: 10,
    width: '100%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  // Urgent Card
  urgentCard: {
    backgroundColor: '#ffdad6',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
  },
  urgentHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  urgentBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#ba1a1a',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgentBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  urgentIdText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ba1a1a',
  },
  urgentTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#410002',
    textAlign: 'right',
    marginBottom: 4,
  },
  urgentDesc: {
    fontSize: 12,
    color: '#410002',
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 12,
  },
  urgentFooter: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(186, 26, 26, 0.1)',
    paddingTop: 10,
  },
  // Standard Ticket Card
  standardTicketCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-end',
  },
  standardTitleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0b1c30',
    marginBottom: 4,
  },
  standardLocText: {
    fontSize: 12,
    color: '#74777f',
    marginBottom: 10,
  },
  techAvatarRow: {
    flexDirection: 'row-reverse',
    width: '100%',
    padding: 8,
    backgroundColor: '#eff4ff',
    borderRadius: 8,
    marginBottom: 12,
  },
  techAvatarContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  techNameTextSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0b1c30',
  },
  techRoleText: {
    fontSize: 9,
    color: '#74777f',
  },
  standardActionBtn: {
    borderWidth: 1,
    borderColor: '#002045',
    borderRadius: 8,
    width: '100%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  standardActionBtnText: {
    color: '#002045',
    fontSize: 11,
    fontWeight: '800',
  },
  allAuditedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
    gap: 8,
  },
  allAuditedText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.success,
  },
  // Compliance Info Card
  complianceCard: {
    backgroundColor: '#1a365d',
    borderRadius: 16,
    padding: 16,
    marginTop: 6,
  },
  complianceHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
  },
  complianceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  complianceBody: {
    fontSize: 12,
    color: '#c4c6cf',
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 12,
  },
  complianceLink: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  complianceLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    textDecorationLine: 'underline',
  },
  // System Metrics
  metricsHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 4,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  section: { borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionCount: { fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingBottom: 12, gap: 8 },
  card: {
    width: '47%', borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1,
  },
  cardValue: { fontSize: 20, fontWeight: '900', marginBottom: 3 },
  cardLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
});
