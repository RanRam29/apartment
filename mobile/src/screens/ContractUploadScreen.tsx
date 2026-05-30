import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useContractStore } from '../store/useContractStore';
import { showAlert } from '../utils/alert';

export default function ContractUploadScreen({ navigation, route }: any) {
  const { matchId } = route.params || {};
  const { uploadContract, isLoading } = useContractStore();
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const handlePickDocument = async () => {
    // Simulated Document Picker
    setSelectedFile({
      name: 'rental_agreement_draft.pdf',
      size: '2.4 MB',
      uri: 'file:///simulated/draft.pdf',
    });
    showAlert('קובץ נבחר', 'הקובץ rental_agreement_draft.pdf נטען בהצלחה.');
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) {
      showAlert('שגיאה', 'אנא בחר קובץ חוזה תחילה.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('matchId', matchId || 'mock-match-id');
      formData.append('monthlyRent', '5200');
      formData.append('startDate', '2026-07-01');
      formData.append('endDate', '2027-06-30');
      formData.append('document', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: 'application/pdf',
      } as any);

      const result = await uploadContract(formData);
      showAlert('הצלחה', 'החוזה הועלה ונותח בהצלחה על ידי ה-AI של Gemini.', [
        {
          text: 'צפה בפרטי החוזה',
          onPress: () => navigation.navigate('ContractDetail', { contractId: result.contract?.id || result.id }),
        },
      ]);
    } catch (err: any) {
      console.error(err);
      showAlert('שגיאה', err?.message || 'העלאת החוזה נכשלה.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View className="header" style={styles.header}>
        <Text style={styles.emoji}>📄</Text>
        <Text style={styles.title}>העלאת חוזה וניתוח AI</Text>
        <Text style={styles.subtitle}>העלה את טיוטת החוזה שלך, ומנוע ה-AI של Gemini יחלץ את הנתונים העיקריים באופן אוטומטי.</Text>
      </View>

      <View style={styles.uploadArea}>
        {selectedFile ? (
          <View style={styles.fileCard}>
            <Text style={styles.fileIcon}>📂</Text>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{selectedFile.name}</Text>
              <Text style={styles.fileSize}>{selectedFile.size}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedFile(null)} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={handlePickDocument} style={styles.pickerBox}>
            <Text style={styles.pickerIcon}>📤</Text>
            <Text style={styles.pickerText}>בחר קובץ PDF / תמונה</Text>
            <Text style={styles.pickerSubtext}>גודל מירבי של 10MB</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        onPress={handleUploadAndAnalyze}
        style={[styles.btn, !selectedFile && styles.btnDisabled]}
        disabled={isLoading || !selectedFile}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>העלה ונתח באמצעות AI</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0f111e',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#9aa0b9',
    textAlign: 'center',
    lineHeight: 20,
  },
  uploadArea: {
    width: '100%',
    marginBottom: 40,
  },
  pickerBox: {
    borderWidth: 2,
    borderColor: 'rgba(95, 92, 229, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  pickerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  pickerSubtext: {
    fontSize: 12,
    color: '#9aa0b9',
  },
  fileCard: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  fileIcon: {
    fontSize: 28,
    marginLeft: 12,
  },
  fileInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#9aa0b9',
  },
  removeBtn: {
    padding: 8,
  },
  removeBtnText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  btn: {
    width: '100%',
    height: 56,
    backgroundColor: '#5f5ce5',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5f5ce5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  btnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
