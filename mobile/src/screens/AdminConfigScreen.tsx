import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { adminApi } from '../services/api';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';
import { useColors } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

// ─── Labels ─────────────────────────────────────────────────────────────────
const KEY_LABELS: Record<string, string> = {
  // Users
  max_login_attempts: 'מקסימום נסיונות כניסה',
  lockout_duration_minutes: 'זמן נעילה (דקות)',
  session_timeout_hours: 'תפוגת session (שעות)',
  initial_trust_score: 'ציון אמון התחלתי',
  max_trust_score: 'ציון אמון מקסימלי',
  inactive_user_days: 'ימים עד סימון לא פעיל',
  blocking_threshold: 'סף חסימה',
  // Listings
  max_images_per_listing: 'מקסימום תמונות למודעה',
  max_active_listings_per_landlord: 'מקסימום מודעות פעילות למשכיר',
  listing_expiry_days: 'ימי תפוגת מודעה',
  listing_boost_duration_days: 'משך קידום מודעה (ימים)',
  min_listing_price_ils: 'מחיר מינימום למודעה ₪',
  max_listing_price_ils: 'מחיר מקסימום למודעה ₪',
  // Swipe & Match
  daily_swipe_limit: 'מגבלת סוויפים יומית',
  daily_superlike_limit: 'מגבלת סופר-לייק יומית',
  match_expiry_days: 'ימי תפוגת התאמה',
  premium_daily_swipe_limit: 'מגבלת סוויפים פרימיום',
  // Payments
  payment_autoconfirm_hours: 'שעות אישור תשלום אוטומטי',
  late_fee_percentage: 'אחוז קנס איחור',
  payment_reminder_days_before: 'ימים לתזכורת לפני תשלום',
  payment_grace_period_days: 'ימי חסד לתשלום',
  deposit_months_default: 'חודשי פיקדון ברירת מחדל',
  cpi_auto_adjust: 'התאמת מדד אוטומטית',
  overdue_alert_days: 'ימים להתראת פיגור',
  // Contracts
  check_in_window_days: "ימי חלון צ'ק-אין",
  checkin_photos_max: "מקסימום תמונות צ'ק-אין",
  checkout_revision_rounds: "סבבי תיקון צ'ק-אאוט",
  expiring_warning_days: 'התראה לפני תפוגת חוזה',
  guarantor_link_ttl_days: 'תוקף קישור ערב',
  contract_revision_max: 'מקסימום גרסאות חוזה',
  kyc_renewal_years: 'שנים לחידוש KYC',
  // Chat
  max_message_length: 'אורך הודעה מקסימלי',
  chat_image_max_size_mb: 'גודל תמונה מקסימלי בצ׳אט (MB)',
  chat_history_retention_days: 'שמירת היסטוריית צ׳אט (ימים)',
  // Notifications
  email_digest_frequency_hours: 'תדירות דיגסט מייל (שעות)',
  push_notifications_enabled: 'התראות Push מופעלות',
  reminder_new_matches_hours: 'תזכורת התאמות חדשות (שעות)',
  maintenance_alert_hours_1: 'התראת תחזוקה ראשונה (שעות)',
  maintenance_alert_days_2: 'התראת תחזוקה שנייה (ימים)',
  // Gamification
  points_per_swipe: 'נקודות לסוויפ',
  points_per_match: 'נקודות להתאמה',
  points_per_contract_signed: 'נקודות לחתימת חוזה',
  points_per_payment_on_time: 'נקודות לתשלום בזמן',
  level_2_threshold: 'סף רמה 2',
  level_3_threshold: 'סף רמה 3',
  level_4_threshold: 'סף רמה 4',
  persona_monthly_quota: 'מכסת פרסונות חודשית',
  // Security
  api_rate_limit_per_minute: 'מגבלת API לדקה',
  file_upload_max_size_mb: 'גודל העלאה מקסימלי (MB)',
  require_email_verification: 'חובת אימות מייל',
  audit_log_retention_days: 'שמירת לוגים (ימים)',
  min_password_length: 'אורך סיסמה מינימלי',
};

const BOOLEAN_KEYS = new Set([
  'cpi_auto_adjust',
  'push_notifications_enabled',
  'require_email_verification',
]);

// ─── Sections ───────────────────────────────────────────────────────────────
const CONFIG_SECTIONS: { title: string; icon: keyof typeof Ionicons.glyphMap; keys: string[] }[] = [
  {
    title: 'ניהול משתמשים',
    icon: 'people',
    keys: ['max_login_attempts', 'lockout_duration_minutes', 'session_timeout_hours', 'initial_trust_score', 'max_trust_score', 'inactive_user_days', 'blocking_threshold'],
  },
  {
    title: 'דירות ומודעות',
    icon: 'home',
    keys: ['max_images_per_listing', 'max_active_listings_per_landlord', 'listing_expiry_days', 'listing_boost_duration_days', 'min_listing_price_ils', 'max_listing_price_ils'],
  },
  {
    title: 'סוויפ והתאמות',
    icon: 'swap-horizontal',
    keys: ['daily_swipe_limit', 'daily_superlike_limit', 'match_expiry_days', 'premium_daily_swipe_limit'],
  },
  {
    title: 'תשלומים',
    icon: 'card',
    keys: ['payment_autoconfirm_hours', 'late_fee_percentage', 'payment_reminder_days_before', 'payment_grace_period_days', 'deposit_months_default', 'cpi_auto_adjust', 'overdue_alert_days'],
  },
  {
    title: 'חוזים',
    icon: 'document-text',
    keys: ['check_in_window_days', 'checkin_photos_max', 'checkout_revision_rounds', 'expiring_warning_days', 'guarantor_link_ttl_days', 'contract_revision_max', 'kyc_renewal_years'],
  },
  {
    title: 'צ׳אט',
    icon: 'chatbubbles',
    keys: ['max_message_length', 'chat_image_max_size_mb', 'chat_history_retention_days'],
  },
  {
    title: 'התראות',
    icon: 'notifications',
    keys: ['email_digest_frequency_hours', 'push_notifications_enabled', 'reminder_new_matches_hours', 'maintenance_alert_hours_1', 'maintenance_alert_days_2'],
  },
  {
    title: 'גיימיפיקציה',
    icon: 'game-controller',
    keys: ['points_per_swipe', 'points_per_match', 'points_per_contract_signed', 'points_per_payment_on_time', 'level_2_threshold', 'level_3_threshold', 'level_4_threshold', 'persona_monthly_quota'],
  },
  {
    title: 'אבטחה',
    icon: 'shield-checkmark',
    keys: ['api_rate_limit_per_minute', 'file_upload_max_size_mb', 'require_email_verification', 'audit_log_retention_days', 'min_password_length'],
  },
];

interface ConfigItem {
  key: string;
  value: string;
}

export default function AdminConfigScreen() {
  const colors = useColors();
  const [configMap, setConfigMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const fetchConfigs = async () => {
    try {
      setError(null);
      const res = await adminApi.getConfig();
      const data: ConfigItem[] = res.data ?? [];
      const map: Record<string, string> = {};
      const edit: Record<string, string> = {};
      data.forEach(item => {
        map[item.key] = String(item.value);
        edit[item.key] = String(item.value);
      });
      setConfigMap(map);
      setEditValues(edit);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'שגיאה בטעינת הגדרות המערכת');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchConfigs(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchConfigs(); };

  const handleSave = async (key: string) => {
    const newValue = editValues[key]?.trim() ?? '';
    setSavingKey(key);
    setError(null);
    setSuccessMessage(null);
    try {
      await adminApi.updateConfig(key, newValue);
      setConfigMap(prev => ({ ...prev, [key]: newValue }));
      setSuccessMessage(`"${KEY_LABELS[key] || key}" נשמרה בהצלחה`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'שגיאה בעדכון ההגדרה');
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggle = async (key: string, val: boolean) => {
    const newValue = val ? 'true' : 'false';
    setEditValues(prev => ({ ...prev, [key]: newValue }));
    setSavingKey(key);
    try {
      await adminApi.updateConfig(key, newValue);
      setConfigMap(prev => ({ ...prev, [key]: newValue }));
    } catch (err: any) {
      setError(err?.response?.data?.error || 'שגיאה בעדכון ההגדרה');
    } finally {
      setSavingKey(null);
    }
  };

  const toggleSection = (title: string) => {
    setCollapsed(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const renderConfigItem = (key: string) => {
    const label = KEY_LABELS[key] || key;
    const isSaving = savingKey === key;
    const savedValue = configMap[key] ?? '';
    const editValue = editValues[key] ?? '';
    const hasChanged = editValue !== savedValue;
    const isBoolean = BOOLEAN_KEYS.has(key);

    if (isBoolean) {
      const isOn = editValue === 'true';
      return (
        <View key={key} style={[styles.boolRow, { borderBottomColor: colors.border }]}>
          <Switch
            value={isOn}
            onValueChange={(val) => handleToggle(key, val)}
            disabled={isSaving}
            trackColor={{ false: colors.border, true: dirApp.secondaryContainer }}
            thumbColor={isOn ? dirApp.secondary : '#ccc'}
          />
          <Text style={[styles.boolLabel, { color: colors.text }]}>{label}</Text>
        </View>
      );
    }

    return (
      <View key={key} style={[styles.fieldRow, { borderBottomColor: colors.border }]}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.fieldKey, { color: colors.textMut }]}>{key}</Text>
        </View>
        <View style={styles.fieldAction}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bg,
                borderColor: hasChanged ? dirApp.secondary : colors.border,
                borderWidth: hasChanged ? 1.5 : 1,
                color: colors.text,
                textAlign: 'right',
              },
            ]}
            value={editValue}
            onChangeText={text => setEditValues(prev => ({ ...prev, [key]: text }))}
            placeholder={savedValue || '—'}
            placeholderTextColor={colors.textMut}
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSaving}
          />
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: isSaving ? dirApp.outlineVariant : dirApp.secondary, opacity: isSaving ? 0.7 : 1 }]}
            onPress={() => handleSave(key)}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ResponsiveContainer style={{ flex: 1 }}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="settings-sharp" size={24} color={dirApp.secondary} />
              <Text style={[styles.title, dirType.title]}>הגדרות מערכת</Text>
            </View>
            <Text style={[styles.subtitle, dirType.caption, { color: colors.textSub }]}>
              50 פרמטרים · 9 קטגוריות
            </Text>
          </View>

          {error && (
            <View style={styles.banner}>
              <Ionicons name="alert-circle-outline" size={18} color={C.danger} />
              <Text style={[styles.bannerText, { color: C.danger }]}>{error}</Text>
            </View>
          )}
          {successMessage && (
            <View style={[styles.banner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color={C.success} />
              <Text style={[styles.bannerText, { color: C.success }]}>{successMessage}</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={dirApp.secondary} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[dirApp.secondary]} />}
              keyboardShouldPersistTaps="handled"
            >
              {CONFIG_SECTIONS.map(section => {
                const isCollapsed = collapsed[section.title] ?? false;
                return (
                  <View key={section.title} style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                    <TouchableOpacity
                      style={styles.sectionHeader}
                      onPress={() => toggleSection(section.title)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isCollapsed ? 'chevron-back' : 'chevron-down'}
                        size={18}
                        color={colors.textMut}
                      />
                      <Text style={[styles.sectionCount, { color: colors.textMut }]}>
                        {section.keys.length}
                      </Text>
                      <View style={{ flex: 1 }} />
                      <Text style={[styles.sectionTitle, { color: dirApp.primary }]}>
                        {section.title}
                      </Text>
                      <Ionicons name={section.icon} size={20} color={dirApp.secondary} />
                    </TouchableOpacity>
                    {!isCollapsed && (
                      <View style={styles.sectionBody}>
                        {section.keys.map(renderConfigItem)}
                      </View>
                    )}
                  </View>
                );
              })}
              <View style={{ height: 100 }} />
            </ScrollView>
          )}
        </ResponsiveContainer>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, alignItems: 'flex-end' },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: dirApp.primary },
  subtitle: { marginTop: 4, textAlign: 'right' },
  banner: {
    flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#FDF2F2',
    borderWidth: 1, borderColor: '#F8B4B4', borderRadius: 10,
    marginHorizontal: 16, marginBottom: 8, padding: 10, gap: 8,
  },
  bannerText: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 12, gap: 10 },
  // Section
  section: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    paddingHorizontal: 14, gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionCount: { fontSize: 12, fontWeight: '600' },
  sectionBody: { paddingHorizontal: 14, paddingBottom: 8 },
  // Fields
  fieldRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  fieldHeader: { alignItems: 'flex-end', marginBottom: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '700', textAlign: 'right' },
  fieldKey: { fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 1 },
  fieldAction: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, fontWeight: '600',
  },
  saveBtn: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  // Boolean
  boolRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  boolLabel: { fontSize: 14, fontWeight: '700', textAlign: 'right', flex: 1, marginRight: 12 },
});
