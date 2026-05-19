import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";
import {
  signupSchema,
  loginSchema,
  googleSchema,
  resetRequestSchema,
  resetSchema,
  changePasswordSchema,
  updateProfileSchema,
  consentSchema,
  avatarUploadQuerySchema,
} from "./identity.schema.js";
import * as svc from "./identity.service.js";

const MOBILE_SCHEME = "parenting";

const bearerSecurity = [{ bearerAuth: [] }];

const tokenResponse = {
  200: {
    description: "JWT access token",
    type: "object",
    properties: { token: { type: "string" } },
  },
};

const okResponse = {
  200: {
    type: "object",
    properties: { ok: { type: "boolean" } },
  },
};

const userShape = {
  type: "object",
  properties: {
    id: { type: "string" },
    email: { type: "string" },
    role: { type: "string" },
    locale: { type: "string" },
    profile: {},
    hasPassword: { type: "boolean" },
  },
};

export default async function identityRoutes(app: FastifyInstance) {
  // Mobile OAuth redirect: Google redirects here, we redirect to the app deep link
  app.get("/google-redirect", {
    schema: {
      tags: ["Identity"],
      summary: "Google OAuth redirect to mobile deep link",
      querystring: {
        type: "object",
        properties: { code: { type: "string" }, state: { type: "string" } },
      },
      response: { 302: { type: "null", description: "Redirect to parenting://" } },
    },
  }, async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) {
      if (v != null && v !== "") params.set(k, v);
    }
    const qs = params.toString();
    return reply.redirect(qs ? `${MOBILE_SCHEME}://?${qs}` : `${MOBILE_SCHEME}://`, 302);
  });

  app.post("/signup", {
    schema: {
      tags: ["Identity"],
      summary: "Register a new account",
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
        },
      },
      response: {
        ...tokenResponse,
        409: { description: "Email already in use", type: "object", properties: { error: { type: "string" } } },
      },
    },
  }, async (req, reply) => {
    const { email, password } = signupSchema.parse(req.body);
    const result = await svc.signup(email, password);

    if (!result.ok) {
      return reply.status(409).send({
        error: "An account with this email already exists. Please login instead.",
      });
    }

    const token = app.jwt.sign({ sub: result.user.id, role: result.user.role }, { expiresIn: "365d" });
    return reply.send({ token });
  });

  app.post("/login", {
    schema: {
      tags: ["Identity"],
      summary: "Login with email and password",
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
        },
      },
      response: {
        ...tokenResponse,
        401: { description: "Invalid credentials", type: "object", properties: { message: { type: "string" } } },
      },
    },
  }, async (req, reply) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await svc.login(email, password);

    if (!result.ok) return reply.unauthorized("Invalid credentials");

    const token = app.jwt.sign({ sub: result.user.id, role: result.user.role }, { expiresIn: "365d" });
    return reply.send({ token });
  });

  app.post("/google", {
    schema: {
      tags: ["Identity"],
      summary: "Login or register via Google ID token",
      body: {
        type: "object",
        required: ["idToken"],
        properties: { idToken: { type: "string" } },
      },
      response: {
        ...tokenResponse,
        401: { description: "Invalid Google token", type: "object", properties: { error: { type: "string" }, message: { type: "string" } } },
      },
    },
  }, async (req, reply) => {
    const { idToken } = googleSchema.parse(req.body);

    if (!env.GOOGLE_CLIENT_ID) {
      return reply.status(400).send({ error: "Google OAuth not configured" });
    }

    let user;
    try {
      user = await svc.googleAuth(idToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(401).send({ error: "Invalid Google token", message: msg });
    }

    if (!user) {
      return reply.status(400).send({ error: "Invalid Google token: missing email" });
    }

    const token = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: "365d" });
    return reply.send({ token });
  });

  app.post("/reset-request", {
    schema: {
      tags: ["Identity"],
      summary: "Request a password reset email",
      description: "Always returns 200 to prevent email enumeration.",
      body: {
        type: "object",
        required: ["email"],
        properties: { email: { type: "string", format: "email" } },
      },
      response: okResponse,
    },
  }, async (req, reply) => {
    const { email } = resetRequestSchema.parse(req.body);
    const resetToken = await svc.requestPasswordReset(email, (payload, opts) =>
      app.jwt.sign(payload, opts),
    );

    if (resetToken) {
      const link = `${env.APP_URL ?? "http://localhost:5173"}/reset?token=${resetToken}`;
      await svc.sendPasswordResetEmail(email, link);
    }

    // Always return ok to avoid email enumeration
    return reply.send({ ok: true });
  });

  app.post("/reset", {
    schema: {
      tags: ["Identity"],
      summary: "Reset password using a signed reset token",
      body: {
        type: "object",
        required: ["token", "newPassword"],
        properties: {
          token: { type: "string" },
          newPassword: { type: "string", minLength: 8 },
        },
      },
      response: {
        ...okResponse,
        400: { description: "Invalid or expired token", type: "object", properties: { message: { type: "string" } } },
      },
    },
  }, async (req, reply) => {
    const { token, newPassword } = resetSchema.parse(req.body);
    try {
      const payload = app.jwt.verify(token) as { sub: string; kind: string };
      if (payload.kind !== "reset") throw new Error("bad token");
      await svc.resetPassword(payload.sub, newPassword);
    } catch {
      return reply.badRequest("Invalid or expired token");
    }
    return reply.send({ ok: true });
  });

  app.get("/me", {
    schema: {
      tags: ["Identity"],
      summary: "Get the authenticated user's profile",
      security: bearerSecurity,
      response: {
        200: { type: "object", properties: { user: userShape } },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req) => {
    const user = await svc.getMe(req.user.sub);
    return { user };
  });

  app.put("/me", {
    schema: {
      tags: ["Identity"],
      summary: "Update the authenticated user's profile",
      security: bearerSecurity,
      body: {
        type: "object",
        properties: {
          name: { type: "string", maxLength: 100 },
          avatarUrl: { type: "string", format: "uri" },
          onboarded: { type: "boolean" },
          roleInHousehold: { type: "string" },
          interests: { type: "array", items: { type: "string" } },
          locale: { type: "string" },
        },
      },
      response: {
        200: { type: "object", properties: { user: userShape } },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const body = updateProfileSchema.parse(req.body);
    const user = await svc.updateMe(req.user.sub, body);
    return reply.send({ user });
  });

  app.put("/me/password", {
    schema: {
      tags: ["Identity"],
      summary: "Change the authenticated user's password",
      security: bearerSecurity,
      body: {
        type: "object",
        required: ["currentPassword", "newPassword"],
        properties: {
          currentPassword: { type: "string", minLength: 1 },
          newPassword: { type: "string", minLength: 8 },
        },
      },
      response: {
        ...okResponse,
        400: { description: "Validation error", type: "object", properties: { message: { type: "string" } } },
        401: { description: "Unauthorized or current password wrong", type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const body = changePasswordSchema.parse(req.body);
    const result = await svc.changePassword(req.user.sub, body.currentPassword, body.newPassword);
    if (!result.ok) {
      if (result.reason === "wrong_current") return reply.unauthorized("wrong_current");
      if (result.reason === "no_password") return reply.badRequest("no_password");
      if (result.reason === "same_as_old") return reply.badRequest("same_as_old");
    }
    return reply.send({ ok: true });
  });

  app.get("/me/avatar-upload-url", {
    schema: {
      tags: ["Identity"],
      summary: "Get a presigned S3 URL for avatar upload",
      security: bearerSecurity,
      querystring: {
        type: "object",
        required: ["contentType", "contentLength"],
        properties: {
          contentType: { type: "string", enum: ["image/jpeg", "image/png", "image/webp"] },
          contentLength: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            key: { type: "string" },
            url: { type: "string", format: "uri" },
          },
        },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { contentType, contentLength } = avatarUploadQuerySchema.parse(req.query);
    try {
      const { key, url } = await svc.getAvatarUploadUrl(contentType, contentLength);
      return reply.send({ key, url });
    } catch (err: unknown) {
      return reply.badRequest(err instanceof Error ? err.message : "Upload error");
    }
  });

  app.delete("/me", {
    schema: {
      tags: ["Identity"],
      summary: "Delete the authenticated user's account",
      security: bearerSecurity,
      response: {
        200: { ...okResponse[200] },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    await svc.deleteAccount(req.user.sub);
    return reply.send({ ok: true });
  });

  app.post("/consent", {
    schema: {
      tags: ["Identity"],
      summary: "Record user consent",
      security: bearerSecurity,
      body: {
        type: "object",
        required: ["type", "version"],
        properties: {
          type: { type: "string", enum: ["terms", "privacy", "cookie"] },
          version: { type: "string" },
          locale: { type: "string", default: "en" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            consent: {
              type: "object",
              properties: {
                id: { type: "string" },
                type: { type: "string" },
                version: { type: "string" },
                locale: { type: "string" },
              },
            },
          },
        },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { type, version, locale } = consentSchema.parse(req.body);
    const consent = await svc.recordConsent(req.user.sub, type, version, locale);
    return reply.send({ consent });
  });
}
