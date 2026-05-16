import type { FastifyInstance } from "fastify";
import {
  chatQuerySchema,
  listConversationsQuerySchema,
  conversationIdParamSchema,
} from "./assistant.schema.js";
import * as svc from "./assistant.service.js";

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
              messages: { type: "array", items: { type: "object" } },
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
}
