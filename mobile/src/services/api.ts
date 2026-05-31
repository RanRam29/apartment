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

const clientLogApi: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json', 'x-client-platform': Platform.OS },
});

// Attach JWT on every request
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await storage.getItemAsync(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['x-client-platform'] = Platform.OS;
  return config;
});

// On 401, clear token and redirect to auth
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config || {};
    const url = String(config.url || '');
    const shouldReport =
      !url.includes('/logs/client-event') &&
      !config.headers?.['x-client-log-no-report'];
    if (shouldReport) {
      try {
        const token = await storage.getItemAsync(TOKEN_KEY);
        if (token) {
          clientLogApi.defaults.headers.common.Authorization = `Bearer ${token}`;
        } else {
          delete clientLogApi.defaults.headers.common.Authorization;
        }
        await clientLogApi.post(
          '/logs/client-event',
          {
            level: error.response?.status >= 500 ? 'error' : 'warn',
            category: 'application',
            event: 'client.http.error',
            message: `HTTP request failed (${error.response?.status || 'network'})`,
            metadata: {
              method: config.method,
              url,
              status: error.response?.status || null,
            },
            tags: ['client', 'http'],
          },
          { headers: { 'x-client-log-no-report': '1' } }
        );
      } catch {
        // Swallow logging failures to avoid feedback loops.
      }
    }
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
  switchRole: (role: 'tenant' | 'landlord') => api.patch('/auth/switch-role', { role }),
};

// ─── Apartments ───────────────────────────────────────────────────────────────
export const apartmentsApi = {
  getFeed: (params?: { city?: string; minPrice?: number; maxPrice?: number; rooms?: number; page?: number; limit?: number }) =>
    api.get('/apartments/feed', { params }),
  getById: (id: string) => api.get(`/apartments/${id}`),
  create: (formData: FormData) =>
    api.post('/apartments', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: Partial<{
    title: string; description: string | null; price: number; rooms: number;
    floor: number | null; totalFloors: number | null; sizeSqm: number | null;
    city: string; street: string | null; neighborhood: string | null; address: string | null;
    amenities: string[]; petsAllowed: boolean; availableFrom: string | null;
    minLeasePeriod: number | null; isActive: boolean;
  }>) => api.patch(`/apartments/${id}`, data),
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
  /** multipart: matchId, monthlyRent, depositMonths, startDate, endDate, optional customClauses, file field `document` */
  uploadWithDocument: (formData: FormData) =>
    api.post('/contracts/upload', formData, { timeout: 120000 }),
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
  remove: (id: string) => api.delete(`/services/${id}`),
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

// ─── Admin Logs ───────────────────────────────────────────────────────────────
export const adminLogsApi = {
  getAudit: (params?: {
    actorId?: string;
    action?: string;
    resourceType?: string;
    outcome?: 'success' | 'failure';
    search?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/admin/logs/audit', { params }),
  getSystem: (params?: {
    severity?: 'debug' | 'info' | 'warn' | 'error' | 'critical';
    category?: 'application' | 'security' | 'integration' | 'performance';
    source?: 'mobile' | 'web' | 'socket' | 'api' | 'server' | 'client' | 'rate-limit';
    event?: string;
    actorId?: string;
    search?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/admin/logs/system', { params }),
  exportAuditCsv: () => api.get('/admin/logs/audit/export.csv', { responseType: 'text' as any }),
};

export const clientLogsApi = {
  event: (data: {
    level?: 'debug' | 'info' | 'warn' | 'error' | 'critical';
    category?: 'application' | 'security' | 'integration' | 'performance';
    event: string;
    message: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }) => api.post('/logs/client-event', data, { headers: { 'x-client-log-no-report': '1' } }),
};

// ─── CASCADE V3 APIs ────────────────────────────────────────────────────────
export const contractsV3Api = {
  upload: (formData: FormData) => api.post('/v3/contracts/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  get: (id: string) => api.get(`/v3/contracts/${id}`),
  updateFields: (id: string, fields: any) => api.patch(`/v3/contracts/${id}/fields`, fields),
  inviteTenant: (id: string, tenantUserId: string) => api.post(`/v3/contracts/${id}/invite-tenant`, { tenantUserId }),
  validate: (id: string) => api.get(`/v3/contracts/${id}/validate`),
  transition: (id: string, targetStatus: string) => api.post(`/v3/contracts/${id}/transition`, { targetStatus }),
  sign: (id: string) => api.post(`/v3/contracts/${id}/sign`),
  verifyOwnership: (id: string, choice: string) => api.post(`/v3/contracts/${id}/verify-ownership`, { choice }),
  uploadCheckinPhotos: (id: string, roomId: string, formData: FormData) => api.post(`/v3/contracts/${id}/checkin/${roomId}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  completeCheckin: (id: string) => api.post(`/v3/contracts/${id}/checkin/complete`),
  uploadCheckoutPhotos: (id: string, roomId: string, formData: FormData) => api.post(`/v3/contracts/${id}/checkout/${roomId}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  reviewCheckout: (id: string, data: any) => api.post(`/v3/contracts/${id}/checkout/review`, data),
  completeCheckout: (id: string) => api.post(`/v3/contracts/${id}/checkout/complete`),
  renew: (id: string, formData: FormData) => api.post(`/v3/contracts/${id}/renew`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  proposeAmendment: (id: string, field: string, newValue: any, reason: string) => api.post(`/v3/contracts/${id}/amend/propose`, { field, newValue, reason }),
  approveAmendment: (id: string, aId: string) => api.post(`/v3/contracts/${id}/amend/${aId}/approve`),
  rejectAmendment: (id: string, aId: string) => api.post(`/v3/contracts/${id}/amend/${aId}/reject`),
};

export const ledgerApi = {
  getForAgreement: (agreementId: string) => api.get(`/v3/ledger/agreement/${agreementId}`),
  reportPayment: (id: string, formData?: FormData) => formData ? api.post(`/v3/ledger/${id}/report`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }) : api.post(`/v3/ledger/${id}/report`),
  confirmPayment: (id: string) => api.post(`/v3/ledger/${id}/confirm`),
  rejectPayment: (id: string) => api.post(`/v3/ledger/${id}/reject`),
};

export const maintenanceApi = {
  create: (formData: FormData) => api.post('/v3/maintenance', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getForAgreement: (agreementId: string) => api.get(`/v3/maintenance/agreement/${agreementId}`),
  respond: (id: string, data: any) => api.post(`/v3/maintenance/${id}/respond`, data),
  close: (id: string) => api.post(`/v3/maintenance/${id}/close`),
};

export const kycApi = {
  initiate: () => api.post('/v3/kyc/initiate'),
  validateId: (idNumber: string) => api.post('/v3/kyc/validate-id', { idNumber }),
};

export const tosApi = {
  accept: () => api.post('/auth/accept-tos'),
};

export const tenantApi = {
  getJournal: () => api.get('/tenant/journal'),
};

export const renterJournalApi = {
  getJournal: (userId: string) => api.get(`/v3/renter-journal/${userId}`),
  updateProfile: (userId: string, data: { firstName?: string; lastName?: string; bio?: string; avatarUrl?: string }) => api.put(`/v3/renter-journal/${userId}`, data),
};

// ─── Token helpers ────────────────────────────────────────────────────────────
export const tokenStorage = {
  save: (token: string) => storage.setItemAsync(TOKEN_KEY, token),
  get: () => storage.getItemAsync(TOKEN_KEY),
  clear: () => storage.deleteItemAsync(TOKEN_KEY),
};

export default api;
