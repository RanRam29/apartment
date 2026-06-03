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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { showAlert } from '../utils/alert';

export default function MaintenanceScreen({ route, navigation }: any) {
  const { agreementId = '00000000-0000-4000-9000-000000000001' } = route.params || {};
  const { tickets, fetchTicketsForAgreement, createTicket, respondToTicket, closeTicket, isLoading } = useMaintenanceStore();
  const { user } = useAuthStore();
  const [description, setDescription] = useState('');
  const [sendWhatsapp, setSendWhatsapp] = useState(false);

  useEffect(() => {
    fetchTicketsForAgreement(agreementId).catch(() => {});
  }, [agreementId]);

  const handleOpenTicket = async () => {
    if (!description.trim()) {
      showAlert('שגיאה', 'אנא הזן תיאור תקלה.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('agreementId', agreementId);
      formData.append('description', description);
      formData.append('sendWhatsapp', String(sendWhatsapp));
      
      await createTicket(formData);
      setDescription('');
      setSendWhatsapp(false);
      showAlert('הצלחה', 'קריאת השירות נפתחה בהצלחה! המשכיר קיבל התראה.');
      fetchTicketsForAgreement(agreementId).catch(() => {});
    } catch (err: any) {
      showAlert('שגיאה', 'פתיחת קריאת השירות נכשלה.');
    }
  };

  const handleRespond = async (ticketId: string) => {
    try {
      await respondToTicket(ticketId, {
        response: 'technician',
        note: 'הוזמן טכנאי מוסמך ממידרג.',
      });
      showAlert('הצלחה', 'דיווחת שהטיפול בתקלה החל.');
    } catch (err: any) {
      showAlert('שגיאה', 'עדכון הטיפול נכשל.');
    }
  };

  const handleClose = async (ticketId: string) => {
    try {
      await closeTicket(ticketId);
      showAlert('הצלחה', 'קריאת השירות נסגרה בהצלחה.');
    } catch (err: any) {
      showAlert('שגיאה', 'סגירת הקריאה נכשלה.');
    }
  };

  const openMidrag = () => {
    Linking.openURL('https://www.midrag.co.il').catch(() => {
      showAlert('שגיאה', 'לא ניתן לפתוח את הקישור.');
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>קריאות שירות</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5f5ce5" />
          <Text style={styles.loadingText}>טוען קריאות שירות (Maintenance)...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>קריאות שירות</Text>
        <View style={{ width: 38 }} />
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>קריאות שירות ותחזוקת דירה</Text>
        <Text style={styles.subtitle}>פתח ותעד תקלות בדירה ישירות מול המשכיר, בקלות ובשקיפות.</Text>

      {user?.role === 'tenant' && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>דיווח על תקלה חדשה</Text>
          <TextInput
            placeholder="תאר את התקלה כאן (לדוגמה: נזילה בכיור המטבח...)"
            placeholderTextColor="#9aa0b9"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            style={styles.textInput}
          />
          <TouchableOpacity 
            onPress={() => setSendWhatsapp(!sendWhatsapp)} 
            style={styles.checkboxContainer}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, sendWhatsapp && styles.checkboxChecked]}>
              {sendWhatsapp && <Text style={styles.checkboxCheckmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>שלח התראה למשכיר גם ב-WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleOpenTicket} style={styles.submitBtn}>
            <Text style={styles.submitBtnText}>פתח קריאת שירות</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>תקלות קיימות</Text>

      {tickets.length > 0 ? (
        tickets.map((ticket: any) => (
          <View key={ticket.id} style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <View style={[
                styles.statusBadge,
                ticket.status === 'CLOSED' ? styles.statusClosed : styles.statusOpen
              ]}>
                <Text style={styles.statusText}>{ticket.status}</Text>
              </View>
              <Text style={styles.dateText}>{new Date(ticket.createdAt).toLocaleDateString('he-IL')}</Text>
            </View>

            <Text style={styles.descText}>{ticket.description}</Text>

            {ticket.landlordNote && (
              <View style={styles.landlordNoteBox}>
                <Text style={styles.noteTitle}>תגובת המשכיר:</Text>
                <Text style={styles.noteText}>{ticket.landlordNote}</Text>
              </View>
            )}

            <View style={styles.actions}>
              {ticket.status !== 'CLOSED' && user?.role === 'landlord' && (
                <TouchableOpacity onPress={() => handleRespond(ticket.id)} style={styles.respondBtn}>
                  <Text style={styles.respondBtnText}>סמן בטיפול (הזמנת טכנאי)</Text>
                </TouchableOpacity>
              )}

              {ticket.status !== 'CLOSED' && user?.role === 'tenant' && (
                <TouchableOpacity onPress={() => handleClose(ticket.id)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>סמן כפתור וסגור תקלה</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>אין קריאות שירות רשומות לחוזה זה.</Text>
        </View>
      )}

      <TouchableOpacity onPress={openMidrag} style={styles.midragBtn}>
        <Text style={styles.midragBtnText}>🔍 מצא בעל מקצוע מומלץ במידרג</Text>
      </TouchableOpacity>
    </ScrollView>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f111e',
  },
  contentContainer: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f111e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9aa0b9',
    marginTop: 12,
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'right',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#9aa0b9',
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 30,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'right',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#0f111e',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    color: '#ffffff',
    padding: 12,
    fontSize: 14,
    textAlign: 'right',
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  submitBtn: {
    height: 48,
    backgroundColor: '#5f5ce5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'right',
    marginBottom: 16,
  },
  ticketCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#9aa0b9',
  },
  statusBadge: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statusOpen: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusClosed: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  descText: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'right',
    lineHeight: 20,
    marginBottom: 12,
  },
  landlordNoteBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a5b4fc',
    textAlign: 'right',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    color: '#ffffff',
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  respondBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  respondBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#10b981',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyBox: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderStyle: 'dashed',
    borderRadius: 16,
    marginBottom: 20,
  },
  emptyText: {
    color: '#9aa0b9',
    fontSize: 14,
  },
  midragBtn: {
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginTop: 20,
  },
  midragBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkboxCheckmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'right',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0f111e',
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
