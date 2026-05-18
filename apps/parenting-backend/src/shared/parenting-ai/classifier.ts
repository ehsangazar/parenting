import { EMERGENCY_KEYWORDS } from "./constants.js";

const FARSI_SCRIPT_PATTERNS = [
  /[کیپچگژ]/,
  /(سلام|خوب|چطور|هستم|مرسی|ممنون)/,
];

export function hasFarsiScript(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return FARSI_SCRIPT_PATTERNS.some((p) => p.test(trimmed));
}

export function resolveLanguage(text: string, callerLocale?: string | null): string {
  if (hasFarsiScript(text)) return "fa";
  const locale = (callerLocale ?? "").split("-")[0].toLowerCase();
  if (locale === "fa" || locale === "en") return locale;
  return "en";
}

export function detectEmergencyRules(text: string): { detected: boolean; keyword?: string } {
  const lower = text.toLowerCase();
  const keyword = EMERGENCY_KEYWORDS.find((kw) => lower.includes(kw));
  return { detected: !!keyword, keyword };
}
