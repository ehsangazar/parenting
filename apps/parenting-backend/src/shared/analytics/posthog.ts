import { PostHog } from "posthog-node";
import { env } from "../../config/env.js";

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!env.POSTHOG_API_KEY) return null;
  if (!client) {
    client = new PostHog(env.POSTHOG_API_KEY, {
      host: env.POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 20,
      flushInterval: 10_000,
    });
  }
  return client;
}

/**
 * Fire-and-forget capture for backend events. Safe to call when PostHog
 * isn't configured (becomes a no-op). Never throws to the caller.
 */
export function capture(distinctId: string, event: string, properties?: Record<string, unknown>): void {
  const c = getClient();
  if (!c) return;
  try {
    c.capture({ distinctId, event, properties });
  } catch {
    // never let analytics break a request path
  }
}

/**
 * Drain queued events. Call from graceful-shutdown handlers.
 */
export async function shutdown(): Promise<void> {
  if (!client) return;
  try {
    await client.shutdown();
  } catch {
    // best-effort
  }
}
