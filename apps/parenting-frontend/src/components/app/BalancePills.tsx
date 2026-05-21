import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { gamificationApi } from '../../lib/appApi.js';
import { useAuth } from '../../state/auth.js';
import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';

type Profile = {
  coins: { balance: number };
  insight: { total: number; level: number };
  streak: { current: number };
};

const REFRESH_EVENT = 'parenting:gamification-refresh';

export function notifyGamificationChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(REFRESH_EVENT));
  }
}

function formatCompactNumber(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}k`.replace('.0', '');
  return `${(n / 1_000_000).toFixed(1)}M`.replace('.0', '');
}

export const BalancePills = ({ className }: { className?: string }) => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const data = await gamificationApi.getProfile();
        if (!cancelled) setProfile(data as Profile);
      } catch {
        // Non-critical, just hide pills.
      }
    };
    load();
    const onRefresh = () => load();
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(REFRESH_EVENT, onRefresh);
    };
  }, [token]);

  if (!token || !profile) return null;

  return (
    <div className={clsx('flex items-center gap-1.5', className)}>
      {profile.streak.current > 0 && (
        <span
          data-rough-skip="true"
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-extrabold text-gamification-streak"
          title={t('balance.streakTitle', '{{n}}-day streak', { n: profile.streak.current })}
        >
          <Icon name={uiIcons.flame} className="h-3 w-3 object-contain" alt="" />
          {profile.streak.current}
        </span>
      )}
      <span
        data-rough-skip="true"
        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-extrabold text-brand-blue"
        title={t('balance.insightTitle', '{{n}} Insight (Level {{level}})', {
          n: profile.insight.total,
          level: profile.insight.level,
        })}
      >
        <Icon name={uiIcons.sparkles} className="h-3 w-3 object-contain" alt="" />
        {profile.insight.total}
      </span>
      <span
        data-rough-skip="true"
        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-extrabold text-secondary-fg"
        title={t('balance.coinsTitle', '{{n}} coins', { n: profile.coins.balance })}
      >
        <Icon name={appAssetIcons.gems} className="h-3 w-3 object-contain" alt="" />
        {formatCompactNumber(profile.coins.balance)}
      </span>
    </div>
  );
};
