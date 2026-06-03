import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useLedgerStore } from '../store/useLedgerStore';
import { useAuthStore } from '../store/useAuthStore';
import { showAlert } from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import SkeletonLoader from '../components/SkeletonLoader';

export default function LedgerScreen({ route, navigation }: any) {
  const { agreementId = '00000000-0000-4000-9000-000000000001' } = route.params || {};
  const { rows, fetchLedgerForAgreement, reportPayment, confirmPayment, rejectPayment, isLoading } = useLedgerStore();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchLedgerForAgreement(agreementId);
    } catch (_) {}
    setRefreshing(false);
  }, [agreementId]);

  useEffect(() => {
    fetchLedgerForAgreement(agreementId).catch(() => {});
  }, [agreementId]);

  const handleReport = async (rowId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await reportPayment(rowId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert('הושלם בהצלחה', 'דיווחת על ביצוע העברת התשלום בהצלחה. המשכיר יקבל התראה לאישור.');
      fetchLedgerForAgreement(agreementId).catch(() => {});
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert('שגיאה', 'דיווח התשלום נכשל.');
    }
  };

  const handleConfirm = async (rowId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await confirmPayment(rowId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert('הצלחה', 'התשלום אושר ונרשם כ-PAID.');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert('שגיאה', 'אישור התשלום נכשל.');
    }
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ספר תשלומים</Text>
          <View style={{ width: 38 }} />
        </View>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.title}>ספר תשלומים ומעקב שכירות</Text>
          <Text style={styles.subtitle}>מעקב שקוף אחר שכר דירה, חיובים ואישורי תשלומים הדדיים.</Text>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={[styles.rowCard, { opacity: 0.8 }]}>
              <View style={styles.rowHeader}>
                <SkeletonLoader width={80} height={20} borderRadius={6} />
                <SkeletonLoader width={100} height={20} borderRadius={6} />
              </View>
              <View style={[styles.details, { alignItems: 'flex-end', marginTop: 12, marginBottom: 12 }]}>
                <SkeletonLoader width={120} height={24} borderRadius={6} style={{ marginBottom: 6 }} />
                <SkeletonLoader width={160} height={14} borderRadius={6} />
              </View>
              <View style={styles.actions}>
                <SkeletonLoader width="100%" height={40} borderRadius={8} />
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ספר תשלומים</Text>
        <View style={{ width: 38 }} />
      </View>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5f5ce5']} tintColor="#5f5ce5" />}
      >
        <Text style={styles.title}>ספר תשלומים ומעקב שכירות</Text>
        <Text style={styles.subtitle}>מעקב שקוף אחר שכר דירה, חיובים ואישורי תשלומים הדדיים.</Text>

      {rows.length > 0 ? (
        rows.map((row: any) => (
          <View key={row.id} style={styles.rowCard}>
            <View style={styles.rowHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[
                  styles.statusBadge,
                  row.status === 'PAID' ? styles.statusPaid : styles.statusUnpaid
                ]}>
                  <Text style={styles.statusText}>{row.status}</Text>
                </View>
                {row.whatsappReminderSentAt && (
                  <TouchableOpacity
                    onPress={() => {
                      const dateStr = new Date(row.whatsappReminderSentAt).toLocaleDateString('he-IL', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      showAlert('תזכורת WhatsApp', `תזכורת נשלחה ב-WhatsApp ב-${dateStr}`);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.monthText}>{row.month || 'שכירות חודשית'}</Text>
            </View>

            <View style={styles.details}>
              <Text style={styles.amountText}>₪{parseFloat(row.amount).toLocaleString()}</Text>
              <Text style={styles.dueDateText}>תאריך יעד: {row.dueDate}</Text>
            </View>

            <View style={styles.actions}>
              {row.status !== 'PAID' && user?.role === 'tenant' && (
                <TouchableOpacity onPress={() => handleReport(row.id)} style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>דווח ששולם (Bit/העברה)</Text>
                </TouchableOpacity>
              )}

              {row.status === 'PENDING' && user?.role === 'landlord' && (
                <TouchableOpacity onPress={() => handleConfirm(row.id)} style={styles.confirmBtn}>
                  <Text style={styles.confirmBtnText}>אשר קבלת תשלום</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>אין שורות תשלום רשומות לחוזה זה.</Text>
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f111e',
  },
  contentContainer: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f111e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9aa0b9',
    marginTop: 12,
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'right',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#9aa0b9',
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 30,
  },
  rowCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusBadge: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statusPaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusUnpaid: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  details: {
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  amountText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10b981',
    marginBottom: 4,
  },
  dueDateText: {
    fontSize: 12,
    color: '#9aa0b9',
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#5f5ce5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  confirmBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#10b981',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyBox: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  emptyText: {
    color: '#9aa0b9',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0f111e',
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
