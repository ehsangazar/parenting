import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { gamificationApi } from '../../lib/appApi.js';
import { useAuth } from '../../state/auth.js';
import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { RoughBox } from '../rough/index.js';

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

const PILL_CLASS = 'inline-flex items-center gap-1 px-2 py-1 text-[11px] font-extrabold';

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
        <RoughBox
          stroke="#D77548"
          fill="rgba(215, 117, 72, 0.10)"
          fillStyle="solid"
          strokeWidth={1.4}
          radius={9999}
          roughness={1.2}
          seedKey={`streak-${profile.streak.current}`}
          className={PILL_CLASS}
          style={{ color: '#D77548' }}
          ariaLabel={t('balance.streakTitle', '{{n}}-day streak', { n: profile.streak.current })}
          innerClassName="inline-flex items-center gap-1"
        >
          <Icon name={uiIcons.flame} className="h-3 w-3 object-contain" alt="" />
          {profile.streak.current}
        </RoughBox>
      )}
      <RoughBox
        stroke="#4A8AB4"
        fill="rgba(74, 138, 180, 0.10)"
        fillStyle="solid"
        strokeWidth={1.4}
        radius={9999}
        roughness={1.2}
        seedKey={`insight-${profile.insight.level}`}
        className={PILL_CLASS}
        style={{ color: '#4A8AB4' }}
        ariaLabel={t('balance.insightTitle', '{{n}} Insight (Level {{level}})', {
          n: profile.insight.total,
          level: profile.insight.level,
        })}
        innerClassName="inline-flex items-center gap-1"
      >
        <Icon name={uiIcons.sparkles} className="h-3 w-3 object-contain" alt="" />
        {profile.insight.total}
      </RoughBox>
      <RoughBox
        stroke="#D87749"
        fill="rgba(216, 119, 73, 0.10)"
        fillStyle="solid"
        strokeWidth={1.4}
        radius={9999}
        roughness={1.2}
        seedKey="coins"
        className={PILL_CLASS}
        style={{ color: '#5C3211' }}
        ariaLabel={t('balance.coinsTitle', '{{n}} coins', { n: profile.coins.balance })}
        innerClassName="inline-flex items-center gap-1"
      >
        <Icon name={appAssetIcons.gems} className="h-3 w-3 object-contain" alt="" />
        {formatCompactNumber(profile.coins.balance)}
      </RoughBox>
    </div>
  );
};
