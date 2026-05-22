import { env } from "../../config/env.js";

// Fire-and-forget client for Loop CRM. Posts a lead-upsert payload to
// https://loop.gazar.dev/api/webhooks/lead. Caller should `.catch()` the
// returned promise; do NOT await blockingly in user-facing request handlers.

export type LoopInteractionKind =
  | "email_sent"
  | "email_received"
  | "call_booked"
  | "call_done"
  | "note";

export type LoopLeadPayload = {
  productSlug: string;
  email: string;
  name?: string;
  source?: string;
  country?: string;
  theirOneQuestion?: string;
  customFields?: Record<string, unknown>;
  tags?: string[];
  interaction?: {
    kind: LoopInteractionKind;
    subject?: string;
    body?: string;
    externalId?: string;
    occurredAt?: string;
  };
};

const TIMEOUT_MS = 5000;

export async function notifyLoopLead(payload: LoopLeadPayload): Promise<void> {
  if (!env.LOOP_WEBHOOK_URL || !env.LOOP_WEBHOOK_SECRET) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${env.LOOP_WEBHOOK_URL}/api/webhooks/lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.LOOP_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Loop webhook ${res.status}: ${text.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}
