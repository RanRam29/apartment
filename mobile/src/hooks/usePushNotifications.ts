import { useEffect } from 'react';
import { Platform } from 'react-native';
import { authApi } from '../services/api';

export function usePushNotifications() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    registerNativePush().catch(() => {});
  }, []);
}

async function registerNativePush() {
  const Notifications = await import('expo-notifications');
  const Device = await import('expo-device');
  if (!Device.isDevice) return; // skip emulator/web

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  const { status: existing } = await Notifications.getPermissionsAsync();
  const finalStatus = existing === 'granted'
    ? existing
    : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== 'granted') return;

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await authApi.savePushToken(token);
  } catch {
    // Non-critical — silently skip
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('matches', {
      name: 'Match Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C5CE7',
    }).catch(() => {});
  }
}
