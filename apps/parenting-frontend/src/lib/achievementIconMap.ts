import type { IconName } from '../components/icons/index.js';

/** Maps achievement/API icon payloads (often emoji) to raster icon keys. */
const ACHIEVEMENT_ICON_MAP: Record<string, IconName> = {
  '🔥': 'positive_dynamic',
  '📚': 'reading_ebook',
  '🌳': 'tree_structure',
  '👨‍👩‍👧': 'organization',
  '⭐': 'rating',
  '🔒': 'lock',
  '🏆': 'diploma_1',
  '💎': 'crystal_oscillator',
  '❤️': 'like',
  '🎉': 'approval',
  '📖': 'reading_ebook',
  '🧩': 'puzzle',
  '💡': 'idea',
  '🎯': 'approval',
  '🌟': 'rating',
  '🔬': 'biotech',
  '🎨': 'cloth',
  '🏅': 'vip',
  '🌱': 'biomass',
  '🌿': 'biomass',
  '🌸': 'approval',
  '✨': 'idea',
};

const FALLBACK: IconName = 'approval';

export function achievementIconFromEmoji(raw: string): IconName {
  const k = raw.trim();
  return ACHIEVEMENT_ICON_MAP[k] ?? FALLBACK;
}

/** @deprecated Use achievementIconFromEmoji */
export const iconNameFromAchievementIcon = achievementIconFromEmoji;
