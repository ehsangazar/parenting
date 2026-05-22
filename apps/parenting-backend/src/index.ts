import "./instrument.js";
import * as Sentry from "@sentry/node";
import fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import formbody from "@fastify/formbody";
import jwt from "@fastify/jwt";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { env } from "./config/env.js";
import identityRoutes from "./domains/identity/identity.routes.js";
import familyRoutes from "./domains/family/family.routes.js";
import momentsRoutes from "./domains/moments/moments.routes.js";
import communityRoutes from "./domains/community/community.routes.js";
import learningRoutes from "./domains/learning/learning.routes.js";
import contentRoutes from "./domains/content/content.routes.js";
import gamificationRoutes from "./domains/gamification/gamification.routes.js";
import assistantRoutes from "./domains/assistant/assistant.routes.js";
import billingRoutes from "./domains/billing/billing.routes.js";
import adminRoutes from "./domains/admin/admin.routes.js";
import notificationsRoutes from "./domains/notifications/notifications.routes.js";
import surveysRoutes from "./domains/surveys/surveys.routes.js";
import { startReminderScheduler } from "./shared/reminders/index.js";

const app = fastify({
  logger: {
    level: env.NODE_ENV === "production" ? "info" : "debug",
    transport:
      env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true, translateTime: true } }
        : undefined,
  },
  disableRequestLogging: true,
});

Sentry.setupFastifyErrorHandler(app);

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
      return cb(null, true);
    }
    const extra = (env.CORS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const allowed = new Set(
      [env.APP_URL, ...extra].filter(Boolean).map((v) => v!.replace(/\/$/, "")),
    );
    if (allowed.has(origin.replace(/\/$/, ""))) return cb(null, true);
    cb(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID", "Accept-Language", "sentry-trace", "baggage"],
});

await app.register(sensible);
await app.register(formbody);
await app.register(helmet, {
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: false,
});
await app.register(rateLimit, { max: 1000, timeWindow: "1 minute" });
await app.register(jwt, { secret: env.JWT_SECRET });

app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

await app.register(swagger, {
  openapi: {
    openapi: "3.0.0",
    info: { title: "Parenting API", description: "Parenting backend API", version: "0.1.0" },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
});
await app.register(swaggerUi, {
  routePrefix: "/docs",
  uiConfig: { docExpansion: "list", deepLinking: false },
});

// Domains
await app.register(identityRoutes, { prefix: "/api/identity" });
await app.register(familyRoutes, { prefix: "/api" });
await app.register(momentsRoutes, { prefix: "/api" });
await app.register(communityRoutes, { prefix: "/api" });
await app.register(learningRoutes, { prefix: "/api" });
await app.register(contentRoutes, { prefix: "/api" });
await app.register(gamificationRoutes, { prefix: "/api" });
await app.register(assistantRoutes, { prefix: "/api" });
await app.register(billingRoutes, { prefix: "/api" });
await app.register(adminRoutes, { prefix: "/api/admin" });
await app.register(notificationsRoutes, { prefix: "/api/notifications" });
await app.register(surveysRoutes, { prefix: "/api" });

app.get("/health", async () => ({ ok: true }));

app.setErrorHandler((error, _request, reply) => {
  const zodLike = error as { issues?: unknown[]; message?: string };
  if (zodLike.issues != null) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: zodLike.message ?? "Validation error",
      issues: zodLike.issues,
    });
  }

  const statusCode = typeof (error as { statusCode?: number }).statusCode === "number"
    ? (error as { statusCode: number }).statusCode
    : 500;

  if (statusCode < 500) {
    return reply.status(statusCode).send({
      statusCode,
      error: (error as Error).name,
      message: (error as Error).message,
    });
  }

  app.log.error({ err: error }, "Unhandled request error");
  return reply.status(500).send({ statusCode: 500, error: "Internal Server Error", message: "Internal Server Error" });
});

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info({ port: env.PORT }, "server started");
    startReminderScheduler(app.log);
  } catch (err) {
    app.log.error({ err }, "failed to start server");
    process.exit(1);
  }
};

start();
