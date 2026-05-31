import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { adminApi } from '../services/api';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';
import { useColors } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface UserKycProfile {
  status: string;
}

interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string;
  activeRole?: string;
  isLocked: boolean;
  blockedCount: number;
  kycProfile?: UserKycProfile | null;
  isPremium?: boolean;
  trustScore?: number;
  isVerified?: boolean;
  createdAt: string;
}

export default function AdminUsersScreen() {
  const colors = useColors();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
    activeRole: string;
    trustScore: string;
    isPremium: boolean;
    isLocked: boolean;
    isVerified: boolean;
  }>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'tenant',
    activeRole: 'tenant',
    trustScore: '50',
    isPremium: false,
    isLocked: false,
    isVerified: false,
  });

  const LIMIT = 20; // 20 per page for better mobile performance

  const fetchUsers = async (targetPage = page) => {
    try {
      setError(null);
      const res = await adminApi.getUsers(targetPage, LIMIT);
      const data = res.data;
      
      setUsers(data.rows ?? []);
      setTotalCount(data.count ?? 0);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'שגיאה בטעינת משתמשים');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers(page);
  }, [page]);

  const onRefresh = () => {
    setRefreshing(true);
    if (page === 1) {
      fetchUsers(1);
    } else {
      setPage(1);
    }
  };

  const handleUnlock = async (userId: string, userName: string) => {
    setActionLoadingId(userId);
    setError(null);
    setSuccessMessage(null);
    try {
      await adminApi.unlockUser(userId);
      setSuccessMessage(`המשתמש "${userName}" שוחרר מנעילה בהצלחה`);
      
      // Update local state
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, isLocked: false, blockedCount: 0 } : u))
      );

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'שגיאה בשחרור המשתמש מנעילה');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleKycOverride = async (userId: string, status: string, userName: string) => {
    setActionLoadingId(`${userId}-kyc`);
    setError(null);
    setSuccessMessage(null);
    try {
      await adminApi.kycOverride(userId, status);
      setSuccessMessage(`סטטוס KYC עבור "${userName}" עודכן ל-${translateKycStatus(status)}`);
      
      // Update local state
      setUsers(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, kycProfile: { ...(u.kycProfile ?? { status: 'NONE' }), status } }
            : u
        )
      );

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'שגיאה בעדכון KYC');
    } finally {
      setActionLoadingId(null);
    }
  };

  const startEditing = (user: UserItem) => {
    setEditingUserId(user.id);
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'tenant',
      activeRole: user.activeRole || 'tenant',
      trustScore: String(user.trustScore ?? 50),
      isPremium: !!user.isPremium,
      isLocked: !!user.isLocked,
      isVerified: !!user.isVerified,
    });
  };

  const handleSaveEdit = async (userId: string) => {
    setActionLoadingId(userId);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await adminApi.updateUser(userId, {
        ...editForm,
        trustScore: parseInt(editForm.trustScore) || 50,
      });
      const updatedUser: UserItem = res.data;
      
      setUsers(prev => prev.map(u => (u.id === userId ? updatedUser : u)));
      setSuccessMessage(`המשתמש "${editForm.firstName} ${editForm.lastName}" עודכן בהצלחה!`);
      setEditingUserId(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'שגיאה בעדכון פרטי המשתמש');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    Alert.alert(
      'מחיקת משתמש',
      `האם אתה בטוח שברצונך למחוק את המשתמש "${userName}" לצמיתות? פעולה זו תמחק את כל החוזים, הליסטינגים והמידע הקשור אליו.`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק לצמיתות',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(userId);
            setError(null);
            setSuccessMessage(null);
            try {
              await adminApi.deleteUser(userId);
              setSuccessMessage(`המשתמש "${userName}" נמחק בהצלחה מהמערכת`);
              setUsers(prev => prev.filter(u => u.id !== userId));
              setTimeout(() => setSuccessMessage(null), 3000);
            } catch (err: any) {
              setError(err?.response?.data?.error || 'שגיאה במחיקת המשתמש');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const translateRole = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'מנהל';
      case 'landlord':
        return 'משכיר';
      case 'tenant':
        return 'שוכר';
      default:
        return role;
    }
  };

  const translateKycStatus = (status?: string) => {
    if (!status) return 'לא הוגש';
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return 'מאושר';
      case 'REJECTED':
        return 'נדחה';
      case 'PENDING':
        return 'בבדיקה';
      case 'NONE':
      default:
        return 'לא הוגש';
    }
  };

  const getKycBadgeColor = (status?: string) => {
    if (!status) return colors.textMut;
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return C.success;
      case 'REJECTED':
        return C.danger;
      case 'PENDING':
        return C.gold;
      default:
        return colors.textMut;
    }
  };

  const totalPages = Math.ceil(totalCount / LIMIT) || 1;

  const renderUserItem = ({ item }: { item: UserItem }) => {
    const isLocked = item.isLocked || item.blockedCount > 0;
    const isActionLoading = actionLoadingId === item.id;
    const isKycActionLoading = actionLoadingId === `${item.id}-kyc`;
    const kycStatus = item.kycProfile?.status || 'NONE';
    const fullName = `${item.firstName} ${item.lastName}`;
    const isEditing = editingUserId === item.id;

    if (isEditing) {
      return (
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: dirApp.secondary, borderWidth: 1.5 }]}>
          <Text style={[styles.editFormTitle, { color: dirApp.primary }]}>עריכת פרטי משתמש</Text>
          
          {/* Row for Name */}
          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.textSub }]}>שם משפחה</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                value={editForm.lastName}
                onChangeText={text => setEditForm(prev => ({ ...prev, lastName: text }))}
                placeholder="שם משפחה..."
                placeholderTextColor={colors.textMut}
              />
            </View>
            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.textSub }]}>שם פרטי</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                value={editForm.firstName}
                onChangeText={text => setEditForm(prev => ({ ...prev, firstName: text }))}
                placeholder="שם פרטי..."
                placeholderTextColor={colors.textMut}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.textSub }]}>אימייל</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
              value={editForm.email}
              onChangeText={text => setEditForm(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="אימייל..."
              placeholderTextColor={colors.textMut}
            />
          </View>

          {/* Phone & Trust Score */}
          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.textSub }]}>ציון אמינות</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                value={editForm.trustScore}
                onChangeText={text => setEditForm(prev => ({ ...prev, trustScore: text }))}
                keyboardType="numeric"
                placeholder="50"
                placeholderTextColor={colors.textMut}
              />
            </View>
            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.textSub }]}>טלפון</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                value={editForm.phone}
                onChangeText={text => setEditForm(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
                placeholder="טלפון..."
                placeholderTextColor={colors.textMut}
              />
            </View>
          </View>

          {/* Role Selectors */}
          <Text style={[styles.formLabel, { color: colors.textSub, marginTop: 8 }]}>תפקיד במערכת</Text>
          <View style={styles.selectorRow}>
            {['tenant', 'landlord', 'admin'].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.selectorPill, editForm.role === r && styles.selectorPillActive]}
                onPress={() => setEditForm(prev => ({ ...prev, role: r }))}
              >
                <Text style={[styles.selectorPillText, editForm.role === r && styles.selectorPillTextActive]}>
                  {translateRole(r)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.formLabel, { color: colors.textSub, marginTop: 8 }]}>תפקיד פעיל (משפיע על ניווט)</Text>
          <View style={styles.selectorRow}>
            {['tenant', 'landlord'].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.selectorPill, editForm.activeRole === r && styles.selectorPillActive]}
                onPress={() => setEditForm(prev => ({ ...prev, activeRole: r }))}
              >
                <Text style={[styles.selectorPillText, editForm.activeRole === r && styles.selectorPillTextActive]}>
                  {translateRole(r)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Toggle Badges (Premium, Verified, Locked) */}
          <View style={[styles.formRow, { marginTop: 12, justifyContent: 'space-between' }]}>
            <TouchableOpacity
              style={[styles.toggleBadge, editForm.isPremium && styles.toggleBadgeActive]}
              onPress={() => setEditForm(prev => ({ ...prev, isPremium: !prev.isPremium }))}
            >
              <Ionicons name="star" size={12} color={editForm.isPremium ? '#ffffff' : colors.textMut} />
              <Text style={[styles.toggleBadgeText, editForm.isPremium && styles.toggleBadgeTextActive]}>פרימיום</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBadge, editForm.isVerified && styles.toggleBadgeActive]}
              onPress={() => setEditForm(prev => ({ ...prev, isVerified: !prev.isVerified }))}
            >
              <Ionicons name="checkmark-seal" size={12} color={editForm.isVerified ? '#ffffff' : colors.textMut} />
              <Text style={[styles.toggleBadgeText, editForm.isVerified && styles.toggleBadgeTextActive]}>מאומת</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBadge, editForm.isLocked && styles.toggleBadgeActiveError]}
              onPress={() => setEditForm(prev => ({ ...prev, isLocked: !prev.isLocked }))}
            >
              <Ionicons name="lock-closed" size={12} color={editForm.isLocked ? '#ffffff' : colors.textMut} />
              <Text style={[styles.toggleBadgeText, editForm.isLocked && styles.toggleBadgeTextActive]}>חסום</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {/* Action Buttons */}
          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelBtn]}
              onPress={() => setEditingUserId(null)}
              disabled={isActionLoading}
            >
              <Ionicons name="close" size={16} color="#ffffff" style={{ marginLeft: 4 }} />
              <Text style={styles.actionBtnText}>ביטול</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.saveBtn, { backgroundColor: dirApp.secondary }]}
              onPress={() => handleSaveEdit(item.id)}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-sharp" size={16} color="#ffffff" style={{ marginLeft: 4 }} />
                  <Text style={styles.actionBtnText}>שמור</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {/* User Info Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            {item.isPremium && (
              <Ionicons name="star" size={16} color="#F59E0B" style={{ marginLeft: 2 }} />
            )}
            {item.isVerified && (
              <Ionicons name="checkmark-seal" size={16} color="#3B82F6" style={{ marginLeft: 2 }} />
            )}
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{translateRole(item.role)}</Text>
            </View>
          </View>
          <Text style={[styles.userName, dirType.label, { color: colors.text }]}>
            {fullName}
          </Text>
        </View>

        {/* Contact Info (Email & Phone) */}
        <View style={styles.contactInfoRow}>
          {item.phone ? (
            <Text style={[styles.userPhone, dirType.caption, { color: colors.textSub }]}>
              📞 {item.phone}
            </Text>
          ) : (
            <View />
          )}
          <Text style={[styles.userEmail, dirType.caption, { color: colors.textSub }]}>
            ✉️ {item.email}
          </Text>
        </View>

        {/* Trust Score & Active Role Row */}
        <View style={styles.trustRoleRow}>
          <View style={styles.trustScoreContainer}>
            <Text style={[styles.trustScoreValue, {
              color: (item.trustScore ?? 50) >= 70 ? C.success : (item.trustScore ?? 50) >= 40 ? C.gold : C.danger
            }]}>
              {item.trustScore ?? 50}
            </Text>
            <Text style={[styles.trustScoreLabel, { color: colors.textSub }]}>
              ציון אמינות:
            </Text>
          </View>

          {item.activeRole ? (
            <View style={styles.activeRoleContainer}>
              <Text style={[styles.activeRoleValue, { color: colors.text }]}>
                {translateRole(item.activeRole)}
              </Text>
              <Text style={[styles.activeRoleLabel, { color: colors.textSub }]}>
                תפקיד פעיל:
              </Text>
            </View>
          ) : (
            <View />
          )}
        </View>

        {/* Separator */}
        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        {/* Lock Status Section */}
        <View style={styles.statusRow}>
          {isLocked ? (
            <View style={styles.lockInfo}>
              <Text style={[styles.lockCountText, dirType.micro]}>
                ({item.blockedCount} נסיונות חסומים)
              </Text>
              <View style={[styles.badge, styles.badgeLocked]}>
                <Ionicons name="lock-closed" size={12} color="#ffffff" style={styles.badgeIcon} />
                <Text style={styles.badgeText}>נעול</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeActive]}>
              <Ionicons name="checkmark-circle" size={12} color="#ffffff" style={styles.badgeIcon} />
              <Text style={styles.badgeText}>פעיל</Text>
            </View>
          )}

          {isLocked && (
            <TouchableOpacity
              style={styles.unlockButton}
              onPress={() => handleUnlock(item.id, fullName)}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color={dirApp.secondary} />
              ) : (
                <>
                  <Ionicons name="key-outline" size={14} color={dirApp.secondary} style={styles.buttonIcon} />
                  <Text style={styles.unlockButtonText}>שחרר נעילה</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* KYC Section */}
        <View style={styles.kycRow}>
          <View style={styles.kycInfo}>
            <Text style={[styles.kycStatusText, dirType.caption, { color: getKycBadgeColor(kycStatus) }]}>
              {translateKycStatus(kycStatus)}
            </Text>
            <Text style={[styles.kycLabel, dirType.caption, { color: colors.textSub }]}>
              סטטוס אימות (KYC):
            </Text>
          </View>

          {isKycActionLoading ? (
            <ActivityIndicator size="small" color={dirApp.secondary} />
          ) : (
            <View style={styles.overrideButtons}>
              <TouchableOpacity
                style={[styles.pill, kycStatus === 'APPROVED' && styles.pillApprovedActive]}
                onPress={() => handleKycOverride(item.id, 'APPROVED', fullName)}
              >
                <Text style={[styles.pillText, kycStatus === 'APPROVED' && styles.pillTextActive]}>
                  אשר
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, kycStatus === 'REJECTED' && styles.pillRejectedActive]}
                onPress={() => handleKycOverride(item.id, 'REJECTED', fullName)}
              >
                <Text style={[styles.pillText, kycStatus === 'REJECTED' && styles.pillTextActive]}>
                  דחה
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, kycStatus === 'NONE' && styles.pillNoneActive]}
                onPress={() => handleKycOverride(item.id, 'NONE', fullName)}
              >
                <Text style={[styles.pillText, kycStatus === 'NONE' && styles.pillTextActive]}>
                  נקה
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Divider for Quick Actions */}
        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        {/* Administrative Quick Actions Row */}
        <View style={styles.adminActionsRow}>
          <TouchableOpacity
            style={[styles.adminActionBtn, { borderColor: colors.border }]}
            onPress={() => startEditing(item)}
            disabled={isActionLoading}
          >
            <Ionicons name="create-outline" size={14} color={dirApp.secondary} style={styles.buttonIcon} />
            <Text style={[styles.adminActionText, { color: dirApp.secondary }]}>ערוך פרטים</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.adminActionBtn, { borderColor: `${C.danger}30` }]}
            onPress={() => handleDeleteUser(item.id, fullName)}
            disabled={isActionLoading}
          >
            <Ionicons name="trash-outline" size={14} color={C.danger} style={styles.buttonIcon} />
            <Text style={[styles.adminActionText, { color: C.danger }]}>מחק משתמש</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ResponsiveContainer style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="people-sharp" size={24} color={dirApp.secondary} />
            <Text style={[styles.title, dirType.title]}>ניהול משתמשים</Text>
          </View>
          <Text style={[styles.subtitle, dirType.caption, { color: colors.textSub }]}>
            צפייה במשתמשי האפליקציה, פתיחת נעילת חשבון ואישור KYC ידני (GODMODE)
          </Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={20} color={C.danger} />
            <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
          </View>
        )}

        {successMessage && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle-outline" size={20} color={C.success} />
            <Text style={[styles.successText, { color: C.success }]}>{successMessage}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={dirApp.secondary} />
          </View>
        ) : (
          <>
            <FlatList
              data={users}
              keyExtractor={item => item.id}
              renderItem={renderUserItem}
              contentContainerStyle={styles.listContainer}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[dirApp.secondary]} />}
              ListEmptyComponent={
                <Text style={[styles.emptyText, dirType.body, { color: colors.textMut }]}>
                  לא נמצאו משתמשים במערכת
                </Text>
              }
            />

            {/* Pagination controls */}
            {totalPages > 1 && (
              <View style={[styles.paginationRow, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
                  onPress={() => page < totalPages && setPage(p => p + 1)}
                  disabled={page === totalPages}
                >
                  <Ionicons name="chevron-back" size={18} color={page === totalPages ? colors.textMut : dirApp.secondary} />
                  <Text style={[styles.pageButtonText, { color: page === totalPages ? colors.textMut : dirApp.secondary }]}>הבא</Text>
                </TouchableOpacity>

                <Text style={[styles.pageIndicator, dirType.label, { color: colors.text }]}>
                  עמוד {page} מתוך {totalPages}
                </Text>

                <TouchableOpacity
                  style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                  onPress={() => page > 1 && setPage(p => p - 1)}
                  disabled={page === 1}
                >
                  <Text style={[styles.pageButtonText, { color: page === 1 ? colors.textMut : dirApp.secondary }]}>הקודם</Text>
                  <Ionicons name="chevron-forward" size={18} color={page === 1 ? colors.textMut : dirApp.secondary} />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ResponsiveContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'flex-end', // RTL
  },
  titleRow: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: dirApp.primary,
  },
  subtitle: {
    marginTop: 4,
    textAlign: 'right', // RTL
  },
  errorBanner: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    backgroundColor: '#FDF2F2',
    borderWidth: 1,
    borderColor: '#F8B4B4',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right', // RTL
  },
  successBanner: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    gap: 8,
  },
  successText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right', // RTL
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 120,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', // Left badge, right name
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  roleBadge: {
    backgroundColor: dirApp.surfaceContainer,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roleBadgeText: {
    color: dirApp.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  userEmail: {
    marginTop: 4,
    textAlign: 'right',
  },
  separator: {
    height: 1,
    opacity: 0.2,
    marginVertical: 12,
  },
  statusRow: {
    flexDirection: 'row-reverse', // RTL
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  lockInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeLocked: {
    backgroundColor: C.danger,
  },
  badgeActive: {
    backgroundColor: C.success,
  },
  badgeIcon: {
    marginTop: -1,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  lockCountText: {
    color: C.danger,
    fontWeight: '600',
  },
  unlockButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: dirApp.secondary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  buttonIcon: {
    marginLeft: 2,
  },
  unlockButtonText: {
    color: dirApp.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  kycRow: {
    flexDirection: 'row-reverse', // RTL
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  kycInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  kycLabel: {
    fontWeight: '600',
  },
  kycStatusText: {
    fontWeight: '700',
  },
  overrideButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: dirApp.outlineVariant,
    backgroundColor: 'transparent',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: dirApp.outline,
  },
  pillApprovedActive: {
    borderColor: C.success,
    backgroundColor: `${C.success}15`,
  },
  pillRejectedActive: {
    borderColor: C.danger,
    backgroundColor: `${C.danger}15`,
  },
  pillNoneActive: {
    borderColor: dirApp.outline,
    backgroundColor: `${dirApp.outlineVariant}25`,
  },
  pillTextActive: {
    color: dirApp.primary,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pageIndicator: {
    fontSize: 13,
    fontWeight: '700',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactInfoRow: {
    flexDirection: 'row-reverse', // RTL
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  userPhone: {
    fontSize: 12,
    fontWeight: '500',
  },
  trustRoleRow: {
    flexDirection: 'row-reverse', // RTL
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    padding: 8,
    borderRadius: 8,
  },
  trustScoreContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  trustScoreLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  trustScoreValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  activeRoleContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  activeRoleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeRoleValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  adminActionsRow: {
    flexDirection: 'row-reverse', // RTL
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  adminActionBtn: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 4,
    flex: 0.48, // split evenly with some space
  },
  adminActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  editFormTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row-reverse', // RTL
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  formField: {
    flex: 1,
    marginBottom: 8,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right', // RTL
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right', // RTL
  },
  selectorRow: {
    flexDirection: 'row-reverse', // RTL
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  selectorPill: {
    borderWidth: 1,
    borderColor: dirApp.outlineVariant,
    borderRadius: 99,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  selectorPillActive: {
    borderColor: dirApp.secondary,
    backgroundColor: `${dirApp.secondary}15`,
  },
  selectorPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: dirApp.outline,
  },
  selectorPillTextActive: {
    color: dirApp.secondary,
  },
  toggleBadge: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: dirApp.outlineVariant,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
    flex: 0.31, // fit 3 evenly
  },
  toggleBadgeActive: {
    borderColor: C.success,
    backgroundColor: C.success,
  },
  toggleBadgeActiveError: {
    borderColor: C.danger,
    backgroundColor: C.danger,
  },
  toggleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: dirApp.outline,
  },
  toggleBadgeTextActive: {
    color: '#ffffff',
  },
  formActions: {
    flexDirection: 'row-reverse', // RTL
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 0.48,
    height: 38,
  },
  cancelBtn: {
    backgroundColor: dirApp.outline,
  },
  saveBtn: {
    backgroundColor: dirApp.secondary,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
