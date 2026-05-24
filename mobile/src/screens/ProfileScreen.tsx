import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, ActivityIndicator, TextInput, Modal, Linking, Platform, Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { usePersonaIsLandlord } from '../navigation/AdminAppModeContext';
import { paymentApi, authApi } from '../services/api';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import type { MainStackParamList } from '../types';
import SwipeHouseLogo from '../components/SwipeHouseLogo';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { useColors, useTheme } from '../context/ThemeContext';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function ProfileScreen() {
  const colors = useColors();
  const { isDark, toggleTheme } = useTheme();
  const { user, logout, updateUser } = useAuthStore();
  const navigation = useNavigation<Nav>();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editVisible, setEditVisible]         = useState(false);
  const [firstName,   setFirstName]           = useState(user?.firstName ?? '');
  const [lastName,    setLastName]            = useState(user?.lastName ?? '');
  const [savingProfile, setSavingProfile]     = useState(false);

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const personaLandlord = usePersonaIsLandlord();
  const showTenantQuickLinks = !personaLandlord;
  const isAdmin = user?.role === 'admin';

  async function pickAndUploadAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'אפשר גישה לגלריה בהגדרות');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('avatar', { uri: asset.uri, type: asset.mimeType ?? 'image/jpeg', name: 'avatar.jpg' } as any);

    setAvatarUploading(true);
    try {
      const res = await authApi.uploadAvatar(formData);
      updateUser({ avatarUrl: res.data.avatarUrl });
    } catch {
      Alert.alert('שגיאה', 'העלאת התמונה נכשלה');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function saveProfile() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('שגיאה', 'שם פרטי ושם משפחה הם שדות חובה');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await authApi.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() });
      updateUser({ firstName: res.data.user.firstName, lastName: res.data.user.lastName });
      setEditVisible(false);
    } catch {
      Alert.alert('שגיאה', 'עדכון הפרופיל נכשל');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpgrade() {
    try {
      const res = await paymentApi.startPremium();
      const url = res.data?.paymentUrl;
      if (url) {
        Alert.alert('שדרוג לפרמיום', 'תועבר לעמוד התשלום', [
          { text: 'ביטול', style: 'cancel' },
          { text: 'המשך', onPress: () => Linking.openURL(url) },
        ]);
      }
    } catch {
      Alert.alert('שגיאה', 'לא ניתן להתחיל את תהליך התשלום כרגע');
    }
  }

  function confirmLogout() {
    if (Platform.OS === 'web') {
      if (window.confirm('האם אתה בטוח שברצונך להתנתק?')) logout();
    } else {
      Alert.alert('התנתקות', 'האם אתה בטוח שברצונך להתנתק?', [
        { text: 'ביטול', style: 'cancel' },
        { text: 'התנתק', style: 'destructive', onPress: logout },
      ]);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
        <View style={styles.profileInner}>

        <View style={styles.brandRow}>
          <SwipeHouseLogo size="sm" />
        </View>

        {/* Avatar */}
        <TouchableOpacity style={styles.avatarContainer} onPress={pickAndUploadAvatar} activeOpacity={0.8}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          )}
          <View style={styles.cameraOverlay}>
            {avatarUploading
              ? <ActivityIndicator size="small" color={C.onInverse.primary} />
              : <Ionicons name="camera" size={14} color={C.onInverse.primary} />
            }
          </View>
        </TouchableOpacity>

        {user?.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={C.cyan} />
            <Text style={styles.verifiedText}>מאומת</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => {
            setFirstName(user?.firstName ?? '');
            setLastName(user?.lastName ?? '');
            setEditVisible(true);
          }}
          style={styles.nameRow}
        >
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
          <Ionicons name="pencil-outline" size={14} color={C.textMut} />
        </TouchableOpacity>
        <Text style={[styles.email, { color: colors.textSub }]}>{user?.email}</Text>

        <View style={styles.roleBadge}>
          <Ionicons
            name={personaLandlord ? 'home-outline' : 'person-outline'}
            size={13}
            color={dirApp.primary}
          />
          <Text style={styles.roleText}>
            {user?.role === 'admin'
              ? personaLandlord
                ? 'מנהל · ממשק משכיר'
                : 'מנהל · ממשק שוכר'
              : personaLandlord
                ? 'משכיר'
                : 'שוכר'}
          </Text>
        </View>

        {/* Premium */}
        {user?.isPremium ? (
          <View style={styles.premiumBanner}>
            <Ionicons name="star" size={16} color={C.gold} />
            <Text style={styles.premiumText}>חשבון פרמיום פעיל</Text>
            <Ionicons name="star" size={16} color={C.gold} />
          </View>
        ) : (
          <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: colors.bgCard }]} onPress={handleUpgrade} activeOpacity={0.85}>
            <Ionicons name="star-outline" size={18} color={C.gold} />
            <View style={styles.upgradeBtnTextBox}>
              <Text style={styles.upgradeBtnTitle}>שדרג לפרמיום ⚡</Text>
              <Text style={[styles.upgradeBtnSub, { color: colors.textSub }]}>₪29/חודש · ללא הגבלת זמות ועוד</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={colors.textMut} />
          </TouchableOpacity>
        )}

        {/* Menu */}
        <View style={[styles.menuCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {showTenantQuickLinks && (
            <MenuItem icon="options-outline" label="העדפות חיפוש" onPress={() => navigation.navigate('Preferences')} />
          )}
          {showTenantQuickLinks && (
            <MenuItem icon="people-outline" label="מציאת שותפ/ה לדירה" onPress={() => navigation.navigate('Roommate')} />
          )}
          {showTenantQuickLinks && (
            <MenuItem icon="shield-checkmark-outline" label="אימות זהות" onPress={() => navigation.navigate('VerifyIdentity')} />
          )}
          <MenuItem icon="document-text-outline" label="החוזים שלי" onPress={() => navigation.navigate('Contracts')} />
          <MenuItem icon="cash-outline" label="תשלומי שכירות" onPress={() => navigation.navigate('RentPayments')} />
          <MenuItem icon="business-outline" label='נדל"ן מסחרי' onPress={() => navigation.navigate('Commercial')} />
          <MenuItem icon="trophy-outline" label="הישגים ונקודות" onPress={() => navigation.navigate('Gamification')} />
          <MenuItem icon="construct-outline" label="שירותים לדירה" onPress={() => navigation.navigate('Services')} />
          <MenuItem icon="hardware-chip-outline" label="ניהול IoT" onPress={() => navigation.navigate('IoT')} />
          {isAdmin && (
            <MenuItem icon="list-outline" label="Logs Console" onPress={() => navigation.navigate('LogsConsole')} />
          )}
          <MenuItem icon="notifications-outline" label="התראות"
            onPress={() => Platform.OS === 'web' ? window.alert('בקרוב\nהגדרות התראות יתווספו בקרוב') : Alert.alert('בקרוב', 'הגדרות התראות יתווספו בקרוב')} />
          <MenuItem icon="shield-checkmark-outline" label="פרטיות ואבטחה"
            onPress={() => Platform.OS === 'web' ? window.alert('בקרוב\nהגדרות פרטיות יתווספו בקרוב') : Alert.alert('בקרוב', 'הגדרות פרטיות יתווספו בקרוב')} />
          <MenuItem icon="help-circle-outline" label="עזרה ותמיכה"
            onPress={() => Platform.OS === 'web' ? window.alert('תמיכה\nsupport@dirapp.co.il') : Alert.alert('תמיכה', 'support@dirapp.co.il')} />
        </View>

        {/* Dark mode toggle */}
        <TouchableOpacity style={[styles.darkModeRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={toggleTheme} activeOpacity={0.8}>
          <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={20} color={C.cyan} />
          <Text style={[styles.darkModeLabel, { color: colors.text }]}>
            {isDark ? 'מצב לילה פעיל' : 'מצב לילה'}
          </Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: C.cyanAlpha(0.5) }}
            thumbColor={isDark ? C.cyan : colors.bgCard}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={17} color={C.danger} />
          <Text style={styles.logoutText}>התנתקות</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textMut }]}>DirApp v1.0.0</Text>
        </View>
        </ResponsiveContainer>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={editVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>עריכת פרופיל</Text>

            <Text style={[styles.fieldLabel, { color: colors.textSub }]}>שם פרטי</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              value={firstName}
              onChangeText={setFirstName}
              textAlign="right"
              placeholder="שם פרטי"
              placeholderTextColor={colors.textMut}
            />
            <Text style={[styles.fieldLabel, { color: colors.textSub }]}>שם משפחה</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              value={lastName}
              onChangeText={setLastName}
              textAlign="right"
              placeholder="שם משפחה"
              placeholderTextColor={colors.textMut}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.bg, borderColor: colors.border }]} onPress={() => setEditVisible(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.textSub }]}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, savingProfile && { opacity: 0.6 }]}
                onPress={saveProfile}
                disabled={savingProfile}
              >
                {savingProfile
                  ? <ActivityIndicator size="small" color={C.onInverse.primary} />
                  : <Text style={styles.saveBtnText}>שמור</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, onPress, last = false }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.menuItem, !last && styles.menuItemBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name="chevron-back" size={15} color={colors.textMut} />
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon} size={18} color={dirApp.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dirApp.background },
  scroll:    { alignItems: 'center', paddingVertical: 24, paddingBottom: 40 },
  profileInner: { alignItems: 'center', width: '100%' },
  brandRow:  { marginBottom: 8 },

  avatarContainer: { alignItems: 'center', marginBottom: 10, marginTop: 8, position: 'relative' },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: dirApp.primaryContainer, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: `${dirApp.secondaryContainer}DD`,
  },
  avatarImg: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: `${dirApp.secondaryContainer}DD` },
  initials:  { fontSize: 30, fontWeight: '800', color: C.onInverse.primary },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: dirApp.secondary, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: dirApp.background,
  },

  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.cyanAlpha(0.1), paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, marginBottom: 6,
    borderWidth: 1, borderColor: C.cyanAlpha(0.25),
  },
  verifiedText: { color: dirApp.primary, fontSize: 11, fontWeight: '600' },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  name:    { fontSize: 22, fontWeight: '800', color: dirApp.primary },
  email:   { fontSize: 13, color: C.textSub, marginBottom: 10 },

  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${dirApp.primary}0F`, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: `${dirApp.primary}26`, marginBottom: 20,
  },
  roleText: { color: dirApp.primary, fontWeight: '600', fontSize: 13 },

  premiumBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    marginBottom: 20, width: '100%', justifyContent: 'center',
  },
  premiumText: { color: C.gold, fontWeight: '700', fontSize: 14 },

  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.bgCard, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    marginBottom: 20, width: '100%',
    shadowColor: dirApp.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  upgradeBtnTextBox: { flex: 1 },
  upgradeBtnTitle: { color: C.gold, fontWeight: '700', fontSize: 14, textAlign: 'right' },
  upgradeBtnSub:   { color: C.textSub, fontSize: 11, textAlign: 'right', marginTop: 2 },

  menuCard: {
    width: '100%', backgroundColor: dirApp.surfaceContainerLowest, borderRadius: 16,
    overflow: 'hidden', marginBottom: 20,
    borderWidth: 1, borderColor: `${dirApp.outlineVariant}AA`,
    shadowColor: dirApp.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: C.borderLight },
  menuIconWrap: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: `${dirApp.secondaryContainer}44`, justifyContent: 'center', alignItems: 'center',
    marginLeft: 12,
  },
  menuLabel: { flex: 1, color: C.text, fontSize: 14, textAlign: 'right', marginRight: 10 },

  darkModeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 16, marginBottom: 16, width: '100%',
    borderWidth: 1,
  },
  darkModeLabel: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'right' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.07)', borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 28,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', marginBottom: 18,
  },
  logoutText: { color: C.danger, fontWeight: '700', fontSize: 15 },
  version:    { color: C.textMut, fontSize: 11 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 8 },
  fieldLabel: { color: C.textSub, fontSize: 11, fontWeight: '700', textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: {
    backgroundColor: C.bg, borderRadius: 12, padding: 14,
    color: C.text, fontSize: 15, borderWidth: 1.5, borderColor: C.border,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
  },
  cancelBtnText: { color: C.textSub, fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 2, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    backgroundColor: dirApp.primaryContainer,
  },
  saveBtnText: { color: C.onInverse.primary, fontWeight: '700', fontSize: 15 },
});
