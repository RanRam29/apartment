import { create } from 'zustand';
import { apartmentsApi, swipeApi } from '../services/api';
import type { Apartment, SwipeDirection } from '../types';

interface SwipeState {
  deck: Apartment[];
  currentIndex: number;
  isLoading: boolean;
  hasMore: boolean;
  lastMatch: { id: string; status: string } | null;

  loadFeed: (params?: { city?: string; minPrice?: number; maxPrice?: number }) => Promise<void>;
  swipe: (apartment: Apartment, direction: SwipeDirection) => Promise<void>;
  resetMatch: () => void;
}

export const useSwipeStore = create<SwipeState>((set, get) => ({
  deck: [],
  currentIndex: 0,
  isLoading: false,
  hasMore: true,
  lastMatch: null,

  loadFeed: async (params) => {
    set({ isLoading: true });
    try {
      const res = await apartmentsApi.getFeed({ ...params, limit: 20 });
      set({
        deck: res.data.apartments,
        currentIndex: 0,
        hasMore: res.data.totalPages > 1,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  swipe: async (apartment, direction) => {
    const { deck, currentIndex } = get();

    // Advance deck immediately for snappy UX
    set({ currentIndex: currentIndex + 1 });

    // Preload more when 3 cards remain
    if (deck.length - currentIndex <= 3 && get().hasMore) {
      get().loadFeed();
    }

    try {
      const seenMs = 0; // tracked in SwipeableCard if needed
      const res = await swipeApi.record(apartment.id, direction, seenMs);
      if (res.data.match) {
        set({ lastMatch: res.data.match });
      }
    } catch {
      // Swipe failures are non-critical — don't revert the card
    }
  },

  resetMatch: () => set({ lastMatch: null }),
}));
