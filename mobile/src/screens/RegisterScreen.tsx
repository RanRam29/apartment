import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { formatLoginError } from '../utils/authErrors';
import { isTimeoutError } from '../utils/networkUtils';
import { C } from '../theme';
import { fontFamily } from '../theme/fonts';
import { useColors } from '../context/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';

interface Props {
  onSwitch: () => void;
}

type Role = 'tenant' | 'landlord';

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

export default function RegisterScreen({ onSwitch }: Props) {
  const colors = useColors();
  const { register } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [role,      setRole]      = useState<Role>('tenant');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { isDesktop } = useResponsive();

  async function handleRegister() {
    setError('');
    setSuccess('');
    if (!firstName || !lastName || !email || !password) {
      setError('נא למלא את כל השדות החובה');
      return;
    }
    if (password.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }
    setLoading(true);
    try {
      await register({ firstName, lastName, email: email.trim().toLowerCase(), password, role, phone: phone || undefined });
      setSuccess('נרשמת בהצלחה! שלחנו קישור אימות למייל שלך.');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { errors?: Array<{ msg: string }> } } };
      if (!ax?.response) {
        if (isTimeoutError(err)) {
          setError('השרת מתעורר (עד 30 שניות). נסו שוב בעוד רגע.');
        } else {
          setError('לא ניתן להתחבר לשרת. בדוק את החיבור לאינטרנט.');
        }
        return;
      }
      const errors = ax.response?.data?.errors;
      const msg = errors?.length
        ? errors.map((e) => e.msg).join('\n')
        : formatLoginError(err, 'שגיאה בהרשמה');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const renderFormContent = () => (
    <View style={styles.innerContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Ionicons name="business" size={32} color="#9ff2e2" />
        </View>

        <Text style={styles.title}>הרשמה</Text>
        <Text style={styles.subtitle}>צור חשבון חדש ב-DirApp</Text>
      </View>

      {/* Form Card */}
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {/* Role selector */}
        <Text style={[styles.label, { color: colors.textSub, marginBottom: 8 }]}>בחר סוג משתמש</Text>
        <View style={styles.roleRow}>
          {(['tenant', 'landlord'] as Role[]).map((r) => {
            const isActive = role === r;
            return (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleBtn,
                  isActive && {
                    backgroundColor: colorsV3.secondaryContainer,
                    borderColor: colorsV3.secondary,
                  },
                ]}
                onPress={() => setRole(r)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.roleBtnText,
                    isActive && {
                      color: colorsV3.onSecondaryContainer,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {r === 'tenant' ? '🔍  שוכר' : '🏠  משכיר'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Names row */}
        <View style={styles.nameRow}>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.label, { color: colors.textSub }]}>שם פרטי *</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                placeholder="פרטי"
                placeholderTextColor={colors.textMut}
                value={firstName}
                onChangeText={setFirstName}
                textAlign="right"
              />
              <Ionicons name="person-outline" size={18} color={colors.textMut} style={styles.inputIcon} />
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSub }]}>שם משפחה *</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                placeholder="משפחה"
                placeholderTextColor={colors.textMut}
                value={lastName}
                onChangeText={setLastName}
                textAlign="right"
              />
              <Ionicons name="person-outline" size={18} color={colors.textMut} style={styles.inputIcon} />
            </View>
          </View>
        </View>

        {/* Email Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSub }]}>אימייל *</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              placeholder="אימייל"
              placeholderTextColor={colors.textMut}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign="right"
            />
            <Ionicons name="mail-outline" size={20} color={colors.textMut} style={styles.inputIcon} />
          </View>
        </View>

        {/* Phone Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSub }]}>טלפון</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              placeholder="טלפון"
              placeholderTextColor={colors.textMut}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              textAlign="right"
            />
            <Ionicons name="call-outline" size={20} color={colors.textMut} style={styles.inputIcon} />
          </View>
        </View>

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSub }]}>סיסמה *</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border, paddingLeft: 44 }]}
              placeholder="סיסמה (מינימום 8 תווים)"
              placeholderTextColor={colors.textMut}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textAlign="right"
            />
            <Ionicons name="lock-closed-outline" size={20} color={colors.textMut} style={styles.inputIcon} />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textMut}
              />
            </TouchableOpacity>
          </View>
        </View>

        {error   ? <Text style={styles.errorText}>{error}</Text>   : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        {/* Register Button (Emerald Pill) */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <View style={styles.btnContent}>
              <Text style={styles.buttonText}>הרשמה</Text>
              <Ionicons name="person-add-outline" size={20} color="#ffffff" style={styles.btnIcon} />
            </View>
          )}
        </TouchableOpacity>

        {/* Switch to Login Row */}
        <TouchableOpacity onPress={onSwitch} style={styles.switchRow} activeOpacity={0.7}>
          <Text style={[styles.switchText, { color: colors.textMut }]}>כבר יש לך חשבון? </Text>
          <Text style={[styles.switchText, styles.switchLink]}>התחבר</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isDesktop) {
    return (
      <View style={[styles.desktopContainer, { backgroundColor: colors.bg }]}>
        {/* Abstract background glows */}
        <View style={styles.brandGlow1} pointerEvents="none" />
        <View style={styles.brandGlow2} pointerEvents="none" />

        {/* Floating Bento cards on the left side of desktop screen */}
        <View style={styles.bentoContainer} pointerEvents="none">
          {/* Card 1: Listing Preview */}
          <View style={[styles.glassCard, styles.bentoCard1]}>
            <View style={styles.bentoCardImageWrapper}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXNgseDMWqxAvYBBmBgUVLTd0mirs_DvczwSPJUdCZYFPtc4I5aBxcEvj8IHZ1720A1zK0I6YmDQDWrhJi1vsCdL9yLX6zZHetYxeXdSfCVJK6r2jHEq6wi9MFLTqQI8YmitLg1L7jFieLvOqlSsq9tGm0jKvXWYLgBmfDwDC4mr1T-bILO64EmNKsHt0JnyLdF0pdYjEq2Gzr9wRQwL5xresL0FxrYsjSxl7B6TZJ0PgpMjHlHqK8JELmZWhzTEYmvxXCxB9WQizG' }}
                style={styles.bentoCardImage}
              />
            </View>
            <View style={styles.placeholderRowSmall} />
            <View style={styles.placeholderRowTiny} />
          </View>

          {/* Card 2: Verified Profile */}
          <View style={[styles.glassCard, styles.bentoCard2]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBadge, { backgroundColor: colorsV3.secondaryContainer }]}>
                <Ionicons name="shield-checkmark" size={18} color={colorsV3.onSecondaryContainer} />
              </View>
              <View style={styles.badgeTextColumn}>
                <Text style={styles.badgeTitle}>פרופיל מאומת</Text>
                <Text style={styles.badgeSubtitle}>אמינות היא מעל הכל</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Central Register Form Scroll */}
        <ScrollView
          contentContainerStyle={styles.desktopFormScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderFormContent()}
        </ScrollView>
      </View>
    );
  }

  // Mobile layout
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Background Glows */}
        <View style={styles.glowTopRight} pointerEvents="none" />
        <View style={styles.glowBottomLeft} pointerEvents="none" />

        {renderFormContent()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Web specific styles
  desktopContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  desktopFormScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 60,
    zIndex: 10,
  },
  brandGlow1: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#9cefdf',
    opacity: 0.1,
  },
  brandGlow2: {
    position: 'absolute',
    bottom: '-10%',
    right: '-10%',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: '#d6e3ff',
    opacity: 0.08,
  },
  bentoContainer: {
    position: 'absolute',
    left: 80,
    top: '30%',
    width: 320,
    zIndex: 5,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    padding: 16,
    shadowColor: '#002045',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  bentoCard1: {
    transform: [{ rotate: '-3deg' }, { scale: 0.9 }],
    marginBottom: 20,
  },
  bentoCardImageWrapper: {
    width: '100%',
    height: 128,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e1e2e8',
    marginBottom: 12,
  },
  bentoCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderRowSmall: {
    height: 12,
    width: '75%',
    backgroundColor: 'rgba(0, 9, 27, 0.12)',
    borderRadius: 4,
    marginBottom: 8,
  },
  placeholderRowTiny: {
    height: 12,
    width: '50%',
    backgroundColor: 'rgba(0, 9, 27, 0.06)',
    borderRadius: 4,
  },
  bentoCard2: {
    transform: [{ rotate: '6deg' }, { translateX: 48 }],
  },
  cardHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  cardIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTextColumn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  badgeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colorsV3.primary,
    fontFamily: fontFamily.semibold,
  },
  badgeSubtitle: {
    fontSize: 11,
    color: colorsV3.onSurfaceVariant,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },

  // Mobile/General styles
  container: { flexGrow: 1, justifyContent: 'center', paddingVertical: 40, position: 'relative' },
  glowTopRight: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#9cefdf',
    opacity: 0.15,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#d6e3ff',
    opacity: 0.15,
  },
  innerContainer: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colorsV3.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colorsV3.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colorsV3.primary,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: fontFamily.medium,
  },
  subtitle: {
    fontSize: 15,
    color: colorsV3.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: fontFamily.regular,
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
  roleRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: colorsV3.outlineVariant,
    alignItems: 'center',
  },
  roleBtnText: {
    color: colorsV3.outline,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: fontFamily.medium,
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  inputGroup: {
    marginBottom: 16,
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    paddingHorizontal: 4,
    fontFamily: fontFamily.medium,
  },
  inputWrapper: {
    position: 'relative',
    height: 48,
    width: '100%',
    justifyContent: 'center',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    height: '100%',
    width: '100%',
    paddingRight: 44,
    paddingLeft: 16,
    textAlign: 'right',
    fontSize: 15,
    fontFamily: fontFamily.regular,
  },
  inputIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  eyeBtn: {
    position: 'absolute',
    left: 14,
    top: 14,
    padding: 2,
  },
  button: {
    backgroundColor: colorsV3.actionCta, // Emerald/Mint
    borderRadius: 24, // Pill shape
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: colorsV3.actionCta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  btnIcon: {
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchText: {
    fontSize: 14,
  },
  switchLink: {
    color: colorsV3.secondary,
    fontWeight: '700',
    fontFamily: fontFamily.semibold,
  },
  errorText: {
    color: C.danger,
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 10,
    lineHeight: 20,
    fontFamily: fontFamily.regular,
  },
  successText: {
    color: C.success,
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 10,
    lineHeight: 20,
    fontFamily: fontFamily.regular,
  },
});
