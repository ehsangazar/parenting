import type { AxiosInstance } from 'axios';
import type { LeaderboardScope, LeaderboardMetric, LeaderboardPeriod, LeaderboardResponse } from '../types/leaderboard.js';

function normalizeDateInput(value?: string): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`).toISOString();
  }
  return value;
}

export function createFamiliesApi(api: AxiosInstance) {
  return {
    list: async () => (await api.get('/api/families')).data,
    get: async (id: string) => (await api.get(`/api/families/${id}`)).data,
    create: async (name: string) => (await api.post('/api/families', { name })).data,
    update: async (id: string, data: {
      name?: string;
      modules?: {
        welcome?: boolean; children?: boolean; insights?: boolean;
        calendar?: boolean; moments?: boolean; village?: boolean; ai?: boolean;
      };
    }) => (await api.put(`/api/families/${id}`, data)).data,
    delete: async (id: string) => (await api.delete(`/api/families/${id}`)).data,
    listMembers: async (familyId: string) => (await api.get(`/api/families/${familyId}/members`)).data,
    addMember: async (familyId: string, payload: Record<string, unknown>) =>
      (await api.post(`/api/families/${familyId}/members`, {
        ...payload,
        birthday: normalizeDateInput(payload?.birthday as string),
      })).data,
    inviteMember: async (familyId: string, email: string) =>
      (await api.post(`/api/families/${familyId}/invite`, { email })).data,
    updateMember: async (familyId: string, memberId: string, payload: Record<string, unknown>) =>
      (await api.put(`/api/families/${familyId}/members/${memberId}`, {
        ...payload,
        birthday: normalizeDateInput(payload?.birthday as string),
      })).data,
    removeMember: async (familyId: string, memberId: string) =>
      (await api.delete(`/api/families/${familyId}/members/${memberId}`)).data,
    listChildren: async (familyId: string) => (await api.get(`/api/families/${familyId}/children`)).data,
    addChild: async (familyId: string, payload: Record<string, unknown>) =>
      (await api.post(`/api/families/${familyId}/children`, {
        ...payload,
        birthday: normalizeDateInput(payload?.birthday as string),
        dueDate: normalizeDateInput(payload?.dueDate as string),
      })).data,
    updateChild: async (familyId: string, childId: string, payload: Record<string, unknown>) =>
      (await api.put(`/api/families/${familyId}/children/${childId}`, {
        ...payload,
        birthday: normalizeDateInput(payload?.birthday as string),
        dueDate: normalizeDateInput(payload?.dueDate as string),
      })).data,
    deleteChild: async (familyId: string, childId: string) =>
      (await api.delete(`/api/families/${familyId}/children/${childId}`)).data,
  };
}

export function createLearningApi(api: AxiosInstance) {
  return {
    getCourses: async () => (await api.get('/api/courses')).data,
    getCourse: async (courseId: string) => (await api.get(`/api/courses/${courseId}`)).data,
    getCourseModules: async (courseId: string) =>
      (await api.get(`/api/courses/${courseId}/modules`)).data,
    getLessons: async (courseId: string, moduleId: string) =>
      (await api.get(`/api/courses/${courseId}/modules/${moduleId}/lessons`)).data,
    getLesson: async (courseId: string, moduleId: string, lessonId: string) =>
      (await api.get(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`)).data,
    completeLesson: async (courseId: string, moduleId: string, lessonId: string) =>
      (await api.post(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/complete`)).data as {
        coinsAwarded?: number;
        insightAwarded?: number;
        nextLesson?: { id: string; title: string } | null;
      },
    getResumeTarget: async () => (await api.get('/api/resume')).data as {
      target: {
        courseId: string;
        courseTitle: string | null;
        moduleId: string;
        moduleTitle: string | null;
        lessonId: string;
        lessonTitle: string | null;
        lessonOrder: number;
        totalLessonsInModule: number;
        completedLessonsInModule: number;
        isFreshStart: boolean;
      } | null;
    },
    getToday: async () => (await api.get('/api/today')).data as {
      today:
        | {
            kind: 'reflect';
            practiceId: string;
            lessonId: string;
            lessonTitle: string;
            courseId: string | null;
            moduleId: string | null;
            technique: string;
            childName: string | null;
            pledgedAt: string;
            hoursAgo: number;
          }
        | {
            kind: 'repeat';
            basedOnPracticeId: string;
            lessonId: string;
            lessonTitle: string;
            courseId: string | null;
            moduleId: string | null;
            technique: string;
            childName: string | null;
            childId: string | null;
            reflectedAt: string;
          }
        | {
            kind: 'resume';
            courseId: string;
            moduleId: string;
            lessonId: string;
            lessonTitle: string | null;
            isFreshStart: boolean;
          }
        | null;
    },
    pledgePractice: async (
      lessonId: string,
      payload: { technique: string; childId?: string | null },
    ) =>
      (await api.post(`/api/lessons/${lessonId}/practice`, payload)).data as {
        practice: {
          id: string;
          lessonId: string;
          childId: string | null;
          technique: string;
          pledgedAt: string;
          dueAt: string;
        };
        insightAwarded: number;
      },
    getPendingPractices: async () =>
      (await api.get('/api/practice/pending')).data as {
        practices: Array<{
          id: string;
          lessonId: string;
          lessonTitle: string;
          courseId: string | null;
          courseTitle: string | null;
          technique: string;
          childId: string | null;
          childName: string | null;
          pledgedAt: string;
          dueAt: string;
          overdueHours: number;
        }>;
      },
    reflectPractice: async (
      practiceId: string,
      payload: { outcome: 'worked' | 'mixed' | 'didnt_work'; note?: string },
    ) =>
      (await api.post(`/api/practice/${practiceId}/reflect`, payload)).data as {
        practice: {
          id: string;
          reflectionOutcome: string | null;
          reflectionNote: string | null;
          reflectedAt: string | null;
        };
        coinsAwarded: number;
        insightAwarded: number;
      },
    dismissPractice: async (practiceId: string) =>
      (await api.delete(`/api/practice/${practiceId}`)).data as { success: boolean },
    getPracticeRecap: async (days = 7) =>
      (await api.get(`/api/practice/recap`, { params: { days } })).data as {
        recap: {
          windowStart: string;
          windowEnd: string;
          pledgesMade: number;
          reflectionsLogged: number;
          outcomes: { worked: number; mixed: number; didnt_work: number };
          entries: Array<{
            practiceId: string;
            lessonId: string;
            lessonTitle: string;
            courseId: string | null;
            courseTitle: string | null;
            technique: string;
            childName: string | null;
            outcome: 'worked' | 'mixed' | 'didnt_work' | null;
            note: string | null;
            pledgedAt: string;
            reflectedAt: string | null;
          }>;
        };
      },
  };
}

export function createCalendarApi(api: AxiosInstance) {
  return {
    listEvents: async (familyId: string) => (await api.get(`/api/families/${familyId}/events`)).data,
    getUpcomingEvents: async (familyId: string) => (await api.get(`/api/families/${familyId}/events/upcoming`)).data,
    createEvent: async (familyId: string, payload: unknown) =>
      (await api.post(`/api/families/${familyId}/events`, payload)).data,
    updateEvent: async (familyId: string, eventId: string, payload: unknown) =>
      (await api.put(`/api/families/${familyId}/events/${eventId}`, payload)).data,
    deleteEvent: async (familyId: string, eventId: string) =>
      (await api.delete(`/api/families/${familyId}/events/${eventId}`)).data,
    createFeedToken: async (familyId: string) =>
      (await api.post(`/api/families/${familyId}/calendar/feed-token`)).data as {
        url: string;
        webcalUrl: string;
        token: string;
      },
    getEventIcs: async (familyId: string, eventId: string) =>
      (await api.get(`/api/families/${familyId}/events/${eventId}.ics`, {
        responseType: 'text',
        transformResponse: [(d) => d],
      })).data as string,
    parseEvent: async (
      familyId: string,
      payload: {
        text: string;
        now?: string;
        tzOffsetMinutes?: number | null;
        existingEvent?: Record<string, unknown> | null;
      },
    ) =>
      (await api.post(`/api/families/${familyId}/calendar/parse-event`, payload))
        .data as {
        draft: {
          childId: string | null;
          title: string | null;
          eventType:
            | 'appointment'
            | 'milestone'
            | 'activity'
            | 'reminder'
            | 'other'
            | null;
          startDate: string | null;
          endDate: string | null;
          allDay: boolean | null;
          location: string | null;
          description: string | null;
          repeatRule: {
            type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekdays';
            interval: number;
            endDate?: string | null;
            count?: number | null;
            daysOfWeek?: number[] | null;
          } | null;
          notes: string | null;
        };
      },
  };
}

export function createMomentsApi(api: AxiosInstance) {
  return {
    list: async (familyId: string, params?: unknown) =>
      (await api.get(`/api/moments/families/${familyId}/moments`, { params })).data,
    get: async (familyId: string, momentId: string) =>
      (await api.get(`/api/moments/families/${familyId}/moments/${momentId}`)).data,
    create: async (familyId: string, payload: unknown) =>
      (await api.post(`/api/moments/families/${familyId}/moments`, payload)).data,
    update: async (familyId: string, momentId: string, payload: unknown) =>
      (await api.put(`/api/moments/families/${familyId}/moments/${momentId}`, payload)).data,
    delete: async (familyId: string, momentId: string) =>
      (await api.delete(`/api/moments/families/${familyId}/moments/${momentId}`)).data,
    presign: async (familyId: string, payload: { contentType: string; contentLength: number }) =>
      (await api.post(`/api/moments/families/${familyId}/moments/presign`, payload)).data,
    addMedia: async (familyId: string, momentId: string, payload: unknown) =>
      (await api.post(`/api/moments/families/${familyId}/moments/${momentId}/media`, payload)).data,
  };
}

export function createChatApi(api: AxiosInstance) {
  return {
    listConversations: async (limit = 20, offset = 0) =>
      (await api.get('/api/conversations', { params: { limit, offset } })).data,
    createConversation: async () => (await api.post('/api/conversations')).data,
    getMessages: async (conversationId: string) =>
      (await api.get(`/api/conversations/${conversationId}/messages`)).data,
    deleteConversation: async (conversationId: string) =>
      (await api.delete(`/api/conversations/${conversationId}`)).data,
    importGuestConversation: async (payload: {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      locale?: string;
    }): Promise<{ conversationId: string }> =>
      (await api.post('/api/conversations/import-guest', payload)).data,
  };
}

export function createGamificationApi(api: AxiosInstance) {
  return {
    getProfile: async () => (await api.get('/api/gamification/profile')).data,
    getAchievements: async () => (await api.get('/api/gamification/achievements')).data,
    getQuests: async () => (await api.get('/api/gamification/quests')).data,
    buyStreakFreeze: async () => (await api.post('/api/gamification/streak-freeze')).data,
  };
}

export type NotificationPrefs = {
  channels: { push: boolean; email: boolean };
  topics: {
    dailyTip: boolean;
    weeklyRecap: boolean;
    courseReminders: boolean;
    calendarReminders: boolean;
    marketing: boolean;
  };
  quietHours: { enabled: boolean; start: string; end: string };
};

export function createProfileApi(api: AxiosInstance) {
  return {
    update: async (data: {
      name?: string;
      avatarUrl?: string;
      locale?: string;
      notificationPrefs?: NotificationPrefs;
      timeZone?: string;
    }) => (await api.put('/api/identity/me', data)).data,
    getAvatarUploadUrl: async (contentType: string, contentLength: number) =>
      (await api.get('/api/identity/me/avatar-upload-url', { params: { contentType, contentLength } })).data,
    deleteAccount: async () => (await api.delete('/api/identity/me')).data,
    changePassword: async (data: { currentPassword: string; newPassword: string }) =>
      (await api.put('/api/identity/me/password', data)).data,
  };
}

export function createLeaderboardApi(api: AxiosInstance) {
  return {
    getLeaderboard: async (params: {
      scope: LeaderboardScope;
      metric: LeaderboardMetric;
      period: LeaderboardPeriod;
      familyId?: string;
    }): Promise<LeaderboardResponse> => {
      const res = await api.get('/api/leaderboard', { params });
      return res.data;
    },
    updatePrivacy: async (optIn: boolean) =>
      (await api.put('/api/leaderboard/me/opt-in', { optIn })).data,
  };
}

export function createVillageApi(api: AxiosInstance) {
  return {
    listPosts: async (params?: unknown) => (await api.get('/api/village/posts', { params })).data,
    createPost: async (payload: unknown) => (await api.post('/api/village/posts', payload)).data,
    getPost: async (postId: string) => (await api.get(`/api/village/posts/${postId}`)).data,
    getPostComments: async (postId: string) => (await api.get(`/api/village/posts/${postId}/comments`)).data,
    addComment: async (postId: string, content: string, parentCommentId?: string) =>
      (await api.post(`/api/village/posts/${postId}/comments`, { content, parentCommentId })).data,
    addReaction: async (postId: string, reactionType?: string) =>
      (await api.post(`/api/village/posts/${postId}/reactions`, { reactionType })).data,
    listCategories: async () => (await api.get('/api/village/categories')).data,
  };
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface SendTestPushResult {
  sent: number;
  removed: number;
  skipped: string | null;
}

export function createNotificationsApi(api: AxiosInstance) {
  return {
    getConfig: async () =>
      (await api.get('/api/notifications/push/config')).data as { enabled: boolean; publicKey: string },
    subscribe: async (data: {
      subscription: PushSubscriptionPayload;
      userAgent?: string;
      timeZone?: string;
    }) => (await api.post('/api/notifications/push/subscribe', data)).data,
    unsubscribe: async (endpoint: string) =>
      (await api.post('/api/notifications/push/unsubscribe', { endpoint })).data,
    sendTest: async (data?: { title?: string; body?: string }) =>
      (await api.post('/api/notifications/push/test', data ?? {})).data as SendTestPushResult,
  };
}

export function createAuthApi(api: AxiosInstance) {
  return {
    login: async (email: string, password: string) =>
      (await api.post('/api/identity/login', { email, password })).data,
    register: async (email: string, password: string, name?: string) =>
      (await api.post('/api/identity/signup', { email, password, name })).data,
    me: async () => (await api.get('/api/identity/me')).data,
    // No server-side logout endpoint: JWTs are stateless, so callers
    // discard the token client-side. Kept for API-shape compatibility.
    logout: async () => ({ ok: true as const }),
    forgotPassword: async (email: string) =>
      (await api.post('/api/identity/reset-request', { email })).data,
    resetPassword: async (token: string, password: string) =>
      (await api.post('/api/identity/reset', { token, newPassword: password })).data,
  };
}
