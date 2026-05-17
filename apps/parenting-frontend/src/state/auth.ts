import { createAuthStore } from '@parenting/shared/store';
import type { Gamification } from '@parenting/shared/types';

// Re-export types so existing imports keep working
export type { Gamification };
export type { User } from '@parenting/shared/types';

const localStorageAdapter = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    if (key === 'token') localStorage.removeItem('lastPath');
  },
};

export const useAuth = createAuthStore(localStorageAdapter);

// Hydrate token synchronously from localStorage on startup
const stored = localStorage.getItem('token');
if (stored) {
  useAuth.setState({ token: stored, isLoading: false });
} else {
  useAuth.setState({ isLoading: false });
}
