import type { FastifyInstance } from "fastify";
import {
  updateUserRoleSchema,
  adminConversationsQuerySchema,
  idParamSchema,
  courseIdParamSchema,
  phaseIdParamSchema,
  moduleIdParamSchema,
  moduleDefaultsSchema,
  learningCourseSchema,
  learningPhaseSchema,
  learningModuleSchema,
  learningLessonSchema,
  reorderLessonsSchema,
} from "./admin.schema.js";
import * as svc from "./admin.service.js";

const bearerSecurity = [{ bearerAuth: [] }];

function requireAdmin(req: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply): boolean {
  if ((req.user as { role?: string })?.role !== "admin") {
    reply.forbidden("Admin only");
    return false;
  }
  return true;
}

export default async function adminRoutes(app: FastifyInstance) {
  // GET /admin/users
  app.get(
    "/users",
    {
      schema: {
        tags: ["Admin"],
        summary: "List all users",
        security: bearerSecurity,
        response: {
          200: {
            type: "object",
            properties: { users: { type: "array", items: { type: "object" } } },
          },
        },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const users = await svc.listUsers();
      return reply.send({ users });
    },
  );

  // PATCH /admin/users/:id
  app.patch(
    "/users/:id",
    {
      schema: {
        tags: ["Admin"],
        summary: "Update a user's role",
        security: bearerSecurity,
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
        body: {
          type: "object",
          required: ["role"],
          properties: { role: { type: "string", enum: ["user", "admin"] } },
        },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { id } = idParamSchema.parse(req.params);
      const { role } = updateUserRoleSchema.parse(req.body);
      const user = await svc.setUserRole(req.user.sub, id, role);
      return reply.send({ user });
    },
  );

  // DELETE /admin/users/:id
  app.delete(
    "/users/:id",
    {
      schema: {
        tags: ["Admin"],
        summary: "Delete a user",
        security: bearerSecurity,
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { id } = idParamSchema.parse(req.params);
      try {
        await svc.removeUser(req.user.sub, id);
        return reply.send({ success: true });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Delete failed";
        return reply.badRequest(msg);
      }
    },
  );

  // GET /admin/reports
  app.get(
    "/reports",
    {
      schema: {
        tags: ["Admin"],
        summary: "Get platform statistics",
        security: bearerSecurity,
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const data = await svc.getReports();
      return reply.send(data);
    },
  );

  // GET /admin/conversations
  app.get(
    "/conversations",
    {
      schema: {
        tags: ["Admin"],
        summary: "List all conversations with optional filters",
        security: bearerSecurity,
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            email: { type: "string" },
            dateFrom: { type: "string" },
            dateTo: { type: "string" },
          },
        },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const opts = adminConversationsQuerySchema.parse(req.query);
      const data = await svc.listConversations(opts);
      return reply.send(data);
    },
  );

  // GET /admin/conversations/:id/messages
  app.get(
    "/conversations/:id/messages",
    {
      schema: {
        tags: ["Admin"],
        summary: "Get all messages for a conversation",
        security: bearerSecurity,
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { id } = idParamSchema.parse(req.params);
      const convo = await svc.getConversationMessages(id);
      if (!convo) return reply.notFound("Conversation not found");
      return reply.send({
        conversation: { id: convo.id, createdAt: convo.createdAt, user: convo.user },
        messages: convo.messages,
      });
    },
  );

  // GET /admin/documents
  app.get(
    "/documents",
    {
      schema: {
        tags: ["Admin"],
        summary: "List all documents",
        security: bearerSecurity,
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const documents = await svc.listDocuments();
      return reply.send({ documents });
    },
  );

  // DELETE /admin/documents/:id
  app.delete(
    "/documents/:id",
    {
      schema: {
        tags: ["Admin"],
        summary: "Delete a document and its chunks",
        security: bearerSecurity,
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { id } = idParamSchema.parse(req.params);
      await svc.removeDocument(req.user.sub, id);
      return reply.send({ success: true });
    },
  );

  // GET /admin/modules
  app.get(
    "/modules",
    {
      schema: {
        tags: ["Admin"],
        summary: "Get module defaults and config",
        security: bearerSecurity,
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const data = await svc.getModules();
      return reply.send(data);
    },
  );

  // PUT /admin/modules
  app.put(
    "/modules",
    {
      schema: {
        tags: ["Admin"],
        summary: "Update module defaults",
        security: bearerSecurity,
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const body = moduleDefaultsSchema.parse(req.body);
      const defaults = await svc.saveModuleDefaults(req.user.sub, body);
      return reply.send({ defaults });
    },
  );

  // GET /admin/surveys
  app.get(
    "/surveys",
    {
      schema: {
        tags: ["Admin"],
        summary: "List all survey responses",
        security: bearerSecurity,
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const responses = await svc.listSurveys();
      return reply.send({ responses });
    },
  );

  // DELETE /admin/surveys/:id
  app.delete(
    "/surveys/:id",
    {
      schema: {
        tags: ["Admin"],
        summary: "Delete a survey response",
        security: bearerSecurity,
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { id } = idParamSchema.parse(req.params);
      await svc.removeSurvey(req.user.sub, id);
      return reply.send({ success: true });
    },
  );

  // ============================================================
  // Learning: Courses
  // ============================================================

  app.get(
    "/learning/courses",
    {
      schema: { tags: ["Admin"], summary: "List learning courses", security: bearerSecurity },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const courses = await svc.listCourses();
      return reply.send({ courses });
    },
  );

  app.post(
    "/learning/courses",
    {
      schema: { tags: ["Admin"], summary: "Create a learning course", security: bearerSecurity },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const body = learningCourseSchema.parse(req.body);
      const course = await svc.addCourse(req.user.sub, body);
      return reply.send({ course });
    },
  );

  app.put(
    "/learning/courses/:id",
    {
      schema: {
        tags: ["Admin"],
        summary: "Update a learning course",
        security: bearerSecurity,
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { id } = idParamSchema.parse(req.params);
      const body = learningCourseSchema.parse(req.body);
      const course = await svc.editCourse(req.user.sub, id, body);
      return reply.send({ course });
    },
  );

  app.delete(
    "/learning/courses/:id",
    {
      schema: {
        tags: ["Admin"],
        summary: "Delete a learning course",
        security: bearerSecurity,
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { id } = idParamSchema.parse(req.params);
      await svc.removeCourse(req.user.sub, id);
      return reply.send({ success: true });
    },
  );

  // ============================================================
  // Learning: Phases
  // ============================================================

  app.get(
    "/learning/courses/:courseId/phases",
    {
      schema: {
        tags: ["Admin"],
        summary: "List phases for a course",
        security: bearerSecurity,
        params: { type: "object", required: ["courseId"], properties: { courseId: { type: "string" } } },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { courseId } = courseIdParamSchema.parse(req.params);
      const phases = await svc.listPhases(courseId);
      return reply.send({ phases });
    },
  );

  app.post(
    "/learning/courses/:courseId/phases",
    {
      schema: {
        tags: ["Admin"],
        summary: "Create a phase for a course",
        security: bearerSecurity,
        params: { type: "object", required: ["courseId"], properties: { courseId: { type: "string" } } },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { courseId } = courseIdParamSchema.parse(req.params);
      const body = learningPhaseSchema.parse(req.body);
      const phase = await svc.addPhase(req.user.sub, courseId, body);
      return reply.send({ phase });
    },
  );

  app.put(
    "/learning/phases/:id",
    {
      schema: {
        tags: ["Admin"],
        summary: "Update a learning phase",
        security: bearerSecurity,
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { id } = idParamSchema.parse(req.params);
      const body = learningPhaseSchema.parse(req.body);
      const phase = await svc.editPhase(req.user.sub, id, body);
      return reply.send({ phase });
    },
  );

  app.delete(
    "/learning/phases/:id",
    {
      schema: {
        tags: ["Admin"],
        summary: "Delete a learning phase",
        security: bearerSecurity,
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { id } = idParamSchema.parse(req.params);
      await svc.removePhase(req.user.sub, id);
      return reply.send({ success: true });
    },
  );

  // ============================================================
  // Learning: Modules
  // ============================================================

  app.get(
    "/learning/phases/:phaseId/modules",
    {
      schema: {
        tags: ["Admin"],
        summary: "List modules for a phase",
        security: bearerSecurity,
        params: { type: "object", required: ["phaseId"], properties: { phaseId: { type: "string" } } },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { phaseId } = phaseIdParamSchema.parse(req.params);
      const modules = await svc.listModules(phaseId);
      return reply.send({ modules });
    },
  );

  app.post(
    "/learning/phases/:phaseId/modules",
    {
      schema: {
        tags: ["Admin"],
        summary: "Create a module for a phase",
        security: bearerSecurity,
        params: { type: "object", required: ["phaseId"], properties: { phaseId: { type: "string" } } },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { phaseId } = phaseIdParamSchema.parse(req.params);
      const body = learningModuleSchema.parse(req.body);
      const mod = await svc.addModule(req.user.sub, phaseId, body);
      return reply.send({ module: mod });
    },
  );

  app.put(
    "/learning/modules/:id",
    {
      schema: {
        tags: ["Admin"],
        summary: "Update a learning module",
        security: bearerSecurity,
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { id } = idParamSchema.parse(req.params);
      const body = learningModuleSchema.parse(req.body);
      const mod = await svc.editModule(req.user.sub, id, body);
      return reply.send({ module: mod });
    },
  );

  app.delete(
    "/learning/modules/:id",
    {
      schema: {
        tags: ["Admin"],
        summary: "Delete a learning module",
        security: bearerSecurity,
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { id } = idParamSchema.parse(req.params);
      await svc.removeModule(req.user.sub, id);
      return reply.send({ success: true });
    },
  );

  // ============================================================
  // Learning: Lessons
  // ============================================================

  app.get(
    "/learning/modules/:moduleId/lessons",
    {
      schema: {
        tags: ["Admin"],
        summary: "List lessons for a module",
        security: bearerSecurity,
        params: { type: "object", required: ["moduleId"], properties: { moduleId: { type: "string" } } },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { moduleId } = moduleIdParamSchema.parse(req.params);
      const lessons = await svc.listLessons(moduleId);
      return reply.send({ lessons });
    },
  );

  app.post(
    "/learning/modules/:moduleId/lessons",
    {
      schema: {
        tags: ["Admin"],
        summary: "Create a lesson for a module",
        security: bearerSecurity,
        params: { type: "object", required: ["moduleId"], properties: { moduleId: { type: "string" } } },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { moduleId } = moduleIdParamSchema.parse(req.params);
      const body = learningLessonSchema.parse(req.body);
      const lesson = await svc.addLesson(req.user.sub, moduleId, body);
      return reply.send({ lesson });
    },
  );

  app.put(
    "/learning/lessons/:id",
    {
      schema: {
        tags: ["Admin"],
        summary: "Update a learning lesson",
        security: bearerSecurity,
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { id } = idParamSchema.parse(req.params);
      const body = learningLessonSchema.partial().parse(req.body);
      const lesson = await svc.editLesson(req.user.sub, id, body);
      return reply.send({ lesson });
    },
  );

  app.delete(
    "/learning/lessons/:id",
    {
      schema: {
        tags: ["Admin"],
        summary: "Delete a learning lesson",
        security: bearerSecurity,
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { id } = idParamSchema.parse(req.params);
      await svc.removeLesson(req.user.sub, id);
      return reply.send({ success: true });
    },
  );

  app.post(
    "/learning/lessons/reorder",
    {
      schema: {
        tags: ["Admin"],
        summary: "Reorder lessons by ID array",
        security: bearerSecurity,
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { lessonIds } = reorderLessonsSchema.parse(req.body);
      await svc.reorderLessons(lessonIds);
      return reply.send({ success: true });
    },
  );
}
