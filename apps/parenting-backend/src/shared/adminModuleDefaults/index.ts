import { Prisma } from "@prisma/client";
import { prisma } from "../db/index.js";
import { getModulesConfig, getPeriodsConfig } from "../childModules/index.js";

export const ADMIN_MODULE_DEFAULTS_KEY = "default";

export type AdminModuleDefaults = {
  familyModules?: Record<string, boolean>;
  childModulesByPeriod?: Record<string, Record<string, boolean>>;
  widgetDefaults?: Record<string, unknown>;
};

export const familyModuleDefinitions = [
  { id: "welcome", label: "Welcome", manageableByFamily: false },
  { id: "children", label: "Children", manageableByFamily: false },
  { id: "insights", label: "Insights", manageableByFamily: true },
  { id: "calendar", label: "Calendar", manageableByFamily: true },
  { id: "moments", label: "Moments", manageableByFamily: true },
  { id: "village", label: "Village", manageableByFamily: true },
  { id: "ai", label: "Assistant", manageableByFamily: true },
];

const FAMILY_MODULE_IDS = ["welcome", "children", "insights", "calendar", "moments", "village", "ai"] as const;

export const getFamilyDefaultModules = (): Record<string, boolean> => ({
  welcome: true, children: true, insights: true, calendar: true, moments: true, village: true, ai: true,
});

export function applyAdminFamilyModuleDefaults(
  storedModules: Record<string, boolean> | null | undefined,
  adminDefaults: Record<string, boolean> | null | undefined,
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const id of FAMILY_MODULE_IDS) {
    const adminValue = adminDefaults?.[id];
    const storedValue = storedModules?.[id];
    result[id] = adminValue === false ? false : (storedValue ?? adminValue ?? true);
  }
  result.calendar = true;
  return result;
}

export const getModuleConfigPayload = () => ({
  familyModules: familyModuleDefinitions,
  childModules: getModulesConfig(),
  childPeriods: getPeriodsConfig(),
});

export const getAdminModuleDefaults = async (): Promise<AdminModuleDefaults | null> => {
  const record = await prisma.adminModuleDefaults.findUnique({ where: { key: ADMIN_MODULE_DEFAULTS_KEY } });
  if (!record) return null;
  return {
    familyModules: record.familyModules as Record<string, boolean> | undefined,
    childModulesByPeriod: record.childModulesByPeriod as Record<string, Record<string, boolean>> | undefined,
    widgetDefaults: record.widgetDefaults as Record<string, unknown> | undefined,
  };
};

export const upsertAdminModuleDefaults = async (defaults: AdminModuleDefaults) => {
  return prisma.adminModuleDefaults.upsert({
    where: { key: ADMIN_MODULE_DEFAULTS_KEY },
    update: {
      familyModules: defaults.familyModules ?? undefined,
      childModulesByPeriod: defaults.childModulesByPeriod ?? undefined,
      widgetDefaults: (defaults.widgetDefaults ?? undefined) as Prisma.InputJsonValue,
    },
    create: {
      key: ADMIN_MODULE_DEFAULTS_KEY,
      familyModules: defaults.familyModules ?? undefined,
      childModulesByPeriod: defaults.childModulesByPeriod ?? undefined,
      widgetDefaults: (defaults.widgetDefaults ?? undefined) as Prisma.InputJsonValue,
    },
  });
};
