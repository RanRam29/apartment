import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { renterJournalApi } from '../services/api';
import { C } from '../theme';
import { dirType } from '../theme/textStyles';
import { dirApp } from '../theme/dirAppTokens';
import { useColors } from '../context/ThemeContext';
import { useDirection } from '../hooks/useDirection';
import { showAlert } from '../utils/alert';

const { width: W } = Dimensions.get('window');

interface RenterProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  bio: string;
  trustScore: number;
  isVerified: boolean;
  kycStatus: string;
}

interface ContractSummary {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRentIls: number;
  status: string;
  checkinCompletedAt: string | null;
  checkoutCompletedAt: string | null;
}

interface RenterJournalData {
  renter: RenterProfile;
  contracts: ContractSummary[];
  paymentsSummary: {
    totalRentRows: number;
    paid: number;
    unpaid: number;
    overdue: number;
  };
  checkIn: { completedCount: number };
  checkOut: { completedCount: number };
  maintenance: { totalCount: number };
  isEditable: boolean;
}

export default function RenterJournalScreen() {
  const colors = useColors();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, updateUser } = useAuthStore();
  const { flexRow, textAlign } = useDirection();

  const [data, setData] = useState<RenterJournalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  const targetUserId = route.params?.userId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      fetchJournalData();
    }
  }, [targetUserId]);

  const fetchJournalData = async () => {
    try {
      setIsLoading(true);
      const res = await renterJournalApi.getJournal(targetUserId);
      setData(res.data);

      // Populate edit fields
      if (res.data.renter) {
        setEditFirstName(res.data.renter.firstName);
        setEditLastName(res.data.renter.lastName);
        setEditBio(res.data.renter.bio);
        setEditAvatarUrl(res.data.renter.avatarUrl || '');
      }
    } catch (err: any) {
      showAlert('שגיאה', 'טעינת יומן השכירות המורחב נכשלה.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editFirstName.trim() || !editLastName.trim()) {
      showAlert('שגיאה', 'שדה שם פרטי ושם משפחה הם חובה.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await renterJournalApi.updateProfile(targetUserId, {
        firstName: editFirstName,
        lastName: editLastName,
        bio: editBio,
        avatarUrl: editAvatarUrl,
      });

      showAlert('הצלחה', 'הפרופיל עודכן בהצלחה!');
      setIsEditModalOpen(false);

      // Update auth store locally if editing own profile
      if (targetUserId === user?.id) {
        updateUser({
          firstName: editFirstName,
          lastName: editLastName,
          avatarUrl: editAvatarUrl,
        });
      }

      await fetchJournalData();
    } catch (err: any) {
      showAlert('שגיאה', err?.message || 'עדכון הפרופיל נכשל.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !data) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={dirApp.primary} />
        <Text style={[styles.loadingText, dirType.body, { color: colors.textMut }]}>
          טוען את פרופיל יומן השכירות...
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={[styles.topBar, { flexDirection: flexRow }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-forward" size={24} color={dirApp.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, dirType.heading, { color: dirApp.primary }]}>יומן שכירות</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color={colors.textMut} />
          <Text style={[styles.emptyText, dirType.subhead, { color: colors.text, textAlign: 'center' }]}>
            לא נמצאו נתונים עבור שוכר זה.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { renter, contracts, paymentsSummary, checkIn, checkOut, maintenance, isEditable } = data;

  // Reliability rating based on ledger payment status
  const getReliabilityRating = () => {
    if (paymentsSummary.totalRentRows === 0) return { label: 'חדש במערכת', color: dirApp.outline };
    if (paymentsSummary.overdue > 0) return { label: 'נדרש שיפור', color: C.statusTone.caution };
    
    const complianceRate = paymentsSummary.paid / paymentsSummary.totalRentRows;
    if (complianceRate >= 0.9) return { label: 'אמינות מצוינת', color: C.statusTone.positive };
    if (complianceRate >= 0.7) return { label: 'שוכר אמין', color: dirApp.secondary };
    return { label: 'שוכר יציב', color: dirApp.outline };
  };

  const reliability = getReliabilityRating();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { flexDirection: flexRow }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color={dirApp.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, dirType.heading, { color: dirApp.primary }]}>
          {isEditable ? 'יומן השכירות שלי' : `יומן שכירות: ${renter.firstName}`}
        </Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchJournalData}>
          <Ionicons name="refresh-outline" size={22} color={dirApp.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. Main Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.profileHeaderRow, { flexDirection: flexRow }]}>
            <View>
              {renter.avatarUrl ? (
                <Image source={{ uri: renter.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                  <Ionicons name="person" size={40} color={colors.textMut} />
                </View>
              )}
              {renter.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={22} color={C.cyan} />
                </View>
              )}
            </View>

            <View style={styles.profileMeta}>
              <View style={[styles.nameRow, { flexDirection: flexRow }]}>
                <Text style={[styles.renterName, dirType.heading, { color: colors.text }]}>
                  {renter.firstName} {renter.lastName}
                </Text>
              </View>

              <View style={[styles.badgeRow, { flexDirection: flexRow }]}>
                <View style={[styles.badgePill, { backgroundColor: `${reliability.color}22` }]}>
                  <Text style={[styles.badgePillText, dirType.micro, { color: reliability.color }]}>
                    {reliability.label}
                  </Text>
                </View>
                {renter.kycStatus === 'APPROVED' ? (
                  <View style={[styles.badgePill, { backgroundColor: `${C.success}22` }]}>
                    <Ionicons name="shield-checkmark" size={10} color={C.success} />
                    <Text style={[styles.badgePillText, dirType.micro, { color: C.success }]}>זהות מאומתת</Text>
                  </View>
                ) : (
                  <View style={[styles.badgePill, { backgroundColor: `${C.warning}22` }]}>
                    <Text style={[styles.badgePillText, dirType.micro, { color: C.warning }]}>ממתין לאימות זהות</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.trustPoints, dirType.label, { color: dirApp.primary }]}>
                מדד אמינות: {renter.trustScore} נקודות
              </Text>
            </View>
          </View>

          {/* Biography details */}
          <Text style={[styles.bioSectionTitle, dirType.label, { color: colors.text, textAlign }]}>קצת עליי:</Text>
          <Text style={[styles.bioText, dirType.body, { color: colors.textMut, textAlign }]}>
            {renter.bio || 'שוכר זה טרם הוסיף ביוגרפיה אישית.'}
          </Text>

          {isEditable && (
            <TouchableOpacity
              style={[styles.editProfileBtn, { borderColor: dirApp.primary }]}
              onPress={() => setIsEditModalOpen(true)}
            >
              <Ionicons name="create-outline" size={16} color={dirApp.primary} />
              <Text style={[styles.editProfileBtnText, dirType.label, { color: dirApp.primary }]}>ערוך פרטי פרופיל</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 2. Trust Score & Identity Stats Grid */}
        <View style={styles.gridContainer}>
          <View style={[styles.gridCard, { width: (W - 48) / 2, backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Ionicons name="ribbon-outline" size={24} color={C.accent.violet} />
            <Text style={[styles.gridTitle, dirType.micro, { color: colors.textMut }]}>דירוג אמינות</Text>
            <Text style={[styles.gridValue, dirType.heading, { color: colors.text }]}>{renter.trustScore} / 100</Text>
          </View>
          <View style={[styles.gridCard, { width: (W - 48) / 2, backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Ionicons name="shield-outline" size={24} color={C.success} />
            <Text style={[styles.gridTitle, dirType.micro, { color: colors.textMut }]}>סטטוס KYC זהות</Text>
            <Text style={[styles.gridValue, dirType.heading, { color: renter.kycStatus === 'APPROVED' ? C.success : C.warning }]}>
              {renter.kycStatus === 'APPROVED' ? 'מאומת' : 'לא מאומת'}
            </Text>
          </View>
        </View>

        {/* 3. Payments Ledger Summary */}
        <View style={[styles.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.sectionHeader, { flexDirection: flexRow }]}>
            <Ionicons name="card-outline" size={20} color={C.cyan} />
            <Text style={[styles.sectionTitle, dirType.label, { color: colors.text }]}>עמידה בתשלומי שכר דירה</Text>
          </View>
          <Text style={[styles.sectionBody, dirType.caption, { color: colors.textMut, textAlign }]}>
            היסטוריית עסקאות ותשלומים מאושרים מול בעלי דירות קודמים במערכת.
          </Text>

          <View style={[styles.paymentStatsRow, { flexDirection: flexRow }]}>
            <View style={styles.paymentStatItem}>
              <Text style={[styles.statNum, dirType.heading, { color: C.success }]}>{paymentsSummary.paid}</Text>
              <Text style={[styles.statLabel, dirType.micro, { color: colors.textMut }]}>שולמו בזמן</Text>
            </View>
            <View style={styles.paymentStatItem}>
              <Text style={[styles.statNum, dirType.heading, { color: C.warning }]}>{paymentsSummary.unpaid}</Text>
              <Text style={[styles.statLabel, dirType.micro, { color: colors.textMut }]}>ממתינים</Text>
            </View>
            <View style={styles.paymentStatItem}>
              <Text style={[styles.statNum, dirType.heading, { color: C.danger }]}>{paymentsSummary.overdue}</Text>
              <Text style={[styles.statLabel, dirType.micro, { color: colors.textMut }]}>פיגורים/חריגות</Text>
            </View>
          </View>
        </View>

        {/* 4. Past Contracts List */}
        <View style={[styles.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.sectionHeader, { flexDirection: flexRow }]}>
            <Ionicons name="document-text-outline" size={20} color={dirApp.primary} />
            <Text style={[styles.sectionTitle, dirType.label, { color: colors.text }]}>חוזי שכירות והסכמים</Text>
          </View>
          <Text style={[styles.sectionBody, dirType.caption, { color: colors.textMut, textAlign }]}>
            רשימת חוזי השכירות הדיגיטליים שהופעלו עבור שוכר זה בפלטפורמה.
          </Text>

          {contracts.length > 0 ? (
            <View style={styles.contractsList}>
              {contracts.map((c) => (
                <View key={c.id} style={[styles.contractItem, { borderColor: colors.border }]}>
                  <View style={[styles.contractMetaRow, { flexDirection: flexRow }]}>
                    <Text style={[styles.contractRent, dirType.caption, { color: colors.text }]}>
                      ₪{c.monthlyRentIls?.toLocaleString()}/חודש
                    </Text>
                    <View style={[styles.contractStatusPill, { backgroundColor: c.status === 'ACTIVE' ? `${C.success}22` : `${colors.border}44` }]}>
                      <Text style={[styles.contractStatusText, dirType.micro, { color: c.status === 'ACTIVE' ? C.success : colors.textMut }]}>
                        {c.status === 'ACTIVE' ? 'פעיל' : 'הסתיים'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.contractDates, dirType.micro, { color: colors.textMut, textAlign }]}>
                    תקופת שכירות: {c.startDate} עד {c.endDate}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptySectionText, dirType.caption, { color: colors.textMut, textAlign }]}>
              שוכר זה טרם רשם חוזים דיגיטליים במערכת.
            </Text>
          )}
        </View>

        {/* 5. Check-In & Check-Out & Maintenance Row */}
        <View style={[styles.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.sectionHeader, { flexDirection: flexRow }]}>
            <Ionicons name="checkbox-outline" size={20} color={C.coral} />
            <Text style={[styles.sectionTitle, dirType.label, { color: colors.text }]}>פרוטוקולים ותחזוקה</Text>
          </View>

          <View style={[styles.protocolStatsRow, { flexDirection: flexRow }]}>
            <View style={styles.protocolStatBox}>
              <Ionicons name="camera" size={20} color={C.accent.violet} />
              <Text style={[styles.protocolNum, dirType.subhead, { color: colors.text }]}>{checkIn.completedCount}</Text>
              <Text style={[styles.protocolLabel, dirType.micro, { color: colors.textMut }]}>צ׳ק-אין מאושרים</Text>
            </View>
            <View style={styles.protocolStatBox}>
              <Ionicons name="log-out" size={20} color={C.success} />
              <Text style={[styles.protocolNum, dirType.subhead, { color: colors.text }]}>{checkOut.completedCount}</Text>
              <Text style={[styles.protocolLabel, dirType.micro, { color: colors.textMut }]}>צ׳ק-אאוט מאושרים</Text>
            </View>
            <View style={styles.protocolStatBox}>
              <Ionicons name="construct" size={20} color={C.coral} />
              <Text style={[styles.protocolNum, dirType.subhead, { color: colors.text }]}>{maintenance.totalCount}</Text>
              <Text style={[styles.protocolLabel, dirType.micro, { color: colors.textMut }]}>קריאות שירות שפתחו</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.modalTitle, dirType.heading, { color: colors.text }]}>עדכון פרטי פרופיל</Text>

            <Text style={[styles.inputLabel, { color: colors.text, textAlign }]}>שם פרטי:</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={editFirstName}
              onChangeText={setEditFirstName}
              placeholder="שם פרטי"
              placeholderTextColor={colors.textMut}
            />

            <Text style={[styles.inputLabel, { color: colors.text, textAlign }]}>שם משפחה:</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={editLastName}
              onChangeText={setEditLastName}
              placeholder="שם משפחה"
              placeholderTextColor={colors.textMut}
            />

            <Text style={[styles.inputLabel, { color: colors.text, textAlign }]}>כתובת תמונת אווטאר (URL):</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={editAvatarUrl}
              onChangeText={setEditAvatarUrl}
              placeholder="https://example.com/photo.jpg"
              placeholderTextColor={colors.textMut}
            />

            <Text style={[styles.inputLabel, { color: colors.text, textAlign }]}>סיפור אישי / ביוגרפיה:</Text>
            <TextInput
              style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="ספר קצת על עצמך לבעלי הדירות..."
              placeholderTextColor={colors.textMut}
              multiline={true}
              numberOfLines={4}
            />

            <View style={[styles.modalActions, { flexDirection: flexRow }]}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: dirApp.primary }]}
                onPress={handleUpdateProfile}
              >
                <Text style={styles.modalBtnText}>שמור שינויים</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }]}
                onPress={() => setIsEditModalOpen(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f111e' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12 },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: { padding: 8 },
  nameRow: { alignItems: 'center', gap: 8 },
  refreshBtn: { padding: 8 },
  title: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyText: { fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  profileHeaderRow: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0f111e',
    borderRadius: 12,
  },
  profileMeta: {
    flex: 1,
    alignItems: 'flex-end',
  },
  renterName: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  badgeRow: {
    gap: 6,
    marginBottom: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePillText: {
    fontWeight: 'bold',
  },
  trustPoints: {
    fontWeight: '600',
  },
  bioSectionTitle: {
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 10,
  },
  bioText: {
    lineHeight: 20,
    marginBottom: 14,
  },
  editProfileBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'transparent',
  },
  editProfileBtnText: {
    fontWeight: 'bold',
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  gridCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  gridTitle: {
    fontWeight: '500',
  },
  gridValue: {
    fontWeight: 'bold',
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'flex-end',
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  sectionBody: {
    lineHeight: 18,
    marginBottom: 16,
  },
  paymentStatsRow: {
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  paymentStatItem: {
    alignItems: 'center',
  },
  statNum: {
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 4,
  },
  statLabel: {
    fontWeight: '500',
  },
  contractsList: {
    gap: 10,
  },
  contractItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  contractMetaRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  contractRent: {
    fontWeight: 'bold',
  },
  contractStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contractStatusText: {
    fontWeight: 'bold',
  },
  contractDates: {},
  emptySectionText: {
    fontStyle: 'italic',
  },
  protocolStatsRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  protocolStatBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  protocolNum: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  protocolLabel: {
    fontWeight: '500',
    textAlign: 'center',
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
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    textAlign: 'right',
    marginBottom: 14,
    fontSize: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  textArea: {
    height: 80,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  modalActions: {
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
