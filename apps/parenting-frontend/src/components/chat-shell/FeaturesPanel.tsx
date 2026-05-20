import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useAuth } from '../../state/auth.js';
import { Icon, type IconName } from '../icons/index.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { BalancePills } from '../app/BalancePills.js';

type Feature = {
  to: string;
  tKey: string;
  fallback: string;
  iconName: IconName;
  accent: string;
};

const ABOUT_LINKS: Array<{ to: string; tKey: string; fallback: string }> = [
  { to: '/about', tKey: 'home.nav.about', fallback: 'About' },
  { to: '/mission', tKey: 'home.nav.mission', fallback: 'Mission' },
  { to: '/features', tKey: 'home.nav.features', fallback: 'Features' },
  { to: '/privacy', tKey: 'home.footer.privacyPolicy', fallback: 'Privacy policy' },
  { to: '/terms', tKey: 'home.footer.termsOfService', fallback: 'Terms of service' },
  { to: '/cookies', tKey: 'home.footer.cookiePolicy', fallback: 'Cookie policy' },
  { to: '/safeguarding', tKey: 'home.footer.safeguarding', fallback: 'Safeguarding' },
];

const FEATURES: Feature[] = [
  {
    to: '/calendar',
    tKey: 'nav.calendar',
    fallback: 'Calendar',
    iconName: appAssetIcons.calendar,
    accent: 'bg-brand-blue/15 text-brand-blue',
  },
  {
    to: '/academy',
    tKey: 'nav.academy',
    fallback: 'Academy',
    iconName: appAssetIcons.academy,
    accent: 'bg-brand-pink/15 text-brand-pink',
  },
];

/**
 * Right column: shortcuts to the main features (Insights, Academy, Settings).
 * Logged-out users see the same panel, but clicking any feature routes them
 * through the login flow first.
 */
export const FeaturesPanel = ({ onClose }: { onClose?: () => void }) => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleClick = (e: React.MouseEvent, to: string) => {
    if (!token) {
      e.preventDefault();
      navigate(`/login?next=${encodeURIComponent(to)}`);
      onClose?.();
      return;
    }
    onClose?.();
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
        <span className="font-heading text-[16px] font-bold text-text-primary">
          {t('chatShell.tools', 'Tools')}
        </span>
        <BalancePills />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-light"
          >
            <Icon name={uiIcons.close} className="h-4 w-4 object-contain" alt="" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {FEATURES.map((feature) => (
          <NavLink
            key={feature.to}
            to={feature.to}
            onClick={(e) => handleClick(e, feature.to)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                isActive
                  ? 'border-brand-blue/50 bg-brand-blue/10'
                  : 'border-border bg-surface hover:border-brand-blue/30 hover:bg-surface-light',
              )
            }
          >
            <span className={clsx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg', feature.accent)}>
              <Icon name={feature.iconName} className="h-5 w-5 object-contain" alt="" />
            </span>
            <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-text-primary">
              {t(feature.tKey, feature.fallback)}
            </p>
            <Icon
              name={uiIcons.chevronRight}
              className="h-4 w-4 flex-shrink-0 object-contain opacity-50"
              alt=""
            />
          </NavLink>
        ))}

        {!token && (
          <div className="mt-4 rounded-2xl bg-surface-light p-4 text-center">
            <p className="text-[14px] font-semibold text-text-primary">
              {t('chatShell.unlockTools', 'Sign in to unlock your tools')}
            </p>
            <button
              type="button"
              onClick={() => {
                navigate('/login');
                onClose?.();
              }}
              className="mt-3 w-full rounded-xl bg-primary-500 px-3 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-primary-600 min-h-[44px]"
            >
              {t('home.nav.signIn', 'Sign in')}
            </button>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-border px-3 py-3">
        <button
          type="button"
          onClick={() => setAboutOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] font-semibold text-text-secondary hover:bg-surface-light"
          aria-expanded={aboutOpen}
        >
          <span>{t('chatShell.aboutAndLegal', 'About & legal')}</span>
          <Icon
            name={aboutOpen ? uiIcons.chevronUp : uiIcons.chevronDown}
            className="h-3.5 w-3.5 object-contain opacity-70"
            alt=""
          />
        </button>

        {aboutOpen && (
          <div className="mt-2 flex flex-col gap-0.5 rounded-xl bg-surface-light px-2 py-2">
            {ABOUT_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => onClose?.()}
                className="rounded-lg px-2 py-2 text-[13px] text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
              >
                {t(link.tKey, link.fallback)}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
