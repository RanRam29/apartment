import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { apartmentsApi } from '../services/api';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import type { Amenity, MainStackParamList } from '../types';
import { CITY_CENTER_BY_NAME } from '../constants/cityCenters';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';
import { useColors } from '../context/ThemeContext';
import { fontFamily } from '../theme/fonts';

const AMENITY_OPTIONS: { key: Amenity; label: string }[] = [
  { key: 'parking',      label: '🚗 חניה' },
  { key: 'balcony',      label: '🌿 מרפסת' },
  { key: 'elevator',     label: '🛗 מעלית' },
  { key: 'ac',           label: '❄️ מזגן' },
  { key: 'storage',      label: '📦 מחסן' },
  { key: 'furnished',    label: '🛋️ מרוהטת' },
  { key: 'sun_boiler',   label: '☀️ דוד שמש' },
  { key: 'pets_allowed', label: '🐾 חיות מותרות' },
];
const ISRAELI_CITIES = Object.keys(CITY_CENTER_BY_NAME).sort((a, b) => a.localeCompare(b, 'he'));

type Props = NativeStackScreenProps<MainStackParamList, 'EditListing'>;

export default function EditListingScreen({ route, navigation }: Props) {
  const colors = useColors();
  const { apartmentId } = route.params;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.tosAcceptedAt) {
      if (Platform.OS === 'web') {
        window.alert('עליך לאשר את תנאי השימוש ומדיניות הפרטיות על מנת לערוך מודעות.');
        navigation.navigate('Terms');
      } else {
        Alert.alert(
          'אישור תנאי שימוש נדרש ⚠️',
          'על מנת לערוך מודעות, עליך לקרוא ולאשר את תנאי השימוש ומדיניות הפרטיות.',
          [
            { text: 'ביטול', onPress: () => navigation.goBack(), style: 'cancel' },
            { text: 'לאישור התנאים', onPress: () => navigation.navigate('Terms') }
          ],
          { cancelable: false }
        );
      }
    }
  }, [user, navigation]);

  const { data: apt, isLoading } = useQuery({
    queryKey: ['apartment', apartmentId],
    queryFn: () => apartmentsApi.getById(apartmentId).then((r) => r.data.apartment ?? r.data),
  });

  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [price, setPrice]               = useState('');
  const [rooms, setRooms]               = useState('');
  const [city, setCity]                 = useState('');
  const [street, setStreet]             = useState('');
  const [floor, setFloor]               = useState('');
  const [sizeSqm, setSizeSqm]           = useState('');
  const [amenities, setAmenities]       = useState<Amenity[]>([]);
  const [petsAllowed, setPetsAllowed]   = useState(false);
  const [saving, setSaving]             = useState(false);
  const [hydrated, setHydrated]         = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [streetSuggestions, setStreetSuggestions] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingStreets, setIsLoadingStreets] = useState(false);

  useEffect(() => {
    if (!apt || hydrated) return;
    setTitle(apt.title ?? '');
    setDescription(apt.description ?? '');
    setPrice(apt.price != null ? String(apt.price) : '');
    setRooms(apt.rooms != null ? String(apt.rooms) : '');
    setCity(apt.city ?? '');
    setStreet(apt.street ?? apt.neighborhood ?? '');
    setFloor(apt.floor != null ? String(apt.floor) : '');
    setSizeSqm(apt.sizeSqm != null ? String(apt.sizeSqm) : '');
    setAmenities(apt.amenities ?? []);
    setPetsAllowed(apt.petsAllowed ?? false);
    setHydrated(true);
  }, [apt, hydrated]);

  function toggleAmenity(key: Amenity) {
    setAmenities((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]
    );
  }

  function keepDigitsOnly(value: string) {
    return value.replace(/[^\d]/g, '');
  }

  function sanitizeTitleInput(value: string) {
    const withoutCodeChars = value.replace(/[<>`{}]/g, '');
    return withoutCodeChars.slice(0, 100);
  }

  function normalizeText(value: string) {
    return value.trim().toLowerCase();
  }

  function getCityMatches(query: string) {
    const q = normalizeText(query);
    if (q.length < 1) return [];
    const startsWith = ISRAELI_CITIES.filter((name) => normalizeText(name).startsWith(q));
    const contains = ISRAELI_CITIES.filter((name) => {
      const norm = normalizeText(name);
      return !norm.startsWith(q) && norm.includes(q);
    });
    return [...startsWith, ...contains].slice(0, 8);
  }

  const canSearchStreet = useMemo(() => city.trim().length > 0, [city]);

  async function validateIsraeliCity(cityName: string) {
    const cityNorm = normalizeText(cityName);
    return ISRAELI_CITIES.some((candidate) => normalizeText(candidate) === cityNorm);
  }

  async function validateStreetInCity(cityName: string, streetName: string) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=il&addressdetails=1&accept-language=he&limit=10&street=${encodeURIComponent(streetName)}&city=${encodeURIComponent(cityName)}`,
        { headers: { 'User-Agent': 'ApartmentApp/1.0 (EditListing)' } }
      );
      const data = await res.json();
      return Array.isArray(data) && data.length > 0;
    } catch {
      return true; // Graceful fallback
    }
  }

  useEffect(() => {
    setIsLoadingCities(false);
    setCitySuggestions(getCityMatches(city));
  }, [city]);

  useEffect(() => {
    const q = street.trim();
    const selectedCity = city.trim();
    if (!selectedCity || q.length < 1) {
      setStreetSuggestions([]);
      setIsLoadingStreets(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoadingStreets(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=il&addressdetails=1&accept-language=he&limit=100&q=${encodeURIComponent(`${q}, ${selectedCity}, ישראל`)}`,
          {
            signal: controller.signal,
            headers: { 'User-Agent': 'ApartmentApp/1.0 (EditListing)' },
          }
        );
        const data = await res.json();
        const parsed = Array.isArray(data)
          ? data
              .map((item: any) => item?.address?.road || item?.address?.pedestrian || item?.address?.living_street || item?.address?.footway || item?.name)
              .filter(Boolean)
              .filter((road: string) => {
                const qNorm = normalizeText(q);
                const words = normalizeText(road).split(/\s+/);
                return words.some(word => word.startsWith(qNorm));
              })
          : [];
        const unique = Array.from(new Set(parsed));
        setStreetSuggestions(unique.slice(0, 8));
      } catch {
        setStreetSuggestions([]);
      } finally {
        setIsLoadingStreets(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [street, city]);

  async function handleSave() {
    const titleValue = title.trim();
    const cityValue = city.trim();
    const streetValue = street.trim();

    if (!titleValue || !price || !rooms || !cityValue || !streetValue) {
      Alert.alert('שגיאה', 'נא למלא: כותרת, מחיר, חדרים, עיר ורחוב');
      return;
    }
    if (titleValue.length > 100) {
      Alert.alert('שגיאה', 'כותרת יכולה להכיל עד 100 תווים');
      return;
    }
    if (/[<>`{}]/.test(titleValue)) {
      Alert.alert('שגיאה', 'כותרת לא יכולה להכיל קוד או תווים לא תקינים');
      return;
    }
    if (!/^\d+$/.test(price) || !/^\d+$/.test(rooms) || (sizeSqm && !/^\d+$/.test(sizeSqm)) || (floor && !/^\d+$/.test(floor))) {
      Alert.alert('שגיאה', 'שדות מחיר, חדרים, קומה וגודל חייבים להכיל מספרים בלבד');
      return;
    }
    const isCityValid = await validateIsraeliCity(cityValue);
    if (!isCityValid) {
      Alert.alert('שגיאה', 'יש לבחור עיר קיימת בישראל מתוך ההצעות');
      return;
    }
    const isStreetValid = await validateStreetInCity(cityValue, streetValue);
    if (!isStreetValid) {
      Alert.alert('שגיאה', 'יש לבחור רחוב שקיים בעיר שנבחרה');
      return;
    }
    setSaving(true);
    try {
      await apartmentsApi.update(apartmentId, {
        title: titleValue,
        description: description.trim() || null,
        price: parseInt(price, 10),
        rooms: parseInt(rooms, 10),
        city: cityValue,
        street: streetValue,
        floor: floor ? parseInt(floor, 10) : null,
        sizeSqm: sizeSqm ? parseInt(sizeSqm, 10) : null,
        amenities,
        petsAllowed,
      });
      await queryClient.invalidateQueries({ queryKey: ['apartment', apartmentId] });
      await queryClient.invalidateQueries({ queryKey: ['landlord-dashboard'] });
      Alert.alert('נשמר!', 'המודעה עודכנה בהצלחה', [
        { text: 'אישור', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('שגיאה', err?.response?.data?.error || 'עדכון המודעה נכשל');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !hydrated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <ActivityIndicator style={{ marginTop: 80 }} size="large" color={dirApp.secondary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ResponsiveContainer>
          <Text style={styles.header}>עריכת מודעה</Text>

          <Field label="כותרת *">
            <TextInput style={[styles.input, { backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border }]} value={title} onChangeText={(value) => setTitle(sanitizeTitleInput(value))}
              placeholder="כותרת המודעה" placeholderTextColor={colors.textMut} textAlign="right" />
            <Text style={styles.helperText}>{title.length}/100</Text>
          </Field>

          <Field label="מחיר ₪ *">
            <TextInput style={[styles.input, { backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border }]} value={price} onChangeText={(value) => setPrice(keepDigitsOnly(value))}
              keyboardType="numeric" placeholder="6500" placeholderTextColor={colors.textMut} textAlign="right" />
          </Field>

          <View style={styles.row}>
            <Field label="עיר *" style={{ flex: 1, marginLeft: 8 }}>
              <TextInput style={[styles.input, { backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border }]} value={city} onChangeText={(value) => {
                setCity(value);
                setStreet('');
                setStreetSuggestions([]);
              }}
                placeholder="בחר עיר בישראל" placeholderTextColor={colors.textMut} textAlign="right" />
              {isLoadingCities ? <ActivityIndicator size="small" color={dirApp.secondary} style={styles.loader} /> : null}
              {!!citySuggestions.length && (
                <View style={[styles.suggestionsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {citySuggestions.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setCity(item);
                        setCitySuggestions([]);
                      }}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Field>
            <Field label="רחוב *" style={{ flex: 1 }}>
              <TextInput style={[styles.input, { backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border }]} value={street} onChangeText={setStreet}
                placeholder={canSearchStreet ? 'בחר רחוב לפי העיר' : 'יש לבחור עיר קודם'} placeholderTextColor={colors.textMut} textAlign="right" editable={canSearchStreet} />
              {isLoadingStreets ? <ActivityIndicator size="small" color={dirApp.secondary} style={styles.loader} /> : null}
              {!!streetSuggestions.length && (
                <View style={[styles.suggestionsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {streetSuggestions.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setStreet(item);
                        setStreetSuggestions([]);
                      }}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Field>
          </View>

          <View style={styles.row}>
            <Field label="חדרים *" style={{ flex: 1, marginLeft: 8 }}>
              <TextInput style={[styles.input, { backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border }]} value={rooms} onChangeText={(value) => setRooms(keepDigitsOnly(value))}
                keyboardType="numeric" placeholder="3" placeholderTextColor={colors.textMut} textAlign="right" />
            </Field>
            <Field label="קומה" style={{ flex: 1, marginLeft: 8 }}>
              <TextInput style={[styles.input, { backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border }]} value={floor} onChangeText={(value) => setFloor(keepDigitsOnly(value))}
                keyboardType="numeric" placeholder="3" placeholderTextColor={colors.textMut} textAlign="right" />
            </Field>
            <Field label='גודל מ"ר' style={{ flex: 1 }}>
              <TextInput style={[styles.input, { backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border }]} value={sizeSqm} onChangeText={(value) => setSizeSqm(keepDigitsOnly(value))}
                keyboardType="numeric" placeholder="75" placeholderTextColor={colors.textMut} textAlign="right" />
            </Field>
          </View>

          <Field label="תיאור">
            <TextInput style={[styles.input, styles.textarea]} value={description}
              onChangeText={setDescription} multiline numberOfLines={4}
              placeholder="תאר את הדירה..." placeholderTextColor={colors.textMut} textAlign="right" />
          </Field>

          <Text style={[styles.fieldLabel, dirType.label]}>שירותים</Text>
          <View style={styles.amenitiesGrid}>
            {AMENITY_OPTIONS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.amenityChip, amenities.includes(key) && styles.amenityChipActive]}
                onPress={() => toggleAmenity(key)}
              >
                <Text style={[styles.amenityText, dirType.label, amenities.includes(key) && styles.amenityTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.petsRow, petsAllowed && styles.petsRowActive]}
            onPress={() => setPetsAllowed((v) => !v)}
          >
            <Ionicons name={petsAllowed ? 'checkbox' : 'square-outline'} size={22} color={petsAllowed ? dirApp.secondary : dirApp.outline} />
            <Text style={[styles.petsLabel, dirType.body, petsAllowed && { color: dirApp.secondary }]}>🐾 דירה מאפשרת חיות מחמד</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={C.onInverse.primary} />
              : <Text style={[styles.saveBtnText, dirType.label]}>שמור שינויים</Text>
            }
          </TouchableOpacity>
          </ResponsiveContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      <Text style={[styles.fieldLabel, dirType.label]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dirApp.background },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 22, fontWeight: '800', color: dirApp.primary, textAlign: 'right', marginBottom: 20, fontFamily: fontFamily.bold },
  row: { flexDirection: 'row', marginBottom: 0, alignItems: 'flex-start' },
  fieldLabel: { color: dirApp.outline, fontSize: 12, fontWeight: '600', textAlign: 'right', marginBottom: 6, fontFamily: fontFamily.bold },
  input: {
    backgroundColor: dirApp.surfaceContainerLowest,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: dirApp.onSurface,
    borderWidth: 1.5,
    borderColor: `${dirApp.outlineVariant}AA`,
    marginBottom: 0,
    fontFamily: fontFamily.regular,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  helperText: { marginTop: 4, textAlign: 'right', color: dirApp.outline, fontSize: 11, fontFamily: fontFamily.regular },
  loader: { marginTop: 6 },
  suggestionsBox: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${dirApp.outlineVariant}AA`,
    backgroundColor: dirApp.surfaceContainerLow,
    maxHeight: 180,
    overflow: 'hidden',
    zIndex: 50,
    elevation: 8,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${dirApp.outlineVariant}44`,
  },
  suggestionText: { textAlign: 'right', color: dirApp.onSurface, fontSize: 14, fontFamily: fontFamily.regular },
  amenitiesGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 4, marginBottom: 20 },
  amenityChip: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: dirApp.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: `${dirApp.outlineVariant}AA`,
  },
  amenityChipActive: { backgroundColor: dirApp.secondary, borderColor: dirApp.secondary },
  amenityText: { color: dirApp.outline, fontSize: 10, fontFamily: fontFamily.regular },
  amenityTextActive: { color: dirApp.onSecondary, fontWeight: '600', fontFamily: fontFamily.bold },
  petsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    backgroundColor: dirApp.surfaceContainerLowest,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: `${dirApp.outlineVariant}AA`,
  },
  petsRowActive: { borderColor: dirApp.secondary },
  petsLabel: { color: dirApp.outline, fontSize: 14, fontFamily: fontFamily.regular },
  saveBtn: {
    backgroundColor: dirApp.primaryContainer,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: dirApp.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: C.onInverse.primary, fontSize: 16, fontWeight: '800', fontFamily: fontFamily.bold },
});
