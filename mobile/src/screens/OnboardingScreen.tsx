import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { recommendationsApi } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import type { MainStackParamList } from '../types';
import { C, Dark } from '../theme';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';

const CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה',
  'נתניה', 'באר שבע', 'בני ברק', 'רמת גן', 'הרצליה'];

const STEPS = ['ברוכים הבאים', 'תקציב', 'ערים', 'שמירה'];

type Props = NativeStackScreenProps<MainStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const { user, completeOnboarding } = useAuthStore();
  const [step, setStep] = useState(0);
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [cities, setCities] = useState<string[]>([]);

  const saveMutation = useMutation({
    mutationFn: () =>
      recommendationsApi.savePreferences({
        budget: { min: minBudget ? parseInt(minBudget) : 0, max: maxBudget ? parseInt(maxBudget) : 99999 },
        cities,
        rooms: { min: 1, max: 10 },
        requiredAmenities: [],
        petsAllowed: false,
      }),
    onSuccess: async () => {
      await completeOnboarding();
      navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
    },
  });

  async function skip() {
    await completeOnboarding();
    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          {step === 0 && <WelcomeStep name={user?.firstName ?? ''} onNext={() => setStep(1)} onSkip={skip} />}
          {step === 1 && (
            <BudgetStep
              minBudget={minBudget} setMinBudget={setMinBudget}
              maxBudget={maxBudget} setMaxBudget={setMaxBudget}
              onNext={() => setStep(2)} onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <CitiesStep
              cities={cities} setCities={setCities}
              onNext={() => setStep(3)} onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <FinishStep
              loading={saveMutation.isPending}
              onSave={() => saveMutation.mutate()}
              onBack={() => setStep(2)}
            />
          )}
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

function WelcomeStep({ name, onNext, onSkip }: { name: string; onNext: () => void; onSkip: () => void }) {
  return (
    <View style={styles.step}>
      <Text style={styles.emoji}>🏠</Text>
      <Text style={[styles.heading, dirType.title, { color: C.onInverse.primary }]}>ברוכ/ה הבא/ה{name ? `, ${name}` : ''}!</Text>
      <Text style={[styles.body, dirType.body, { color: C.textMut }]}>
        DirApp מוצא לך דירות שמתאימות בדיוק למה שאתה/את מחפש/ת.{'\n\n'}
        בשלב הבא נגדיר העדפות בסיסיות כדי שנוכל להראות לך את הדירות הכי רלוונטיות.
      </Text>
      <View style={styles.featureList}>
        {['החלק ימינה לאהוב, שמאלה לדלג', 'Super-like לדירות שממש אהבת', 'AI מתאים לך לפי ההעדפות שלך'].map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color={C.cyan} />
            <Text style={[styles.featureText, dirType.body]}>{f}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.primaryBtn} onPress={onNext}>
        <Text style={styles.primaryBtnText}>בואו נתחיל ←</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSkip}>
        <Text style={styles.skipText}>דלג על ההגדרות</Text>
      </TouchableOpacity>
    </View>
  );
}

function BudgetStep({ minBudget, setMinBudget, maxBudget, setMaxBudget, onNext, onBack }: any) {
  const { TextInput } = require('react-native');
  return (
    <View style={styles.step}>
      <Text style={styles.emoji}>💰</Text>
      <Text style={[styles.heading, dirType.title, { color: C.onInverse.primary }]}>מה התקציב שלך?</Text>
      <Text style={[styles.body, dirType.body, { color: C.textMut }]}>הזן תקציב חודשי לשכירות. אפשר לשנות מאוחר יותר.</Text>
      <View style={styles.row}>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.fieldLabel, dirType.label, { color: C.textMut }]}>מינימום ₪</Text>
          <TextInput style={styles.input} value={minBudget} onChangeText={setMinBudget}
            keyboardType="numeric" placeholder="3000" placeholderTextColor={C.textMut} textAlign="right" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.fieldLabel, dirType.label, { color: C.textMut }]}>מקסימום ₪</Text>
          <TextInput style={styles.input} value={maxBudget} onChangeText={setMaxBudget}
            keyboardType="numeric" placeholder="8000" placeholderTextColor={C.textMut} textAlign="right" />
        </View>
      </View>
      <NavButtons onNext={onNext} onBack={onBack} />
    </View>
  );
}

function CitiesStep({ cities, setCities, onNext, onBack }: any) {
  function toggle(c: string) {
    setCities((prev: string[]) => prev.includes(c) ? prev.filter((x: string) => x !== c) : [...prev, c]);
  }
  return (
    <View style={styles.step}>
      <Text style={styles.emoji}>📍</Text>
      <Text style={[styles.heading, dirType.title, { color: C.onInverse.primary }]}>אילו ערים מעניינות אותך?</Text>
      <Text style={[styles.body, dirType.body, { color: C.textMut }]}>בחר אחת או יותר. ריק = כל הארץ.</Text>
      <View style={styles.chipGrid}>
        {CITIES.map((city) => (
          <TouchableOpacity
            key={city}
            style={[styles.chip, cities.includes(city) && styles.chipActive]}
            onPress={() => toggle(city)}
          >
            <Text style={[styles.chipText, dirType.label, cities.includes(city) && styles.chipTextActive]}>{city}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <NavButtons onNext={onNext} onBack={onBack} />
    </View>
  );
}

function FinishStep({ loading, onSave, onBack }: { loading: boolean; onSave: () => void; onBack: () => void }) {
  return (
    <View style={styles.step}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={[styles.heading, dirType.title, { color: C.onInverse.primary }]}>הכל מוכן!</Text>
      <Text style={[styles.body, dirType.body, { color: C.textMut }]}>לחץ "שמור והתחל" כדי להתחיל לגלוש בדירות שמתאימות לך.</Text>
      <TouchableOpacity
        style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
        onPress={onSave} disabled={loading}
      >
        {loading
          ? <ActivityIndicator color={C.onInverse.primary} />
          : <Text style={styles.primaryBtnText}>שמור והתחל 🚀</Text>
        }
      </TouchableOpacity>
      <TouchableOpacity style={styles.backBtnWrap} onPress={onBack}>
        <Ionicons name="arrow-back" size={16} color={C.textMut} />
        <Text style={styles.skipText}>חזור</Text>
      </TouchableOpacity>
    </View>
  );
}

function NavButtons({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <View style={styles.navRow}>
      <TouchableOpacity style={styles.backBtnWrap} onPress={onBack}>
        <Ionicons name="arrow-back" size={16} color={C.textMut} />
        <Text style={styles.skipText}>חזור</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.primaryBtn} onPress={onNext}>
        <Text style={styles.primaryBtnText}>הבא ←</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Dark.bg },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.navyMidAlpha(0.5) },
  dotActive: { backgroundColor: C.cyan, width: 20 },
  scroll: { padding: 24, paddingBottom: 40 },
  step: { alignItems: 'center', gap: 16 },
  emoji: { fontSize: 64, marginBottom: 4 },
  heading: { fontSize: 24, fontWeight: '800', color: C.onInverse.primary, textAlign: 'center' },
  body: { fontSize: 14, color: C.textMut, textAlign: 'center', lineHeight: 22 },
  featureList: { width: '100%', gap: 10, marginTop: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'flex-end' },
  featureText: { color: C.onInverse.secondary, fontSize: 14 },
  primaryBtn: {
    backgroundColor: C.cyan, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center', width: '100%', marginTop: 8,
  },
  primaryBtnText: { color: C.navy, fontWeight: '800', fontSize: 16 },
  skipText: { color: C.textMut, fontSize: 13 },
  backBtnWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  row: { flexDirection: 'row', width: '100%' },
  fieldLabel: { color: C.textMut, fontSize: 12, fontWeight: '600', textAlign: 'right', marginBottom: 6 },
  input: {
    backgroundColor: Dark.surface, borderRadius: 12, padding: 14,
    fontSize: 14, color: C.onInverse.primary, borderWidth: 1, borderColor: Dark.border,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Dark.surface, borderWidth: 1, borderColor: Dark.border,
  },
  chipActive: { backgroundColor: C.cyanAlpha(0.2), borderColor: C.cyan },
  chipText: { color: C.textMut, fontSize: 13 },
  chipTextActive: { color: C.cyan, fontWeight: '600' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 8 },
});
