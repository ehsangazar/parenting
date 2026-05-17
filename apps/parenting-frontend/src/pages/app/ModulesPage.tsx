import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../../components/icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { familiesApi, modulesApi } from '../../lib/appApi.js';
import { useAppContext } from '../../components/app/AppContext.js';
import { PageHeader } from '../../components/app/PageHeader.js';
import { PageContainer } from '../../components/app/PageContainer.js';

const allowedModuleKeys = ['insights', 'moments', 'ai', 'calendar', 'village'] as const;
type AllowedModuleKey = (typeof allowedModuleKeys)[number];

type Child = {
  id: string;
  name: string;
  modules?: Record<string, boolean> | null;
};

type ModulesConfigResponse = {
  modules?: Record<string, { name?: string }>;
};

const moduleConfig: Record<AllowedModuleKey, { title: string; iconName: IconName; description: string; color: string }> = {
  insights: { title: 'Insights', iconName: uiIcons.lightbulb, description: 'Personalised parenting insights', color: '#5E7A63' },
  moments: { title: 'Moments', iconName: uiIcons.camera, description: 'Private photo and memory vault', color: '#C49A4E' },
  ai: { title: 'AI Assistant', iconName: uiIcons.sparkles, description: 'AI-powered parenting assistant', color: '#7F9B8D' },
  calendar: { title: 'Calendar', iconName: uiIcons.calendar, description: 'Family scheduling and events', color: '#D8B26D' },
  village: { title: 'Village', iconName: uiIcons.building2, description: 'Your community feed', color: '#4E6653' },
};

function ToggleSwitch({ on, onToggle, disabled, isSaving }: { on: boolean; onToggle: () => void; disabled?: boolean; isSaving?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      role="switch"
      aria-checked={on}
      aria-label={on ? 'Disable module' : 'Enable module'}
      disabled={disabled}
      className={`toggle-switch focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:ring-offset-2 disabled:cursor-not-allowed ${isSaving ? 'animate-pulse opacity-80' : ''}`}
      data-on={on}
    >
      <span className="toggle-switch-thumb" />
    </button>
  );
}

export const ModulesPage = () => {
  const { t } = useTranslation();
  const { activeFamily, refreshFamilies } = useAppContext();
  const activeFamilyId = activeFamily?.id;
  const [config, setConfig] = useState<ModulesConfigResponse | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingFamilyKey, setSavingFamilyKey] = useState<AllowedModuleKey | null>(null);
  const [savingChildKey, setSavingChildKey] = useState<string | null>(null);
  const familyModules = useMemo(() => activeFamily?.modules ?? {}, [activeFamily?.modules]);
  const enabledCount = useMemo(
    () => allowedModuleKeys.filter((key) => familyModules[key] !== false).length,
    [familyModules],
  );

  useEffect(() => {
    if (!activeFamilyId) return;
    setLoading(true);
    Promise.all([modulesApi.getConfig(), familiesApi.listChildren(activeFamilyId)])
      .then(([configRes, childrenRes]) => { setConfig(configRes); setChildren(childrenRes.children ?? []); })
      .finally(() => setLoading(false));
  }, [activeFamilyId]);

  if (!activeFamily) {
    return (
      <PageContainer verticalSpacing="normal">
        <PageHeader title={t('learning.modules')} subtitle={t('page.modulesSubtitle')} iconName="puzzle" />
        <div className="rounded-[28px] border border-border-light bg-surface p-6 shadow-sm">
          <p className="text-text-secondary">{t('page.modulesNeedFamily')}</p>
        </div>
      </PageContainer>
    );
  }

  const toggleFamilyModule = async (key: AllowedModuleKey) => {
    if (!activeFamily) return;
    const currentValue = familyModules[key];
    const newValue = currentValue === false ? true : false;
    
    setSavingFamilyKey(key);
    try {
      const updateData = {
        modules: {
          ...familyModules,
          [key]: newValue,
        },
      };
      await familiesApi.update(activeFamily.id, updateData);
      await refreshFamilies();
    } catch (error) {
      // Error handled silently or via toast if needed
    } finally {
      setSavingFamilyKey(null);
    }
  };

  const childModules = (config?.modules ?? {});
  const filteredChildModuleEntries = Object.entries(childModules).filter(([moduleId]) =>
    allowedModuleKeys.includes(moduleId as AllowedModuleKey),
  );

  return (
    <PageContainer verticalSpacing="normal">
      <div className="flex min-h-0 flex-1 flex-col pb-10">
        <PageHeader title={t('learning.modules')} subtitle={t('page.modulesSubtitleLong')} iconName="puzzle" />
        
        <div className="mt-8 space-y-12">
        {loading && (
          <section className="rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-primary-fg">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary-500" />
              {t('page.modulesLoadingSettings')}
            </div>
          </section>
        )}

        {/* Family Modules Section */}
        <section className="animate-fade-up">
          <div className="mb-6 flex items-end justify-between px-2">
            <div>
              <h2 className="font-display text-2xl font-bold text-text-primary">Family access</h2>
              <p className="mt-1 text-sm text-text-secondary">Global settings for your entire household.</p>
            </div>
            <div className="bg-surface-warm/50 border-border-light rounded-2xl border px-4 py-2 backdrop-blur-sm">
              <span className="text-text-tertiary text-[10px] font-bold uppercase tracking-wider">Active Modules</span>
              <div className="flex items-baseline gap-1">
                <span className="text-primary-fg text-xl font-bold">{enabledCount}</span>
                <span className="text-text-tertiary text-sm">/ 5</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allowedModuleKeys.map((key) => {
              const { title, iconName, description, color } = moduleConfig[key];
              const isOn = familyModules[key] !== false;
              const isSaving = savingFamilyKey === key;
              
              return (
                <div
                  key={key}
                  onClick={() => !isSaving && toggleFamilyModule(key)}
                  className={`group relative flex flex-col overflow-hidden rounded-[24px] border p-5 transition-all duration-300 cursor-pointer ${
                    isOn 
                      ? 'border-primary-200 bg-surface shadow-sm ring-1 ring-primary-100/50' 
                      : 'border-border-light bg-surface/40 grayscale-[0.5] opacity-80 hover:opacity-100 hover:grayscale-0'
                  } hover:shadow-md hover:-translate-y-1`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div 
                      className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: isOn ? `${color}15` : '#F7F3EE' }}
                    >
                      <Icon
                        name={iconName}
                        className="h-6 w-6 transition-colors duration-300"
                        style={{ color: isOn ? color : '#8A857B' }}
                        alt=""
                      />
                    </div>
                    <ToggleSwitch 
                      on={isOn} 
                      onToggle={() => toggleFamilyModule(key)} 
                      disabled={isSaving} 
                      isSaving={isSaving}
                    />
                  </div>
                  
                  <div className="mb-1">
                    <h3 className={`font-display text-lg font-bold transition-colors duration-300 ${isOn ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {title}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {description}
                  </p>
                  
                  {isSaving ? (
                    <div className="mt-4 flex items-center gap-1.5">
                      <Icon name={uiIcons.loader} className="h-3.5 w-3.5 animate-spin text-primary-700" alt="" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary-700">Saving</span>
                    </div>
                  ) : isOn ? (
                    <div className="mt-4 flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-success-600">Active</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* Child Modules Section */}
        {!loading && filteredChildModuleEntries.length > 0 && children.length > 0 && (
          <section className="animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div className="mb-6 px-2">
              <h2 className="font-display text-2xl font-bold text-text-primary">Child profiles</h2>
              <p className="mt-1 text-sm text-text-secondary">Individual module permissions per child.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {children.map((child) => (
                <div key={child.id} className="bg-surface border-border-light overflow-hidden rounded-[28px] border shadow-sm transition-all hover:shadow-md">
                  <div className="bg-surface-warm/30 flex items-center gap-4 border-b border-border-light p-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-400 font-display text-xl font-bold text-white shadow-inner">
                      {child.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-text-primary">{child.name}</h3>
                      <p className="text-xs text-text-tertiary uppercase tracking-widest font-bold">Preferences</p>
                    </div>
                  </div>

                  <div className="divide-y divide-border-light/50 p-2">
                    {filteredChildModuleEntries.map(([moduleId, moduleConf]) => {
                      const enabled = child.modules?.[moduleId] ?? true;
                      const childModuleKey = `${child.id}-${moduleId}`;
                      const isSaving = savingChildKey === childModuleKey;
                      const { iconName } = moduleConfig[moduleId as AllowedModuleKey];
                      
                      return (
                        <div
                          key={childModuleKey}
                          className="flex items-center justify-between p-4 transition-colors hover:bg-surface-light/50 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${enabled ? 'bg-primary-50' : 'bg-surface-warm'}`}>
                              <Icon
                                name={iconName}
                                className={`h-4 w-4 ${enabled ? 'text-primary-700' : 'text-text-tertiary'}`}
                                alt=""
                              />
                            </div>
                            <span className={`font-medium ${enabled ? 'text-text-primary' : 'text-text-tertiary'}`}>
                              {moduleConf.name ?? moduleConfig[moduleId as AllowedModuleKey]?.title ?? moduleId}
                            </span>
                          </div>
                          
                          <ToggleSwitch
                            on={enabled}
                            disabled={isSaving}
                            isSaving={isSaving}
                            onToggle={async () => {
                              setSavingChildKey(childModuleKey);
                              try {
                                await familiesApi.updateChild(activeFamily.id, child.id, {
                                  modules: {
                                    ...(child.modules ?? {}),
                                    [moduleId]: !enabled,
                                  },
                                });
                                const updated = await familiesApi.listChildren(activeFamily.id);
                                setChildren(updated.children ?? []);
                              } finally {
                                setSavingChildKey(null);
                              }
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading && (
          <section className="animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div className="mb-6 px-2">
              <div className="h-7 w-40 animate-pulse rounded-lg bg-surface-light" />
              <div className="mt-2 h-4 w-72 animate-pulse rounded bg-surface-light" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="bg-surface border-border-light overflow-hidden rounded-[28px] border p-5 shadow-sm">
                <div className="space-y-3">
                  <div className="h-12 animate-pulse rounded-xl bg-surface-light" />
                  <div className="h-12 animate-pulse rounded-xl bg-surface-light" />
                  <div className="h-12 animate-pulse rounded-xl bg-surface-light" />
                </div>
              </div>
              <div className="bg-surface border-border-light overflow-hidden rounded-[28px] border p-5 shadow-sm">
                <div className="space-y-3">
                  <div className="h-12 animate-pulse rounded-xl bg-surface-light" />
                  <div className="h-12 animate-pulse rounded-xl bg-surface-light" />
                  <div className="h-12 animate-pulse rounded-xl bg-surface-light" />
                </div>
              </div>
            </div>
          </section>
        )}
        </div>
      </div>
    </PageContainer>
  );
};
