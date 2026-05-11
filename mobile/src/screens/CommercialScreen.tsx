import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  SafeAreaView, ActivityIndicator, Alert, Modal, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import { C, Dark } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type BizType = 'office' | 'retail' | 'warehouse' | 'industrial' | 'other';
type LeaseStatus = 'active' | 'expired' | 'terminated';

interface Alert_ {
  type: string;
  label: string;
  date: string;
  daysLeft: number;
}

interface CamRecord {
  year: number;
  estimated: number;
  actual?: number;
  difference?: number;
  settledAt?: string;
  notes?: string;
}

interface CommercialLease {
  _id: string;
  businessName: string;
  businessType: BizType;
  tenantName: string;
  landlordName: string;
  propertyAddress?: string;
  monthlyRent: number;
  annualCamEstimate: number;
  camReconciliationMonth: number;
  camHistory: CamRecord[];
  startDate: string;
  endDate: string;
  renewalOptionDate?: string;
  rentEscalationDate?: string;
  rentEscalationPercent?: number;
  inspectionDate?: string;
  status: LeaseStatus;
  notes?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BIZ_LABELS: Record<BizType, string> = {
  office: 'משרד', retail: 'מסחרי', warehouse: 'מחסן',
  industrial: 'תעשייה', other: 'אחר',
};

const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני',
                   'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function alertColor(days: number) {
  if (days <= 30) return C.statusTone.negativeSoft;
  if (days <= 60) return C.statusTone.caution;
  return C.statusTone.positive;
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('he-IL');
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AlertBadge({ alert }: { alert: Alert_ }) {
  const color = alertColor(alert.daysLeft);
  return (
    <View style={[styles.alertBadge, { borderColor: color }]}>
      <Ionicons name="warning-outline" size={13} color={color} />
      <Text style={[styles.alertLabel, { color }]}>{alert.label}</Text>
      <Text style={[styles.alertDays, { color }]}>{alert.daysLeft} ימים</Text>
    </View>
  );
}

function LeaseCard({ lease, onPress }: { lease: CommercialLease; onPress: () => void }) {
  const statusColor = lease.status === 'active' ? C.statusTone.positive : C.textMut;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardRow}>
        <View style={styles.cardLeft}>
          <Text style={styles.bizName} numberOfLines={1}>{lease.businessName}</Text>
          <Text style={styles.bizType}>{BIZ_LABELS[lease.businessType]}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.rent}>₪{lease.monthlyRent.toLocaleString()}<Text style={styles.rentSub}>/חודש</Text></Text>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>
      </View>

      {lease.annualCamEstimate > 0 && (
        <Text style={styles.camLine}>
          CAM שנתי: ₪{lease.annualCamEstimate.toLocaleString()}
          {' · '}התחשבנות: {MONTHS_HE[(lease.camReconciliationMonth ?? 1) - 1]}
        </Text>
      )}

      <Text style={styles.dates}>
        {fmtDate(lease.startDate)} – {fmtDate(lease.endDate)}
        {lease.propertyAddress ? `  ·  ${lease.propertyAddress}` : ''}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Detail Modal ────────────────────────────────────────────────────────────

function DetailModal({ lease, isLandlord, onClose, onCamAdd }: {
  lease: CommercialLease | null;
  isLandlord: boolean;
  onClose: () => void;
  onCamAdd: (leaseId: string, year: number, actual: number, notes: string) => void;
}) {
  const [camYear, setCamYear] = React.useState(String(new Date().getFullYear()));
  const [camActual, setCamActual] = React.useState('');
  const [camNotes, setCamNotes] = React.useState('');

  if (!lease) return null;

  const criticals: { label: string; value: string | undefined; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: 'מועד אופציה', value: lease.renewalOptionDate, icon: 'refresh-outline' },
    { label: 'עדכון שכר דירה', value: lease.rentEscalationDate, icon: 'trending-up-outline' },
    { label: 'בדיקת נכס', value: lease.inspectionDate, icon: 'clipboard-outline' },
  ];

  return (
    <Modal visible={!!lease} transparent animationType="slide">
      <View style={styles.overlay}>
        <SafeAreaView style={styles.detailBox}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle} numberOfLines={1}>{lease.businessName}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={C.onInverse.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
            {/* Key figures */}
            <View style={styles.figureRow}>
              <View style={styles.figure}>
                <Text style={styles.figureVal}>₪{lease.monthlyRent.toLocaleString()}</Text>
                <Text style={styles.figureLabel}>שכ"ד חודשי</Text>
              </View>
              {lease.annualCamEstimate > 0 && (
                <View style={styles.figure}>
                  <Text style={styles.figureVal}>₪{lease.annualCamEstimate.toLocaleString()}</Text>
                  <Text style={styles.figureLabel}>CAM שנתי</Text>
                </View>
              )}
              {lease.rentEscalationPercent != null && (
                <View style={styles.figure}>
                  <Text style={styles.figureVal}>{lease.rentEscalationPercent}%</Text>
                  <Text style={styles.figureLabel}>הצמדה</Text>
                </View>
              )}
            </View>

            {/* Critical dates */}
            <Text style={styles.sectionTitle}>תאריכים קריטיים</Text>
            {criticals.map(({ label, value, icon }) => (
              <View key={label} style={styles.critRow}>
                <Ionicons name={icon} size={16} color={C.textMut} />
                <Text style={styles.critLabel}>{label}</Text>
                <Text style={styles.critVal}>{fmtDate(value)}</Text>
              </View>
            ))}

            {/* CAM history */}
            {lease.camHistory.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>היסטוריית CAM</Text>
                {lease.camHistory.map((r) => (
                  <View key={r.year} style={styles.camRow}>
                    <Text style={styles.camYear}>{r.year}</Text>
                    <Text style={styles.camEst}>₪{r.estimated.toLocaleString()} (הערכה)</Text>
                    {r.actual != null && (
                      <Text style={[styles.camDiff, { color: (r.difference ?? 0) > 0 ? C.statusTone.negativeSoft : C.statusTone.positive }]}>
                        ₪{r.actual.toLocaleString()} ({(r.difference ?? 0) > 0 ? '+' : ''}{(r.difference ?? 0).toLocaleString()})
                      </Text>
                    )}
                  </View>
                ))}
              </>
            )}

            {/* Add CAM reconciliation (landlord) */}
            {isLandlord && lease.annualCamEstimate > 0 && (
              <>
                <Text style={styles.sectionTitle}>הוסף התחשבנות CAM</Text>
                <View style={styles.camForm}>
                  <TextInput
                    style={styles.camInput}
                    placeholder="שנה"
                    placeholderTextColor={C.field.placeholder}
                    keyboardType="numeric"
                    value={camYear}
                    onChangeText={setCamYear}
                  />
                  <TextInput
                    style={styles.camInput}
                    placeholder="סכום בפועל ₪"
                    placeholderTextColor={C.field.placeholder}
                    keyboardType="numeric"
                    value={camActual}
                    onChangeText={setCamActual}
                  />
                </View>
                <TextInput
                  style={[styles.camInput, { width: '100%' }]}
                  placeholder="הערות (אופציונלי)"
                  placeholderTextColor={C.field.placeholder}
                  value={camNotes}
                  onChangeText={setCamNotes}
                />
                <TouchableOpacity
                  style={styles.camSubmitBtn}
                  onPress={() => {
                    const actual = parseFloat(camActual);
                    if (!camYear || isNaN(actual)) {
                      Alert.alert('שגיאה', 'יש להזין שנה וסכום');
                      return;
                    }
                    onCamAdd(lease._id, Number(camYear), actual, camNotes);
                    setCamActual('');
                    setCamNotes('');
                  }}
                >
                  <Text style={styles.camSubmitText}>שמור התחשבנות</Text>
                </TouchableOpacity>
              </>
            )}

            {lease.notes ? (
              <>
                <Text style={styles.sectionTitle}>הערות</Text>
                <Text style={styles.notesText}>{lease.notes}</Text>
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Create modal (landlord) ─────────────────────────────────────────────────

function CreateModal({ visible, onClose, onCreate }: {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: object) => void;
}) {
  const [businessName, setBusinessName] = React.useState('');
  const [tenantId, setTenantId] = React.useState('');
  const [rent, setRent] = React.useState('');
  const [cam, setCam] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [address, setAddress] = React.useState('');

  function submit() {
    if (!businessName.trim() || !tenantId.trim() || !rent || !startDate || !endDate) {
      Alert.alert('שגיאה', 'שם עסק, מזהה שוכר, שכר דירה ותאריכים הם שדות חובה');
      return;
    }
    onCreate({
      businessName: businessName.trim(),
      tenantId: tenantId.trim(),
      monthlyRent: parseFloat(rent),
      annualCamEstimate: cam ? parseFloat(cam) : 0,
      startDate,
      endDate,
      propertyAddress: address.trim() || undefined,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.createBox}>
          <Text style={styles.createTitle}>חוזה נדל"ן מסחרי חדש</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { label: 'שם העסק *',          value: businessName, set: setBusinessName, kb: 'default' },
              { label: 'מזהה שוכר (User ID) *', value: tenantId,    set: setTenantId,    kb: 'default' },
              { label: 'שכר דירה חודשי (₪) *',  value: rent,        set: setRent,        kb: 'numeric' },
              { label: 'CAM שנתי (₪)',           value: cam,         set: setCam,         kb: 'numeric' },
              { label: 'תאריך התחלה (YYYY-MM-DD) *', value: startDate, set: setStartDate, kb: 'default' },
              { label: 'תאריך סיום (YYYY-MM-DD) *',  value: endDate,   set: setEndDate,   kb: 'default' },
              { label: 'כתובת נכס',              value: address,     set: setAddress,     kb: 'default' },
            ].map(({ label, value, set, kb }) => (
              <View key={label} style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={value}
                  onChangeText={set as any}
                  keyboardType={kb as any}
                  placeholderTextColor={C.field.placeholder}
                  textAlign="right"
                />
              </View>
            ))}
          </ScrollView>
          <View style={styles.createActions}>
            <TouchableOpacity style={styles.cancelBtn2} onPress={onClose}>
              <Text style={styles.cancelBtn2Text}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createBtn} onPress={submit}>
              <Text style={styles.createBtnText}>צור חוזה</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CommercialScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const isLandlord = user?.role === 'landlord';
  const queryClient = useQueryClient();

  const [selected, setSelected] = React.useState<CommercialLease | null>(null);
  const [alerts, setAlerts] = React.useState<Alert_[]>([]);
  const [createVisible, setCreateVisible] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['commercial-leases'],
    queryFn: () => api.get('/commercial').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post('/commercial', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-leases'] });
      setCreateVisible(false);
    },
    onError: (e: any) => Alert.alert('שגיאה', e.response?.data?.error || 'לא ניתן ליצור חוזה'),
  });

  const camMutation = useMutation({
    mutationFn: ({ id, year, actual, notes }: { id: string; year: number; actual: number; notes: string }) =>
      api.post(`/commercial/${id}/cam`, { year, actual, notes }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['commercial-leases'] });
      setSelected(res.data.lease);
    },
    onError: (e: any) => Alert.alert('שגיאה', e.response?.data?.error || 'שגיאה בשמירת CAM'),
  });

  async function openDetail(lease: CommercialLease) {
    setSelected(lease);
    try {
      const res = await api.get(`/commercial/${lease._id}/alerts`);
      setAlerts(res.data.alerts);
    } catch {
      setAlerts([]);
    }
  }

  const leases: CommercialLease[] = data?.leases ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.onInverse.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>נדל"ן מסחרי</Text>
        {isLandlord && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setCreateVisible(true)}>
            <Ionicons name="add" size={20} color={C.onInverse.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Upcoming alerts banner */}
      {alerts.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.alertsBar}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
          {alerts.map((a, i) => <AlertBadge key={i} alert={a} />)}
        </ScrollView>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.cyan} />
        </View>
      ) : leases.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="business-outline" size={48} color={C.textMut} />
          <Text style={styles.emptyTitle}>אין חוזים מסחריים</Text>
          <Text style={styles.emptyHint}>
            {isLandlord ? 'לחץ + כדי להוסיף חוזה נדל"ן מסחרי' : 'חוזים מסחריים יופיעו כאן'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={leases}
          keyExtractor={(l) => l._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <LeaseCard lease={item} onPress={() => openDetail(item)} />}
        />
      )}

      <DetailModal
        lease={selected}
        isLandlord={isLandlord}
        onClose={() => { setSelected(null); setAlerts([]); }}
        onCamAdd={(id, year, actual, notes) => camMutation.mutate({ id, year, actual, notes })}
      />

      <CreateModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreate={(data) => createMutation.mutate(data)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Dark.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Dark.surface, borderBottomWidth: 1, borderBottomColor: Dark.border,
  },
  backBtn:     { padding: 4 },
  headerTitle: { color: C.onInverse.primary, fontSize: 17, fontWeight: '700' },
  addBtn:      { backgroundColor: C.cyan, borderRadius: 20, padding: 6 },

  alertsBar: { backgroundColor: Dark.surface, borderBottomWidth: 1, borderBottomColor: Dark.border },
  alertBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  alertLabel: { fontSize: 11, fontWeight: '600' },
  alertDays:  { fontSize: 10 },

  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { color: C.onInverse.primary, fontSize: 16, fontWeight: '700' },
  emptyHint:  { color: C.textMut, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },

  list: { padding: 16, gap: 12 },

  card: { backgroundColor: Dark.surface, borderRadius: 14, padding: 16, gap: 6 },
  cardRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1, gap: 2 },
  cardRight:{ alignItems: 'flex-end', gap: 4 },
  bizName:  { color: C.onInverse.primary, fontSize: 15, fontWeight: '700' },
  bizType:  { color: C.textMut, fontSize: 12 },
  rent:     { color: C.cyan, fontSize: 17, fontWeight: '800' },
  rentSub:  { fontSize: 11, color: C.textMut },
  statusDot:{ width: 8, height: 8, borderRadius: 4 },
  camLine:  { color: C.statusTone.caution, fontSize: 11 },
  dates:    { color: C.textMut, fontSize: 11 },

  // Detail modal
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  detailBox: { backgroundColor: Dark.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' },
  detailHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: Dark.border,
  },
  detailTitle:  { color: C.onInverse.primary, fontSize: 17, fontWeight: '700', flex: 1 },
  detailScroll: { padding: 20, gap: 8, paddingBottom: 40 },

  figureRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  figure:    { flex: 1, backgroundColor: Dark.surface, borderRadius: 12, padding: 12, alignItems: 'center' },
  figureVal: { color: C.cyan, fontSize: 16, fontWeight: '800' },
  figureLabel:{ color: C.textMut, fontSize: 11, marginTop: 2 },

  sectionTitle: { color: C.textMut, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 4 },

  critRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6,
               borderBottomWidth: 1, borderBottomColor: Dark.surface },
  critLabel: { flex: 1, color: C.onInverse.primary, fontSize: 13 },
  critVal:   { color: C.textMut, fontSize: 13 },

  camRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  camYear:  { color: C.onInverse.primary, fontWeight: '700', width: 44 },
  camEst:   { color: C.textMut, fontSize: 12, flex: 1 },
  camDiff:  { fontSize: 12, fontWeight: '700' },

  camForm:  { flexDirection: 'row', gap: 8 },
  camInput: {
    flex: 1, backgroundColor: Dark.surface, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, color: C.onInverse.primary, fontSize: 13,
  },
  camSubmitBtn: {
    backgroundColor: C.statusTone.caution, borderRadius: 10, padding: 12,
    alignItems: 'center', marginTop: 8,
  },
  camSubmitText: { color: C.onInverse.primary, fontWeight: '700' },

  notesText: { color: C.textMut, fontSize: 13, lineHeight: 20 },

  // Create modal
  createBox: {
    backgroundColor: Dark.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%',
  },
  createTitle: { color: C.onInverse.primary, fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'right' },
  fieldWrap:   { marginBottom: 12 },
  fieldLabel:  { color: C.textMut, fontSize: 11, marginBottom: 4, textAlign: 'right' },
  fieldInput:  {
    backgroundColor: Dark.surface, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: C.onInverse.primary, fontSize: 14,
  },
  createActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn2:    { flex: 1, padding: 14, borderRadius: 12, backgroundColor: Dark.surface, alignItems: 'center' },
  cancelBtn2Text:{ color: C.textMut, fontWeight: '700' },
  createBtn:     { flex: 2, padding: 14, borderRadius: 12, backgroundColor: C.cyan, alignItems: 'center' },
  createBtnText: { color: C.onInverse.primary, fontWeight: '800', fontSize: 15 },
});
