import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { apartmentsApi } from '../services/api';
import type { Amenity } from '../types';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { CITY_CENTER_BY_NAME } from '../constants/cityCenters';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { useColors } from '../context/ThemeContext';

const AMENITY_OPTIONS: { key: Amenity; label: string }[] = [
  { key: 'parking',     label: '🚗 חניה' },
  { key: 'balcony',     label: '🌿 מרפסת' },
  { key: 'elevator',    label: '🛗 מעלית' },
  { key: 'ac',          label: '❄️ מזגן' },
  { key: 'storage',     label: '📦 מחסן' },
  { key: 'furnished',   label: '🛋️ מרוהטת' },
  { key: 'sun_boiler',  label: '☀️ דוד שמש' },
  { key: 'pets_allowed',label: '🐾 חיות מותרות' },
];
const ISRAELI_CITIES = Object.keys(CITY_CENTER_BY_NAME).sort((a, b) => a.localeCompare(b, 'he'));

export default function CreateListingScreen({ navigation }: any) {
  const colors = useColors();
  const queryClient = useQueryClient();

  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice]             = useState('');
  const [rooms, setRooms]             = useState('');
  const [city, setCity]               = useState('');
  const [street, setStreet]             = useState('');
  const [floor, setFloor]             = useState('');
  const [sizeSqm, setSizeSqm]         = useState('');
  const [amenities, setAmenities]     = useState<Amenity[]>([]);
  const [images, setImages]           = useState<{ uri: string }[]>([]);
  const [loading, setLoading]         = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [streetSuggestions, setStreetSuggestions] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingStreets, setIsLoadingStreets] = useState(false);

  function showMessage(title: string, message: string) {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

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
    if (q.length < 2) return [];
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
        { headers: { 'User-Agent': 'ApartmentApp/1.0 (CreateListing)' } }
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
            headers: { 'User-Agent': 'ApartmentApp/1.0 (CreateListing)' },
          }
        );
        const data = await res.json();
        const parsed = Array.isArray(data)
          ? data
              .map((item: any) => item?.address?.road)
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

  async function pickImages() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => ({ uri: a.uri }))].slice(0, 10));
    }
  }

  async function handleSubmit() {
    const titleValue = title.trim();
    const cityValue = city.trim();
    const streetValue = street.trim();

    if (!titleValue || !price || !rooms || !cityValue || !streetValue) {
      showMessage('שגיאה', 'נא למלא: כותרת, מחיר, חדרים, עיר ורחוב');
      return;
    }
    if (titleValue.length > 100) {
      showMessage('שגיאה', 'כותרת יכולה להכיל עד 100 תווים');
      return;
    }
    if (/[<>`{}]/.test(titleValue)) {
      showMessage('שגיאה', 'כותרת לא יכולה להכיל קוד או תווים לא תקינים');
      return;
    }
    if (!/^\d+$/.test(price) || !/^\d+$/.test(rooms) || (sizeSqm && !/^\d+$/.test(sizeSqm)) || (floor && !/^\d+$/.test(floor))) {
      showMessage('שגיאה', 'שדות מחיר, חדרים, קומה וגודל חייבים להכיל מספרים בלבד');
      return;
    }
    const isCityValid = await validateIsraeliCity(cityValue);
    if (!isCityValid) {
      showMessage('שגיאה', 'יש לבחור עיר קיימת בישראל מתוך ההצעות');
      return;
    }
    const isStreetValid = await validateStreetInCity(cityValue, streetValue);
    if (!isStreetValid) {
      showMessage('שגיאה', 'יש לבחור רחוב שקיים בעיר שנבחרה');
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('title', titleValue);
      form.append('description', description);
      form.append('price', price);
      form.append('rooms', rooms);
      form.append('city', cityValue);
      form.append('street', streetValue);
      form.append('floor', floor);
      form.append('sizeSqm', sizeSqm);
      form.append('amenities', JSON.stringify(amenities));

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (Platform.OS === 'web') {
          const res = await fetch(img.uri);
          const blob = await res.blob();
          form.append('images', new File([blob], `photo_${i}.jpg`, { type: 'image/jpeg' }));
        } else {
          form.append('images', { uri: img.uri, name: `photo_${i}.jpg`, type: 'image/jpeg' } as any);
        }
      }

      await apartmentsApi.create(form);
      await queryClient.invalidateQueries({ queryKey: ['landlord-dashboard'] });
      if (Platform.OS === 'web') {
        showMessage('בוצע!', 'המודעה פורסמה בהצלחה');
        navigation.goBack();
      } else {
        Alert.alert('בוצע!', 'המודעה פורסמה בהצלחה', [
          { text: 'אישור', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'שגיאה בפרסום המודעה';
      showMessage('שגיאה', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ResponsiveContainer>
          <View style={[styles.formCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={styles.header}>פרסם מודעה חדשה</Text>

            <Field label="כותרת *">
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                value={title}
                onChangeText={(value) => setTitle(sanitizeTitleInput(value))}
                placeholder="לדוג׳: דירת 3 חדרים מרוהטת בלב תל אביב"
                placeholderTextColor={colors.textMut}
                textAlign="right"
                maxLength={100}
              />
              <Text style={styles.helperText}>{title.length}/100</Text>
            </Field>

            <View style={styles.row}>
              <Field label="מחיר ₪ *" style={{ flex: 1 }}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                  value={price}
                  onChangeText={(value) => setPrice(keepDigitsOnly(value))}
                  keyboardType="numeric"
                  placeholder="6500"
                  placeholderTextColor={colors.textMut}
                  textAlign="right"
                />
              </Field>
              <Field label="חדרים *" style={{ flex: 1 }}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                  value={rooms}
                  onChangeText={(value) => setRooms(keepDigitsOnly(value))}
                  keyboardType="numeric"
                  placeholder="3"
                  placeholderTextColor={colors.textMut}
                  textAlign="right"
                />
              </Field>
            </View>

            <View style={styles.row}>
              <Field label="עיר *" style={{ flex: 1 }}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                  value={city}
                  onChangeText={(value) => {
                    setCity(value);
                    setStreet('');
                    setStreetSuggestions([]);
                  }}
                  placeholder="בחר עיר בישראל"
                  placeholderTextColor={colors.textMut}
                  textAlign="right"
                />
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
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                  value={street}
                  onChangeText={setStreet}
                  placeholder={canSearchStreet ? 'בחר רחוב לפי העיר' : 'יש לבחור עיר קודם'}
                  placeholderTextColor={colors.textMut}
                  textAlign="right"
                  editable={canSearchStreet}
                />
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
              <Field label="קומה" style={{ flex: 1 }}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                  value={floor}
                  onChangeText={(value) => setFloor(keepDigitsOnly(value))}
                  keyboardType="numeric"
                  placeholder="3"
                  placeholderTextColor={colors.textMut}
                  textAlign="right"
                />
              </Field>
              <Field label='גודל מ"ר' style={{ flex: 1 }}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                  value={sizeSqm}
                  onChangeText={(value) => setSizeSqm(keepDigitsOnly(value))}
                  keyboardType="numeric"
                  placeholder="75"
                  placeholderTextColor={colors.textMut}
                  textAlign="right"
                />
              </Field>
            </View>

            <Field label="תיאור">
              <TextInput
                style={[styles.input, styles.textarea, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholder="תאר את הדירה..."
                placeholderTextColor={colors.textMut}
                textAlign="right"
              />
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

            <Text style={styles.fieldLabel}>תמונות ({images.length}/10)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow} contentContainerStyle={styles.imagesRowContent}>
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                <Ionicons name="camera-outline" size={28} color={dirApp.secondary} />
                <Text style={styles.addImageText}>הוסף</Text>
              </TouchableOpacity>
              {images.map((img, i) => (
                <View key={i} style={styles.imageThumb}>
                  <Image source={img} style={styles.imageThumbImg} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Ionicons name="close-circle" size={18} color={C.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={C.onInverse.primary} />
                : <Text style={styles.submitText}>פרסם מודעה 🏠</Text>
              }
            </TouchableOpacity>
          </View>
          </ResponsiveContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dirApp.background },
  scroll: { paddingVertical: 16, paddingBottom: 40, alignItems: 'center' },
  formCard: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: dirApp.surfaceContainerLowest,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: `${dirApp.outlineVariant}AA`,
    padding: 16,
    shadowColor: dirApp.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  header: { fontSize: 22, fontWeight: '800', color: dirApp.primary, textAlign: 'right', marginBottom: 20 },
  row: { flexDirection: 'row-reverse', marginBottom: 0, columnGap: 8, alignItems: 'flex-start' },
  fieldLabel: { color: dirApp.outline, fontSize: 12, fontWeight: '600', textAlign: 'right', marginBottom: 6 },
  input: {
    backgroundColor: dirApp.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: dirApp.onSurface,
    borderWidth: 1.5,
    borderColor: `${dirApp.outlineVariant}AA`,
    writingDirection: 'rtl',
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  helperText: { marginTop: 4, textAlign: 'right', color: dirApp.outline, fontSize: 11 },
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
  suggestionText: { textAlign: 'right', color: dirApp.onSurface, fontSize: 14 },
  amenitiesGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 20, justifyContent: 'flex-start' },
  amenityChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: dirApp.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: `${dirApp.outlineVariant}AA`,
  },
  amenityChipActive: { backgroundColor: dirApp.secondary, borderColor: dirApp.secondary },
  amenityText: { color: dirApp.outline, fontSize: 13, textAlign: 'right' },
  amenityTextActive: { color: dirApp.onSecondary, fontWeight: '600' },
  imagesRow: { marginBottom: 24 },
  imagesRowContent: { flexDirection: 'row-reverse', alignItems: 'center' },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: dirApp.secondary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: `${dirApp.secondaryContainer}33`,
  },
  addImageText: { color: dirApp.secondary, fontSize: 11, marginTop: 2 },
  imageThumb: { width: 80, height: 80, borderRadius: 12, marginLeft: 8, position: 'relative' },
  imageThumbImg: { width: 80, height: 80, borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: -6, left: -6 },
  submitBtn: {
    backgroundColor: dirApp.primaryContainer,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: C.onInverse.primary, fontSize: 16, fontWeight: '800' },
});
