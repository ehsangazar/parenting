import type { FastifyInstance } from "fastify";
import { unlockModuleBodySchema } from "./learning.schema.js";
import * as svc from "./learning.service.js";
import * as repo from "./learning.repository.js";

const bearerSecurity = [{ bearerAuth: [] }];

function getLocale(req: { query: unknown; headers: Record<string, string | string[] | undefined> }): string {
  const q = (req.query as Record<string, string>).locale;
  if (q) return svc.resolveLocale(q);
  const header = (req.headers["accept-language"] as string | undefined)
    ?.split(",")[0]
    ?.split(";")[0]
    ?.trim();
  return svc.resolveLocale(header);
}

export default async function learningRoutes(app: FastifyInstance) {
  // GET /learning/courses
  app.get("/courses", {
    schema: {
      tags: ["Learning"],
      summary: "List all learning courses",
      security: bearerSecurity,
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const locale = getLocale(req);
    const courses = await svc.getCourses(locale);
    return reply.send({ courses });
  });

  // GET /learning/courses/:courseId
  app.get("/courses/:courseId", {
    schema: {
      tags: ["Learning"],
      summary: "Get a single course by ID",
      security: bearerSecurity,
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { courseId } = req.params as { courseId: string };
    const locale = getLocale(req);
    // Return phases/modules for this course (the course detail view)
    const phases = await svc.getCourseModules(courseId, req.user.sub, locale);
    return reply.send({ courseId, phases });
  });

  // GET /learning/resume
  app.get("/resume", {
    schema: {
      tags: ["Learning"],
      summary: "Get the user's resume target (continue where you left off)",
      security: bearerSecurity,
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const target = await svc.getResumeTarget(req.user.sub);
    return reply.send({ target });
  });

  // GET /learning/courses/:courseId/modules
  app.get("/courses/:courseId/modules", {
    schema: {
      tags: ["Learning"],
      summary: "List all modules for a course (grouped by phase)",
      security: bearerSecurity,
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { courseId } = req.params as { courseId: string };
    const locale = getLocale(req);
    const phases = await svc.getCourseModules(courseId, req.user.sub, locale);
    return reply.send({ phases });
  });

  // GET /learning/courses/:courseId/modules/:moduleId/lessons
  app.get("/courses/:courseId/modules/:moduleId/lessons", {
    schema: {
      tags: ["Learning"],
      summary: "List lessons in a module",
      security: bearerSecurity,
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { moduleId } = req.params as { courseId: string; moduleId: string };
    const userId = req.user.sub;
    const locale = getLocale(req);

    const ok = await svc.assertModuleAccessible(userId, moduleId, reply);
    if (!ok) return;

    const lessons = await svc.getLessonsForModule(moduleId, userId, locale);
    return reply.send({ lessons });
  });

  // GET /learning/courses/:courseId/modules/:moduleId/lessons/:lessonId
  app.get("/courses/:courseId/modules/:moduleId/lessons/:lessonId", {
    schema: {
      tags: ["Learning"],
      summary: "Get a single lesson",
      security: bearerSecurity,
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { moduleId, lessonId } = req.params as { courseId: string; moduleId: string; lessonId: string };
    const userId = req.user.sub;
    const locale = getLocale(req);

    const ok = await svc.assertModuleAccessible(userId, moduleId, reply);
    if (!ok) return;

    const lessons = await svc.getLessonsForModule(moduleId, userId, locale);
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) return reply.notFound("Lesson not found");
    return reply.send({ lesson });
  });

  // POST /learning/courses/:courseId/modules/:moduleId/lessons/:lessonId/complete
  app.post("/courses/:courseId/modules/:moduleId/lessons/:lessonId/complete", {
    schema: {
      tags: ["Learning"],
      summary: "Mark a lesson as complete",
      security: bearerSecurity,
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { lessonId } = req.params as { courseId: string; moduleId: string; lessonId: string };
    const result = await svc.completeLesson(req.user.sub, lessonId, reply);
    if (result === null) return;
    return reply.send(result);
  });

  // POST /learning/modules/:moduleId/unlock
  app.post("/modules/:moduleId/unlock", {
    schema: {
      tags: ["Learning"],
      summary: "Unlock a module by spending coins",
      security: bearerSecurity,
      body: {
        type: "object",
        properties: { moduleId: { type: "string" } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    // Accept optional body for compat but moduleId is in the route param
    const _parsed = unlockModuleBodySchema.safeParse(req.body);
    try {
      await svc.unlockModule(req.user.sub);
      return reply.send({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.badRequest(message);
    }
  });

  // GET /leaps/:leapNumber/playbooks
  app.get("/leaps/:leapNumber/playbooks", {
    schema: {
      tags: ["Learning"],
      summary: "List playbooks for a leap",
      security: bearerSecurity,
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { leapNumber } = req.params as { leapNumber: string };
    const leap = parseInt(leapNumber, 10);
    const userId = req.user.sub;
    const locale = getLocale(req);

    const eligible = await svc.hasEligibleChild(userId, leap);
    if (!eligible) {
      return reply.code(403).send({ error: "No child in the required age range for this leap" });
    }

    const playbooks = await svc.getPlaybooksForLeap(leap, userId, locale);
    return reply.send({ playbooks });
  });

  // GET /leaps/:leapNumber/playbooks/:id
  app.get("/leaps/:leapNumber/playbooks/:id", {
    schema: {
      tags: ["Learning"],
      summary: "Get a single playbook",
      security: bearerSecurity,
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { leapNumber, id } = req.params as { leapNumber: string; id: string };
    const leap = parseInt(leapNumber, 10);
    const userId = req.user.sub;
    const locale = getLocale(req);

    const eligible = await svc.hasEligibleChild(userId, leap);
    if (!eligible) {
      return reply.code(403).send({ error: "No child in the required age range for this leap" });
    }

    const playbook = await svc.getPlaybook(id, leap, userId, locale);
    if (!playbook) return reply.notFound("Playbook not found");
    return reply.send({ playbook });
  });

  // POST /leaps/:leapNumber/playbooks/:id/try
  app.post("/leaps/:leapNumber/playbooks/:id/try", {
    schema: {
      tags: ["Learning"],
      summary: "Mark a playbook as tried (awards coins on first try)",
      security: bearerSecurity,
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { leapNumber, id } = req.params as { leapNumber: string; id: string };
    const leap = parseInt(leapNumber, 10);
    const userId = req.user.sub;

    const eligible = await svc.hasEligibleChild(userId, leap);
    if (!eligible) {
      return reply.code(403).send({ error: "No child in the required age range for this leap" });
    }

    // Fetch the playbook to get groupNumber before updating progress
    const playbookRow = await repo.findPlaybookById(id, leap, userId, "en", false);
    if (!playbookRow) return reply.notFound("Playbook not found");

    const result = await svc.tryPlaybookWithGroup(userId, id, leap, playbookRow.groupNumber);
    return reply.send(result);
  });

  // ── Practice Loop ──────────────────────────────────────────────────────────

  // POST /lessons/:lessonId/practice — pledge to try a technique
  app.post("/lessons/:lessonId/practice", {
    schema: {
      tags: ["Learning"],
      summary: "Pledge to try a lesson technique with your child",
      security: bearerSecurity,
      body: {
        type: "object",
        required: ["technique"],
        properties: {
          technique: { type: "string", minLength: 1, maxLength: 280 },
          childId: { type: "string" },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { lessonId } = req.params as { lessonId: string };
    const body = req.body as { technique: string; childId?: string };
    try {
      const result = await svc.pledgePractice(req.user.sub, {
        lessonId,
        technique: body.technique,
        childId: body.childId ?? null,
      });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.badRequest(message);
    }
  });

  // GET /practice/pending — practices waiting on a reflection
  app.get("/practice/pending", {
    schema: {
      tags: ["Learning"],
      summary: "List pending practice reflections for the current user",
      security: bearerSecurity,
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const practices = await svc.listPendingPractices(req.user.sub);
    return reply.send({ practices });
  });

  // GET /practice/recap — rolling N-day summary for the WeeklyRecapCard
  app.get("/practice/recap", {
    schema: {
      tags: ["Learning"],
      summary: "Rolling N-day recap of pledges and reflections",
      security: bearerSecurity,
      querystring: {
        type: "object",
        properties: {
          days: { type: "integer", minimum: 1, maximum: 60 },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const q = req.query as { days?: number };
    const days = q.days ?? 7;
    const recap = await svc.getPracticeRecap(req.user.sub, days);
    return reply.send({ recap });
  });

  // POST /practice/:id/reflect — submit outcome
  app.post("/practice/:id/reflect", {
    schema: {
      tags: ["Learning"],
      summary: "Reflect on a practice (worked / mixed / didnt_work)",
      security: bearerSecurity,
      body: {
        type: "object",
        required: ["outcome"],
        properties: {
          outcome: { type: "string", enum: ["worked", "mixed", "didnt_work"] },
          note: { type: "string", maxLength: 500 },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { outcome: string; note?: string };
    try {
      const result = await svc.reflectPractice(req.user.sub, id, {
        outcome: body.outcome,
        note: body.note ?? null,
      });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.badRequest(message);
    }
  });

  // DELETE /practice/:id — dismiss a pending practice
  app.delete("/practice/:id", {
    schema: {
      tags: ["Learning"],
      summary: "Dismiss a pending practice",
      security: bearerSecurity,
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      await svc.dismissPractice(req.user.sub, id);
      return reply.send({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.badRequest(message);
    }
  });

  // POST /leaps/:leapNumber/playbooks/:id/complete-group
  app.post("/leaps/:leapNumber/playbooks/:id/complete-group", {
    schema: {
      tags: ["Learning"],
      summary: "Complete a playbook group (awards group bonus coins)",
      security: bearerSecurity,
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { leapNumber, id } = req.params as { leapNumber: string; id: string };
    const leap = parseInt(leapNumber, 10);
    const userId = req.user.sub;

    const eligible = await svc.hasEligibleChild(userId, leap);
    if (!eligible) {
      return reply.code(403).send({ error: "No child in the required age range for this leap" });
    }

    const playbookRow = await repo.findPlaybookById(id, leap, userId, "en", false);
    if (!playbookRow) return reply.notFound("Playbook not found");

    const result = await svc.tryPlaybookWithGroup(userId, id, leap, playbookRow.groupNumber);
    return reply.send(result);
  });
}
