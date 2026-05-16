const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phoneRegex = /\+?\d[\d\s().-]{7,}\d/g;

export const redactPII = (text: string) =>
  text.replace(emailRegex, "[redacted-email]").replace(phoneRegex, "[redacted-phone]");

export const isBlocked = (text: string, blocklist: string[] = []) => {
  const lower = text.toLowerCase();
  return blocklist.some((w) => lower.includes(w.toLowerCase()));
};

export const applyBlocklist = (text: string, blocklist: string[] = []) => {
  if (!isBlocked(text, blocklist)) return text;
  throw new Error("Content blocked by policy");
};
