import type { FastifyInstance } from "fastify";
import { checkoutSchema } from "./billing.schema.js";
import * as svc from "./billing.service.js";

const bearerSecurity = [{ bearerAuth: [] }];

export default async function billingRoutes(app: FastifyInstance) {
  // POST /billing/checkout
  app.post(
    "/checkout",
    {
      schema: {
        tags: ["Billing"],
        summary: "Create a Stripe checkout session",
        security: bearerSecurity,
        body: {
          type: "object",
          required: ["priceId"],
          properties: {
            priceId: { type: "string" },
            tenantId: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: { url: { type: ["string", "null"] } },
          },
          400: {
            type: "object",
            properties: { message: { type: "string" } },
          },
        },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      const { priceId, tenantId } = checkoutSchema.parse(req.body);
      try {
        const result = await svc.createCheckoutSession(req.user.sub, priceId, tenantId);
        return reply.send(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Checkout failed";
        return reply.badRequest(msg);
      }
    },
  );

  // POST /billing/portal
  app.post(
    "/portal",
    {
      schema: {
        tags: ["Billing"],
        summary: "Create a Stripe billing portal session",
        security: bearerSecurity,
        response: {
          200: {
            type: "object",
            properties: { url: { type: "string" } },
          },
          400: {
            type: "object",
            properties: { message: { type: "string" } },
          },
        },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      try {
        const result = await svc.createPortalSession(req.user.sub);
        return reply.send(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Portal session failed";
        return reply.badRequest(msg);
      }
    },
  );
}
