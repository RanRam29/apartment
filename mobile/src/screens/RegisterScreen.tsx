import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { formatLoginError } from '../utils/authErrors';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import SwipeHouseLogo from '../components/SwipeHouseLogo';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';
import { useColors } from '../context/ThemeContext';

interface Props {
  onSwitch: () => void;
}

type Role = 'tenant' | 'landlord';

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
        setError('לא ניתן להתחבר לשרת. בדוק את החיבור לאינטרנט.');
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ResponsiveContainer>
        <View style={styles.brandRow}>
          <SwipeHouseLogo size="md" />
        </View>
        <Text style={[styles.title, dirType.title]}>הרשמה</Text>
        <Text style={[styles.subtitle, dirType.body]}>צור חשבון חדש</Text>

        {/* Role selector */}
        <View style={styles.roleRow}>
          {(['tenant', 'landlord'] as Role[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => setRole(r)}
              activeOpacity={0.8}
            >
              <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                {r === 'tenant' ? '🔍  שוכר' : '🏠  משכיר'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 8, backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border }]}
            placeholder="שם פרטי"
            placeholderTextColor={colors.textMut}
            value={firstName}
            onChangeText={setFirstName}
            textAlign="right"
          />
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border }]}
            placeholder="שם משפחה"
            placeholderTextColor={colors.textMut}
            value={lastName}
            onChangeText={setLastName}
            textAlign="right"
          />
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border }]}
          placeholder="אימייל *"
          placeholderTextColor={colors.textMut}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          textAlign="right"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border }]}
          placeholder="טלפון (050-0000000)"
          placeholderTextColor={colors.textMut}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          textAlign="right"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border }]}
          placeholder="סיסמה (מינימום 8 תווים) *"
          placeholderTextColor={colors.textMut}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textAlign="right"
        />

        {error   ? <Text style={styles.errorText}>{error}</Text>   : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={C.onInverse.primary} />
            : <Text style={[styles.buttonText, dirType.label]}>הרשמה</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={onSwitch} style={styles.switchRow}>
          <Text style={[styles.switchText, dirType.caption, { color: colors.textMut }]}>כבר יש לך חשבון? </Text>
          <Text style={[styles.switchText, styles.switchLink, dirType.caption]}>התחבר</Text>
        </TouchableOpacity>
        </ResponsiveContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  brandRow: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: dirApp.primary, textAlign: 'right', marginBottom: 4 },
  subtitle: { fontSize: 14, color: dirApp.outline, textAlign: 'right', marginBottom: 24 },

  roleRow: { flexDirection: 'row', marginBottom: 20, gap: 10 },
  roleBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: dirApp.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: `${dirApp.outlineVariant}AA`,
    alignItems: 'center',
  },
  roleBtnActive: { backgroundColor: dirApp.secondaryContainer, borderColor: dirApp.secondary },
  roleBtnText: { color: dirApp.outline, fontWeight: '600', fontSize: 14 },
  roleBtnTextActive: { color: dirApp.onSecondaryContainer },

  row: { flexDirection: 'row', marginBottom: 0 },
  input: {
    backgroundColor: dirApp.surfaceContainerLowest,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: dirApp.onSurface,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: `${dirApp.outlineVariant}AA`,
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
  successText: { color: C.success, fontSize: 13, textAlign: 'right', marginBottom: 10, lineHeight: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: dirApp.outline, fontSize: 14 },
  switchLink: { color: dirApp.secondary, fontWeight: '700' },
});
