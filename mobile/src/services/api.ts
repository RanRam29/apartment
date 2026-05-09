import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { getApiBaseUrl } from './apiConfig';

const BASE_URL = getApiBaseUrl();
const TOKEN_KEY = 'auth_token';
const hasWebStorage = typeof globalThis !== 'undefined' && 'localStorage' in globalThis;
const SecureStore = Platform.OS === 'web' ? null : require('expo-secure-store');

const storage = {
  getItemAsync: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (!hasWebStorage) return null;
      try {
        return globalThis.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  setItemAsync: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (!hasWebStorage) return;
      try {
        globalThis.localStorage.setItem(key, value);
      } catch {
        // Ignore storage errors on web (private mode/quota).
      }
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  deleteItemAsync: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (!hasWebStorage) return;
      try {
        globalThis.localStorage.removeItem(key);
      } catch {
        // Ignore storage errors on web (private mode/quota).
      }
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await storage.getItemAsync(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear token and redirect to auth
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await storage.deleteItemAsync(TOKEN_KEY);
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string; role: string; phone?: string }) =>
    api.post('/auth/register', data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  verifyEmail: (token: string) => api.get(`/auth/verify/${token}`),
  resendVerification: (email: string) => api.post('/auth/verify/resend', { email }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  savePushToken: (pushToken: string) => api.patch('/auth/push-token', { pushToken }),
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }) =>
    api.patch('/auth/profile', data),
  uploadAvatar: (formData: FormData) =>
    api.patch('/auth/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ─── Apartments ───────────────────────────────────────────────────────────────
export const apartmentsApi = {
  getFeed: (params?: { city?: string; minPrice?: number; maxPrice?: number; rooms?: number; page?: number; limit?: number }) =>
    api.get('/apartments/feed', { params }),
  getById: (id: string) => api.get(`/apartments/${id}`),
  create: (formData: FormData) =>
    api.post('/apartments', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: Partial<{ title: string; price: number; isActive: boolean; description: string }>) =>
    api.patch(`/apartments/${id}`, data),
  toggleFreeze: (id: string) => api.post(`/apartments/${id}/freeze`),
  deletePermanently: (id: string) => api.delete(`/apartments/${id}`),
  generateMarketingCopy: (id: string, style: 'professional' | 'friendly' | 'luxury') =>
    api.post(`/apartments/${id}/marketing-copy`, { style }),
};

// ─── Swipe ────────────────────────────────────────────────────────────────────
export const swipeApi = {
  record: (apartmentId: string, direction: 'like' | 'dislike' | 'superlike', seenDurationMs?: number) =>
    api.post('/swipe', { apartmentId, direction, seenDurationMs }),
  history: () => api.get('/swipe/history'),
  undo: () => api.delete('/swipe/last'),
  quota: () => api.get('/swipe/quota'),
};

// ─── Matches ──────────────────────────────────────────────────────────────────
export const matchesApi = {
  list: () => api.get('/matches'),
  getById: (id: string) => api.get(`/matches/${id}`),
  accept: (id: string) => api.post(`/matches/${id}/accept`),
  reject: (id: string) => api.post(`/matches/${id}/reject`),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatApi = {
  getMessages: (matchId: string, params?: { limit?: number; before?: string }) =>
    api.get(`/chat/${matchId}`, { params }),
  sendMessage: (matchId: string, content: string, type?: string) =>
    api.post(`/chat/${matchId}`, { content, type }),
  markRead: (matchId: string) => api.patch(`/chat/${matchId}/read`),
};

// ─── Recommendations ─────────────────────────────────────────────────────────
export const recommendationsApi = {
  nlpSearch: (query: string, overrides?: { city?: string; maxPrice?: number; minRooms?: number; petsAllowed?: boolean }) =>
    api.post('/recommendations/search', { query, ...overrides }),
  personalized: () => api.get('/recommendations/personalized'),
  getPreferences: () => api.get('/recommendations/preferences'),
  savePreferences: (prefs: object) => api.post('/recommendations/preferences', prefs),
};

// ─── Landlord ─────────────────────────────────────────────────────────────────
export const landlordApi = {
  dashboard: () => api.get('/landlord/dashboard'),
  leads: (params?: { status?: string; page?: number }) =>
    api.get('/landlord/leads', { params }),
};

// ─── Payments ─────────────────────────────────────────────────────────────────
export const paymentApi = {
  startPremium: () => api.post('/payments/premium', {}),
  // Rent collection (F11)
  createRentRequest: (contractId: string, month: string) =>
    api.post('/payments/rent', { contractId, month }),
  listRentPayments: () => api.get('/payments/rent'),
  initiatePayment: (id: string, method: 'bit' | 'paybox') =>
    api.post(`/payments/rent/${id}/pay`, { method }),
  markPaid: (id: string, method?: 'bank_transfer' | 'manual') =>
    api.post(`/payments/rent/${id}/mark-paid`, { method }),
};

// ─── Contracts / Digital Agreements (F10) ────────────────────────────────────
export const contractsApi = {
  create: (data: {
    matchId: string;
    monthlyRent: number;
    depositMonths?: number;
    startDate: string;
    endDate: string;
    customClauses?: string;
  }) => api.post('/contracts', data),
  list: () => api.get('/contracts'),
  getById: (id: string) => api.get(`/contracts/${id}`),
  sign: (id: string) => api.post(`/contracts/${id}/sign`),
  updateDeposit: (id: string, action: 'mark_paid' | 'release' | 'forfeit') =>
    api.post(`/contracts/${id}/deposit`, { action }),
};

// ─── Screening / Identity Verification (F9) ──────────────────────────────────
export const screeningApi = {
  submitIdentity: (data: { idNumber: string; fullName: string; phone: string }) =>
    api.post('/screening/identity', data),
  getStatus: () => api.get('/screening/status'),
  getTenantStatus: (userId: string) => api.get(`/screening/tenant/${userId}`),
};

// ─── Roommates (F8) ───────────────────────────────────────────────────────────
export const roommateApi = {
  getProfile: () => api.get('/roommates/profile'),
  saveProfile: (data: {
    lookingForRoommate?: boolean;
    sleepSchedule?: 'early_bird' | 'night_owl' | 'flexible';
    cleanlinessLevel?: number;
    noiseLevel?: 'quiet' | 'moderate' | 'lively';
    guestsFrequency?: 'never' | 'rarely' | 'sometimes' | 'often';
    smokingAllowed?: boolean;
    petsAllowed?: boolean;
    workFromHome?: boolean;
    cities?: string[];
  }) => api.post('/roommates/profile', data),
  getMatches: () => api.get('/roommates/matches'),
};

// ─── Gamification (F13) ───────────────────────────────────────────────────────
export const gamificationApi = {
  getMe:       ()                    => api.get('/gamification/me'),
  awardPoints: (action: string)      => api.post('/gamification/award', { action }),
  leaderboard: ()                    => api.get('/gamification/leaderboard'),
};

// ─── Services Marketplace (F14) ──────────────────────────────────────────────
export const servicesApi = {
  list: (params?: { category?: string; city?: string; page?: number }) =>
    api.get('/services', { params }),
  create: (data: object) => api.post('/services', data),
  getById: (id: string) => api.get(`/services/${id}`),
  update: (id: string, data: object) => api.patch(`/services/${id}`, data),
  review: (id: string, rating: number, comment: string) =>
    api.post(`/services/${id}/review`, { rating, comment }),
};

// ─── IoT / Commercial Tenants (F15) ──────────────────────────────────────────
export const iotApi = {
  listDevices: (leaseId?: string) =>
    api.get('/iot/devices', { params: leaseId ? { leaseId } : {} }),
  registerDevice: (data: object) =>
    api.post('/iot/devices', data),
  updateDeviceStatus: (deviceId: string, status: string) =>
    api.patch(`/iot/devices/${deviceId}/status`, { status }),
  simulateAccess: (deviceId: string, action: string) =>
    api.post('/iot/access', { deviceId, action }),
  listTickets: (params?: { leaseId?: string; status?: string }) =>
    api.get('/iot/maintenance', { params }),
  createTicket: (data: object) =>
    api.post('/iot/maintenance', data),
  updateTicket: (id: string, data: object) =>
    api.patch(`/iot/maintenance/${id}`, data),
};

// ─── Token helpers ────────────────────────────────────────────────────────────
export const tokenStorage = {
  save: (token: string) => storage.setItemAsync(TOKEN_KEY, token),
  get: () => storage.getItemAsync(TOKEN_KEY),
  clear: () => storage.deleteItemAsync(TOKEN_KEY),
};

export default api;
