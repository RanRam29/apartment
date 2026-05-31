import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { adminApi } from '../services/api';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';
import { useColors } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface StatsData {
  users: number;
  agreements: number;
  activeApartments: number;
}

export default function AdminStatsScreen() {
  const colors = useColors();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      const res = await adminApi.getStats();
      setStats(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'שגיאה בטעינת נתוני הסטטיסטיקה');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const getHebrewDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date().toLocaleDateString('he-IL', options);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ResponsiveContainer style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[dirApp.secondary]} />}
        >
          {/* Welcome Banner Card */}
          <View style={[styles.welcomeCard, { backgroundColor: dirApp.primaryContainer }]}>
            <View style={styles.welcomeLeft}>
              <Ionicons name="shield-checkmark" size={48} color={dirApp.actionTeal} />
            </View>
            <View style={styles.welcomeRight}>
              <Text style={styles.welcomeTitle}>שלום, מנהל מערכת</Text>
              <Text style={styles.welcomeSubtitle}>{getHebrewDate()}</Text>
              <Text style={styles.welcomeInfo}>נתוני הביצועים והמדדים המרכזיים של DirApp בזמן אמת</Text>
            </View>
          </View>

          <View style={styles.header}>
            <Text style={[styles.title, dirType.title, { color: dirApp.primary }]}>מדדים מרכזיים</Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={20} color={C.danger} />
              <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color={dirApp.secondary} />
            </View>
          ) : (
            <View style={styles.statsGrid}>
              {/* Users Stat Card */}
              <StatCard
                title='סה"כ משתמשים'
                value={stats?.users ?? 0}
                icon="people"
                color={dirApp.secondary}
                bgColor={`${dirApp.secondary}12`}
                description="סך כל החשבונות הרשומים באפליקציה"
              />

              {/* Agreements Stat Card */}
              <StatCard
                title="חוזי שכירות במערכת"
                value={stats?.agreements ?? 0}
                icon="document-text"
                color={C.gold}
                bgColor={`${C.gold}12`}
                description="חוזים דיגיטליים וצ'ק-אין/אאוט פעילים"
              />

              {/* Active Listings Stat Card */}
              <StatCard
                title="דירות פעילות"
                value={stats?.activeApartments ?? 0}
                icon="home"
                color={dirApp.actionTeal}
                bgColor={`${dirApp.actionTeal}12`}
                description="דירות מפורסמות וזמינות להתאמה כעת"
              />
            </View>
          )}
        </ScrollView>
      </ResponsiveContainer>
    </SafeAreaView>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  description: string;
}

function StatCard({ title, value, icon, color, bgColor, description }: StatCardProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.statCardHeader}>
        <View style={[styles.iconWrapper, { backgroundColor: bgColor }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={[styles.statCardTitle, dirType.label, { color: colors.text }]}>{title}</Text>
      </View>

      <Text style={[styles.statValue, { color: dirApp.primary }]}>
        {value.toLocaleString('he-IL')}
      </Text>

      <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

      <Text style={[styles.statDescription, dirType.caption, { color: colors.textSub }]}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 120,
  },
  welcomeCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  welcomeLeft: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeRight: {
    flex: 1,
    alignItems: 'flex-end', // RTL
  },
  welcomeTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  welcomeSubtitle: {
    color: dirApp.actionTeal,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'right',
  },
  welcomeInfo: {
    color: C.onInverse.muted,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
    lineHeight: 16,
  },
  header: {
    alignItems: 'flex-end', // RTL
    marginTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  errorBanner: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    backgroundColor: '#FDF2F2',
    borderWidth: 1,
    borderColor: '#F8B4B4',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right', // RTL
  },
  centerLoader: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    gap: 16,
  },
  statCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statCardHeader: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  statValue: {
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'right',
    marginTop: 10,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-CondensedBold' : 'sans-serif-condensed',
  },
  cardDivider: {
    height: 1,
    opacity: 0.15,
    marginVertical: 12,
  },
  statDescription: {
    textAlign: 'right',
    fontSize: 12,
  },
});
