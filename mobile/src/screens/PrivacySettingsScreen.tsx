import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useColors } from '../context/ThemeContext';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';
import { showAlert } from '../utils/alert';

export default function PrivacySettingsScreen() {
  const colors = useColors();
  const navigation = useNavigation();
  const { user, updateUser } = useAuthStore();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState(true);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(user?.whatsappOptIn ?? false);

  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleToggleWhatsapp = async (value: boolean) => {
    setWhatsappEnabled(value);
    try {
      await authApi.updateUsersMe({ whatsappOptIn: value });
      updateUser({ whatsappOptIn: value });
      showAlert('הצלחה', value ? 'ההרשמה ל-WhatsApp הופעלה' : 'ההרשמה ל-WhatsApp בוטלה');
    } catch {
      setWhatsappEnabled(!value);
      showAlert('שגיאה', 'עדכון הגדרות ה-WhatsApp נכשל');
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await authApi.exportData();
      setExporting(false);
      
      const formattedJson = JSON.stringify(res.data, null, 2);
      if (Platform.OS === 'web') {
        window.alert(`פרטי המידע השמורים שלך:\n\n${formattedJson}`);
      } else {
        Alert.alert(
          'ייצוא נתונים הושלם',
          'להלן המידע האישי השמור במערכת התואם את זכות העיון:',
          [
            { text: 'סגור', style: 'cancel' },
            { text: 'הצג מידע', onPress: () => Alert.alert('נתוני המשתמש שלך', formattedJson) }
          ]
        );
      }
    } catch {
      setExporting(false);
      showAlert('שגיאה', 'ייצוא הנתונים נכשל. נסה שנית.');
    }
  };

  const handleRequestDeletion = () => {
    const executeDeletion = async () => {
      setDeleting(true);
      try {
        const res = await authApi.requestDeletion();
        setDeleting(false);
        showAlert('בקשה התקבלה', res.data.message);
      } catch {
        setDeleting(false);
        showAlert('שגיאה', 'הגשת בקשת המחיקה נכשלה.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('האם אתה בטוח שברצונך למחוק את החשבון לצמיתות? כל הנתונים, החוזים והמודעות יימחקו תוך 30 יום בהתאם לחוק הגנת הפרטיות.')) {
        executeDeletion();
      }
    } else {
      Alert.alert(
        'מחיקת חשבון לצמיתות',
        'האם אתה בטוח שברצונך למחוק את החשבון? כל המידע האישי, מודעות וחוזים פעילים יימחקו מהמערכת תוך 30 יום בהתאם להוראות החוק.',
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'מחק חשבון', style: 'destructive', onPress: executeDeletion }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ResponsiveContainer style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={dirApp.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dirType.subhead]}>פרטיות ואבטחת מידע</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Privacy Act Notice Banner */}
          <View style={[styles.infoBanner, { backgroundColor: `${dirApp.primary}0D`, borderColor: `${dirApp.primary}22` }]}>
            <Ionicons name="shield-checkmark" size={24} color={dirApp.primary} style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>זכויות הפרטיות שלך</Text>
              <Text style={styles.infoDescription}>
                המערכת פועלת בהתאם לחוק הגנת הפרטיות, התשמ״א-1981 ותיקון 13 לחוק. הנך זכאי לעיין במידע השמור עליך, לעדכן אותו או לדרוש את מחיקתו בכל עת.
              </Text>
            </View>
          </View>

          {/* Notifications Channels Settings */}
          <Text style={styles.sectionTitle}>ערוצי התראות ודיוור</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>התראות Push בטלפון</Text>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ false: colors.border, true: dirApp.secondary }}
                thumbColor={pushEnabled ? dirApp.primary : colors.bgCard}
              />
            </View>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>התראות בדואר אלקטרוני</Text>
              <Switch
                value={emailEnabled}
                onValueChange={setEmailEnabled}
                trackColor={{ false: colors.border, true: dirApp.secondary }}
                thumbColor={emailEnabled ? dirApp.primary : colors.bgCard}
              />
            </View>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>תזכורות תשלומים אוטומטיות</Text>
              <Switch
                value={paymentReminders}
                onValueChange={setPaymentReminders}
                trackColor={{ false: colors.border, true: dirApp.secondary }}
                thumbColor={paymentReminders ? dirApp.primary : colors.bgCard}
              />
            </View>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>קריאות שירות ותחזוקת דירה</Text>
              <Switch
                value={maintenanceAlerts}
                onValueChange={setMaintenanceAlerts}
                trackColor={{ false: colors.border, true: dirApp.secondary }}
                thumbColor={maintenanceAlerts ? dirApp.primary : colors.bgCard}
              />
            </View>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            <View style={styles.switchRow}>
              <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 10 }}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>הודעות ועדכונים ב-WhatsApp</Text>
                <Text style={styles.switchSubLabel}>חיבור לקו ה-API הרשמי של Meta</Text>
              </View>
              <Switch
                value={whatsappEnabled}
                onValueChange={handleToggleWhatsapp}
                trackColor={{ false: colors.border, true: '#25D366' }}
                thumbColor={whatsappEnabled ? '#128C7E' : colors.bgCard}
              />
            </View>
          </View>

          {/* GDPR Options */}
          <Text style={styles.sectionTitle}>ניהול המידע האישי שלך</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={styles.gdprLabel}>
              הורד עותק מלא של כל הנתונים השמורים עליך במערכת לצורך עיון או העברה.
            </Text>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: dirApp.secondary }]}
              onPress={handleExportData}
              disabled={exporting}
              activeOpacity={0.8}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={dirApp.secondary} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color={dirApp.secondary} />
                  <Text style={[styles.actionBtnText, { color: dirApp.secondary }]}>ייצוא נתונים אישיים</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={[styles.separator, { backgroundColor: colors.border, marginVertical: 16 }]} />

            <Text style={styles.gdprLabel}>
              מחיקת החשבון והסרת כל המידע האישי המקושר אליו לצמיתות משרתי המערכת.
            </Text>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: C.danger }]}
              onPress={handleRequestDeletion}
              disabled={deleting}
              activeOpacity={0.8}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={C.danger} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color={C.danger} />
                  <Text style={[styles.actionBtnText, { color: C.danger }]}>בקשה למחיקת החשבון</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.footerText, { color: colors.textMut }]}>
            DirApp מאובטחת באמצעות הצפנה מתקדמת ועומדת בתקני אבטחת המידע המחמירים ביותר להגנה על פרטיות המשתמשים.
          </Text>
        </ScrollView>
      </ResponsiveContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: dirApp.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: `${dirApp.outlineVariant}88`,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: dirApp.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: dirApp.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row-reverse',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
    gap: 12,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: dirApp.primary,
    textAlign: 'right',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    color: dirApp.onSurfaceVariant,
    lineHeight: 18,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: dirApp.outline,
    textAlign: 'right',
    marginBottom: 10,
    marginRight: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  switchSubLabel: {
    fontSize: 11,
    color: dirApp.outline,
    marginTop: 2,
    textAlign: 'right',
  },
  separator: {
    height: 1,
    opacity: 0.15,
    marginVertical: 12,
  },
  gdprLabel: {
    color: dirApp.outline,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'right',
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    height: 46,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 24,
    marginTop: 8,
  },
});
