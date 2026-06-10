import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { getVerificationPromptEmail, type MaybeAuthError } from '../services/verificationUx';
import { formatLoginError } from '../utils/authErrors';
import { isTimeoutError } from '../utils/networkUtils';
import { C } from '../theme';
import { fontFamily } from '../theme/fonts';
import { useColors } from '../context/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  onSwitch: () => void;
}

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

const featureCards = [
  {
    icon: 'shield-checkmark-outline' as const,
    iconColor: '#00cba9',
    iconBg: 'rgba(0, 203, 169, 0.15)',
    title: 'חוזים דיגיטליים',
    body: 'חתימה מאובטחת על חוזי שכירות וניהול נכסים מכל מקום.',
  },
  {
    icon: 'desktop-outline' as const,
    iconColor: '#9ff2e2',
    iconBg: 'rgba(159, 242, 226, 0.15)',
    title: 'ניהול ותשלומים',
    body: 'מעקב אחר תשלומים, תחזוקה ודוחות בלוח בקרה אחד.',
  },
  {
    icon: 'people-outline' as const,
    iconColor: '#5dfbd7',
    iconBg: 'rgba(93, 251, 215, 0.15)',
    title: 'התאמה חכמה',
    body: 'מערכת לסינון דיירים ומציאת הדירה המושלמת עבורכם.',
  },
];

const cardPositions: any[] = [
  { top: '10%', right: '5%' },
  { top: '25%', left: '0%' },
  { bottom: '10%', right: '15%' },
];

export default function LoginScreen({ onSwitch }: Props) {
  const colors = useColors();
  const { login, resendVerification } = useAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [info, setInfo]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { isDesktop } = useResponsive();

  const [activeCardIndex, setActiveCardIndex] = useState(1);

  useEffect(() => {
    if (!isDesktop) return;
    const interval = setInterval(() => {
      setActiveCardIndex((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, [isDesktop]);

  async function handleLogin() {
    setError('');
    setInfo('');
    if (!email.trim() || !password) {
      setError('נא למלא אימייל וסיסמה');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      if (isTimeoutError(err)) {
        setInfo('השרת מתעורר... מנסה שוב אוטומטית');
        setError('');
        try {
          await login(email.trim().toLowerCase(), password);
          return;
        } catch (retryErr: unknown) {
          setInfo('');
          setError(formatLoginError(retryErr));
          setLoading(false);
          return;
        }
      }
      const unverifiedEmail = getVerificationPromptEmail(err as MaybeAuthError);
      if (unverifiedEmail) {
        setInfo('האימייל לא אומת. שלחנו לך מייל אימות — בדוק את תיבת הדואר.');
        resendVerification(unverifiedEmail).catch(() => {});
      } else {
        setError(formatLoginError(err));
      }
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

        <Text style={styles.title}>ברוך הבא</Text>
        <Text style={styles.subtitle}>התחבר כדי לנהל את הנכסים שלך ב-DirApp</Text>
      </View>

      {/* Form Card */}
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {/* Email Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSub }]}>אימייל</Text>
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

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSub }]}>סיסמה</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border, paddingLeft: 44 }]}
              placeholder="סיסמה"
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
          <View style={styles.forgotRow}>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.forgotLink}>שכחת סיסמה?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {info  ? <Text style={styles.infoText}>{info}</Text>   : null}

        {/* Login Button (Emerald Pill) */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <View style={styles.btnContent}>
              <Text style={styles.buttonText}>התחבר</Text>
              <Ionicons name="log-in-outline" size={20} color="#ffffff" style={styles.btnIcon} />
            </View>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textMut }]}>או</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Create Account Button */}
        <TouchableOpacity
          style={[styles.outlineBtn, { borderColor: colorsV3.secondary }]}
          onPress={onSwitch}
          activeOpacity={0.85}
        >
          <Text style={[styles.outlineBtnText, { color: colorsV3.secondary }]}>צור חשבון חדש</Text>
        </TouchableOpacity>
      </View>

      {/* Footer Support */}
      <View style={styles.footerSupport}>
        <Text style={[styles.footerText, { color: colors.textMut }]}>
          זקוק לעזרה?{' '}
          <Text style={styles.supportLink}>מרכז התמיכה</Text>
        </Text>
      </View>
    </View>
  );

  if (isDesktop) {
    return (
      <View style={[styles.desktopContainer, { backgroundColor: colors.bg }]}>
        {/* Left Side: Login Form */}
        <View style={[styles.desktopFormSection, { backgroundColor: colors.bgCard }]}>
          <ScrollView
            contentContainerStyle={styles.desktopFormScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderFormContent()}
          </ScrollView>
        </View>

        {/* Right Side: Branding & Illustration */}
        <View style={styles.desktopBrandingSection}>
          <LinearGradient
            colors={['#002045', '#00091b']}
            style={StyleSheet.absoluteFill}
          />
          {/* Abstract glows */}
          <View style={styles.brandGlow1} />
          <View style={styles.brandGlow2} />

          <View style={styles.brandingContent}>
            {/* Logo */}
            <Text style={styles.brandingLogo}>DirApp</Text>

            {/* Headline */}
            <Text style={styles.brandingTitle}>הדרך החכמה {'\n'}<Text style={{ color: '#00cba9' }}>לשכור או לנהל דירה</Text></Text>

            {/* Illustration and Overlapping Cards */}
            <View style={styles.illustrationContainer}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida/AP1WRLsJkT2_7VcjclEXNYrd0g0QE12YQadrUbbd0azk6dQ0trSq-HyzVdxE3MBb_MBFniCPFMT9wxyznIsxg9l-k3ozGpeYApI28gxtimlDvqoKZ9_57Rnko9Eqx8xnrjsZwFBzXcnIh1ugts3t0m7CLCLR4oNcvirzvGNHGz9PI0m2hFb-n9j0gsMsLycUPm_4uhyOQNjIz5GCOclpmWWkQAVNq_ILjt-IBL9huj2Vxp79m9OMENNugMhvkw' }}
                style={styles.illustrationImage}
              />
              
              {/* Rotating Feature Cards overlay */}
              <View style={StyleSheet.absoluteFill}>
                {featureCards.map((card, idx) => {
                  const isActive = activeCardIndex === idx;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.desktopFeatureCard,
                        cardPositions[idx],
                        isActive ? styles.desktopFeatureCardActive : null,
                      ]}
                    >
                      <View style={styles.cardHeaderRow}>
                        <View style={[styles.cardIconBadge, { backgroundColor: card.iconBg }]}>
                          <Ionicons name={card.icon} size={18} color={card.iconColor} />
                        </View>
                        <Text style={styles.cardHeaderTitle}>{card.title}</Text>
                      </View>
                      <Text style={styles.cardBodyText}>{card.body}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Mobile layout
  return (
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
  );
}

const styles = StyleSheet.create({
  // Web specific styles
  desktopContainer: {
    flex: 1,
    flexDirection: 'row-reverse', // RTL Layout: right branding, left form
    minHeight: '100vh' as any,
  },
  desktopFormSection: {
    flex: 1,
    justifyContent: 'center',
  },
  desktopFormScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  desktopBrandingSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    position: 'relative',
    overflow: 'hidden',
  },
  brandGlow1: {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: '#5dfbd7',
    opacity: 0.08,
  },
  brandGlow2: {
    position: 'absolute',
    bottom: '-5%',
    left: '-5%',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#00cba9',
    opacity: 0.08,
  },
  brandingContent: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'flex-end',
  },
  brandingLogo: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    fontFamily: fontFamily.semibold,
    marginBottom: 48,
  },
  brandingTitle: {
    fontSize: 40,
    lineHeight: 52,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: fontFamily.bold,
    textAlign: 'right',
    marginBottom: 60,
  },
  illustrationContainer: {
    width: '100%',
    height: 400,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationImage: {
    width: '80%',
    height: '80%',
    borderRadius: 24,
    transform: [{ rotate: '-2deg' }],
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  desktopFeatureCard: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 18,
    width: 280,
    shadowColor: '#002045',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    opacity: 0.3,
    transform: [{ translateY: 15 }, { scale: 0.96 }],
    // CSS-like transitions are not directly supported in RN style, but opacity mapping is fine
  },
  desktopFeatureCardActive: {
    opacity: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
    transform: [{ translateY: 0 }, { scale: 1.02 }],
  },
  cardHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  cardIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fontFamily.semibold,
    textAlign: 'right',
  },
  cardBodyText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fontFamily.regular,
    textAlign: 'right',
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
    marginBottom: 28,
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
  forgotRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  forgotLink: {
    fontSize: 13,
    color: colorsV3.secondary,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontFamily: fontFamily.regular,
  },
  outlineBtn: {
    borderWidth: 2,
    borderRadius: 24,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  footerSupport: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
  },
  supportLink: {
    color: colorsV3.secondary,
    fontWeight: '700',
    textDecorationLine: 'underline',
    fontFamily: fontFamily.medium,
  },
  errorText: {
    color: C.danger,
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 10,
    lineHeight: 20,
    fontFamily: fontFamily.regular,
  },
  infoText: {
    color: C.success,
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 10,
    lineHeight: 20,
    fontFamily: fontFamily.regular,
  },
});
