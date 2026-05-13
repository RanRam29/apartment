import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator,
  Switch,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { recommendationsApi } from '../services/api';
import type { Amenity, MainStackParamList } from '../types';
import { C, Dark } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';

const CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה', 'אשדוד', 'נתניה', 'באר שבע', 'בני ברק', 'רמת גן', 'גבעתיים', 'חולון', 'בת ים', 'הרצליה', 'כפר סבא', 'רעננה', 'מודיעין', 'אשקלון', 'רחובות', 'לוד'];

const AMENITY_OPTIONS: { key: Amenity; label: string }[] = [
  { key: 'parking',      label: '🚗 חניה' },
  { key: 'balcony',      label: '🌿 מרפסת' },
  { key: 'elevator',     label: '🛗 מעלית' },
  { key: 'ac',           label: '❄️ מזגן' },
  { key: 'storage',      label: '📦 מחסן' },
  { key: 'furnished',    label: '🛋️ מרוהטת' },
  { key: 'sun_boiler',   label: '☀️ דוד שמש' },
  { key: 'pets_allowed', label: '🐾 חיות' },
];

type Props = NativeStackScreenProps<MainStackParamList, 'Preferences'>;

export default function PreferencesScreen({ navigation }: Props) {
  const queryClient = useQueryClient();

  const [minBudget, setMinBudget]     = useState('');
  const [maxBudget, setMaxBudget]     = useState('');
  const [minRooms,  setMinRooms]      = useState('');
  const [maxRooms,  setMaxRooms]      = useState('');
  const [cities,    setCities]        = useState<string[]>([]);
  const [amenities, setAmenities]     = useState<Amenity[]>([]);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [hydrated, setHydrated]       = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => recommendationsApi.getPreferences().then((r) => r.data.preferences),
  });

  // Pre-populate form once data arrives
  useEffect(() => {
    if (!data || hydrated) return;
    if (data.budget?.min) setMinBudget(String(data.budget.min));
    if (data.budget?.max && data.budget.max < 99999) setMaxBudget(String(data.budget.max));
    if (data.rooms?.min && data.rooms.min > 1) setMinRooms(String(data.rooms.min));
    if (data.rooms?.max && data.rooms.max < 10) setMaxRooms(String(data.rooms.max));
    if (data.cities?.length) setCities(data.cities);
    if (data.requiredAmenities?.length) setAmenities(data.requiredAmenities);
    if (data.petsAllowed) setPetsAllowed(true);
    setHydrated(true);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (prefs: object) => recommendationsApi.savePreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      Alert.alert('נשמר!', 'ההעדפות עודכנו בהצלחה', [
        { text: 'אישור', onPress: () => navigation.goBack() },
      ]);
    },
    onError: () => Alert.alert('שגיאה', 'לא ניתן לשמור את ההעדפות'),
  });

  function toggleCity(city: string) {
    setCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  }

  function toggleAmenity(key: Amenity) {
    setAmenities((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]
    );
  }

  function handleSave() {
    const min = parseInt(minBudget, 10);
    const max = parseInt(maxBudget, 10);
    if (minBudget && maxBudget && min > max) {
      Alert.alert('שגיאה', 'תקציב מינימום לא יכול להיות גדול ממקסימום');
      return;
    }
    saveMutation.mutate({
      budget: {
        min: minBudget ? min : 0,
        max: maxBudget ? max : 99999,
      },
      rooms: {
        min: minRooms ? parseFloat(minRooms) : 1,
        max: maxRooms ? parseFloat(maxRooms) : 10,
      },
      cities,
      requiredAmenities: amenities,
      petsAllowed,
    });
  }

  if (isLoading && !hydrated) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 80 }} size="large" color={C.cyan} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ResponsiveContainer>
        <Text style={[styles.header, dirType.title]}>העדפות חיפוש</Text>
        <Text style={[styles.subtitle, dirType.caption]}>נשתמש בהעדפות אלו כדי להתאים לך דירות</Text>

        {/* Budget */}
        <Text style={[styles.sectionTitle, dirType.subhead]}>תקציב חודשי ₪</Text>
        <View style={styles.row}>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.fieldLabel, dirType.label]}>מינימום</Text>
            <TextInput
              style={styles.input} value={minBudget} onChangeText={setMinBudget}
              keyboardType="numeric" placeholder="3000" placeholderTextColor={C.textMut} textAlign="right"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, dirType.label]}>מקסימום</Text>
            <TextInput
              style={styles.input} value={maxBudget} onChangeText={setMaxBudget}
              keyboardType="numeric" placeholder="9000" placeholderTextColor={C.textMut} textAlign="right"
            />
          </View>
        </View>

        {/* Rooms */}
        <Text style={[styles.sectionTitle, dirType.subhead]}>מספר חדרים</Text>
        <View style={styles.row}>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.fieldLabel, dirType.label]}>מינימום</Text>
            <TextInput
              style={styles.input} value={minRooms} onChangeText={setMinRooms}
              keyboardType="decimal-pad" placeholder="2" placeholderTextColor={C.textMut} textAlign="right"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, dirType.label]}>מקסימום</Text>
            <TextInput
              style={styles.input} value={maxRooms} onChangeText={setMaxRooms}
              keyboardType="decimal-pad" placeholder="5" placeholderTextColor={C.textMut} textAlign="right"
            />
          </View>
        </View>

        {/* Cities */}
        <Text style={[styles.sectionTitle, dirType.subhead]}>ערים מועדפות</Text>
        <Text style={[styles.hint, dirType.micro]}>בחר אחת או יותר — ריק = כל הארץ</Text>
        <View style={styles.chipGrid}>
          {CITIES.map((city) => (
            <TouchableOpacity
              key={city}
              style={[styles.chip, cities.includes(city) && styles.chipActive]}
              onPress={() => toggleCity(city)}
            >
              <Text style={[styles.chipText, dirType.label, cities.includes(city) && styles.chipTextActive]}>
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amenities */}
        <Text style={[styles.sectionTitle, dirType.subhead]}>שירותים נדרשים</Text>
        <View style={styles.chipGrid}>
          {AMENITY_OPTIONS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.chip, amenities.includes(key) && styles.chipActive]}
              onPress={() => toggleAmenity(key)}
            >
              <Text style={[styles.chipText, dirType.label, amenities.includes(key) && styles.chipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pets */}
        <View style={styles.switchRow}>
          <Switch
            value={petsAllowed}
            onValueChange={setPetsAllowed}
            trackColor={{ false: Dark.switchTrackOff, true: Dark.switchTrackOn }}
            thumbColor={petsAllowed ? C.cyan : C.textMut}
          />
          <Text style={[styles.switchLabel, dirType.body]}>🐾 מחפש/ת דירה שמאפשרת חיות מחמד</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saveMutation.isPending && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending
            ? <ActivityIndicator color={dirApp.primary} />
            : <Text style={[styles.saveBtnText, dirType.label]}>שמור העדפות</Text>
          }
        </TouchableOpacity>
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Dark.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 22, fontWeight: '800', color: C.onInverse.primary, textAlign: 'right', marginBottom: 4 },
  subtitle: { color: C.textMut, fontSize: 13, textAlign: 'right', marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.onInverse.primary, textAlign: 'right', marginBottom: 8, marginTop: 20 },
  hint: { color: C.textMut, fontSize: 11, textAlign: 'right', marginBottom: 10, marginTop: -4 },
  fieldLabel: { color: C.textMut, fontSize: 12, fontWeight: '600', textAlign: 'right', marginBottom: 6 },
  row: { flexDirection: 'row' },
  input: {
    backgroundColor: Dark.surface, borderRadius: 12, padding: 14,
    fontSize: 14, color: C.onInverse.primary, borderWidth: 1, borderColor: Dark.border,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Dark.surface, borderWidth: 1, borderColor: Dark.border,
  },
  chipActive: { backgroundColor: C.cyanAlpha(0.2), borderColor: C.cyan },
  chipText: { color: C.textMut, fontSize: 13 },
  chipTextActive: { color: C.cyan, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, marginBottom: 8, justifyContent: 'flex-end' },
  switchLabel: { color: C.onInverse.secondary, fontSize: 14 },
  saveBtn: { backgroundColor: C.cyan, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: dirApp.primary, fontSize: 16, fontWeight: '800' },
});
