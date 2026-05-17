import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppBase } from '../../hooks/useAppBase.js';
import { Fire, Coins } from '@phosphor-icons/react';
import { NotificationBell } from '../notifications/NotificationBell.js';
import { useAuth } from '../../state/auth.js';
import { Avatar } from '../ui/Avatar.js';
import { LanguageSwitcher } from '../LanguageSwitcher.js';
export const TopNav = () => {
  const { t } = useTranslation();
  const { toApp } = useAppBase();
  const { user } = useAuth();

  const profileName = user?.profile?.name || user?.email || t('topNav.profile');
  const avatarUrl = user?.profile?.avatarUrl;
  const streak = user?.gamification?.streak ?? 0;
  const coins = user?.gamification?.coins ?? 0;

  const coinsLabel = coins.toLocaleString();

  return (
    <header
      className="flex-shrink-0 border-b-2 border-border bg-surface lg:hidden"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <div className="flex items-center justify-between gap-2 px-4 pb-2.5 pt-1">
        {/* Gamification stats + language */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5"
            aria-label={t('topNav.streak')}
          >
            <Fire
              size={22}
              weight={streak > 0 ? 'fill' : 'regular'}
              className={streak > 0 ? 'text-gamification-streak' : 'text-text-tertiary'}
              aria-hidden
            />
            <span className={`text-sm font-black tabular-nums leading-none ${streak > 0 ? 'text-gamification-streak' : 'text-text-tertiary'}`}>
              {streak}
            </span>
          </div>

          <div
            className="flex items-center gap-1.5"
            aria-label={t('topNav.coins')}
          >
            <Coins
              size={22}
              weight="fill"
              className="text-amber-400"
              aria-hidden
            />
            <span className="text-sm font-black tabular-nums leading-none text-amber-400">
              {coinsLabel}
            </span>
          </div>

          <LanguageSwitcher />
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <NotificationBell />
          <Link
            to={toApp('/app/settings')}
            aria-label={t('topNav.openSettings')}
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border"
          >
            <Avatar src={avatarUrl} name={profileName} size="sm" className="!border-0" />
          </Link>
        </div>
      </div>
    </header>
  );
};
