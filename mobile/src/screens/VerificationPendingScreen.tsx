import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { dirApp } from '../theme/dirAppTokens';
import { fontFamily } from '../theme/fonts';
import { useColors } from '../context/ThemeContext';
import { C } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

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

export default function VerificationPendingScreen() {
  const colors = useColors();
  const { isDesktop } = useResponsive();
  const { user, resendVerification, restoreSession, verifyEmail, logout } = useAuthStore();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 6-digit OTP state
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(59);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  async function handleResend() {
    if (timeLeft > 0) return;
    setResending(true);
    setError('');
    setSuccess('');
    try {
      await resendVerification(user?.email);
      setResent(true);
      setSuccess('קוד אימות חדש נשלח בהצלחה!');
      setTimeLeft(59);
    } catch (err) {
      setError('שגיאה בשליחת קוד אימות');
    } finally {
      setResending(false);
    }
  }

  async function handleVerify() {
    const code = otp.join('');
    if (code.length < 6) {
      setError('נא להזין קוד אימות מלא בן 6 ספרות');
      return;
    }
    setVerifying(true);
    setError('');
    setSuccess('');
    try {
      await verifyEmail(code);
      setSuccess('האימייל אומת בהצלחה!');
      await restoreSession();
    } catch (err) {
      setError('קוד אימות שגוי או פג תוקף');
    } finally {
      setVerifying(false);
    }
  }

  async function handleCheckSession() {
    setChecking(true);
    setError('');
    setSuccess('');
    try {
      await restoreSession();
    } catch (err) {
      setError('אימות לא הושלם. אנא ודא שלחצת על הקישור במייל.');
    } finally {
      setChecking(false);
    }
  }

  const handleOtpChange = (text: string, index: number) => {
    // Only accept numeric digits
    const cleaned = text.replace(/[^0-9]/g, '');
    if (!cleaned) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    const digit = cleaned[cleaned.length - 1];
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next field in RTL (typing right to left: index 0 to 5)
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const formatTime = (seconds: number) => {
    const s = seconds < 10 ? `0${seconds}` : seconds;
    return `(00:${s})`;
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Background Glows */}
      {isDesktop && <View style={styles.glowTopRight} pointerEvents="none" />}
      {isDesktop && <View style={styles.glowBottomLeft} pointerEvents="none" />}

      <View style={styles.innerContainer}>
        {/* Verification Card */}
        <View style={isDesktop ? [styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }] : styles.mobileFormContainer}>
          {/* Badge icon */}
          <View style={styles.iconBadge}>
            <Ionicons name="mail-unread" size={48} color={colorsV3.secondary} />
          </View>

          <h1 style={{ display: 'none' }}>אימות כתובת אימייל</h1>
          <Text style={styles.title}>בדוק את המייל שלך</Text>
          <Text style={styles.subtitle}>
            שלחנו קוד אימות וקישור לכתובת:{'\n'}
            <Text style={styles.emailText}>{user?.email}</Text>
          </Text>

          {/* 6-Digit Input Row (RTL order: 0 is on the right, 5 is on the left) */}
          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputRefs.current[i] = ref; }}
                style={[
                  styles.otpInput,
                  {
                    backgroundColor: colors.bg,
                    color: colors.text,
                    borderColor: otp[i] ? colorsV3.secondary : colors.border,
                  },
                ]}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, i)}
                onKeyPress={(e) => handleOtpKeyPress(e, i)}
                textAlign="center"
                selectTextOnFocus
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>{success}</Text> : null}

          {/* Resend Section */}
          <View style={styles.resendContainer}>
            <Text style={[styles.resendLabel, { color: colors.textSub }]}>לא קיבלת את הקוד?</Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={timeLeft > 0 || resending}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.resendLink,
                  timeLeft > 0 ? styles.resendLinkDisabled : { color: colorsV3.secondary },
                ]}
              >
                שלח שוב {timeLeft > 0 ? formatTime(timeLeft) : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Verify OTP Button */}
          <TouchableOpacity
            style={[styles.button, verifying && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={verifying}
            activeOpacity={0.85}
          >
            {verifying ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>אמת</Text>
            )}
          </TouchableOpacity>

          {/* Check Email Session Link */}
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: colorsV3.outlineVariant, marginTop: 12 }]}
            onPress={handleCheckSession}
            disabled={checking}
            activeOpacity={0.85}
          >
            {checking ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={[styles.outlineBtnText, { color: colors.text }]}>לחצתי על הקישור — בדוק שוב</Text>
            )}
          </TouchableOpacity>

          {/* Logout / Switch User */}
          <TouchableOpacity onPress={logout} style={styles.logoutLink} activeOpacity={0.7}>
            <Text style={styles.logoutText}>התנתק / החלף משתמש</Text>
          </TouchableOpacity>
        </View>

        {/* Secure badge footer */}
        <View style={styles.secureBadge}>
          <Ionicons name="shield-checkmark" size={16} color={colors.textMut} />
          <Text style={[styles.secureText, { color: colors.textMut }]}>
            התחברות מאובטחת באמצעות DirApp Secure
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    shadowColor: colorsV3.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    alignItems: 'center',
  },
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#eceef3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  title: {
    fontSize: 22,
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
    marginBottom: 28,
    fontFamily: fontFamily.regular,
  },
  emailText: {
    fontWeight: '600',
    color: colorsV3.primary,
    fontFamily: fontFamily.semibold,
  },
  otpRow: {
    flexDirection: 'row-reverse', // RTL alignment (first box is on the right)
    gap: 8,
    marginBottom: 28,
    justifyContent: 'center',
    width: '100%',
  },
  otpInput: {
    width: 44,
    height: 52,
    borderRadius: 8,
    borderWidth: 1.5,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 4,
  },
  resendLabel: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    textDecorationLine: 'underline',
  },
  resendLinkDisabled: {
    color: '#74777f',
    textDecorationLine: 'none',
  },
  button: {
    backgroundColor: colorsV3.secondary, // Teal brand secondary (as in mockup)
    borderRadius: 24,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colorsV3.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderRadius: 24,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  logoutLink: {
    marginTop: 20,
    padding: 4,
  },
  logoutText: {
    color: '#74777f',
    fontSize: 13,
    fontFamily: fontFamily.regular,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    opacity: 0.7,
  },
  secureText: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
  },
  errorText: {
    color: C.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: fontFamily.regular,
  },
  successText: {
    color: C.success,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: fontFamily.regular,
  },
  mobileFormContainer: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
  },
});
