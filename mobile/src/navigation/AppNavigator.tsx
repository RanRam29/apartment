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
import type {
  RootStackParamList,
  TenantTabParamList,
  LandlordTabParamList,
  MainStackParamList,
} from '../types';
import {
  AdminTenantShellProvider,
  AdminLandlordShellProvider,
} from './AdminAppModeContext';

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
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import RentPaymentsScreen from '../screens/RentPaymentsScreen';
import CommercialScreen from '../screens/CommercialScreen';
import GamificationScreen from '../screens/GamificationScreen';
import ServicesScreen from '../screens/ServicesScreen';
import IoTScreen from '../screens/IoTScreen';
import LogsConsoleScreen from '../screens/LogsConsoleScreen';

const RootStack  = createNativeStackNavigator<RootStackParamList>();
const TenantTab  = createBottomTabNavigator<TenantTabParamList>();
const LandlordTab = createBottomTabNavigator<LandlordTabParamList>();
const MainStack  = createNativeStackNavigator<MainStackParamList>();

function TenantTabsForAdmin() {
  return (
    <AdminTenantShellProvider>
      <TenantTabs />
    </AdminTenantShellProvider>
  );
}

function LandlordTabsForAdmin() {
  return (
    <AdminLandlordShellProvider>
      <LandlordTabs />
    </AdminLandlordShellProvider>
  );
}

/** Admin: pick tenant UI shell or landlord UI shell (each is the full existing tab navigator). */
function AdminTabs() {
  const insets = useSafeAreaInsets();
  const appTheme = useAppTheme();
  const [mode, setMode] = useState<'tenant' | 'landlord'>('tenant');

  return (
    <View style={{ flex: 1, backgroundColor: appTheme.colors.shellBackground }}>
      <View
        style={[
          adminShellStyles.bar,
          {
            paddingTop: Math.max(insets.top, 8),
            backgroundColor: appTheme.colors.tabBarBackground,
            borderBottomColor: C.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[adminShellStyles.seg, mode === 'tenant' && adminShellStyles.segOn]}
          onPress={() => setMode('tenant')}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'tenant' }}
        >
          <Ionicons
            name="person-outline"
            size={18}
            color={mode === 'tenant' ? C.onInverse.primary : dirApp.primary}
          />
          <Text style={[adminShellStyles.segText, mode === 'tenant' && adminShellStyles.segTextOn]}>
            ממשק שוכר
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[adminShellStyles.seg, mode === 'landlord' && adminShellStyles.segOn]}
          onPress={() => setMode('landlord')}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'landlord' }}
        >
          <Ionicons
            name="business-outline"
            size={18}
            color={mode === 'landlord' ? C.onInverse.primary : dirApp.primary}
          />
          <Text style={[adminShellStyles.segText, mode === 'landlord' && adminShellStyles.segTextOn]}>
            ממשק משכיר
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        {mode === 'tenant' ? <TenantTabsForAdmin /> : <LandlordTabsForAdmin />}
      </View>
    </View>
  );
}

const adminShellStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  seg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: 'transparent',
  },
  segOn: {
    backgroundColor: dirApp.primaryContainer,
    borderColor: dirApp.primaryContainer,
  },
  segText: {
    fontSize: 14,
    fontWeight: '700',
    color: dirApp.primary,
  },
  segTextOn: {
    color: C.onInverse.primary,
  },
});

function TenantTabs() {
  const appTheme = useAppTheme();
  return (
    <View style={{ flex: 1 }}>
    <TenantTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.cyan,
        tabBarInactiveTintColor: C.textMut,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
          backgroundColor: appTheme.colors.tabBarBackground,
          borderTopWidth: 0,
          shadowColor: appTheme.colors.tabBarShadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 20,
          elevation: 20,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home:    focused ? 'compass'  : 'compass-outline',
            Swipe:   focused ? 'home'   : 'home-outline',
            Matches: focused ? 'heart'  : 'heart-outline',
            Search:  focused ? 'search' : 'search-outline',
            Map:     focused ? 'map'    : 'map-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <TenantTab.Screen name="Home"    component={HomeScreen}    options={{ title: 'Home' }} />
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
  const appTheme = useAppTheme();
  return (
    <LandlordTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.cyan,
        tabBarInactiveTintColor: C.textMut,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
          backgroundColor: appTheme.colors.tabBarBackground,
          borderTopWidth: 0,
          shadowColor: appTheme.colors.tabBarShadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 20,
          elevation: 20,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home:      focused ? 'compass'       : 'compass-outline',
            Dashboard: focused ? 'stats-chart'   : 'stats-chart-outline',
            Leads:     focused ? 'people'        : 'people-outline',
            Matches:   focused ? 'chatbubbles'   : 'chatbubbles-outline',
            Listings:  focused ? 'list'          : 'list-outline',
            Profile:   focused ? 'person'        : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <LandlordTab.Screen name="Home"      component={HomeScreen}        options={{ title: 'Home' }} />
      <LandlordTab.Screen name="Dashboard" component={LandlordDashboard} options={{ title: 'דשבורד' }} />
      <LandlordTab.Screen name="Leads"     component={LeadsScreen}       options={{ title: 'לידים' }} />
      <LandlordTab.Screen name="Matches"   component={MatchesScreen}     options={{ title: 'צ׳אטים' }} />
      <LandlordTab.Screen name="Listings"  component={ListingsScreen}    options={{ title: 'מודעות' }} />
      <LandlordTab.Screen name="Profile"   component={ProfileScreen}     options={{ title: 'פרופיל' }} />
    </LandlordTab.Navigator>
  );
}

function MainNavigator() {
  const { user, needsOnboarding } = useAuthStore();
  const appTheme = useAppTheme();

  useEffect(() => {
    useChatStore.getState().connect();
    return () => useChatStore.getState().disconnect();
  }, []);

  return (
    <MainStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={needsOnboarding ? 'Onboarding' : 'Tabs'}
    >
      <MainStack.Screen
        name="Tabs"
        component={
          user?.role === 'landlord'
            ? LandlordTabs
            : user?.role === 'admin'
              ? AdminTabs
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
    </MainStack.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
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
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
