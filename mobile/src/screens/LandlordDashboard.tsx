import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Linking,
  Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../store/useAuthStore';
import { landlordApi } from '../services/api';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { useColors } from '../context/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { fontFamily } from '../theme/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
}

export default function LandlordDashboard() {
  const colors = useColors();
  const { isDesktop } = useResponsive();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const { data: v2Data, isLoading: v2Loading, refetch: refetchV2, isRefetching: isRefetchingV2 } = useQuery({
    queryKey: ['landlord-dashboard-v2'],
    queryFn: () => landlordApi.dashboardV2().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: v1Data, isLoading: v1Loading, refetch: refetchV1, isRefetching: isRefetchingV1 } = useQuery({
    queryKey: ['landlord-dashboard-v1'],
    queryFn: () => landlordApi.dashboard().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const data = v2Data;
  const isLoading = v2Loading || v1Loading;
  const isRefetching = isRefetchingV2 || isRefetchingV1;

  const refetch = async () => {
    await Promise.all([refetchV2(), refetchV1()]);
  };

  const handleActionPress = (screen: string, params?: any) => {
    Haptics.selectionAsync();
    navigation.navigate(screen, params);
  };

  const getScoreColor = (score: number) => {
    if (score <= 30) return '#EF4444'; // Red
    if (score <= 60) return '#F59E0B'; // Orange
    if (score <= 80) return '#10B981'; // Light Green
    return '#047857'; // Dark Green
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={dirApp.secondary} />
        <Text style={[styles.loadingText, { color: colors.textMut }]}>טוען נתונים...</Text>
      </SafeAreaView>
    );
  }

  const metrics = data?.metrics || {
    activeListings: 0,
    activeContracts: 0,
    pendingLeads: 0,
    pendingPayments: 0,
    openTickets: 0,
  };

  const activities = data?.activities || [];
  const trustScore = data?.trustScore ?? user?.trustScore ?? 50;
  const scoreColor = getScoreColor(trustScore);

  if (isDesktop) {
    const activeProperties = v1Data?.summary?.activeListings ?? v2Data?.metrics?.activeListings ?? 0;
    const newInquiries = v1Data?.summary?.matches?.pending ?? v2Data?.metrics?.pendingLeads ?? 0;
    const activeContractsNum = v2Data?.metrics?.activeContracts ?? 0;
    const calculatedRevenue = v1Data?.listings
      ? v1Data.listings.filter((l: any) => l.isActive).reduce((sum: number, l: any) => sum + (l.price || 0), 0)
      : 0;
    const monthlyRevenue = calculatedRevenue > 0 ? `₪${calculatedRevenue.toLocaleString()}` : '₪84,500';

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Desktop Header bar */}
        <View style={[styles.desktopHeader, { borderBottomColor: colors.border, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.desktopTitle, { color: colors.text }]}>שלום, {user?.firstName} {user?.lastName} 👋</Text>
            <Text style={[styles.desktopSubtitle, { color: colors.textMut }]}>
              סקירת הנכסים והפעילויות שלך להיום
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={refetch}>
            <Ionicons name="refresh-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.desktopScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={dirApp.secondary} />
          }
        >
          <ResponsiveContainer>
            {/* ToS warning banner */}
            {!user?.tosAcceptedAt && (
              <TouchableOpacity
                style={styles.tosWarningBanner}
                onPress={() => handleActionPress('Terms')}
                activeOpacity={0.9}
              >
                <View style={styles.tosWarningLeft}>
                  <Ionicons name="chevron-back" size={16} color="#ffffff" />
                </View>
                <View style={styles.tosWarningTextContainer}>
                  <Text style={styles.tosWarningTitle}>אישור תנאי השימוש נדרש ⚠️</Text>
                  <Text style={styles.tosWarningSub}>
                    טרם אישרת את תנאי השימוש. לחץ כאן לקריאה ואישור כדי לפתוח את האפשרויות במלואן.
                  </Text>
                </View>
                <Ionicons name="warning-outline" size={24} color="#f59e0b" style={styles.tosWarningIcon} />
              </TouchableOpacity>
            )}

            {/* Stats Row */}
            <View style={styles.desktopStatsRow}>
              <View style={[styles.desktopStatsCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={styles.statsCardInfo}>
                  <Text style={[styles.statsCardLabel, { color: colors.textMut }]}>נכסים פעילים</Text>
                  <Text style={[styles.statsCardValue, { color: colors.text }]}>{activeProperties}</Text>
                </View>
                <View style={[styles.statsCardIconCircle, { backgroundColor: `${C.cyan}18` }]}>
                  <Ionicons name="business" size={24} color={C.cyan} />
                </View>
              </View>

              <View style={[styles.desktopStatsCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={styles.statsCardInfo}>
                  <Text style={[styles.statsCardLabel, { color: colors.textMut }]}>פניות חדשות</Text>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.statsCardValue, { color: colors.text }]}>{newInquiries}</Text>
                    {newInquiries > 0 ? (
                      <View style={{ backgroundColor: '#006b5f', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>חדש</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={[styles.statsCardIconCircle, { backgroundColor: `${C.statusTone.caution}18` }]}>
                  <Ionicons name="person-add" size={24} color={C.statusTone.caution} />
                </View>
              </View>

              <View style={[styles.desktopStatsCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={styles.statsCardInfo}>
                  <Text style={[styles.statsCardLabel, { color: colors.textMut }]}>חוזים פעילים</Text>
                  <Text style={[styles.statsCardValue, { color: colors.text }]}>{activeContractsNum}</Text>
                </View>
                <View style={[styles.statsCardIconCircle, { backgroundColor: `${C.accent.violet}18` }]}>
                  <Ionicons name="document-text" size={24} color={C.accent.violet} />
                </View>
              </View>

              <View style={[styles.desktopStatsCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={styles.statsCardInfo}>
                  <Text style={[styles.statsCardLabel, { color: colors.textMut }]}>הכנסה חודשית</Text>
                  <Text style={[styles.statsCardValue, { color: colors.text }]}>{monthlyRevenue}</Text>
                </View>
                <View style={[styles.statsCardIconCircle, { backgroundColor: `${C.statusTone.positive}18` }]}>
                  <Ionicons name="wallet-outline" size={24} color={C.statusTone.positive} />
                </View>
              </View>
            </View>

            {/* Main grid containing columns */}
            <View style={styles.desktopMainGrid}>
              {/* Left Column: Wide (2/3 width) */}
              <View style={styles.desktopWideColumn}>
                {/* My Properties Section */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitleDesktop, { color: colors.text }]}>הנכסים שלי</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Listings')}>
                    <Text style={[styles.sectionHeaderLink, { color: dirApp.secondary }]}>צפה בכל הנכסים</Text>
                  </TouchableOpacity>
                </View>

                {/* Property Cards Grid */}
                <View style={styles.propertiesGrid}>
                  {v1Data?.listings?.slice(0, 4).map((apt: any) => (
                    <View key={apt.id} style={[styles.desktopPropertyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                      <View style={styles.propertyCardImageContainer}>
                        {apt.images && apt.images[0] ? (
                          <Image source={{ uri: apt.images[0] }} style={styles.propertyCardImage} />
                        ) : (
                          <View style={[styles.propertyCardFallbackImage, { backgroundColor: colors.border }]}>
                            <Ionicons name="image-outline" size={32} color={colors.textMut} />
                          </View>
                        )}
                        <View style={[styles.propertyStatusBadge, { backgroundColor: apt.isActive ? '#006b5f' : '#ba1a1a' }]}>
                          <Text style={styles.propertyStatusText}>{apt.isActive ? 'מושכר' : 'פנוי'}</Text>
                        </View>
                      </View>
                      <View style={styles.propertyCardInfo}>
                        <Text style={[styles.propertyCardTitle, { color: colors.text }]} numberOfLines={1}>
                          {apt.street ? `${apt.street} ${apt.buildingNumber || ''}, ` : ''}{apt.city}
                        </Text>
                        <View style={styles.propertyCardFooter}>
                          <Text style={[styles.propertyCardPrice, { color: colors.text }]}>₪{apt.price?.toLocaleString()} / חודש</Text>
                          <View style={styles.propertyCardStats}>
                            <Ionicons name="eye-outline" size={14} color={colors.textMut} />
                            <Text style={[styles.propertyCardStatsText, { color: colors.textMut }]}>{apt.viewCount || 0}</Text>
                            <Ionicons name="heart-outline" size={14} color={colors.textMut} style={{ marginRight: 6 }} />
                            <Text style={[styles.propertyCardStatsText, { color: colors.textMut }]}>{apt.likeCount || 0}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                  {(!v1Data?.listings || v1Data.listings.length === 0) && (
                    <View style={[styles.emptySectionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                      <Ionicons name="home-outline" size={40} color={colors.textMut} />
                      <Text style={[styles.emptySectionText, { color: colors.textMut }]}>אין נכסים פעילים כרגע</Text>
                    </View>
                  )}
                </View>

                {/* Recent Leads Table Section */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitleDesktop, { color: colors.text }]}>פניות אחרונות משוכרים</Text>
                </View>
                <View style={[styles.leadsTableCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  {/* Table Headers */}
                  <View style={[styles.tableHeaderRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <Text style={[styles.tableHeaderCell, { color: colors.textSub, flex: 2 }]}>שוכר פוטנציאלי</Text>
                    <Text style={[styles.tableHeaderCell, { color: colors.textSub, flex: 2 }]}>נכס מבוקש</Text>
                    <Text style={[styles.tableHeaderCell, { color: colors.textSub, flex: 1.5 }]}>סטטוס</Text>
                    <Text style={[styles.tableHeaderCell, { color: colors.textSub, flex: 1, textAlign: 'center' }]}>פעולות</Text>
                  </View>
                  {/* Table Rows */}
                  {v1Data?.recentPendingMatches?.slice(0, 5).map((match: any) => (
                    <View key={match.id} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                      <View style={[{ flex: 2, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }]}>
                        <View style={styles.tableAvatar}>
                          {match.tenant?.avatarUrl ? (
                            <Image source={{ uri: match.tenant.avatarUrl }} style={styles.avatarImg} />
                          ) : (
                            <Text style={styles.avatarText}>
                              {(match.tenant?.firstName?.[0] || 'ש').toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.tableCellName, { color: colors.text }]}>
                          {match.tenant?.firstName} {match.tenant?.lastName}
                        </Text>
                      </View>
                      <Text style={[styles.tableCell, { flex: 2, color: colors.textSub }]}>
                        {match.apartment?.title || 'דירה'}
                      </Text>
                      <View style={[{ flex: 1.5 }]}>
                        <View style={[styles.tableStatusBadge, { backgroundColor: `${C.cyan}18` }]}>
                          <Text style={[styles.tableStatusText, { color: C.cyan }]}>חדש</Text>
                        </View>
                      </View>
                      <View style={[{ flex: 1, alignItems: 'center' }]}>
                        <TouchableOpacity
                          style={[styles.tableChatBtn, { backgroundColor: '#006b5f' }]}
                          onPress={() => handleActionPress('Matches')}
                        >
                          <Text style={styles.tableChatBtnText}>צ'אט</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {(!v1Data?.recentPendingMatches || v1Data.recentPendingMatches.length === 0) && (
                    <View style={styles.tableEmptyState}>
                      <Ionicons name="chatbubbles-outline" size={40} color={colors.textMut} />
                      <Text style={[styles.emptySectionText, { color: colors.textMut }]}>אין פניות חדשות כרגע</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Right Column: Narrow (1/3 width) */}
              <View style={styles.desktopNarrowColumn}>
                {/* Trust Score circular Widget */}
                <TouchableOpacity
                  style={[styles.sidebarCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                  onPress={() => handleActionPress('Gamification')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.sidebarCardTitle, { color: colors.text }]}>מדד האמינות שלך</Text>
                  <View style={styles.trustScoreContainer}>
                    <View style={[styles.progressRingOuter, { borderColor: `${scoreColor}22` }]}>
                      <View style={[styles.progressRingInner, { borderColor: scoreColor }]}>
                        <Text style={[styles.trustScoreNum, { color: colors.text }]}>{trustScore}</Text>
                        <Text style={[styles.trustScoreUnit, { color: colors.textMut }]}>/ 100</Text>
                      </View>
                    </View>
                    <View style={styles.trustScoreDetails}>
                      <Text style={[styles.trustScoreBadgeText, { color: scoreColor }]}>
                        {trustScore > 75 ? 'מעולה! 🏆' : 'טוב מאוד 👍'}
                      </Text>
                      <Text style={[styles.trustScoreSub, { color: colors.textMut }]}>
                        לחץ לשיפור הציון ⚡
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Payments Flow Progress Card */}
                <View style={[styles.sidebarCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <Text style={[styles.sidebarCardTitle, { color: colors.text }]}>תזרים תשלומים</Text>
                  <View style={styles.paymentFlowContainer}>
                    <View style={styles.flowRow}>
                      <Text style={[styles.flowLabel, { color: colors.textSub }]}>התקבל החודש:</Text>
                      <Text style={[styles.flowValue, { color: '#006b5f', fontWeight: '700' }]}>₪72,000</Text>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.bg }]}>
                      <View style={[styles.progressBarFill, { width: '85%', backgroundColor: '#006b5f' }]} />
                    </View>
                    <View style={styles.flowRow}>
                      <Text style={[styles.flowLabel, { color: colors.textSub }]}>יתרה צפויה:</Text>
                      <Text style={[styles.flowValue, { color: colors.text, fontWeight: '700' }]}>₪12,500</Text>
                    </View>
                  </View>
                </View>

                {/* Expiring Contracts Card */}
                <View style={[styles.sidebarCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <Text style={[styles.sidebarCardTitle, { color: colors.text }]}>חוזים קרובים לסיום</Text>
                  <View style={styles.expiringList}>
                    <View style={styles.expiringItem}>
                      <View style={styles.expiringItemText}>
                        <Text style={[styles.expiringName, { color: colors.text }]}>משפחת שלום</Text>
                        <Text style={[styles.expiringDays, { color: colors.textMut }]}>בעוד 45 ימים</Text>
                      </View>
                      <View style={[styles.expiringBadge, { backgroundColor: `${dirApp.secondaryContainer}44` }]}>
                        <Text style={[styles.expiringBadgeText, { color: dirApp.onSecondaryContainer }]}>חדש</Text>
                      </View>
                    </View>
                    <View style={styles.expiringItem}>
                      <View style={styles.expiringItemText}>
                        <Text style={[styles.expiringName, { color: colors.text }]}>יוסי לוין</Text>
                        <Text style={[styles.expiringDays, { color: colors.textMut }]}>בעוד 58 ימים</Text>
                      </View>
                      <View style={[styles.expiringBadge, { backgroundColor: `${dirApp.secondaryContainer}44` }]}>
                        <Text style={[styles.expiringBadgeText, { color: dirApp.onSecondaryContainer }]}>חדש</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* System Alerts Card */}
                <View style={[styles.sidebarCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <Text style={[styles.sidebarCardTitle, { color: colors.text }]}>התראות מערכת</Text>
                  <View style={styles.alertsList}>
                    <View style={[styles.alertItem, { borderBottomColor: colors.border }]}>
                      <Ionicons name="construct-outline" size={20} color={C.danger} style={{ marginLeft: 8 }} />
                      <View style={styles.alertContent}>
                        <Text style={[styles.alertTitle, { color: colors.text }]}>דיווח על תקלה</Text>
                        <Text style={[styles.alertDesc, { color: colors.textSub }]}>נזילה במטבח - הרצל 15</Text>
                      </View>
                    </View>
                    <View style={styles.alertItem}>
                      <Ionicons name="sync-outline" size={20} color="#006b5f" style={{ marginLeft: 8 }} />
                      <View style={styles.alertContent}>
                        <Text style={[styles.alertTitle, { color: colors.text }]}>חתימה דיגיטלית</Text>
                        <Text style={[styles.alertDesc, { color: colors.textSub }]}>נוסף פיצ'ר חדש לחתימה</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ResponsiveContainer>
        </ScrollView>

        {/* FAB for quick action (desktop bottom-left) */}
        <TouchableOpacity
          style={styles.desktopFAB}
          onPress={() => handleActionPress('CreateListing')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#00091b" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={dirApp.secondary} />
        }
        contentContainerStyle={styles.scroll}
      >
        <ResponsiveContainer>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={[styles.profileButton, { borderColor: colors.border }]}
              onPress={() => handleActionPress('Profile')}
            >
              <Ionicons name="person-outline" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.header, { color: colors.text }]}>דשבורד משכיר</Text>
          </View>

          {/* ToS warning banner */}
          {!user?.tosAcceptedAt && (
            <TouchableOpacity
              style={styles.tosWarningBanner}
              onPress={() => handleActionPress('Terms')}
              activeOpacity={0.9}
            >
              <View style={styles.tosWarningLeft}>
                <Ionicons name="chevron-back" size={16} color="#ffffff" />
              </View>
              <View style={styles.tosWarningTextContainer}>
                <Text style={styles.tosWarningTitle}>אישור תנאי השימוש נדרש ⚠️</Text>
                <Text style={styles.tosWarningSub}>
                  טרם אישרת את תנאי השימוש. לחץ כאן לקריאה ואישור כדי לפתוח את האפשרויות במלואן.
                </Text>
              </View>
              <Ionicons name="warning-outline" size={24} color="#f59e0b" style={styles.tosWarningIcon} />
            </TouchableOpacity>
          )}

          {/* Trust Score Mini Widget */}
          <TouchableOpacity
            style={[styles.trustWidgetCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => handleActionPress('Gamification')}
            activeOpacity={0.8}
          >
            <View style={styles.trustHeader}>
              <View style={styles.trustBadge}>
                <Ionicons name="shield-checkmark" size={16} color={scoreColor} />
                <Text style={[styles.trustBadgeText, { color: scoreColor }]}>ציון אמינות</Text>
              </View>
              <Text style={[styles.trustScoreValue, { color: colors.text }]}>{trustScore}/100</Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: colors.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)' }]}>
              <View style={[styles.progressBarFill, { width: `${trustScore}%`, backgroundColor: scoreColor }]} />
            </View>
            <Text style={[styles.trustFooterText, { color: colors.textMut }]}>
              לחץ כאן לצפייה במשימות, הישגים וטבלת המובילים לשיפור הציון ⚡
            </Text>
          </TouchableOpacity>

          {/* Metrics Carousel Title */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>סקירה מהירה</Text>

          {/* Metrics Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContainer}
            style={styles.carouselOuter}
          >
            <MetricCard
              icon="home-outline"
              label="מודעות פעילות"
              value={metrics.activeListings}
              color={C.cyan}
            />
            <MetricCard
              icon="document-text-outline"
              label="חוזים פעילים"
              value={metrics.activeContracts}
              color={C.accent.violet}
            />
            <MetricCard
              icon="people-outline"
              label="לידים ממתינים"
              value={metrics.pendingLeads}
              color={C.statusTone.caution}
            />
            <MetricCard
              icon="card-outline"
              label="תשלומים לטיפול"
              value={metrics.pendingPayments}
              color={C.statusTone.positive}
            />
            <MetricCard
              icon="hammer-outline"
              label="קריאות שירות"
              value={metrics.openTickets}
              color={C.danger}
            />
          </ScrollView>

          {/* Quick Actions Title */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>פעולות מהירות</Text>

          {/* Quick Actions 2x2 Grid */}
          <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
              <TouchableOpacity
                style={[styles.gridItem, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                onPress={() => handleActionPress('CreateListing')}
                activeOpacity={0.8}
              >
                <View style={[styles.iconWrapper, { backgroundColor: C.cyanAlpha(0.15) }]}>
                  <Ionicons name="add-circle" size={24} color={C.cyan} />
                </View>
                <Text style={[styles.gridItemTitle, { color: colors.text }]}>פרסם מודעה</Text>
                <Text style={[styles.gridItemDesc, { color: colors.textMut }]}>יצירת דירה להשכרה</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.gridItem, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                onPress={() => handleActionPress('Leads')}
                activeOpacity={0.8}
              >
                <View style={[styles.iconWrapper, { backgroundColor: C.goldAlpha(0.15) }]}>
                  <Ionicons name="people" size={24} color={C.statusTone.caution} />
                </View>
                <Text style={[styles.gridItemTitle, { color: colors.text }]}>ניהול לידים</Text>
                <Text style={[styles.gridItemDesc, { color: colors.textMut }]}>מענה לבקשות שוכרים</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.gridRow}>
              <TouchableOpacity
                style={[styles.gridItem, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                onPress={() => handleActionPress('ContractUpload')}
                activeOpacity={0.8}
              >
                <View style={[styles.iconWrapper, { backgroundColor: C.violetAlpha(0.15) }]}>
                  <Ionicons name="document-attach" size={24} color={C.accent.violet} />
                </View>
                <Text style={[styles.gridItemTitle, { color: colors.text }]}>העלאת חוזה</Text>
                <Text style={[styles.gridItemDesc, { color: colors.textMut }]}>ניתוח חוזה עם AI</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.gridItem, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                onPress={() => handleActionPress('Maintenance')}
                activeOpacity={0.8}
              >
                <View style={[styles.iconWrapper, { backgroundColor: C.dangerMutedAlpha(0.15) }]}>
                  <Ionicons name="hammer" size={24} color={C.danger} />
                </View>
                <Text style={[styles.gridItemTitle, { color: colors.text }]}>קריאות שירות</Text>
                <Text style={[styles.gridItemDesc, { color: colors.textMut }]}>מעקב ותיקון תקלות</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Activity Feed Title */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>עדכונים אחרונים</Text>

          {/* Mixed Activity Feed */}
          <View style={[styles.feedCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            {activities.length > 0 ? (
              activities.map((item: any, index: number) => {
                let iconName: keyof typeof Ionicons.glyphMap = 'notifications';
                let iconColor: string = C.cyan;
                let routeName = 'Dashboard';
                let routeParams = {};

                if (item.type === 'lead') {
                  iconName = 'person-add';
                  iconColor = C.statusTone.caution;
                  routeName = 'Leads';
                } else if (item.type === 'payment') {
                  iconName = item.data?.status === 'OVERDUE' ? 'alert-circle' : 'wallet';
                  iconColor = item.data?.status === 'OVERDUE' ? C.danger : C.statusTone.positive;
                  routeName = 'Ledger';
                  routeParams = { agreementId: item.data?.agreementId };
                } else if (item.type === 'ticket') {
                  iconName = 'construct';
                  iconColor = C.accent.violet;
                  routeName = 'Maintenance';
                  routeParams = { agreementId: item.data?.agreementId };
                }

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.activityItem,
                      index < activities.length - 1 && styles.borderBottom,
                      { borderBottomColor: `${colors.border}44` },
                    ]}
                    onPress={() => handleActionPress(routeName, routeParams)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.activityLeft}>
                      <Text style={[styles.activityTime, { color: colors.textMut }]}>
                        {new Date(item.date).toLocaleDateString('he-IL', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={[styles.activityTitle, { color: colors.text }]}>{item.title}</Text>
                      <Text style={[styles.activityDesc, { color: colors.textMut }]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    </View>
                    <View style={[styles.activityIconWrapper, { backgroundColor: `${iconColor}22` }]}>
                      <Ionicons name={iconName} size={18} color={iconColor} />
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="file-tray-outline" size={40} color={colors.textMut} />
                <Text style={[styles.emptyText, { color: colors.textMut }]}>אין עדכונים או פעילויות לאחרונה</Text>
              </View>
            )}
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ icon, label, value, color }: MetricCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={[styles.metricIconCircle, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textMut }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  scroll: {
    paddingBottom: 40,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right',
  },
  tosWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
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
  trustWidgetCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trustHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trustBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  trustBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  trustScoreValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  trustFooterText: {
    fontSize: 11,
    textAlign: 'right',
    lineHeight: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  carouselOuter: {
    marginBottom: 20,
  },
  carouselContainer: {
    paddingHorizontal: 16,
    gap: 12,
    flexDirection: 'row-reverse',
  },
  metricCard: {
    width: 110,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  metricIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  gridContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridItem: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'flex-end',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  gridItemDesc: {
    fontSize: 11,
  },
  feedCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  borderBottom: {
    borderBottomWidth: 1,
  },
  activityIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  activityContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  activityDesc: {
    fontSize: 11,
    textAlign: 'right',
  },
  activityLeft: {
    marginRight: 8,
  },
  activityTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Desktop specific styles
  desktopHeader: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  desktopTitle: {
    fontSize: 24,
    fontFamily: fontFamily.extrabold,
    marginBottom: 4,
    textAlign: 'right',
  },
  desktopSubtitle: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    textAlign: 'right',
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 8,
  },
  desktopScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 60,
  },
  desktopStatsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
  },
  desktopStatsCard: {
    flex: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statsCardInfo: {
    alignItems: 'flex-end',
  },
  statsCardLabel: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    marginBottom: 4,
  },
  statsCardValue: {
    fontSize: 22,
    fontFamily: fontFamily.extrabold,
  },
  statsCardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopMainGrid: {
    flexDirection: 'row-reverse',
    gap: 24,
  },
  desktopWideColumn: {
    flex: 2,
    gap: 24,
  },
  desktopNarrowColumn: {
    flex: 1,
    gap: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleDesktop: {
    fontSize: 18,
    fontFamily: fontFamily.extrabold,
  },
  sectionHeaderLink: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
  },
  propertiesGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  desktopPropertyCard: {
    width: '48.5%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  propertyCardImageContainer: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  propertyCardImage: {
    width: '100%',
    height: '100%',
  },
  propertyCardFallbackImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyStatusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  propertyStatusText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: fontFamily.bold,
  },
  propertyCardInfo: {
    padding: 12,
    alignItems: 'flex-end',
  },
  propertyCardTitle: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    marginBottom: 8,
  },
  propertyCardFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  propertyCardPrice: {
    fontSize: 14,
    fontFamily: fontFamily.extrabold,
  },
  propertyCardStats: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  propertyCardStatsText: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    marginLeft: 4,
  },
  emptySectionCard: {
    width: '100%',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptySectionText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    textAlign: 'center',
  },
  leadsTableCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row-reverse',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontFamily: fontFamily.bold,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tableCell: {
    textAlign: 'right',
    fontSize: 13,
    fontFamily: fontFamily.regular,
  },
  tableAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 71, 186, 0.1)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 12,
    fontFamily: fontFamily.bold,
    color: '#0047ba',
  },
  tableCellName: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
  },
  tableStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tableStatusText: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
  },
  tableChatBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tableChatBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: fontFamily.bold,
  },
  tableEmptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  sidebarCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sidebarCardTitle: {
    fontSize: 15,
    fontFamily: fontFamily.extrabold,
    marginBottom: 12,
    textAlign: 'right',
  },
  trustScoreContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  progressRingOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustScoreNum: {
    fontSize: 18,
    fontFamily: fontFamily.extrabold,
  },
  trustScoreUnit: {
    fontSize: 9,
    fontFamily: fontFamily.medium,
  },
  trustScoreDetails: {
    alignItems: 'flex-end',
    flex: 1,
  },
  trustScoreBadgeText: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    marginBottom: 4,
  },
  trustScoreSub: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
  },
  paymentFlowContainer: {
    gap: 12,
  },
  flowRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flowLabel: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
  },
  flowValue: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
  },
  expiringList: {
    gap: 12,
  },
  expiringItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expiringItemText: {
    alignItems: 'flex-end',
  },
  expiringName: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
  },
  expiringDays: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
  },
  expiringBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expiringBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
  },
  alertsList: {
    gap: 12,
  },
  alertItem: {
    flexDirection: 'row-reverse',
    paddingBottom: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  alertContent: {
    alignItems: 'flex-end',
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
    marginBottom: 2,
  },
  alertDesc: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
  },
  desktopFAB: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0047ba',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 999,
  },
});
