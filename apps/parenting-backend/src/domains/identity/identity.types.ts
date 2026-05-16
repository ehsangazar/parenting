export type UserRole = "user" | "admin";

export type UserProfile = {
  name?: string | null;
  avatarUrl?: string | null;
  onboarded?: boolean;
  roleInHousehold?: string | null;
  interests?: string[];
};

export type PublicUser = {
  id: string;
  email: string;
  role: string;
  profile: unknown;
  locale: string;
};

export type SignupResult =
  | { ok: true; user: PublicUser }
  | { ok: false; conflict: true };

export type LoginResult =
  | { ok: true; user: PublicUser }
  | { ok: false; unauthorized: true };
