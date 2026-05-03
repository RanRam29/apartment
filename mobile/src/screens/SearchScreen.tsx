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
import { C } from '../theme';
import type { Apartment } from '../types';

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
  city: 'עיר', neighborhood: 'שכונה', minPrice: 'מחיר מ',
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
        <Text style={styles.header}>חיפוש חכם 🔍</Text>
        <Text style={styles.subtitle}>תאר את הדירה שאתה מחפש בעברית חופשית</Text>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <TouchableOpacity
            style={[styles.searchBtn, (!query.trim() && !hasManualFilters) && styles.searchBtnDisabled]}
            onPress={() => handleSearch()}
            disabled={searchMutation.isPending || (!query.trim() && !hasManualFilters)}
          >
            {searchMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="search" size={20} color="#fff" />
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
              color={showFilters || hasManualFilters ? '#fff' : C.textSub}
            />
          </TouchableOpacity>
        </View>

        {/* Filter panel */}
        {showFilters && (
          <View style={styles.filterPanel}>
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
                <Ionicons name="bulb-outline" size={14} color={C.navy} />
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Error */}
        {searchMutation.isError && (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={32} color={C.coral} />
            <Text style={styles.errorText}>החיפוש נכשל — בדוק חיבור ונסה שוב</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => handleSearch()}>
              <Text style={styles.retryBtnText}>נסה שוב</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading */}
        {searchMutation.isPending && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={C.navy} />
            <Text style={styles.loadingText}>מחפש עם AI...</Text>
          </View>
        )}

        {/* Results */}
        {!searchMutation.isPending && !searchMutation.isError && (
          <FlatList
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ResultCard({ apartment, onPress }: { apartment: Apartment; onPress: () => void }) {
  const image = apartment.images?.[0]?.url;
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
          {apartment.city}{apartment.neighborhood ? ` · ${apartment.neighborhood}` : ''} · {apartment.rooms} חד׳
        </Text>
        <Text style={styles.resultPrice}>₪{apartment.price.toLocaleString()}/חודש</Text>
        {apartment.amenities?.length > 0 && (
          <Text style={styles.resultAmenities} numberOfLines={1}>
            {apartment.amenities.slice(0, 3).join(' · ')}
          </Text>
        )}
      </View>
      {apartment.landlord?.isVerified && (
        <Ionicons name="checkmark-circle" size={18} color={C.navy} style={styles.verifiedIcon} />
      )}
      <Ionicons name="chevron-back" size={18} color={C.textMut} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { fontSize: 22, fontWeight: '800', color: C.text, padding: 20, paddingBottom: 4, textAlign: 'right' },
  subtitle: { color: C.textSub, fontSize: 13, paddingHorizontal: 20, textAlign: 'right', marginBottom: 12 },

  searchRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8, alignItems: 'center' },
  inputWrap: { flex: 1, position: 'relative', justifyContent: 'center' },
  searchInput: {
    backgroundColor: C.bgCard, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, paddingLeft: 36,
    color: C.text, fontSize: 14, borderWidth: 1.5, borderColor: C.border,
  },
  clearBtn: { position: 'absolute', left: 10 },
  searchBtn: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: C.navy, justifyContent: 'center', alignItems: 'center',
  },
  searchBtnDisabled: { opacity: 0.5 },
  filterToggleBtn: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: C.bgCard, borderWidth: 1.5, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  filterToggleBtnActive: { backgroundColor: C.navy, borderColor: C.navy },

  filterPanel: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: C.bgCard, borderRadius: 14,
    padding: 14, gap: 10,
    borderWidth: 1, borderColor: C.border,
  },
  filterLabel: { color: C.textSub, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  cityScroll: { flexGrow: 0 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, marginRight: 6,
  },
  chipActive: { backgroundColor: C.navy, borderColor: C.navy },
  chipText: { color: C.textSub, fontSize: 12 },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  roomsRow: { flexDirection: 'row', gap: 8 },
  roomBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center',
  },
  roomBtnActive: { backgroundColor: C.navy, borderColor: C.navy },
  roomBtnText: { color: C.textSub, fontSize: 13, fontWeight: '600' },
  roomBtnTextActive: { color: '#fff' },

  filterRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  priceInput: {
    backgroundColor: C.bg, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    color: C.text, fontSize: 13, borderWidth: 1.5, borderColor: C.border, marginTop: 4,
  },
  petsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
  },
  petsBtnActive: { backgroundColor: C.navy, borderColor: C.navy },
  petsBtnText: { fontSize: 14 },
  petsBtnLabel: { color: C.textSub, fontSize: 11 },
  petsBtnLabelActive: { color: '#fff' },
  clearFiltersBtn: { alignItems: 'flex-end' },
  clearFiltersText: { color: C.coral, fontSize: 12, fontWeight: '600' },

  parsedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, marginBottom: 8 },
  parsedChip: {
    backgroundColor: C.navyAlpha(0.08), borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.navyAlpha(0.2),
  },
  parsedChipText: { color: C.navy, fontSize: 11, fontWeight: '600' },

  suggestions: { padding: 16, gap: 8 },
  suggestionsLabel: { color: C.textSub, fontSize: 12, textAlign: 'right', marginBottom: 4 },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.bgCard, borderRadius: 10, padding: 12,
    justifyContent: 'flex-end', borderWidth: 1, borderColor: C.border,
  },
  suggestionText: { color: C.text, fontSize: 13, flex: 1, textAlign: 'right' },

  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText: { color: C.textSub, fontSize: 14, textAlign: 'center' },
  retryBtn: { backgroundColor: C.navy, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: C.textSub, fontSize: 14 },

  resultsList: { padding: 16, gap: 10 },
  resultCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bgCard, borderRadius: 14, padding: 10, gap: 10,
    borderWidth: 1, borderColor: C.border,
  },
  resultThumb: { width: 68, height: 68, borderRadius: 10 },
  resultInfo: { flex: 1, gap: 2 },
  resultTitle: { color: C.text, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  resultMeta: { color: C.textSub, fontSize: 11, textAlign: 'right' },
  resultPrice: { color: C.navy, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  resultAmenities: { color: C.textMut, fontSize: 10, textAlign: 'right' },
  verifiedIcon: { marginLeft: 2 },

  noResults: { alignItems: 'center', paddingTop: 60, gap: 8 },
  noResultsEmoji: { fontSize: 48 },
  noResultsText: { fontSize: 16, fontWeight: '700', color: C.text },
  noResultsSub: { fontSize: 13, color: C.textSub },
});
