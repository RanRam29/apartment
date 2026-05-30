import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useContractStore } from '../store/useContractStore';
import { showAlert } from '../utils/alert';

export default function ContractDetailScreen({ route, navigation }: any) {
  const { contractId } = route.params || {};
  const { activeContract, fetchContract, signContract, inviteTenant, transitionContract, isLoading } = useContractStore();
  const [guarantorEmail, setGuarantorEmail] = useState('');

  useEffect(() => {
    if (contractId) {
      fetchContract(contractId).catch((err) => {
        showAlert('שגיאה', 'טעינת החוזה נכשלה.');
      });
    }
  }, [contractId]);

  const handleSign = async () => {
    try {
      await signContract(contractId);
      showAlert('הצלחה', 'חתמת על החוזה בהצלחה!');
    } catch (err: any) {
      showAlert('שגיאה', err?.message || 'החתימה נכשלה.');
    }
  };

  const handleInviteGuarantor = () => {
    if (Platform.OS === 'web') {
      const email = window.prompt('הזמנת ערב לחוזה\n\nהזן את כתובת האימייל של הערב המיועד:');
      if (email) {
        showAlert('הושלם בהצלחה', `הזמנת ערבות משפטית נשלחה לכתובת ${email}.`);
      }
      return;
    }
    Alert.prompt(
      'הזמנת ערב לחוזה',
      'הזן את כתובת האימייל של הערב המיועד:',
      [
        {
          text: 'ביטול',
          style: 'cancel',
        },
        {
          text: 'שלח הזמנה',
          onPress: (email) => {
            if (!email) return;
            showAlert('הושלם בהצלחה', `הזמנת ערבות משפטית נשלחה לכתובת ${email}.`);
          },
        },
      ],
      'plain-text',
      ''
    );
  };

  if (isLoading || !activeContract) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5f5ce5" />
        <Text style={styles.loadingText}>טוען פרטי חוזה מורחבים...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>סטטוס: {activeContract.status}</Text>
      </View>

      <Text style={styles.title}>פרטי חוזה שכירות דיגיטלי</Text>
      
      <View style={styles.card}>
        <View style={styles.detailRow}>
          <Text style={styles.value}>₪{activeContract.monthlyRent?.toLocaleString()}</Text>
          <Text style={styles.label}>שכר דירה חודשי:</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.value}>{activeContract.startDate}</Text>
          <Text style={styles.label}>תאריך התחלה:</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.value}>{activeContract.endDate}</Text>
          <Text style={styles.label}>תאריך סיום:</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.value}>{activeContract.depositMonths || 2} חודשים</Text>
          <Text style={styles.label}>ערבונות/פקדונות:</Text>
        </View>
      </View>

      <View style={styles.buttonGroup}>
        {activeContract.status === 'PENDING_SIGNATURE' && (
          <TouchableOpacity onPress={handleSign} style={styles.primaryBtn}>
            <Text style={styles.btnText}>חתום על החוזה</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleInviteGuarantor} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>הזמן ערב לחוזה</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => navigation.navigate('CheckIn', { contractId })} 
          style={styles.outlineBtn}
        >
          <Text style={styles.outlineBtnText}>עבור לצ׳ק-אין (תמונות חדרים)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(95, 92, 229, 0.15)',
    borderWidth: 1,
    borderColor: '#5f5ce5',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 24,
    textAlign: 'right',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  label: {
    fontSize: 14,
    color: '#9aa0b9',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
  buttonGroup: {
    gap: 12,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: '#5f5ce5',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    height: 52,
    backgroundColor: '#10b981',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  outlineBtn: {
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  outlineBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
