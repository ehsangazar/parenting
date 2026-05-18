import type { ToolDefinition } from "./types.js";

const KNOWN_PAGES: Record<string, { label: string; path: string }> = {
  family: { label: "Family", path: "/app/family" },
  children: { label: "Children", path: "/app/family" },
  calendar: { label: "Calendar", path: "/app/calendar" },
  moments: { label: "Moments", path: "/app/moments" },
  milestones: { label: "Moments", path: "/app/moments" },
  village: { label: "Village (community)", path: "/app/village" },
  community: { label: "Village (community)", path: "/app/village" },
  learning: { label: "Learning", path: "/app/learn" },
  courses: { label: "Learning", path: "/app/learn" },
  articles: { label: "Resources", path: "/app/resources" },
  resources: { label: "Resources", path: "/app/resources" },
  settings: { label: "Settings", path: "/app/settings" },
  profile: { label: "Settings", path: "/app/settings" },
  billing: { label: "Settings", path: "/app/settings" },
};

const suggestPage: ToolDefinition = {
  name: "navigation_suggest_page",
  description:
    "Offer the user a link to a relevant page in the app. Returns a nav card the UI will render as a tappable chip below your reply. Use sparingly, when the user's intent points to a specific page (e.g. 'I want to see my calendar', 'where do I edit my profile?').",
  parameters: {
    type: "object",
    properties: {
      page: {
        type: "string",
        description:
          "Page slug. One of: family, children, calendar, moments, milestones, village, community, learning, courses, articles, resources, settings, profile, billing.",
      },
      label: {
        type: "string",
        description: "Optional override for the chip label.",
      },
    },
    required: ["page"],
    additionalProperties: false,
  },
  statusLabel: () => "Finding the right page",
  async execute(args) {
    const key = String(args.page ?? "").toLowerCase();
    const page = KNOWN_PAGES[key];
    if (!page) {
      return {
        ok: false,
        summary: `Unknown page "${key}". Known: ${Object.keys(KNOWN_PAGES).join(", ")}.`,
        error: "unknown_page",
      };
    }
    const label = args.label ? String(args.label) : page.label;
    return {
      ok: true,
      summary: `Suggested page: ${page.label}.`,
      navCards: [{ type: "navLink", label, to: page.path }],
    };
  },
};

export const navigationTools: ToolDefinition[] = [suggestPage];
