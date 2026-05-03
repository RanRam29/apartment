import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

interface Props {
  onSwitch: () => void;
}

type Role = 'tenant' | 'landlord';

export default function RegisterScreen({ onSwitch }: Props) {
  const { register } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [password, setPassword]   = useState('');
  const [role, setRole]           = useState<Role>('tenant');
  const [loading, setLoading]     = useState(false);

  async function handleRegister() {
    if (!firstName || !lastName || !email || !password) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות החובה');
      return;
    }
    if (password.length < 8) {
      Alert.alert('שגיאה', 'הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }
    setLoading(true);
    try {
      await register({ firstName, lastName, email: email.trim().toLowerCase(), password, role, phone: phone || undefined });
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const msg = errors
        ? errors.map((e: any) => e.msg).join('\n')
        : err?.response?.data?.error || 'שגיאה בהרשמה';
      Alert.alert('שגיאה', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>הרשמה</Text>
        <Text style={styles.subtitle}>צור חשבון חדש</Text>

        {/* Role selector */}
        <View style={styles.roleRow}>
          {(['tenant', 'landlord'] as Role[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                {r === 'tenant' ? '🔍 שוכר' : '🏠 משכיר'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 8 }]}
            placeholder="שם פרטי"
            placeholderTextColor="#A0A0B2"
            value={firstName}
            onChangeText={setFirstName}
            textAlign="right"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="שם משפחה"
            placeholderTextColor="#A0A0B2"
            value={lastName}
            onChangeText={setLastName}
            textAlign="right"
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="אימייל *"
          placeholderTextColor="#A0A0B2"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          textAlign="right"
        />
        <TextInput
          style={styles.input}
          placeholder="טלפון (050-0000000)"
          placeholderTextColor="#A0A0B2"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          textAlign="right"
        />
        <TextInput
          style={styles.input}
          placeholder="סיסמה (מינימום 8 תווים) *"
          placeholderTextColor="#A0A0B2"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textAlign="right"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>הרשמה</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={onSwitch} style={styles.switchRow}>
          <Text style={styles.switchText}>כבר יש לך חשבון? </Text>
          <Text style={[styles.switchText, styles.switchLink]}>התחבר</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'right', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#A0A0B2', textAlign: 'right', marginBottom: 24 },
  roleRow: { flexDirection: 'row', marginBottom: 20, gap: 10 },
  roleBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#2A2A3E', borderWidth: 1, borderColor: '#3A3A5E',
    alignItems: 'center',
  },
  roleBtnActive: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  roleBtnText: { color: '#A0A0B2', fontWeight: '600', fontSize: 14 },
  roleBtnTextActive: { color: '#fff' },
  row: { flexDirection: 'row', marginBottom: 0 },
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
    backgroundColor: '#6C5CE7', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: '#A0A0B2', fontSize: 14 },
  switchLink: { color: '#6C5CE7', fontWeight: '600' },
});
