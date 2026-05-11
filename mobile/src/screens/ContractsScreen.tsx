import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, Modal, ScrollView, TextInput, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { addYears, format } from 'date-fns';
import { contractsApi, matchesApi } from '../services/api';
import { getApiBaseUrl } from '../services/apiConfig';
import { useAuthStore } from '../store/useAuthStore';
import type { MainStackParamList, Match } from '../types';
import { C, Dark } from '../theme';

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
  hasUploadedDocument?: boolean;
  uploadedDocumentOriginalName?: string | null;
}

const STATUS_META: Record<ContractStatus, { label: string; color: string; icon: string }> = {
  draft:             { label: 'טיוטה',          color: C.textMut, icon: '📝' },
  pending_tenant:    { label: 'ממתין לחתימת שוכר', color: C.statusTone.caution, icon: '⏳' },
  pending_landlord:  { label: 'ממתין לחתימת משכיר', color: C.statusTone.caution, icon: '⏳' },
  active:            { label: 'פעיל',            color: C.statusTone.positive, icon: '✅' },
  terminated:        { label: 'בוטל',            color: C.statusTone.negativeSoft, icon: '❌' },
};

const DEPOSIT_META: Record<DepositStatus, { label: string; color: string }> = {
  pending:   { label: 'פיקדון: טרם שולם', color: C.textMut },
  held:      { label: 'פיקדון: נמצא בנאמנות', color: C.cyan },
  released:  { label: 'פיקדון: הוחזר', color: C.statusTone.positive },
  forfeited: { label: 'פיקדון: חולט', color: C.statusTone.negativeSoft },
};

function ContractCard({ contract, onPress }: { contract: Contract; onPress: () => void }) {
  const sm = STATUS_META[contract.status];
  const dm = DEPOSIT_META[contract.depositStatus];
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>{contract.apartmentTitle}</Text>
        <View style={styles.cardBadges}>
          {contract.hasUploadedDocument && (
            <View style={styles.fileBadge}>
              <Ionicons name="attach" size={11} color={C.cyan} />
              <Text style={styles.fileBadgeText}>קובץ</Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: `${sm.color}22` }]}>
            <Text style={[styles.statusText, { color: sm.color }]}>{sm.icon} {sm.label}</Text>
          </View>
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
  authToken,
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
  authToken: string | null;
}) {
  const [docViewerOpen, setDocViewerOpen] = React.useState(false);
  const [webBlobUrl, setWebBlobUrl] = React.useState<string | null>(null);
  const [webDocLoading, setWebDocLoading] = React.useState(false);
  const webBlobRef = React.useRef<string | null>(null);
  const attachmentUri = `${getApiBaseUrl()}/api/contracts/${contract._id}/attachment`;

  React.useEffect(() => {
    if (!visible) setDocViewerOpen(false);
  }, [visible]);

  React.useEffect(() => {
    if (!docViewerOpen || Platform.OS !== 'web' || !authToken) {
      if (webBlobRef.current) {
        URL.revokeObjectURL(webBlobRef.current);
        webBlobRef.current = null;
      }
      setWebBlobUrl(null);
      setWebDocLoading(false);
      return;
    }

    let cancelled = false;
    setWebDocLoading(true);

    fetch(attachmentUri, { headers: { Authorization: `Bearer ${authToken}` } })
      .then((res) => {
        if (!res.ok) throw new Error('bad response');
        return res.blob();
      })
      .then((blob) => {
        const u = URL.createObjectURL(blob);
        if (webBlobRef.current) URL.revokeObjectURL(webBlobRef.current);
        webBlobRef.current = u;
        if (!cancelled) setWebBlobUrl(u);
      })
      .catch(() => {
        if (!cancelled) setWebBlobUrl(null);
      })
      .finally(() => {
        if (!cancelled) setWebDocLoading(false);
      });

    return () => {
      cancelled = true;
      if (webBlobRef.current) {
        URL.revokeObjectURL(webBlobRef.current);
        webBlobRef.current = null;
      }
      setWebBlobUrl(null);
    };
  }, [docViewerOpen, authToken, attachmentUri]);

  const alreadySigned = isLandlord ? !!contract.landlordSignedAt : !!contract.tenantSignedAt;
  const canSign = !alreadySigned && contract.status !== 'active' && contract.status !== 'terminated';

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={C.onInverse.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>חוזה שכירות</Text>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView style={styles.contractScroll} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            {contract.hasUploadedDocument && authToken && (
              <TouchableOpacity
                style={styles.openDocBtn}
                onPress={() => setDocViewerOpen(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="document-attach" size={18} color={C.onInverse.primary} />
                <Text style={styles.openDocBtnText}>
                  צפה במסמך ({contract.uploadedDocumentOriginalName ?? 'PDF / Word'})
                </Text>
              </TouchableOpacity>
            )}
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
                  ? <ActivityIndicator color={C.onInverse.primary} />
                  : <><Ionicons name="pencil" size={16} color={C.navy} /><Text style={styles.signBtnText}>חתום על החוזה</Text></>
                }
              </TouchableOpacity>
            )}

            {alreadySigned && (
              <View style={styles.signedNote}>
                <Ionicons name="checkmark-circle" size={18} color={C.statusTone.positive} />
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

      <Modal visible={docViewerOpen} animationType="slide" onRequestClose={() => setDocViewerOpen(false)}>
        <SafeAreaView style={styles.docViewerWrap}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDocViewerOpen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={C.onInverse.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>מסמך חוזה</Text>
            <View style={{ width: 38 }} />
          </View>
          {authToken ? (
            Platform.OS === 'web' ? (
              webDocLoading ? (
                <View style={styles.webViewCenter}>
                  <ActivityIndicator size="large" color={C.cyan} />
                  <Text style={styles.docViewerFallback}>טוען מסמך…</Text>
                </View>
              ) : webBlobUrl ? (
                React.createElement('iframe', {
                  src: webBlobUrl,
                  title: 'מסמך חוזה',
                  style: {
                    flex: 1,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    minHeight: 400,
                  },
                })
              ) : (
                <Text style={styles.docViewerFallback}>לא ניתן לטעון את המסמך</Text>
              )
            ) : (
              <WebView
                style={styles.webView}
                source={{
                  uri: attachmentUri,
                  headers: { Authorization: `Bearer ${authToken}` },
                }}
              />
            )
          ) : (
            <Text style={styles.docViewerFallback}>נדרש להתחבר מחדש כדי לצפות במסמך</Text>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

function AddContractUploadModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedMatchId, setSelectedMatchId] = React.useState<string | null>(null);
  const [monthlyRent, setMonthlyRent] = React.useState('');
  const [depositMonths, setDepositMonths] = React.useState('1');
  const [startDate, setStartDate] = React.useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = React.useState(() => format(addYears(new Date(), 1), 'yyyy-MM-dd'));
  const [pickedFile, setPickedFile] = React.useState<{ uri: string; name: string; mimeType?: string | null } | null>(null);

  const { data: matchesRaw, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches-for-contract-upload'],
    queryFn: () => matchesApi.list().then((r) => r.data.matches as Match[]),
    enabled: visible,
  });

  const accepted = React.useMemo(
    () => (matchesRaw ?? []).filter((m) => m.status === 'accepted'),
    [matchesRaw],
  );

  const wasVisible = React.useRef(false);
  React.useEffect(() => {
    if (visible && !wasVisible.current) {
      setPickedFile(null);
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate(format(addYears(new Date(), 1), 'yyyy-MM-dd'));
      setDepositMonths('1');
    }
    wasVisible.current = visible;
  }, [visible]);

  React.useEffect(() => {
    if (!visible || accepted.length === 0) return;
    setSelectedMatchId((prev) => prev ?? accepted[0].id);
    setMonthlyRent((prev) => {
      if (prev) return prev;
      const p = accepted[0].apartment?.price;
      return p != null ? String(p) : '';
    });
  }, [visible, accepted]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMatchId || !pickedFile) throw new Error('missing');
      const rent = parseInt(monthlyRent, 10);
      if (!Number.isFinite(rent) || rent < 100) throw new Error('rent');
      const dm = parseInt(depositMonths, 10);
      if (!Number.isFinite(dm) || dm < 1 || dm > 6) throw new Error('deposit');

      const form = new FormData();
      form.append('matchId', selectedMatchId);
      form.append('monthlyRent', String(rent));
      form.append('depositMonths', String(dm));
      form.append('startDate', startDate);
      form.append('endDate', endDate);
      form.append('document', {
        uri: pickedFile.uri,
        name: pickedFile.name,
        type: pickedFile.mimeType ?? 'application/pdf',
      } as unknown as never);

      return contractsApi.uploadWithDocument(form);
    },
    onSuccess: () => {
      onSuccess();
      onClose();
      Alert.alert('הושלם', 'החוזה נוסף עם הקובץ שבחרת');
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      Alert.alert('שגיאה', msg ?? 'לא ניתן להעלות את החוזה');
    },
  });

  async function pickFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const a = res.assets[0];
      setPickedFile({ uri: a.uri, name: a.name, mimeType: a.mimeType });
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לבחור קובץ');
    }
  }

  function submit() {
    uploadMutation.mutate();
  }

  const canSubmit =
    !!selectedMatchId &&
    !!pickedFile &&
    monthlyRent.length > 0 &&
    !uploadMutation.isPending;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={C.onInverse.primary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>הוספת חוזה מקובץ</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView style={styles.addScroll} contentContainerStyle={styles.addScrollInner}>
          <Text style={styles.fieldHint}>
            נדרש ליד מאושר (מדף לידים). ניתן להעלות PDF או Word (DOC/DOCX).
          </Text>

          {matchesLoading ? (
            <ActivityIndicator color={C.cyan} style={{ marginVertical: 24 }} />
          ) : accepted.length === 0 ? (
            <Text style={styles.fieldHint}>אין לידים מאושרים — אשר ליד תחילה מדף הלידים.</Text>
          ) : (
            <>
              <Text style={styles.fieldLabel}>בחר ליד</Text>
              <View style={styles.matchPick}>
                {accepted.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.matchChip, selectedMatchId === m.id && styles.matchChipSel]}
                    onPress={() => {
                      setSelectedMatchId(m.id);
                      if (m.apartment?.price != null) setMonthlyRent(String(m.apartment.price));
                    }}
                  >
                    <Text style={styles.matchChipText} numberOfLines={2}>
                      {m.apartment?.title ?? 'דירה'} · {m.tenant?.firstName} {m.tenant?.lastName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>שכ״ד חודשי (₪)</Text>
              <TextInput
                style={styles.fieldInput}
                keyboardType="number-pad"
                placeholder="5000"
                placeholderTextColor={C.field.placeholder}
                value={monthlyRent}
                onChangeText={setMonthlyRent}
              />

              <Text style={styles.fieldLabel}>חודשי פיקדון (1–6)</Text>
              <TextInput
                style={styles.fieldInput}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={C.field.placeholder}
                value={depositMonths}
                onChangeText={setDepositMonths}
              />

              <Text style={styles.fieldLabel}>תאריך התחלה (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="2026-06-01"
                placeholderTextColor={C.field.placeholder}
                value={startDate}
                onChangeText={setStartDate}
              />

              <Text style={styles.fieldLabel}>תאריך סיום (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="2027-06-01"
                placeholderTextColor={C.field.placeholder}
                value={endDate}
                onChangeText={setEndDate}
              />

              <TouchableOpacity style={styles.pickFileBtn} onPress={pickFile} activeOpacity={0.85}>
                <Ionicons name="cloud-upload-outline" size={20} color={C.onInverse.primary} />
                <Text style={styles.pickFileBtnText}>
                  {pickedFile ? pickedFile.name : 'בחר קובץ PDF או Word'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitUploadBtn, (!canSubmit || accepted.length === 0) && styles.btnDisabled]}
                disabled={!canSubmit || accepted.length === 0}
                onPress={submit}
              >
                {uploadMutation.isPending ? (
                  <ActivityIndicator color={C.onInverse.primary} />
                ) : (
                  <Text style={styles.submitUploadBtnText}>העלה וצור חוזה</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function ContractsScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { user, token } = useAuthStore();
  const isLandlord = user?.role === 'landlord';

  const [selected, setSelected] = React.useState<{ contract: Contract; text: string } | null>(null);
  const [addUploadOpen, setAddUploadOpen] = React.useState(false);

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
      setSelected((prev) =>
        prev ? { contract: res.data.contract, text: prev.text } : null,
      );
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
          <Ionicons name="chevron-back" size={22} color={C.onInverse.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>חוזים</Text>
        {isLandlord ? (
          <TouchableOpacity onPress={() => setAddUploadOpen(true)} style={styles.addHeaderBtn} accessibilityLabel="הוסף חוזה מקובץ">
            <Ionicons name="add" size={26} color={C.onInverse.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={C.cyan} style={{ marginTop: 40 }} />
      ) : contracts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={56} color={C.textMut} />
          <Text style={styles.emptyText}>אין חוזים עדיין</Text>
          {isLandlord ? (
            <>
              <Text style={styles.emptyHint}>הוסף חוזה מהתבנית מדף ההתאמות, או העלה קובץ PDF / Word.</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setAddUploadOpen(true)}>
                <Ionicons name="cloud-upload-outline" size={18} color={C.onInverse.primary} />
                <Text style={styles.emptyAddBtnText}>העלה חוזה מקובץ</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.emptyHint}>חוזים שסוכמו עם המשכיר יופיעו כאן</Text>
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
          authToken={token}
        />
      )}

      <AddContractUploadModal
        visible={addUploadOpen}
        onClose={() => setAddUploadOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['contracts'] });
          refetch();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Dark.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Dark.surface, justifyContent: 'center', alignItems: 'center' },
  addHeaderBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.cyan, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: C.onInverse.primary, fontSize: 18, fontWeight: '800' },
  list: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: Dark.surface, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardBadges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  cardTitle: { color: C.onInverse.primary, fontWeight: '700', fontSize: 15, flex: 1, textAlign: 'right', marginLeft: 8 },
  fileBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: C.cyanAlpha(0.14) },
  fileBadgeText: { color: C.cyan, fontSize: 10, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardSub: { color: C.textMut, fontSize: 12, textAlign: 'right', marginBottom: 4 },
  cardRent: { color: C.cyan, fontWeight: '800', fontSize: 15, textAlign: 'right', marginBottom: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  depositText: { fontSize: 11, fontWeight: '600' },
  cardDate: { color: C.textMut, fontSize: 11 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { color: C.textMut, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: C.textMut, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: C.cyan,
  },
  emptyAddBtnText: { color: C.onInverse.primary, fontWeight: '700', fontSize: 15 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: Dark.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Dark.border },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Dark.surface, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { color: C.onInverse.primary, fontSize: 17, fontWeight: '800' },
  contractScroll: { flex: 1 },
  openDocBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Dark.surface, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, marginBottom: 16,
  },
  openDocBtnText: { color: C.onInverse.primary, fontWeight: '700', fontSize: 14, textAlign: 'center', flex: 1 },
  contractText: { color: C.onInverse.tertiary, fontSize: 13, lineHeight: 22, fontFamily: 'monospace', textAlign: 'right' },
  modalActions: { padding: 16, borderTopWidth: 1, borderTopColor: Dark.border, gap: 10 },
  signBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.cyan, paddingVertical: 14, borderRadius: 14 },
  signBtnText: { color: C.navy, fontWeight: '800', fontSize: 15 },
  signedNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  signedNoteText: { color: C.statusTone.positive, fontWeight: '700', fontSize: 14 },
  depositRow: { flexDirection: 'row', gap: 8 },
  depositBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  depositBtnHold:    { backgroundColor: C.cyan },
  depositBtnRelease: { backgroundColor: C.statusTone.positive },
  depositBtnForfeit: { backgroundColor: C.statusTone.negativeSoft },
  depositBtnText: { color: C.onInverse.primary, fontWeight: '700', fontSize: 13 },
  btnDisabled: { opacity: 0.6 },
  docViewerWrap: { flex: 1, backgroundColor: Dark.bg },
  webView: { flex: 1, backgroundColor: Dark.surface },
  webViewCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  docViewerFallback: { color: C.textMut, padding: 24, textAlign: 'center' },
  addScroll: { flex: 1 },
  addScrollInner: { padding: 16, paddingBottom: 40 },
  fieldHint: { color: C.textMut, fontSize: 13, textAlign: 'right', marginBottom: 16, lineHeight: 20 },
  fieldLabel: { color: C.textMut, fontSize: 12, fontWeight: '600', textAlign: 'right', marginBottom: 6 },
  fieldInput: {
    backgroundColor: Dark.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: C.onInverse.primary, fontSize: 15, marginBottom: 14, textAlign: 'right',
  },
  matchPick: { gap: 8, marginBottom: 8 },
  matchChip: { backgroundColor: Dark.surface, borderRadius: 12, padding: 12, borderWidth: 2, borderColor: 'transparent' },
  matchChipSel: { borderColor: C.cyan },
  matchChipText: { color: C.onInverse.primary, fontSize: 14, textAlign: 'right' },
  pickFileBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Dark.surface, paddingVertical: 14, borderRadius: 12, marginTop: 8, marginBottom: 16,
  },
  pickFileBtnText: { color: C.onInverse.primary, fontWeight: '600', fontSize: 14, flex: 1, textAlign: 'center' },
  submitUploadBtn: {
    backgroundColor: C.cyan, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  submitUploadBtnText: { color: C.onInverse.primary, fontWeight: '800', fontSize: 16 },
});
