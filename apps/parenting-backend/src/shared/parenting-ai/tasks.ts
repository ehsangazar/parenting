import { Prisma } from "@prisma/client";
import { prisma } from "../db/index.js";
import { getOpenAI } from "./openai.js";
import { Task, CalendarEventSchema, ReminderSchema, MilestoneSchema, BehaviorSchema } from "./types.js";

export async function executeTask(
  userId: string,
  task: Task,
  familyId?: string,
): Promise<{ success: boolean; result?: string; error?: string }> {
  if (!task.confirmed) return { success: false, error: "Task not confirmed" };

  let targetFamilyId = familyId;
  if (!targetFamilyId) {
    const family = await prisma.family.findFirst({ where: { ownerId: userId } });
    targetFamilyId = family?.id;
  }
  if (!targetFamilyId) return { success: false, error: "No family found for user." };

  try {
    switch (task.type) {
      case "create_calendar_event": {
        const params = CalendarEventSchema.parse(task.parameters);
        const child = await prisma.child.findFirst({ where: { familyId: targetFamilyId } });
        if (!child) throw new Error("No child found to assign event to.");
        await prisma.calendarEvent.create({
          data: {
            familyId: targetFamilyId,
            childId: child.id,
            title: params.title,
            startDate: new Date(params.startTime),
            endDate: params.endTime
              ? new Date(params.endTime)
              : new Date(new Date(params.startTime).getTime() + 3600000),
            description: params.description,
            eventType: "appointment",
            createdBy: userId,
          },
        });
        return { success: true, result: `Event "${params.title}" created.` };
      }

      case "set_reminder":
      case "add_follow_up": {
        const params = ReminderSchema.parse(task.parameters);
        const child = await prisma.child.findFirst({ where: { familyId: targetFamilyId } });
        if (!child) throw new Error("No child found.");
        await prisma.calendarEvent.create({
          data: {
            familyId: targetFamilyId,
            childId: child.id,
            title: params.title,
            startDate: new Date(params.time),
            eventType: "reminder",
            createdBy: userId,
          },
        });
        return { success: true, result: `Reminder "${params.title}" set for ${params.time}.` };
      }

      case "log_milestone": {
        const params = MilestoneSchema.parse(task.parameters);
        await prisma.moment.create({
          data: {
            familyId: targetFamilyId,
            title: params.milestone,
            description: params.notes,
            momentType: "milestone",
            createdBy: userId,
            createdAt: params.date ? new Date(params.date) : new Date(),
          },
        });
        return { success: true, result: `Milestone "${params.milestone}" logged.` };
      }

      case "track_behavior": {
        const params = BehaviorSchema.parse(task.parameters);
        await prisma.moment.create({
          data: {
            familyId: targetFamilyId,
            title: `Behavior: ${params.behaviorType}`,
            description: `${params.severity ? `Severity: ${params.severity}. ` : ""}${params.notes ?? ""}`,
            momentType: "everyday",
            createdBy: userId,
          },
        });
        return { success: true, result: `Behavior "${params.behaviorType}" tracked.` };
      }

      case "search_articles": {
        const raw = task.parameters as Record<string, unknown>;
        const query =
          (typeof raw.query === "string" && raw.query) ||
          (typeof raw.search === "string" && raw.search) ||
          "";
        if (!query) return { success: false, error: "No search query provided." };

        const articles = await prisma.article.findMany({
          where: {
            published: true,
            OR: [
              { title: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { excerpt: { contains: query, mode: Prisma.QueryMode.insensitive } },
            ],
          },
          take: 3,
        });

        if (articles.length === 0) {
          return { success: true, result: "I couldn't find any articles specifically matching that. I'll provide some general guidance instead." };
        }

        const articleLinks = articles
          .map((a) => `\n[${a.title}](/app/resources/${a.slug})\n${a.excerpt}`)
          .join("\n");
        return { success: true, result: `I found these articles that might help:\n\n${articleLinks}\n\nYou can click any of them to read more.` };
      }

      default:
        return { success: false, error: "Unsupported task type" };
    }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function parseTask(text: string, _context: unknown): Promise<Task | null> {
  const client = getOpenAI();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Extract a task from the user's message.
Supported types: create_calendar_event, set_reminder, log_milestone, track_behavior, add_follow_up, search_articles.
For search_articles, extract the search query into a "query" parameter.
Return JSON with "type" and "parameters" matching the schema.
If parameters are missing, include them as null.
If no task, return { "type": null }.
Current time: ${new Date().toISOString()}`,
      },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
  if (!parsed.type) return null;

  return { type: parsed.type, parameters: parsed.parameters, confirmed: false };
}
