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
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID", "Accept-Language"],
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

app.get("/health", async () => ({ ok: true }));

app.setErrorHandler((error, _request, reply) => {
  if ((error as { issues?: unknown[] }).issues != null) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: error.message,
      issues: error.issues,
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
  } catch (err) {
    app.log.error({ err }, "failed to start server");
    process.exit(1);
  }
};

start();
