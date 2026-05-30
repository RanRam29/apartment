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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { tenantApi } from '../services/api';
import { C } from '../theme';
import { dirType } from '../theme/textStyles';
import { dirApp } from '../theme/dirAppTokens';
import { useColors } from '../context/ThemeContext';
import { useDirection } from '../hooks/useDirection';
import { showAlert } from '../utils/alert';

const { width: W } = Dimensions.get('window');

interface JournalData {
  contract: any;
  ledgerEntries: any[];
  checkIn: {
    rooms: any[];
    completedAt: string | null;
  } | null;
  maintenance: any[];
  checkOut: {
    rooms: any[];
    notes: string;
    completedAt: string | null;
  } | null;
}

export default function RenterJournalScreen() {
  const colors = useColors();
  const navigation = useNavigation<any>();
  const { flexRow, textAlign } = useDirection();
  const [data, setData] = useState<JournalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  useEffect(() => {
    fetchJournalData();
  }, []);

  const fetchJournalData = async () => {
    try {
      setIsLoading(true);
      const res = await tenantApi.getJournal();
      setData(res.data);
    } catch (err: any) {
      showAlert('שגיאה', 'טעינת יומן השכירות נכשלה.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={dirApp.primary} />
        <Text style={[styles.loadingText, dirType.body, { color: colors.textMut }]}>
          טוען את ציר הזמן של הדירה שלך...
        </Text>
      </View>
    );
  }

  if (!data || !data.contract) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={[styles.topBar, { flexDirection: flexRow }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-forward" size={24} color={dirApp.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, dirType.heading, { color: dirApp.primary }]}>יומן השכירות</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color={colors.textMut} />
          <Text style={[styles.emptyText, dirType.subhead, { color: colors.text, textAlign: 'center' }]}>
            לא נמצא חוזה שכירות פעיל עבורך.
          </Text>
          <Text style={[styles.emptySubText, dirType.body, { color: colors.textMut, textAlign: 'center' }]}>
            כאשר תחתום על חוזה דיגיטלי, יומן השכירות המלא שלך יופיע כאן.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { contract, ledgerEntries, checkIn, maintenance, checkOut } = data;

  const renderTimelineNode = (iconName: any, nodeColor: string, isCompleted: boolean) => (
    <View style={styles.timelineNodeWrapper}>
      <View style={[styles.timelineLine, { backgroundColor: isCompleted ? dirApp.secondary : `${colors.border}66` }]} />
      <View style={[styles.nodeCircle, { backgroundColor: isCompleted ? nodeColor : `${colors.bgCard}` , borderColor: isCompleted ? nodeColor : `${colors.border}` }]}>
        <Ionicons name={iconName} size={18} color={isCompleted ? C.onInverse.primary : colors.textMut} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.topBar, { flexDirection: flexRow }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color={dirApp.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.title, dirType.heading, { color: dirApp.primary }]}>יומן השכירות שלי</Text>
          <Text style={[styles.subtitle, dirType.micro, { color: colors.textMut }]}>
            ניהול ומעקב אחר תקופת השכירות
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchJournalData}>
          <Ionicons name="refresh-outline" size={22} color={dirApp.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Active Contract Info */}
        <View style={[styles.propertyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.propertyHeader, { flexDirection: flexRow }]}>
            <Ionicons name="business" size={32} color={dirApp.primary} />
            <View style={styles.propertyText}>
              <Text style={[styles.propertyName, dirType.subhead, { color: colors.text }]}>
                הדירה שלך
              </Text>
              <Text style={[styles.propertyDates, dirType.caption, { color: colors.textMut }]}>
                תקופת החוזה: {contract.startDate} עד {contract.endDate}
              </Text>
            </View>
          </View>
        </View>

        {/* Vertical Timeline container */}
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
      </ScrollView>
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
  refreshBtn: { padding: 8 },
  title: { fontSize: 18, fontWeight: 'bold' },
  subtitle: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  scrollContent: { padding: 16, paddingBottom: 60 },
  propertyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  propertyHeader: { alignItems: 'center', gap: 12 },
  propertyText: { flex: 1, alignItems: 'flex-end' },
  propertyName: { fontWeight: 'bold', marginBottom: 4 },
  propertyDates: {},
  timelineContainer: {
    paddingRight: 8,
  },
  timelineItem: {
    marginBottom: 24,
    justifyContent: 'flex-end',
  },
  cardContent: {
    flex: 1,
    marginRight: 16,
  },
  timelineCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: { fontWeight: 'bold' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontWeight: 'bold' },
  cardBody: {
    marginBottom: 12,
    textAlign: 'right',
    lineHeight: 16,
  },
  cardFooter: {
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
    marginTop: 4,
  },
  footerText: { fontWeight: '600' },
  timelineNodeWrapper: {
    width: 40,
    alignItems: 'center',
  },
  timelineLine: {
    position: 'absolute',
    top: 0,
    bottom: -40,
    width: 2,
    zIndex: 1,
  },
  nodeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyText: { fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptySubText: { textAlign: 'center', lineHeight: 20 },
  roomsList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  roomItem: {
    marginVertical: 4,
  },
  roomHeaderRow: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  roomName: { fontWeight: '500' },
  photosScroll: {
    marginVertical: 6,
    paddingRight: 10,
  },
  roomPhoto: {
    width: 100,
    height: 75,
    borderRadius: 8,
    marginLeft: 8,
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  actionBtnText: { fontWeight: 'bold' },
  outlineBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  outlineBtnText: { fontWeight: 'bold' },
  ledgerList: {
    marginTop: 10,
    gap: 8,
  },
  ledgerItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  ledgerInfo: {
    flex: 1,
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  ledgerMonth: { fontWeight: '600' },
  ledgerDue: {},
  ledgerAmount: { fontWeight: 'bold' },
  morePaymentsText: {
    marginTop: 4,
    fontWeight: '500',
  },
  ticketsList: {
    marginTop: 10,
    gap: 8,
  },
  ticketItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  ticketHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ticketTitle: { fontWeight: 'bold', flex: 1, textAlign: 'right' },
  ticketStatus: { fontWeight: 'bold', marginLeft: 8 },
  ticketDesc: { textAlign: 'right' },
  checkoutSummary: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 10,
    borderRadius: 8,
  },
  checkoutNotes: { textAlign: 'right' },
});
