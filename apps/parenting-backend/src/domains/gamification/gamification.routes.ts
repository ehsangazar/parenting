import type { FastifyInstance } from "fastify";
import { leaderboardQuerySchema, optInBodySchema } from "./gamification.schema.js";
import * as svc from "./gamification.service.js";

const bearerSecurity = [{ bearerAuth: [] }];

export default async function gamificationRoutes(app: FastifyInstance) {
  // GET /gamification/profile
  app.get("/gamification/profile", {
    schema: {
      tags: ["Gamification"],
      summary: "Get the current user's coins and streak profile",
      security: bearerSecurity,
      response: {
        200: {
          type: "object",
          properties: {
            coins: {
              type: "object",
              properties: {
                balance: { type: "number" },
                earned: { type: "number" },
              },
            },
            insight: {
              type: "object",
              properties: {
                total: { type: "number" },
                level: { type: "number" },
                currentLevelStart: { type: "number" },
                nextLevelAt: { type: "number" },
                progress: { type: "number" },
              },
            },
            streak: {
              type: "object",
              properties: {
                current: { type: "number" },
                longest: { type: "number" },
                lastActiveDate: { type: "string", nullable: true },
                freezesAvailable: { type: "number" },
              },
            },
          },
        },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req) => {
    return svc.getGamificationProfile(req.user.sub);
  });

  // POST /gamification/streak-freeze
  app.post("/gamification/streak-freeze", {
    schema: {
      tags: ["Gamification"],
      summary: "Buy a streak freeze using coins",
      security: bearerSecurity,
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            freezesAvailable: { type: "number" },
          },
        },
        400: { description: "Bad request", type: "object", properties: { message: { type: "string" } } },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    try {
      const result = await svc.buyStreakFreeze(req.user.sub);
      return { success: true, ...result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.badRequest(message);
    }
  });

  // GET /leaderboard
  app.get("/leaderboard", {
    schema: {
      tags: ["Gamification"],
      summary: "Get the leaderboard",
      security: bearerSecurity,
      querystring: {
        type: "object",
        properties: {
          scope: { type: "string", enum: ["community", "village", "family"], default: "community" },
          metric: { type: "string", enum: ["xp", "streak", "learning", "community"], default: "xp" },
          period: { type: "string", enum: ["week", "month", "alltime"], default: "week" },
          familyId: { type: "string" },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const parsed = leaderboardQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.badRequest("Invalid query parameters");

    const { scope, metric, period, familyId } = parsed.data;
    return svc.getLeaderboard({ userId: req.user.sub, scope, metric, period, familyId });
  });

  // GET /leaderboard/me
  app.get("/leaderboard/me", {
    schema: {
      tags: ["Gamification"],
      summary: "Get the current user's leaderboard entry",
      security: bearerSecurity,
      querystring: {
        type: "object",
        properties: {
          scope: { type: "string", enum: ["community", "village", "family"], default: "community" },
          metric: { type: "string", enum: ["xp", "streak", "learning", "community"], default: "xp" },
          period: { type: "string", enum: ["week", "month", "alltime"], default: "week" },
          familyId: { type: "string" },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const parsed = leaderboardQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.badRequest("Invalid query parameters");

    const { scope, metric, period, familyId } = parsed.data;
    const entry = await svc.getLeaderboardMe({ userId: req.user.sub, scope, metric, period, familyId });
    return reply.send({ entry });
  });

  // PUT /leaderboard/me/opt-in
  app.put("/leaderboard/me/opt-in", {
    schema: {
      tags: ["Gamification"],
      summary: "Update the current user's leaderboard opt-in preference",
      security: bearerSecurity,
      body: {
        type: "object",
        required: ["optIn"],
        properties: { optIn: { type: "boolean" } },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            optedIn: { type: "boolean" },
          },
        },
        400: { description: "Bad request", type: "object", properties: { message: { type: "string" } } },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const parsed = optInBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest("Invalid request body");

    return svc.setLeaderboardOptIn(req.user.sub, parsed.data.optIn);
  });
}
