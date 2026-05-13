import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  SafeAreaView, ActivityIndicator, Alert, Linking, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentApi, contractsApi } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { usePersonaIsLandlord } from '../navigation/AdminAppModeContext';
import { C, Dark } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';

type PaymentStatus = 'pending' | 'initiated' | 'paid' | 'overdue' | 'cancelled';

interface RentPayment {
  _id: string;
  contractId: string;
  apartmentTitle: string;
  amount: number;
  month: string;
  dueDate: string;
  status: PaymentStatus;
  paidAt: string | null;
  paymentMethod: string | null;
}

interface Contract {
  _id: string;
  apartmentTitle: string;
  monthlyRent: number;
  status: string;
}

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending:   { label: 'ממתין',    color: C.statusTone.caution, icon: 'time-outline' },
  initiated: { label: 'בתהליך',   color: C.cyan, icon: 'hourglass-outline' },
  paid:      { label: 'שולם',     color: C.statusTone.positive, icon: 'checkmark-circle-outline' },
  overdue:   { label: 'באיחור',   color: C.statusTone.negativeSoft, icon: 'alert-circle-outline' },
  cancelled: { label: 'בוטל',     color: C.textMut, icon: 'close-circle-outline' },
};

const MONTH_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function formatMonth(ym: string): string {
  const [year, mon] = ym.split('-');
  return `${MONTH_HE[Number(mon) - 1]} ${year}`;
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + '22' }]}>
      <Ionicons name={cfg.icon} size={12} color={cfg.color} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function PaymentCard({ payment, isLandlord, onPay, onMarkPaid }: {
  payment: RentPayment;
  isLandlord: boolean;
  onPay: (payment: RentPayment) => void;
  onMarkPaid: (payment: RentPayment) => void;
}) {
  const canPay     = !isLandlord && (payment.status === 'pending' || payment.status === 'initiated' || payment.status === 'overdue');
  const canConfirm = isLandlord && payment.status !== 'paid' && payment.status !== 'cancelled';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.monthLabel}>{formatMonth(payment.month)}</Text>
          <Text style={styles.aptTitle} numberOfLines={1}>{payment.apartmentTitle}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.amount}>₪{payment.amount.toLocaleString()}</Text>
          <StatusBadge status={payment.status} />
        </View>
      </View>

      {payment.paidAt && (
        <Text style={styles.paidAt}>
          שולם ב-{new Date(payment.paidAt).toLocaleDateString('he-IL')}
          {payment.paymentMethod ? ` · ${payment.paymentMethod}` : ''}
        </Text>
      )}

      {canPay && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.bitBtn]} onPress={() => onPay(payment)}>
            <Ionicons name="phone-portrait-outline" size={14} color={C.onInverse.primary} />
            <Text style={styles.actionBtnText}>שלם עכשיו</Text>
          </TouchableOpacity>
        </View>
      )}

      {canConfirm && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.confirmBtn]} onPress={() => onMarkPaid(payment)}>
            <Ionicons name="checkmark-outline" size={14} color={C.onInverse.primary} />
            <Text style={styles.actionBtnText}>סמן כשולם</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function RentPaymentsScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const isLandlord = usePersonaIsLandlord();
  const queryClient = useQueryClient();

  const [requestModal, setRequestModal] = React.useState(false);
  const [selectedContract, setSelectedContract] = React.useState<Contract | null>(null);
  const [selectedMonth, setSelectedMonth] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['rent-payments'],
    queryFn: () => paymentApi.listRentPayments().then((r) => r.data),
  });

  const { data: contractsData } = useQuery({
    queryKey: ['contracts-for-rent'],
    queryFn: () => contractsApi.list().then((r) => r.data),
    enabled: isLandlord,
  });

  const activeContracts: Contract[] = React.useMemo(
    () => (contractsData?.contracts ?? []).filter((c: Contract) => c.status === 'active'),
    [contractsData]
  );

  const createMutation = useMutation({
    mutationFn: () => paymentApi.createRentRequest(selectedContract!._id, selectedMonth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments'] });
      setRequestModal(false);
    },
    onError: (e: any) => Alert.alert('שגיאה', e.response?.data?.error || 'לא ניתן ליצור בקשה'),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => paymentApi.markPaid(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rent-payments'] }),
    onError: (e: any) => Alert.alert('שגיאה', e.response?.data?.error || 'שגיאה בסימון תשלום'),
  });

  function handlePay(payment: RentPayment) {
    Alert.alert(
      'בחר אמצעי תשלום',
      `${formatMonth(payment.month)} · ₪${payment.amount.toLocaleString()}`,
      [
        {
          text: 'Bit',
          onPress: () => paymentApi.initiatePayment(payment._id, 'bit').then((r) => {
            queryClient.invalidateQueries({ queryKey: ['rent-payments'] });
            Linking.openURL(r.data.paymentUrl);
          }),
        },
        {
          text: 'PayBox',
          onPress: () => paymentApi.initiatePayment(payment._id, 'paybox').then((r) => {
            queryClient.invalidateQueries({ queryKey: ['rent-payments'] });
            Linking.openURL(r.data.paymentUrl);
          }),
        },
        { text: 'ביטול', style: 'cancel' },
      ]
    );
  }

  function handleMarkPaid(payment: RentPayment) {
    Alert.alert(
      'סמן כשולם',
      `לסמן את תשלום ${formatMonth(payment.month)} כשולם?`,
      [
        { text: 'כן', onPress: () => markPaidMutation.mutate(payment._id) },
        { text: 'לא', style: 'cancel' },
      ]
    );
  }

  // Month picker: ±3 months from today
  const monthOptions = React.useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = -1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      opts.push(ym);
    }
    return opts;
  }, []);

  const payments: RentPayment[] = paymentsData?.payments ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.onInverse.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dirType.subhead]}>תשלומי שכירות</Text>
        {isLandlord && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setRequestModal(true)}>
            <Ionicons name="add" size={20} color={C.onInverse.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ResponsiveContainer style={{ flex: 1 }}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.cyan} />
          </View>
        ) : payments.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="cash-outline" size={48} color={C.textMut} />
            <Text style={[styles.emptyTitle, dirType.subhead]}>אין תשלומים עדיין</Text>
            <Text style={[styles.emptyHint, dirType.caption]}>
              {isLandlord ? 'לחץ + כדי לשלוח בקשת תשלום לשוכר' : 'תשלומי שכירות יופיעו כאן'}
            </Text>
          </View>
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={payments}
            keyExtractor={(p) => p._id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <PaymentCard
                payment={item}
                isLandlord={isLandlord}
                onPay={handlePay}
                onMarkPaid={handleMarkPaid}
              />
            )}
          />
        )}
      </ResponsiveContainer>

      {/* Request payment modal (landlord only) */}
      <Modal visible={requestModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>בקשת תשלום שכירות</Text>

            <Text style={styles.fieldLabel}>חוזה פעיל</Text>
            {activeContracts.length === 0 ? (
              <Text style={styles.noContracts}>אין חוזים פעילים</Text>
            ) : (
              activeContracts.map((c) => (
                <TouchableOpacity
                  key={c._id}
                  style={[styles.contractRow, selectedContract?._id === c._id && styles.contractRowSel]}
                  onPress={() => setSelectedContract(c)}
                >
                  <Text style={styles.contractRowText} numberOfLines={1}>{c.apartmentTitle}</Text>
                  <Text style={styles.contractRowRent}>₪{c.monthlyRent.toLocaleString()}</Text>
                </TouchableOpacity>
              ))
            )}

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>חודש</Text>
            <View style={styles.monthRow}>
              {monthOptions.map((ym) => (
                <TouchableOpacity
                  key={ym}
                  style={[styles.monthChip, selectedMonth === ym && styles.monthChipSel]}
                  onPress={() => setSelectedMonth(ym)}
                >
                  <Text style={[styles.monthChipText, selectedMonth === ym && styles.monthChipTextSel]}>
                    {formatMonth(ym)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRequestModal(false)}>
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, (!selectedContract || createMutation.isPending) && styles.sendBtnDisabled]}
                onPress={() => createMutation.mutate()}
                disabled={!selectedContract || createMutation.isPending}
              >
                {createMutation.isPending
                  ? <ActivityIndicator size="small" color={dirApp.primary} />
                  : <Text style={styles.sendBtnText}>שלח בקשה</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Dark.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Dark.surface, borderBottomWidth: 1, borderBottomColor: Dark.border,
  },
  backBtn:     { padding: 4 },
  headerTitle: { color: C.onInverse.primary, fontSize: 17, fontWeight: '700' },
  addBtn:      { backgroundColor: C.cyan, borderRadius: 20, padding: 6 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { color: C.onInverse.primary, fontSize: 16, fontWeight: '700' },
  emptyHint:  { color: C.textMut, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },

  list: { padding: 16, gap: 12 },

  card: {
    backgroundColor: Dark.surface, borderRadius: 14,
    padding: 16, gap: 8,
    borderWidth: 1,
    borderColor: Dark.border,
  },
  cardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft:  { flex: 1, gap: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  monthLabel: { color: C.onInverse.primary, fontSize: 15, fontWeight: '700' },
  aptTitle:   { color: C.textMut, fontSize: 12 },
  amount:     { color: C.cyan, fontSize: 18, fontWeight: '800' },
  paidAt:     { color: C.textMut, fontSize: 11 },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  actions:    { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  actionBtnText: { color: C.onInverse.primary, fontSize: 13, fontWeight: '700' },
  bitBtn:     { backgroundColor: C.cyan },
  confirmBtn: { backgroundColor: C.success },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: Dark.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 8,
  },
  modalTitle:   { color: C.onInverse.primary, fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'right' },
  fieldLabel:   { color: C.textMut, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  noContracts:  { color: C.coral, fontSize: 13, textAlign: 'right' },
  contractRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.navyMidAlpha(0.35), borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: 'transparent', marginTop: 6,
  },
  contractRowSel:  { borderColor: C.cyan },
  contractRowText: { color: C.onInverse.primary, fontSize: 14, flex: 1 },
  contractRowRent: { color: C.cyan, fontSize: 14, fontWeight: '700' },
  monthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  monthChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: C.navyMidAlpha(0.35), borderWidth: 1.5, borderColor: 'transparent',
  },
  monthChipSel:     { borderColor: C.cyan },
  monthChipText:    { color: C.textMut, fontSize: 12 },
  monthChipTextSel: { color: C.cyan, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn:    { flex: 1, padding: 14, borderRadius: 12, backgroundColor: C.navyMidAlpha(0.35), alignItems: 'center' },
  cancelBtnText: { color: C.textMut, fontWeight: '700' },
  sendBtn:        { flex: 2, padding: 14, borderRadius: 12, backgroundColor: C.cyan, alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText:     { color: dirApp.primary, fontWeight: '800', fontSize: 15 },
});
