import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { recommendationsApi, apartmentsApi } from '../services/api';
import type { Apartment } from '../types';
import { C } from '../theme';
import { ResponsiveContainer } from '../components/ResponsiveContainer';

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
  petsAllowed: 'חיות', availableFrom: 'פנוי מ',
};

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCity, setFilterCity] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterRooms, setFilterRooms] = useState<number | null>(null);
  const [filterPets, setFilterPets] = useState(false);
  const [results, setResults] = useState<Apartment[]>([]);
  const [parsedFilters, setParsedFilters] = useState<Record<string, any> | null>(null);

  const hasManualFilters = !!(filterCity || filterMaxPrice || filterRooms || filterPets);

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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ResponsiveContainer style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>חיפוש חכם</Text>
          <Ionicons name="search" size={22} color={C.cyan} style={styles.headerIcon} />
        </View>
        <Text style={styles.subtitle}>תאר את הדירה שאתה מחפש בעברית חופשית</Text>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <TouchableOpacity
            style={[styles.searchBtn, (!query.trim() && !hasManualFilters) && styles.searchBtnDisabled]}
            onPress={() => handleSearch()}
            disabled={searchMutation.isPending || (!query.trim() && !hasManualFilters)}
          >
            {searchMutation.isPending
              ? <ActivityIndicator size="small" color={C.navy} />
              : <Ionicons name="search" size={20} color={C.navy} />
            }
          </TouchableOpacity>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="לדוג׳: 3 חדרים בת״א עד 7000 עם חניה..."
              placeholderTextColor={C.textMut}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
              textAlign="right"
            />
            {(query.length > 0 || results.length > 0) && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearSearch}>
                <Ionicons name="close-circle" size={18} color={C.textMut} />
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
              color={showFilters || hasManualFilters ? C.navy : C.textMut}
            />
          </TouchableOpacity>
        </View>

        {/* Filter panel */}
        {showFilters && (
          <View style={styles.filterPanel}>
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
                  style={styles.priceInput}
                  placeholder="ללא הגבלה"
                  placeholderTextColor={C.textMut}
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

        {/* Active parsed-filter chips */}
        {parsedFilters && Object.keys(parsedFilters).length > 0 && (
          <View style={styles.parsedRow}>
            {Object.entries(parsedFilters).map(([key, val]) => (
              <View key={key} style={styles.parsedChip}>
                <Text style={styles.parsedChipText}>
                  {FILTER_LABEL[key] ?? key}: {String(val)}
                </Text>
              </View>
            ))}
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
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={C.cyan} />
            <Text style={styles.loadingText}>מחפש עם AI...</Text>
          </View>
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
  const image = apartment.images?.[0]?.url;
  const street = apartment.street ?? apartment.neighborhood;
  return (
    <TouchableOpacity style={styles.resultCard} onPress={onPress} activeOpacity={0.85}>
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
      <Ionicons name="chevron-back" size={18} color={C.textMut} />
    </TouchableOpacity>
  );
}

const BORDER_SUBTLE = 'rgba(0, 229, 255, 0.14)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.navy },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 20,
    paddingBottom: 4,
    gap: 10,
  },
  header: { fontSize: 22, fontWeight: '800', color: C.onInverse.primary, textAlign: 'right' },
  headerIcon: { marginTop: 2 },
  subtitle: { color: C.textMut, fontSize: 13, textAlign: 'right', marginBottom: 12 },

  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  inputWrap: { flex: 1, position: 'relative', justifyContent: 'center' },
  searchInput: {
    backgroundColor: C.navyMid,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingLeft: 36,
    color: C.onInverse.primary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  clearBtn: { position: 'absolute', left: 10 },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.cyan,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnDisabled: { opacity: 0.45 },
  filterToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.navyMid,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterToggleBtnActive: { backgroundColor: C.cyan, borderColor: C.cyan },

  filterPanel: {
    marginBottom: 8,
    backgroundColor: C.navyMid,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  filterLabel: { color: C.textMut, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  cityScroll: { flexGrow: 0 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.navy,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    marginRight: 6,
  },
  chipActive: { backgroundColor: C.cyanAlpha(0.18), borderColor: C.cyan },
  chipText: { color: C.textMut, fontSize: 12 },
  chipTextActive: { color: C.cyan, fontWeight: '600' },

  roomsRow: { flexDirection: 'row', gap: 8 },
  roomBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.navy,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    alignItems: 'center',
  },
  roomBtnActive: { backgroundColor: C.cyanAlpha(0.18), borderColor: C.cyan },
  roomBtnText: { color: C.textMut, fontSize: 13, fontWeight: '600' },
  roomBtnTextActive: { color: C.cyan },

  filterRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  priceInput: {
    backgroundColor: C.navy,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: C.onInverse.primary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    marginTop: 4,
  },
  petsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.navy,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  petsBtnActive: { backgroundColor: C.cyanAlpha(0.18), borderColor: C.cyan },
  petsBtnText: { fontSize: 14 },
  petsBtnLabel: { color: C.textMut, fontSize: 11 },
  petsBtnLabelActive: { color: C.cyan },
  clearFiltersBtn: { alignItems: 'flex-end' },
  clearFiltersText: { color: C.coral, fontSize: 12 },

  parsedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  parsedChip: {
    backgroundColor: C.cyanAlpha(0.12),
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.cyanAlpha(0.28),
  },
  parsedChipText: { color: C.cyan, fontSize: 11, fontWeight: '600' },

  suggestions: { paddingVertical: 16, gap: 8 },
  suggestionsLabel: { color: C.textMut, fontSize: 12, textAlign: 'right', marginBottom: 4 },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.navyMid,
    borderRadius: 10,
    padding: 12,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  suggestionText: { color: C.bgCard, fontSize: 13, flex: 1, textAlign: 'right' },

  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText: { color: C.textMut, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    backgroundColor: C.cyan,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: { color: C.navy, fontWeight: '700', fontSize: 14 },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: C.textMut, fontSize: 14 },

  resultsList: { paddingVertical: 12, gap: 10 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.navyMid,
    borderRadius: 14,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  resultThumb: { width: 68, height: 68, borderRadius: 10 },
  resultInfo: { flex: 1, gap: 2 },
  resultTitle: { color: C.onInverse.primary, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  resultMeta: { color: C.textMut, fontSize: 11, textAlign: 'right' },
  resultPrice: { color: C.cyan, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  resultAmenities: { color: C.textMut, fontSize: 10, textAlign: 'right', opacity: 0.85 },
  verifiedIcon: { marginLeft: 2 },

  noResults: { alignItems: 'center', paddingTop: 60, gap: 8 },
  noResultsEmoji: { fontSize: 48 },
  noResultsText: { fontSize: 16, fontWeight: '700', color: C.onInverse.primary },
  noResultsSub: { fontSize: 13, color: C.textMut },
});
