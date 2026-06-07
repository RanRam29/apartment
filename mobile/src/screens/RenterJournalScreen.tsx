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
  FlatList,
  Linking,
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
import { useResponsive } from '../hooks/useResponsive';
import { fontFamily } from '../theme/fonts';

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
  const { isDesktop } = useResponsive();
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

  const renderTimelineContent = () => (
    <View style={styles.timelineContainer}>
      {/* 1. Contract Signature Node */}
      <View style={[styles.timelineItem, { flexDirection: flexRow }]}>
        <View style={styles.cardContent}>
          <TouchableOpacity
            style={[styles.timelineCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => navigation.navigate('ContractDetail', { contractId: contract.id })}
          >
            <View style={[styles.cardHeader, { flexDirection: flexRow }]}>
              <Text style={[styles.cardTitle, dirType.label, { color: colors.text }]}>חוזה שכירות דיגיטלי</Text>
              <View style={[styles.badge, { backgroundColor: `${dirApp.secondaryContainer}44` }]}>
                <Text style={[styles.badgeText, dirType.micro, { color: dirApp.onSecondaryContainer }]}>
                  {contract.status === 'ACTIVE' ? 'פעיל' : 'ממתין לחתימה'}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardBody, dirType.caption, { color: colors.textMut }]}>
              החוזה נחתם והופעל באופן דיגיטלי ומאובטח.
            </Text>
            <View style={[styles.cardFooter, { flexDirection: flexRow }]}>
              <Text style={[styles.footerText, dirType.micro, { color: dirApp.secondary }]}>שכר דירה חודשי: ₪{contract.monthlyRent?.toLocaleString()}</Text>
              <Ionicons name="chevron-back" size={14} color={dirApp.secondary} />
            </View>
          </TouchableOpacity>
        </View>
        {renderTimelineNode('document-text-outline', dirApp.primary, true)}
      </View>

      {/* 2. Check-In Node */}
      <View style={[styles.timelineItem, { flexDirection: flexRow }]}>
        <View style={styles.cardContent}>
          <View style={[styles.timelineCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { flexDirection: flexRow }]}>
              <Text style={[styles.cardTitle, dirType.label, { color: colors.text }]}>תהליך צ׳ק-אין דירה</Text>
              <View style={[styles.badge, { backgroundColor: checkIn?.completedAt ? `${C.success}22` : `${C.warning}22` }]}>
                <Text style={[styles.badgeText, dirType.micro, { color: checkIn?.completedAt ? C.success : C.warning }]}>
                  {checkIn?.completedAt ? 'הושלם' : 'ממתין לביצוע'}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardBody, dirType.caption, { color: colors.textMut }]}>
              תיעוד מצב הדירה ואישור חדרים בעת הכניסה.
            </Text>

            {checkIn?.rooms && checkIn.rooms.length > 0 && (
              <View style={styles.roomsList}>
                {checkIn.rooms.map((room) => (
                  <View key={room.id} style={styles.roomItem}>
                    <TouchableOpacity
                      style={[styles.roomHeaderRow, { flexDirection: flexRow }]}
                      onPress={() => setExpandedRoom(expandedRoom === `in-${room.id}` ? null : `in-${room.id}`)}
                    >
                      <Ionicons
                        name={expandedRoom === `in-${room.id}` ? 'chevron-down' : 'chevron-back'}
                        size={16}
                        color={colors.text}
                      />
                      <Text style={[styles.roomName, dirType.caption, { color: colors.text }]}>
                        {room.name} ({room.photos.length} תמונות)
                      </Text>
                    </TouchableOpacity>

                    {expandedRoom === `in-${room.id}` && room.photos.length > 0 && (
                      <ScrollView horizontal style={styles.photosScroll} showsHorizontalScrollIndicator={false}>
                        {room.photos.map((photoUrl: string, idx: number) => (
                          <Image key={idx} source={{ uri: photoUrl }} style={styles.roomPhoto} />
                        ))}
                      </ScrollView>
                    )}
                  </View>
                ))}
              </View>
            )}

            {!checkIn?.completedAt && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: dirApp.secondaryContainer }]}
                onPress={() => navigation.navigate('CheckIn', { contractId: contract.id })}
              >
                <Text style={[styles.actionBtnText, dirType.label, { color: dirApp.onSecondaryContainer }]}>
                  בצע צ׳ק-אין כעת
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {renderTimelineNode('camera-outline', C.accent.violet, !!checkIn?.completedAt)}
      </View>

      {/* 3. Rent Ledger Payments Node */}
      <View style={[styles.timelineItem, { flexDirection: flexRow }]}>
        <View style={styles.cardContent}>
          <View style={[styles.timelineCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { flexDirection: flexRow }]}>
              <Text style={[styles.cardTitle, dirType.label, { color: colors.text }]}>מצב תשלומים חודשי</Text>
              <TouchableOpacity onPress={() => navigation.navigate('RentPayments')}>
                <Ionicons name="open-outline" size={18} color={dirApp.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.cardBody, dirType.caption, { color: colors.textMut }]}>
              מעקב אחר תשלומים שוטפים של שכר דירה.
            </Text>

            {ledgerEntries.length > 0 ? (
              <View style={styles.ledgerList}>
                {ledgerEntries.slice(0, 3).map((entry) => {
                  const isPaid = entry.status === 'PAID';
                  const isOverdue = entry.status === 'OVERDUE' || (entry.status === 'UNPAID' && new Date(entry.dueDate) < new Date());
                  return (
                    <View key={entry.id} style={[styles.ledgerItem, { flexDirection: flexRow, borderColor: colors.border }]}>
                      <View style={[styles.statusIndicator, { backgroundColor: isPaid ? C.success : (isOverdue ? C.danger : C.warning) }]} />
                      <View style={styles.ledgerInfo}>
                        <Text style={[styles.ledgerMonth, dirType.caption, { color: colors.text }]}>
                          חודש {new Date(entry.dueDate).getMonth() + 1}/{new Date(entry.dueDate).getFullYear()}
                        </Text>
                        <Text style={[styles.ledgerDue, dirType.micro, { color: colors.textMut }]}>
                          תאריך פירעון: {entry.dueDate}
                        </Text>
                      </View>
                      <Text style={[styles.ledgerAmount, dirType.caption, { color: colors.text }]}>
                        ₪{entry.amount?.toLocaleString()}
                      </Text>
                    </View>
                  );
                })}
                {ledgerEntries.length > 3 && (
                  <TouchableOpacity onPress={() => navigation.navigate('RentPayments')}>
                    <Text style={[styles.morePaymentsText, dirType.micro, { color: dirApp.secondary, textAlign }]}>
                      צפה בגרף וביתר {ledgerEntries.length - 3} התשלומים...
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Text style={[styles.emptySubText, dirType.micro, { color: colors.textMut }]}>
                טרם נוצרו תשלומים בחוזה זה.
              </Text>
            )}
          </View>
        </View>
        {renderTimelineNode('card-outline', C.cyan, ledgerEntries.some(e => e.status === 'PAID'))}
      </View>

      {/* 4. Maintenance Node */}
      <View style={[styles.timelineItem, { flexDirection: flexRow }]}>
        <View style={styles.cardContent}>
          <View style={[styles.timelineCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { flexDirection: flexRow }]}>
              <Text style={[styles.cardTitle, dirType.label, { color: colors.text }]}>קריאות שירות ותחזוקה</Text>
              <TouchableOpacity
                style={[styles.badge, { backgroundColor: `${dirApp.primary}22` }]}
                onPress={() => navigation.navigate('Maintenance', { contractId: contract.id })}
              >
                <Text style={[styles.badgeText, dirType.micro, { color: dirApp.primary }]}>
                  + פתח קריאה
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.cardBody, dirType.caption, { color: colors.textMut }]}>
              דיווח ומעקב אחר תקלות בנכס מול בעל הבית.
            </Text>

            {maintenance.length > 0 ? (
              <View style={styles.ticketsList}>
                {maintenance.slice(0, 2).map((ticket) => (
                  <View key={ticket.id} style={[styles.ticketItem, { backgroundColor: `${colors.bg}66`, borderColor: colors.border }]}>
                    <View style={[styles.ticketHeaderRow, { flexDirection: flexRow }]}>
                      <Text style={[styles.ticketTitle, dirType.caption, { color: colors.text }]} numberOfLines={1}>
                        {ticket.title || ticket.description}
                      </Text>
                      <Text style={[styles.ticketStatus, dirType.micro, { color: ticket.status === 'COMPLETED' ? C.success : C.warning }]}>
                        {ticket.status === 'COMPLETED' ? 'טופל' : (ticket.status === 'IN_PROGRESS' ? 'בטיפול' : 'חדש')}
                      </Text>
                    </View>
                    <Text style={[styles.ticketDesc, dirType.micro, { color: colors.textMut }]} numberOfLines={2}>
                      {ticket.description}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptySubText, dirType.micro, { color: colors.textMut, marginTop: 8 }]}>
                אין קריאות שירות פתוחות. הכל תקין!
              </Text>
            )}
          </View>
        </View>
        {renderTimelineNode('construct-outline', C.coral, maintenance.length > 0)}
      </View>

      {/* 5. Check-Out Node */}
      <View style={[styles.timelineItem, { flexDirection: flexRow }]}>
        <View style={styles.cardContent}>
          <View style={[styles.timelineCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { flexDirection: flexRow }]}>
              <Text style={[styles.cardTitle, dirType.label, { color: colors.text }]}>צ׳ק-אאוט וסיום חוזה</Text>
              <View style={[styles.badge, { backgroundColor: checkOut?.completedAt ? `${C.success}22` : `${colors.border}66` }]}>
                <Text style={[styles.badgeText, dirType.micro, { color: checkOut?.completedAt ? C.success : colors.textMut }]}>
                  {checkOut?.completedAt ? 'הושלם' : 'עתידי'}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardBody, dirType.caption, { color: colors.textMut }]}>
              החזרת הדירה, תיעוד צ׳ק-אאוט ואישור סופי של פיקדונות.
            </Text>

            {checkOut?.completedAt ? (
              <View style={styles.checkoutSummary}>
                <Text style={[styles.checkoutNotes, dirType.caption, { color: colors.text }]}>
                  הערות סיכום: {checkOut.notes || 'אין הערות.'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: colors.border }]}
                onPress={() => navigation.navigate('CheckOut', { contractId: contract.id })}
              >
                <Text style={[styles.outlineBtnText, dirType.label, { color: colors.text }]}>
                  מעבר לתהליך צ׳ק-אאוט
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {renderTimelineNode('exit-outline', C.success, !!checkOut?.completedAt)}
      </View>
    </View>
  );

  if (isDesktop) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        {/* Desktop Header */}
        <View style={[styles.desktopHeader, { borderBottomColor: colors.border, flexDirection: flexRow, justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.desktopTitle, { color: dirApp.primary }]}>יומן השכירות שלי</Text>
            <Text style={[styles.desktopSubtitle, { color: colors.textMut }]}>
              ציר זמן של תקופת השכירות, תשלומים וקריאות שירות
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchJournalData}>
            <Ionicons name="refresh-outline" size={22} color={dirApp.primary} />
          </TouchableOpacity>
        </View>

        {/* Desktop Split Container */}
        <View style={styles.desktopContainer}>
          {/* Left Column: Timeline Stepper */}
          <ScrollView
            style={styles.desktopTimelineColumn}
            contentContainerStyle={styles.desktopScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderTimelineContent()}
          </ScrollView>

          {/* Right Column: Property Details & Summary Sidebar */}
          <View style={[styles.desktopSidebarColumn, { backgroundColor: colors.bgCard, borderLeftColor: colors.border }]}>
            {/* Property Card Header */}
            <View style={styles.sidebarSection}>
              <View style={[styles.sidebarPropertyHeader, { flexDirection: flexRow }]}>
                <Ionicons name="business" size={32} color={dirApp.secondary} />
                <View style={styles.sidebarPropertyText}>
                  <Text style={[styles.sidebarPropertyName, { color: colors.text }]}>
                    הדירה המושכרת
                  </Text>
                  <Text style={[styles.sidebarPropertyAddress, { color: colors.textSub }]}>
                    {contract.apartment?.address || 'תל אביב, פלורנטין'}
                  </Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textMut }]}>תקופת שכירות:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {contract.startDate} עד {contract.endDate}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textMut }]}>שכר דירה חודשי:</Text>
                <Text style={[styles.infoValue, { color: colors.text, fontWeight: '700' }]}>
                  ₪{contract.monthlyRent?.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Landlord Contact Info */}
            <View style={styles.sidebarSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>פרטי בעל הבית</Text>
              <View style={[styles.landlordRow, { flexDirection: flexRow }]}>
                <View style={[styles.landlordAvatar, { backgroundColor: dirApp.secondary }]}>
                  <Text style={styles.landlordInitials}>
                    {((contract.landlord?.firstName?.[0] || 'ב') + (contract.landlord?.lastName?.[0] || 'ה')).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.landlordInfo}>
                  <Text style={[styles.landlordName, { color: colors.text }]}>
                    {contract.landlord?.firstName} {contract.landlord?.lastName}
                  </Text>
                  <Text style={[styles.landlordPhone, { color: colors.textSub }]}>
                    {contract.landlord?.phone || '050-1234567'}
                  </Text>
                </View>
              </View>
              {contract.landlord?.phone ? (
                <TouchableOpacity
                  style={[styles.sidebarBtn, { backgroundColor: '#25D366' }]}
                  onPress={() => Linking.openURL(`https://wa.me/${contract.landlord.phone.replace(/[^0-9+]/g, '')}`)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
                  <Text style={styles.sidebarBtnText}>שלח הודעה ב-WhatsApp</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Quick Actions */}
            <View style={styles.sidebarSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>פעולות מהירות</Text>
              <TouchableOpacity
                style={[styles.actionLink, { flexDirection: flexRow }]}
                onPress={() => navigation.navigate('Maintenance', { contractId: contract.id })}
                activeOpacity={0.7}
              >
                <Ionicons name="construct-outline" size={18} color={dirApp.secondary} style={{ marginLeft: 8 }} />
                <Text style={[styles.actionLinkLabel, { color: colors.text }]}>פתיחת קריאת שירות</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionLink, { flexDirection: flexRow, marginTop: 10 }]}
                onPress={() => navigation.navigate('RentPayments')}
                activeOpacity={0.7}
              >
                <Ionicons name="cash-outline" size={18} color={dirApp.secondary} style={{ marginLeft: 8 }} />
                <Text style={[styles.actionLinkLabel, { color: colors.text }]}>צפייה בלוח תשלומים</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionLink, { flexDirection: flexRow, marginTop: 10 }]}
                onPress={() => navigation.navigate('ContractDetail', { contractId: contract.id })}
                activeOpacity={0.7}
              >
                <Ionicons name="document-text-outline" size={18} color={dirApp.secondary} style={{ marginLeft: 8 }} />
                <Text style={[styles.actionLinkLabel, { color: colors.text }]}>צפייה בחוזה השכירות</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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

        {renderTimelineContent()}

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
  checkoutNotes: { textAlign: 'right' },
  desktopHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  desktopTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: fontFamily.bold,
  },
  desktopSubtitle: {
    fontSize: 14,
    marginTop: 4,
    fontFamily: fontFamily.regular,
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row-reverse',
  },
  desktopTimelineColumn: {
    flex: 1,
  },
  desktopScrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  desktopSidebarColumn: {
    width: 340,
    borderLeftWidth: 1,
    padding: 20,
    gap: 20,
  },
  sidebarSection: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 12,
  },
  sidebarPropertyHeader: {
    alignItems: 'center',
    gap: 12,
  },
  sidebarPropertyText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  sidebarPropertyName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  sidebarPropertyAddress: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: fontFamily.regular,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 4,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'right',
    fontFamily: fontFamily.bold,
  },
  landlordRow: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  landlordAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  landlordInitials: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  landlordInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  landlordName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontFamily.medium,
  },
  landlordPhone: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: fontFamily.regular,
  },
  sidebarBtn: {
    borderRadius: 10,
    height: 40,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: fontFamily.bold,
  },
  actionLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionLinkLabel: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
  },
});
