import { OpenPanel } from "@openpanel/sdk";
import { env } from "../../config/env.js";

let client: OpenPanel | null = null;

function getClient(): OpenPanel | null {
  if (!env.OPENPANEL_CLIENT_ID || !env.OPENPANEL_CLIENT_SECRET) return null;
  if (env.NODE_ENV !== "production") return null;
  if (!client) {
    client = new OpenPanel({
      apiUrl: env.OPENPANEL_API_URL ?? "https://openpanel-api.gazar.dev",
      clientId: env.OPENPANEL_CLIENT_ID,
      clientSecret: env.OPENPANEL_CLIENT_SECRET,
    });
  }
  return client;
}

/**
 * Fire-and-forget capture for backend events. Safe to call when OpenPanel
 * isn't configured (becomes a no-op). Never throws to the caller.
 */
export function capture(distinctId: string, event: string, properties?: Record<string, unknown>): void {
  const c = getClient();
  if (!c) return;
  try {
    void c.track(event, { profileId: distinctId, ...properties });
  } catch {
    // never let analytics break a request path
  }
}

export async function shutdown(): Promise<void> {
  if (!client) return;
  try {
    client.flush();
  } catch {
    // best-effort
  }
}
