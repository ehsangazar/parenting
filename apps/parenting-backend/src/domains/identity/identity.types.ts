export type UserRole = "user" | "admin";

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

export type UserProfile = {
  name?: string | null;
  avatarUrl?: string | null;
  onboarded?: boolean;
  roleInHousehold?: string | null;
  interests?: string[];
  notificationPrefs?: NotificationPrefs;
};

export type PublicUser = {
  id: string;
  email: string;
  role: string;
  profile: unknown;
  locale: string;
  hasPassword?: boolean;
};

export type SignupResult =
  | { ok: true; user: PublicUser }
  | { ok: false; conflict: true };

export type LoginResult =
  | { ok: true; user: PublicUser }
  | { ok: false; unauthorized: true };
