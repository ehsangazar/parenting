import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import {
  createApiClient,
  createAuthApi,
  createFamiliesApi,
  createLearningApi,
  createCalendarApi,
  createMomentsApi,
  createChatApi,
  createGamificationApi,
  createProfileApi,
  createLeaderboardApi,
  createVillageApi,
} from '@parenting/shared/api';

const BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:4000';

export const apiClient = createApiClient({
  baseURL: BASE_URL,
  getToken: () => {
    // SecureStore.getItemAsync is async, but interceptors run sync.
    // We store the token in memory after hydration and read it here.
    return tokenCache.current;
  },
  getLocale: () => 'en',
  onError: (error, status) => {
    if (status && status >= 500) {
      console.error('[API]', error);
    }
  },
});

// In-memory token mirror — populated once on app start from SecureStore.
export const tokenCache = {
  current: null as string | null,
  async hydrate() {
    this.current = await SecureStore.getItemAsync('token');
  },
  async set(token: string | null) {
    this.current = token;
    if (token) {
      await SecureStore.setItemAsync('token', token);
    } else {
      await SecureStore.deleteItemAsync('token');
    }
  },
};

export const authApi = createAuthApi(apiClient);
export const familiesApi = createFamiliesApi(apiClient);
export const learningApi = createLearningApi(apiClient);
export const calendarApi = createCalendarApi(apiClient);
export const momentsApi = createMomentsApi(apiClient);
export const chatApi = createChatApi(apiClient);
export const gamificationApi = createGamificationApi(apiClient);
export const profileApi = createProfileApi(apiClient);
export const leaderboardApi = createLeaderboardApi(apiClient);
export const villageApi = createVillageApi(apiClient);
