import { Fire, Coins } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/auth.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { StatPill } from '../ui/StatPill.js';
/** Desktop-only top stats row (streak, coins). */
export const DesktopStatsBar = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const streak = user?.gamification?.streak ?? 0;
  const coins = user?.gamification?.coins ?? 0;
  const freezeActive = false; // TODO: read from profile endpoint

  const coinsLabel = coins.toLocaleString();

  return (
    <div className="hidden lg:flex shrink-0 items-center justify-end gap-2 border-b-2 border-border bg-surface px-6 py-2.5">

      <StatPill
        iconName={freezeActive ? appAssetIcons.freezeStreak : undefined}
        PhosphorIcon={freezeActive ? undefined : Fire}
        phosphorClassName={freezeActive ? undefined : 'text-gamification-streak'}
        value={streak}
        label={t('topNav.streak')}
        showLabel
        active={streak > 0}
      />
      <span className="mx-0.5 h-5 w-px bg-border-medium" aria-hidden />
      <StatPill
        PhosphorIcon={Coins}
        phosphorClassName="text-amber-400"
        value={coinsLabel}
        label={t('topNav.coins')}
        showLabel
        active={coins > 0}
      />
    </div>
  );
};
