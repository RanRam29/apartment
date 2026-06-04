import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContractStore } from '../store/useContractStore';
import { useAuthStore } from '../store/useAuthStore';
import { showAlert } from '../utils/alert';
import { C } from '../theme';
import { dirType } from '../theme/textStyles';
import { dirApp } from '../theme/dirAppTokens';
import { useColors } from '../context/ThemeContext';
import { fontFamily } from '../theme/fonts';

const { width: W } = Dimensions.get('window');

const AMENDMENT_FIELDS = [
  { key: 'monthlyRentIls', label: 'שכר דירה חודשי (₪)' },
  { key: 'paymentDueDay', label: 'יום תשלום חודשי' },
  { key: 'startDate', label: 'תאריך התחלה' },
  { key: 'endDate', label: 'תאריך סיום' },
];

function LeaseWizardStepTrack({ contract, colors }: { contract: any; colors: any }) {
  // Check conditions for each of the 5 Lease Onboarding steps
  const isStep1Done = true; // Property details is always done if the contract exists
  const isStep2Done = !!(contract.monthlyRentIls || contract.monthlyRent) && !!contract.startDate;
  const isStep3Done = !!contract.depositMonths || contract.depositStatus !== 'pending';
  const isStep4Done = true; // Legal Declarations are accepted by default on generation
  const isStep5Done = contract.status === 'ACTIVE' || (!!contract.tenantSignedAt && !!contract.landlordSignedAt);

  const steps = [
    { label: 'פרטי נכס', done: isStep1Done, icon: 'home-outline' },
    { label: 'תנאי שכירות', done: isStep2Done, icon: 'calendar-outline' },
    { label: 'ערבונות', done: isStep3Done, icon: 'shield-checkmark-outline' },
    { label: 'הצהרות', done: isStep4Done, icon: 'document-text-outline' },
    { label: 'חתימה', done: isStep5Done, icon: 'pencil-outline' },
  ];

  return (
    <View style={[styles.stepTrackContainer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Text style={[styles.stepTrackTitle, { color: colors.text }]}>בדיקת שלבי החוזה (Lease Wizard)</Text>
      <View style={styles.stepTrackRow}>
        {steps.map((s, idx) => (
          <React.Fragment key={idx}>
            <View style={styles.stepTrackNode}>
              <View style={[
                styles.stepTrackBubble,
                s.done ? styles.stepTrackBubbleDone : styles.stepTrackBubblePending
              ]}>
                <Ionicons 
                  name={s.done ? 'checkmark' : (s.icon as any)} 
                  size={14} 
                  color={s.done ? '#ffffff' : dirApp.outline} 
                />
              </View>
              <Text style={[
                styles.stepTrackLabel,
                s.done ? [styles.stepTrackLabelDone, { color: '#10b981' }] : [styles.stepTrackLabelPending, { color: colors.textMut }]
              ]}>
                {s.label}
              </Text>
            </View>
            {idx < steps.length - 1 && (
              <View style={[
                styles.stepTrackConnector,
                s.done && steps[idx + 1].done ? styles.stepTrackConnectorDone : [styles.stepTrackConnectorPending, { backgroundColor: colors.border }]
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

export default function ContractDetailScreen({ route, navigation }: any) {
  const colors = useColors();
  const { contractId } = route.params || {};
  const {
    activeContract,
    fetchContract,
    signContract,
    proposeAmendment,
    approveAmendment,
    rejectAmendment,
    isLoading,
  } = useContractStore();
  const { user } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedField, setSelectedField] = useState('monthlyRentIls');
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');

  const isLandlord = user?.activeRole === 'landlord' || user?.role === 'landlord';

  useEffect(() => {
    if (contractId) {
      fetchContract(contractId).catch((err) => {
        showAlert('שגיאה', 'טעינת החוזה נכשלה.');
      });
    }
  }, [contractId]);

  const handleSign = async () => {
    try {
      await signContract(contractId);
      showAlert('הצלחה', 'חתמת על החוזה בהצלחה!');
    } catch (err: any) {
      showAlert('שגיאה', err?.message || 'החתימה נכשלה.');
    }
  };

  const handleInviteGuarantor = () => {
    if (Platform.OS === 'web') {
      const email = window.prompt('הזמנת ערב לחוזה\n\nהזן את כתובת האימייל של הערב המיועד:');
      if (email) {
        showAlert('הושלם בהצלחה', `הזמנת ערבות משפטית נשלחה לכתובת ${email}.`);
      }
      return;
    }
    Alert.prompt(
      'הזמנת ערב לחוזה',
      'הזן את כתובת האימייל של הערב המיועד:',
      [
        {
          text: 'ביטול',
          style: 'cancel',
        },
        {
          text: 'שלח הזמנה',
          onPress: (email) => {
            if (!email) return;
            showAlert('הושלם בהצלחה', `הזמנת ערבות משפטית נשלחה לכתובת ${email}.`);
          },
        },
      ],
      'plain-text',
      ''
    );
  };

  const handlePropose = async () => {
    if (!newValue.trim()) {
      showAlert('שגיאה', 'יש להזין ערך חדש להצעה.');
      return;
    }
    try {
      await proposeAmendment(contractId, selectedField, newValue, reason);
      showAlert('הצלחה', 'הצעת השינוי נשלחה בהצלחה וממתינה לאישור הצד השני.');
      setIsModalOpen(false);
      setNewValue('');
      setReason('');
    } catch (err: any) {
      showAlert('שגיאה', err?.message || 'הצעת השינוי נכשלה.');
    }
  };

  const handleApprove = async (aId: string) => {
    try {
      await approveAmendment(contractId, aId);
      showAlert('הצלחה', 'אישרת את הצעת השינוי בהצלחה! החוזה עודכן.');
    } catch (err: any) {
      showAlert('שגיאה', err?.message || 'אישור ההצעה נכשל.');
    }
  };

  const handleReject = async (aId: string) => {
    try {
      await rejectAmendment(contractId, aId);
      showAlert('הצלחה', 'דחית את הצעת השינוי.');
    } catch (err: any) {
      showAlert('שגיאה', err?.message || 'דחיית ההצעה נכשלה.');
    }
  };

  if (isLoading || !activeContract) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={dirApp.primary} />
        <Text style={[styles.loadingText, { color: colors.textMut }]}>טוען פרטי חוזה מורחבים...</Text>
      </View>
    );
  }

  const amendments = activeContract.amendments || [];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color={dirApp.primary} />
        </TouchableOpacity>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>סטטוס: {activeContract.status}</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>פרטי חוזה שכירות דיגיטלי</Text>

      <LeaseWizardStepTrack contract={activeContract} colors={colors} />

      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={styles.detailRow}>
          <Text style={[styles.value, { color: colors.text }]}>₪{activeContract.monthlyRentIls?.toLocaleString() || activeContract.monthlyRent?.toLocaleString()}</Text>
          <Text style={[styles.label, { color: colors.textMut }]}>שכר דירה חודשי:</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.value, { color: colors.text }]}>{activeContract.startDate}</Text>
          <Text style={[styles.label, { color: colors.textMut }]}>תאריך התחלה:</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.value, { color: colors.text }]}>{activeContract.endDate}</Text>
          <Text style={[styles.label, { color: colors.textMut }]}>תאריך סיום:</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.value, { color: colors.text }]}>{activeContract.paymentDueDay || 1} בחודש</Text>
          <Text style={[styles.label, { color: colors.textMut }]}>יום תשלום חודשי:</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.value, { color: colors.text }]}>{activeContract.depositMonths || 2} חודשים</Text>
          <Text style={[styles.label, { color: colors.textMut }]}>ערבונות/פקדונות:</Text>
        </View>
      </View>

      {/* Amendments Section */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>שינויים ונספחים בחוזה</Text>
        {activeContract.status === 'ACTIVE' && (
          <TouchableOpacity
            style={[styles.proposeBtn, { backgroundColor: `${dirApp.primary}22` }]}
            onPress={() => setIsModalOpen(true)}
          >
            <Ionicons name="create-outline" size={16} color={dirApp.primary} />
            <Text style={[styles.proposeBtnText, { color: dirApp.primary }]}>הצע שינוי בחוזה</Text>
          </TouchableOpacity>
        )}
      </View>

      {amendments.length > 0 ? (
        <View style={styles.amendmentsList}>
          {amendments.map((amendment: any) => {
            const fieldLabel = AMENDMENT_FIELDS.find(f => f.key === amendment.field)?.label || amendment.field;
            const isProposer = (amendment.proposedBy === 'landlord' && isLandlord) || (amendment.proposedBy === 'tenant' && !isLandlord);
            const isPending = amendment.status === 'pending';

            return (
              <View key={amendment.id} style={[styles.amendmentCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={styles.amendmentHeader}>
                  <View style={[styles.statusPill, {
                    backgroundColor: amendment.status === 'approved' ? `${C.success}22` : (amendment.status === 'rejected' ? `${C.danger}22` : `${C.warning}22`)
                  }]}>
                    <Text style={[styles.statusPillText, {
                      color: amendment.status === 'approved' ? C.success : (amendment.status === 'rejected' ? C.danger : C.warning)
                    }]}>
                      {amendment.status === 'approved' ? 'אושר' : (amendment.status === 'rejected' ? 'נדחה' : 'ממתין לאישור')}
                    </Text>
                  </View>
                  <Text style={[styles.amendmentTitle, { color: colors.text }]}>{fieldLabel}</Text>
                </View>

                <View style={styles.amendmentValues}>
                  <Text style={[styles.oldValue, { color: colors.textMut }]}>הערך הקודם: {amendment.oldValue}</Text>
                  <Ionicons name="arrow-back" size={16} color={dirApp.primary} style={styles.arrowIcon} />
                  <Text style={[styles.newValue, { color: colors.text }]}>הערך החדש: {amendment.newValue}</Text>
                </View>

                {amendment.reason ? (
                  <Text style={[styles.amendmentReason, { color: colors.textMut }]}>סיבה: {amendment.reason}</Text>
                ) : null}

                {isPending && !isProposer && (
                  <View style={styles.bannerContainer}>
                    <Text style={[styles.bannerText, { color: colors.text }]}>ממתין לאישורך:</Text>
                    <View style={styles.bannerActions}>
                      <TouchableOpacity
                        style={[styles.bannerBtn, styles.approveBtn]}
                        onPress={() => handleApprove(amendment.id)}
                      >
                        <Text style={styles.bannerBtnText}>אשר שינוי</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.bannerBtn, styles.rejectBtn]}
                        onPress={() => handleReject(amendment.id)}
                      >
                        <Text style={styles.bannerBtnText}>דחה שינוי</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {isPending && isProposer && (
                  <Text style={[styles.waitingText, { color: colors.textMut }]}>
                    ממתין לאישור הצד השני...
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={[styles.emptyAmendments, { backgroundColor: 'rgba(255, 255, 255, 0.01)', borderColor: colors.border }]}>
          <Text style={[styles.emptyAmendmentsText, { color: colors.textMut }]}>
            טרם הוצעו שינויים או תיקונים לחוזה זה.
          </Text>
        </View>
      )}

      <View style={styles.buttonGroup}>
        {activeContract.status === 'PENDING_SIGNATURE' && (
          <TouchableOpacity onPress={handleSign} style={styles.primaryBtn}>
            <Text style={styles.btnText}>חתום על החוזה</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleInviteGuarantor} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>הזמן ערב לחוזה</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('CheckIn', { contractId })}
          style={styles.outlineBtn}
        >
          <Text style={[styles.outlineBtnText, { color: colors.text }]}>עבור לצ׳ק-אין (תמונות חדרים)</Text>
        </TouchableOpacity>
      </View>

      {/* Propose Amendment Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>הצעת שינוי בחוזה השכירות</Text>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>בחר את הסעיף לשינוי:</Text>
            <View style={styles.fieldsRow}>
              {AMENDMENT_FIELDS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.fieldPill,
                    selectedField === f.key ? { backgroundColor: dirApp.primary } : { backgroundColor: 'rgba(255,255,255,0.05)' }
                  ]}
                  onPress={() => setSelectedField(f.key)}
                >
                  <Text style={[
                    styles.fieldPillText,
                    selectedField === f.key ? { color: '#ffffff' } : { color: colors.textMut }
                  ]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>ערך חדש מבוקש:</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={newValue}
              onChangeText={setNewValue}
              placeholder="הזן את השינוי (לדוגמה: 6200 או 10)"
              placeholderTextColor={colors.textMut}
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>סיבת הבקשה לשינוי:</Text>
            <TextInput
              style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]}
              value={reason}
              onChangeText={setReason}
              placeholder="פרט את הסיבה לבקשת השינוי..."
              placeholderTextColor={colors.textMut}
              multiline={true}
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: dirApp.primary }]}
                onPress={handlePropose}
              >
                <Text style={styles.modalBtnText}>שלח הצעה</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }]}
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 60,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(95, 92, 229, 0.15)',
    borderWidth: 1,
    borderColor: '#5f5ce5',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 24,
    textAlign: 'right',
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  proposeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  proposeBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  amendmentsList: {
    gap: 12,
    marginBottom: 30,
  },
  amendmentCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  amendmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amendmentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  amendmentValues: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  oldValue: {
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  arrowIcon: {
    transform: [{ rotate: '180deg' }],
  },
  newValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  amendmentReason: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 16,
  },
  bannerContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 12,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 8,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bannerBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: C.success,
  },
  rejectBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C.danger,
  },
  bannerBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  waitingText: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyAmendments: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  emptyAmendmentsText: {
    fontSize: 13,
    textAlign: 'center',
  },
  buttonGroup: {
    gap: 12,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: '#5f5ce5',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    height: 52,
    backgroundColor: '#10b981',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  outlineBtn: {
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: W - 40,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  fieldsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  fieldPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  fieldPillText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    textAlign: 'right',
    marginBottom: 16,
    fontSize: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  textArea: {
    height: 80,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepTrackContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  stepTrackTitle: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    marginBottom: 16,
    textAlign: 'right',
  },
  stepTrackRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepTrackNode: {
    alignItems: 'center',
    flex: 1,
  },
  stepTrackBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1.5,
  },
  stepTrackBubbleDone: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  stepTrackBubblePending: {
    backgroundColor: 'transparent',
    borderColor: dirApp.outline,
  },
  stepTrackLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  stepTrackLabelDone: {
    fontFamily: fontFamily.medium,
  },
  stepTrackLabelPending: {
    fontFamily: fontFamily.regular,
  },
  stepTrackConnector: {
    height: 2,
    flex: 0.8,
    marginTop: -16,
  },
  stepTrackConnectorDone: {
    backgroundColor: '#10b981',
  },
  stepTrackConnectorPending: {
    backgroundColor: dirApp.outlineVariant,
  },
});
