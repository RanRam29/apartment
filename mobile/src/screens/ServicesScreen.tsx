import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  SafeAreaView, ActivityIndicator, Alert, Modal, TextInput,
  ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { C, Dark } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'movers' | 'cleaning' | 'painting' | 'plumbing' | 'electricity' | 'carpentry' | 'other';
type PriceType = 'hourly' | 'fixed' | 'quote';

interface ServiceListing {
  _id: string;
  providerId: string;
  providerName?: string;
  category: Category;
  title: string;
  description?: string;
  priceType: PriceType;
  price?: number | null;
  cities?: string[];
  phone?: string;
  isActive: boolean;
  rating?: number | null;
  reviewCount: number;
}

interface ServiceReview {
  _id: string;
  reviewerId: string;
  reviewerName?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { key: Category | 'all'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all',         label: 'כל הקטגוריות', icon: 'grid-outline'          },
  { key: 'movers',      label: 'הובלות',        icon: 'car-outline'           },
  { key: 'cleaning',    label: 'ניקיון',         icon: 'sparkles-outline'      },
  { key: 'painting',    label: 'צביעה',          icon: 'color-palette-outline' },
  { key: 'plumbing',    label: 'אינסטלציה',      icon: 'water-outline'         },
  { key: 'electricity', label: 'חשמל',           icon: 'flash-outline'         },
  { key: 'carpentry',   label: 'נגרות',           icon: 'hammer-outline'        },
  { key: 'other',       label: 'אחר',            icon: 'construct-outline'     },
];

const CATEGORY_LABELS: Record<Category, string> = {
  movers: 'הובלות', cleaning: 'ניקיון', painting: 'צביעה',
  plumbing: 'אינסטלציה', electricity: 'חשמל', carpentry: 'נגרות', other: 'אחר',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(service: ServiceListing): string {
  if (service.priceType === 'quote') return 'לפי הצעה';
  if (service.price == null) return 'לפי הצעה';
  const suffix = service.priceType === 'hourly' ? '₪/שעה' : '₪';
  return `${service.price.toLocaleString()} ${suffix}`;
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={C.statusTone.caution}
        />
      ))}
    </View>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({
  visible, onClose, onSubmit, submitting,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
  submitting: boolean;
}) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');

  function submit() {
    onSubmit(stars, comment.trim());
    setComment('');
    setStars(5);
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.reviewBox}>
          <Text style={styles.reviewTitle}>כתוב ביקורת</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity key={s} onPress={() => setStars(s)}>
                <Ionicons
                  name={s <= stars ? 'star' : 'star-outline'}
                  size={32}
                  color={C.statusTone.caution}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.reviewInput}
            placeholder="תגובה (אופציונלי)"
            placeholderTextColor={C.field.placeholder}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            textAlign="right"
          />
          <View style={styles.reviewActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={submit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color={C.onInverse.primary} />
                : <Text style={styles.submitBtnText}>שלח</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  service, reviews, onClose, onReview, isOwner, onDelete,
}: {
  service: ServiceListing | null;
  reviews: ServiceReview[];
  onClose: () => void;
  onReview: () => void;
  isOwner: boolean;
  onDelete: () => void;
}) {
  if (!service) return null;

  const catInfo = CATEGORIES.find((c) => c.key === service.category);

  return (
    <Modal visible={!!service} transparent animationType="slide">
      <View style={styles.overlay}>
        <SafeAreaView style={styles.detailBox}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle} numberOfLines={1}>{service.title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={C.onInverse.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.detailScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Category chip */}
            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <Ionicons name={catInfo?.icon ?? 'construct-outline'} size={12} color={C.cyan} />
                <Text style={styles.chipText}>{CATEGORY_LABELS[service.category]}</Text>
              </View>
              {service.rating != null && (
                <View style={styles.ratingRow}>
                  <StarRow rating={service.rating} />
                  <Text style={styles.ratingText}>{service.rating.toFixed(1)} ({service.reviewCount})</Text>
                </View>
              )}
            </View>

            {/* Provider */}
            <Text style={styles.providerName}>{service.providerName ?? 'ספק'}</Text>

            {/* Price */}
            <Text style={styles.priceDetail}>{formatPrice(service)}</Text>

            {/* Cities */}
            {service.cities && service.cities.length > 0 && (
              <View style={styles.citiesRow}>
                <Ionicons name="location-outline" size={14} color={C.textMut} />
                <Text style={styles.citiesText}>{service.cities.join(', ')}</Text>
              </View>
            )}

            {/* Description */}
            {service.description ? (
              <>
                <Text style={styles.sectionTitle}>תיאור</Text>
                <Text style={styles.descText}>{service.description}</Text>
              </>
            ) : null}

            {/* Phone */}
            {service.phone ? (
              <TouchableOpacity
                style={styles.phoneBtn}
                onPress={() => Linking.openURL(`tel:${service.phone}`)}
              >
                <Ionicons name="call-outline" size={18} color={C.cyan} />
                <Text style={styles.phoneBtnText}>{service.phone}</Text>
              </TouchableOpacity>
            ) : null}

            {isOwner ? (
              <TouchableOpacity style={styles.deleteListingBtn} onPress={onDelete}>
                <Ionicons name="trash-outline" size={18} color={C.statusTone.negativeSoft} />
                <Text style={styles.deleteListingText}>מחק את המודעה שלי</Text>
              </TouchableOpacity>
            ) : null}

            {/* Reviews */}
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>ביקורות</Text>
              <TouchableOpacity style={styles.writeReviewBtn} onPress={onReview}>
                <Ionicons name="create-outline" size={14} color={C.cyan} />
                <Text style={styles.writeReviewText}>כתוב ביקורת</Text>
              </TouchableOpacity>
            </View>

            {reviews.length === 0 ? (
              <Text style={styles.noReviews}>אין ביקורות עדיין</Text>
            ) : (
              reviews.map((r) => (
                <View key={r._id} style={styles.reviewCard}>
                  <View style={styles.reviewCardTop}>
                    <Text style={styles.reviewerName}>{r.reviewerName ?? 'משתמש'}</Text>
                    <StarRow rating={r.rating} size={12} />
                  </View>
                  {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({
  visible, onClose, onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: object) => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [priceType, setPriceType] = useState<PriceType>('fixed');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [cities, setCities] = useState('');
  const [phone, setPhone] = useState('');

  function submit() {
    if (!title.trim()) {
      Alert.alert('שגיאה', 'יש להזין כותרת');
      return;
    }
    onCreate({
      title: title.trim(),
      category,
      priceType,
      price: priceType !== 'quote' && price ? parseFloat(price) : null,
      description: description.trim() || undefined,
      cities: cities.split(',').map((c) => c.trim()).filter(Boolean),
      phone: phone.trim() || undefined,
    });
    setTitle(''); setPrice(''); setDescription(''); setCities(''); setPhone('');
  }

  const CAT_OPTIONS = CATEGORIES.filter((c) => c.key !== 'all') as { key: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[];
  const PRICE_OPTIONS: { key: PriceType; label: string }[] = [
    { key: 'fixed', label: 'מחיר קבוע' },
    { key: 'hourly', label: 'לפי שעה' },
    { key: 'quote', label: 'לפי הצעה' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.createBox}>
          <Text style={styles.createTitle}>הוסף שירות חדש</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>כותרת *</Text>
            <TextInput style={styles.fieldInput} value={title} onChangeText={setTitle}
              placeholderTextColor={C.field.placeholder} placeholder="למשל: הובלות אמינות בתל אביב" textAlign="right" />

            <Text style={styles.fieldLabel}>קטגוריה</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {CAT_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.selectChip, category === c.key && styles.selectChipActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text style={[styles.selectChipText, category === c.key && styles.selectChipTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>סוג מחיר</Text>
            <View style={styles.priceTypeRow}>
              {PRICE_OPTIONS.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.priceChip, priceType === p.key && styles.priceChipActive]}
                  onPress={() => setPriceType(p.key)}
                >
                  <Text style={[styles.priceChipText, priceType === p.key && styles.priceChipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {priceType !== 'quote' && (
              <>
                <Text style={styles.fieldLabel}>מחיר (₪)</Text>
                <TextInput style={styles.fieldInput} value={price} onChangeText={setPrice}
                  keyboardType="numeric" placeholderTextColor={C.field.placeholder} placeholder="0" textAlign="right" />
              </>
            )}

            <Text style={styles.fieldLabel}>תיאור</Text>
            <TextInput style={[styles.fieldInput, { height: 72 }]} value={description} onChangeText={setDescription}
              multiline placeholderTextColor={C.field.placeholder} placeholder="תיאור השירות" textAlign="right" />

            <Text style={styles.fieldLabel}>ערים (מופרד בפסיקים)</Text>
            <TextInput style={styles.fieldInput} value={cities} onChangeText={setCities}
              placeholderTextColor={C.field.placeholder} placeholder="תל אביב, חיפה, ירושלים" textAlign="right" />

            <Text style={styles.fieldLabel}>טלפון</Text>
            <TextInput style={styles.fieldInput} value={phone} onChangeText={setPhone}
              keyboardType="phone-pad" placeholderTextColor={C.field.placeholder} placeholder="05X-XXXXXXX" textAlign="right" />
          </ScrollView>

          <View style={styles.createActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createBtn} onPress={submit}>
              <Text style={styles.createBtnText}>צור שירות</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Service Card ─────────────────────────────────────────────────────────────

function ServiceCard({ service, onPress }: { service: ServiceListing; onPress: () => void }) {
  const catInfo = CATEGORIES.find((c) => c.key === service.category);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle} numberOfLines={1}>{service.title}</Text>
          <Text style={styles.cardProvider} numberOfLines={1}>{service.providerName ?? 'ספק'}</Text>
        </View>
        <View style={styles.cardChip}>
          <Ionicons name={catInfo?.icon ?? 'construct-outline'} size={11} color={C.cyan} />
          <Text style={styles.cardChipText}>{CATEGORY_LABELS[service.category]}</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.cardPrice}>{formatPrice(service)}</Text>
        {service.cities && service.cities.length > 0 && (
          <View style={styles.cardCities}>
            <Ionicons name="location-outline" size={11} color={C.textMut} />
            <Text style={styles.cardCitiesText} numberOfLines={1}>{service.cities.join(', ')}</Text>
          </View>
        )}
        {service.rating != null && (
          <View style={styles.cardRating}>
            <StarRow rating={service.rating} size={11} />
            <Text style={styles.cardRatingText}>{service.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ServicesScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [selected, setSelected]             = useState<ServiceListing | null>(null);
  const [selectedReviews, setSelectedReviews] = useState<ServiceReview[]>([]);
  const [reviewVisible, setReviewVisible]   = useState(false);
  const [createVisible, setCreateVisible]   = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['services', activeCategory],
    queryFn: () =>
      servicesApi.list({ category: activeCategory === 'all' ? undefined : activeCategory })
        .then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => servicesApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setCreateVisible(false);
    },
    onError: (e: any) => Alert.alert('שגיאה', e.response?.data?.error || 'לא ניתן ליצור שירות'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => servicesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setSelected(null);
      setSelectedReviews([]);
    },
    onError: (e: any) =>
      Alert.alert('שגיאה', e.response?.data?.error || 'לא ניתן למחוק את המודעה'),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, rating, comment }: { id: string; rating: number; comment: string }) =>
      servicesApi.review(id, rating, comment),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      // Update selected service rating locally
      if (selected) {
        setSelected((prev) => prev
          ? { ...prev, rating: res.data.rating, reviewCount: res.data.reviewCount }
          : prev
        );
      }
      setReviewVisible(false);
    },
    onError: (e: any) => Alert.alert('שגיאה', e.response?.data?.error || 'לא ניתן לשלוח ביקורת'),
  });

  async function openDetail(service: ServiceListing) {
    setSelected(service);
    try {
      const res = await servicesApi.getById(service._id);
      setSelected(res.data.service);
      setSelectedReviews(res.data.reviews ?? []);
    } catch {
      setSelectedReviews([]);
    }
  }

  function confirmDeleteService(svc: ServiceListing) {
    Alert.alert(
      'מחיקת מודעה',
      `למחוק לצמיתות את "${svc.title}"?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(svc._id),
        },
      ]
    );
  }

  const services: ServiceListing[] = data?.services ?? [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.onInverse.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dirType.subhead]}>שירותים לדירה</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersBar}
        contentContainerStyle={styles.filtersContent}
      >
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[styles.filterChip, activeCategory === c.key && styles.filterChipActive]}
            onPress={() => setActiveCategory(c.key)}
          >
            <Ionicons
              name={c.icon}
              size={13}
              color={activeCategory === c.key ? C.onInverse.primary : C.textMut}
            />
            <Text style={[styles.filterChipText, activeCategory === c.key && styles.filterChipTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ResponsiveContainer style={{ flex: 1 }}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.cyan} />
          </View>
        ) : services.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="construct-outline" size={48} color={C.textMut} />
            <Text style={[styles.emptyTitle, dirType.subhead]}>אין שירותים בקטגוריה זו</Text>
            <Text style={[styles.emptyHint, dirType.caption]}>לחץ + כדי להוסיף שירות חדש</Text>
          </View>
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={services}
            keyExtractor={(s) => s._id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ServiceCard service={item} onPress={() => openDetail(item)} />
            )}
          />
        )}
      </ResponsiveContainer>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setCreateVisible(true)}>
        <Ionicons name="add" size={28} color={C.onInverse.primary} />
      </TouchableOpacity>

      {/* Detail modal */}
      <DetailModal
        service={selected}
        reviews={selectedReviews}
        onClose={() => { setSelected(null); setSelectedReviews([]); }}
        onReview={() => setReviewVisible(true)}
        isOwner={!!userId && !!selected && String(selected.providerId) === String(userId)}
        onDelete={() => {
          if (selected) confirmDeleteService(selected);
        }}
      />

      {/* Review modal */}
      <ReviewModal
        visible={reviewVisible}
        onClose={() => setReviewVisible(false)}
        submitting={reviewMutation.isPending}
        onSubmit={(rating, comment) => {
          if (!selected) return;
          reviewMutation.mutate({ id: selected._id, rating, comment });
        }}
      />

      {/* Create modal */}
      <CreateModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreate={(body) => createMutation.mutate(body)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Dark.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Dark.surface, borderBottomWidth: 1, borderBottomColor: Dark.border,
  },
  backBtn:     { padding: 4 },
  headerTitle: { color: dirApp.primary, fontSize: 17, fontWeight: '700' },

  filtersBar:     { maxHeight: 54, backgroundColor: Dark.surface },
  filtersContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Dark.surface, borderWidth: 1, borderColor: Dark.borderStrong,
  },
  filterChipActive:     { backgroundColor: C.cyan, borderColor: C.cyan },
  filterChipText:       { color: C.textMut, fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: C.onInverse.primary },

  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { color: C.onInverse.primary, fontSize: 16, fontWeight: '700' },
  emptyHint:  { color: C.textMut, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },

  list: { padding: 16, gap: 12, paddingBottom: 100 },

  card: { backgroundColor: Dark.surface, borderRadius: 14, padding: 16, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1, gap: 3 },
  cardTitle:    { color: C.onInverse.primary, fontSize: 15, fontWeight: '700' },
  cardProvider: { color: C.textMut, fontSize: 12 },
  cardChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.cyanAlpha(0.15), paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, borderColor: C.cyanAlpha(0.3),
  },
  cardChipText: { color: C.cyan, fontSize: 11, fontWeight: '600' },

  cardBottom:      { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  cardPrice:       { color: C.cyan, fontSize: 14, fontWeight: '800' },
  cardCities:      { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  cardCitiesText:  { color: C.textMut, fontSize: 11 },
  cardRating:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardRatingText:  { color: C.statusTone.caution, fontSize: 11, fontWeight: '700' },

  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.cyan, justifyContent: 'center', alignItems: 'center',
    shadowColor: C.cyan, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },

  // Detail modal
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  detailBox: { backgroundColor: Dark.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' },
  detailHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: Dark.border,
  },
  detailTitle:  { color: C.onInverse.primary, fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'right', marginRight: 12 },
  detailScroll: { padding: 20, gap: 8, paddingBottom: 40 },

  chipRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.cyanAlpha(0.15), paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1, borderColor: C.cyanAlpha(0.3),
  },
  chipText:   { color: C.cyan, fontSize: 12, fontWeight: '600' },
  ratingRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText: { color: C.statusTone.caution, fontSize: 12, fontWeight: '700' },

  providerName: { color: C.onInverse.primary, fontSize: 16, fontWeight: '700', textAlign: 'right' },
  priceDetail:  { color: C.cyan, fontSize: 22, fontWeight: '800', textAlign: 'right' },
  citiesRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  citiesText:   { color: C.textMut, fontSize: 13 },

  sectionTitle: { color: C.textMut, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 4, textAlign: 'right' },
  descText:     { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 22, textAlign: 'right' },

  phoneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.cyanAlpha(0.12), borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16, marginTop: 8,
    borderWidth: 1, borderColor: C.cyanAlpha(0.3),
  },
  phoneBtnText: { color: C.cyan, fontWeight: '700', fontSize: 15 },

  deleteListingBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 14, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255, 118, 117, 0.45)', backgroundColor: 'rgba(255, 118, 117, 0.08)',
  },
  deleteListingText: { color: C.statusTone.negativeSoft, fontWeight: '700', fontSize: 14 },

  reviewsHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  writeReviewBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  writeReviewText: { color: C.cyan, fontSize: 12, fontWeight: '600' },
  noReviews:       { color: C.textMut, fontSize: 13, textAlign: 'center', paddingVertical: 12 },

  reviewCard: { backgroundColor: Dark.surface, borderRadius: 12, padding: 12, gap: 4, marginTop: 6 },
  reviewCardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewerName:    { color: C.onInverse.primary, fontSize: 13, fontWeight: '600' },
  reviewComment:   { color: C.textMut, fontSize: 13, textAlign: 'right' },

  // Review modal
  reviewBox: {
    backgroundColor: Dark.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 14,
  },
  reviewTitle: { color: C.onInverse.primary, fontSize: 18, fontWeight: '800', textAlign: 'right' },
  starsRow:    { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  reviewInput: {
    backgroundColor: Dark.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, color: C.onInverse.primary, fontSize: 14,
    minHeight: 72,
  },
  reviewActions: { flexDirection: 'row', gap: 12 },
  cancelBtn:     { flex: 1, padding: 13, borderRadius: 12, backgroundColor: Dark.surface, alignItems: 'center' },
  cancelBtnText: { color: C.textMut, fontWeight: '700' },
  submitBtn:     { flex: 2, padding: 13, borderRadius: 12, backgroundColor: C.cyan, alignItems: 'center' },
  submitBtnText: { color: C.onInverse.primary, fontWeight: '800', fontSize: 15 },

  // Create modal
  createBox: {
    backgroundColor: Dark.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%', gap: 10,
  },
  createTitle: { color: C.onInverse.primary, fontSize: 18, fontWeight: '800', textAlign: 'right', marginBottom: 4 },
  fieldLabel:  { color: C.textMut, fontSize: 11, marginBottom: 4, textAlign: 'right' },
  fieldInput:  {
    backgroundColor: Dark.surface, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: C.onInverse.primary, fontSize: 14, marginBottom: 10,
  },
  selectChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18,
    backgroundColor: Dark.surface, borderWidth: 1, borderColor: Dark.borderStrong, marginRight: 6,
  },
  selectChipActive:     { backgroundColor: C.cyan, borderColor: C.cyan },
  selectChipText:       { color: C.textMut, fontSize: 12 },
  selectChipTextActive: { color: C.onInverse.primary, fontWeight: '700' },
  priceTypeRow:      { flexDirection: 'row', gap: 8, marginBottom: 10 },
  priceChip: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    backgroundColor: Dark.surface, borderWidth: 1, borderColor: Dark.borderStrong,
  },
  priceChipActive:     { backgroundColor: C.cyan, borderColor: C.cyan },
  priceChipText:       { color: C.textMut, fontSize: 12 },
  priceChipTextActive: { color: C.onInverse.primary, fontWeight: '700' },
  createActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  createBtn:     { flex: 2, padding: 14, borderRadius: 12, backgroundColor: C.cyan, alignItems: 'center' },
  createBtnText: { color: C.onInverse.primary, fontWeight: '800', fontSize: 15 },
});
