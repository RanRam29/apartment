import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { C } from '../theme';

interface Props {
  onSwitch: () => void;
}

export default function LoginScreen({ onSwitch }: Props) {
  const { login } = useAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('שגיאה', 'נא למלא אימייל וסיסמה');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'שגיאה בכניסה, נסה שנית';
      Alert.alert('שגיאה', msg);
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
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: C.textSub, fontSize: 14 },
  switchLink: { color: C.navy, fontWeight: '700' },
});
