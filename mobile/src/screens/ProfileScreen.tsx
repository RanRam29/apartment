import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { paymentApi } from '../services/api';
import type { MainStackParamList } from '../types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const navigation = useNavigation<Nav>();

  async function handleUpgrade() {
    try {
      const res = await paymentApi.startPremium();
      const url = res.data?.paymentUrl;
      if (url) {
        Alert.alert('שדרוג לפרמיום', 'תועבר לעמוד התשלום', [
          { text: 'ביטול', style: 'cancel' },
          { text: 'המשך', onPress: () => {} },
        ]);
      }
    } catch {
      Alert.alert('שגיאה', 'לא ניתן להתחיל את תהליך התשלום כרגע');
    }
  }

  function confirmLogout() {
    Alert.alert('התנתקות', 'האם אתה בטוח שברצונך להתנתק?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'התנתק', style: 'destructive', onPress: logout },
    ]);
  }

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const isTenant = user?.role === 'tenant';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          {user?.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#00D2D3" />
              <Text style={styles.verifiedText}>מאומת</Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        {/* Role badge */}
        <View style={styles.roleBadge}>
          <Ionicons name={isTenant ? 'person-outline' : 'home-outline'} size={14} color="#6C5CE7" />
          <Text style={styles.roleText}>{isTenant ? 'שוכר' : 'משכיר'}</Text>
        </View>

        {/* Premium banner */}
        {user?.isPremium ? (
          <View style={styles.premiumBanner}>
            <Ionicons name="star" size={18} color="#FFD700" />
            <Text style={styles.premiumText}>חשבון פרמיום פעיל</Text>
            <Ionicons name="star" size={18} color="#FFD700" />
          </View>
        ) : (
          <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade}>
            <Ionicons name="star-outline" size={18} color="#FFD700" />
            <View style={styles.upgradeBtnTextBox}>
              <Text style={styles.upgradeBtnTitle}>שדרג לפרמיום ⚡</Text>
              <Text style={styles.upgradeBtnSub}>₪29/חודש · ראה מי ליייק אותך, ‎superlikes ועוד</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#A0A0B2" />
          </TouchableOpacity>
        )}

        {/* Action menu */}
        <View style={styles.menuCard}>
          {isTenant && (
            <MenuItem
              icon="options-outline"
              label="העדפות חיפוש"
              onPress={() => navigation.navigate('Preferences')}
            />
          )}
          <MenuItem
            icon="notifications-outline"
            label="התראות"
            onPress={() => Alert.alert('בקרוב', 'הגדרות התראות יתווספו בקרוב')}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label="פרטיות ואבטחה"
            onPress={() => Alert.alert('בקרוב', 'הגדרות פרטיות יתווספו בקרוב')}
          />
          <MenuItem
            icon="help-circle-outline"
            label="עזרה ותמיכה"
            onPress={() => Alert.alert('תמיכה', 'support@dirapp.co.il')}
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={18} color="#FF4757" />
          <Text style={styles.logoutText}>התנתקות</Text>
        </TouchableOpacity>

        <Text style={styles.version}>DirApp v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name="chevron-back" size={16} color="#A0A0B2" />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name={icon} size={20} color="#6C5CE7" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  scroll: { alignItems: 'center', padding: 24, paddingBottom: 40 },
  avatarContainer: { alignItems: 'center', marginBottom: 12, marginTop: 8 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(108,92,231,0.4)',
  },
  initials: { fontSize: 32, fontWeight: '800', color: '#fff' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,210,211,0.12)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, marginTop: 8,
  },
  verifiedText: { color: '#00D2D3', fontSize: 12, fontWeight: '600' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4, textAlign: 'center' },
  email: { fontSize: 13, color: '#A0A0B2', marginBottom: 10 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(108,92,231,0.15)', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(108,92,231,0.3)', marginBottom: 20,
  },
  roleText: { color: '#6C5CE7', fontWeight: '600', fontSize: 13 },
  premiumBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,215,0,0.12)', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
    marginBottom: 24, width: '100%', justifyContent: 'center',
  },
  premiumText: { color: '#FFD700', fontWeight: '700', fontSize: 14 },
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#2A2A3E', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
    marginBottom: 24, width: '100%',
  },
  upgradeBtnTextBox: { flex: 1 },
  upgradeBtnTitle: { color: '#FFD700', fontWeight: '700', fontSize: 14, textAlign: 'right' },
  upgradeBtnSub: { color: '#A0A0B2', fontSize: 11, textAlign: 'right', marginTop: 2 },
  menuCard: {
    width: '100%', backgroundColor: '#2A2A3E', borderRadius: 16,
    overflow: 'hidden', marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#3A3A5E',
  },
  menuLabel: { flex: 1, color: '#E0E0E0', fontSize: 14, textAlign: 'right', marginRight: 10 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,71,87,0.12)', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32,
    borderWidth: 1, borderColor: 'rgba(255,71,87,0.3)', marginBottom: 20,
  },
  logoutText: { color: '#FF4757', fontWeight: '700', fontSize: 15 },
  version: { color: '#3A3A5E', fontSize: 11 },
});
