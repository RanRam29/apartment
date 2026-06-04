import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import ApartmentSearchChatbot from '../components/ApartmentSearchChatbot';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { clientLogsApi } from '../services/api';
import { C } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { useAppTheme } from '../hooks/useAppTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../context/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import {
  RootStackParamList,
  TenantTabParamList,
  LandlordTabParamList,
  AdminTabParamList,
  MainStackParamList,
} from '../types';

import AuthScreen from '../screens/AuthScreen';
import SwipeScreen from '../screens/SwipeScreen';
import MatchesScreen from '../screens/MatchesScreen';
import SearchScreen from '../screens/SearchScreen';
import ChatScreen from '../screens/ChatScreen';
import LandlordDashboard from '../screens/LandlordDashboard';
import LeadsScreen from '../screens/LeadsScreen';
import ListingsScreen from '../screens/ListingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ApartmentDetailScreen from '../screens/ApartmentDetailScreen';
import CreateListingScreen from '../screens/CreateListingScreen';
import EditListingScreen from '../screens/EditListingScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import RoommateScreen from '../screens/RoommateScreen';
import VerifyIdentityScreen from '../screens/VerifyIdentityScreen';
import ContractsScreen from '../screens/ContractsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import MapScreen from '../screens/MapScreen';
import RentPaymentsScreen from '../screens/RentPaymentsScreen';
import CommercialScreen from '../screens/CommercialScreen';
import GamificationScreen from '../screens/GamificationScreen';
import ServicesScreen from '../screens/ServicesScreen';
import IoTScreen from '../screens/IoTScreen';
import LogsConsoleScreen from '../screens/LogsConsoleScreen';
import AdminConfigScreen from '../screens/AdminConfigScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AdminStatsScreen from '../screens/AdminStatsScreen';

import ContractUploadScreen from '../screens/ContractUploadScreen';
import ContractDetailScreen from '../screens/ContractDetailScreen';
import CheckInScreen from '../screens/CheckInScreen';
import CheckOutScreen from '../screens/CheckOutScreen';
import LedgerScreen from '../screens/LedgerScreen';
import MaintenanceScreen from '../screens/MaintenanceScreen';
import TermsScreen from '../screens/TermsScreen';
import RenterJournalScreen from '../screens/RenterJournalScreen';
import VerificationPendingScreen from '../screens/VerificationPendingScreen';
import PrivacySettingsScreen from '../screens/PrivacySettingsScreen';
import LandlordProfileScreen from '../screens/LandlordProfileScreen';

const RootStack  = createNativeStackNavigator<RootStackParamList>();
const TenantTab  = createBottomTabNavigator<TenantTabParamList>();
const LandlordTab = createBottomTabNavigator<LandlordTabParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();
const MainStack  = createNativeStackNavigator<MainStackParamList>();

// Responsive Custom Sidebar / Tab Bar
function CustomTabBar({ state, navigation, role }: any) {
  const { isDesktop } = useResponsive();
  const colors = useColors();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const tabIcons: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
    Swipe: { active: 'home', inactive: 'home-outline' },
    Matches: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
    Search: { active: 'search', inactive: 'search-outline' },
    Map: { active: 'map', inactive: 'map-outline' },
    Profile: { active: 'person', inactive: 'person-outline' },
    Dashboard: { active: 'stats-chart', inactive: 'stats-chart-outline' },
    Leads: { active: 'people', inactive: 'people-outline' },
    Listings: { active: 'list', inactive: 'list-outline' },
    AdminConfig: { active: 'settings', inactive: 'settings-outline' },
    AdminUsers: { active: 'people', inactive: 'people-outline' },
    AdminStats: { active: 'stats-chart', inactive: 'stats-chart-outline' },
    LogsConsole: { active: 'document-text', inactive: 'document-text-outline' },
  };

  const getLabel = (name: string) => {
    const labels: Record<string, string> = {
      Swipe: 'דירות',
      Matches: role === 'landlord' ? 'צ׳אטים' : 'התאמות',
      Search: 'חיפוש',
      Map: 'מפה',
      Profile: 'פרופיל',
      Dashboard: 'דשבורד',
      Leads: 'לידים',
      Listings: 'מודעות',
      AdminConfig: 'הגדרות',
      AdminUsers: 'משתמשים',
      AdminStats: 'סטטיסטיקות',
      LogsConsole: 'לוגים',
    };
    return labels[name] || name;
  };

  if (isDesktop) {
    return (
      <View style={[navStyles.sidebarContainer, { backgroundColor: colors.bgCard, borderLeftColor: colors.border }]}>
        <View style={navStyles.sidebarHeader}>
          <Text style={navStyles.sidebarBrand}>DirApp</Text>
          <Text style={navStyles.sidebarSubBrand}>
            {role === 'admin' ? 'קונסול מנהל' : role === 'landlord' ? 'אזור משכירים' : 'אזור שוכרים'}
          </Text>
        </View>

        {user && (
          <View style={[navStyles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={navStyles.userAvatar}>
              <Text style={navStyles.userInitials}>
                {(user.firstName?.[0] || '').toUpperCase()}{(user.lastName?.[0] || '').toUpperCase()}
              </Text>
            </View>
            <View style={navStyles.userInfo}>
              <Text style={[navStyles.userName, { color: colors.text }]} numberOfLines={1}>
                {user.firstName} {user.lastName}
              </Text>
              <Text style={navStyles.userRoleText}>
                {role === 'admin' ? 'מנהל מערכת' : role === 'landlord' ? 'משכיר' : 'שוכר מאומת'}
              </Text>
            </View>
          </View>
        )}

        <View style={navStyles.sidebarNav}>
          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;
            const iconConfig = tabIcons[route.name] || { active: 'square', inactive: 'square-outline' };
            const iconName = isFocused ? iconConfig.active : iconConfig.inactive;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate({ name: route.name, merge: true });
              }
            };

            return (
              <TouchableOpacity
                key={route.name}
                onPress={onPress}
                style={[
                  navStyles.sidebarNavItem,
                  isFocused && { backgroundColor: 'rgba(0, 71, 186, 0.08)' }
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={iconName}
                  size={20}
                  color={isFocused ? '#0047ba' : colors.textSub}
                  style={{ marginLeft: 12 }}
                />
                <Text style={[
                  navStyles.sidebarNavText,
                  { color: isFocused ? '#0047ba' : colors.textSub, fontWeight: isFocused ? '700' : '500' }
                ]}>
                  {getLabel(route.name)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {role === 'landlord' && (
          <TouchableOpacity
            style={navStyles.sidebarActionBtn}
            onPress={() => navigation.navigate('CreateListing')}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
            <Text style={navStyles.sidebarActionBtnText}>פרסם מודעה חדשה</Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        <View style={navStyles.sidebarFooter}>
          <TouchableOpacity style={navStyles.footerItem}>
            <Ionicons name="settings-outline" size={16} color={colors.textMut} style={{ marginLeft: 8 }} />
            <Text style={[navStyles.footerItemText, { color: colors.textMut }]}>הגדרות</Text>
          </TouchableOpacity>
          <TouchableOpacity style={navStyles.footerItem}>
            <Ionicons name="help-circle-outline" size={16} color={colors.textMut} style={{ marginLeft: 8 }} />
            <Text style={[navStyles.footerItemText, { color: colors.textMut }]}>תמיכה</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[
      navStyles.mobileTabBar, 
      { 
        backgroundColor: colors.bgCard, 
        borderTopColor: colors.border,
        paddingBottom: insets.bottom || 20 
      }
    ]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const iconConfig = tabIcons[route.name] || { active: 'square', inactive: 'square-outline' };
        const iconName = isFocused ? iconConfig.active : iconConfig.inactive;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true });
          }
        };

        return (
          <TouchableOpacity
            key={route.name}
            onPress={onPress}
            style={navStyles.mobileTabItem}
            activeOpacity={0.8}
          >
            <Ionicons
              name={iconName}
              size={22}
              color={isFocused ? '#0047ba' : colors.textSub}
            />
            <Text style={[
              navStyles.mobileTabText,
              { color: isFocused ? '#0047ba' : colors.textSub, fontWeight: isFocused ? '700' : '500' }
            ]}>
              {getLabel(route.name)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AdminTabs() {
  const { isDesktop } = useResponsive();
  return (
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row-reverse' : 'column' }}>
      <AdminTab.Navigator
        tabBar={(props) => <CustomTabBar {...props} role="admin" />}
        screenOptions={{ headerShown: false }}
      >
        <AdminTab.Screen name="AdminConfig" component={AdminConfigScreen} options={{ title: 'הגדרות' }} />
        <AdminTab.Screen name="AdminUsers"  component={AdminUsersScreen}  options={{ title: 'משתמשים' }} />
        <AdminTab.Screen name="AdminStats"  component={AdminStatsScreen}  options={{ title: 'סטטיסטיקות' }} />
        <AdminTab.Screen name="LogsConsole" component={LogsConsoleScreen} options={{ title: 'לוגים' }} />
        <AdminTab.Screen name="Profile" component={ProfileScreen} options={{ title: 'פרופיל' }} />
      </AdminTab.Navigator>
    </View>
  );
}

function TenantTabs() {
  const { isDesktop } = useResponsive();
  return (
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row-reverse' : 'column' }}>
      <TenantTab.Navigator
        tabBar={(props) => <CustomTabBar {...props} role="tenant" />}
        screenOptions={{ headerShown: false }}
      >
        <TenantTab.Screen name="Swipe"   component={SwipeScreen}   options={{ title: 'דירות' }} />
        <TenantTab.Screen name="Matches" component={MatchesScreen} options={{ title: 'התאמות' }} />
        <TenantTab.Screen name="Search"  component={SearchScreen}  options={{ title: 'חיפוש' }} />
        <TenantTab.Screen name="Map"     component={MapScreen}     options={{ title: 'מפה' }} />
        <TenantTab.Screen name="Profile" component={ProfileScreen} options={{ title: 'פרופיל' }} />
      </TenantTab.Navigator>
      <ApartmentSearchChatbot />
    </View>
  );
}

function LandlordTabs() {
  const { isDesktop } = useResponsive();
  return (
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row-reverse' : 'column' }}>
      <LandlordTab.Navigator
        tabBar={(props) => <CustomTabBar {...props} role="landlord" />}
        screenOptions={{ headerShown: false }}
      >
        <LandlordTab.Screen name="Dashboard" component={LandlordDashboard} options={{ title: 'דשבורד' }} />
        <LandlordTab.Screen name="Leads"     component={LeadsScreen}       options={{ title: 'לידים' }} />
        <LandlordTab.Screen name="Matches"   component={MatchesScreen}     options={{ title: 'צ׳אטים' }} />
        <LandlordTab.Screen name="Listings"  component={ListingsScreen}    options={{ title: 'מודעות' }} />
        <LandlordTab.Screen name="Profile"   component={ProfileScreen}     options={{ title: 'פרופיל' }} />
      </LandlordTab.Navigator>
    </View>
  );
}

function MainNavigator() {
  const { user, needsOnboarding } = useAuthStore();
  const appTheme = useAppTheme();
  // Admin role always gets AdminTabs, regardless of activeRole
  const isAdmin = user?.role === 'admin';
  const userRole = user?.activeRole || user?.role;

  useEffect(() => {
    useChatStore.getState().connect();
    return () => useChatStore.getState().disconnect();
  }, []);

  return (
    <MainStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={needsOnboarding ? 'Onboarding' : (!isAdmin && !user?.tosAcceptedAt) ? 'Terms' : 'Tabs'}
    >
      <MainStack.Screen
        name="Tabs"
        component={
          isAdmin
            ? AdminTabs
            : userRole === 'landlord'
              ? LandlordTabs
              : TenantTabs
        }
      />
      <MainStack.Screen name="Onboarding" component={OnboardingScreen} />
      <MainStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerShown: true, headerTitle: '',
          headerStyle: { backgroundColor: appTheme.colors.headerBackground },
          headerTintColor: appTheme.colors.headerTint,
          headerShadowVisible: false,
        }}
      />
      <MainStack.Screen
        name="ApartmentDetail"
        component={ApartmentDetailScreen}
        options={{
          headerShown: true, headerTitle: 'פרטי דירה',
          headerStyle: { backgroundColor: appTheme.colors.headerBackground },
          headerTintColor: appTheme.colors.headerTint,
          headerShadowVisible: false,
        }}
      />
      <MainStack.Screen
        name="CreateListing"
        component={CreateListingScreen}
        options={{
          headerShown: true, headerTitle: 'פרסם מודעה',
          headerStyle: { backgroundColor: appTheme.colors.headerBackground },
          headerTintColor: appTheme.colors.headerTint,
          headerShadowVisible: false,
        }}
      />
      <MainStack.Screen
        name="EditListing"
        component={EditListingScreen}
        options={{
          headerShown: true, headerTitle: 'עריכת מודעה',
          headerStyle: { backgroundColor: appTheme.colors.headerBackground },
          headerTintColor: appTheme.colors.headerTint,
          headerShadowVisible: false,
        }}
      />
      <MainStack.Screen
        name="Preferences"
        component={PreferencesScreen}
        options={{
          headerShown: true, headerTitle: 'העדפות חיפוש',
          headerStyle: { backgroundColor: appTheme.colors.headerBackground },
          headerTintColor: appTheme.colors.headerTint,
          headerShadowVisible: false,
        }}
      />
      <MainStack.Screen
        name="Roommate"
        component={RoommateScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="VerifyIdentity"
        component={VerifyIdentityScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="Contracts"
        component={ContractsScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="RentPayments"
        component={RentPaymentsScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="Commercial"
        component={CommercialScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="Gamification"
        component={GamificationScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="Services"
        component={ServicesScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="IoT"
        component={IoTScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="LogsConsole"
        component={LogsConsoleScreen}
        options={{
          headerShown: true,
          headerTitle: 'Logs Console',
          headerStyle: { backgroundColor: appTheme.colors.headerBackground },
          headerTintColor: appTheme.colors.headerTint,
          headerShadowVisible: false,
        }}
      />
      <MainStack.Screen name="ContractUpload" component={ContractUploadScreen} options={{ headerShown: false }} />
      <MainStack.Screen name="ContractDetail" component={ContractDetailScreen} options={{ headerShown: false }} />
      <MainStack.Screen name="CheckIn" component={CheckInScreen} options={{ headerShown: false }} />
      <MainStack.Screen name="CheckOut" component={CheckOutScreen} options={{ headerShown: false }} />
      <MainStack.Screen name="Ledger" component={LedgerScreen} options={{ headerShown: false }} />
      <MainStack.Screen name="Maintenance" component={MaintenanceScreen} options={{ headerShown: false }} />
      <MainStack.Screen name="Terms" component={TermsScreen} options={{ headerShown: false }} />
      <MainStack.Screen name="RenterJournal" component={RenterJournalScreen} options={{ headerShown: false }} />
      <MainStack.Screen name="PrivacySettings" component={PrivacySettingsScreen} options={{ headerShown: false }} />
      <MainStack.Screen name="LandlordProfile" component={LandlordProfileScreen} options={{ headerShown: false }} />
    </MainStack.Navigator>

  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, restoreSession, user } = useAuthStore();
  const bootTheme = useAppTheme();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    // Hermes/RN often exposes `window` without DOM APIs; never call addEventListener unless it exists.
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;

    clientLogsApi.event({
      level: 'info',
      category: 'application',
      event: 'client.web.app_started',
      message: 'Web app session started',
      metadata: { userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '' },
      tags: ['web', 'startup'],
    }).catch(() => {});

    const onWindowError = (event: ErrorEvent) => {
      clientLogsApi.event({
        level: 'error',
        category: 'application',
        event: 'client.web.window_error',
        message: event.message || 'Unhandled window error',
        metadata: {
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
        },
        tags: ['web', 'runtime'],
      }).catch(() => {});
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      clientLogsApi.event({
        level: 'error',
        category: 'application',
        event: 'client.web.unhandled_rejection',
        message: 'Unhandled promise rejection',
        metadata: {
          reason:
            typeof event.reason === 'string'
              ? event.reason
              : event.reason?.message || 'unknown',
        },
        tags: ['web', 'runtime'],
      }).catch(() => {});
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bootTheme.colors.shellBackground }}>
        <ActivityIndicator size="large" color={dirApp.secondary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthScreen} />
        ) : user?.isVerified === false ? (
          <RootStack.Screen name="VerifyEmail" component={VerificationPendingScreen} />
        ) : (
          <RootStack.Screen name="Main" component={MainNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const navStyles = StyleSheet.create({
  sidebarContainer: {
    width: 260,
    height: '100%',
    borderLeftWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    flexDirection: 'column',
  },
  sidebarHeader: {
    marginBottom: 24,
    alignItems: 'flex-end',
  },
  sidebarBrand: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0047ba',
  },
  sidebarSubBrand: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '700',
  },
  userCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 10,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitials: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0047ba',
  },
  userInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: 13,
    fontWeight: '800',
  },
  userRoleText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  sidebarNav: {
    gap: 6,
  },
  sidebarNavItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  sidebarNavText: {
    fontSize: 13,
  },
  sidebarActionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0047ba',
    borderRadius: 8,
    height: 40,
    marginTop: 20,
  },
  sidebarActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
    gap: 12,
  },
  footerItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 4,
  },
  footerItemText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mobileTabBar: {
    flexDirection: 'row-reverse',
    height: 64,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  mobileTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 2,
  },
  mobileTabText: {
    fontSize: 10,
  },
});
