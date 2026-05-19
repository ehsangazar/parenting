import type { FastifyInstance } from "fastify";
import {
  subscribeBodySchema,
  unsubscribeBodySchema,
  sendTestBodySchema,
} from "./notifications.schema.js";
import * as svc from "./notifications.service.js";

const bearerSecurity = [{ bearerAuth: [] }];

const okResponse = {
  200: {
    type: "object",
    properties: { ok: { type: "boolean" } },
  },
};

export default async function notificationsRoutes(app: FastifyInstance) {
  app.get("/push/config", {
    schema: {
      tags: ["Notifications"],
      summary: "Whether push notifications are configured on this server",
      response: {
        200: {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
            publicKey: { type: "string" },
          },
        },
      },
    },
  }, async () => ({
    enabled: svc.isPushConfigured(),
    publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  }));

  app.post("/push/subscribe", {
    schema: {
      tags: ["Notifications"],
      summary: "Register a Web Push subscription for the authenticated user",
      security: bearerSecurity,
      body: {
        type: "object",
        required: ["subscription"],
        properties: {
          subscription: {
            type: "object",
            required: ["endpoint", "keys"],
            properties: {
              endpoint: { type: "string", format: "uri" },
              keys: {
                type: "object",
                required: ["p256dh", "auth"],
                properties: {
                  p256dh: { type: "string" },
                  auth: { type: "string" },
                },
              },
            },
          },
          userAgent: { type: "string", maxLength: 500 },
          timeZone: { type: "string", maxLength: 100 },
        },
      },
      response: {
        ...okResponse,
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const body = subscribeBodySchema.parse(req.body);
    await svc.subscribe(req.user.sub, body.subscription, body.userAgent, body.timeZone);
    return reply.send({ ok: true });
  });

  app.post("/push/unsubscribe", {
    schema: {
      tags: ["Notifications"],
      summary: "Remove a stored Web Push subscription",
      security: bearerSecurity,
      body: {
        type: "object",
        required: ["endpoint"],
        properties: { endpoint: { type: "string", format: "uri" } },
      },
      response: {
        ...okResponse,
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const body = unsubscribeBodySchema.parse(req.body);
    await svc.unsubscribe(body.endpoint);
    return reply.send({ ok: true });
  });

  app.post("/push/test", {
    schema: {
      tags: ["Notifications"],
      summary: "Send a test push to all of the authenticated user's subscriptions",
      security: bearerSecurity,
      body: {
        type: "object",
        properties: {
          title: { type: "string", maxLength: 120 },
          body: { type: "string", maxLength: 500 },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            sent: { type: "number" },
            removed: { type: "number" },
            skipped: { type: ["string", "null"] },
          },
        },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const body = sendTestBodySchema.parse(req.body ?? {});
    const result = await svc.sendTest(req.user.sub, body.title, body.body);
    return reply.send(result);
  });
}
