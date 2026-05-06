import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { extractVerificationToken } from './src/services/verification';
import { useAuthStore } from './src/store/useAuthStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 60_000 },
  },
});

function AppInner() {
  usePushNotifications();
  const verifyEmail = useAuthStore((s) => s.verifyEmail);

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
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <AppInner />
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
