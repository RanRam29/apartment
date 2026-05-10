import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import ApartmentSearchChatbot from '../components/ApartmentSearchChatbot';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { C } from '../theme';
import type { RootStackParamList, TenantTabParamList, LandlordTabParamList, MainStackParamList } from '../types';

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

const RootStack  = createNativeStackNavigator<RootStackParamList>();
const TenantTab  = createBottomTabNavigator<TenantTabParamList>();
const LandlordTab = createBottomTabNavigator<LandlordTabParamList>();
const MainStack  = createNativeStackNavigator<MainStackParamList>();

function TenantTabs() {
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
          backgroundColor: 'rgba(251, 250, 250, 0.88)',
          borderTopWidth: 0,
          // Soft Aura Luxury shadow
          shadowColor: '#162839',
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
          backgroundColor: 'rgba(251, 250, 250, 0.88)',
          borderTopWidth: 0,
          // Soft Aura Luxury shadow
          shadowColor: '#162839',
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

  useEffect(() => {
    useChatStore.getState().connect();
    return () => useChatStore.getState().disconnect();
  }, []);

  return (
    <MainStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={needsOnboarding ? 'Onboarding' : 'Tabs'}
    >
      <MainStack.Screen name="Tabs" component={user?.role === 'landlord' ? LandlordTabs : TenantTabs} />
      <MainStack.Screen name="Onboarding" component={OnboardingScreen} />
      <MainStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerShown: true, headerTitle: '',
          headerStyle: { backgroundColor: C.bgCard },
          headerTintColor: C.navy,
          headerShadowVisible: false,
        }}
      />
      <MainStack.Screen
        name="ApartmentDetail"
        component={ApartmentDetailScreen}
        options={{
          headerShown: true, headerTitle: 'פרטי דירה',
          headerStyle: { backgroundColor: C.bgCard },
          headerTintColor: C.navy,
          headerShadowVisible: false,
        }}
      />
      <MainStack.Screen
        name="CreateListing"
        component={CreateListingScreen}
        options={{
          headerShown: true, headerTitle: 'פרסם מודעה',
          headerStyle: { backgroundColor: C.bgCard },
          headerTintColor: C.navy,
          headerShadowVisible: false,
        }}
      />
      <MainStack.Screen
        name="EditListing"
        component={EditListingScreen}
        options={{
          headerShown: true, headerTitle: 'עריכת מודעה',
          headerStyle: { backgroundColor: C.bgCard },
          headerTintColor: C.navy,
          headerShadowVisible: false,
        }}
      />
      <MainStack.Screen
        name="Preferences"
        component={PreferencesScreen}
        options={{
          headerShown: true, headerTitle: 'העדפות חיפוש',
          headerStyle: { backgroundColor: C.bgCard },
          headerTintColor: C.navy,
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
    </MainStack.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.navy} />
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
