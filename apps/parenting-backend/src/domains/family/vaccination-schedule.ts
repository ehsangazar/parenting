// Simplified Australian National Immunisation Program (NIP) schedule.
// One suggested appointment per visit; description lists what's covered.
// Sourced from health.gov.au/national-immunisation-program-schedule.
// Used to seed `suggested` calendar events when a child is added with a
// known birthday.

export type VaccinationSuggestion = {
  title: string;
  description: string;
  startDate: Date;
};

type ScheduleItem = {
  ageMonths: number;
  title: string;
  description: string;
};

const SCHEDULE: ScheduleItem[] = [
  {
    ageMonths: 0,
    title: "Newborn vaccinations",
    description: "Hepatitis B (birth dose).",
  },
  {
    ageMonths: 2,
    title: "6-week vaccinations",
    description:
      "Hepatitis B, diphtheria, tetanus, pertussis, polio, Hib, pneumococcal, rotavirus.",
  },
  {
    ageMonths: 4,
    title: "4-month vaccinations",
    description:
      "Hepatitis B, diphtheria, tetanus, pertussis, polio, Hib, pneumococcal, rotavirus.",
  },
  {
    ageMonths: 6,
    title: "6-month vaccinations",
    description:
      "Hepatitis B, diphtheria, tetanus, pertussis, polio, Hib.",
  },
  {
    ageMonths: 12,
    title: "12-month vaccinations",
    description: "Meningococcal ACWY, MMR, pneumococcal.",
  },
  {
    ageMonths: 18,
    title: "18-month vaccinations",
    description: "Diphtheria, tetanus, pertussis, Hib, MMR-V.",
  },
  {
    ageMonths: 48,
    title: "4-year vaccinations",
    description: "Diphtheria, tetanus, pertussis, polio.",
  },
  {
    ageMonths: 144,
    title: "12-year school vaccinations",
    description: "HPV, diphtheria, tetanus, pertussis, meningococcal ACWY.",
  },
];

function addMonthsClamped(base: Date, months: number): Date {
  const year = base.getUTCFullYear();
  const monthIndex = base.getUTCMonth() + months;
  const day = base.getUTCDate();
  // Use day 1 first to avoid month overflow (e.g. Jan 31 + 1 → Mar 3).
  const next = new Date(Date.UTC(year, monthIndex, 1));
  const lastDay = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
  ).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

export function generateVaccinationSuggestions(
  birthday: Date,
  now: Date = new Date(),
): VaccinationSuggestion[] {
  // Skip visits whose suggested date is more than ~1 month in the past;
  // those have probably already happened. Future-dated visits are kept.
  const graceMs = 30 * 24 * 60 * 60 * 1000;
  const cutoffMs = now.getTime() - graceMs;

  const suggestions: VaccinationSuggestion[] = [];
  for (const item of SCHEDULE) {
    const startDate = addMonthsClamped(birthday, item.ageMonths);
    if (startDate.getTime() < cutoffMs) continue;
    suggestions.push({
      title: item.title,
      description: item.description,
      startDate,
    });
  }
  return suggestions;
}
