import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
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
  activeRole?: string;
  isLocked: boolean;
  blockedCount: number;
  kycProfile?: UserKycProfile | null;
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

    return (
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {/* User Info Header */}
        <View style={styles.cardHeader}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{translateRole(item.role)}</Text>
          </View>
          <Text style={[styles.userName, dirType.label, { color: colors.text }]}>
            {fullName}
          </Text>
        </View>

        {/* Email */}
        <Text style={[styles.userEmail, dirType.caption, { color: colors.textSub }]}>
          {item.email}
        </Text>

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
    paddingBottom: 24,
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
});
