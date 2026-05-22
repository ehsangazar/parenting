import type { AnyIconName } from '../components/icons/index.js';

/** Maps achievement/API icon payloads (often emoji) to icon names. */
const ACHIEVEMENT_ICON_MAP: Record<string, AnyIconName> = {
  '🔥': 'doodle_fire',
  '📚': 'doodle_book',
  '🌳': 'doodle_tree',
  '👨‍👩‍👧': 'doodle_users',
  '⭐': 'doodle_star',
  '🔒': 'doodle_lock',
  '🏆': 'doodle_trophy',
  '💎': 'doodle_diamond',
  '❤️': 'doodle_heart',
  '🎉': 'doodle_sparkles',
  '📖': 'doodle_book_open',
  '🧩': 'doodle_puzzle',
  '💡': 'doodle_sparkles',
  '🎯': 'doodle_tick_circle',
  '🌟': 'doodle_star',
  '🔬': 'doodle_microscope',
  '🎨': 'doodle_pencil',
  '🏅': 'doodle_trophy',
  '🌱': 'doodle_plant',
  '🌿': 'doodle_plant',
  '🌸': 'doodle_heart',
  '✨': 'doodle_sparkles',
};

const FALLBACK: AnyIconName = 'doodle_star';

export function achievementIconFromEmoji(raw: string): AnyIconName {
  const k = raw.trim();
  return ACHIEVEMENT_ICON_MAP[k] ?? FALLBACK;
}

/** @deprecated Use achievementIconFromEmoji */
export const iconNameFromAchievementIcon = achievementIconFromEmoji;
