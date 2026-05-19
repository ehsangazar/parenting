import type { NotificationPrefs } from "../identity/identity.types.js";

export type PushTopic = keyof NotificationPrefs["topics"];

export interface PushPayload {
  title: string;
  body: string;
  topic?: PushTopic;
  url?: string;
  tag?: string;
}

export interface SendResult {
  sent: number;
  removed: number;
  skipped: "quiet_hours" | "channel_off" | "topic_off" | "no_subscriptions" | null;
}
