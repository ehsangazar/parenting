import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = join(__dirname, "..", "..", "config", "child-modules.json");
const config = JSON.parse(readFileSync(configPath, "utf-8")) as {
  periods: Record<string, { name: string; description?: string; ageRange?: string }>;
  modules: Record<string, { name: string; description: string; periods: string[]; icon: string; enabled: boolean }>;
};

function parseAgeRange(ageRange: string): { minYears: number; maxYears: number | null } | null {
  const plusMatch = ageRange.match(/^(\d+)\+\s+years?$/i);
  if (plusMatch) return { minYears: parseInt(plusMatch[1], 10), maxYears: null };
  const match = ageRange.match(/^(\d+)-(\d+)\s+years?$/i);
  if (!match) return null;
  return { minYears: parseInt(match[1], 10), maxYears: parseInt(match[2], 10) };
}

export function isModuleAvailableForAge(moduleId: string, age: number | null, isUnborn = false): boolean {
  const mod = config.modules[moduleId];
  if (!mod?.enabled) return false;
  return mod.periods.some((periodId) => {
    const period = config.periods[periodId];
    if (!period) return false;
    if (periodId === "pregnancy") return isUnborn;
    if (!period.ageRange || age === null) return false;
    const range = parseAgeRange(period.ageRange);
    if (!range) return false;
    return range.maxYears === null ? age >= range.minYears : age >= range.minYears && age <= range.maxYears;
  });
}

export function getPeriodIdForAge(age: number | null, isUnborn = false): string | null {
  if (isUnborn) return config.periods.pregnancy ? "pregnancy" : null;
  if (age === null) return null;
  for (const [periodId, period] of Object.entries(config.periods)) {
    if (periodId === "pregnancy" || !period.ageRange) continue;
    const range = parseAgeRange(period.ageRange);
    if (!range) continue;
    if (range.maxYears === null ? age >= range.minYears : age >= range.minYears && age <= range.maxYears) return periodId;
  }
  return null;
}

export function getDefaultModulesForAge(
  age: number | null,
  isUnborn = false,
  overridesByPeriod?: Record<string, Record<string, boolean>>,
): Record<string, boolean> {
  const modules: Record<string, boolean> = {};
  for (const moduleId of Object.keys(config.modules)) {
    if (isModuleAvailableForAge(moduleId, age, isUnborn)) modules[moduleId] = true;
  }
  if (overridesByPeriod) {
    const periodId = getPeriodIdForAge(age, isUnborn);
    const overrides = periodId ? overridesByPeriod[periodId] : undefined;
    if (overrides) {
      for (const [moduleId, enabled] of Object.entries(overrides)) {
        if (isModuleAvailableForAge(moduleId, age, isUnborn)) modules[moduleId] = Boolean(enabled);
      }
    }
  }
  return modules;
}

export function getModulesConfig() { return config.modules; }
export function getPeriodsConfig() { return config.periods; }
export function getModuleConfig(moduleId: string) { return config.modules[moduleId]; }
