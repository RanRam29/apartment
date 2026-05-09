import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { contractsApi } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import type { MainStackParamList } from '../types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

type ContractStatus = 'draft' | 'pending_tenant' | 'pending_landlord' | 'active' | 'terminated';
type DepositStatus  = 'pending' | 'held' | 'released' | 'forfeited';

interface Contract {
  _id: string;
  matchId: string;
  tenantId: string;
  landlordId: string;
  apartmentTitle: string;
  apartmentAddress: string;
  tenantName: string;
  landlordName: string;
  monthlyRent: number;
  depositAmount: number;
  depositMonths: number;
  startDate: string;
  endDate: string;
  customClauses?: string;
  status: ContractStatus;
  depositStatus: DepositStatus;
  tenantSignedAt: string | null;
  landlordSignedAt: string | null;
  depositPaidAt: string | null;
  depositSettledAt: string | null;
}

const STATUS_META: Record<ContractStatus, { label: string; color: string; icon: string }> = {
  draft:             { label: 'טיוטה',          color: '#A0A0B2', icon: '📝' },
  pending_tenant:    { label: 'ממתין לחתימת שוכר', color: '#F39C12', icon: '⏳' },
  pending_landlord:  { label: 'ממתין לחתימת משכיר', color: '#F39C12', icon: '⏳' },
  active:            { label: 'פעיל',            color: '#00C9A7', icon: '✅' },
  terminated:        { label: 'בוטל',            color: '#FF7675', icon: '❌' },
};

const DEPOSIT_META: Record<DepositStatus, { label: string; color: string }> = {
  pending:   { label: 'פיקדון: טרם שולם', color: '#A0A0B2' },
  held:      { label: 'פיקדון: נמצא בנאמנות', color: '#6C5CE7' },
  released:  { label: 'פיקדון: הוחזר', color: '#00C9A7' },
  forfeited: { label: 'פיקדון: חולט', color: '#FF7675' },
};

function ContractCard({ contract, onPress }: { contract: Contract; onPress: () => void }) {
  const sm = STATUS_META[contract.status];
  const dm = DEPOSIT_META[contract.depositStatus];
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>{contract.apartmentTitle}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${sm.color}22` }]}>
          <Text style={[styles.statusText, { color: sm.color }]}>{sm.icon} {sm.label}</Text>
        </View>
      </View>
      <Text style={styles.cardSub}>{contract.apartmentAddress}</Text>
      <Text style={styles.cardRent}>₪{contract.monthlyRent.toLocaleString()}/חודש</Text>
      <View style={styles.cardBottom}>
        <Text style={[styles.depositText, { color: dm.color }]}>{dm.label}</Text>
        <Text style={styles.cardDate}>
          {new Date(contract.startDate).toLocaleDateString('he-IL')} – {new Date(contract.endDate).toLocaleDateString('he-IL')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ContractDetailModal({
  contract,
  contractText,
  visible,
  onClose,
  isLandlord,
  onSign,
  onDeposit,
  signing,
  depositing,
}: {
  contract: Contract;
  contractText: string;
  visible: boolean;
  onClose: () => void;
  isLandlord: boolean;
  onSign: () => void;
  onDeposit: (action: 'mark_paid' | 'release' | 'forfeit') => void;
  signing: boolean;
  depositing: boolean;
}) {
  const alreadySigned = isLandlord ? !!contract.landlordSignedAt : !!contract.tenantSignedAt;
  const canSign = !alreadySigned && contract.status !== 'active' && contract.status !== 'terminated';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>חוזה שכירות</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView style={styles.contractScroll} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <Text style={styles.contractText}>{contractText}</Text>
        </ScrollView>

        <View style={styles.modalActions}>
          {canSign && (
            <TouchableOpacity
              style={[styles.signBtn, signing && styles.btnDisabled]}
              disabled={signing}
              onPress={onSign}
            >
              {signing
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="pencil" size={16} color="#fff" /><Text style={styles.signBtnText}>חתום על החוזה</Text></>
              }
            </TouchableOpacity>
          )}

          {alreadySigned && (
            <View style={styles.signedNote}>
              <Ionicons name="checkmark-circle" size={18} color="#00C9A7" />
              <Text style={styles.signedNoteText}>חתמת על החוזה</Text>
            </View>
          )}

          {isLandlord && contract.status === 'active' && (
            <View style={styles.depositRow}>
              {contract.depositStatus === 'pending' && (
                <TouchableOpacity
                  style={[styles.depositBtn, styles.depositBtnHold, depositing && styles.btnDisabled]}
                  disabled={depositing}
                  onPress={() => onDeposit('mark_paid')}
                >
                  <Text style={styles.depositBtnText}>סמן פיקדון כשולם</Text>
                </TouchableOpacity>
              )}
              {contract.depositStatus === 'held' && (
                <>
                  <TouchableOpacity
                    style={[styles.depositBtn, styles.depositBtnRelease, depositing && styles.btnDisabled]}
                    disabled={depositing}
                    onPress={() => onDeposit('release')}
                  >
                    <Text style={styles.depositBtnText}>החזר פיקדון</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.depositBtn, styles.depositBtnForfeit, depositing && styles.btnDisabled]}
                    disabled={depositing}
                    onPress={() => Alert.alert('חילוט פיקדון', 'האם לחלט את הפיקדון?', [
                      { text: 'ביטול', style: 'cancel' },
                      { text: 'חלט', style: 'destructive', onPress: () => onDeposit('forfeit') },
                    ])}
                  >
                    <Text style={styles.depositBtnText}>חלט פיקדון</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function ContractsScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isLandlord = user?.role === 'landlord';

  const [selected, setSelected] = React.useState<{ contract: Contract; text: string } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.list().then((r) => r.data),
  });

  const contracts: Contract[] = data?.contracts ?? [];

  const signMutation = useMutation({
    mutationFn: (id: string) => contractsApi.sign(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setSelected({ contract: res.data.contract, text: res.data.contractText });
      Alert.alert('✅ נחתם', 'החוזה נחתם בהצלחה');
    },
    onError: () => Alert.alert('שגיאה', 'לא ניתן לחתום על החוזה'),
  });

  const depositMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'mark_paid' | 'release' | 'forfeit' }) =>
      contractsApi.updateDeposit(id, action),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setSelected({ contract: res.data.contract, text: selected?.text ?? '' });
    },
    onError: () => Alert.alert('שגיאה', 'לא ניתן לעדכן את הפיקדון'),
  });

  async function openContract(contract: Contract) {
    try {
      const res = await contractsApi.getById(contract._id);
      setSelected({ contract: res.data.contract, text: res.data.contractText });
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לטעון את החוזה');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>חוזים</Text>
        <View style={{ width: 38 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color="#6C5CE7" style={{ marginTop: 40 }} />
      ) : contracts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={56} color="#3A3A5E" />
          <Text style={styles.emptyText}>אין חוזים עדיין</Text>
          {isLandlord && (
            <Text style={styles.emptyHint}>צור חוזה מדף ההתאמות לאחר קבלת שוכר</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={contracts}
          keyExtractor={(c) => c._id}
          renderItem={({ item }) => (
            <ContractCard contract={item} onPress={() => openContract(item)} />
          )}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}

      {selected && (
        <ContractDetailModal
          contract={selected.contract}
          contractText={selected.text}
          visible={!!selected}
          onClose={() => setSelected(null)}
          isLandlord={isLandlord}
          onSign={() => signMutation.mutate(selected.contract._id)}
          onDeposit={(action) => depositMutation.mutate({ id: selected.contract._id, action })}
          signing={signMutation.isPending}
          depositing={depositMutation.isPending}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2A2A3E', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  list: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#2A2A3E', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 15, flex: 1, textAlign: 'right', marginLeft: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardSub: { color: '#A0A0B2', fontSize: 12, textAlign: 'right', marginBottom: 4 },
  cardRent: { color: '#6C5CE7', fontWeight: '800', fontSize: 15, textAlign: 'right', marginBottom: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  depositText: { fontSize: 11, fontWeight: '600' },
  cardDate: { color: '#6A6A7E', fontSize: 11 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { color: '#A0A0B2', fontSize: 16, fontWeight: '600' },
  emptyHint: { color: '#6A6A7E', fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#1A1A2E' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2A2A3E' },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2A2A3E', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  contractScroll: { flex: 1 },
  contractText: { color: '#C0C0D0', fontSize: 13, lineHeight: 22, fontFamily: 'monospace', textAlign: 'right' },
  modalActions: { padding: 16, borderTopWidth: 1, borderTopColor: '#2A2A3E', gap: 10 },
  signBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6C5CE7', paddingVertical: 14, borderRadius: 14 },
  signBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  signedNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  signedNoteText: { color: '#00C9A7', fontWeight: '700', fontSize: 14 },
  depositRow: { flexDirection: 'row', gap: 8 },
  depositBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  depositBtnHold:    { backgroundColor: '#6C5CE7' },
  depositBtnRelease: { backgroundColor: '#00C9A7' },
  depositBtnForfeit: { backgroundColor: '#FF7675' },
  depositBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnDisabled: { opacity: 0.6 },
});
