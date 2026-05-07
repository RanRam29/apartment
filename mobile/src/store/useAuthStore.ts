import { create } from 'zustand';
import { authApi, tokenStorage } from '../services/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'tenant' | 'landlord';
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  updateUser: (updates: Partial<import('../types').User>) => void;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  needsOnboarding: false,

  login: async (email, password) => {
    const res = await authApi.login(email, password);
    const { token, user } = res.data;
    await tokenStorage.save(token);
    set({ user, token, isAuthenticated: true, needsOnboarding: false });
  },

  register: async (data) => {
    const res = await authApi.register(data);
    const { token, user } = res.data;
    await tokenStorage.save(token);
    set({ user, token, isAuthenticated: true, needsOnboarding: data.role === 'tenant' });
  },

  logout: async () => {
    await authApi.logout().catch(() => {});
    await tokenStorage.clear();
    set({ user: null, token: null, isAuthenticated: false, needsOnboarding: false });
  },

  restoreSession: async () => {
    try {
      const token = await tokenStorage.get();
      if (!token) return set({ isLoading: false });

      const res = await authApi.me();
      set({ user: res.data.user, token, isAuthenticated: true, needsOnboarding: false });
    } catch {
      await tokenStorage.clear();
    } finally {
      set({ isLoading: false });
    }
  },

  completeOnboarding: async () => {
    set({ needsOnboarding: false });
  },

  updateUser: (updates) => {
    set((state) => ({ user: state.user ? { ...state.user, ...updates } : state.user }));
  },

  verifyEmail: async (token) => {
    await authApi.verifyEmail(token);
    set((state) => ({ user: state.user ? { ...state.user, isVerified: true } : state.user }));
  },

  resendVerification: async () => {
    const email = useAuthStore.getState().user?.email;
    if (!email) return;
    await authApi.resendVerification(email);
  },
}));
