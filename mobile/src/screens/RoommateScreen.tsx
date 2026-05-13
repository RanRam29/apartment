import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Switch, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { roommateApi } from '../services/api';
import { C, Dark } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';

type SleepSchedule   = 'early_bird' | 'night_owl' | 'flexible';
type NoiseLevel      = 'quiet' | 'moderate' | 'lively';
type GuestsFrequency = 'never' | 'rarely' | 'sometimes' | 'often';

interface RoommateProfile {
  userId: string;
  lookingForRoommate: boolean;
  sleepSchedule: SleepSchedule;
  cleanlinessLevel: number;
  noiseLevel: NoiseLevel;
  guestsFrequency: GuestsFrequency;
  smokingAllowed: boolean;
  petsAllowed: boolean;
  workFromHome: boolean;
  cities: string[];
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  score?: number;
}

const DEFAULT_PROFILE: Omit<RoommateProfile, 'userId'> = {
  lookingForRoommate: false,
  sleepSchedule: 'flexible',
  cleanlinessLevel: 3,
  noiseLevel: 'moderate',
  guestsFrequency: 'rarely',
  smokingAllowed: false,
  petsAllowed: false,
  workFromHome: false,
  cities: [],
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? C.statusTone.positive : score >= 50 ? C.statusTone.caution : C.statusTone.negativeSoft;
  return (
    <View style={styles.scoreBarWrap}>
      <View style={[styles.scoreBarFill, { width: `${score}%` as any, backgroundColor: color }]} />
      <Text style={[styles.scoreLabel, { color }]}>{score}%</Text>
    </View>
  );
}

function OptionRow<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: { key: T; display: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.optionBlock}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((o) => (
          <TouchableOpacity
            key={o.key}
            style={[styles.optionBtn, value === o.key && styles.optionBtnActive]}
            onPress={() => onChange(o.key)}
          >
            <Text style={[styles.optionBtnText, value === o.key && styles.optionBtnTextActive]}>
              {o.display}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function CleanSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.optionBlock}>
      <Text style={styles.optionLabel}>רמת סדר וניקיון (1–5)</Text>
      <View style={styles.optionRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.optionBtn, value === n && styles.optionBtnActive]}
            onPress={() => onChange(n)}
          >
            <Text style={[styles.optionBtnText, value === n && styles.optionBtnTextActive]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function RoommateScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [tab, setTab] = React.useState<'profile' | 'matches'>('profile');
  const [form, setForm] = React.useState<Omit<RoommateProfile, 'userId'>>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = React.useState(false);

  const { data: profileData, isPending: profileLoading, isSuccess: profileLoaded } = useQuery({
    queryKey: ['roommate-profile'],
    queryFn: () => roommateApi.getProfile().then((r) => r.data),
  });

  React.useEffect(() => {
    if (!profileLoaded || hydrated) return;
    if (profileData?.profile) setForm({ ...DEFAULT_PROFILE, ...profileData.profile });
    setHydrated(true);
  }, [profileLoaded, profileData, hydrated]);

  const { data: matchesData, isPending: matchesLoading, refetch: refetchMatches } = useQuery({
    queryKey: ['roommate-matches'],
    queryFn: () => roommateApi.getMatches().then((r) => r.data),
    enabled: tab === 'matches',
  });

  const saveMutation = useMutation({
    mutationFn: () => roommateApi.saveProfile(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roommate-profile'] });
      Alert.alert('נשמר', 'הפרופיל עודכן בהצלחה');
    },
    onError: () => Alert.alert('שגיאה', 'לא ניתן לשמור את הפרופיל'),
  });

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const matches: RoommateProfile[] = matchesData?.matches ?? [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.onInverse.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dirType.subhead]}>שותפים לדירה</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'profile' && styles.tabActive]}
          onPress={() => setTab('profile')}
        >
          <Text style={[styles.tabText, tab === 'profile' && styles.tabTextActive]}>הפרופיל שלי</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'matches' && styles.tabActive]}
          onPress={() => { setTab('matches'); refetchMatches(); }}
        >
          <Text style={[styles.tabText, tab === 'matches' && styles.tabTextActive]}>התאמות</Text>
        </TouchableOpacity>
      </View>

      {tab === 'profile' ? (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <ResponsiveContainer>
          {profileLoading ? (
            <ActivityIndicator color={C.cyan} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.formWrap}>
              {/* Looking for roommate toggle */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>מחפש/ת שותף/ה לדירה</Text>
                <Switch
                  value={form.lookingForRoommate}
                  onValueChange={(v) => setField('lookingForRoommate', v)}
                  trackColor={{ false: Dark.switchTrackOff, true: C.cyan }}
                  thumbColor={C.onInverse.primary}
                />
              </View>

              <OptionRow
                label="שעות שינה"
                options={[
                  { key: 'early_bird' as SleepSchedule, display: '🌅 ציפור שחר' },
                  { key: 'night_owl'  as SleepSchedule, display: '🦉 ינשוף לילה' },
                  { key: 'flexible'   as SleepSchedule, display: '🔄 גמיש' },
                ]}
                value={form.sleepSchedule}
                onChange={(v) => setField('sleepSchedule', v)}
              />

              <CleanSlider value={form.cleanlinessLevel} onChange={(v) => setField('cleanlinessLevel', v)} />

              <OptionRow
                label="רמת רעש"
                options={[
                  { key: 'quiet'    as NoiseLevel, display: '🤫 שקט' },
                  { key: 'moderate' as NoiseLevel, display: '🗣️ בינוני' },
                  { key: 'lively'   as NoiseLevel, display: '🎉 תוסס' },
                ]}
                value={form.noiseLevel}
                onChange={(v) => setField('noiseLevel', v)}
              />

              <OptionRow
                label="אורחים"
                options={[
                  { key: 'never'     as GuestsFrequency, display: 'כמעט לא' },
                  { key: 'rarely'    as GuestsFrequency, display: 'לעיתים רחוקות' },
                  { key: 'sometimes' as GuestsFrequency, display: 'לפעמים' },
                  { key: 'often'     as GuestsFrequency, display: 'לעיתים קרובות' },
                ]}
                value={form.guestsFrequency}
                onChange={(v) => setField('guestsFrequency', v)}
              />

              <View style={styles.boolRow}>
                <View style={styles.boolItem}>
                  <Text style={styles.boolLabel}>עישון מותר</Text>
                  <Switch
                    value={form.smokingAllowed}
                    onValueChange={(v) => setField('smokingAllowed', v)}
                    trackColor={{ false: Dark.switchTrackOff, true: C.cyan }}
                    thumbColor={C.onInverse.primary}
                  />
                </View>
                <View style={styles.boolItem}>
                  <Text style={styles.boolLabel}>חיות מחמד</Text>
                  <Switch
                    value={form.petsAllowed}
                    onValueChange={(v) => setField('petsAllowed', v)}
                    trackColor={{ false: Dark.switchTrackOff, true: C.cyan }}
                    thumbColor={C.onInverse.primary}
                  />
                </View>
                <View style={styles.boolItem}>
                  <Text style={styles.boolLabel}>עבודה מהבית</Text>
                  <Switch
                    value={form.workFromHome}
                    onValueChange={(v) => setField('workFromHome', v)}
                    trackColor={{ false: Dark.switchTrackOff, true: C.cyan }}
                    thumbColor={C.onInverse.primary}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saveMutation.isPending && styles.saveBtnDisabled]}
                disabled={saveMutation.isPending}
                onPress={() => saveMutation.mutate()}
              >
                {saveMutation.isPending
                  ? <ActivityIndicator color={C.onInverse.primary} />
                  : <Text style={styles.saveBtnText}>שמור פרופיל</Text>
                }
              </TouchableOpacity>
            </View>
          )}
          </ResponsiveContainer>
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <ResponsiveContainer>
          {matchesLoading ? (
            <ActivityIndicator color={C.cyan} style={{ marginTop: 40 }} />
          ) : matches.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={56} color={C.textMut} />
              <Text style={[styles.emptyText, dirType.subhead]}>לא נמצאו התאמות כרגע</Text>
              <Text style={[styles.emptyHint, dirType.caption]}>ודא שהפרופיל שלך מלא ו"מחפש שותף" מופעל</Text>
            </View>
          ) : (
            <View style={styles.matchList}>
              {matches.map((m) => (
                <View key={m.userId} style={styles.matchCard}>
                  {m.avatarUrl ? (
                    <Image source={{ uri: m.avatarUrl }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Ionicons name="person" size={22} color={C.textMut} />
                    </View>
                  )}
                  <View style={styles.matchInfo}>
                    <Text style={styles.matchName}>{m.firstName} {m.lastName}</Text>
                    <Text style={styles.matchMeta}>
                      {m.sleepSchedule === 'early_bird' ? '🌅' : m.sleepSchedule === 'night_owl' ? '🦉' : '🔄'}
                      {' '}
                      {m.noiseLevel === 'quiet' ? '🤫 שקט' : m.noiseLevel === 'lively' ? '🎉 תוסס' : '🗣️ בינוני'}
                      {m.petsAllowed ? '  🐾' : ''}
                    </Text>
                    <ScoreBar score={m.score ?? 0} />
                  </View>
                </View>
              ))}
            </View>
          )}
          </ResponsiveContainer>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Dark.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Dark.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: C.onInverse.primary, fontSize: 18, fontWeight: '800' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: Dark.surface, borderRadius: 12, padding: 4, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: C.cyan },
  tabText: { color: C.textMut, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: dirApp.primary },
  scroll: { flex: 1 },
  formWrap: { padding: 16, paddingBottom: 40 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Dark.surface, padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: Dark.border },
  toggleLabel: { color: C.onInverse.primary, fontSize: 15, fontWeight: '600' },
  optionBlock: { backgroundColor: Dark.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Dark.border },
  optionLabel: { color: C.textMut, fontSize: 13, fontWeight: '600', textAlign: 'right', marginBottom: 10 },
  optionRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  optionBtn: { flex: 1, minWidth: 60, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 10, backgroundColor: Dark.inset, alignItems: 'center', borderWidth: 1, borderColor: Dark.border },
  optionBtnActive: { backgroundColor: C.cyan, borderColor: C.cyan },
  optionBtnText: { color: C.textMut, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  optionBtnTextActive: { color: dirApp.primary },
  boolRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  boolItem: { flex: 1, backgroundColor: Dark.surface, borderRadius: 14, padding: 12, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Dark.border },
  boolLabel: { color: C.textMut, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  saveBtn: { backgroundColor: C.cyan, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: dirApp.primary, fontWeight: '800', fontSize: 15 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: C.textMut, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: C.textMut, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
  matchList: { padding: 16, gap: 12 },
  matchCard: { flexDirection: 'row', backgroundColor: Dark.surface, borderRadius: 14, padding: 14, gap: 12, alignItems: 'center', borderWidth: 1, borderColor: Dark.border },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { backgroundColor: Dark.inset, justifyContent: 'center', alignItems: 'center' },
  matchInfo: { flex: 1 },
  matchName: { color: C.onInverse.primary, fontWeight: '700', fontSize: 15, textAlign: 'right', marginBottom: 4 },
  matchMeta: { color: C.textMut, fontSize: 12, textAlign: 'right', marginBottom: 8 },
  scoreBarWrap: { height: 8, backgroundColor: Dark.inset, borderRadius: 4, flexDirection: 'row', alignItems: 'center', overflow: 'visible' },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scoreLabel: { fontSize: 11, fontWeight: '700', marginLeft: 6 },
});
