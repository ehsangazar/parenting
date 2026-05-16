import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";
import {
  signupSchema,
  loginSchema,
  googleSchema,
  resetRequestSchema,
  resetSchema,
  updateProfileSchema,
  consentSchema,
  avatarUploadQuerySchema,
} from "./identity.schema.js";
import * as svc from "./identity.service.js";

const MOBILE_SCHEME = "parenting";

export default async function identityRoutes(app: FastifyInstance) {
  // Mobile OAuth redirect: Google redirects here, we redirect to the app deep link
  app.get("/google-redirect", async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) {
      if (v != null && v !== "") params.set(k, v);
    }
    const qs = params.toString();
    return reply.redirect(qs ? `${MOBILE_SCHEME}://?${qs}` : `${MOBILE_SCHEME}://`, 302);
  });

  app.post("/signup", async (req, reply) => {
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

  app.post("/login", async (req, reply) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await svc.login(email, password);

    if (!result.ok) return reply.unauthorized("Invalid credentials");

    const token = app.jwt.sign({ sub: result.user.id, role: result.user.role }, { expiresIn: "365d" });
    return reply.send({ token });
  });

  app.post("/google", async (req, reply) => {
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

  app.post("/reset-request", async (req, reply) => {
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

  app.post("/reset", async (req, reply) => {
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

  app.get("/me", { preHandler: [app.authenticate] }, async (req) => {
    const user = await svc.getMe(req.user.sub);
    return { user };
  });

  app.put("/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = updateProfileSchema.parse(req.body);
    const user = await svc.updateMe(req.user.sub, body);
    return reply.send({ user });
  });

  app.get("/me/avatar-upload-url", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { contentType, contentLength } = avatarUploadQuerySchema.parse(req.query);
    try {
      const { key, url } = await svc.getAvatarUploadUrl(contentType, contentLength);
      return reply.send({ key, url });
    } catch (err: unknown) {
      return reply.badRequest(err instanceof Error ? err.message : "Upload error");
    }
  });

  app.delete("/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    await svc.deleteAccount(req.user.sub);
    return reply.send({ ok: true });
  });

  // Consent
  app.post("/consent", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { type, version, locale } = consentSchema.parse(req.body);
    const consent = await svc.recordConsent(req.user.sub, type, version, locale);
    return reply.send({ consent });
  });
}
