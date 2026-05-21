import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  chatQuerySchema,
  listConversationsQuerySchema,
  conversationIdParamSchema,
  importGuestConversationSchema,
} from "./assistant.schema.js";
import * as svc from "./assistant.service.js";

const guestQuerySchema = z.object({
  message: z.string().min(1).max(1200),
  locale: z.string().min(2).max(10).optional(),
});

const bearerSecurity = [{ bearerAuth: [] }];

function writeSSE(
  reply: import("fastify").FastifyReply,
  event: string | null,
  data: string,
): boolean {
  if (reply.raw.writableEnded || !reply.raw.writable) return false;
  try {
    if (event) reply.raw.write(`event: ${event}\n`);
    for (const line of data.split("\n")) {
      reply.raw.write(`data: ${line}\n`);
    }
    reply.raw.write("\n");
    return true;
  } catch {
    return false;
  }
}

export default async function assistantRoutes(app: FastifyInstance) {
  // GET /chat/conversations
  app.get(
    "/conversations",
    {
      schema: {
        tags: ["Assistant"],
        summary: "List conversations for the authenticated user",
        security: bearerSecurity,
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
            offset: { type: "integer", minimum: 0, default: 0 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              conversations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    preview: { type: ["string", "null"] },
                  },
                },
              },
              hasMore: { type: "boolean" },
            },
          },
        },
      },
      preHandler: [app.authenticate],
    },
    async (req) => {
      const { limit, offset } = listConversationsQuerySchema.parse(req.query);
      return svc.listConversations(req.user.sub, limit, offset);
    },
  );

  // POST /chat/conversations/import-guest
  // Seeds a new server-side conversation with a guest's pre-signup chat so they
  // can pick up where they left off in `/chat`. Heavily capped on size in the
  // schema; content goes through the same PII/blocklist scrubbing as a normal
  // send because it originated from an unauthenticated channel.
  app.post(
    "/conversations/import-guest",
    {
      schema: {
        tags: ["Assistant"],
        summary: "Import a guest's pre-signup conversation into history",
        security: bearerSecurity,
        body: {
          type: "object",
          required: ["messages"],
          properties: {
            locale: { type: "string", minLength: 2, maxLength: 10 },
            messages: {
              type: "array",
              minItems: 1,
              maxItems: 20,
              items: {
                type: "object",
                required: ["role", "content"],
                properties: {
                  role: { type: "string", enum: ["user", "assistant"] },
                  content: { type: "string", minLength: 1, maxLength: 8000 },
                },
              },
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: { conversationId: { type: "string" } },
          },
          413: {
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      const body = importGuestConversationSchema.parse(req.body);
      const result = await svc.importGuestConversation(
        req.user.sub,
        body.messages,
        body.locale ?? null,
      );
      if ("error" in result) {
        return reply.code(result.status as 413).send({ error: result.error });
      }
      return result;
    },
  );

  // POST /chat/conversations
  app.post(
    "/conversations",
    {
      schema: {
        tags: ["Assistant"],
        summary: "Create a new conversation",
        security: bearerSecurity,
        response: {
          200: {
            type: "object",
            properties: {
              conversation: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
      },
      preHandler: [app.authenticate],
    },
    async (req) => {
      const conversation = await svc.createConversation(req.user.sub);
      return { conversation };
    },
  );

  // GET /chat/conversations/:id/messages
  app.get(
    "/conversations/:id/messages",
    {
      schema: {
        tags: ["Assistant"],
        summary: "Get messages for a conversation",
        security: bearerSecurity,
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
        response: {
          200: {
            type: "object",
            properties: {
              messages: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    conversationId: { type: "string" },
                    role: { type: "string" },
                    content: { type: "string" },
                    docTypeFilter: { type: ["string", "null"] },
                    citations: {},
                    flagged: { type: "boolean" },
                    locale: { type: ["string", "null"] },
                    createdAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          404: {
            type: "object",
            properties: { message: { type: "string" } },
          },
        },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      const { id } = conversationIdParamSchema.parse(req.params);
      const messages = await svc.getConversationMessages(id, req.user.sub);
      if (!messages) return reply.notFound();
      return { messages };
    },
  );

  // DELETE /chat/conversations/:id
  app.delete(
    "/conversations/:id",
    {
      schema: {
        tags: ["Assistant"],
        summary: "Delete a conversation",
        security: bearerSecurity,
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
        response: {
          200: {
            type: "object",
            properties: { success: { type: "boolean" } },
          },
          404: {
            type: "object",
            properties: { message: { type: "string" } },
          },
        },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      const { id } = conversationIdParamSchema.parse(req.params);
      const ok = await svc.removeConversation(id, req.user.sub);
      if (!ok) return reply.notFound();
      return { success: true };
    },
  );

  // POST /chat/query (SSE streaming)
  app.post(
    "/query",
    {
      schema: {
        tags: ["Assistant"],
        summary: "Send a message and stream the AI response via SSE",
        security: bearerSecurity,
        body: {
          type: "object",
          required: ["message"],
          properties: {
            conversationId: { type: "string" },
            message: { type: "string", minLength: 1 },
            docTypeFilter: { type: "string" },
            locale: { type: "string" },
            clientMessageId: { type: "string", minLength: 1, maxLength: 128 },
          },
        },
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      try {
        const body = chatQuerySchema.parse(req.body);
        const user = req.user as { sub: string; role: string };

        const headers: Record<string, string> = {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        };
        if (req.headers.origin) {
          headers["Access-Control-Allow-Origin"] = req.headers.origin;
          headers["Access-Control-Allow-Credentials"] = "true";
        }
        reply.raw.writeHead(200, headers);

        const result = await svc.runQuery(
          user.sub,
          user.role,
          body,
          {
            onStream: (chunk) => writeSSE(reply, null, chunk),
            onStatus: (status) => writeSSE(reply, "status", status),
            onToolStart: (payload) =>
              writeSSE(reply, "tool_start", JSON.stringify(payload)),
            onToolFinish: (payload) =>
              writeSSE(reply, "tool_finish", JSON.stringify(payload)),
            onNavCard: (card) => writeSSE(reply, "nav_card", JSON.stringify(card)),
            onCard: (card) => writeSSE(reply, "card", JSON.stringify(card)),
          },
        );

        if ("error" in result) {
          writeSSE(reply, "error", JSON.stringify({ error: result.error }));
        } else {
          writeSSE(
            reply,
            "thinking",
            JSON.stringify({ status: "processing", conversationId: result.conversationId }),
          );
          writeSSE(reply, "done", "");
        }

        try {
          reply.raw.end();
        } catch {
          // Already closed, ignore
        }
      } catch (error) {
        req.log.error(error);
        if (!reply.raw.headersSent) {
          reply.status(500).send({ error: "Internal Server Error" });
        } else {
          writeSSE(reply, "error", JSON.stringify({ error: "An error occurred" }));
          try {
            reply.raw.end();
          } catch {
            // Already closed, ignore
          }
        }
      }
    },
  );

  // POST /chat/guest-query (SSE streaming, no auth)
  // One-turn taste of Raised for logged-out visitors. Bypasses the orchestrator
  // entirely: no tools, no retrieval, no DB writes. IP-rate-limited so it
  // can't be used as a free LLM proxy.
  app.post(
    "/guest-query",
    {
      schema: {
        tags: ["Assistant"],
        summary: "One-turn AI reply for unauthenticated visitors (SSE)",
        body: {
          type: "object",
          required: ["message"],
          properties: {
            message: { type: "string", minLength: 1, maxLength: 1200 },
            locale: { type: "string", minLength: 2, maxLength: 10 },
          },
        },
      },
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 hour",
        },
      },
    },
    async (req, reply) => {
      try {
        const body = guestQuerySchema.parse(req.body);

        const headers: Record<string, string> = {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        };
        if (req.headers.origin) {
          headers["Access-Control-Allow-Origin"] = req.headers.origin;
          headers["Access-Control-Allow-Credentials"] = "true";
        }
        reply.raw.writeHead(200, headers);

        await svc.runGuestQuery(
          body.message,
          body.locale ?? null,
          (chunk) => writeSSE(reply, null, chunk),
          req.ip ?? null,
        );
        writeSSE(reply, "done", "");

        try {
          reply.raw.end();
        } catch {
          // Already closed, ignore
        }
      } catch (error) {
        req.log.error(error);
        if (!reply.raw.headersSent) {
          reply.status(500).send({ error: "Internal Server Error" });
        } else {
          writeSSE(reply, "error", JSON.stringify({ error: "An error occurred" }));
          try {
            reply.raw.end();
          } catch {
            // Already closed, ignore
          }
        }
      }
    },
  );

  // GET /chat/usage — daily AI cap status
  app.get(
    "/usage",
    {
      schema: {
        tags: ["Assistant"],
        summary: "Get the user's daily AI message usage and cap",
        security: bearerSecurity,
      },
      preHandler: [app.authenticate],
    },
    async (req) => {
      return svc.getDailyAiUsage(req.user.sub);
    },
  );

  // POST /chat/usage/topup — spend coins for extra messages today
  app.post(
    "/usage/topup",
    {
      schema: {
        tags: ["Assistant"],
        summary: "Buy a coin-funded AI message top-up for today",
        security: bearerSecurity,
      },
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      try {
        return await svc.purchaseAiTopup(req.user.sub);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return reply.badRequest(message);
      }
    },
  );
}
