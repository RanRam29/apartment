import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ActivityIndicator, View, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { rubikFonts } from './src/theme/fonts';
import AppNavigator from './src/navigation/AppNavigator';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import StartupIntroGate from './src/components/StartupIntroGate';
import { extractVerificationToken } from './src/services/verification';
import { useAuthStore } from './src/store/useAuthStore';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 60_000 },
  },
});

function AppInner() {
  usePushNotifications();
  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const { isDark } = useTheme();

  useEffect(() => {
    const handleUrl = async (url: string | null | undefined) => {
      const token = extractVerificationToken(url);
      if (!token) return;
      try {
        await verifyEmail(token);
        Alert.alert('Success', 'Email verified successfully');
      } catch {
        Alert.alert('Error', 'Failed to verify email token');
      }
    };

    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url).catch(() => {});
    });
    return () => sub.remove();
  }, [verifyEmail]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

async function checkForOTAUpdate() {
  if (__DEV__ || Platform.OS === 'web') return;
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      Alert.alert(
        'עדכון זמין',
        'גרסה חדשה הורדה. האפליקציה תיטען מחדש.',
        [{ text: 'עדכן עכשיו', onPress: () => Updates.reloadAsync() }],
      );
    }
  } catch (e) {
    // OTA check failed silently — not critical
    console.log('OTA update check failed:', e);
  }
}

export default function App() {
  const [fontsLoaded] = useFonts(rubikFonts);
  const [startupDone, setStartupDone] = useState(false);
  const finishStartup = useCallback(() => setStartupDone(true), []);

  useEffect(() => {
    checkForOTAUpdate();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#00CBA9" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemeProvider>
            {!startupDone ? (
              <StartupIntroGate onFinish={finishStartup} />
            ) : (
              <QueryClientProvider client={queryClient}>
                <AppInner />
              </QueryClientProvider>
            )}
          </ThemeProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
