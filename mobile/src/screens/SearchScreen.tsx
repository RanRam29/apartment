import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SkeletonLoader from '../components/SkeletonLoader';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { recommendationsApi, apartmentsApi, swipeApi } from '../services/api';
import type { Apartment } from '../types';
import { C, typography } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { dirType } from '../theme/textStyles';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { useColors } from '../context/ThemeContext';
import { showAlert } from '../utils/alert';

const { width } = Dimensions.get('window');

const CITIES = [
  'תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה',
  'נתניה', 'באר שבע', 'רמת גן', 'הרצליה',
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
  
  // Active manual filters
  const [filterCity, setFilterCity] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterRooms, setFilterRooms] = useState<number | null>(null);
  const [filterPets, setFilterPets] = useState(false);
  const [filterParking, setFilterParking] = useState(false);
  const [filterElevator, setFilterElevator] = useState(false);
  
  const [results, setResults] = useState<Apartment[]>([]);
  const [parsedFilters, setParsedFilters] = useState<Record<string, any> | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const parsedEntries = visibleParsedFilters(parsedFilters);
  const hasManualFilters = !!(filterCity || filterMaxPrice || filterRooms || filterPets || filterParking || filterElevator);

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
    // Fetch initial search results (feed) on load
    handleSearch('');
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
        parking: filterParking || undefined,
        elevator: filterElevator || undefined,
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
      setResults(res.data.apartments || []);
      setParsedFilters(res.data.filters ?? null);
    },
  });

  function handleSearch(overrideQuery?: string) {
    const text = overrideQuery !== undefined ? overrideQuery : query;
    if (overrideQuery !== undefined) setQuery(overrideQuery);
    if (text.trim()) {
      addToHistory(text);
    }
    searchMutation.mutate(text.trim());
  }

  const toggleFavorite = async (apartmentId: string) => {
    const isFav = !!favorites[apartmentId];
    try {
      if (!isFav) {
        await swipeApi.record(apartmentId, 'like');
        setFavorites(prev => ({ ...prev, [apartmentId]: true }));
        showAlert('הצלחה', 'הדירה נוספה למועדפים שלך!');
      } else {
        await swipeApi.record(apartmentId, 'dislike');
        setFavorites(prev => ({ ...prev, [apartmentId]: false }));
        showAlert('הצלחה', 'הדירה הוסרה מהמועדפים.');
      }
    } catch {
      setFavorites(prev => ({ ...prev, [apartmentId]: !isFav }));
    }
  };

  function clearFilters() {
    setFilterCity('');
    setFilterMaxPrice('');
    setFilterRooms(null);
    setFilterPets(false);
    setFilterParking(false);
    setFilterElevator(false);
    // Reload search after clear
    setTimeout(() => handleSearch(''), 50);
  }

  function clearSearch() {
    setQuery('');
    setResults([]);
    setParsedFilters(null);
    searchMutation.reset();
    handleSearch('');
  }

  const getSubTitleText = () => {
    let parts: string[] = [];
    if (filterCity) parts.push(filterCity);
    else parts.push('כל הארץ');
    if (filterMaxPrice) parts.push(`עד ₪${Number(filterMaxPrice).toLocaleString()}`);
    else parts.push('כל המחירים');
    if (filterRooms) parts.push(`${filterRooms} חדרים`);
    return parts.join(' • ');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ResponsiveContainer style={{ flex: 1 }}>
          
          {/* STITCH HEADER SYSTEM */}
          <View style={styles.headerContainer}>
            <View style={styles.searchPillContainer}>
              {/* Left search icon button */}
              <TouchableOpacity
                style={styles.searchIconBtn}
                onPress={() => handleSearch()}
                disabled={searchMutation.isPending}
              >
                {searchMutation.isPending ? (
                  <ActivityIndicator size="small" color={dirApp.primary} />
                ) : (
                  <Ionicons name="search" size={20} color={dirApp.primary} />
                )}
              </TouchableOpacity>

              {/* Center Input (Stitch design layout) */}
              <View style={styles.searchTextContainer}>
                <TextInput
                  style={styles.pillInput}
                  placeholder="חפש תל אביב, ירושלים או מלל חופשי..."
                  placeholderTextColor="#74777f"
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={() => handleSearch()}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setTimeout(() => setIsInputFocused(false), 250)}
                  returnKeyType="search"
                  textAlign="right"
                />
                <Text style={styles.pillSubtext}>{getSubTitleText()}</Text>
              </View>

              {/* Close query button */}
              {query.length > 0 && (
                <TouchableOpacity style={styles.clearSearchBtn} onPress={clearSearch}>
                  <Ionicons name="close-circle" size={18} color="#74777f" />
                </TouchableOpacity>
              )}

              {/* Trailing tune/filters button */}
              <TouchableOpacity
                style={[styles.tuneBtn, (showFilters || hasManualFilters) && styles.tuneBtnActive]}
                onPress={() => setShowFilters(v => !v)}
              >
                <Ionicons 
                  name="tune" 
                  size={20} 
                  color={showFilters || hasManualFilters ? '#002045' : '#74777f'} 
                />
              </TouchableOpacity>
            </View>

            {/* Horizontal Filter Chips (Stitch screen list view chip row) */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.filterChipsRow}
            >
              <TouchableOpacity 
                onPress={() => setShowFilters(!showFilters)}
                style={[styles.filterChip, (filterMaxPrice !== '') && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, (filterMaxPrice !== '') && styles.filterChipTextActive]}>
                  {filterMaxPrice ? `מחיר: עד ₪${filterMaxPrice}` : 'מחיר'}
                </Text>
                <Ionicons name="chevron-down" size={12} color={filterMaxPrice ? '#ffffff' : '#43474e'} style={{ marginRight: 4 }} />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setShowFilters(!showFilters)}
                style={[styles.filterChip, (filterRooms !== null) && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, (filterRooms !== null) && styles.filterChipTextActive]}>
                  {filterRooms ? `${filterRooms} חדרים` : 'חדרי שינה'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => {
                  setFilterPets(!filterPets);
                  setTimeout(() => handleSearch(), 50);
                }}
                style={[styles.filterChip, filterPets && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, filterPets && styles.filterChipTextActive]}>🐾 חיות מותרות</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => {
                  setFilterParking(!filterParking);
                  setTimeout(() => handleSearch(), 50);
                }}
                style={[styles.filterChip, filterParking && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, filterParking && styles.filterChipTextActive]}>🚗 חניה</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => {
                  setFilterElevator(!filterElevator);
                  setTimeout(() => handleSearch(), 50);
                }}
                style={[styles.filterChip, filterElevator && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, filterElevator && styles.filterChipTextActive]}>🛗 מעלית</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Search history list overlay */}
          {isInputFocused && query.trim() === '' && history.length > 0 && (
            <View style={[styles.historyPanel, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[styles.historyTitle, { color: colors.textSub }]}>חיפושים אחרונים</Text>
              {history.map((h) => (
                <View key={h} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => deleteHistoryItem(h)}
                    style={styles.historyDeleteBtn}
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

          {/* Filter Panel (expandable manual selectors) */}
          {showFilters && (
            <View style={styles.expandedFilterPanel}>
              {/* City Selector */}
              <Text style={styles.filterSectionTitle}>בחר עיר</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityScroll}>
                {CITIES.map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={[styles.cityChip, filterCity === city && styles.cityChipActive]}
                    onPress={() => setFilterCity(prev => prev === city ? '' : city)}
                  >
                    <Text style={[styles.cityChipText, filterCity === city && styles.cityChipTextActive]}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Rooms Selector */}
              <Text style={styles.filterSectionTitle}>חדרי שינה (מינימום)</Text>
              <View style={styles.roomsRow}>
                {ROOMS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.roomBtn, filterRooms === opt.value && styles.roomBtnActive]}
                    onPress={() => setFilterRooms(prev => prev === opt.value ? null : opt.value)}
                  >
                    <Text style={[styles.roomBtnText, filterRooms === opt.value && styles.roomBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Max Price input */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.filterSectionTitle}>מחיר חודשי מקסימלי (ש״ח)</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="ללא הגבלת מחיר"
                  placeholderTextColor="#74777f"
                  value={filterMaxPrice}
                  onChangeText={setFilterMaxPrice}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.filterActions}>
                <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersBtn}>
                  <Text style={styles.clearFiltersText}>נקה הכל</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    setShowFilters(false);
                    handleSearch();
                  }} 
                  style={styles.applyFiltersBtn}
                >
                  <Text style={styles.applyFiltersText}>החל סינון</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Active parsed-filter chips (UX-030) */}
          {searchMutation.isSuccess && query.trim().length > 0 && (
            <View style={styles.parsedSection}>
              <Text style={styles.parsedTitle}>מה שה-AI הבין מהחיפוש:</Text>
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
                  חיפוש טקסט חופשי פעיל.
                </Text>
              )}
            </View>
          )}

          {/* VIEW SWITCHER PILL (Stitch Center Inline Switch) */}
          <View style={styles.viewToggleWrapper}>
            <View style={styles.viewTogglePill}>
              <TouchableOpacity style={styles.toggleBtnActive} activeOpacity={0.85}>
                <Ionicons name="list" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
                <Text style={styles.toggleTextActive}>רשימה</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.toggleBtnInactive} 
                onPress={() => navigation.navigate('Map')}
                activeOpacity={0.85}
              >
                <Ionicons name="map-outline" size={16} color="#43474e" style={{ marginLeft: 6 }} />
                <Text style={styles.toggleTextInactive}>מפה</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Suggestions */}
          {results.length === 0 && !searchMutation.isPending && !searchMutation.isError && !searchMutation.isSuccess && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsLabel}>הצעות לחיפוש מהיר:</Text>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.suggestionChip}
                  onPress={() => handleSearch(s)}
                >
                  <Ionicons name="bulb-outline" size={14} color={C.cyan} style={{ marginLeft: 6 }} />
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Error View */}
          {searchMutation.isError && (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={40} color={C.danger} />
              <Text style={styles.errorText}>החיפוש נכשל — בדוק חיבור לרשת ונסה שוב</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => handleSearch()}>
                <Text style={styles.retryBtnText}>נסה שוב</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Skeleton Loading State */}
          {searchMutation.isPending && (
            <ScrollView contentContainerStyle={styles.resultsList} showsVerticalScrollIndicator={false}>
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={styles.loadingCard}>
                  <SkeletonLoader width="100%" height={200} borderRadius={16} />
                  <View style={{ padding: 16, gap: 8 }}>
                    <SkeletonLoader width="60%" height={20} borderRadius={4} style={{ alignSelf: 'flex-end' }} />
                    <SkeletonLoader width="80%" height={14} borderRadius={4} style={{ alignSelf: 'flex-end' }} />
                    <SkeletonLoader width="40%" height={16} borderRadius={4} style={{ alignSelf: 'flex-end' }} />
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Results Grid List */}
          {!searchMutation.isPending && !searchMutation.isError && (
            <FlatList
              style={{ flex: 1 }}
              data={results}
              keyExtractor={(a) => a.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const isFeatured = index === 0; // Bento Style layout: First card is featured!
                const isFav = !!favorites[item.id];
                if (isFeatured) {
                  return (
                    <FeaturedResultCard 
                      apartment={item}
                      isFav={isFav}
                      onFavPress={() => toggleFavorite(item.id)}
                      onPress={() => navigation.navigate('ApartmentDetail', { apartmentId: item.id })}
                    />
                  );
                }
                return (
                  <RegularResultCard 
                    apartment={item}
                    isFav={isFav}
                    onFavPress={() => toggleFavorite(item.id)}
                    onPress={() => navigation.navigate('ApartmentDetail', { apartmentId: item.id })}
                  />
                );
              }}
              ListEmptyComponent={
                searchMutation.isSuccess ? (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsEmoji}>🏚️</Text>
                    <Text style={styles.noResultsText}>לא נמצאו דירות התואמות את החיפוש</Text>
                    <Text style={styles.noResultsSub}>נסה לשנות את מילות המפתח או פילטר הסינון</Text>
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

// BENTO 1: Featured Luxury Property Card (Stitch highlight design)
function FeaturedResultCard({ apartment, isFav, onFavPress, onPress }: { apartment: Apartment; isFav: boolean; onFavPress: () => void; onPress: () => void }) {
  const image = apartment.images?.[0]?.url;
  const street = apartment.street ?? apartment.neighborhood ?? 'מיקום שקט';
  
  return (
    <TouchableOpacity 
      style={styles.featuredCard} 
      onPress={onPress} 
      activeOpacity={0.92}
    >
      <View style={styles.featuredImageContainer}>
        <Image
          source={{ uri: image || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80' }}
          style={styles.featuredImg}
          contentFit="cover"
        />
        {/* Dark Gradient Overlay */}
        <View style={styles.gradientOverlay} />
        
        {/* Premium Badge */}
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>💎 מודעה מומלצת</Text>
        </View>

        {/* Favorite Heart Button */}
        <TouchableOpacity 
          style={styles.heartBtnOverlay} 
          onPress={onFavPress}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={isFav ? "heart" : "heart-outline"} 
            size={22} 
            color={isFav ? C.danger : "#ffffff"} 
          />
        </TouchableOpacity>

        {/* Description overlay at bottom of image */}
        <View style={styles.featuredTextOverlay}>
          <Text style={styles.featuredTitle}>{apartment.title}</Text>
          <Text style={styles.featuredSubtitle}>{apartment.city}, {street}</Text>
        </View>
      </View>

      {/* Meta Specs Row */}
      <View style={styles.featuredMetaRow}>
        <View style={styles.specsGroup}>
          <View style={styles.specItem}>
            <Ionicons name="resize-outline" size={14} color="#74777f" style={{ marginLeft: 4 }} />
            <Text style={styles.specText}>{apartment.sizeSqm || 120} מ״ר</Text>
          </View>
          <View style={styles.specItem}>
            <Ionicons name="water-outline" size={14} color="#74777f" style={{ marginLeft: 4 }} />
            <Text style={styles.specText}>2 אמבט</Text>
          </View>
          <View style={styles.specItem}>
            <Ionicons name="bed-outline" size={14} color="#74777f" style={{ marginLeft: 4 }} />
            <Text style={styles.specText}>{apartment.rooms} חדרים</Text>
          </View>
        </View>

        <View style={styles.featuredPriceBox}>
          <Text style={styles.featuredPriceText}>₪{apartment.price.toLocaleString()}</Text>
          <Text style={styles.featuredPricePeriod}>/חודש</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// BENTO 2: Regular Property Card (Stitch clean card style)
function RegularResultCard({ apartment, isFav, onFavPress, onPress }: { apartment: Apartment; isFav: boolean; onFavPress: () => void; onPress: () => void }) {
  const image = apartment.images?.[0]?.url;
  const street = apartment.street ?? apartment.neighborhood;
  
  return (
    <TouchableOpacity 
      style={styles.regularCard} 
      onPress={onPress} 
      activeOpacity={0.88}
    >
      <View style={styles.regularImageContainer}>
        <Image
          source={{ uri: image || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80' }}
          style={styles.regularImg}
          contentFit="cover"
        />

        {/* Favorite Heart Button */}
        <TouchableOpacity 
          style={styles.heartBtnOverlay} 
          onPress={onFavPress}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={isFav ? "heart" : "heart-outline"} 
            size={18} 
            color={isFav ? C.danger : "#ffffff"} 
          />
        </TouchableOpacity>

        {/* Price Bubble Tag overlay */}
        <View style={styles.priceTagOverlay}>
          <Text style={styles.priceTagText}>₪{apartment.price.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.regularContent}>
        <Text style={styles.regularTitle} numberOfLines={1}>{apartment.title}</Text>
        <Text style={styles.regularSubtitle} numberOfLines={1}>
          {apartment.city} {street ? `· ${street}` : ''}
        </Text>
        
        {/* Specs row */}
        <View style={styles.regularSpecsRow}>
          <Text style={styles.regularSpecText}>{apartment.sizeSqm || 55} מ״ר</Text>
          <Text style={styles.specsDivider}>·</Text>
          <Text style={styles.regularSpecText}>{apartment.rooms} חדרים</Text>
          {apartment.landlord?.isVerified && (
            <>
              <Text style={styles.specsDivider}>·</Text>
              <View style={styles.verifiedBadgeRow}>
                <Ionicons name="checkmark-circle" size={14} color={C.cyan} style={{ marginLeft: 3 }} />
                <Text style={styles.verifiedBadgeText}>משכיר מאומת</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  headerContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#c4c6cf',
  },
  searchPillContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#eff4ff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#c4c6cf',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  searchIconBtn: {
    padding: 6,
  },
  searchTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pillInput: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0b1c30',
    width: '100%',
    padding: 0,
    textAlign: 'right',
  },
  pillSubtext: {
    fontSize: 9,
    color: '#43474e',
    marginTop: 2,
  },
  clearSearchBtn: {
    padding: 4,
  },
  tuneBtn: {
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#c4c6cf',
    paddingRight: 10,
  },
  tuneBtnActive: {
    backgroundColor: '#d3e4fe',
    borderRadius: 8,
  },
  filterChipsRow: {
    flexDirection: 'row-reverse',
    marginTop: 10,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#eff4ff',
    borderWidth: 1,
    borderColor: '#c4c6cf',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  filterChipActive: {
    backgroundColor: '#005db6',
    borderColor: '#005db6',
  },
  filterChipText: {
    fontSize: 12,
    color: '#43474e',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },

  // Expanded Manual Filter Panel
  expandedFilterPanel: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#c4c6cf',
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#002045',
    textAlign: 'right',
    marginBottom: 8,
    marginTop: 10,
  },
  cityScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  cityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c4c6cf',
    marginLeft: 6,
  },
  cityChipActive: {
    backgroundColor: '#005db6',
    borderColor: '#005db6',
  },
  cityChipText: {
    color: '#43474e',
    fontSize: 12,
  },
  cityChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  roomsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 8,
  },
  roomBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c4c6cf',
    alignItems: 'center',
  },
  roomBtnActive: {
    backgroundColor: '#d3e4fe',
    borderColor: '#005db6',
  },
  roomBtnText: {
    color: '#43474e',
    fontSize: 12,
    fontWeight: '600',
  },
  roomBtnTextActive: {
    color: '#005db6',
  },
  priceInput: {
    backgroundColor: '#f8f9ff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#0b1c30',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#c4c6cf',
    marginTop: 4,
  },
  filterActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5eeff',
  },
  applyFiltersBtn: {
    backgroundColor: '#005db6',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  applyFiltersText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  clearFiltersBtn: {
    padding: 8,
  },
  clearFiltersText: {
    color: C.danger,
    fontSize: 12,
    fontWeight: '600',
  },

  // Search History Panel
  historyPanel: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c4c6cf',
    zIndex: 99,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eff4ff',
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
    color: '#0b1c30',
  },

  // View Switcher Pill
  viewToggleWrapper: {
    alignItems: 'center',
    marginVertical: 14,
  },
  viewTogglePill: {
    flexDirection: 'row',
    padding: 3,
    backgroundColor: '#e5eeff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#c4c6cf',
  },
  toggleBtnActive: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#002045',
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleTextActive: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  toggleBtnInactive: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  toggleTextInactive: {
    color: '#43474e',
    fontSize: 12,
    fontWeight: '600',
  },

  // AI Parsed Section
  parsedSection: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  parsedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#43474e',
    textAlign: 'right',
    marginBottom: 6,
  },
  parsedEmpty: {
    fontSize: 11,
    color: '#74777f',
    textAlign: 'right',
  },
  parsedRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
  },
  parsedChip: {
    backgroundColor: '#d3e4fe',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#86a0cd',
  },
  parsedChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00376f',
  },

  // Suggestions
  suggestions: {
    padding: 16,
    gap: 8,
  },
  suggestionsLabel: {
    color: '#74777f',
    fontSize: 12,
    textAlign: 'right',
  },
  suggestionChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#c4c6cf',
  },
  suggestionText: {
    color: '#0b1c30',
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },

  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  errorText: {
    color: '#74777f',
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#005db6',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Results list
  resultsList: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c4c6cf',
    overflow: 'hidden',
  },

  // BENTO 1: Featured Card
  featuredCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c4c6cf',
    overflow: 'hidden',
    shadowColor: '#002045',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  featuredImageContainer: {
    height: 220,
    position: 'relative',
  },
  featuredImg: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0, 32, 69, 0.65)',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#005db6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featuredBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  heartBtnOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredTextOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 16,
  },
  featuredTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  featuredSubtitle: {
    color: '#eff4ff',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
  featuredMetaRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  specsGroup: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  specItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  specText: {
    fontSize: 12,
    color: '#43474e',
    fontWeight: '600',
  },
  featuredPriceBox: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
  },
  featuredPriceText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#002045',
  },
  featuredPricePeriod: {
    fontSize: 11,
    color: '#74777f',
  },

  // BENTO 2: Regular Card
  regularCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c4c6cf',
    overflow: 'hidden',
    shadowColor: '#002045',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  regularImageContainer: {
    height: 140,
    position: 'relative',
  },
  regularImg: {
    width: '100%',
    height: '100%',
  },
  priceTagOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    backgroundColor: '#002045',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priceTagText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  regularContent: {
    padding: 12,
  },
  regularTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#002045',
    textAlign: 'right',
  },
  regularSubtitle: {
    fontSize: 11,
    color: '#74777f',
    textAlign: 'right',
    marginTop: 2,
  },
  regularSpecsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f2f6',
  },
  regularSpecText: {
    fontSize: 11,
    color: '#43474e',
    fontWeight: '500',
  },
  specsDivider: {
    color: '#c4c6cf',
    marginHorizontal: 6,
  },
  verifiedBadgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#007165',
  },

  noResults: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  noResultsEmoji: {
    fontSize: 48,
  },
  noResultsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#002045',
  },
  noResultsSub: {
    fontSize: 12,
    color: '#74777f',
  },
});
