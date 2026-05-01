import { create } from 'zustand';
import { authApi, tokenStorage } from '../services/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

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
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const res = await authApi.login(email, password);
    const { token, user } = res.data;
    await tokenStorage.save(token);
    set({ user, token, isAuthenticated: true });
  },

  register: async (data) => {
    const res = await authApi.register(data);
    const { token, user } = res.data;
    await tokenStorage.save(token);
    set({ user, token, isAuthenticated: true });
  },

  logout: async () => {
    await authApi.logout().catch(() => {});
    await tokenStorage.clear();
    set({ user: null, token: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    try {
      const token = await tokenStorage.get();
      if (!token) return set({ isLoading: false });

      const res = await authApi.me();
      set({ user: res.data.user, token, isAuthenticated: true });
    } catch {
      await tokenStorage.clear();
    } finally {
      set({ isLoading: false });
    }
  },
}));
