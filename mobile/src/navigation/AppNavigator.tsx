import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../store/useAuthStore';
import type { RootStackParamList, TenantTabParamList, LandlordTabParamList, MainStackParamList } from '../types';

// Screens — imported lazily to keep this file readable
import AuthScreen from '../screens/AuthScreen';
import SwipeScreen from '../screens/SwipeScreen';
import MatchesScreen from '../screens/MatchesScreen';
import SearchScreen from '../screens/SearchScreen';
import ChatScreen from '../screens/ChatScreen';
import LandlordDashboard from '../screens/LandlordDashboard';
import LeadsScreen from '../screens/LeadsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const TenantTab = createBottomTabNavigator<TenantTabParamList>();
const LandlordTab = createBottomTabNavigator<LandlordTabParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

const ACTIVE_COLOR = '#6C5CE7';
const INACTIVE_COLOR = '#A0A0B2';

function TenantTabs() {
  return (
    <TenantTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: { height: 60, paddingBottom: 8 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Swipe: focused ? 'home' : 'home-outline',
            Matches: focused ? 'heart' : 'heart-outline',
            Search: focused ? 'search' : 'search-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <TenantTab.Screen name="Swipe" component={SwipeScreen} options={{ title: 'דירות' }} />
      <TenantTab.Screen name="Matches" component={MatchesScreen} options={{ title: 'התאמות' }} />
      <TenantTab.Screen name="Search" component={SearchScreen} options={{ title: 'חיפוש' }} />
      <TenantTab.Screen name="Profile" component={ProfileScreen} options={{ title: 'פרופיל' }} />
    </TenantTab.Navigator>
  );
}

function LandlordTabs() {
  return (
    <LandlordTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: { height: 60, paddingBottom: 8 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Dashboard: focused ? 'stats-chart' : 'stats-chart-outline',
            Leads: focused ? 'people' : 'people-outline',
            Listings: focused ? 'list' : 'list-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <LandlordTab.Screen name="Dashboard" component={LandlordDashboard} options={{ title: 'דשבורד' }} />
      <LandlordTab.Screen name="Leads" component={LeadsScreen} options={{ title: 'לידים' }} />
      <LandlordTab.Screen name="Listings" component={SwipeScreen} options={{ title: 'מודעות' }} />
      <LandlordTab.Screen name="Profile" component={ProfileScreen} options={{ title: 'פרופיל' }} />
    </LandlordTab.Navigator>
  );
}

function MainNavigator() {
  const { user } = useAuthStore();

  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen
        name="Tabs"
        component={user?.role === 'landlord' ? LandlordTabs : TenantTabs}
      />
      <MainStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerShown: true, headerTitle: '' }}
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A2E' }}>
        <ActivityIndicator size="large" color="#6C5CE7" />
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
