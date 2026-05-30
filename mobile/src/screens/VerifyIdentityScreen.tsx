import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { screeningApi } from '../services/api';
import { C, Dark } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';
import { showAlert } from '../utils/alert';

type VerifStatus = 'pending' | 'verified' | 'rejected' | null;

function StatusBadge({ status }: { status: VerifStatus }) {
  if (!status) return null;
  const map: Record<NonNullable<VerifStatus>, { icon: string; label: string; color: string; bg: string }> = {
    pending:  { icon: '⏳', label: 'בבדיקה',    color: C.statusTone.caution, bg: C.goldAlpha(0.12) },
    verified: { icon: '✅', label: 'מאומת',      color: C.statusTone.positive, bg: C.successAlpha(0.12) },
    rejected: { icon: '❌', label: 'נדחה',       color: C.statusTone.negativeSoft, bg: C.coralAlpha(0.12) },
  };
  const s = map[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={styles.badgeIcon}>{s.icon}</Text>
      <Text style={[styles.badgeLabel, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

export default function VerifyIdentityScreen() {
  const navigation = useNavigation();

  const [idNumber, setIdNumber]   = React.useState('');
  const [fullName, setFullName]   = React.useState('');
  const [phone, setPhone]         = React.useState('');

  const { data: statusData, isLoading: statusLoading, refetch } = useQuery({
    queryKey: ['screening-status'],
    queryFn: () => screeningApi.getStatus().then((r) => r.data),
  });

  const verif = statusData?.verification;
  const currentStatus: VerifStatus = verif?.status ?? null;
  const isVerified = currentStatus === 'verified';

  const submitMutation = useMutation({
    mutationFn: () => screeningApi.submitIdentity({ idNumber, fullName, phone }),
    onSuccess: () => {
      showAlert('הבקשה התקבלה', 'הפרטים נשלחו לאימות. הסטטוס יתעדכן תוך זמן קצר.');
      refetch();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.response?.data?.errors?.[0]?.msg || 'אירעה שגיאה. בדוק את הפרטים ונסה שוב.';
      showAlert('שגיאה', msg);
    },
  });

  function handleSubmit() {
    if (!/^\d{9}$/.test(idNumber.trim())) {
      return showAlert('שגיאה', 'מספר תעודת זהות חייב להכיל 9 ספרות');
    }
    if (fullName.trim().length < 2) {
      return showAlert('שגיאה', 'יש להזין שם מלא');
    }
    if (!/^(\+972|0)[0-9]{8,9}$/.test(phone.trim())) {
      return showAlert('שגיאה', 'מספר טלפון ישראלי לא תקין (05X-XXXXXXX)');
    }
    submitMutation.mutate();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.onInverse.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dirType.subhead]}>אימות זהות</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={32} color={C.statusTone.positive} style={{ marginBottom: 10 }} />
          <Text style={[styles.infoTitle, dirType.subhead]}>אמת את זהותך</Text>
          <Text style={styles.infoText}>
            פרופיל מאומת מגביר את האמינות שלך מול בעלי הדירות ומשפר את סיכויי הקבלה שלך.
            הפרטים מוצפנים ומאובטחים.
          </Text>
        </View>

        {/* Current status */}
        {statusLoading ? (
          <ActivityIndicator color={C.cyan} style={{ marginVertical: 20 }} />
        ) : (
          <>
            {currentStatus && (
              <View style={styles.statusRow}>
                <Text style={styles.statusRowLabel}>סטטוס נוכחי:</Text>
                <StatusBadge status={currentStatus} />
              </View>
            )}
            {verif?.verifiedAt && (
              <Text style={styles.verifiedAt}>
                אומת בתאריך: {new Date(verif.verifiedAt).toLocaleDateString('he-IL')}
              </Text>
            )}
            {verif?.idNumberLast4 && (
              <Text style={styles.idHint}>תעודת זהות: ****{verif.idNumberLast4}</Text>
            )}
          </>
        )}

        {/* Form — only show if not already verified */}
        {!isVerified && (
          <View style={styles.form}>
            <Text style={[styles.sectionTitle, dirType.label]}>פרטי זיהוי</Text>

            <Text style={[styles.label, dirType.label]}>מספר תעודת זהות</Text>
            <TextInput
              style={styles.input}
              value={idNumber}
              onChangeText={setIdNumber}
              placeholder="9 ספרות"
              placeholderTextColor={C.field.placeholder}
              keyboardType="numeric"
              maxLength={9}
              textAlign="right"
            />

            <Text style={[styles.label, dirType.label]}>שם מלא (כבתעודת הזהות)</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="שם פרטי ושם משפחה"
              placeholderTextColor={C.field.placeholder}
              textAlign="right"
            />

            <Text style={[styles.label, dirType.label]}>מספר טלפון</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="05X-XXXXXXX"
              placeholderTextColor={C.field.placeholder}
              keyboardType="phone-pad"
              textAlign="right"
            />

            <Text style={styles.disclaimer}>
              המידע נשמר באופן מוצפן ומשמש לאימות זהות בלבד. לא נעביר פרטים לצד שלישי.
            </Text>

            <TouchableOpacity
              style={[styles.submitBtn, submitMutation.isPending && styles.submitBtnDisabled]}
              disabled={submitMutation.isPending}
              onPress={handleSubmit}
            >
              {submitMutation.isPending
                ? <ActivityIndicator color={C.onInverse.primary} />
                : (
                  <View style={styles.submitInner}>
                    <Ionicons name="shield-checkmark" size={18} color={C.onInverse.primary} />
                    <Text style={styles.submitBtnText}>שלח לאימות</Text>
                  </View>
                )}
            </TouchableOpacity>
          </View>
        )}

        {isVerified && (
          <View style={styles.verifiedCard}>
            <Text style={[styles.verifiedCardText, dirType.body]}>הזהות שלך אומתה בהצלחה. תג "מאומת" יופיע על פרופילך.</Text>
          </View>
        )}
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Dark.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Dark.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: dirApp.primary, fontSize: 18, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  infoCard: { backgroundColor: Dark.surface, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: Dark.border },
  infoTitle: { color: C.onInverse.primary, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  infoText: { color: C.textMut, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginBottom: 6 },
  statusRowLabel: { color: C.textMut, fontSize: 14 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeIcon: { fontSize: 14 },
  badgeLabel: { fontWeight: '700', fontSize: 14 },
  verifiedAt: { color: C.textMut, fontSize: 12, textAlign: 'right', marginBottom: 2 },
  idHint: { color: C.textMut, fontSize: 12, textAlign: 'right', marginBottom: 16 },
  form: { marginTop: 8 },
  sectionTitle: { color: C.onInverse.primary, fontSize: 16, fontWeight: '700', textAlign: 'right', marginBottom: 14 },
  label: { color: C.textMut, fontSize: 13, fontWeight: '600', textAlign: 'right', marginBottom: 6 },
  input: { backgroundColor: Dark.surface, borderRadius: 12, padding: 14, color: C.onInverse.primary, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: Dark.border },
  disclaimer: { color: C.textMut, fontSize: 11, textAlign: 'right', lineHeight: 16, marginBottom: 20 },
  submitBtn: { backgroundColor: C.statusTone.positive, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitBtnText: { color: C.onInverse.primary, fontWeight: '800', fontSize: 15 },
  verifiedCard: { backgroundColor: C.successAlpha(0.12), borderRadius: 14, padding: 18, borderWidth: 1, borderColor: C.statusTone.positive, marginTop: 16 },
  verifiedCardText: { color: C.statusTone.positive, textAlign: 'center', fontSize: 14, fontWeight: '600', lineHeight: 20 },
});
