import type { FastifyInstance } from "fastify";
import { publicArticlesQuerySchema } from "./content.schema.js";
import * as svc from "./content.service.js";

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

export default async function contentRoutes(app: FastifyInstance) {
  // GET /articles/public
  app.get("/articles/public", {
    schema: {
      tags: ["Content"],
      summary: "List published articles (public, no auth required)",
      querystring: {
        type: "object",
        properties: {
          categoryId: { type: "string" },
          search: { type: "string" },
          limit: { type: "number", default: 10 },
          offset: { type: "number", default: 0 },
          locale: { type: "string" },
        },
      },
    },
  }, async (req, reply) => {
    const parsed = publicArticlesQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.badRequest("Invalid query parameters");

    const locale = getLocale(req);
    const { categoryId, search, limit, offset } = parsed.data;

    const result = await svc.getPublicArticles({ categoryId, search, limit, offset, locale });
    return reply.send(result);
  });

  // GET /articles/:id
  app.get("/articles/:id", {
    schema: {
      tags: ["Content"],
      summary: "Get a single published article by ID",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const locale = getLocale(req);

    const article = await svc.getArticleById(id, locale);
    if (!article) return reply.notFound("Article not found");
    return reply.send({ article });
  });
}
