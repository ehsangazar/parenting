interface CommunityUserLike {
  id?: string | null;
  email?: string | null;
  profile?: {
    name?: string | null;
  } | null;
}

const hashSeed = (seed: string): number => {
  let hash = 7;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const getPublicAuthorName = (user?: CommunityUserLike | null): string => {
  const profileName = user?.profile?.name?.trim();
  if (profileName) return profileName;

  const seed = user?.id || user?.email || '';
  if (!seed) return 'User';

  const suffix = (hashSeed(seed) % 9000) + 1000;
  return `User #${suffix}`;
};

export const getInitials = (displayName: string): string => {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};
