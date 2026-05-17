import * as SecureStore from 'expo-secure-store';
import { createAuthStore } from '@parenting/shared/store';
import { tokenCache } from './api';

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
    if (key === 'token') tokenCache.current = value;
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
    if (key === 'token') tokenCache.current = null;
  },
};

export const useAuth = createAuthStore(secureStoreAdapter);
