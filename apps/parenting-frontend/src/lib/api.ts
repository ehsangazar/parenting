import * as Sentry from '@sentry/react';
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
  createNotificationsApi,
} from '@parenting/shared/api';
import { useAuth } from '../state/auth.js';
import i18n from '../i18n.js';

export const api = createApiClient({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  getToken: () => useAuth.getState().token,
  getLocale: () => i18n.language ?? 'en',
  onError: (error, status) => {
    const isServerOrNetworkError = !status || status >= 500;
    if (isServerOrNetworkError) Sentry.captureException(error);
  },
});

// Keep withCredentials for web cookie support
api.defaults.withCredentials = true;

export function parseApiError(err: unknown, fallback = 'Something went wrong'): string {
  type ZodIssue = { message: string; path: (string | number)[] };
  type ApiErrorData = { message?: string; error?: string; issues?: ZodIssue[] };
  const axiosErr = err as { response?: { data?: ApiErrorData } };
  const data = axiosErr?.response?.data;
  if (data?.issues?.length) return data.issues.map((i) => i.message).join('. ');
  return data?.message || data?.error || fallback;
}

// All API namespaces — consumed directly or re-exported via appApi.ts
export const authApi = createAuthApi(api);
export const familiesApi = createFamiliesApi(api);
export const learningApi = createLearningApi(api);
export const calendarApi = createCalendarApi(api);
export const momentsApi = createMomentsApi(api);
export const chatApi = createChatApi(api);
export const gamificationApi = createGamificationApi(api);
export const profileApi = createProfileApi(api);
export const leaderboardApi = createLeaderboardApi(api);
export const villageApi = createVillageApi(api);
export const notificationsApi = createNotificationsApi(api);
