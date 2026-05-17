import type {
  LeaderboardResponse,
  LeaderboardScope,
  LeaderboardMetric,
  LeaderboardPeriod,
  LeaderboardEntry,
} from '../types/leaderboard.js';

const AVATAR_COLORS = [
  '#C084FC', '#7B8FFF', '#FF9600', '#52D68C', '#FF6B6B',
  '#FF9F51', '#4CAF50', '#9C27B0', '#2196F3', '#FF5722',
];

const NAMES = [
  'Sarah', 'Emma', 'Priya', 'Lena', 'Amara',
  'Tom', 'James', 'Yuki', 'Fatima', 'Chloe',
  'Nia', 'Ravi', 'Sophie', 'Marco', 'Aisha',
  'Luke', 'Nina', 'Omar', 'Hana', 'David',
];


function scoreForMetric(metric: LeaderboardMetric, rank: number): { score: number; scoreLabel: string } {
  const base = Math.max(1, 20 - rank);
  switch (metric) {
    case 'xp': return { score: base * 47 + Math.floor(Math.random() * 30), scoreLabel: 'XP' };
    case 'streak': return { score: Math.max(1, base * 2 + Math.floor(Math.random() * 5)), scoreLabel: 'day streak' };
    case 'learning': return { score: Math.max(0, base + Math.floor(Math.random() * 3)), scoreLabel: 'lessons' };
    case 'community': return { score: Math.max(0, base * 2 + Math.floor(Math.random() * 8)), scoreLabel: 'contributions' };
  }
}

function buildEntries(
  count: number,
  metric: LeaderboardMetric,
  currentUserId: string,
  currentUserRank: number,
): LeaderboardEntry[] {
  const changes: LeaderboardEntry['change'][] = ['up', 'down', 'same', 'new', 'up', 'up', 'down', 'same'];
  return Array.from({ length: count }, (_, i) => {
    const rank = i + 1;
    const isCurrentUser = rank === currentUserRank;
    const { score, scoreLabel } = scoreForMetric(metric, rank);
    return {
      rank,
      userId: isCurrentUser ? currentUserId : `mock-user-${i}`,
      displayName: isCurrentUser ? 'You' : NAMES[i % NAMES.length],
      avatarUrl: undefined,
      score,
      scoreLabel,
      change: changes[i % changes.length],
      isCurrentUser,
    };
  });
}

export async function getMockLeaderboard(params: {
  scope: LeaderboardScope;
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  familyId?: string;
}): Promise<LeaderboardResponse> {
  await new Promise((r) => setTimeout(r, 600));

  const { scope, metric, period } = params;
  const currentUserId = 'current-user';
  const currentUserRank = scope === 'family' ? 2 : 8;
  const count = scope === 'family' ? 2 : 20;

  const entries = buildEntries(count, metric, currentUserId, currentUserRank);
  const currentUser = entries.find((e) => e.isCurrentUser) ?? entries[0];

  return {
    entries,
    currentUser,
    totalParticipants: scope === 'family' ? 2 : scope === 'village' ? 47 : 1284,
    scope,
    metric,
    period,
    updatedAt: new Date().toISOString(),
    userOptedIn: scope !== 'community',
  };
}

export { AVATAR_COLORS };
