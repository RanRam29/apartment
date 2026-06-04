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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
}

export default function LandlordDashboard() {
  const colors = useColors();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['landlord-dashboard-v2'],
    queryFn: () => landlordApi.dashboardV2().then((r) => r.data),
    refetchInterval: 30_000,
  });

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
});
