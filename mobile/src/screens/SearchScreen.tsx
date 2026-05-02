import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMutation } from '@tanstack/react-query';
import { recommendationsApi, swipeApi } from '../services/api';
import type { Apartment } from '../types';

const SUGGESTIONS = [
  'דירת 3 חדרים בתל אביב עד 7000 שקל עם חניה',
  'סטודיו בירושלים עם מעלית קרוב לרכבת',
  '2 חדרים בחיפה עד 5000 שקל מחיות מותרות',
  'דירה מרוהטת בגבעתיים עד 8000',
];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Apartment[]>([]);
  const [parsedFilters, setParsedFilters] = useState<Record<string, any> | null>(null);

  const searchMutation = useMutation({
    mutationFn: (q: string) => recommendationsApi.nlpSearch(q),
    onSuccess: (res) => {
      setResults(res.data.apartments);
      setParsedFilters(res.data.filters);
    },
  });

  function handleSearch(q?: string) {
    const text = (q ?? query).trim();
    if (!text) return;
    setQuery(text);
    searchMutation.mutate(text);
  }

  async function handleLike(apartment: Apartment) {
    await swipeApi.record(apartment.id, 'like').catch(() => {});
    setResults((prev) => prev.filter((a) => a.id !== apartment.id));
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
            style={[styles.searchBtn, searchMutation.isPending && styles.searchBtnDisabled]}
            onPress={() => handleSearch()}
            disabled={searchMutation.isPending || !query.trim()}
          >
            {searchMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="search" size={20} color="#fff" />
            }
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="לדוג׳: 3 חדרים בת״א עד 7000 עם חניה..."
            placeholderTextColor="#A0A0B2"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
            textAlign="right"
            multiline={false}
          />
        </View>

        {/* Parsed filters display */}
        {parsedFilters && Object.keys(parsedFilters).length > 0 && (
          <View style={styles.filtersRow}>
            {Object.entries(parsedFilters).map(([key, val]) => (
              <View key={key} style={styles.filterChip}>
                <Text style={styles.filterChipText}>
                  {FILTER_LABEL[key] ?? key}: {String(val)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Suggestions (shown before first search) */}
        {results.length === 0 && !searchMutation.isPending && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsLabel}>נסה לחפש:</Text>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.suggestionChip}
                onPress={() => handleSearch(s)}
              >
                <Ionicons name="bulb-outline" size={14} color="#6C5CE7" />
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Results */}
        {searchMutation.isPending ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#6C5CE7" />
            <Text style={styles.loadingText}>מחפש עם AI...</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(a) => a.id}
            contentContainerStyle={styles.resultsList}
            renderItem={({ item }) => (
              <ResultCard apartment={item} onLike={() => handleLike(item)} />
            )}
            ListEmptyComponent={
              searchMutation.isSuccess ? (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>לא נמצאו דירות — נסה חיפוש אחר</Text>
                </View>
              ) : null
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ResultCard({ apartment, onLike }: { apartment: Apartment; onLike: () => void }) {
  const image = apartment.images?.[0]?.url;
  return (
    <View style={styles.resultCard}>
      <Image
        source={{ uri: image || 'https://via.placeholder.com/80x80' }}
        style={styles.resultThumb}
        contentFit="cover"
      />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>{apartment.title}</Text>
        <Text style={styles.resultMeta}>{apartment.city} · {apartment.rooms} חד׳</Text>
        <Text style={styles.resultPrice}>₪{apartment.price.toLocaleString()}/חודש</Text>
      </View>
      <TouchableOpacity style={styles.likeBtn} onPress={onLike}>
        <Ionicons name="heart" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const FILTER_LABEL: Record<string, string> = {
  city: 'עיר', neighborhood: 'שכונה', minPrice: 'מחיר מ',
  maxPrice: 'מחיר עד', minRooms: 'חד׳ מ', maxRooms: 'חד׳ עד',
  petsAllowed: 'חיות', availableFrom: 'פנוי מ',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  header: { fontSize: 22, fontWeight: '800', color: '#fff', padding: 20, paddingBottom: 4, textAlign: 'right' },
  subtitle: { color: '#A0A0B2', fontSize: 13, paddingHorizontal: 20, textAlign: 'right', marginBottom: 16 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 10 },
  searchInput: {
    flex: 1, backgroundColor: '#2A2A3E', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    color: '#fff', fontSize: 14,
    borderWidth: 1, borderColor: '#3A3A5E',
  },
  searchBtn: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center',
  },
  searchBtnDisabled: { opacity: 0.5 },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, marginBottom: 10 },
  filterChip: {
    backgroundColor: 'rgba(108,92,231,0.2)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  filterChipText: { color: '#6C5CE7', fontSize: 11, fontWeight: '600' },
  suggestions: { padding: 16, gap: 8 },
  suggestionsLabel: { color: '#A0A0B2', fontSize: 12, textAlign: 'right', marginBottom: 4 },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2A2A3E', borderRadius: 10,
    padding: 12, justifyContent: 'flex-end',
  },
  suggestionText: { color: '#E0E0E0', fontSize: 13, flex: 1, textAlign: 'right' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#A0A0B2', fontSize: 14 },
  resultsList: { padding: 16, gap: 10 },
  resultCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#2A2A3E', borderRadius: 14, padding: 10, gap: 12,
  },
  resultThumb: { width: 64, height: 64, borderRadius: 10 },
  resultInfo: { flex: 1 },
  resultTitle: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'right' },
  resultMeta: { color: '#A0A0B2', fontSize: 11, textAlign: 'right', marginTop: 2 },
  resultPrice: { color: '#6C5CE7', fontSize: 13, fontWeight: '700', textAlign: 'right', marginTop: 2 },
  likeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FF4757', justifyContent: 'center', alignItems: 'center',
  },
  noResults: { alignItems: 'center', paddingTop: 40 },
  noResultsText: { color: '#A0A0B2', fontSize: 14 },
});
