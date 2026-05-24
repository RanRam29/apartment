import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { getVerificationPromptEmail, type MaybeAuthError } from '../services/verificationUx';
import { formatLoginError } from '../utils/authErrors';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import SwipeHouseLogo from '../components/SwipeHouseLogo';
import { useColors } from '../context/ThemeContext';

interface Props {
  onSwitch: () => void;
}

export default function LoginScreen({ onSwitch }: Props) {
  const colors = useColors();
  const { login, resendVerification } = useAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [info, setInfo]         = useState('');

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

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.brandRow}>
        <SwipeHouseLogo size="md" />
      </View>
      <Text style={styles.title}>ברוך הבא</Text>
      <Text style={styles.subtitle}>התחבר לחשבונך</Text>

      <TextInput
        style={[styles.input, { backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border }]}
        placeholder="אימייל"
        placeholderTextColor={colors.textMut}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        textAlign="right"
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border }]}
        placeholder="סיסמה"
        placeholderTextColor={colors.textMut}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textAlign="right"
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {info  ? <Text style={styles.infoText}>{info}</Text>   : null}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color={C.onInverse.primary} />
          : <Text style={styles.buttonText}>כניסה</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={onSwitch} style={styles.switchRow}>
        <Text style={[styles.switchText, { color: colors.textMut }]}>אין לך חשבון? </Text>
        <Text style={[styles.switchText, styles.switchLink]}>הרשם עכשיו</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  brandRow: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', color: dirApp.primary, textAlign: 'right', marginBottom: 4 },
  subtitle: { fontSize: 14, color: dirApp.outline, textAlign: 'right', marginBottom: 28 },
  input: {
    backgroundColor: dirApp.surfaceContainerLowest,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: dirApp.onSurface,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: `${dirApp.outlineVariant}AA`,
    textAlign: 'right',
  },
  button: {
    backgroundColor: dirApp.primaryContainer,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: dirApp.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: C.onInverse.primary, fontSize: 16, fontWeight: '700' },
  errorText: { color: C.danger, fontSize: 13, textAlign: 'right', marginBottom: 10, lineHeight: 20 },
  infoText: { color: C.success, fontSize: 13, textAlign: 'right', marginBottom: 10, lineHeight: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: dirApp.outline, fontSize: 14 },
  switchLink: { color: dirApp.secondary, fontWeight: '700' },
});
