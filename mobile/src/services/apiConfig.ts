import { Platform } from 'react-native';

function normalizeLocalhostForAndroid(url: string): string {
  // Android emulator cannot reach host machine via localhost.
  return url
    .replace('http://localhost:', 'http://10.0.2.2:')
    .replace('http://127.0.0.1:', 'http://10.0.2.2:');
}

export function getApiBaseUrl(): string {
  // Online-first default. Override via EXPO_PUBLIC_API_URL for local/dev as needed.
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://apartment-backend-v24y.onrender.com';
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && configuredBaseUrl.startsWith('http://')) {
    throw new Error('EXPO_PUBLIC_API_URL must use HTTPS in production');
  }

  if (Platform.OS === 'android') {
    return normalizeLocalhostForAndroid(configuredBaseUrl);
  }

  return configuredBaseUrl;
}
