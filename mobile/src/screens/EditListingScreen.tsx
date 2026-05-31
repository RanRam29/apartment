import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apartmentsApi } from '../services/api';
import { C } from '../theme';
import type { Amenity, MainStackParamList } from '../types';
import {
  getCityMatches,
  hasCompleteListingAddress,
  normalizeListingAddressText,
} from '../utils/listingAddress';

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

type Props = NativeStackScreenProps<MainStackParamList, 'EditListing'>;

export default function EditListingScreen({ route, navigation }: Props) {
  const { apartmentId } = route.params;
  const queryClient = useQueryClient();

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

  const canSearchStreet = useMemo(() => city.trim().length > 0, [city]);

  useEffect(() => {
    setIsLoadingCities(false);
    setCitySuggestions(getCityMatches(city));
  }, [city]);

  useEffect(() => {
    const q = street.trim();
    const selectedCity = city.trim();
    if (!selectedCity || q.length < 2) {
      setStreetSuggestions([]);
      setIsLoadingStreets(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoadingStreets(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=il&addressdetails=1&accept-language=he&limit=25&q=${encodeURIComponent(`${q}, ${selectedCity}, ישראל`)}`,
          {
            signal: controller.signal,
            headers: { 'User-Agent': 'ApartmentApp/1.0 (EditListing)' },
          }
        );
        const data = await res.json();
        const parsed = Array.isArray(data)
          ? data
              .map((item: any) => item?.address)
              .filter(Boolean)
              .filter((address: any) => {
                const addressCity = normalizeListingAddressText(address?.city || address?.town || address?.village || address?.municipality || '');
                const streetName = normalizeListingAddressText(address?.road || '');
                return addressCity === normalizeListingAddressText(selectedCity) && streetName.startsWith(normalizeListingAddressText(q));
              })
              .map((address: any) => address?.road)
              .filter(Boolean)
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

    if (!titleValue || !price || !rooms || !hasCompleteListingAddress(cityValue, streetValue)) {
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
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 80 }} size="large" color={C.navy} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.header}>עריכת מודעה</Text>

          <Field label="כותרת *">
            <TextInput style={styles.input} value={title} onChangeText={(value) => setTitle(sanitizeTitleInput(value))}
              placeholder="כותרת המודעה" placeholderTextColor={C.textMut} textAlign="right" />
            <Text style={styles.helperText}>{title.length}/100</Text>
          </Field>

          <View style={styles.row}>
            <Field label="מחיר ₪ *" style={{ flex: 1, marginLeft: 8 }}>
              <TextInput style={styles.input} value={price} onChangeText={(value) => setPrice(keepDigitsOnly(value))}
                keyboardType="numeric" placeholder="6500" placeholderTextColor={C.textMut} textAlign="right" />
            </Field>
            <Field label="חדרים *" style={{ flex: 1 }}>
              <TextInput style={styles.input} value={rooms} onChangeText={(value) => setRooms(keepDigitsOnly(value))}
                keyboardType="numeric" placeholder="3" placeholderTextColor={C.textMut} textAlign="right" />
            </Field>
          </View>

          <View style={styles.row}>
            <Field label="עיר *" style={{ flex: 1, marginLeft: 8 }}>
              <TextInput style={styles.input} value={city} onChangeText={(value) => {
                setCity(value);
                setStreet('');
                setStreetSuggestions([]);
              }}
                placeholder="בחר עיר בישראל" placeholderTextColor={C.textMut} textAlign="right" />
              {isLoadingCities ? <ActivityIndicator size="small" color={C.navy} style={styles.loader} /> : null}
              {!!citySuggestions.length && (
                <View style={styles.suggestionsBox}>
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
              <TextInput style={styles.input} value={street} onChangeText={setStreet}
                placeholder={canSearchStreet ? 'בחר רחוב לפי העיר' : 'יש לבחור עיר קודם'} placeholderTextColor={C.textMut} textAlign="right" editable={canSearchStreet} />
              {isLoadingStreets ? <ActivityIndicator size="small" color={C.navy} style={styles.loader} /> : null}
              {!!streetSuggestions.length && (
                <View style={styles.suggestionsBox}>
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
            <Field label="קומה" style={{ flex: 1, marginLeft: 8 }}>
              <TextInput style={styles.input} value={floor} onChangeText={(value) => setFloor(keepDigitsOnly(value))}
                keyboardType="numeric" placeholder="3" placeholderTextColor={C.textMut} textAlign="right" />
            </Field>
            <Field label='גודל מ"ר' style={{ flex: 1 }}>
              <TextInput style={styles.input} value={sizeSqm} onChangeText={(value) => setSizeSqm(keepDigitsOnly(value))}
                keyboardType="numeric" placeholder="75" placeholderTextColor={C.textMut} textAlign="right" />
            </Field>
          </View>

          <Field label="תיאור">
            <TextInput style={[styles.input, styles.textarea]} value={description}
              onChangeText={setDescription} multiline numberOfLines={4}
              placeholder="תאר את הדירה..." placeholderTextColor={C.textMut} textAlign="right" />
          </Field>

          <Text style={styles.fieldLabel}>שירותים</Text>
          <View style={styles.amenitiesGrid}>
            {AMENITY_OPTIONS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.amenityChip, amenities.includes(key) && styles.amenityChipActive]}
                onPress={() => toggleAmenity(key)}
              >
                <Text style={[styles.amenityText, amenities.includes(key) && styles.amenityTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.petsRow, petsAllowed && styles.petsRowActive]}
            onPress={() => setPetsAllowed((v) => !v)}
          >
            <Ionicons name={petsAllowed ? 'checkbox' : 'square-outline'} size={22} color={petsAllowed ? C.navy : C.textMut} />
            <Text style={[styles.petsLabel, petsAllowed && { color: C.navy }]}>🐾 דירה מאפשרת חיות מחמד</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>שמור שינויים</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 22, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 20 },
  row: { flexDirection: 'row', marginBottom: 0, alignItems: 'flex-start' },
  fieldLabel: { color: C.textSub, fontSize: 12, fontWeight: '600', textAlign: 'right', marginBottom: 6 },
  input: {
    backgroundColor: C.bgCard, borderRadius: 12, padding: 14,
    fontSize: 14, color: C.text, borderWidth: 1.5, borderColor: C.border,
    marginBottom: 0,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  helperText: { marginTop: 4, textAlign: 'right', color: C.textMut, fontSize: 11 },
  loader: { marginTop: 6 },
  suggestionsBox: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderLight,
    backgroundColor: C.bg,
    maxHeight: 180,
    overflow: 'hidden',
    zIndex: 50,
    elevation: 8,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  suggestionText: { textAlign: 'right', color: C.text, fontSize: 14 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  amenityChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
  },
  amenityChipActive: { backgroundColor: C.navy, borderColor: C.navy },
  amenityText: { color: C.textSub, fontSize: 13 },
  amenityTextActive: { color: '#fff', fontWeight: '600' },
  petsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24,
    backgroundColor: C.bg, borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: C.border,
  },
  petsRowActive: { borderColor: C.navy },
  petsLabel: { color: C.textSub, fontSize: 14 },
  saveBtn: {
    backgroundColor: C.navy, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: C.navy, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
