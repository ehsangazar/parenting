import * as Sentry from "@sentry/node";
import { env } from "./config/env.js";

// Production-only: a misconfigured local .env should never ship dev errors to GlitchTip.
if (env.NODE_ENV === "production" && env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.01,
  });
}
