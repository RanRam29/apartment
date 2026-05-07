import React, { useState } from 'react';
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

export default function CreateListingScreen({ navigation }: any) {
  const queryClient = useQueryClient();

  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice]             = useState('');
  const [rooms, setRooms]             = useState('');
  const [city, setCity]               = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [floor, setFloor]             = useState('');
  const [sizeSqm, setSizeSqm]         = useState('');
  const [amenities, setAmenities]     = useState<Amenity[]>([]);
  const [images, setImages]           = useState<{ uri: string }[]>([]);
  const [loading, setLoading]         = useState(false);

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
    if (!title || !price || !rooms || !city) {
      showMessage('שגיאה', 'נא למלא: כותרת, מחיר, חדרות ועיר');
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('description', description);
      form.append('price', price);
      form.append('rooms', rooms);
      form.append('city', city);
      form.append('neighborhood', neighborhood);
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.header}>פרסם מודעה חדשה</Text>

          <Field label="כותרת *">
            <TextInput style={styles.input} value={title} onChangeText={setTitle}
              placeholder="לדוג׳: דירת 3 חדרות מרוהטת בלב תל אביב" placeholderTextColor="#A0A0B2" textAlign="right" />
          </Field>

          <View style={styles.row}>
            <Field label="מחיר ₪ *" style={{ flex: 1, marginLeft: 8 }}>
              <TextInput style={styles.input} value={price} onChangeText={setPrice}
                keyboardType="numeric" placeholder="6500" placeholderTextColor="#A0A0B2" textAlign="right" />
            </Field>
            <Field label="חדרות *" style={{ flex: 1 }}>
              <TextInput style={styles.input} value={rooms} onChangeText={setRooms}
                keyboardType="decimal-pad" placeholder="3" placeholderTextColor="#A0A0B2" textAlign="right" />
            </Field>
          </View>

          <View style={styles.row}>
            <Field label="עיר *" style={{ flex: 1, marginLeft: 8 }}>
              <TextInput style={styles.input} value={city} onChangeText={setCity}
                placeholder="תל אביב" placeholderTextColor="#A0A0B2" textAlign="right" />
            </Field>
            <Field label="שכונה" style={{ flex: 1 }}>
              <TextInput style={styles.input} value={neighborhood} onChangeText={setNeighborhood}
                placeholder="פלורנטין" placeholderTextColor="#A0A0B2" textAlign="right" />
            </Field>
          </View>

          <View style={styles.row}>
            <Field label="קומה" style={{ flex: 1, marginLeft: 8 }}>
              <TextInput style={styles.input} value={floor} onChangeText={setFloor}
                keyboardType="numeric" placeholder="3" placeholderTextColor="#A0A0B2" textAlign="right" />
            </Field>
            <Field label='גודל מ"ר' style={{ flex: 1 }}>
              <TextInput style={styles.input} value={sizeSqm} onChangeText={setSizeSqm}
                keyboardType="numeric" placeholder="75" placeholderTextColor="#A0A0B2" textAlign="right" />
            </Field>
          </View>

          <Field label="תיאור">
            <TextInput style={[styles.input, styles.textarea]} value={description}
              onChangeText={setDescription} multiline numberOfLines={4}
              placeholder="תאר את הדירה..." placeholderTextColor="#A0A0B2" textAlign="right" />
          </Field>

          {/* Amenities */}
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

          {/* Images */}
          <Text style={styles.fieldLabel}>תמונות ({images.length}/10)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
            <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
              <Ionicons name="camera-outline" size={28} color="#6C5CE7" />
              <Text style={styles.addImageText}>הוסף</Text>
            </TouchableOpacity>
            {images.map((img, i) => (
              <View key={i} style={styles.imageThumb}>
                <Image source={img} style={styles.imageThumbImg} contentFit="cover" />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Ionicons name="close-circle" size={18} color="#FF4757" />
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
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>פרסם מודעה 🏠</Text>
            }
          </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'right', marginBottom: 20 },
  row: { flexDirection: 'row', marginBottom: 0 },
  fieldLabel: { color: '#A0A0B2', fontSize: 12, fontWeight: '600', textAlign: 'right', marginBottom: 6 },
  input: {
    backgroundColor: '#2A2A3E', borderRadius: 12, padding: 14,
    fontSize: 14, color: '#fff', borderWidth: 1, borderColor: '#3A3A5E',
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  amenityChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#2A2A3E', borderWidth: 1, borderColor: '#3A3A5E',
  },
  amenityChipActive: { backgroundColor: 'rgba(108,92,231,0.2)', borderColor: '#6C5CE7' },
  amenityText: { color: '#A0A0B2', fontSize: 13 },
  amenityTextActive: { color: '#6C5CE7', fontWeight: '600' },
  imagesRow: { marginBottom: 24 },
  addImageBtn: {
    width: 80, height: 80, borderRadius: 12, borderWidth: 2,
    borderColor: '#6C5CE7', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8, backgroundColor: 'rgba(108,92,231,0.08)',
  },
  addImageText: { color: '#6C5CE7', fontSize: 11, marginTop: 2 },
  imageThumb: { width: 80, height: 80, borderRadius: 12, marginRight: 8, position: 'relative' },
  imageThumbImg: { width: 80, height: 80, borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: -6, right: -6 },
  submitBtn: {
    backgroundColor: '#6C5CE7', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
