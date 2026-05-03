import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

interface Props {
  onSwitch: () => void;
}

export default function LoginScreen({ onSwitch }: Props) {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>ברוך הבא 👋</Text>
      <Text style={styles.subtitle}>התחבר לחשבונך</Text>

      <TextInput
        style={styles.input}
        placeholder="אימייל"
        placeholderTextColor="#A0A0B2"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        textAlign="right"
      />
      <TextInput
        style={styles.input}
        placeholder="סיסמה"
        placeholderTextColor="#A0A0B2"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textAlign="right"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'right', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#A0A0B2', textAlign: 'right', marginBottom: 32 },
  input: {
    backgroundColor: '#2A2A3E',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#fff',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#3A3A5E',
  },
  button: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: '#A0A0B2', fontSize: 14 },
  switchLink: { color: '#6C5CE7', fontWeight: '600' },
});
