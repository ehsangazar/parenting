import type { AnyIconName } from '../components/icons/index.js';

/** Product feature icons (must reference keys defined in iconMap or Lucide). */
export const appAssetIcons = {
  academy: 'doodle_pencil_ruler',
  aiGuide: 'doodle_bot',
  calendar: 'doodle_calendar',
  courseB: 'doodle_book',
  gems: 'doodle_diamond',
  heart: 'doodle_heart',
  phaseProgress: 'doodle_dashboard',
  questStreak: 'doodle_fire',
} as const satisfies Record<string, AnyIconName>;
