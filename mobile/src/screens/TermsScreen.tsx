import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { tosApi } from '../services/api';

export default function TermsScreen({ navigation }: any) {
  const { updateUser } = useAuthStore();
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!accepted) {
      Alert.alert('שגיאה', 'אנא אשר כי קראת והסכמת לתנאי השימוש.');
      return;
    }

    setIsSubmitting(true);
    try {
      await tosApi.accept();
      updateUser({ tosAcceptedAt: new Date().toISOString() });
      Alert.alert('תודה', 'תנאי השימוש אושרו בהצלחה.', [
        { text: 'המשך', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      Alert.alert('שגיאה', 'אישור תנאי השימוש נכשל.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>תנאי שימוש ומדיניות פרטיות</Text>
      
      <ScrollView style={styles.termsBox}>
        <Text style={styles.termsText}>
          ברוך הבא לאפליקציית DirApp!{'\n\n'}
          השימוש באפליקציה, בשירותיה ובתכניה כפוף להסכמתך המלאה לתנאים המפורטים להלן. אנא קרא אותם בעיון.{'\n\n'}
          1. שמירה על פרטיות ואבטחת מידע:{'\n'}
          אנו עושים שימוש בטכנולוגיות מתקדמות כולל אימות זהות באמצעות צדדים שלישיים מורשים (כגון Persona SDK). כל הנתונים האישיים שלך מוצפנים ונשמרים בצורה מאובטחת.{'\n\n'}
          2. תפקיד האפליקציה:{'\n'}
          DirApp מספקת פלטפורמה טכנולוגית לניהול, תיווך וחתימה על חוזי שכירות דיגיטליים, מעקב אחר תשלומים ופתיחת קריאות שירות. האפליקציה אינה צד משפטי בחוזה השכירות עצמו.{'\n\n'}
          3. התחייבות המשתמש:{'\n'}
          הנך מתחייב לספק פרטי זיהוי אמיתיים ומדויקים בלבד. פתיחת חשבון פיקטיבי או התחזות לערב/שוכר/משכיר אחר מהווה עבירה פלילית.{'\n\n'}
          4. עדכונים ושינויים:{'\n'}
          אנו שומרים לעצמנו את הזכות לעדכן את תנאי השימוש מעת לעת. המשך השימוש באפליקציה מהווה הסכמה לתנאים המעודכנים.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          onPress={() => setAccepted(!accepted)} 
          style={styles.checkboxContainer}
        >
          <Text style={styles.checkboxLabel}>קראתי ואני מסכים לכל התנאים המפורטים לעיל</Text>
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleAccept} 
          style={[styles.acceptBtn, !accepted && styles.acceptBtnDisabled]}
          disabled={!accepted || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.acceptBtnText}>אשר והמשך</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f111e',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'right',
    marginBottom: 20,
    marginTop: 10,
  },
  termsBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  termsText: {
    color: '#9aa0b9',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },
  footer: {
    gap: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#5f5ce5',
    borderColor: '#5f5ce5',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
  },
  acceptBtn: {
    height: 52,
    backgroundColor: '#5f5ce5',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  acceptBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
