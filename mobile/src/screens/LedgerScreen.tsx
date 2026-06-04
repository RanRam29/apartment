import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { useLedgerStore } from '../store/useLedgerStore';
import { useAuthStore } from '../store/useAuthStore';
import { showAlert } from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import SkeletonLoader from '../components/SkeletonLoader';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { dirType } from '../theme/textStyles';
import { useColors } from '../context/ThemeContext';
import { ResponsiveContainer } from '../components/ResponsiveContainer';

const { width } = Dimensions.get('window');

function formatPeriod(periodStr: string): string {
  if (!periodStr) return '';
  const parts = periodStr.split('-');
  if (parts.length < 2) return periodStr;
  const [year, month] = parts;
  const months = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];
  const mIndex = parseInt(month, 10) - 1;
  if (mIndex >= 0 && mIndex < 12) {
    return `${months[mIndex]} ${year}`;
  }
  return periodStr;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export default function LedgerScreen({ route, navigation }: any) {
  const { agreementId = '00000000-0000-4000-9000-000000000001' } = route.params || {};
  const { rows, fetchLedgerForAgreement, reportPayment, confirmPayment, isLoading } = useLedgerStore();
  const { user } = useAuthStore();
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [showCpiModal, setShowCpiModal] = useState(false);

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
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await reportPayment(rowId);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showAlert('הושלם בהצלחה', 'דיווחת על ביצוע העברת התשלום בהצלחה. המשכיר יקבל התראה לאישור.');
      fetchLedgerForAgreement(agreementId).catch(() => {});
    } catch (err: any) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      showAlert('שגיאה', 'דיווח התשלום נכשל.');
    }
  };

  const handleConfirm = async (rowId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await confirmPayment(rowId);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showAlert('הצלחה', 'התשלום אושר ונרשם כ-PAID.');
      fetchLedgerForAgreement(agreementId).catch(() => {});
    } catch (err: any) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      showAlert('שגיאה', 'אישור התשלום נכשל.');
    }
  };

  // Find the next payment due dynamically
  const nextPaymentDue = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    // Find the first row that is PENDING, REPORTED, or OVERDUE
    return rows.find((r: any) => r.status !== 'PAID') || null;
  }, [rows]);

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>ספר תשלומים</Text>
          <View style={{ width: 38 }} />
        </View>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <SkeletonLoader width={180} height={28} borderRadius={6} style={{ alignSelf: 'flex-end', marginBottom: 8 }} />
          <SkeletonLoader width={240} height={16} borderRadius={6} style={{ alignSelf: 'flex-end', marginBottom: 24 }} />
          
          <View style={[styles.skeletonCard, { borderColor: colors.border }]}>
            <SkeletonLoader width="100%" height={120} borderRadius={12} />
          </View>
          
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={[styles.skeletonRowCard, { borderColor: colors.border }]}>
              <View style={styles.rowTopBar}>
                <SkeletonLoader width={70} height={18} borderRadius={4} />
                <SkeletonLoader width={90} height={18} borderRadius={4} />
              </View>
              <View style={{ height: 12 }} />
              <SkeletonLoader width="100%" height={32} borderRadius={8} />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>ספר תשלומים</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[dirApp.secondary]} />}
      >
        {/* TITLE SECTION */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: colors.text }]}>ספר תשלומים ומעקב שכירות</Text>
          <Text style={[styles.subtitle, { color: colors.textSub }]}>מעקב שקוף אחר שכר דירה, חיובים ואישורי תשלומים הדדיים.</Text>
        </View>

        {/* BENTO HERO SECTION */}
        <View style={styles.bentoSection}>
          {nextPaymentDue ? (
            <View style={[styles.nextPaymentCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.nextPaymentHeader}>
                <View style={styles.statusBadgePending}>
                  <View style={styles.statusDotPending} />
                  <Text style={styles.statusTextPending}>
                    {nextPaymentDue.status === 'REPORTED' ? 'ממתין לאישור' : 'טרם שולם'}
                  </Text>
                </View>
                <Text style={[styles.periodLabel, { color: colors.textMut }]}>תשלום קרוב שטרם שולם</Text>
              </View>
              
              <Text style={[styles.nextPaymentAmount, { color: colors.text }]}>
                ₪{(parseFloat(nextPaymentDue.amount) + parseFloat(nextPaymentDue.cpiAdjustment || 0)).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
              </Text>

              <View style={[styles.nextPaymentMetaRow, { borderTopColor: colors.border }]}>
                <View style={styles.metaCol}>
                  <Text style={[styles.metaLabel, { color: colors.textMut }]}>שיטת תשלום</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>העברה בנקאית / Bit</Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={[styles.metaLabel, { color: colors.textMut }]}>תאריך יעד</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>{formatDate(nextPaymentDue.dueDate)}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.allPaidCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Ionicons name="checkmark-circle" size={40} color={C.success} />
              <Text style={[styles.allPaidTitle, { color: colors.text }]}>כל התשלומים שולמו במלואם! 🎉</Text>
              <Text style={[styles.allPaidSub, { color: colors.textSub }]}>אין תשלומים פתוחים או בפיגור בספר זה.</Text>
            </View>
          )}

          {/* CPI LINKAGE INFO CARD */}
          <View style={[styles.cpiCard, { backgroundColor: colors.isDark ? colors.surface : '#1e293b' }]}>
            <View style={styles.cpiHeader}>
              <Ionicons name="information-circle-outline" size={20} color="#ffffff" />
              <Text style={styles.cpiTitle}>הצמדה למדד (מדד המחירים לצרכן)</Text>
            </View>
            <Text style={styles.cpiBody}>
              שכר הדירה מתעדכן מדי שנה בהתאם למדד המחירים לצרכן המתפרסם ב-16 לכל חודש, כפי שמוסכם בחוזה השכירות.
            </Text>
            <TouchableOpacity 
              style={styles.cpiCalcBtn} 
              onPress={() => setShowCpiModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.cpiCalcText}>איך זה מחושב?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* LEDGER SECTION */}
        <View style={styles.ledgerHeaderRow}>
          <Text style={[styles.ledgerTitle, { color: colors.text }]}>פירוט תשלומים תקופתיים</Text>
        </View>

        {rows.length > 0 ? (
          <View style={styles.rowsList}>
            {rows.map((row: any) => {
              const totalAmount = parseFloat(row.amount) + parseFloat(row.cpiAdjustment || 0);
              const isPaid = row.status === 'PAID';
              const isReported = row.status === 'REPORTED';
              const isOverdue = row.status === 'OVERDUE';
              
              return (
                <View key={row.id} style={[styles.rowCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <View style={styles.rowTopBar}>
                    <View style={[
                      styles.rowStatusBadge,
                      isPaid ? styles.badgePaid : (isReported ? styles.badgeReported : (isOverdue ? styles.badgeOverdue : styles.badgePending))
                    ]}>
                      <Text style={[
                        styles.rowStatusText,
                        isPaid ? styles.textPaid : (isReported ? styles.textReported : (isOverdue ? styles.textOverdue : styles.textPending))
                      ]}>
                        {isPaid ? 'שולם' : (isReported ? 'בבדיקה' : (isOverdue ? 'בפיגור' : 'ממתין'))}
                      </Text>
                    </View>
                    <Text style={[styles.rowPeriodText, { color: colors.text }]}>{formatPeriod(row.period)}</Text>
                  </View>

                  <View style={styles.rowDetails}>
                    <View style={styles.detailCol}>
                      <Text style={[styles.detailLabel, { color: colors.textSub }]}>סך הכל לתשלום</Text>
                      <Text style={[styles.detailValueBold, { color: isPaid ? C.success : colors.text }]}>
                        ₪{totalAmount.toLocaleString('he-IL')}
                      </Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={[styles.detailLabel, { color: colors.textSub }]}>הפרש מדד</Text>
                      <Text style={[styles.detailValue, { color: parseFloat(row.cpiAdjustment) > 0 ? C.danger : colors.textMut }]}>
                        {parseFloat(row.cpiAdjustment) > 0 ? `+₪${parseFloat(row.cpiAdjustment).toLocaleString()}` : '₪0'}
                      </Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={[styles.detailLabel, { color: colors.textSub }]}>שכר דירה בסיס</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>₪{parseFloat(row.amount).toLocaleString()}</Text>
                    </View>
                  </View>

                  <View style={styles.rowFooter}>
                    <Text style={[styles.rowDueDate, { color: colors.textSub }]}>תאריך יעד: {formatDate(row.dueDate)}</Text>
                    
                    {row.status !== 'PAID' && user?.role === 'tenant' && (
                      <TouchableOpacity 
                        onPress={() => handleReport(row.id)} 
                        style={styles.rowActionBtn}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="cloud-upload-outline" size={14} color="#ffffff" style={{ marginLeft: 6 }} />
                        <Text style={styles.rowActionBtnText}>דווח ששולם</Text>
                      </TouchableOpacity>
                    )}

                    {row.status === 'REPORTED' && user?.role === 'landlord' && (
                      <TouchableOpacity 
                        onPress={() => handleConfirm(row.id)} 
                        style={styles.rowConfirmBtn}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark-circle-outline" size={14} color="#ffffff" style={{ marginLeft: 6 }} />
                        <Text style={styles.rowConfirmBtnText}>אשר קבלה</Text>
                      </TouchableOpacity>
                    )}

                    {isPaid && (
                      <View style={styles.receiptRow}>
                        <Ionicons name="document-text-outline" size={16} color={dirApp.secondary} style={{ marginLeft: 4 }} />
                        <Text style={styles.receiptLinkText}>קבלה מאושרת</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMut} />
            <Text style={[styles.emptyText, { color: colors.textSub }]}>אין שורות תשלום רשומות לחוזה זה.</Text>
          </View>
        )}

        {/* HELP SECTION */}
        <View style={[styles.helpSection, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.helpHeader}>
            <View style={styles.helpIconContainer}>
              <Ionicons name="help-buoy-outline" size={20} color={dirApp.secondary} />
            </View>
            <Text style={[styles.helpTitle, { color: colors.text }]}>צריך עזרה בנוגע לתשלום?</Text>
          </View>
          <Text style={[styles.helpBody, { color: colors.textSub }]}>
            צוות הכספים שלנו בודק את אישורי ההעברות תוך 24 שעות עבודה. אם מצאת אי התאמה כלשהי בחישוב המדד, אנא פתח פנייה.
          </Text>
          <TouchableOpacity style={styles.helpLinkBtn}>
            <Ionicons name="arrow-back" size={16} color={dirApp.secondary} style={{ marginRight: 4 }} />
            <Text style={styles.helpLinkText}>פתיחת קריאת שירות</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* CPI EXPLANATION MODAL */}
      <Modal
        visible={showCpiModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCpiModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBgDismiss} 
            activeOpacity={1} 
            onPress={() => setShowCpiModal(false)} 
          />
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCpiModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>כללי הצמדה למדד (מדד הבסיס)</Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.modalText, { color: colors.textSub }]}>
                בהתאם לסעיף 4.2 בחוזה השכירות, שכר הדירה החודשי צמוד למדד המחירים לצרכן (המדד הידוע של הלשכה המרכזית לסטטיסטיקה).
              </Text>

              {/* CALCULATION GRID */}
              <View style={[styles.calcGrid, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <View style={styles.calcRow}>
                  <Text style={[styles.calcVal, { color: colors.text }]}>104.2 (ינואר 2026)</Text>
                  <Text style={[styles.calcLabel, { color: colors.textSub }]}>מדד בסיס בחוזה:</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={[styles.calcVal, { color: colors.text }]}>106.3 (ספטמבר 2026)</Text>
                  <Text style={[styles.calcLabel, { color: colors.textSub }]}>מדד נוכחי ידוע:</Text>
                </View>
                <View style={[styles.calcRowTotal, { borderTopColor: colors.border }]}>
                  <Text style={styles.calcValTotal}>+2.01%</Text>
                  <Text style={styles.calcLabelTotal}>הפרש הצמדה שנתי:</Text>
                </View>
              </View>

              <Text style={[styles.modalFootnote, { color: colors.textSub }]}>
                התאמות שכר הדירה מתבצעות אוטומטית לפי הפרסום הרשמי ב-16 לכל חודש. במידה ומדד המחירים יורד (מדד שלילי), שכר הדירה החודשי יישאר במפלס הבסיס המקורי ולא יקטן מתחת למחיר הנקוב בחוזה.
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.modalSubmitBtn} 
              onPress={() => setShowCpiModal(false)}
              activeOpacity={0.9}
            >
              <Text style={styles.modalSubmitText}>הבנתי, תודה</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    backgroundColor: '#ffffff',
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  contentContainer: {
    padding: 16,
  },
  titleSection: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'right',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 18,
  },
  // Bento Hero Card
  bentoSection: {
    gap: 16,
    marginBottom: 24,
  },
  nextPaymentCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#002045',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  nextPaymentHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  periodLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#74777f',
    textTransform: 'uppercase',
  },
  statusBadgePending: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 93, 182, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  statusDotPending: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#005db6',
  },
  statusTextPending: {
    fontSize: 10,
    fontWeight: '700',
    color: '#005db6',
  },
  nextPaymentAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: '#002045',
    textAlign: 'right',
    marginBottom: 16,
  },
  nextPaymentMetaRow: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    borderTopColor: '#f1f2f4',
    paddingTop: 12,
    gap: 24,
  },
  metaCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontSize: 10,
    color: '#74777f',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0b1c30',
  },
  // All Paid Card
  allPaidCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  allPaidTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#002045',
  },
  allPaidSub: {
    fontSize: 12,
    color: '#74777f',
  },
  // CPI Linkage Card
  cpiCard: {
    backgroundColor: '#1a365d',
    borderRadius: 16,
    padding: 16,
  },
  cpiHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cpiTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  cpiBody: {
    fontSize: 12,
    color: '#c4c6cf',
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 12,
  },
  cpiCalcBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cpiCalcText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Ledger section headers
  ledgerHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  ledgerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  rowsList: {
    gap: 12,
    marginBottom: 20,
  },
  rowCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  rowTopBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowPeriodText: {
    fontSize: 14,
    fontWeight: '800',
  },
  rowStatusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgePaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  badgeReported: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  badgeOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  badgePending: {
    backgroundColor: 'rgba(116, 119, 127, 0.08)',
  },
  rowStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textPaid: { color: C.success },
  textReported: { color: '#f59e0b' },
  textOverdue: { color: C.danger },
  textPending: { color: '#74777f' },
  rowDetails: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f4',
    gap: 8,
  },
  detailCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  detailLabel: {
    fontSize: 9,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailValueBold: {
    fontSize: 14,
    fontWeight: '800',
  },
  rowFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  rowDueDate: {
    fontSize: 11,
  },
  rowActionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: dirApp.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rowActionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  rowConfirmBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: C.success,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rowConfirmBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  receiptRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  receiptLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: dirApp.secondary,
  },
  emptyBox: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c4c6cf',
    borderStyle: 'dashed',
    borderRadius: 16,
    gap: 8,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 13,
  },
  // Help Section
  helpSection: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  helpHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  helpIconContainer: {
    backgroundColor: '#eff4ff',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  helpBody: {
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 10,
  },
  helpLinkBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  helpLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: dirApp.secondary,
  },
  // Skeletons
  skeletonCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  skeletonRowCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  // Modal Style
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 32, 69, 0.4)',
    justifyContent: 'flex-end',
  },
  modalBgDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
    shadowColor: '#002045',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f4',
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalBody: {
    gap: 16,
  },
  modalText: {
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 20,
  },
  calcGrid: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calcLabel: {
    fontSize: 12,
  },
  calcVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  calcRowTotal: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calcLabelTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#002045',
  },
  calcValTotal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#006b5f',
  },
  modalFootnote: {
    fontSize: 11,
    textAlign: 'right',
    lineHeight: 16,
  },
  modalSubmitBtn: {
    backgroundColor: '#002045',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
