import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SkeletonLoader from '../components/SkeletonLoader';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { recommendationsApi, apartmentsApi } from '../services/api';
import type { Apartment } from '../types';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { dirType } from '../theme/textStyles';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { useColors } from '../context/ThemeContext';

const CITIES = [
  'תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה',
  'נתניה', 'באר שבע', 'בני ברק', 'רמת גן', 'הרצליה',
];

const ROOMS_OPTIONS = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4+', value: 4 },
];

const SUGGESTIONS = [
  'דירת 3 חדרים בתל אביב עד 7000 שקל עם חניה',
  'סטודיו בירושלים עם מעלית קרוב לרכבת',
  '2 חדרים בחיפה עד 5000 שקל מחיות מותרות',
  'דירה מרוהטת בגבעתיים עד 8000',
];

const FILTER_LABEL: Record<string, string> = {
  city: 'עיר', street: 'רחוב', neighborhood: 'רחוב', minPrice: 'מחיר מ',
  maxPrice: 'מחיר עד', minRooms: 'חד׳ מ', maxRooms: 'חד׳ עד',
  petsAllowed: 'חיות', availableFrom: 'פנוי מ', amenities: 'מתקנים',
};

function formatFilterValue(val: unknown): string {
  if (val === true) return 'כן';
  if (val === false) return 'לא';
  if (Array.isArray(val)) return val.join(', ');
  return String(val);
}

function visibleParsedFilters(filters: Record<string, unknown> | null): [string, unknown][] {
  if (!filters) return [];
  return Object.entries(filters).filter(([, val]) => {
    if (val === null || val === undefined || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  });
}

const HISTORY_KEY = 'dirapp_search_history';

export default function SearchScreen() {
  const colors = useColors();
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCity, setFilterCity] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterRooms, setFilterRooms] = useState<number | null>(null);
  const [filterPets, setFilterPets] = useState(false);
  const [results, setResults] = useState<Apartment[]>([]);
  const [parsedFilters, setParsedFilters] = useState<Record<string, any> | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const parsedEntries = visibleParsedFilters(parsedFilters);
  const hasManualFilters = !!(filterCity || filterMaxPrice || filterRooms || filterPets);

  const loadHistory = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(HISTORY_KEY);
      if (data) {
        setHistory(JSON.parse(data));
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const saveHistory = async (newHistory: string[]) => {
    try {
      setHistory(newHistory);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (_) {}
  };

  const addToHistory = (queryText: string) => {
    if (!queryText.trim()) return;
    const clean = queryText.trim();
    const filtered = history.filter((h) => h !== clean);
    const updated = [clean, ...filtered].slice(0, 10);
    saveHistory(updated);
  };

  const deleteHistoryItem = (itemToDelete: string) => {
    const updated = history.filter((h) => h !== itemToDelete);
    saveHistory(updated);
  };

  const searchMutation = useMutation({
    mutationFn: async (q: string) => {
      const overrides = {
        city: filterCity || undefined,
        maxPrice: filterMaxPrice ? parseInt(filterMaxPrice) : undefined,
        minRooms: filterRooms ?? undefined,
        petsAllowed: filterPets || undefined,
      };
      if (q) {
        return recommendationsApi.nlpSearch(q, overrides);
      }
      // Manual filters only — use feed endpoint
      return apartmentsApi.getFeed({
        city: filterCity || undefined,
        maxPrice: filterMaxPrice ? parseInt(filterMaxPrice) : undefined,
        rooms: filterRooms ?? undefined,
      });
    },
    onSuccess: (res) => {
      setResults(res.data.apartments);
      setParsedFilters(res.data.filters ?? null);
    },
  });

  function handleSearch(overrideQuery?: string) {
    const text = overrideQuery ?? query;
    if (!text.trim() && !hasManualFilters) return;
    if (overrideQuery) setQuery(overrideQuery);
    addToHistory(text);
    searchMutation.mutate(text.trim());
  }

  function clearFilters() {
    setFilterCity('');
    setFilterMaxPrice('');
    setFilterRooms(null);
    setFilterPets(false);
  }

  function clearSearch() {
    setQuery('');
    setResults([]);
    setParsedFilters(null);
    searchMutation.reset();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ResponsiveContainer style={{ flex: 1 }}>
        <View style={styles.headerShell}>
          <View style={styles.headerTop}>
            <Text style={[styles.pageTitle, dirType.subhead, { color: dirApp.primary }]}>חיפוש דירות</Text>
            <TouchableOpacity
              style={styles.mapPill}
              onPress={() => navigation.navigate('Map')}
              accessibilityRole="button"
              accessibilityLabel="פתח מפת דירות"
            >
              <Ionicons name="map-outline" size={18} color={dirApp.onSecondaryContainer} />
              <Text style={[styles.mapPillText, dirType.label, { color: dirApp.onSecondaryContainer }]}>
                תצוגת מפה
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, dirType.body, { color: dirApp.outline }]}>
            תאר את הדירה שאתה מחפש בעברית חופשית
          </Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <TouchableOpacity
            style={[styles.searchBtn, (!query.trim() && !hasManualFilters) && styles.searchBtnDisabled]}
            onPress={() => handleSearch()}
            disabled={searchMutation.isPending || (!query.trim() && !hasManualFilters)}
          >
            {searchMutation.isPending
              ? <ActivityIndicator size="small" color={C.onInverse.primary} />
              : <Ionicons name="search" size={20} color={C.onInverse.primary} />
            }
          </TouchableOpacity>
          <View style={styles.inputWrap}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.text }]}
              placeholder="לדוג׳: 3 חדרים בת״א עד 7000 עם חניה..."
              placeholderTextColor={colors.textMut}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleSearch()}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setTimeout(() => setIsInputFocused(false), 250)}
              returnKeyType="search"
              textAlign="right"
            />
            {(query.length > 0 || results.length > 0) && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearSearch}>
                <Ionicons name="close-circle" size={18} color={colors.textMut} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterToggleBtn, (showFilters || hasManualFilters) && styles.filterToggleBtnActive]}
            onPress={() => setShowFilters((v) => !v)}
          >
            <Ionicons
              name="options"
              size={20}
              color={showFilters || hasManualFilters ? dirApp.secondary : dirApp.outline}
            />
          </TouchableOpacity>
        </View>

        {/* Search history list */}
        {isInputFocused && query.trim() === '' && history.length > 0 && (
          <View style={[styles.historyPanel, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.historyTitle, { color: colors.textSub }]}>חיפושים אחרונים</Text>
            {history.map((h) => (
              <View key={h} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => deleteHistoryItem(h)}
                  style={styles.historyDeleteBtn}
                  accessibilityLabel="מחק חיפוש אחרון"
                >
                  <Ionicons name="trash-outline" size={14} color={C.danger} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSearch(h)}
                  style={styles.historyTextBtn}
                >
                  <Ionicons name="time-outline" size={14} color={colors.textMut} />
                  <Text style={[styles.historyText, { color: colors.text }]}>{h}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Filter panel */}
        {showFilters && (
          <View style={[styles.filterPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* City chips */}
            <Text style={styles.filterLabel}>עיר</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityScroll}>
              {CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[styles.chip, filterCity === city && styles.chipActive]}
                  onPress={() => setFilterCity((prev) => prev === city ? '' : city)}
                >
                  <Text style={[styles.chipText, filterCity === city && styles.chipTextActive]}>{city}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Rooms */}
            <Text style={styles.filterLabel}>חדרים (מינימום)</Text>
            <View style={styles.roomsRow}>
              {ROOMS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.roomBtn, filterRooms === opt.value && styles.roomBtnActive]}
                  onPress={() => setFilterRooms((prev) => prev === opt.value ? null : opt.value)}
                >
                  <Text style={[styles.roomBtnText, filterRooms === opt.value && styles.roomBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Max price + pets row */}
            <View style={styles.filterRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>מחיר מקסימום ₪</Text>
                <TextInput
                  style={[styles.priceInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.text }]}
                  placeholder="ללא הגבלה"
                  placeholderTextColor={colors.textMut}
                  value={filterMaxPrice}
                  onChangeText={setFilterMaxPrice}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
              <TouchableOpacity
                style={[styles.petsBtn, filterPets && styles.petsBtnActive]}
                onPress={() => setFilterPets((v) => !v)}
              >
                <Text style={styles.petsBtnText}>🐾</Text>
                <Text style={[styles.petsBtnLabel, filterPets && styles.petsBtnLabelActive]}>
                  חיות מותרות
                </Text>
              </TouchableOpacity>
            </View>

            {hasManualFilters && (
              <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersBtn}>
                <Text style={styles.clearFiltersText}>נקה פילטרים</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Active parsed-filter chips (UX-030) */}
        {searchMutation.isSuccess && query.trim().length > 0 && (
          <View style={styles.parsedSection}>
            <Text style={styles.parsedTitle}>מה שה-AI הבין מהחיפוש</Text>
            {parsedEntries.length > 0 ? (
              <View style={styles.parsedRow}>
                {parsedEntries.map(([key, val]) => (
                  <View key={key} style={styles.parsedChip}>
                    <Text style={styles.parsedChipText}>
                      {FILTER_LABEL[key] ?? key}: {formatFilterValue(val)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.parsedEmpty}>
                לא זוהו מגבלות ספציפיות — מוצגות דירות לפי החיפוש והפילטרים הידניים.
              </Text>
            )}
          </View>
        )}

        {/* Suggestions */}
        {results.length === 0 && !searchMutation.isPending && !searchMutation.isError && !searchMutation.isSuccess && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsLabel}>נסה לחפש:</Text>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.suggestionChip}
                onPress={() => handleSearch(s)}
              >
                <Ionicons name="bulb-outline" size={14} color={C.cyan} />
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Error */}
        {searchMutation.isError && (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={32} color={C.danger} />
            <Text style={styles.errorText}>החיפוש נכשל — בדוק חיבור ונסה שוב</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => handleSearch()}>
              <Text style={styles.retryBtnText}>נסה שוב</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading */}
        {searchMutation.isPending && (
          <ScrollView contentContainerStyle={styles.resultsList}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[styles.resultCard, { opacity: 0.8, backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <SkeletonLoader width={68} height={68} borderRadius={10} />
                <View style={[styles.resultInfo, { flex: 1 }]}>
                  <SkeletonLoader width="80%" height={16} borderRadius={4} style={{ alignSelf: 'flex-end', marginBottom: 6 }} />
                  <SkeletonLoader width="60%" height={12} borderRadius={4} style={{ alignSelf: 'flex-end', marginBottom: 6 }} />
                  <SkeletonLoader width="30%" height={14} borderRadius={4} style={{ alignSelf: 'flex-end' }} />
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Results */}
        {!searchMutation.isPending && !searchMutation.isError && (
          <FlatList
            style={{ flex: 1 }}
            data={results}
            keyExtractor={(a) => a.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.resultsList}
            renderItem={({ item }) => (
              <ResultCard
                apartment={item}
                onPress={() => navigation.navigate('ApartmentDetail', { apartmentId: item.id })}
              />
            )}
            ListEmptyComponent={
              searchMutation.isSuccess ? (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsEmoji}>🏚️</Text>
                  <Text style={styles.noResultsText}>לא נמצאו דירות</Text>
                  <Text style={styles.noResultsSub}>נסה לשנות את הפילטרים או החיפוש</Text>
                </View>
              ) : null
            }
          />
        )}
        </ResponsiveContainer>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ResultCard({ apartment, onPress }: { apartment: Apartment; onPress: () => void }) {
  const colors = useColors();
  const image = apartment.images?.[0]?.url;
  const street = apartment.street ?? apartment.neighborhood;
  return (
    <TouchableOpacity style={[styles.resultCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.85}>
      <Image
        source={{ uri: image || 'https://via.placeholder.com/80x80' }}
        style={styles.resultThumb}
        contentFit="cover"
      />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>{apartment.title}</Text>
        <Text style={styles.resultMeta} numberOfLines={1}>
          {apartment.city}{street ? ` · ${street}` : ''} · {apartment.rooms} חד׳
        </Text>
        <Text style={styles.resultPrice}>₪{apartment.price.toLocaleString()}/חודש</Text>
        {apartment.amenities?.length > 0 && (
          <Text style={styles.resultAmenities} numberOfLines={1}>
            {apartment.amenities.slice(0, 3).join(' · ')}
          </Text>
        )}
      </View>
      {apartment.landlord?.isVerified && (
        <Ionicons name="checkmark-circle" size={18} color={C.cyan} style={styles.verifiedIcon} />
      )}
      <Ionicons name="chevron-back" size={18} color={colors.textMut} />
    </TouchableOpacity>
  );
}

const OUTLINE_BORDER = `${dirApp.outlineVariant}AA`;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dirApp.background },
  headerShell: {
    paddingTop: 12,
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: `${dirApp.outlineVariant}55`,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pageTitle: { flex: 1, textAlign: 'right' },
  mapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: dirApp.secondaryContainer,
    shadowColor: dirApp.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  mapPillText: {},
  subtitle: { textAlign: 'right', marginBottom: 8 },

  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  inputWrap: { flex: 1, position: 'relative', justifyContent: 'center' },
  searchInput: {
    backgroundColor: dirApp.surfaceContainerLowest,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingLeft: 36,
    color: dirApp.onSurface,
    fontSize: 16,
    borderWidth: 1,
    borderColor: OUTLINE_BORDER,
    shadowColor: dirApp.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  clearBtn: { position: 'absolute', left: 10 },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: dirApp.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnDisabled: { opacity: 0.45 },
  filterToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: dirApp.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: OUTLINE_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterToggleBtnActive: { backgroundColor: dirApp.secondaryContainer, borderColor: dirApp.secondary },

  filterPanel: {
    marginBottom: 8,
    backgroundColor: dirApp.surfaceContainerLow,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: OUTLINE_BORDER,
  },
  filterLabel: { color: dirApp.outline, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  cityScroll: { flexGrow: 0 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: dirApp.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: OUTLINE_BORDER,
    marginRight: 6,
  },
  chipActive: { backgroundColor: dirApp.secondary, borderColor: dirApp.secondary },
  chipText: { color: dirApp.onSurfaceVariant, fontSize: 12 },
  chipTextActive: { color: dirApp.onSecondary, fontWeight: '600' },

  roomsRow: { flexDirection: 'row', gap: 8 },
  roomBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: dirApp.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: OUTLINE_BORDER,
    alignItems: 'center',
  },
  roomBtnActive: { backgroundColor: `${dirApp.secondaryContainer}55`, borderColor: dirApp.secondary },
  roomBtnText: { color: dirApp.onSurfaceVariant, fontSize: 13, fontWeight: '600' },
  roomBtnTextActive: { color: dirApp.secondary },

  filterRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  priceInput: {
    backgroundColor: dirApp.surfaceContainerLowest,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: dirApp.onSurface,
    fontSize: 13,
    borderWidth: 1,
    borderColor: OUTLINE_BORDER,
    marginTop: 4,
  },
  petsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: dirApp.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: OUTLINE_BORDER,
  },
  petsBtnActive: { backgroundColor: `${dirApp.secondaryContainer}55`, borderColor: dirApp.secondary },
  petsBtnText: { fontSize: 14 },
  petsBtnLabel: { color: dirApp.outline, fontSize: 11 },
  petsBtnLabelActive: { color: dirApp.secondary },
  clearFiltersBtn: { alignItems: 'flex-end' },
  clearFiltersText: { color: C.danger, fontSize: 12 },

  parsedSection: { marginBottom: 8, gap: 6 },
  parsedTitle: {
    color: dirApp.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  parsedEmpty: {
    color: dirApp.outline,
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 18,
  },
  parsedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  parsedChip: {
    backgroundColor: `${dirApp.secondaryContainer}44`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${dirApp.secondary}44`,
  },
  parsedChipText: { color: dirApp.onSecondaryContainer, fontSize: 11, fontWeight: '600' },

  suggestions: { paddingVertical: 16, gap: 8 },
  suggestionsLabel: { color: dirApp.outline, fontSize: 12, textAlign: 'right', marginBottom: 4 },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: dirApp.surfaceContainer,
    borderRadius: 10,
    padding: 12,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: OUTLINE_BORDER,
  },
  suggestionText: { color: dirApp.onSurface, fontSize: 13, flex: 1, textAlign: 'right' },

  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText: { color: dirApp.outline, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    backgroundColor: dirApp.secondary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: { color: dirApp.onSecondary, fontWeight: '700', fontSize: 14 },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: dirApp.outline, fontSize: 14 },

  resultsList: { paddingVertical: 12, gap: 10 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dirApp.surfaceContainerLowest,
    borderRadius: 14,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: OUTLINE_BORDER,
    shadowColor: dirApp.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  resultThumb: { width: 68, height: 68, borderRadius: 10 },
  resultInfo: { flex: 1, gap: 2 },
  resultTitle: { color: dirApp.primary, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  resultMeta: { color: dirApp.outline, fontSize: 11, textAlign: 'right' },
  resultPrice: { color: dirApp.secondary, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  resultAmenities: { color: dirApp.outline, fontSize: 10, textAlign: 'right', opacity: 0.9 },
  verifiedIcon: { marginLeft: 2 },

  noResults: { alignItems: 'center', paddingTop: 60, gap: 8 },
  noResultsEmoji: { fontSize: 48 },
  noResultsText: { fontSize: 16, fontWeight: '700', color: dirApp.primary },
  noResultsSub: { fontSize: 13, color: dirApp.outline },

  historyPanel: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 0.5,
  },
  historyDeleteBtn: {
    padding: 4,
  },
  historyTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyText: {
    fontSize: 13,
  },
});
