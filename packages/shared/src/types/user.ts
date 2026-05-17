export interface Gamification {
  streak: number;
  longestStreak: number;
  coins: number;
  newlyUnlockedAchievements: string[];
}

export interface UserProfile {
  name?: string;
  avatarUrl?: string;
  onboarded?: boolean;
  childName?: string;
  dueDate?: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
  profile?: UserProfile;
  locale?: string;
  createdAt?: string;
  gamification?: Gamification;
}
