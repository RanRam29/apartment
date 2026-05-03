import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { paymentApi, authApi } from '../services/api';
import type { MainStackParamList } from '../types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const navigation = useNavigation<Nav>();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const isTenant = user?.role === 'tenant';

  async function pickAndUploadAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'אפשר גישה לגלריה בהגדרות כדי לשנות תמונת פרופיל');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('avatar', {
      uri: asset.uri,
      type: asset.mimeType ?? 'image/jpeg',
      name: 'avatar.jpg',
    } as any);

    setAvatarUploading(true);
    try {
      const res = await authApi.uploadAvatar(formData);
      updateUser({ avatarUrl: res.data.avatarUrl });
    } catch {
      Alert.alert('שגיאה', 'העלאת התמונה נכשלה — נסה שוב');
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
      Alert.alert('שגיאה', 'עדכון הפרופיל נכשל — נסה שוב');
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar — tappable */}
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
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="camera" size={16} color="#fff" />
            }
          </View>
        </TouchableOpacity>

        {user?.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#00D2D3" />
            <Text style={styles.verifiedText}>מאומת</Text>
          </View>
        )}

        <TouchableOpacity onPress={() => { setFirstName(user?.firstName ?? ''); setLastName(user?.lastName ?? ''); setEditVisible(true); }}>
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
          <Ionicons name="pencil-outline" size={14} color="#A0A0B2" style={styles.editIcon} />
        </TouchableOpacity>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.roleBadge}>
          <Ionicons name={isTenant ? 'person-outline' : 'home-outline'} size={14} color="#6C5CE7" />
          <Text style={styles.roleText}>{isTenant ? 'שוכר' : 'משכיר'}</Text>
        </View>

        {/* Premium */}
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
              <Text style={styles.upgradeBtnSub}>₪29/חודש · ללא הגבלת זמות, superlikes ועוד</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#A0A0B2" />
          </TouchableOpacity>
        )}

        {/* Menu */}
        <View style={styles.menuCard}>
          {isTenant && (
            <MenuItem icon="options-outline" label="העדפות חיפוש" onPress={() => navigation.navigate('Preferences')} />
          )}
          <MenuItem icon="notifications-outline" label="התראות"
            onPress={() => Alert.alert('בקרוב', 'הגדרות התראות יתווספו בקרוב')} />
          <MenuItem icon="shield-checkmark-outline" label="פרטיות ואבטחה"
            onPress={() => Alert.alert('בקרוב', 'הגדרות פרטיות יתווספו בקרוב')} />
          <MenuItem icon="help-circle-outline" label="עזרה ותמיכה"
            onPress={() => Alert.alert('תמיכה', 'support@dirapp.co.il')} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={18} color="#FF4757" />
          <Text style={styles.logoutText}>התנתקות</Text>
        </TouchableOpacity>

        <Text style={styles.version}>DirApp v1.0.0</Text>
      </ScrollView>

      {/* Edit profile modal */}
      <Modal visible={editVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>עריכת פרופיל</Text>
            <Text style={styles.fieldLabel}>שם פרטי</Text>
            <TextInput
              style={styles.fieldInput}
              value={firstName}
              onChangeText={setFirstName}
              textAlign="right"
              placeholder="שם פרטי"
              placeholderTextColor="#A0A0B2"
            />
            <Text style={styles.fieldLabel}>שם משפחה</Text>
            <TextInput
              style={styles.fieldInput}
              value={lastName}
              onChangeText={setLastName}
              textAlign="right"
              placeholder="שם משפחה"
              placeholderTextColor="#A0A0B2"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditVisible(false)}>
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, savingProfile && { opacity: 0.6 }]}
                onPress={saveProfile}
                disabled={savingProfile}
              >
                {savingProfile
                  ? <ActivityIndicator size="small" color="#fff" />
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

  avatarContainer: { alignItems: 'center', marginBottom: 12, marginTop: 8, position: 'relative' },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(108,92,231,0.4)',
  },
  avatarImg: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: 'rgba(108,92,231,0.4)' },
  initials: { fontSize: 32, fontWeight: '800', color: '#fff' },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#1A1A2E',
  },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,210,211,0.12)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, marginBottom: 8,
  },
  verifiedText: { color: '#00D2D3', fontSize: 12, fontWeight: '600' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  editIcon: { alignSelf: 'center', marginTop: 2, marginBottom: 4 },
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
  menuCard: { width: '100%', backgroundColor: '#2A2A3E', borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#2A2A3E', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'right', marginBottom: 8 },
  fieldLabel: { color: '#A0A0B2', fontSize: 12, fontWeight: '600', textAlign: 'right' },
  fieldInput: {
    backgroundColor: '#1A1A2E', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#3A3A5E',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: '#3A3A5E',
  },
  cancelBtnText: { color: '#A0A0B2', fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#6C5CE7' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
