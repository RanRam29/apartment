import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../types';
import { C, Dark } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { fontFamily } from '../theme/fonts';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import * as Haptics from 'expo-haptics';
import { useColors } from '../context/ThemeContext';
import { swipeApi, matchesApi } from '../services/api';
import { showAlert } from '../utils/alert';

type Props = NativeStackScreenProps<MainStackParamList, 'LandlordProfile'>;

export default function LandlordProfileScreen({ route, navigation }: Props) {
  const colors = useColors();
  const { landlord, apartmentId } = route.params;

  const getScoreColor = (score: number) => {
    if (score <= 30) return '#EF4444'; // Red
    if (score <= 60) return '#F59E0B'; // Orange
    if (score <= 80) return '#10B981'; // Light Green
    return '#047857'; // Dark Green
  };

  const getScoreLabel = (score: number) => {
    if (score <= 30) return 'טעון שיפור ⚠️';
    if (score <= 60) return 'בינוני 📊';
    if (score <= 80) return 'טוב מאוד 👍';
    return 'מעולה! 🏆';
  };

  const trustScore = landlord.trustScore ?? 50;
  const scoreColor = getScoreColor(trustScore);
  const initials = `${landlord.firstName?.[0] ?? ''}${landlord.lastName?.[0] ?? ''}`.toUpperCase();

  const handleActionPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!apartmentId) {
      showAlert('צ׳אט עם בעל הדירה', 'לשיחה עם בעל הדירה, אנא כנס דרך פרסום המודעה המבוקשת.');
      return;
    }

    try {
      // 1. Check if a match already exists
      const matchesRes = await matchesApi.list();
      const existingMatch = matchesRes.data.matches?.find(
        (m: any) => m.apartmentId === apartmentId
      );

      if (existingMatch) {
        navigation.navigate('Chat', {
          matchId: existingMatch.id,
          title: landlord.firstName + ' ' + landlord.lastName
        });
        return;
      }

      // 2. Perform swipe like
      const swipeRes = await swipeApi.record(apartmentId, 'like');
      const { match } = swipeRes.data;

      if (match) {
        showAlert('יש התאמה! 🎉', 'נמצאה התאמה הדדית! מועבר לצ׳אט לקביעת ביקור.', [
          {
            text: 'המשך',
            onPress: () => {
              navigation.navigate('Chat', {
                matchId: match.id,
                title: landlord.firstName + ' ' + landlord.lastName
              });
            }
          }
        ]);
      } else {
        showAlert(
          'בקשתך נשלחה ✉️',
          'הבעת עניין בדירה נרשמה בהצלחה! המשכיר קיבל התראה. ברגע שתהיה התאמה, ייפתח ביניכם צ׳אט לתיאום ביקור.'
        );
      }
    } catch (err: any) {
      if (err?.response?.status === 400 && err?.response?.data?.error?.includes('own listing')) {
        showAlert('שגיאה', 'לא ניתן לקבוע ביקור בדירה של עצמך.');
      } else {
        showAlert('שגיאה', 'לא ניתן לשלוח בקשה כרגע. אנא נסה שנית מאוחר יותר.');
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>פרופיל משכיר</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          <View style={styles.inner}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {landlord.avatarUrl ? (
                <Image source={{ uri: landlord.avatarUrl }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.initials}>{initials}</Text>
                </View>
              )}
            </View>

            {/* Badges */}
            <View style={styles.badgesRow}>
              {landlord.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={C.cyan} />
                  <Text style={styles.verifiedText}>משתמש מאומת</Text>
                </View>
              )}
              {landlord.isPremium && (
                <View style={[styles.verifiedBadge, { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.08)' }]}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={[styles.verifiedText, { color: '#F59E0B' }]}>משכיר פרמיום</Text>
                </View>
              )}
            </View>

            {/* Name */}
            <Text style={[styles.name, { color: colors.text }]}>
              {landlord.firstName} {landlord.lastName}
            </Text>

            {/* Trust Score Card */}
            <View style={[styles.trustScoreCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.trustScoreContainer}>
                <View style={[styles.progressRingOuter, { borderColor: `${scoreColor}22` }]}>
                  <View style={[styles.progressRingInner, { borderColor: scoreColor }]}>
                    <Text style={[styles.trustScoreNum, { color: colors.text }]}>{trustScore}</Text>
                    <Text style={[styles.trustScoreUnit, { color: colors.textMut }]}>/ 100</Text>
                  </View>
                </View>

                <View style={styles.trustScoreDetails}>
                  <Text style={[styles.trustScoreTitle, { color: colors.text }]}>מדד אמינות משכיר</Text>
                  <Text style={[styles.trustScoreBadgeText, { color: scoreColor }]}>
                    {getScoreLabel(trustScore)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.trustScoreSub, { color: colors.textSub }]}>
                הציון מחושב אוטומטית לפי פרמטרים של אימות זהות (KYC), היסטוריית חוזים מוצלחת, אישור בעלות על הנכס ומהירות הטיפול בתקלות.
              </Text>
            </View>

            {/* Trust Metrics Details List */}
            <View style={styles.metricsBox}>
              <Text style={[styles.metricsTitle, { color: colors.text }]}>איכות השירות והאמינות</Text>
              
              <MetricItem icon="shield-checkmark-outline" label="אימות זהות (KYC)" value="מאומת בהצלחה ✅" />
              <MetricItem icon="document-text-outline" label="היסטוריית חוזים" value="חוזים ללא הפרות 📄" />
              <MetricItem icon="construct-outline" label="טיפול בתקלות" value="מהיר ומקצועי 🔧" />
              <MetricItem icon="business-outline" label="אימות בעלות נכס" value="רשום בטאבו 🏠" />
            </View>

            {apartmentId && (
              <TouchableOpacity onPress={handleActionPress} style={styles.actionBtn}>
                <Ionicons name="calendar-outline" size={20} color={Dark.bg} />
                <Text style={styles.actionBtnText}>קבע ביקור בדירה</Text>
              </TouchableOpacity>
            )}
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricItem({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.metricItem, { borderBottomColor: colors.border }]}>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[styles.metricLabel, { color: colors.textSub }]}>{label}</Text>
        <Ionicons name={icon} size={16} color={C.cyan} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: fontFamily.bold,
  },
  scroll: { paddingVertical: 24 },
  inner: { alignItems: 'center', width: '100%', paddingHorizontal: 16 },
  avatarContainer: { marginBottom: 16 },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: dirApp.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: `${dirApp.secondaryContainer}DD`,
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: `${dirApp.secondaryContainer}DD`,
  },
  initials: { fontSize: 32, fontWeight: '800', color: C.onInverse.primary, fontFamily: fontFamily.bold },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.cyanAlpha(0.1),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cyanAlpha(0.25),
  },
  verifiedText: { color: dirApp.primary, fontSize: 11, fontWeight: '700', fontFamily: fontFamily.bold },
  name: { fontSize: 24, fontWeight: '800', fontFamily: fontFamily.bold, marginBottom: 20, textAlign: 'center' },
  
  // Trust Score Card
  trustScoreCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  trustScoreContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  progressRingOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
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
    fontWeight: '800',
    lineHeight: 18,
    fontFamily: fontFamily.bold,
  },
  trustScoreUnit: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
    fontFamily: fontFamily.semibold,
  },
  trustScoreDetails: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  trustScoreTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  trustScoreBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: fontFamily.bold,
  },
  trustScoreSub: {
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 18,
    fontFamily: fontFamily.regular,
  },

  // Metrics Box
  metricsBox: { width: '100%', marginBottom: 30 },
  metricsTitle: { fontSize: 16, fontWeight: '800', fontFamily: fontFamily.bold, textAlign: 'right', marginBottom: 12 },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  metricLabel: { fontSize: 13, fontFamily: fontFamily.regular },
  metricValue: { fontSize: 13, fontWeight: '700', fontFamily: fontFamily.bold },

  // Action Button
  actionBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.cyan,
    borderRadius: 14,
    paddingVertical: 14,
  },
  actionBtnText: { color: Dark.bg, fontWeight: '800', fontSize: 15, fontFamily: fontFamily.bold },
});
