// Re-exports everything from api.ts so existing imports keep working.
// Add new API namespaces to api.ts (which uses @parenting/shared) — not here.
export {
  authApi,
  familiesApi,
  learningApi,
  calendarApi,
  momentsApi,
  chatApi,
  gamificationApi,
  profileApi,
  leaderboardApi,
  villageApi,
  modulesApi,
  insightsApi,
  aiApi,
} from './api.js';
