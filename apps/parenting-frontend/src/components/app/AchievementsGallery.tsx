import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { gamificationApi } from '../../lib/appApi.js';
import { achievementIconFromEmoji } from '../../lib/achievementIconMap.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { Icon, type IconName } from '../icons/index.js';

type AchievementItem = {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  gemsReward: number;
  category: string;
  isSecret: boolean;
  earned: boolean;
  earnedAt: string | null;
};

const CATEGORY_TAB_ICONS: Record<string, IconName> = {
  all: 'list',
  streak: 'positive_dynamic',
  learning: 'reading_ebook',
  community: 'tree_structure',
  family: 'organization',
  milestone: 'rating',
};

export const AchievementsGallery = () => {
  const { t } = useTranslation();
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    gamificationApi.getAchievements()
      .then((data) => setAchievements(data.achievements ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = ['all', ...Array.from(new Set(achievements.map((a) => a.category)))];
  const filtered = activeCategory === 'all' ? achievements : achievements.filter((a) => a.category === activeCategory);
  const earnedCount = achievements.filter((a) => a.earned).length;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-surface p-4 h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{t('gamification.achievements')}</h3>
        <span className="text-xs text-text-dimmed">{earnedCount}/{achievements.length} {t('gamification.achieved')}</span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => {
          const iconName = CATEGORY_TAB_ICONS[cat];
          const label = t(`achievementCategory.${cat}`, { defaultValue: cat });
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                activeCategory === cat
                  ? 'bg-primary-500 text-text-inverse'
                  : 'bg-surface text-text-secondary hover:bg-surface-light'
              }`}
            >
              {iconName ? (
                <>
                  <Icon name={iconName} className="h-3.5 w-3.5 object-contain" alt="" />
                  {label}
                </>
              ) : (
                label
              )}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((a) => {
          const iconName: IconName = a.isSecret && !a.earned ? 'lock' : achievementIconFromEmoji(a.icon);
          return (
            <div
              key={a.key}
              className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                a.earned
                  ? 'border-primary-500/30 bg-primary-500/5'
                  : 'border-[#E0E7FF] bg-surface opacity-60'
              }`}
            >
              <Icon name={iconName} className={`h-10 w-10 object-contain ${a.earned ? '' : 'grayscale'}`} alt="" />
              <div>
                <p className={`text-xs font-bold ${a.earned ? 'text-white' : 'text-text-dimmed'}`}>
                  {a.isSecret && !a.earned ? '???' : a.title}
                </p>
                {a.earned && a.earnedAt && (
                  <p className="mt-0.5 text-xs text-text-dimmed">
                    {format(new Date(a.earnedAt), 'MMM d, yyyy')}
                  </p>
                )}
                {!a.earned && !a.isSecret && (
                  <p className="mt-0.5 text-xs text-text-dimmed line-clamp-2">{a.description}</p>
                )}
              </div>
              {a.earned && (a.xpReward > 0 || a.gemsReward > 0) && (
                <div className="flex gap-1">
                  {a.xpReward > 0 && (
                    <span className="rounded-full bg-[#FFD700]/10 px-1.5 py-0.5 text-xs font-bold text-[#FFD700]">+{a.xpReward}XP</span>
                  )}
                  {a.gemsReward > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-[#7B8FFF]/10 px-1.5 py-0.5 text-xs font-bold text-[#7B8FFF]">
                      +{a.gemsReward}
                      <Icon name={appAssetIcons.gems} className="h-3 w-3 object-contain" alt="" />
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
