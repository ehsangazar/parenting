export type LeaderboardScope = 'community' | 'village' | 'family';
export type LeaderboardMetric = 'xp' | 'streak' | 'learning' | 'community';
export type LeaderboardPeriod = 'week' | 'month' | 'alltime';
export type LeaderboardChange = 'up' | 'down' | 'same' | 'new';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  level?: number;
  levelName?: string;
  score: number;
  scoreLabel: string;
  change?: LeaderboardChange;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUser: LeaderboardEntry;
  totalParticipants: number;
  scope: LeaderboardScope;
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  updatedAt: string;
  userOptedIn: boolean;
}
