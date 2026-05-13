import { create } from 'zustand';
import { apartmentsApi, swipeApi } from '../services/api';
import type { Apartment, SwipeDirection } from '../types';

export interface FeedLoadError {
  status: number;
  message: string;
}

type FeedLoadState = 'pending' | 'loading' | 'success' | 'error';

interface SwipeState {
  deck: Apartment[];
  currentIndex: number;
  isLoading: boolean;
  /** Until the first feed request finishes, UI must not show the “seen everything” empty state. */
  feedLoadState: FeedLoadState;
  hasMore: boolean;
  lastMatch: { id: string; status: string } | null;
  lastSwipedApartment: Apartment | null;
  dailyUsed: number;
  dailyLimit: number;
  quotaExceeded: boolean;
  /** Set when GET /apartments/feed fails (e.g. 403); avoids showing “empty deck” as “seen everything”. */
  feedError: FeedLoadError | null;

  loadFeed: (params?: { city?: string; minPrice?: number; maxPrice?: number }) => Promise<void>;
  loadQuota: () => Promise<void>;
  clearFeedError: () => void;
  swipe: (apartment: Apartment, direction: SwipeDirection) => Promise<void>;
  undo: () => Promise<void>;
  resetMatch: () => void;
  dismissQuota: () => void;
}

export const useSwipeStore = create<SwipeState>((set, get) => ({
  deck: [],
  currentIndex: 0,
  isLoading: false,
  feedLoadState: 'pending',
  hasMore: true,
  lastMatch: null,
  lastSwipedApartment: null,
  dailyUsed: 0,
  dailyLimit: 20,
  quotaExceeded: false,
  feedError: null,

  clearFeedError: () => set({ feedError: null, feedLoadState: 'pending' }),

  loadFeed: async (params) => {
    set({ isLoading: true, feedError: null, feedLoadState: 'loading' });
    try {
      const res = await apartmentsApi.getFeed({ ...params, limit: 20 });
      set({
        deck: res.data.apartments,
        currentIndex: 0,
        hasMore: res.data.totalPages > 1,
        feedError: null,
        feedLoadState: 'success',
      });
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { error?: string } } };
      const status = ax.response?.status ?? 0;
      const raw = ax.response?.data?.error;
      const message =
        typeof raw === 'string' ? raw : ax.response?.statusText || 'Request failed';
      set({
        deck: [],
        currentIndex: 0,
        hasMore: false,
        feedError: { status, message },
        feedLoadState: 'error',
      });
    } finally {
      set({ isLoading: false });
    }
  },

  loadQuota: async () => {
    try {
      const res = await swipeApi.quota();
      const { used, limit, isPremium } = res.data;
      set({
        dailyUsed: used ?? 0,
        dailyLimit: limit ?? 20,
        quotaExceeded: !isPremium && used >= (limit ?? 20),
      });
    } catch { /* non-critical */ }
  },

  swipe: async (apartment, direction) => {
    const { currentIndex, dailyUsed, dailyLimit } = get();
    set({ currentIndex: currentIndex + 1, lastSwipedApartment: apartment });

    if (get().deck.length - get().currentIndex <= 3 && get().hasMore) {
      get().loadFeed();
    }

    try {
      const res = await swipeApi.record(apartment.id, direction, 0);
      const { match, dailyUsed: newUsed, dailyLimit: newLimit } = res.data;
      if (match) set({ lastMatch: match });
      if (newUsed !== null && newUsed !== undefined) {
        set({
          dailyUsed: newUsed,
          dailyLimit: newLimit ?? dailyLimit,
          quotaExceeded: newLimit !== null && newUsed >= newLimit,
        });
      } else {
        set({ dailyUsed: dailyUsed + 1 });
      }
    } catch (err: any) {
      if (err?.response?.status === 429) {
        set({ quotaExceeded: true, currentIndex: currentIndex }); // revert
      }
    }
  },

  undo: async () => {
    const { lastSwipedApartment, currentIndex, dailyUsed } = get();
    if (!lastSwipedApartment || currentIndex === 0) return;
    try {
      await swipeApi.undo();
      set({
        currentIndex: currentIndex - 1,
        lastSwipedApartment: null,
        dailyUsed: Math.max(0, dailyUsed - 1),
        quotaExceeded: false,
      });
    } catch { /* undo failed silently */ }
  },

  resetMatch: () => set({ lastMatch: null }),
  dismissQuota: () => set({ quotaExceeded: false }),
}));
