import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'auth_token';

const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear token and redirect to auth
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
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
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// ─── Apartments ───────────────────────────────────────────────────────────────
export const apartmentsApi = {
  getFeed: (params?: { city?: string; minPrice?: number; maxPrice?: number; rooms?: number; page?: number }) =>
    api.get('/apartments/feed', { params }),
  getById: (id: string) => api.get(`/apartments/${id}`),
  create: (formData: FormData) =>
    api.post('/apartments', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: Partial<{ title: string; price: number; isActive: boolean; description: string }>) =>
    api.patch(`/apartments/${id}`, data),
  deactivate: (id: string) => api.delete(`/apartments/${id}`),
};

// ─── Swipe ────────────────────────────────────────────────────────────────────
export const swipeApi = {
  record: (apartmentId: string, direction: 'like' | 'dislike' | 'superlike', seenDurationMs?: number) =>
    api.post('/swipe', { apartmentId, direction, seenDurationMs }),
  history: () => api.get('/swipe/history'),
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
  nlpSearch: (query: string) => api.post('/recommendations/search', { query }),
  personalized: () => api.get('/recommendations/personalized'),
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
};

// ─── Token helpers ────────────────────────────────────────────────────────────
export const tokenStorage = {
  save: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

export default api;
