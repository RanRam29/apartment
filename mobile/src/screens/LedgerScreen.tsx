import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLedgerStore } from '../store/useLedgerStore';
import { useAuthStore } from '../store/useAuthStore';
import { showAlert } from '../utils/alert';

export default function LedgerScreen({ route }: any) {
  const { agreementId = '00000000-0000-4000-9000-000000000001' } = route.params || {};
  const { rows, fetchLedgerForAgreement, reportPayment, confirmPayment, rejectPayment, isLoading } = useLedgerStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchLedgerForAgreement(agreementId).catch(() => {});
  }, [agreementId]);

  const handleReport = async (rowId: string) => {
    try {
      await reportPayment(rowId);
      showAlert('הושלם בהצלחה', 'דיווחת על ביצוע העברת התשלום בהצלחה. המשכיר יקבל התראה לאישור.');
      fetchLedgerForAgreement(agreementId).catch(() => {});
    } catch (err: any) {
      showAlert('שגיאה', 'דיווח התשלום נכשל.');
    }
  };

  const handleConfirm = async (rowId: string) => {
    try {
      await confirmPayment(rowId);
      showAlert('הצלחה', 'התשלום אושר ונרשם כ-PAID.');
    } catch (err: any) {
      showAlert('שגיאה', 'אישור התשלום נכשל.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5f5ce5" />
        <Text style={styles.loadingText}>טוען ספר תשלומים (Ledger)...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>ספר תשלומים ומעקב שכירות</Text>
      <Text style={styles.subtitle}>מעקב שקוף אחר שכר דירה, חיובים ואישורי תשלומים הדדיים.</Text>

      {rows.length > 0 ? (
        rows.map((row: any) => (
          <View key={row.id} style={styles.rowCard}>
            <View style={styles.rowHeader}>
              <View style={[
                styles.statusBadge,
                row.status === 'PAID' ? styles.statusPaid : styles.statusUnpaid
              ]}>
                <Text style={styles.statusText}>{row.status}</Text>
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
});
