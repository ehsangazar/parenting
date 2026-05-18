import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useAuth } from '../../state/auth.js';
import { familiesApi } from '../../lib/appApi.js';
import { AppContext, type Family } from '../app/AppContext.js';
import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { HistorySidebar } from './HistorySidebar.js';
import { FeaturesPanel } from './FeaturesPanel.js';
import { ChatShellContext, type ChatShellContextValue } from './ChatShellContext.js';

const STORAGE_KEY = 'active_family_id';

/**
 * Three-column layout: conversation history (left), main content (center,
 * usually the chat), and feature shortcuts (right). Mobile collapses the
 * side columns into drawers.
 */
export const ChatShell = () => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [families, setFamilies] = useState<Family[]>([]);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null,
  );
  const [loadingFamilies, setLoadingFamilies] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [newConversationNonce, setNewConversationNonce] = useState(0);

  useEffect(() => {
    setHistoryOpen(false);
    setFeaturesOpen(false);
  }, [location.pathname]);

  const refreshFamilies = async () => {
    if (!token) {
      setFamilies([]);
      setLoadingFamilies(false);
      return;
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const activeFamily = useMemo(
    () => families.find((f) => f.id === activeFamilyId),
    [families, activeFamilyId],
  );

  const handleFamilyChange = (id: string) => {
    setActiveFamilyId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const shellContext: ChatShellContextValue = useMemo(
    () => ({
      activeConversationId,
      setActiveConversationId,
      requestNewConversation: () => setNewConversationNonce((n) => n + 1),
      newConversationNonce,
    }),
    [activeConversationId, newConversationNonce],
  );

  return (
    <AppContext.Provider
      value={{
        families,
        activeFamilyId,
        activeFamily,
        setActiveFamilyId: handleFamilyChange,
        refreshFamilies,
        loadingFamilies,
      }}
    >
      <ChatShellContext.Provider value={shellContext}>
        <div className="flex h-screen min-h-0 w-full bg-background text-text-primary">
          {/* Left: conversation history (desktop) */}
          <aside className="hidden lg:flex w-[280px] flex-shrink-0 border-r border-border bg-surface">
            <HistorySidebar />
          </aside>

          {/* Center: main content (chat or selected feature) */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Mobile top bar */}
            <div className="lg:hidden flex items-center justify-between border-b border-border bg-surface px-3 py-2">
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                aria-label={t('chatShell.openHistory', 'Open history')}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-light"
              >
                <Icon name={uiIcons.menu} className="h-5 w-5 object-contain" alt="" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                aria-label={t('chatShell.backToChat', 'Back to chat')}
                className="flex min-h-[40px] items-center rounded-lg px-3 text-[15px] font-extrabold tracking-tight text-text-primary hover:bg-surface-light"
              >
                {t('common.appName', 'Raised')}
              </button>
              <button
                type="button"
                onClick={() => setFeaturesOpen(true)}
                aria-label={t('chatShell.openTools', 'Open tools')}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-light"
              >
                <Icon name={uiIcons.chartColumn} className="h-5 w-5 object-contain" alt="" />
              </button>
            </div>

            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <Outlet />
            </main>
          </div>

          {/* Right: features panel (desktop) */}
          <aside className="hidden lg:flex w-[280px] flex-shrink-0 border-l border-border bg-surface">
            <FeaturesPanel />
          </aside>

          {/* Mobile drawers */}
          {historyOpen && (
            <>
              <div
                className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                onClick={() => setHistoryOpen(false)}
                aria-hidden="true"
              />
              <div
                className={clsx(
                  'lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[300px] max-w-[85vw] bg-surface shadow-2xl',
                )}
              >
                <HistorySidebar onClose={() => setHistoryOpen(false)} />
              </div>
            </>
          )}

          {featuresOpen && (
            <>
              <div
                className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                onClick={() => setFeaturesOpen(false)}
                aria-hidden="true"
              />
              <div
                className={clsx(
                  'lg:hidden fixed right-0 top-0 bottom-0 z-50 w-[300px] max-w-[85vw] bg-surface shadow-2xl',
                )}
              >
                <FeaturesPanel onClose={() => setFeaturesOpen(false)} />
              </div>
            </>
          )}
        </div>
      </ChatShellContext.Provider>
    </AppContext.Provider>
  );
};
