<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Raised parenting frontend. PostHog is already initialized in `src/main.tsx` with `PostHogProvider` and `PostHogErrorBoundary` wrapping the entire app tree. Users are identified by their database ID on every successful login (email, Google OAuth). Eighteen business-critical events are tracked across seven files, covering the full user lifecycle from marketing lead through daily product engagement and churn.

## Environment variables

Updated in `.env`:

| Variable | Purpose |
|---|---|
| `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` | PostHog project token |
| `VITE_PUBLIC_POSTHOG_HOST` | PostHog ingestion host |

## Event tracking

| Event | Description | File |
|---|---|---|
| `user_signed_up` | User created an account with email and password | `src/pages/LoginPage.tsx` |
| `user_logged_in` | User signed in with email and password | `src/pages/LoginPage.tsx` |
| `user_logged_in_with_google` | User signed in via Google OAuth | `src/pages/LoginPage.tsx` |
| `onboarding_completed` | User finished the full onboarding flow (profile, family, goals) | `src/pages/onboarding/OnboardingPage.tsx` |
| `onboarding_partner_invited` | User invited a partner during onboarding | `src/pages/onboarding/OnboardingPage.tsx` |
| `lesson_started` | User opened a lesson inside a course | `src/pages/app/CourseDetailPage.tsx` |
| `lesson_completed` | User marked a lesson complete and earned coins | `src/pages/app/CourseDetailPage.tsx` |
| `course_opened` | User clicked a course card on the Academy listing page | `src/pages/app/AcademyPage.tsx` |
| `chat_message_sent` | Authenticated user sent a message to the AI assistant | `src/components/chat-shell/ChatPanel.tsx` |
| `family_member_invited` | User sent a family member invitation by email | `src/pages/app/FamilyManagement.tsx` |
| `child_added` | User added a child to the family | `src/pages/app/FamilyManagement.tsx` |
| `family_created` | User created a new family unit | `src/pages/app/FamilyManagement.tsx` |
| `lead_captured` | Visitor submitted their email via the lead capture form | `src/components/LeadCapture.tsx` |
| `profile_updated` | User saved changes to their display name | `src/pages/app/SettingsPage.tsx` |
| `app_installed` | User accepted the PWA install prompt | `src/pages/app/SettingsPage.tsx` |
| `user_signed_out` | User confirmed sign-out; PostHog session reset | `src/pages/app/SettingsPage.tsx` |
| `account_deleted` | User deleted their account — critical churn event; PostHog session reset | `src/pages/app/SettingsPage.tsx` |
| `survey_completed` | Visitor submitted the marketing survey | `src/pages/SurveyPage.tsx` |

## User identification

`posthog.identify(userId, { email })` is called on all three successful sign-in paths (email login, Google OAuth). `posthog.reset()` is called on sign-out and account deletion to dissociate the device from the user profile.

## Error tracking

`PostHogErrorBoundary` wraps the full React tree in `src/main.tsx`, automatically capturing unhandled React render errors.

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1603408)
- [New signups over time](/insights/t0NceIBq) — daily signup trend (last 30 days)
- [User acquisition funnel](/insights/CP2IR6v1) — signup to onboarding to first lesson
- [Lesson engagement](/insights/NvjkpQNf) — lessons started vs completed
- [AI chat activity](/insights/IuQd34LH) — daily message volume to the parenting assistant
- [Churn signals](/insights/xTUp6Sdg) — sign-outs and account deletions over time

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-react-react-router-6/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
