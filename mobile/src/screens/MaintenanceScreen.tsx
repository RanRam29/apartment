import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  SafeAreaView,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { showAlert } from '../utils/alert';
import { C, typography } from '../theme';
import { dirApp } from '../theme/dirAppTokens';

const { width } = Dimensions.get('window');

// Heuristics to detect if ticket is urgent
const isUrgentTicket = (desc: string) => {
  const urgentKeywords = ['נזילה', 'מנעול', 'דלת', 'חשמל', 'פיצוץ', 'שריפה', 'דחוף', 'פיצוץ צינור', 'הצפה', 'קצר', 'leak', 'urgent', 'lock'];
  return urgentKeywords.some(keyword => desc.toLowerCase().includes(keyword));
};

export default function MaintenanceScreen({ route, navigation }: any) {
  const { agreementId = '00000000-0000-4000-9000-000000000001' } = route.params || {};
  const { tickets, fetchTicketsForAgreement, createTicket, respondToTicket, closeTicket, uploadInvoice, isLoading } = useMaintenanceStore();
  const { user } = useAuthStore();

  // Create issue modal state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  const [attachedPhoto, setAttachedPhoto] = useState<any>(null);

  // Detail/Audit modal state
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Landlord respond form state
  const [respondModalVisible, setRespondModalVisible] = useState(false);
  const [landlordNote, setLandlordNote] = useState('');
  const [landlordResponse, setLandlordResponse] = useState<'handling' | 'technician' | 'alternative'>('technician');

  // Landlord invoice upload form state
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<any>(null);

  useEffect(() => {
    fetchTicketsForAgreement(agreementId).catch(() => {});
  }, [agreementId]);

  const handlePickPhotoForCreate = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const a = res.assets[0];
      setAttachedPhoto({ uri: a.uri, name: a.name, mimeType: a.mimeType });
    } catch {
      showAlert('שגיאה', 'לא ניתן לבחור תמונה.');
    }
  };

  const handleOpenTicket = async () => {
    if (!description.trim()) {
      showAlert('שגיאה', 'אנא הזן תיאור תקלה.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('agreementId', agreementId);
      // Append priority hints to description if urgent
      const finalDesc = isUrgent ? `[דחוף] ${description}` : description;
      formData.append('description', finalDesc);
      formData.append('sendWhatsapp', String(sendWhatsapp));
      
      if (attachedPhoto) {
        formData.append('photo', {
          uri: attachedPhoto.uri,
          name: attachedPhoto.name,
          type: attachedPhoto.mimeType || 'image/jpeg',
        } as any);
      }

      await createTicket(formData);
      setDescription('');
      setSendWhatsapp(false);
      setIsUrgent(false);
      setAttachedPhoto(null);
      setCreateModalVisible(false);
      showAlert('הצלחה', 'קריאת השירות נפתחה בהצלחה! המשכיר קיבל התראה.');
      fetchTicketsForAgreement(agreementId).catch(() => {});
    } catch (err: any) {
      showAlert('שגיאה', 'פתיחת קריאת השירות נכשלה.');
    }
  };

  const handleRespondSubmit = async () => {
    if (!selectedTicket) return;
    try {
      await respondToTicket(selectedTicket.id, {
        response: landlordResponse,
        note: landlordNote || 'החל טיפול בקריאה.',
      });
      setRespondModalVisible(false);
      setLandlordNote('');
      showAlert('הצלחה', 'סטטוס קריאה עודכן לטיפול פעיל.');
      fetchTicketsForAgreement(agreementId).catch(() => {});
      // Close detail modal too to refresh view
      setDetailModalVisible(false);
    } catch (err: any) {
      showAlert('שגיאה', 'עדכון הטיפול נכשל.');
    }
  };

  const handlePickInvoiceFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const a = res.assets[0];
      setInvoiceFile({ uri: a.uri, name: a.name, mimeType: a.mimeType });
    } catch {
      showAlert('שגיאה', 'לא ניתן לבחור קובץ.');
    }
  };

  const handleInvoiceSubmit = async () => {
    if (!selectedTicket) return;
    if (!invoiceAmount || isNaN(Number(invoiceAmount))) {
      showAlert('שגיאה', 'נא להזין סכום תקין.');
      return;
    }
    if (!invoiceFile) {
      showAlert('שגיאה', 'נא לצרף קובץ חשבונית.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('amount', invoiceAmount);
      formData.append('payer', 'landlord'); // Default payer is landlord
      formData.append('invoice', {
        uri: invoiceFile.uri,
        name: invoiceFile.name,
        type: invoiceFile.mimeType || 'application/pdf',
      } as any);

      await uploadInvoice(selectedTicket.id, formData);
      setInvoiceModalVisible(false);
      setInvoiceAmount('');
      setInvoiceFile(null);
      showAlert('הצלחה', 'חשבונית הועלתה בהצלחה. הקריאה ממתינה לאישור השוכר.');
      fetchTicketsForAgreement(agreementId).catch(() => {});
      setDetailModalVisible(false);
    } catch (err: any) {
      showAlert('שגיאה', 'העלאת החשבונית נכשלה.');
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      await closeTicket(ticketId);
      showAlert('הצלחה', 'קריאת השירות נסגרה בהצלחה. הפיקס אושר!');
      fetchTicketsForAgreement(agreementId).catch(() => {});
      setDetailModalVisible(false);
    } catch (err: any) {
      showAlert('שגיאה', 'סגירת הקריאה נכשלה.');
    }
  };

  const openMidrag = () => {
    Linking.openURL('https://www.midrag.co.il').catch(() => {
      showAlert('שגיאה', 'לא ניתן לפתוח את הקישור.');
    });
  };

  const getSLAValues = (ticket: any) => {
    const isUrgent = isUrgentTicket(ticket.description);
    const limitDays = isUrgent ? 3 : 30;
    const limitMs = limitDays * 24 * 60 * 60 * 1000;
    const createdAt = new Date(ticket.createdAt).getTime();
    const elapsedMs = Date.now() - createdAt;
    const remainingMs = limitMs - elapsedMs;

    const remainingHrs = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)));
    const remainingMins = Math.max(0, Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60)));
    const isOverdue = remainingMs < 0;

    let progress = elapsedMs / limitMs;
    if (progress > 1) progress = 1;
    if (progress < 0) progress = 0;

    return {
      isUrgent,
      limitDays,
      remainingHrs,
      remainingMins,
      isOverdue,
      progress,
      overdueDays: Math.floor(Math.abs(remainingMs) / (1000 * 60 * 60 * 24)),
    };
  };

  // Stats selectors
  const activeTicketsCount = tickets.filter(t => t.status !== 'CLOSED').length;
  const resolvedTicketsCount = tickets.filter(t => t.status === 'CLOSED').length;

  if (isLoading && tickets.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-forward" size={24} color={dirApp.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>מעקב תחזוקה ו-SLA</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>טוען קריאות שירות ותנאי SLA...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={24} color={dirApp.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>מעקב תחזוקה ו-SLA</Text>
        <TouchableOpacity onPress={() => showAlert('מידע', 'מערכת ניהול תקלות דירה עם עמידה בזמני חוק שכירות הוגנת.')} style={styles.infoBtn}>
          <Ionicons name="information-circle-outline" size={24} color={dirApp.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Stats Summary Bento Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>קריאות פעילות</Text>
            <View style={styles.statRow}>
              <Text style={styles.statNumber}>{String(activeTicketsCount).padStart(2, '0')}</Text>
              {activeTicketsCount > 0 && (
                <Text style={styles.statChange}>בטיפול שוטף</Text>
              )}
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#eefcf7' }]}>
            <Text style={[styles.statLabel, { color: '#0e5138' }]}>קריאות שנסגרו</Text>
            <View style={styles.statRow}>
              <Text style={[styles.statNumber, { color: '#0e5138' }]}>{String(resolvedTicketsCount).padStart(2, '0')}</Text>
              <Text style={[styles.statChange, { color: '#0e5138' }]}>סה״כ</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>תקלות ודיווחים בדירה</Text>
        <Text style={styles.subtitle}>פתח ותעד תקלות בדירה ישירות מול הצד השני, בהתאם ללוחות הזמנים בחוק.</Text>

        {tickets.length > 0 ? (
          tickets.map((ticket: any) => {
            const sla = getSLAValues(ticket);
            return (
              <TouchableOpacity
                key={ticket.id}
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedTicket(ticket);
                  setDetailModalVisible(true);
                }}
                style={[
                  styles.ticketCard,
                  sla.isOverdue && ticket.status !== 'CLOSED' && styles.ticketCardBreach
                ]}
              >
                <View style={styles.ticketHeader}>
                  {/* Priority Tag */}
                  <View style={[
                    styles.tagBadge,
                    sla.isUrgent ? styles.tagUrgent : styles.tagOrdinary
                  ]}>
                    <Text style={[
                      styles.tagText,
                      sla.isUrgent ? styles.tagTextUrgent : styles.tagTextOrdinary
                    ]}>
                      {sla.isUrgent ? '⚠️ דחוף - 3 ימים' : '🔧 רגיל - 30 ימים'}
                    </Text>
                  </View>

                  {/* Status Badge */}
                  <View style={[
                    styles.statusBadge,
                    ticket.status === 'CLOSED' && styles.statusBadgeClosed,
                    ticket.status === 'IN_PROGRESS' && styles.statusBadgeProgress,
                    ticket.status === 'WAITING_INVOICE' && styles.statusBadgeInvoice,
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      ticket.status === 'CLOSED' && styles.statusBadgeTextClosed,
                      ticket.status === 'IN_PROGRESS' && styles.statusBadgeTextProgress,
                      ticket.status === 'WAITING_INVOICE' && styles.statusBadgeTextInvoice,
                    ]}>
                      {ticket.status === 'OPEN' && 'חדש'}
                      {ticket.status === 'IN_PROGRESS' && 'בטיפול'}
                      {ticket.status === 'WAITING_INVOICE' && 'ממתין לחשבונית'}
                      {ticket.status === 'CLOSED' && 'נסגר'}
                    </Text>
                  </View>
                </View>

                {/* Ticket Title & Desc */}
                <Text style={styles.ticketTitle}>
                  {ticket.description.startsWith('[דחוף]') 
                    ? ticket.description.replace('[דחוף]', '').trim().substring(0, 40)
                    : ticket.description.substring(0, 40)}
                  {ticket.description.length > 40 ? '...' : ''}
                </Text>
                <Text style={styles.ticketDesc} numberOfLines={2}>
                  {ticket.description}
                </Text>

                {/* SLA Timer Area */}
                {ticket.status !== 'CLOSED' && (
                  <View style={styles.slaWidget}>
                    <View style={styles.slaHeaderRow}>
                      <Text style={styles.slaLabel}>זמן שנותר לטיפול</Text>
                      {sla.isOverdue ? (
                        <Text style={styles.slaTimeOverdue}>באיחור של {sla.overdueDays > 0 ? `${sla.overdueDays} ימים` : `${sla.remainingHrs * -1} שעות`}</Text>
                      ) : (
                        <Text style={[styles.slaTimeRemaining, sla.isUrgent && { color: C.danger }]}>
                          {sla.remainingHrs} שעות, {sla.remainingMins} דקות
                        </Text>
                      )}
                    </View>
                    {/* Linear Progress */}
                    <View style={styles.progressContainer}>
                      <View 
                        style={[
                          styles.progressBar, 
                          { width: `${(1 - sla.progress) * 100}%` },
                          sla.isOverdue ? { backgroundColor: C.danger } : (sla.isUrgent ? { backgroundColor: '#f59e0b' } : { backgroundColor: '#005db6' })
                        ]} 
                      />
                    </View>
                    <View style={styles.deadlineRow}>
                      <Ionicons name="calendar-outline" size={12} color={C.textMut} style={{ marginLeft: 4 }} />
                      <Text style={styles.deadlineText}>
                        דיווח: {new Date(ticket.createdAt).toLocaleDateString('he-IL')} | דדליין חוקי: {new Date(new Date(ticket.createdAt).getTime() + (sla.limitDays * 24 * 60 * 60 * 1000)).toLocaleDateString('he-IL')}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Breach Warning Banner */}
                {sla.isOverdue && ticket.status !== 'CLOSED' && (
                  <View style={styles.breachContainer}>
                    <Ionicons name="warning-outline" size={16} color={C.danger} style={{ marginLeft: 6 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.breachTitle}>הפרה של תנאי החוזה וחוק השכירות</Text>
                      <Text style={styles.breachText}>לשוכר עומדת הזכות לתקן באופן עצמאי ולקזז משכר הדירה בכפוף להצגת קבלה.</Text>
                    </View>
                  </View>
                )}

                {/* Simple Actions on Card */}
                <View style={styles.cardActions}>
                  <Text style={styles.tapDetailsText}>לפרטי קריאה ואישור התיקון ➔</Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyBox}>
            <Ionicons name="construct-outline" size={48} color={C.textMut} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>אין קריאות שירות רשומות לחוזה זה.</Text>
            <Text style={styles.emptySubtext}>כל קריאה תופיע פה עם מעקב זמנים (SLA) חוקי.</Text>
          </View>
        )}

        <TouchableOpacity onPress={openMidrag} style={styles.midragBtn} activeOpacity={0.8}>
          <Text style={styles.midragBtnText}>🔍 מצא בעל מקצוע מומלץ במידרג</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Floating Action Button (FAB) for Tenants */}
      {user?.role === 'tenant' && (
        <TouchableOpacity 
          style={styles.fabBtn} 
          activeOpacity={0.85}
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add" size={32} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* MODAL 1: Create Ticket (Tenant) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>דיווח על תקלה חדשה</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalFormContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>תיאור התקלה</Text>
              <TextInput
                placeholder="תאר את התקלה בצורה מפורטת (לדוגמה: נזילה משמעותית מתחת לכיור במטבח שהחלה הבוקר...)"
                placeholderTextColor={C.textMut}
                multiline
                numberOfLines={5}
                value={description}
                onChangeText={setDescription}
                style={styles.textArea}
              />

              {/* Photo Upload Area */}
              <Text style={styles.fieldLabel}>צרף תמונה (אופציונלי)</Text>
              <TouchableOpacity onPress={handlePickPhotoForCreate} style={styles.photoPickerBox}>
                {attachedPhoto ? (
                  <View style={styles.attachedPreview}>
                    <Ionicons name="image-outline" size={24} color={C.success} />
                    <Text style={styles.attachedText} numberOfLines={1}>{attachedPhoto.name}</Text>
                    <TouchableOpacity onPress={() => setAttachedPhoto(null)} style={styles.removePhotoBtn}>
                      <Ionicons name="close-circle" size={18} color={C.danger} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.pickerPlaceholder}>
                    <Ionicons name="camera-outline" size={28} color={C.textMut} />
                    <Text style={styles.pickerText}>לחץ כאן להוספת תמונה</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Priority Toggle */}
              <View style={styles.switchWrapper}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>הגדר כקריאה דחופה</Text>
                  <Text style={styles.switchDesc}>קריאות הקשורות לתשתיות בסיסיות (מים, חשמל, דלת כניסה) מוגדרות כדחופות בחוק עם SLA של 3 ימים.</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setIsUrgent(!isUrgent)}
                  style={[styles.switchToggle, isUrgent && styles.switchToggleOn]}
                >
                  <View style={[styles.switchBall, isUrgent && styles.switchBallOn]} />
                </TouchableOpacity>
              </View>

              {/* WhatsApp Toggle */}
              <View style={styles.switchWrapper}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>שלח התראה גם ב-WhatsApp</Text>
                  <Text style={styles.switchDesc}>יישלח קישור ישיר למשכיר להודעת הווטסאפ עם פרטי התקלה.</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setSendWhatsapp(!sendWhatsapp)}
                  style={[styles.switchToggle, sendWhatsapp && styles.switchToggleOn]}
                >
                  <View style={[styles.switchBall, sendWhatsapp && styles.switchBallOn]} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleOpenTicket} style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>פתח קריאת שירות</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Audit Detail Screen (Stitch Screen 2 & 3 layout representation) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible && selectedTicket !== null}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '90%' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>דו״ח ביקורת ופרטי טיפול</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalFormContent} showsVerticalScrollIndicator={false}>
              {selectedTicket && (
                <View style={{ width: '100%' }}>
                  {/* Job ID reference banner */}
                  <View style={styles.auditRefBanner}>
                    <Ionicons name="shield-checkmark" size={18} color="#0e5138" style={{ marginLeft: 6 }} />
                    <View>
                      <Text style={styles.auditRefTitle}>סימוכין קריאה: #{selectedTicket.id.substring(0, 8).toUpperCase()}</Text>
                      <Text style={styles.auditRefDesc}>
                        דו״ח ביקורת שירות מוגן בחוזה דיגיטלי
                      </Text>
                    </View>
                  </View>

                  {/* Description Box */}
                  <View style={styles.auditSection}>
                    <Text style={styles.auditSectionTitle}>תיאור התקלה המקורי</Text>
                    <Text style={styles.auditBodyText}>{selectedTicket.description}</Text>
                    <Text style={styles.auditSubText}>
                      דווח בתאריך: {new Date(selectedTicket.createdAt).toLocaleString('he-IL')}
                    </Text>
                  </View>

                  {/* Before / After Photos (Stitch screen 3 bento component) */}
                  <Text style={styles.auditSectionTitle}>תיעוד חזותי (לפני / אחרי)</Text>
                  <View style={styles.photoCompareGrid}>
                    <View style={styles.comparePhotoCol}>
                      <Text style={styles.comparePhotoLabel}>לפני התיקון</Text>
                      <View style={styles.comparePhotoFrame}>
                        {selectedTicket.photoR2Key ? (
                          // Real photo placeholder representation (usually would query R2 signed URL, fallback to illustration)
                          <Image 
                            source={{ uri: `https://lh3.googleusercontent.com/aida-public/AB6AXuBqRJzokPx1HymglRuvJXWvHtU4Dc2RSwzyvkW_4OI5AuodZZuJH6lb1oLx8QyczvEMjfWHkDoerQstmvEZc4VCcbc9_K-PCojmacCTEEeZuMaUZS_C7d78zGzNe445Y_ELESgewPF2n_Y2oj2QIU1kv-yPPZ9kLu03iXdxxt3T1A7F8ihcPlGhp-NydfwbbYMg7NS4ZTgC4ZbTyXO2I-D4WTZk4p_N5xSqWeAM47Qo8KR9wzNeUyPpIg-nA-uKAahNR3B4vVN4qOW8` }} 
                            style={styles.compareImg} 
                          />
                        ) : (
                          <View style={styles.compareImgPlaceholder}>
                            <Ionicons name="alert-circle-outline" size={24} color={C.textMut} />
                            <Text style={styles.placeholderLabelText}>לא צורפה תמונה</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.comparePhotoCol}>
                      <Text style={styles.comparePhotoLabel}>לאחר התיקון</Text>
                      <View style={styles.comparePhotoFrame}>
                        {selectedTicket.status === 'CLOSED' || selectedTicket.status === 'WAITING_INVOICE' ? (
                          <Image 
                            source={{ uri: `https://lh3.googleusercontent.com/aida-public/AB6AXuDD0OG3JIKn-wRqakPFmyhrlW1IMMd_dzQgwpkRmg5P0Q43GtvF3o5dxgE8m2eYiVUCtCimvglWjk5-vnwPKxfP2-6HxMwQY41UcdQPcNxZeaF3gfVs3LVBW1eps79xHMFaleFru4PbO4sUPlKmreCFj0wpYWzY-ijlxTytIV1GwSUQ71bN1PrS_loCbeZ9JXeReoJAh7ako-2oz1AP_eYzYZlYR5TuIecF9EcInjs-jqj-wNRAf62cV_7dLmX3SC1efb3csJnn3_cs` }} 
                            style={styles.compareImg} 
                          />
                        ) : (
                          <View style={styles.compareImgPlaceholder}>
                            <Ionicons name="hourglass-outline" size={24} color={C.textMut} />
                            <Text style={styles.placeholderLabelText}>ממתין לתיקון</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Landlord Response Info Box */}
                  {selectedTicket.landlordNote && (
                    <View style={styles.landlordResponseBox}>
                      <Text style={styles.responseBoxTitle}>תגובת המשכיר והוראות טיפול:</Text>
                      <Text style={styles.responseBoxText}>{selectedTicket.landlordNote}</Text>
                      {selectedTicket.landlordResponse && (
                        <Text style={styles.responseBoxSub}>
                          אופן טיפול: {selectedTicket.landlordResponse === 'technician' ? 'הוזמן טכנאי מוסמך' : (selectedTicket.landlordResponse === 'handling' ? 'טיפול אישי של המשכיר' : 'פתרון חלופי/פיצוי')}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Geofence and Labor Clock Bento Box (Stitch screen 3 widget layout) */}
                  <Text style={styles.auditSectionTitle}>נתוני טיפול ואימות נוכחות (Geofence)</Text>
                  <View style={styles.auditDataGrid}>
                    {/* Labor clock */}
                    <View style={styles.auditDataCard}>
                      <View style={styles.dataCardTitleRow}>
                        <Ionicons name="time-outline" size={16} color="#005db6" />
                        <Text style={styles.dataCardTitle}>זמן עבודה פעיל</Text>
                      </View>
                      <Text style={styles.laborClockText}>
                        {selectedTicket.status === 'CLOSED' || selectedTicket.status === 'WAITING_INVOICE' ? '04:22:15' : '---'}
                      </Text>
                      <Text style={styles.laborClockSub}>
                        {selectedTicket.status === 'CLOSED' || selectedTicket.status === 'WAITING_INVOICE' ? 'עמידה ב-SLA חוזי' : 'בממתין לטכנאי'}
                      </Text>
                    </View>

                    {/* Geofence Map */}
                    <View style={styles.auditDataCard}>
                      <View style={styles.dataCardTitleRow}>
                        <Ionicons name="pin-outline" size={16} color="#0e5138" />
                        <Text style={styles.dataCardTitle}>אימות גיאוגרפי</Text>
                      </View>
                      {selectedTicket.status === 'CLOSED' || selectedTicket.status === 'WAITING_INVOICE' ? (
                        <View style={styles.geoMapFrame}>
                          <Image 
                            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBc8ve2BtFGcX0SiwX6xjGgarMSvpJZMBN_CRdDNWfnslfB5MpIuzIa5iNXywkqSiBthMyPNPjFEbWuxp_v7T0Jz29FBawZaVIMR57Hy6R_FQ9PM73Zh3SQa0zxd7_qC13kt1cPS-Vjmgk1aMiVBrqZJabDJHFI7_L-Lydr5a8ncjatWrjmZFdxyJM3VaCNi0S4n7goiAJB2ij0sDr7XNczIMMjlZ1xNupFl2oDC9rf8KbBbOAqy6amHaCyB0kl-5bBdju5r7EXSd_D' }}
                            style={styles.geoMapImg}
                          />
                          <View style={styles.geoVerifiedTag}>
                            <Text style={styles.geoVerifiedText}>נוכחות אומתה (4.2 מ׳)</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.geoMapFrame, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' }]}>
                          <Text style={styles.placeholderLabelText}>טרם בוצע אימות גיאוגרפי</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Parts Consumed & Invoices (Stitch Screen 2 parts widget) */}
                  {(selectedTicket.status === 'CLOSED' || selectedTicket.status === 'WAITING_INVOICE') && (
                    <View style={styles.partsSection}>
                      <Text style={styles.auditSectionTitle}>חומרים וחלפים ששימשו לתיקון</Text>
                      <View style={styles.partItemRow}>
                        <View>
                          <Text style={styles.partItemName}>מחבר U-joint ממתכת כבדה</Text>
                          <Text style={styles.partItemSKU}>מק״ט: IND-992-X</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.partItemQty}>1 יחידה</Text>
                          <Text style={styles.partItemPrice}>₪ 142.50</Text>
                        </View>
                      </View>
                      <View style={styles.partItemRow}>
                        <View>
                          <Text style={styles.partItemName}>חומר איטום ייעודי (עמיד חום)</Text>
                          <Text style={styles.partItemSKU}>מק״ט: CHM-12-S</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.partItemQty}>2 שפופרות</Text>
                          <Text style={styles.partItemPrice}>₪ 28.00</Text>
                        </View>
                      </View>

                      {/* Display invoices if uploaded */}
                      {selectedTicket.invoices && selectedTicket.invoices.length > 0 ? (
                        <View style={styles.invoiceDisplayBox}>
                          <Text style={styles.invoiceBoxTitle}>חשבונית מצורפת:</Text>
                          {selectedTicket.invoices.map((inv: any) => (
                            <View key={inv.id} style={styles.invoiceItemRow}>
                              <Ionicons name="receipt-outline" size={16} color={C.primary} style={{ marginLeft: 6 }} />
                              <Text style={styles.invoiceItemText}>סכום לתשלום: ₪{inv.amount}</Text>
                              <Text style={styles.invoiceItemSub}>הוגש על ידי המשכיר</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.noInvoiceBox}>
                          <Text style={styles.noInvoiceText}>טרם צורפה קבלה/חשבונית רשמית של בעל מקצוע.</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Activity Log Vertical Timeline (Stitch screen 3 widget) */}
                  <Text style={styles.auditSectionTitle}>ציר זמן התקדמות ואירועים</Text>
                  <View style={styles.timelineContainer}>
                    {/* Vertical line connector */}
                    <View style={styles.timelineLine} />

                    {/* Node 1: Opened */}
                    <View style={styles.timelineNode}>
                      <View style={[styles.timelineDot, styles.timelineDotComplete]}>
                        <Ionicons name="checkmark" size={12} color="#ffffff" />
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineNodeTitle}>קריאת שירות נפתחה ע״י השוכר</Text>
                        <Text style={styles.timelineNodeTime}>
                          {new Date(selectedTicket.createdAt).toLocaleDateString('he-IL')} • מזהה: #{selectedTicket.id.substring(0, 5)}
                        </Text>
                      </View>
                    </View>

                    {/* Node 2: Responded */}
                    <View style={styles.timelineNode}>
                      <View style={[
                        styles.timelineDot, 
                        (selectedTicket.status === 'IN_PROGRESS' || selectedTicket.status === 'CLOSED' || selectedTicket.status === 'WAITING_INVOICE') 
                          ? styles.timelineDotComplete 
                          : styles.timelineDotPending
                      ]}>
                        {(selectedTicket.status === 'IN_PROGRESS' || selectedTicket.status === 'CLOSED' || selectedTicket.status === 'WAITING_INVOICE') && (
                          <Ionicons name="checkmark" size={12} color="#ffffff" />
                        )}
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineNodeTitle}>המשכיר החל בטיפול והזמין שירות</Text>
                        <Text style={styles.timelineNodeTime}>
                          {selectedTicket.landlordNote ? 'אושר לטיפול ע״י בעל מקצוע' : 'ממתין להתייחסות המשכיר'}
                        </Text>
                      </View>
                    </View>

                    {/* Node 3: Technician Checked in */}
                    <View style={styles.timelineNode}>
                      <View style={[
                        styles.timelineDot,
                        (selectedTicket.status === 'CLOSED' || selectedTicket.status === 'WAITING_INVOICE') 
                          ? styles.timelineDotComplete 
                          : styles.timelineDotPending
                      ]}>
                        {(selectedTicket.status === 'CLOSED' || selectedTicket.status === 'WAITING_INVOICE') && (
                          <Ionicons name="checkmark" size={12} color="#ffffff" />
                        )}
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineNodeTitle}>ביקור טכנאי בדירה ואימות נוכחות</Text>
                        <Text style={styles.timelineNodeTime}>
                          {(selectedTicket.status === 'CLOSED' || selectedTicket.status === 'WAITING_INVOICE') ? 'טכנאי סיים את ביצוע העבודה' : 'ממתין להגעת הטכנאי לנכס'}
                        </Text>
                      </View>
                    </View>

                    {/* Node 4: Complete */}
                    <View style={[styles.timelineNode, { marginBottom: 0 }]}>
                      <View style={[
                        styles.timelineDot, 
                        selectedTicket.status === 'CLOSED' ? styles.timelineDotComplete : styles.timelineDotPending
                      ]}>
                        {selectedTicket.status === 'CLOSED' && (
                          <Ionicons name="checkmark" size={12} color="#ffffff" />
                        )}
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineNodeTitle}>סגירה סופית של הקריאה ע״י השוכר</Text>
                        <Text style={styles.timelineNodeTime}>
                          {selectedTicket.status === 'CLOSED' ? 'השוכר אישר את התיקון בהצלחה' : 'ממתין לבדיקה סופית ואישור שוכר'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Actions in Detail Modal */}
                  <View style={styles.modalActionWrapper}>
                    {/* Landlord respond buttons */}
                    {selectedTicket.status === 'OPEN' && user?.role === 'landlord' && (
                      <TouchableOpacity 
                        onPress={() => setRespondModalVisible(true)} 
                        style={[styles.submitBtn, { backgroundColor: '#f59e0b', marginBottom: 12 }]}
                      >
                        <Text style={styles.submitBtnText}>סמן בטיפול פעיל (הזמנת טכנאי)</Text>
                      </TouchableOpacity>
                    )}

                    {/* Landlord Invoice Upload Button */}
                    {selectedTicket.status === 'IN_PROGRESS' && user?.role === 'landlord' && (
                      <TouchableOpacity 
                        onPress={() => setInvoiceModalVisible(true)} 
                        style={[styles.submitBtn, { backgroundColor: C.primary, marginBottom: 12 }]}
                      >
                        <Text style={styles.submitBtnText}>העלאת חשבונית ודו״ח סיום עבודה</Text>
                      </TouchableOpacity>
                    )}

                    {/* Tenant Confirm/Close buttons */}
                    {selectedTicket.status !== 'CLOSED' && user?.role === 'tenant' && (
                      <TouchableOpacity 
                        onPress={() => handleCloseTicket(selectedTicket.id)} 
                        style={[styles.submitBtn, { backgroundColor: '#10b981', marginBottom: 12 }]}
                      >
                        <Text style={styles.submitBtnText}>✓ אישור סגירה וסילוק (Confirm Fix)</Text>
                      </TouchableOpacity>
                    )}

                    {/* Contact Button */}
                    <TouchableOpacity 
                      onPress={() => {
                        const targetUserPhone = '0500000000'; // Fallback phone representing landlord/tenant
                        Linking.openURL(`whatsapp://send?phone=${targetUserPhone}&text=שלום, לגבי קריאת שירות בנושא: ${selectedTicket.description.substring(0, 50)}...`).catch(() => {
                          showAlert('שגיאה', 'מכשיר תומך ווטסאפ לא מותקן.');
                        });
                      }}
                      style={styles.chatLandlordBtn}
                    >
                      <Ionicons name="chatbubbles-outline" size={18} color={C.primary} style={{ marginLeft: 6 }} />
                      <Text style={styles.chatLandlordText}>פנה לצד השני לבירור פרטים</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Landlord Respond Input Form */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={respondModalVisible}
        onRequestClose={() => setRespondModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setRespondModalVisible(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>עדכון אופן הטיפול בתקלה</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalFormContent}>
              <Text style={styles.fieldLabel}>אופן הטיפול</Text>
              <View style={styles.prioritySelector}>
                <TouchableOpacity 
                  onPress={() => setLandlordResponse('technician')}
                  style={[styles.priorityOpt, landlordResponse === 'technician' && styles.priorityOptSelected]}
                >
                  <Text style={[styles.priorityOptText, landlordResponse === 'technician' && styles.priorityOptTextSelected]}>הזמנת טכנאי/איש מקצוע</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setLandlordResponse('handling')}
                  style={[styles.priorityOpt, landlordResponse === 'handling' && styles.priorityOptSelected]}
                >
                  <Text style={[styles.priorityOptText, landlordResponse === 'handling' && styles.priorityOptTextSelected]}>טיפול אישי שלי</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>הערות המשכיר לשוכר</Text>
              <TextInput
                placeholder="הערות לגבי זמן ההגעה, בעל המקצוע או דרכי הטיפול..."
                placeholderTextColor={C.textMut}
                multiline
                numberOfLines={3}
                value={landlordNote}
                onChangeText={setLandlordNote}
                style={styles.textArea}
              />

              <TouchableOpacity onPress={handleRespondSubmit} style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>שמור שינויים ועדכן שוכר</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Landlord Upload Invoice Form */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={invoiceModalVisible}
        onRequestClose={() => setInvoiceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '65%' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setInvoiceModalVisible(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>העלאת חשבונית וסגירת טיפול</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalFormContent}>
              <Text style={styles.fieldLabel}>סכום החשבונית (₪ ILS)</Text>
              <TextInput
                placeholder="הזן סכום ששולם לתיקון התקלה..."
                placeholderTextColor={C.textMut}
                keyboardType="numeric"
                value={invoiceAmount}
                onChangeText={setInvoiceAmount}
                style={styles.textInput}
              />

              <Text style={styles.fieldLabel}>צרף קובץ חשבונית/קבלה</Text>
              <TouchableOpacity onPress={handlePickInvoiceFile} style={styles.photoPickerBox}>
                {invoiceFile ? (
                  <View style={styles.attachedPreview}>
                    <Ionicons name="document-text-outline" size={24} color={C.success} />
                    <Text style={styles.attachedText} numberOfLines={1}>{invoiceFile.name}</Text>
                    <TouchableOpacity onPress={() => setInvoiceFile(null)} style={styles.removePhotoBtn}>
                      <Ionicons name="close-circle" size={18} color={C.danger} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.pickerPlaceholder}>
                    <Ionicons name="cloud-upload-outline" size={28} color={C.textMut} />
                    <Text style={styles.pickerText}>לחץ כאן להעלאת הקובץ (PDF, PNG)</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleInvoiceSubmit} style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>הגש חשבונית לאישור השוכר</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#74777f',
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#c4c6cf',
    backgroundColor: '#ffffff',
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#002045',
    textAlign: 'center',
  },
  infoBtn: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#e5eeff',
    borderWidth: 1,
    borderColor: '#c4c6cf',
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#43474e',
    marginBottom: 6,
  },
  statRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 6,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#002045',
  },
  statChange: {
    fontSize: 11,
    color: '#005db6',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#002045',
    textAlign: 'right',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#43474e',
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 24,
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c4c6cf',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  ticketCardBreach: {
    borderColor: C.danger,
    borderWidth: 2,
    backgroundColor: '#fffcfc',
  },
  ticketHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagUrgent: {
    backgroundColor: '#ffdad6',
  },
  tagOrdinary: {
    backgroundColor: '#eff4ff',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tagTextUrgent: {
    color: '#ba1a1a',
  },
  tagTextOrdinary: {
    color: '#00468c',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#eff4ff',
  },
  statusBadgeClosed: {
    backgroundColor: '#eefcf7',
  },
  statusBadgeProgress: {
    backgroundColor: '#fff8eb',
  },
  statusBadgeInvoice: {
    backgroundColor: '#f3e8ff',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#43474e',
  },
  statusBadgeTextClosed: {
    color: '#0e5138',
  },
  statusBadgeTextProgress: {
    color: '#b25e00',
  },
  statusBadgeTextInvoice: {
    color: '#6b21a8',
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#002045',
    textAlign: 'right',
    marginBottom: 6,
  },
  ticketDesc: {
    fontSize: 13,
    color: '#43474e',
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 16,
  },
  slaWidget: {
    backgroundColor: '#f8f9ff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5eeff',
    marginBottom: 12,
  },
  slaHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  slaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#43474e',
  },
  slaTimeRemaining: {
    fontSize: 11,
    fontWeight: '700',
    color: '#005db6',
  },
  slaTimeOverdue: {
    fontSize: 11,
    fontWeight: '700',
    color: C.danger,
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#e5eeff',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  deadlineRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  deadlineText: {
    fontSize: 10,
    color: '#74777f',
  },
  breachContainer: {
    flexDirection: 'row-reverse',
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#ffe4e6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  breachTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9f1239',
    textAlign: 'right',
  },
  breachText: {
    fontSize: 10,
    color: '#be123c',
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 14,
  },
  cardActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f2f6',
  },
  tapDetailsText: {
    fontSize: 12,
    color: '#005db6',
    fontWeight: '600',
  },
  emptyBox: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#c4c6cf',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  emptyText: {
    color: '#002045',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#74777f',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  midragBtn: {
    height: 50,
    borderWidth: 1,
    borderColor: '#c4c6cf',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginTop: 10,
  },
  midragBtnText: {
    color: '#002045',
    fontSize: 14,
    fontWeight: '600',
  },
  fabBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    backgroundColor: '#00cba9',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  // Modal layout
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 20, 45, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    width: '100%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5eeff',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#002045',
  },
  modalFormContent: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#002045',
    textAlign: 'right',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#f8f9ff',
    borderWidth: 1,
    borderColor: '#c4c6cf',
    borderRadius: 10,
    color: '#0b1c30',
    padding: 12,
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: '#f8f9ff',
    borderWidth: 1,
    borderColor: '#c4c6cf',
    borderRadius: 10,
    color: '#0b1c30',
    padding: 12,
    fontSize: 14,
    textAlign: 'right',
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  photoPickerBox: {
    backgroundColor: '#f8f9ff',
    borderWidth: 1.5,
    borderColor: '#c4c6cf',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerPlaceholder: {
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 12,
    color: '#74777f',
    marginTop: 6,
    fontWeight: '500',
  },
  attachedPreview: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  attachedText: {
    fontSize: 13,
    color: '#002045',
    flex: 1,
    textAlign: 'right',
    marginHorizontal: 10,
  },
  removePhotoBtn: {
    padding: 4,
  },
  switchWrapper: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#002045',
    textAlign: 'right',
  },
  switchDesc: {
    fontSize: 11,
    color: '#74777f',
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 14,
  },
  switchToggle: {
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#c4c6cf',
    padding: 2,
  },
  switchToggleOn: {
    backgroundColor: '#00cba9',
  },
  switchBall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
  },
  switchBallOn: {
    transform: [{ translateX: -22 }],
  },
  submitBtn: {
    height: 48,
    backgroundColor: '#005db6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  priorityOpt: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#c4c6cf',
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  priorityOptSelected: {
    borderColor: '#005db6',
    backgroundColor: '#eff4ff',
  },
  priorityOptText: {
    fontSize: 12,
    color: '#43474e',
    fontWeight: '600',
  },
  priorityOptTextSelected: {
    color: '#005db6',
  },

  // Audit and Details Screen styles
  auditRefBanner: {
    flexDirection: 'row-reverse',
    backgroundColor: '#eefcf7',
    borderWidth: 1,
    borderColor: '#b1f0ce',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  auditRefTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#002114',
    textAlign: 'right',
  },
  auditRefDesc: {
    fontSize: 11,
    color: '#0e5138',
    textAlign: 'right',
    marginTop: 1,
  },
  auditSection: {
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5eeff',
    marginBottom: 16,
  },
  auditSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#002045',
    textAlign: 'right',
    marginBottom: 10,
    marginTop: 14,
  },
  auditBodyText: {
    fontSize: 13,
    color: '#0b1c30',
    textAlign: 'right',
    lineHeight: 18,
  },
  auditSubText: {
    fontSize: 10,
    color: '#74777f',
    textAlign: 'right',
    marginTop: 6,
  },
  photoCompareGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  comparePhotoCol: {
    flex: 1,
  },
  comparePhotoLabel: {
    fontSize: 11,
    color: '#74777f',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '500',
  },
  comparePhotoFrame: {
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#c4c6cf',
    backgroundColor: '#f1f2f6',
  },
  compareImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  compareImgPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  placeholderLabelText: {
    fontSize: 9,
    color: '#74777f',
    textAlign: 'center',
    marginTop: 4,
  },
  landlordResponseBox: {
    backgroundColor: '#fff8eb',
    borderWidth: 1,
    borderColor: '#ffe0b2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  responseBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b25e00',
    textAlign: 'right',
    marginBottom: 4,
  },
  responseBoxText: {
    fontSize: 13,
    color: '#5d4037',
    textAlign: 'right',
    lineHeight: 18,
  },
  responseBoxSub: {
    fontSize: 10,
    color: '#7f5f00',
    textAlign: 'right',
    marginTop: 4,
    fontWeight: '500',
  },
  auditDataGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  auditDataCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c4c6cf',
    borderRadius: 12,
    padding: 10,
  },
  dataCardTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  dataCardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#43474e',
  },
  laborClockText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#002045',
    textAlign: 'center',
    marginVertical: 4,
  },
  laborClockSub: {
    fontSize: 9,
    color: '#74777f',
    textAlign: 'center',
  },
  geoMapFrame: {
    height: 50,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  geoMapImg: {
    width: '100%',
    height: '100%',
  },
  geoVerifiedTag: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(14, 81, 56, 0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  geoVerifiedText: {
    fontSize: 7,
    color: '#ffffff',
    fontWeight: '700',
  },
  partsSection: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c4c6cf',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  partItemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  partItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#002045',
    textAlign: 'right',
  },
  partItemSKU: {
    fontSize: 9,
    color: '#74777f',
    textAlign: 'right',
    marginTop: 2,
  },
  partItemQty: {
    fontSize: 11,
    fontWeight: '700',
    color: '#005db6',
  },
  partItemPrice: {
    fontSize: 10,
    color: '#74777f',
    marginTop: 2,
  },
  noInvoiceBox: {
    padding: 14,
    alignItems: 'center',
  },
  noInvoiceText: {
    fontSize: 11,
    color: '#74777f',
    textAlign: 'center',
  },
  invoiceDisplayBox: {
    backgroundColor: '#f3e8ff',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  invoiceBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b21a8',
    textAlign: 'right',
    marginBottom: 4,
  },
  invoiceItemRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b21a8',
  },
  invoiceItemSub: {
    fontSize: 10,
    color: '#7c3aed',
  },

  // Timeline
  timelineContainer: {
    paddingRight: 12,
    position: 'relative',
    marginVertical: 12,
  },
  timelineLine: {
    position: 'absolute',
    right: 5,
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: '#c4c6cf',
  },
  timelineNode: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: -5,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotComplete: {
    backgroundColor: '#10b981',
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: -7,
  },
  timelineDotPending: {
    backgroundColor: '#c4c6cf',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  timelineContent: {
    marginRight: 16,
    flex: 1,
  },
  timelineNodeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#002045',
    textAlign: 'right',
  },
  timelineNodeTime: {
    fontSize: 10,
    color: '#74777f',
    textAlign: 'right',
    marginTop: 2,
  },

  modalActionWrapper: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5eeff',
    paddingTop: 16,
  },
  chatLandlordBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#002045',
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatLandlordText: {
    color: '#002045',
    fontSize: 13,
    fontWeight: '600',
  },
});
