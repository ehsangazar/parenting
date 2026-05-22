import type { FastifyInstance } from "fastify";
import { prisma } from "../../shared/db/index.js";
import { notifyLoopLead } from "../../shared/loop/index.js";

// Public survey-submission endpoint. Frontend posts a flat object whose keys
// are the question slugs (q1_*, q3_childAges, q14_topFeatures,
// q21_expertQuestion, email, roleInHousehold, ...). We persist the whole
// object as the SurveyResponse.responses JSON column, then fire-and-forget a
// lead notification to Loop CRM.

export default async function surveysRoutes(app: FastifyInstance) {
  app.post(
    "/surveys",
    {
      schema: {
        tags: ["Public"],
        summary: "Submit a survey response",
      },
    },
    async (req, reply) => {
      const raw = req.body;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return reply.code(400).send({ error: "invalid payload" });
      }
      const responses = raw as Record<string, unknown>;

      const created = await prisma.surveyResponse.create({
        data: { responses: responses as never },
      });

      const pickEmail = (): string => {
        for (const k of ["q23_email", "email", "Email"]) {
          const v = responses[k];
          if (typeof v === "string" && v.trim()) return v.trim();
        }
        return "";
      };
      const email = pickEmail();
      if (email) {
        const theirOneQuestion =
          typeof responses.q21_expertQuestion === "string"
            ? responses.q21_expertQuestion.trim() || undefined
            : undefined;

        notifyLoopLead({
          productSlug: "raised",
          email,
          source: "survey_v1",
          theirOneQuestion,
          customFields: {
            surveyResponseId: created.id,
            roleInHousehold: responses.roleInHousehold,
            childAges: responses.q3_childAges,
            numberOfChildren: responses.q4_numberOfChildren,
          },
          interaction: {
            kind: "note",
            subject: "Submitted Raised survey",
            body: JSON.stringify(responses, null, 2),
            externalId: `raised-survey:${created.id}`,
            occurredAt: created.createdAt.toISOString(),
          },
        }).catch((err) => {
          req.log.error({ err: err instanceof Error ? err.message : err }, "loop notify (survey) failed");
        });
      }

      return reply.code(201).send({ id: created.id });
    },
  );
}
