import type { ToolDefinition } from "./types.js";

const KNOWN_PAGES: Record<string, { label: string; path: string }> = {
  family: { label: "Family settings", path: "/settings" },
  children: { label: "Children", path: "/settings" },
  calendar: { label: "Calendar", path: "/calendar" },
  academy: { label: "Academy", path: "/academy" },
  learning: { label: "Academy", path: "/academy" },
  courses: { label: "Academy", path: "/academy" },
  articles: { label: "Articles", path: "/articles" },
  resources: { label: "Articles", path: "/articles" },
  settings: { label: "Settings", path: "/settings" },
  profile: { label: "Settings", path: "/settings" },
  billing: { label: "Settings", path: "/settings" },
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
          "Page slug. One of: family, children, calendar, academy, learning, courses, articles, resources, settings, profile, billing.",
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
