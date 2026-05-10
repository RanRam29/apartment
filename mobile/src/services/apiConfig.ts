import { Platform } from 'react-native';

/** Local backend when EXPO_PUBLIC_API_URL is unset (development / tests only). */
const DEV_FALLBACK_API_URL = 'http://localhost:3000';

/**
 * EXPO_PUBLIC_API_URL must be the API **origin only** (no `/api` suffix).
 * If someone sets `https://host.onrender.com/api`, axios would otherwise call
 * `/api/api/...` and every route returns 404.
 */
export function normalizeApiOrigin(url: string): string {
  let u = url.trim().replace(/\/+$/, '');
  if (u.endsWith('/api')) {
    u = u.slice(0, -4).replace(/\/+$/, '');
  }
  return u;
}

function normalizeLocalhostForAndroid(url: string): string {
  // Android emulator cannot reach host machine via localhost.
  return url
    .replace('http://localhost:', 'http://10.0.2.2:')
    .replace('http://127.0.0.1:', 'http://10.0.2.2:');
}

export function getApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim();
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && (!raw || raw.length === 0)) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not set. Configure one production API URL in Vercel / EAS (https://your-api.example.com).'
    );
  }

  const configuredBaseUrl = normalizeApiOrigin(raw || DEV_FALLBACK_API_URL);

  if (isProduction && configuredBaseUrl.startsWith('http://')) {
    throw new Error('EXPO_PUBLIC_API_URL must use HTTPS in production');
  }

  if (Platform.OS === 'android') {
    return normalizeLocalhostForAndroid(configuredBaseUrl);
  }

  return configuredBaseUrl;
}
