import { sendPushToUser } from "../../domains/notifications/notifications.service.js";
import {
  findPracticesReadyForNudge,
  markPracticeNudged,
} from "../../domains/learning/learning.repository.js";

type Logger = { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void };

export const dispatchPracticeNudges = async (logger?: Logger) => {
  const now = new Date();
  const due = await findPracticesReadyForNudge(now, 50);
  if (due.length === 0) return { sent: 0 };

  let sent = 0;
  for (const practice of due) {
    const childPart = practice.child?.name ? ` with ${practice.child.name}` : "";
    const title = "How did it go?";
    const body = `You pledged to try "${practice.technique}"${childPart}. Tap to reflect.`;
    try {
      await sendPushToUser(practice.userId, {
        title,
        body,
        topic: "courseReminders",
        url: `/app/academy?reflect=${practice.id}`,
        tag: `practice-${practice.id}`,
      });
      await markPracticeNudged(practice.id);
      sent += 1;
    } catch (err) {
      logger?.error(
        { err, practiceId: practice.id, userId: practice.userId },
        "reminders: practice nudge failed",
      );
    }
  }
  return { sent };
};
