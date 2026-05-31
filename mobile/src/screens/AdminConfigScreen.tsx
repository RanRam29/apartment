import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
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

const KEY_LABELS: Record<string, string> = {
  check_in_window_days: "ימי חלון צ'ק-אין",
  checkin_photos_max: 'מקסימום תמונות צ\'ק-אין',
  checkout_revision_rounds: 'סבבי תיקון צ\'ק-אאוט',
  expiring_warning_days: 'התראה לפני תפוגת חוזה',
  guarantor_link_ttl_days: 'תוקף קישור ערב',
  blocking_threshold: 'סף חסימה',
  contract_revision_max: 'מקסימום גרסאות חוזה',
  payment_autoconfirm_hours: 'שעות אישור תשלום אוטומטי',
  overdue_alert_days: 'ימים להתראת פיגור',
  kyc_renewal_years: 'שנים לחידוש KYC',
  maintenance_alert_hours_1: 'התראת תחזוקה ראשונה (שעות)',
  maintenance_alert_days_2: 'התראת תחזוקה שנייה (ימים)',
  persona_monthly_quota: 'מכסת פרסונות חודשית',
};

interface ConfigItem {
  key: string;
  value: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminConfigScreen() {
  const colors = useColors();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchConfigs = async () => {
    try {
      setError(null);
      const res = await adminApi.getConfig();
      const data: ConfigItem[] = res.data ?? [];
      
      // Ensure all predefined keys are in the list, even if they aren't created in backend yet.
      const existingKeys = new Set(data.map(item => item.key));
      const mergedList = [...data];
      
      Object.keys(KEY_LABELS).forEach(key => {
        if (!existingKeys.has(key)) {
          mergedList.push({ key, value: '' });
        }
      });

      // Sort alphabetically by Hebrew label if possible, or by key
      mergedList.sort((a, b) => {
        const labelA = KEY_LABELS[a.key] || a.key;
        const labelB = KEY_LABELS[b.key] || b.key;
        return labelA.localeCompare(labelB, 'he');
      });

      setConfigs(mergedList);

      const initialValues: Record<string, string> = {};
      mergedList.forEach(item => {
        initialValues[item.key] = String(item.value);
      });
      setEditValues(initialValues);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'שגיאה בטעינת הגדרות המערכת');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConfigs();
  };

  const handleSave = async (key: string) => {
    const newValue = editValues[key]?.trim();
    if (newValue === undefined) return;

    setSavingKey(key);
    setError(null);
    setSuccessMessage(null);

    try {
      await adminApi.updateConfig(key, newValue);
      setSuccessMessage(`ההגדרה "${KEY_LABELS[key] || key}" נשמרה בהצלחה!`);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(prev => prev?.includes(KEY_LABELS[key] || key) ? null : prev);
      }, 3000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'שגיאה בעדכון ההגדרה');
    } finally {
      setSavingKey(null);
    }
  };

  const handleInputChange = (key: string, text: string) => {
    setEditValues(prev => ({
      ...prev,
      [key]: text,
    }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ResponsiveContainer style={{ flex: 1 }}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="settings-sharp" size={24} color={dirApp.secondary} />
              <Text style={[styles.title, dirType.title]}>הגדרות מערכת</Text>
            </View>
            <Text style={[styles.subtitle, dirType.caption, { color: colors.textSub }]}>
              ניהול ערכים ופרמטרים גלובליים של אפליקציית DirApp
            </Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={20} color={C.danger} />
              <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
            </View>
          )}

          {successMessage && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle-outline" size={20} color={C.success} />
              <Text style={[styles.successText, { color: C.success }]}>{successMessage}</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={dirApp.secondary} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollList}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[dirApp.secondary]} />}
              keyboardShouldPersistTaps="handled"
            >
              {configs.map(item => {
                const label = KEY_LABELS[item.key] || item.key;
                const isSaving = savingKey === item.key;
                const hasChanged = editValues[item.key] !== String(item.value);

                return (
                  <View
                    key={item.key}
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.bgCard,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.rowHeader}>
                      <Text style={[styles.cardLabel, dirType.label, { color: colors.text }]}>
                        {label}
                      </Text>
                      <Text style={[styles.cardKey, dirType.micro, { color: colors.textMut }]}>
                        {item.key}
                      </Text>
                    </View>

                    <View style={styles.actionRow}>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: colors.bg,
                            borderColor: colors.border,
                            color: colors.text,
                            textAlign: 'right',
                          },
                        ]}
                        value={editValues[item.key]}
                        onChangeText={text => handleInputChange(item.key, text)}
                        placeholder="הזן ערך..."
                        placeholderTextColor={colors.textMut}
                        keyboardType="numeric"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isSaving}
                      />

                      <TouchableOpacity
                        style={[
                          styles.saveButton,
                          {
                            backgroundColor: isSaving
                              ? dirApp.outlineVariant
                              : dirApp.secondary,
                            opacity: isSaving ? 0.7 : 1,
                          },
                        ]}
                        onPress={() => handleSave(item.key)}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-sharp" size={16} color="#ffffff" style={styles.saveIcon} />
                            <Text style={styles.saveButtonText}>שמור</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </ResponsiveContainer>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'flex-end', // RTL
  },
  titleRow: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: dirApp.primary,
  },
  subtitle: {
    marginTop: 4,
    textAlign: 'right', // RTL
  },
  errorBanner: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    backgroundColor: '#FDF2F2',
    borderWidth: 1,
    borderColor: '#F8B4B4',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right', // RTL
  },
  successBanner: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    gap: 8,
  },
  successText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right', // RTL
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollList: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  rowHeader: {
    alignItems: 'flex-end', // RTL
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right', // RTL
  },
  cardKey: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actionRow: {
    flexDirection: 'row', // Horizontal input + button
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row-reverse', // RTL inside button
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 80,
    height: 42,
  },
  saveIcon: {
    marginLeft: 4,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
