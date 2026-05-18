import type { LeaderboardEntry } from '../types/leaderboard.js';

/** True if this URL is already an S3 presigned GET (has SigV4 query params). */
export function isPresignedS3GetUrl(url: string): boolean {
  return /\bX-Amz-Algorithm=AWS4-HMAC-SHA256\b/.test(url) || /\bX-Amz-Signature=/.test(url);
}

/**
 * Prefer `/api/identity/me` avatar (signed). If missing, use leaderboard entry only when it
 * already looks presigned — never pass a raw private S3 URL to `<img>`.
 */
export function resolveMyRankAvatarSrc(
  meSignedAvatarUrl: string | null | undefined,
  entryAvatarUrl: string | undefined,
): string | undefined {
  if (meSignedAvatarUrl) return meSignedAvatarUrl;
  if (entryAvatarUrl && isPresignedS3GetUrl(entryAvatarUrl)) return entryAvatarUrl;
  if (entryAvatarUrl && !entryAvatarUrl.includes('.amazonaws.com')) return entryAvatarUrl;
  return undefined;
}

/** Podium / list row: same rules for the current user; others use API `avatarUrl` (should be signed by backend). */
export function resolveLeaderboardEntryAvatarSrc(
  entry: LeaderboardEntry,
  meSignedAvatarUrl: string | null | undefined,
): string | undefined {
  if (entry.isCurrentUser) {
    return resolveMyRankAvatarSrc(meSignedAvatarUrl, entry.avatarUrl);
  }
  return entry.avatarUrl;
}
