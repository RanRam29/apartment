import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { getVerificationPromptEmail } from '../services/verificationUx';
import { C } from '../theme';

interface Props {
  onSwitch: () => void;
}

export default function LoginScreen({ onSwitch }: Props) {
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
    } catch (err: any) {
      const unverifiedEmail = getVerificationPromptEmail(err);
      if (unverifiedEmail) {
        setInfo('האימייל לא אומת. שלחנו לך מייל אימות — בדוק את תיבת הדואר.');
        resendVerification(unverifiedEmail).catch(() => {});
      } else if (!err?.response) {
        setError('לא ניתן להתחבר לשרת. בדוק את החיבור לאינטרנט.');
      } else {
        setError(err?.response?.data?.error || 'שגיאה בכניסה, נסה שנית');
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
      <Text style={styles.title}>ברוך הבא</Text>
      <Text style={styles.subtitle}>התחבר לחשבונך</Text>

      <TextInput
        style={styles.input}
        placeholder="אימייל"
        placeholderTextColor={C.textMut}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        textAlign="right"
      />
      <TextInput
        style={styles.input}
        placeholder="סיסמה"
        placeholderTextColor={C.textMut}
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
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>כניסה</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={onSwitch} style={styles.switchRow}>
        <Text style={styles.switchText}>אין לך חשבון? </Text>
        <Text style={[styles.switchText, styles.switchLink]}>הרשם עכשיו</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  title:    { fontSize: 26, fontWeight: '700', color: C.text, textAlign: 'right', marginBottom: 4 },
  subtitle: { fontSize: 14, color: C.textSub, textAlign: 'right', marginBottom: 28 },
  input: {
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: C.text,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    textAlign: 'right',
  },
  button: {
    backgroundColor: C.navy,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorText: { color: '#E74C3C', fontSize: 13, textAlign: 'right', marginBottom: 10, lineHeight: 20 },
  infoText:  { color: '#27AE60', fontSize: 13, textAlign: 'right', marginBottom: 10, lineHeight: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: C.textSub, fontSize: 14 },
  switchLink: { color: C.navy, fontWeight: '700' },
});
