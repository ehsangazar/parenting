import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { api } from "../lib/api.js";

type FamilyModuleDefinition = {
  id: string;
  label: string;
};

type ChildModuleConfig = {
  name: string;
  description: string;
  periods: string[];
  icon: string;
  enabled: boolean;
};

type PeriodConfig = {
  name: string;
  description?: string;
  ageRange?: string;
};

type WidgetLayout = {
  version: number;
  widgets: Array<{
    id: string;
    pluginId: string;
    widgetId: string;
    scope: "global" | "family" | "child";
    placement:
      | "familyHome"
      | "childHome"
      | "mainDrawer"
      | "familyDrawer"
      | "childDrawer"
      | "familyTabs"
      | "quickActions";
    size?: "small" | "medium" | "large";
    settings?: Record<string, unknown>;
  }>;
  order: string[];
};

type ModuleDefaultsResponse = {
  defaults: {
    familyModules?: Record<string, boolean>;
    childModulesByPeriod?: Record<string, Record<string, boolean>>;
    widgetDefaults?: {
      family?: {
        familyHome?: WidgetLayout;
      };
      child?: {
        childHome?: Record<string, WidgetLayout>;
      };
    };
  };
  config: {
    familyModules: FamilyModuleDefinition[];
    childModules: Record<string, ChildModuleConfig>;
    childPeriods: Record<string, PeriodConfig>;
  };
};

type WidgetPlacement = WidgetLayout["widgets"][number]["placement"];
type WidgetScope = WidgetLayout["widgets"][number]["scope"];

type PluginManifest = {
  id: string;
  name: string;
  version: string;
  widgets?: Array<{
    id: string;
    scope: WidgetScope;
    placements: WidgetPlacement[];
    defaultLayout?: {
      order?: number;
      visible?: boolean;
      size?: "small" | "medium" | "large";
    };
  }>;
};

const buildDefaultLayout = (
  plugins: PluginManifest[],
  scope: WidgetScope,
  placement: WidgetPlacement,
): WidgetLayout => {
  const widgets = plugins
    .flatMap((manifest) =>
      (manifest.widgets || []).map((widget) => ({
        pluginId: manifest.id,
        widgetId: widget.id,
        scope: widget.scope,
        placements: widget.placements,
        defaultLayout: widget.defaultLayout,
      })),
    )
    .filter((widget) => widget.scope === scope)
    .filter((widget) => widget.placements.includes(placement))
    .filter((widget) => widget.defaultLayout?.visible !== false)
    .sort(
      (a, b) =>
        (a.defaultLayout?.order ?? 999) - (b.defaultLayout?.order ?? 999),
    );

  const instances = widgets.map((widget) => ({
    id: `${widget.pluginId}.${widget.widgetId}`,
    pluginId: widget.pluginId,
    widgetId: widget.widgetId,
    scope,
    placement,
    size: widget.defaultLayout?.size,
  }));

  return {
    version: 1,
    widgets: instances,
    order: instances.map((instance) => instance.id),
  };
};

const resolveChildDefaults = (
  config: ModuleDefaultsResponse["config"] | null,
  existing?: Record<string, Record<string, boolean>>,
) => {
  if (!config) return {};
  const result: Record<string, Record<string, boolean>> = {};
  Object.entries(config.childPeriods).forEach(([periodId]) => {
    const periodDefaults: Record<string, boolean> = {};
    Object.entries(config.childModules).forEach(([moduleId, module]) => {
      if (!module.enabled) return;
      if (!module.periods.includes(periodId)) return;
      const existingValue = existing?.[periodId]?.[moduleId];
      periodDefaults[moduleId] = existingValue ?? true;
    });
    result[periodId] = periodDefaults;
  });
  return result;
};

export const AdminModules = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ModuleDefaultsResponse["config"] | null>(
    null,
  );
  const [familyModules, setFamilyModules] = useState<Record<string, boolean>>(
    {},
  );
  const [childModulesByPeriod, setChildModulesByPeriod] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [familyWidgetLayoutText, setFamilyWidgetLayoutText] = useState("");
  const [childWidgetLayoutText, setChildWidgetLayoutText] = useState<
    Record<string, string>
  >({});
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);

  const periodList = useMemo(
    () => Object.entries(config?.childPeriods || {}),
    [config],
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [defaultsResponse, pluginsResponse] = await Promise.all([
        api.get("/api/admin/modules"),
        api.get("/api/plugins/manifest"),
      ]);
      const data = defaultsResponse.data as ModuleDefaultsResponse;
      setConfig(data.config);
      // Merge so every family module from config has a value (saved default or true)
      const loadedFamily: Record<string, boolean> = {};
      (data.config?.familyModules ?? []).forEach(
        (m: { id: string }) =>
          (loadedFamily[m.id] =
            data.defaults.familyModules?.[m.id] ?? true),
      );
      setFamilyModules(loadedFamily);
      setChildModulesByPeriod(
        resolveChildDefaults(data.config, data.defaults.childModulesByPeriod),
      );

      const familyLayout = data.defaults.widgetDefaults?.family?.familyHome;
      setFamilyWidgetLayoutText(
        familyLayout ? JSON.stringify(familyLayout, null, 2) : "",
      );

      const childLayouts =
        data.defaults.widgetDefaults?.child?.childHome || {};
      const childLayoutText: Record<string, string> = {};
      Object.keys(data.config.childPeriods).forEach((periodId) => {
        const layout = childLayouts[periodId];
        childLayoutText[periodId] = layout
          ? JSON.stringify(layout, null, 2)
          : "";
      });
      setChildWidgetLayoutText(childLayoutText);

      setPlugins(pluginsResponse.data.plugins || []);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load module defaults";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleFamilyModule = (moduleId: string) => {
    setFamilyModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const handleToggleChildModule = (periodId: string, moduleId: string) => {
    setChildModulesByPeriod((prev) => ({
      ...prev,
      [periodId]: {
        ...prev[periodId],
        [moduleId]: !prev[periodId]?.[moduleId],
      },
    }));
  };

  const applyFamilyDefaultLayout = () => {
    const layout = buildDefaultLayout(plugins, "family", "familyHome");
    setFamilyWidgetLayoutText(JSON.stringify(layout, null, 2));
  };

  const applyChildDefaultLayout = (periodId: string) => {
    const layout = buildDefaultLayout(plugins, "child", "childHome");
    setChildWidgetLayoutText((prev) => ({
      ...prev,
      [periodId]: JSON.stringify(layout, null, 2),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let familyWidgetLayout: WidgetLayout | undefined;
      const familyText = familyWidgetLayoutText.trim();
      if (familyText) {
        familyWidgetLayout = JSON.parse(familyText);
      }

      const childWidgetLayouts: Record<string, WidgetLayout> = {};
      Object.entries(childWidgetLayoutText).forEach(([periodId, text]) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        childWidgetLayouts[periodId] = JSON.parse(trimmed);
      });

      const widgetDefaults = {
        family: familyWidgetLayout ? { familyHome: familyWidgetLayout } : {},
        child:
          Object.keys(childWidgetLayouts).length > 0
            ? { childHome: childWidgetLayouts }
            : {},
      };

      // Send full set of family modules so disabled modules (e.g. ai: false) are persisted
      const fullFamilyModules: Record<string, boolean> = {};
      (config?.familyModules ?? []).forEach(
        (m: { id: string }) =>
          (fullFamilyModules[m.id] = familyModules[m.id] ?? true),
      );

      await api.put("/api/admin/modules", {
        familyModules: fullFamilyModules,
        childModulesByPeriod,
        widgetDefaults,
      });

      toast.success("Module defaults saved");
      loadData();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save module defaults. Check JSON inputs.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 inline-flex rounded-full border border-brand-blue/40 bg-brand-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-blue">
            System Configuration
          </div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary mb-2">
            Module Defaults
          </h1>
          <p className="text-text-secondary font-medium">
            Configure default modules and widget layouts for new families and
            children.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            className="btn-duo-outline-sm !font-semibold !normal-case !tracking-normal"
          >
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-duo-blue-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Defaults"}
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-3xl shadow-sm border border-border p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary mb-1">
            Family Modules
          </h2>
          <p className="text-sm text-text-secondary">
            Default module visibility for newly created families.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {config?.familyModules.map((module) => (
            <label
              key={module.id}
              className="flex items-center gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-surface-light"
            >
              <input
                type="checkbox"
                checked={Boolean(familyModules[module.id])}
                onChange={() => handleToggleFamilyModule(module.id)}
                className="h-4 w-4 text-brand-blue rounded"
              />
              <span className="font-medium text-text-primary">{module.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-3xl shadow-sm border border-border p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary mb-1">
            Child Modules by Age Group
          </h2>
          <p className="text-sm text-text-secondary">
            Default child modules for each age group. Users can override per
            child.
          </p>
        </div>
        <div className="space-y-6">
          {periodList.map(([periodId, period]) => {
            const moduleEntries = Object.entries(config?.childModules || {})
              .filter(([, module]) => module.enabled)
              .filter(([, module]) => module.periods.includes(periodId));
            return (
              <div key={periodId} className="border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">
                      {period.name}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {period.ageRange || period.description || "Age group"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {moduleEntries.map(([moduleId, module]) => (
                    <label
                      key={moduleId}
                      className="flex items-center gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-surface-light"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(
                          childModulesByPeriod?.[periodId]?.[moduleId],
                        )}
                        onChange={() => handleToggleChildModule(periodId, moduleId)}
                        className="h-4 w-4 text-brand-blue rounded"
                      />
                      <span className="font-medium text-text-primary">
                        {module.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-surface rounded-3xl shadow-sm border border-border p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary mb-1">
            Family Widget Layout Default
          </h2>
          <p className="text-sm text-text-secondary">
            Default widget layout JSON for new family dashboards.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={applyFamilyDefaultLayout}
            className="btn-duo-ghost-sm !font-medium !normal-case !tracking-normal"
          >
            Use Plugin Defaults
          </button>
        </div>
        <textarea
          value={familyWidgetLayoutText}
          onChange={(event) => setFamilyWidgetLayoutText(event.target.value)}
          rows={8}
          className="w-full rounded-xl border border-border p-4 font-mono text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Paste widget layout JSON here"
        />
      </div>

      <div className="bg-surface rounded-3xl shadow-sm border border-border p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary mb-1">
            Child Widget Layout Defaults by Age Group
          </h2>
          <p className="text-sm text-text-secondary">
            Provide widget layout JSON for each child age group.
          </p>
        </div>
        <div className="space-y-6">
          {periodList.map(([periodId, period]) => (
            <div
              key={periodId}
              className="border border-border rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    {period.name}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {period.ageRange || period.description || "Age group"}
                  </p>
                </div>
                <button
                  onClick={() => applyChildDefaultLayout(periodId)}
                  className="px-4 py-2 bg-surface-light hover:bg-surface-warm text-text-secondary rounded-xl font-medium transition-all"
                >
                  Use Plugin Defaults
                </button>
              </div>
              <textarea
                value={childWidgetLayoutText[periodId] || ""}
                onChange={(event) =>
                  setChildWidgetLayoutText((prev) => ({
                    ...prev,
                    [periodId]: event.target.value,
                  }))
                }
                rows={8}
                className="w-full rounded-xl border border-border p-4 font-mono text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste widget layout JSON here"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
