import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { dirApp } from '../theme/dirAppTokens';
import { dirType } from '../theme/textStyles';
import { C } from '../theme';

export default function VerificationPendingScreen() {
  const { user, resendVerification, restoreSession, logout } = useAuthStore();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);

  async function handleResend() {
    setResending(true);
    try {
      await resendVerification(user?.email);
      setResent(true);
    } catch {}
    setResending(false);
  }

  async function handleCheck() {
    setChecking(true);
    try {
      await restoreSession();
    } catch {}
    setChecking(false);
  }

  return (
    <View style={styles.container}>
      <Ionicons name="mail-outline" size={64} color={dirApp.secondary} />
      <Text style={[dirType.title, styles.title]}>אימות אימייל</Text>
      <Text style={[dirType.body, styles.body]}>
        שלחנו קישור אימות ל-{user?.email}.{'\n'}
        בדקו את תיבת הדואר (כולל ספאם) ולחצו על הקישור.
      </Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={handleCheck} disabled={checking}>
        {checking
          ? <ActivityIndicator color={dirApp.onPrimary} />
          : <Text style={styles.primaryBtnText}>אימתתי — בדוק שוב</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={handleResend} disabled={resending}>
        {resending
          ? <ActivityIndicator color={dirApp.secondary} />
          : <Text style={styles.secondaryBtnText}>{resent ? 'נשלח שוב ✓' : 'שלח מייל אימות מחדש'}</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={logout} style={styles.logoutLink}>
        <Text style={styles.logoutText}>התנתק</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: dirApp.background },
  title: { color: dirApp.onSurface, marginTop: 20, marginBottom: 8, textAlign: 'center' },
  body: { color: dirApp.onSurfaceVariant, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  primaryBtn: { backgroundColor: dirApp.primaryContainer, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 48, marginBottom: 12, minWidth: 260, alignItems: 'center' },
  primaryBtnText: { color: dirApp.onPrimary, fontWeight: '700', fontSize: 16 },
  secondaryBtn: { borderWidth: 1.5, borderColor: dirApp.secondary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 48, marginBottom: 24, minWidth: 260, alignItems: 'center' },
  secondaryBtnText: { color: dirApp.secondary, fontWeight: '600', fontSize: 15 },
  logoutLink: { marginTop: 8 },
  logoutText: { color: dirApp.outline, fontSize: 14 },
});
