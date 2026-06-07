import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Image, Dimensions, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { recommendationsApi } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import type { MainStackParamList } from '../types';
import { C } from '../theme';
import { fontFamily } from '../theme/fonts';
import { useColors } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה',
  'נתניה', 'באר שבע', 'בני ברק', 'רמת גן', 'הרצליה'];

const colorsV3 = {
  primary: '#00091b',
  primaryContainer: '#002045',
  onPrimaryContainer: '#7089b3',
  secondary: '#006b5f',
  secondaryContainer: '#9cefdf',
  onSecondaryContainer: '#0b6f63',
  background: '#f8f9ff',
  surface: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f3f9',
  surfaceContainer: '#eceef3',
  onSurface: '#191c20',
  onSurfaceVariant: '#44474e',
  outline: '#74777f',
  outlineVariant: '#c4c6cf',
  actionCta: '#00cba9',
  error: '#ba1a1a',
};

type Props = NativeStackScreenProps<MainStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const { user, completeOnboarding } = useAuthStore();
  const colors = useColors();

  // State to track if we are in the intro slides or in preference forms
  const [mode, setMode] = useState<'intro' | 'preferences'>('intro');
  const [introStep, setIntroStep] = useState(0); // 0, 1, 2 for the three slides

  // Preferences form state
  const [prefStep, setPrefStep] = useState(0); // 0: budget, 1: cities, 2: finish
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  const saveMutation = useMutation({
    mutationFn: () =>
      recommendationsApi.savePreferences({
        budget: { min: minBudget ? parseInt(minBudget) : 0, max: maxBudget ? parseInt(maxBudget) : 99999 },
        cities: selectedCities,
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

  const handleIntroNext = () => {
    if (introStep < 2) {
      setIntroStep(introStep + 1);
    } else {
      setMode('preferences');
    }
  };

  const introSlides = [
    {
      title: 'החלק ימינה לדירת חלומותיך',
      desc: 'הדרך הקלה והבטוחה ביותר למצוא את הבית הבא שלכם, עם מערכת התאמה אישית מתקדמת.',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvgnGTEUtOtum-vZb_weic6s5LNnclcGgCdA7tb32SleNlOGBidHwVobc8A1XNUcCnGnZLIgZez8uNo71IZ8pGdnqAStFyeo0D9F1ZqzYosrUz0i8tMIT5_TdlemGMXxadNKp0IMD0YvAaGPBOjKQPI1GtuHZxNZVkOa0w5ueJWFJz3FlF3DL29ME3vlkIj4hcFhEmEBWYsLN7Xsq50EHN1BYML5N258Ibl-eMlttsqBZZ4-3gUAgrXG5ytIRzuHLuS6y4UtlqlS-Y',
      bgGlow: '#9cefdf',
    },
    {
      title: 'סינון חכם ומדויק',
      desc: 'אנחנו נדאג להציג לכם רק את מה שבאמת רלוונטי עבורכם, בלי בזבוז זמן מיותר.',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzClsM6w7tasAw1LVSs39R5kcrm29Ci8xKydIsjq4bxWEYDL_4pkooMPEFIO-V8V30nKlHWvP7RyDLYBuzrZg7mNWgW6fLdoQzMnYLWZbHSHzcMBgmTua05lAU3lWUQSc92XJiQWZ9VV7TPI86QEi2xbKGtKKpuikTUXrMGPYpf3w2ODQuOh7xDrY7iyz1duXcnuuO21zmru0JghuizctTfFxyvByJ2lJcFVpYd34ytzLCele7W8R1y0AG4hGajv1hxRHchEpzFIAt',
      bgGlow: '#cbd5e1',
    },
    {
      title: 'סוגרים חוזה בקליק',
      desc: 'ניהול חוזים ותשלומים דיגיטלי מלא, הכל במקום אחד - פשוט, שקוף ובטוח.',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCXsXssy7NQZFTKlNXK_Mywel1F-7IEqD1Q60v__8qGsZmtterPeEedvdtwjcy25CKwR8YFZl_9f0Ja4bYy1sfGpnNl3DIzRgwqeTMGDSy3Vfm57wu3RCYGVmfBDY_j6szAAS6UXVr87SkR20Ue7-QGgnRt2BhosKe8xo4B4YwxZ_ukbvTJMvw4sxVPsysp3HeQWkpGn_P-cT6pCCQQyRVXV6rUHgmh7slEmvv8KmLqgh_SfCBnPRZOPXhfapa9YP8hcYEvUVUiisH',
      bgGlow: '#9cefdf',
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      {mode === 'intro' ? (
        <View style={styles.introContainer}>
          {/* Header Action Bar */}
          <View style={styles.header}>
            <TouchableOpacity onPress={skip} activeOpacity={0.7}>
              <Text style={[styles.skipLink, { color: colors.textSub }]}>דלג</Text>
            </TouchableOpacity>
            <Text style={styles.logoBrand}>DirApp</Text>
          </View>

          {/* Intro Slide View */}
          <View style={styles.slideWrap}>
            <View style={[styles.glowContainer, { backgroundColor: introSlides[introStep].bgGlow }]} />
            <Image
              source={{ uri: introSlides[introStep].img }}
              style={styles.slideImage}
              resizeMode="contain"
            />
            <Text style={styles.slideTitle}>{introSlides[introStep].title}</Text>
            <Text style={styles.slideDesc}>{introSlides[introStep].desc}</Text>
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {/* Extended Teal Dot Progress Row */}
            <View style={styles.progressRow}>
              {introSlides.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i === introStep ? styles.progressDotActive : styles.progressDotInactive,
                  ]}
                />
              ))}
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={styles.primaryCta}
              onPress={handleIntroNext}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryCtaText}>
                {introStep === 2 ? 'בואו נתחיל' : 'המשך'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.preferenceContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Progress pills */}
          <View style={styles.pillProgressRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.pillDot,
                  i === prefStep && styles.pillDotActive,
                  i < prefStep && styles.pillDotDone,
                ]}
              />
            ))}
          </View>

          {/* Question Step Card */}
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            {prefStep === 0 && (
              <View style={styles.stepContent}>
                <Text style={styles.emoji}>💰</Text>
                <Text style={styles.stepTitle}>מה התקציב שלך?</Text>
                <Text style={styles.stepDesc}>הזן תקציב חודשי לשכירות. אפשר לשנות מאוחר יותר.</Text>
                
                <View style={styles.row}>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textSub }]}>מינימום ₪</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                      value={minBudget}
                      onChangeText={setMinBudget}
                      keyboardType="numeric"
                      placeholder="3000"
                      placeholderTextColor={colors.textMut}
                      textAlign="right"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textSub }]}>מקסימום ₪</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                      value={maxBudget}
                      onChangeText={setMaxBudget}
                      keyboardType="numeric"
                      placeholder="8000"
                      placeholderTextColor={colors.textMut}
                      textAlign="right"
                    />
                  </View>
                </View>

                <View style={styles.navRow}>
                  <TouchableOpacity style={styles.backBtn} onPress={() => setMode('intro')} activeOpacity={0.7}>
                    <Ionicons name="arrow-forward" size={16} color={colors.textSub} style={{ marginLeft: 4 }} />
                    <Text style={{ color: colors.textSub, fontFamily: fontFamily.medium }}>חזור</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.nextBtn} onPress={() => setPrefStep(1)} activeOpacity={0.85}>
                    <Text style={styles.nextBtnText}>המשך</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {prefStep === 1 && (
              <View style={styles.stepContent}>
                <Text style={styles.emoji}>📍</Text>
                <Text style={styles.stepTitle}>אילו ערים מעניינות אותך?</Text>
                <Text style={styles.stepDesc}>בחר אחת או יותר. ריק = כל הארץ.</Text>
                
                <View style={styles.chipGrid}>
                  {CITIES.map((city) => {
                    const selected = selectedCities.includes(city);
                    return (
                      <TouchableOpacity
                        key={city}
                        style={[
                          styles.chip,
                          { backgroundColor: colors.bg, borderColor: colors.border },
                          selected && {
                            backgroundColor: colorsV3.secondaryContainer,
                            borderColor: colorsV3.secondary,
                          },
                        ]}
                        onPress={() =>
                          setSelectedCities(
                            selected
                              ? selectedCities.filter((c) => c !== city)
                              : [...selectedCities, city]
                          )
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: colors.textSub },
                            selected && { color: colorsV3.onSecondaryContainer, fontWeight: '700' },
                          ]}
                        >
                          {city}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.navRow}>
                  <TouchableOpacity style={styles.backBtn} onPress={() => setPrefStep(0)} activeOpacity={0.7}>
                    <Ionicons name="arrow-forward" size={16} color={colors.textSub} style={{ marginLeft: 4 }} />
                    <Text style={{ color: colors.textSub, fontFamily: fontFamily.medium }}>חזור</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.nextBtn} onPress={() => setPrefStep(2)} activeOpacity={0.85}>
                    <Text style={styles.nextBtnText}>המשך</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {prefStep === 2 && (
              <View style={styles.stepContent}>
                <Text style={styles.emoji}>🎉</Text>
                <Text style={styles.stepTitle}>הכל מוכן!</Text>
                <Text style={styles.stepDesc}>לחץ "שמור והתחל" כדי להתחיל לגלוש בדירות שמתאימות לך.</Text>

                <TouchableOpacity
                  style={[styles.saveBtn, saveMutation.isPending && { opacity: 0.6 }]}
                  onPress={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  activeOpacity={0.85}
                >
                  {saveMutation.isPending ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.saveBtnText}>שמור והתחל</Text>
                      <Ionicons name="rocket-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.backBtn, { marginTop: 16 }]} onPress={() => setPrefStep(1)} activeOpacity={0.7}>
                  <Ionicons name="arrow-forward" size={16} color={colors.textSub} style={{ marginLeft: 4 }} />
                  <Text style={{ color: colors.textSub, fontFamily: fontFamily.medium }}>חזור</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colorsV3.background },
  introContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  skipLink: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
  },
  logoBrand: {
    fontSize: 20,
    fontWeight: '800',
    color: colorsV3.primary,
    fontFamily: fontFamily.bold,
  },
  slideWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    position: 'relative',
  },
  glowContainer: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.12,
    top: '10%',
  },
  slideImage: {
    width: '100%',
    height: SCREEN_WIDTH * 0.7,
    marginBottom: 32,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colorsV3.primary,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: fontFamily.medium,
  },
  slideDesc: {
    fontSize: 15,
    color: colorsV3.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: fontFamily.regular,
  },
  footer: {
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 28,
  },
  progressRow: {
    flexDirection: 'row-reverse', // RTL alignment
    gap: 8,
    alignItems: 'center',
  },
  progressDot: {
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    width: 32,
    backgroundColor: colorsV3.secondary,
  },
  progressDotInactive: {
    width: 8,
    backgroundColor: colorsV3.outlineVariant,
  },
  primaryCta: {
    width: '100%',
    backgroundColor: colorsV3.actionCta, // Emerald
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colorsV3.actionCta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryCtaText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },

  // Preferences Styling
  preferenceContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  pillProgressRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 24,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c4c6cf',
  },
  pillDotActive: {
    backgroundColor: colorsV3.secondary,
    width: 24,
  },
  pillDotDone: {
    backgroundColor: 'rgba(0, 107, 95, 0.4)',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    shadowColor: colorsV3.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  stepContent: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colorsV3.primary,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: fontFamily.medium,
  },
  stepDesc: {
    fontSize: 14,
    color: colorsV3.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    fontFamily: fontFamily.regular,
  },
  row: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 6,
    fontFamily: fontFamily.medium,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    fontSize: 15,
    fontFamily: fontFamily.regular,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  backBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 8,
  },
  nextBtn: {
    backgroundColor: colorsV3.secondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  chipGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    marginBottom: 24,
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
  },
  saveBtn: {
    backgroundColor: colorsV3.actionCta, // Emerald
    borderRadius: 24,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colorsV3.actionCta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
});
