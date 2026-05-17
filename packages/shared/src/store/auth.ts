import { create } from 'zustand';
import type { User, Gamification } from '../types/user.js';

export interface StorageAdapter {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  updateGamification: (data: Partial<Gamification>) => void;
  isAdmin: () => boolean;
  isOnboarded: () => boolean;
  logout: () => void;
}

const DEFAULT_GAMIFICATION: Gamification = {
  streak: 0,
  longestStreak: 0,
  coins: 0,
  newlyUnlockedAchievements: [],
};

export function createAuthStore(storage: StorageAdapter) {
  return create<AuthState>((set, get) => ({
    token: null,
    user: null,
    isLoading: true,

    setToken: async (token) => {
      if (token) {
        await storage.setItem('token', token);
      } else {
        await storage.removeItem('token');
        await storage.removeItem('lastPath');
        set({ user: null });
      }
      set({ token });
    },

    setUser: (user) => set({ user }),

    updateGamification: (data) => {
      const { user } = get();
      if (!user) return;
      const existing = user.gamification ?? DEFAULT_GAMIFICATION;
      set({ user: { ...user, gamification: { ...existing, ...data } } });
    },

    isAdmin: () => get().user?.role === 'admin',

    isOnboarded: () => !!get().user?.profile?.onboarded,

    logout: async () => {
      await storage.removeItem('token');
      await storage.removeItem('lastPath');
      set({ token: null, user: null });
    },
  }));
}
