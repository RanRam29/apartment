import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, SafeAreaView, ActivityIndicator,
  Alert, Modal, TextInput, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { iotApi } from '../services/api';
import { C, Dark } from '../theme';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';

// ─── Types ────────────────────────────────────────────────────────────────────

type DeviceType = 'access_control' | 'sensor' | 'camera' | 'meter' | 'other';
type DeviceStatus = 'online' | 'offline' | 'maintenance';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

interface IoTDevice {
  _id: string;
  deviceId: string;
  name: string;
  type: DeviceType;
  location?: string;
  status: DeviceStatus;
  lastSeenAt?: string;
  leaseId: string;
}

interface MaintenanceTicket {
  _id: string;
  leaseId: string;
  deviceId?: string;
  reporterId: string;
  reporterName?: string;
  title: string;
  description?: string;
  priority: TicketPriority;
  status: TicketStatus;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<DeviceType, keyof typeof Ionicons.glyphMap> = {
  access_control: 'lock-closed-outline',
  sensor:         'radio-outline',
  camera:         'camera-outline',
  meter:          'speedometer-outline',
  other:          'hardware-chip-outline',
};

const TYPE_LABELS: Record<DeviceType, string> = {
  access_control: 'בקרת כניסה',
  sensor:         'חיישן',
  camera:         'מצלמה',
  meter:          'מד',
  other:          'אחר',
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  critical: C.statusTone.negativeSoft,
  high:     C.statusTone.caution,
  medium:   C.cyan,
  low:      C.statusTone.positive,
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  critical: 'קריטי',
  high:     'גבוה',
  medium:   'בינוני',
  low:      'נמוך',
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open:        'פתוח',
  in_progress: 'בטיפול',
  resolved:    'נפתר',
  closed:      'סגור',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('he-IL');
}

// ─── Device Card ──────────────────────────────────────────────────────────────

function DeviceCard({ device, onPress }: { device: IoTDevice; onPress: () => void }) {
  const dotColor =
    device.status === 'online'      ? C.statusTone.positive :
    device.status === 'maintenance' ? C.statusTone.caution : C.textMut;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardRow}>
        <View style={styles.cardIconWrap}>
          <Ionicons name={TYPE_ICONS[device.type]} size={22} color={C.cyan} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{device.name}</Text>
          <Text style={styles.cardSub}>{TYPE_LABELS[device.type]}</Text>
          {device.location ? (
            <Text style={styles.cardSub} numberOfLines={1}>{device.location}</Text>
          ) : null}
          {device.lastSeenAt ? (
            <Text style={styles.cardMeta}>נראה לאחרונה: {fmtDate(device.lastSeenAt)}</Text>
          ) : null}
        </View>
        <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────

function TicketCard({ ticket, onPress }: { ticket: MaintenanceTicket; onPress: () => void }) {
  const prioColor = PRIORITY_COLORS[ticket.priority];
  const statusColor =
    ticket.status === 'resolved' || ticket.status === 'closed' ? C.statusTone.positive :
    ticket.status === 'in_progress' ? C.statusTone.caution : C.textMut;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.ticketHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{ticket.title}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: prioColor + '22', borderColor: prioColor }]}>
            <Text style={[styles.badgeText, { color: prioColor }]}>{PRIORITY_LABELS[ticket.priority]}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{STATUS_LABELS[ticket.status]}</Text>
          </View>
        </View>
      </View>
      {ticket.description ? (
        <Text style={styles.cardSub} numberOfLines={2}>{ticket.description}</Text>
      ) : null}
      <Text style={styles.cardMeta}>{fmtDate(ticket.createdAt)}</Text>
    </TouchableOpacity>
  );
}

// ─── Register Device Modal (landlord) ────────────────────────────────────────

function RegisterDeviceModal({ visible, onClose, onCreate }: {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: object) => void;
}) {
  const [deviceId, setDeviceId] = useState('');
  const [name, setName]         = useState('');
  const [type, setType]         = useState<DeviceType>('access_control');
  const [location, setLocation] = useState('');
  const [leaseId, setLeaseId]   = useState('');
  const [tenantId, setTenantId] = useState('');

  const TYPES: DeviceType[] = ['access_control', 'sensor', 'camera', 'meter', 'other'];

  function submit() {
    if (!deviceId.trim() || !name.trim() || !leaseId.trim() || !tenantId.trim()) {
      Alert.alert('שגיאה', 'מזהה מכשיר, שם, מזהה חוזה ומזהה שוכר הם שדות חובה');
      return;
    }
    onCreate({
      deviceId: deviceId.trim(),
      name:     name.trim(),
      type,
      location: location.trim() || undefined,
      leaseId:  leaseId.trim(),
      tenantId: tenantId.trim(),
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>הוסף מכשיר IoT</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { label: 'מזהה מכשיר (Device ID) *', value: deviceId, set: setDeviceId },
              { label: 'שם מכשיר *',               value: name,     set: setName     },
              { label: 'מיקום',                    value: location,  set: setLocation },
              { label: 'מזהה חוזה (Lease ID) *',   value: leaseId,  set: setLeaseId  },
              { label: 'מזהה שוכר (Tenant ID) *',  value: tenantId, set: setTenantId },
            ].map(({ label, value, set }) => (
              <View key={label} style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={value}
                  onChangeText={set}
                  placeholderTextColor={C.field.placeholder}
                  textAlign="right"
                />
              </View>
            ))}

            <Text style={styles.fieldLabel}>סוג מכשיר</Text>
            <View style={styles.typeRow}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                  onPress={() => setType(t)}
                >
                  <Ionicons name={TYPE_ICONS[t]} size={16} color={type === t ? C.onInverse.primary : C.textMut} />
                  <Text style={[styles.typeBtnText, type === t && { color: C.onInverse.primary }]}>
                    {TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createBtn} onPress={submit}>
              <Text style={styles.createBtnText}>הוסף</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Create Ticket Modal ──────────────────────────────────────────────────────

function CreateTicketModal({ visible, onClose, onCreate }: {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: object) => void;
}) {
  const [leaseId,     setLeaseId]     = useState('');
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [priority,    setPriority]    = useState<TicketPriority>('medium');
  const [deviceId,    setDeviceId]    = useState('');

  const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'critical'];

  function submit() {
    if (!leaseId.trim() || !title.trim()) {
      Alert.alert('שגיאה', 'מזהה חוזה וכותרת הם שדות חובה');
      return;
    }
    onCreate({
      leaseId:     leaseId.trim(),
      title:       title.trim(),
      description: description.trim() || undefined,
      priority,
      deviceId:    deviceId.trim() || undefined,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>תקלה חדשה</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { label: 'מזהה חוזה (Lease ID) *', value: leaseId,     set: setLeaseId,     multi: false },
              { label: 'כותרת *',                 value: title,       set: setTitle,       multi: false },
              { label: 'תיאור',                   value: description, set: setDescription, multi: true  },
              { label: 'מזהה מכשיר (אופציונלי)',  value: deviceId,    set: setDeviceId,    multi: false },
            ].map(({ label, value, set, multi }) => (
              <View key={label} style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={[styles.fieldInput, multi && { height: 70 }]}
                  value={value}
                  onChangeText={set}
                  placeholderTextColor={C.field.placeholder}
                  textAlign="right"
                  multiline={multi}
                />
              </View>
            ))}

            <Text style={styles.fieldLabel}>עדיפות</Text>
            <View style={styles.typeRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.typeBtn,
                    priority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.typeBtnText, priority === p && { color: C.onInverse.primary }]}>
                    {PRIORITY_LABELS[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createBtn} onPress={submit}>
              <Text style={styles.createBtnText}>דווח</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Update Ticket Modal (landlord) ──────────────────────────────────────────

function UpdateTicketModal({ ticket, onClose, onUpdate }: {
  ticket: MaintenanceTicket | null;
  onClose: () => void;
  onUpdate: (id: string, data: object) => void;
}) {
  const [status, setStatus]               = useState<TicketStatus>('in_progress');
  const [resolutionNotes, setResolutionNotes] = useState('');

  React.useEffect(() => {
    if (ticket) {
      setStatus(ticket.status === 'open' ? 'in_progress' : ticket.status);
      setResolutionNotes(ticket.resolutionNotes ?? '');
    }
  }, [ticket]);

  if (!ticket) return null;

  const STATUSES: { value: TicketStatus; label: string }[] = [
    { value: 'in_progress', label: 'בטיפול'  },
    { value: 'resolved',    label: 'נפתר'    },
    { value: 'closed',      label: 'סגור'    },
  ];

  return (
    <Modal visible={!!ticket} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle} numberOfLines={1}>{ticket.title}</Text>

          <Text style={styles.fieldLabel}>עדכון סטטוס</Text>
          <View style={styles.typeRow}>
            {STATUSES.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[styles.typeBtn, status === value && styles.typeBtnActive]}
                onPress={() => setStatus(value)}
              >
                <Text style={[styles.typeBtnText, status === value && { color: C.onInverse.primary }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>הערות פתרון</Text>
            <TextInput
              style={[styles.fieldInput, { height: 80 }]}
              value={resolutionNotes}
              onChangeText={setResolutionNotes}
              placeholderTextColor={C.field.placeholder}
              textAlign="right"
              multiline
              placeholder="תאר את הפתרון..."
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => onUpdate(ticket._id, { status, resolutionNotes: resolutionNotes || undefined })}
            >
              <Text style={styles.createBtnText}>שמור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function IoTScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const isLandlord = user?.role === 'landlord';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab]         = useState<'devices' | 'tickets'>('devices');
  const [registerVisible, setRegisterVisible] = useState(false);
  const [createTicketVisible, setCreateTicketVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);

  // ── Devices query ──────────────────────────────────────────────────────────
  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['iot-devices'],
    queryFn: () => iotApi.listDevices().then((r) => r.data),
  });

  // ── Tickets query ──────────────────────────────────────────────────────────
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['iot-tickets'],
    queryFn: () => iotApi.listTickets().then((r) => r.data),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: (data: object) => iotApi.registerDevice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iot-devices'] });
      setRegisterVisible(false);
    },
    onError: (e: any) => Alert.alert('שגיאה', e.response?.data?.error || 'לא ניתן לרשום מכשיר'),
  });

  const createTicketMutation = useMutation({
    mutationFn: (data: object) => iotApi.createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iot-tickets'] });
      setCreateTicketVisible(false);
    },
    onError: (e: any) => Alert.alert('שגיאה', e.response?.data?.error || 'לא ניתן לדווח על תקלה'),
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => iotApi.updateTicket(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iot-tickets'] });
      setSelectedTicket(null);
    },
    onError: (e: any) => Alert.alert('שגיאה', e.response?.data?.error || 'לא ניתן לעדכן תקלה'),
  });

  const accessMutation = useMutation({
    mutationFn: ({ deviceId, action }: { deviceId: string; action: string }) =>
      iotApi.simulateAccess(deviceId, action),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['iot-devices'] });
      const ts = new Date(res.data.timestamp).toLocaleTimeString('he-IL');
      const actionLabel = vars.action === 'unlock' ? 'נפתח' : 'ננעל';
      if (Platform.OS === 'web') {
        window.alert(`המכשיר ${actionLabel} בהצלחה\n${ts}`);
      } else {
        Alert.alert('הצלחה', `המכשיר ${actionLabel} בהצלחה\n${ts}`);
      }
    },
    onError: (e: any) => Alert.alert('שגיאה', e.response?.data?.error || 'פעולת הגישה נכשלה'),
  });

  // ── Device tap: access control only ────────────────────────────────────────
  function handleDeviceTap(device: IoTDevice) {
    if (device.type !== 'access_control') return;
    if (Platform.OS === 'web') {
      const action = window.confirm(`${device.name}\n\nלחץ אישור לפתיחה, ביטול לנעילה`)
        ? 'unlock' : 'lock';
      accessMutation.mutate({ deviceId: device.deviceId, action });
    } else {
      Alert.alert(
        device.name,
        'בחר פעולה',
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'נעל', onPress: () => accessMutation.mutate({ deviceId: device.deviceId, action: 'lock' }) },
          { text: 'פתח', onPress: () => accessMutation.mutate({ deviceId: device.deviceId, action: 'unlock' }) },
        ]
      );
    }
  }

  const devices: IoTDevice[] = devicesData?.devices ?? [];
  const tickets: MaintenanceTicket[] = ticketsData?.tickets ?? [];
  const isLoading = activeTab === 'devices' ? devicesLoading : ticketsLoading;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.onInverse.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dirType.subhead]}>ניהול IoT ומתקנים</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => activeTab === 'devices' ? setRegisterVisible(true) : setCreateTicketVisible(true)}
        >
          <Ionicons name="add" size={20} color={C.onInverse.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'devices' && styles.tabActive]}
          onPress={() => setActiveTab('devices')}
        >
          <Text style={[styles.tabText, activeTab === 'devices' && styles.tabTextActive]}>מכשירים</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tickets' && styles.tabActive]}
          onPress={() => setActiveTab('tickets')}
        >
          <Text style={[styles.tabText, activeTab === 'tickets' && styles.tabTextActive]}>תקלות</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ResponsiveContainer style={{ flex: 1 }}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.cyan} />
          </View>
        ) : activeTab === 'devices' ? (
          devices.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="hardware-chip-outline" size={48} color={C.textMut} />
              <Text style={[styles.emptyTitle, dirType.subhead]}>אין מכשירים רשומים</Text>
              <Text style={[styles.emptyHint, dirType.caption]}>
                {isLandlord ? 'לחץ + כדי להוסיף מכשיר IoT' : 'מכשירים יופיעו כאן'}
              </Text>
            </View>
          ) : (
            <FlatList
              style={{ flex: 1 }}
              data={devices}
              keyExtractor={(d) => d._id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <DeviceCard device={item} onPress={() => handleDeviceTap(item)} />
              )}
            />
          )
        ) : (
          tickets.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="construct-outline" size={48} color={C.textMut} />
              <Text style={[styles.emptyTitle, dirType.subhead]}>אין תקלות פתוחות</Text>
              <Text style={[styles.emptyHint, dirType.caption]}>לחץ + כדי לדווח על תקלה</Text>
            </View>
          ) : (
            <FlatList
              style={{ flex: 1 }}
              data={tickets}
              keyExtractor={(t) => t._id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <TicketCard
                  ticket={item}
                  onPress={() => {
                    if (isLandlord) setSelectedTicket(item);
                  }}
                />
              )}
            />
          )
        )}
      </ResponsiveContainer>

      {/* Register device modal (landlord) */}
      <RegisterDeviceModal
        visible={registerVisible && isLandlord}
        onClose={() => setRegisterVisible(false)}
        onCreate={(data) => registerMutation.mutate(data)}
      />

      {/* Create ticket modal */}
      <CreateTicketModal
        visible={createTicketVisible}
        onClose={() => setCreateTicketVisible(false)}
        onCreate={(data) => createTicketMutation.mutate(data)}
      />

      {/* Update ticket modal (landlord) */}
      <UpdateTicketModal
        ticket={isLandlord ? selectedTicket : null}
        onClose={() => setSelectedTicket(null)}
        onUpdate={(id, data) => updateTicketMutation.mutate({ id, data })}
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
  headerTitle: { color: C.onInverse.primary, fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  addBtn:      { backgroundColor: C.cyan, borderRadius: 20, padding: 6 },

  tabBar: {
    flexDirection: 'row', backgroundColor: Dark.surface,
    borderBottomWidth: 1, borderBottomColor: Dark.border,
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:     { borderBottomColor: C.cyan },
  tabText:       { color: C.textMut, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: C.onInverse.primary },

  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { color: C.onInverse.primary, fontSize: 16, fontWeight: '700' },
  emptyHint:  { color: C.textMut, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },

  list: { padding: 16, gap: 12 },

  card: { backgroundColor: Dark.surface, borderRadius: 14, padding: 16 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.cyanAlpha(0.14), justifyContent: 'center', alignItems: 'center',
  },
  cardBody:  { flex: 1, gap: 2 },
  cardTitle: { color: C.onInverse.primary, fontSize: 15, fontWeight: '700' },
  cardSub:   { color: C.textMut, fontSize: 12 },
  cardMeta:  { color: C.field.placeholder, fontSize: 11, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5, alignSelf: 'flex-start', marginTop: 4 },

  ticketHeader: { gap: 6, marginBottom: 4 },
  badgeRow:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: Dark.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%',
  },
  modalTitle: { color: C.onInverse.primary, fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'right' },

  fieldWrap:  { marginBottom: 12 },
  fieldLabel: { color: C.textMut, fontSize: 11, marginBottom: 4, textAlign: 'right' },
  fieldInput: {
    backgroundColor: Dark.surface, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: C.onInverse.primary, fontSize: 14,
  },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: Dark.borderStrong, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  typeBtnActive: { backgroundColor: C.cyan, borderColor: C.cyan },
  typeBtnText:   { color: C.textMut, fontSize: 12, fontWeight: '600' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn:     { flex: 1, padding: 14, borderRadius: 12, backgroundColor: Dark.surface, alignItems: 'center' },
  cancelBtnText: { color: C.textMut, fontWeight: '700' },
  createBtn:     { flex: 2, padding: 14, borderRadius: 12, backgroundColor: C.cyan, alignItems: 'center' },
  createBtnText: { color: C.onInverse.primary, fontWeight: '800', fontSize: 15 },
});
