import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppBase } from '../../hooks/useAppBase.js';
import { useTranslation } from 'react-i18next';
import {
  House, GraduationCap, Camera,
  Robot, CalendarBlank, ChartBar, Books,
  DotsThreeOutline, UserCircle, X,
  type IconProps as PhosphorIconProps,
} from '@phosphor-icons/react';
import type React from 'react';
import clsx from 'clsx';
import { familiesApi } from '../../lib/appApi.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { AppContext, Family } from './AppContext.js';
import { NotificationPanel } from '../notifications/NotificationPanel.js';
import { useAuth } from '../../state/auth.js';
import { FamilySwitcher } from './FamilySwitcher.js';
import { TopNav } from './TopNav.js';
import { DesktopStatsBar } from './DesktopStatsBar.js';
import { Icon, type IconName } from '../icons/index.js';
import { LanguageSwitcher } from '../LanguageSwitcher.js';

const STORAGE_KEY = 'active_family_id';

type NavItemBase = {
  to: string;
  label: string;
  tKey: string;
  NavIcon: React.ForwardRefExoticComponent<PhosphorIconProps & React.RefAttributes<SVGSVGElement>>;
  color: string;
  /** Active row tint — per-section, not a single global blue. */
  rowBg: string;
  module?: 'ai' | 'village' | 'moments' | 'calendar';
};

/** Desktop sidebar: raster assets from `src/components/icons/assets` via `appAssetIcons`. */
type DesktopNavItem = NavItemBase & { iconName: IconName };

/** Primary nav (max 5): Home, Academy, Village, Moments, AI Assistant — desktop tints per route */
const primaryNavItems: DesktopNavItem[] = [
  { to: '/app', label: 'Home', tKey: 'nav.dashboard', iconName: appAssetIcons.home, NavIcon: House, color: 'text-brand-green', rowBg: 'bg-brand-green/10' },
  { to: '/app/learning', label: 'Academy', tKey: 'nav.learning', iconName: appAssetIcons.academy, NavIcon: GraduationCap, color: 'text-brand-yellow', rowBg: 'bg-brand-yellow/10' },
  { to: '/app/moments', label: 'Moments', tKey: 'nav.moments', iconName: appAssetIcons.moments, NavIcon: Camera, module: 'moments', color: 'text-brand-red', rowBg: 'bg-brand-red/10' },
  { to: '/app/chat', label: 'AI Assistant', tKey: 'nav.chat', iconName: appAssetIcons.aiGuide, NavIcon: Robot, module: 'ai', color: 'text-brand-blue', rowBg: 'bg-brand-blue/10' },
];

/** Secondary: Calendar, Insights, Resources — also linked from Settings on mobile */
const secondaryNavItems: DesktopNavItem[] = [
  { to: '/app/calendar', label: 'Calendar', tKey: 'nav.calendar', iconName: appAssetIcons.calendar, NavIcon: CalendarBlank, module: 'calendar', color: 'text-brand-blue', rowBg: 'bg-brand-blue/10' },
  { to: '/app/insights', label: 'Insights', tKey: 'nav.insights', iconName: appAssetIcons.insights, NavIcon: ChartBar, color: 'text-[#FF9600]', rowBg: 'bg-[#FF9600]/10' },
  { to: '/app/resources', label: 'Resources', tKey: 'nav.resources', iconName: appAssetIcons.resources, NavIcon: Books, color: 'text-brand-green', rowBg: 'bg-brand-green/10' },
];

/**
 * Mobile bottom bar: Home, Academy, Village, Moments + More.
 * Pastel spec: one neutral inactive ink (`text-text-secondary`) + `text-primary-fg` when active — no per-route pastel on white.
 */
const mobileNavigationItems: (Omit<NavItemBase, 'color' | 'rowBg'> & { shortLabel: string })[] = [
  { to: '/app', shortLabel: 'Home', label: 'Home', tKey: 'nav.dashboard', NavIcon: House },
  { to: '/app/learning', shortLabel: 'Academy', label: 'Academy', tKey: 'nav.learning', NavIcon: GraduationCap },
  { to: '/app/moments', shortLabel: 'Moments', label: 'Moments', tKey: 'nav.moments', NavIcon: Camera, module: 'moments' },
];

/** More drawer: AI Assistant + secondary app areas + Settings */
const moreDrawerItems: (NavItemBase & { iconName: IconName })[] = [
  { to: '/app/chat', label: 'AI Assistant', tKey: 'nav.chat', NavIcon: Robot, iconName: appAssetIcons.aiGuide, module: 'ai', color: 'text-brand-blue', rowBg: 'bg-brand-blue/10' },
  { to: '/app/calendar', label: 'Calendar', tKey: 'nav.calendar', NavIcon: CalendarBlank, iconName: appAssetIcons.calendar, module: 'calendar', color: 'text-brand-blue', rowBg: 'bg-brand-blue/10' },
  { to: '/app/insights', label: 'Insights', tKey: 'nav.insights', NavIcon: ChartBar, iconName: appAssetIcons.insights, color: 'text-[#FF9600]', rowBg: 'bg-[#FF9600]/10' },
  { to: '/app/resources', label: 'Resources', tKey: 'nav.resources', NavIcon: Books, iconName: appAssetIcons.resources, color: 'text-brand-green', rowBg: 'bg-brand-green/10' },
  { to: '/app/settings', label: 'Settings', tKey: 'nav.settings', NavIcon: UserCircle, iconName: appAssetIcons.settings, color: 'text-brand-green', rowBg: 'bg-brand-green/10' },
];

const SETTINGS_SIDEBAR = { rowBg: 'bg-brand-green/10' } as const;

function filterNav<T extends { module?: NavItemBase['module'] }>(items: T[], activeFamily: Family | undefined) {
  return items.filter((item) => !item.module || activeFamily?.modules?.[item.module] !== false);
}

export const AppLayout = () => {
  const { t } = useTranslation();
  const { appBase, toApp } = useAppBase();
  const [families, setFamilies] = useState<Family[]>([]);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null,
  );
  const [loadingFamilies, setLoadingFamilies] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const refreshFamilies = async () => {
    setLoadingFamilies(true);
    try {
      const data = await familiesApi.list();
      const items: Family[] = data.families ?? data ?? [];
      setFamilies(items);
      const storedId = localStorage.getItem(STORAGE_KEY);
      const matchesLoaded = storedId && items.some((f) => f.id === storedId);
      if (!matchesLoaded && items.length > 0) {
        const id = items[0].id;
        setActiveFamilyId(id);
        localStorage.setItem(STORAGE_KEY, id);
      }
    } finally {
      setLoadingFamilies(false);
    }
  };

  useEffect(() => {
    refreshFamilies();
  }, []);

  const activeFamily = useMemo(() => families.find((f) => f.id === activeFamilyId), [families, activeFamilyId]);

  const handleFamilyChange = (id: string) => {
    setActiveFamilyId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const navLinkClass = (isActive: boolean, rowBg: string, collapsed: boolean) =>
    clsx(
      'flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-bold transition-colors duration-150 group',
      isActive ? rowBg : 'hover:bg-surface-light/90',
      collapsed && 'justify-center px-0 mx-1',
    );

  const renderDesktopNavLink = (item: DesktopNavItem) => (
    <NavLink
      key={item.to}
      to={toApp(item.to)}
      end={item.to === '/app'}
      title={sidebarCollapsed ? item.label : undefined}
      className={({ isActive }) => navLinkClass(isActive, item.rowBg, sidebarCollapsed)}
    >
      {({ isActive }) => (
        <>
          <Icon
            name={item.iconName}
            className={clsx(
              'h-7 w-7 shrink-0 object-contain',
              !isActive && 'opacity-60 group-hover:opacity-90',
            )}
            alt=""
            aria-hidden
          />
          {!sidebarCollapsed && (
            <span
              className={clsx(
                'truncate uppercase tracking-wider text-text-primary',
                !isActive && 'opacity-60 group-hover:opacity-90',
              )}
            >
              {t(item.tKey)}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <AppContext.Provider
      value={{ families, activeFamilyId, activeFamily, setActiveFamilyId: handleFamilyChange, refreshFamilies, loadingFamilies }}
    >
      <div className="flex min-h-screen bg-background text-text-primary">
        <NotificationPanel />

        <aside
          className={`hidden lg:flex flex-col border-r-2 border-border bg-surface transition-all duration-300 ease-in-out sticky top-0 h-screen overflow-hidden ${
            sidebarCollapsed ? 'w-[88px]' : 'w-[256px]'
          }`}
          style={{ flexShrink: 0 }}
        >
          <FamilySwitcher collapsed={sidebarCollapsed} />

          {!sidebarCollapsed && (
            <div className="border-b border-border px-4 py-2.5">
              <LanguageSwitcher variant="full" className="w-full" />
            </div>
          )}

          <nav aria-label={t('appLayout.sidebarNav')} className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {filterNav(primaryNavItems, activeFamily).map(renderDesktopNavLink)}

            {!sidebarCollapsed && (
              <div className="pt-3 pb-1">
                <p className="px-3 text-xs font-bold uppercase tracking-wider text-text-tertiary">{t('appLayout.more')}</p>
              </div>
            )}
            {sidebarCollapsed && <div className="my-2 border-t border-border" aria-hidden />}

            {filterNav(secondaryNavItems, activeFamily).map(renderDesktopNavLink)}
          </nav>

          <div className="flex-shrink-0 space-y-1 border-t-2 border-border px-3 py-3">
            <NavLink
              to={toApp('/app/settings')}
              title={sidebarCollapsed ? t('nav.settings') : undefined}
              className={({ isActive }) => navLinkClass(isActive, SETTINGS_SIDEBAR.rowBg, sidebarCollapsed)}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    name={appAssetIcons.settings}
                    className={clsx(
                      'h-7 w-7 shrink-0 object-contain',
                      !isActive && 'opacity-60 group-hover:opacity-90',
                    )}
                    alt=""
                    aria-hidden
                  />
                  {!sidebarCollapsed && (
                    <span
                      className={clsx(
                        'uppercase tracking-wider text-text-primary',
                        !isActive && 'opacity-60 group-hover:opacity-90',
                      )}
                    >
                      {t('nav.settings')}
                    </span>
                  )}
                </>
              )}
            </NavLink>
            <button
              type="button"
              aria-label={sidebarCollapsed ? t('appLayout.expandSidebar') : t('appLayout.collapseSidebar')}
              onClick={() => setSidebarCollapsed((c) => !c)}
              className={clsx(
                'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-bold text-text-primary transition-colors hover:bg-surface-light/90',
                sidebarCollapsed && 'justify-center px-0 mx-1',
              )}
            >
              <Icon
                name={appAssetIcons.collapseSidebar}
                className={clsx(
                  'h-7 w-7 shrink-0 object-contain transition-transform duration-300',
                  sidebarCollapsed ? 'rotate-180' : '',
                )}
                alt=""
                aria-hidden
              />
              {!sidebarCollapsed && <span className="uppercase tracking-wider text-text-primary">{t('appLayout.collapseSidebar')}</span>}
            </button>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          <TopNav />
          <DesktopStatsBar />
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pb-20 lg:pb-0">
              <Outlet />
            </div>
          </main>
        </div>

        <div className="lg:hidden">
          {/* More drawer — backdrop */}
          {moreOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* More drawer — panel */}
          <div
            className={clsx(
              'fixed bottom-0 right-0 top-0 z-50 flex w-72 flex-col bg-surface shadow-2xl transition-transform duration-300 ease-in-out',
              moreOpen ? 'translate-x-0' : 'translate-x-full',
            )}
            style={{ borderLeft: '2px solid var(--color-border, #E0E7FF)' }}
            aria-label={t('appLayout.moreNav')}
          >
            <div className="flex items-center justify-between border-b-2 border-border px-5 py-4">
              <span className="text-sm font-extrabold uppercase tracking-wider text-text-primary">{t('appLayout.more')}</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface-light"
                aria-label={t('appLayout.closeMenu')}
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {filterNav(moreDrawerItems, activeFamily).map((item) => {
                const lt = toApp(item.to);
                const isActive =
                  location.pathname === lt ||
                  (lt !== appBase && location.pathname.startsWith(lt));
                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => {
                      navigate(lt);
                      setMoreOpen(false);
                    }}
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-bold transition-colors',
                      isActive ? item.rowBg : 'hover:bg-surface-light/90',
                    )}
                  >
                    <Icon
                      name={item.iconName}
                      className={clsx('h-7 w-7 shrink-0 object-contain', !isActive && 'opacity-60')}
                      alt=""
                      aria-hidden
                    />
                    <span className={clsx('uppercase tracking-wider text-text-primary', !isActive && 'opacity-60')}>
                      {t(item.tKey)}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* AI Assistant FAB — Pastel periwinkle, single-ink icon (clears the tab bar) */}
          {!location.pathname.startsWith(toApp('/app/chat')) &&
            !new RegExp(`^${appBase}/learning/[^/]+$`).test(location.pathname) && (
            <NavLink
              to={toApp('/app/chat')}
              aria-label={t('appLayout.openAIAssistant')}
              className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-gradient-to-br from-accent-blueHover to-brand-blue text-white shadow-lg shadow-brand-blue/35 transition-[transform,filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-90"
              style={{
                right: '13px',
                bottom: 'calc(5rem + 3px + env(safe-area-inset-bottom))',
              }}
            >
              <Robot size={28} weight="fill" className="drop-shadow-sm" aria-hidden />
            </NavLink>
          )}

          <nav
            aria-label={t('appLayout.mainNav')}
            className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t-2 border-border bg-surface px-1 py-2"
            style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
          >
            {filterNav(mobileNavigationItems, activeFamily).map((item) => (
              <NavLink
                key={item.to}
                to={toApp(item.to)}
                end={item.to === '/app'}
                className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg py-1.5 transition-colors active:scale-[0.98]"
              >
                {({ isActive }) => (
                  <>
                    <item.NavIcon
                      size={28}
                      weight={isActive ? 'fill' : 'regular'}
                      className={clsx(
                        'transition-colors',
                        isActive ? 'text-primary-fg' : 'text-text-secondary',
                      )}
                      aria-hidden="true"
                    />
                    <span
                      className={clsx(
                        'max-w-full truncate text-[10px] font-bold uppercase tracking-tight',
                        isActive ? 'text-primary-fg' : 'text-text-secondary',
                      )}
                    >
                      {t(item.tKey)}
                    </span>
                  </>
                )}
              </NavLink>
            ))}

            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg py-1.5 transition-colors active:scale-[0.98]"
            >
              <DotsThreeOutline
                size={28}
                weight={moreOpen ? 'fill' : 'regular'}
                className={clsx('text-text-secondary transition-colors', moreOpen && 'text-primary-fg')}
                aria-hidden="true"
              />
              <span
                className={clsx(
                  'text-[10px] font-bold uppercase tracking-tight',
                  moreOpen ? 'text-primary-fg' : 'text-text-secondary',
                )}
              >
                {t('appLayout.more')}
              </span>
            </button>
          </nav>
        </div>
      </div>
    </AppContext.Provider>
  );
};
