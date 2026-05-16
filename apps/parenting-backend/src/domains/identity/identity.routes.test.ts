import { vi, describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";

vi.mock("./identity.service.js", () => ({
  signup: vi.fn(),
  login: vi.fn(),
  googleAuth: vi.fn(),
  requestPasswordReset: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  resetPassword: vi.fn(),
  getMe: vi.fn(),
  updateMe: vi.fn(),
  getAvatarUploadUrl: vi.fn(),
  deleteAccount: vi.fn(),
  recordConsent: vi.fn(),
}));

import fastify, { type FastifyInstance } from "fastify";
import sensible from "@fastify/sensible";
import jwt from "@fastify/jwt";
import formbody from "@fastify/formbody";
import identityRoutes from "./identity.routes.js";
import * as svc from "./identity.service.js";

const TEST_SECRET = "test-jwt-secret-min-10";

const mockUser = {
  id: "user-1",
  email: "user@example.com",
  role: "user",
  profile: null,
  locale: "en",
};

async function buildApp(): Promise<FastifyInstance> {
  const app = fastify();

  app.setErrorHandler((error, _req, reply) => {
    const zodLike = error as { issues?: unknown[]; message?: string };
    if (zodLike.issues != null) {
      return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: zodLike.message ?? "Validation error" });
    }
    const status = typeof (error as { statusCode?: number }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : 500;
    return reply.status(status).send({ statusCode: status, error: (error as Error).name, message: (error as Error).message });
  });

  await app.register(sensible);
  await app.register(formbody);
  await app.register(jwt, { secret: TEST_SECRET });
  app.decorate("authenticate", async (request: Parameters<FastifyInstance["authenticate"]>[0], reply: Parameters<FastifyInstance["authenticate"]>[1]) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
  await app.register(identityRoutes, { prefix: "/api/identity" });

  return app;
}

function signToken(app: FastifyInstance, payload: { sub: string; role?: string; kind?: string } = { sub: "user-1", role: "user" }) {
  return app.jwt.sign(payload, { expiresIn: "1h" });
}

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(() => app.close());
beforeEach(() => vi.clearAllMocks());

// ── POST /signup ──────────────────────────────────────────────────────────────

describe("POST /api/identity/signup", () => {
  it("returns 200 with token on success", async () => {
    vi.mocked(svc.signup).mockResolvedValue({ ok: true, user: mockUser });
    const res = await app.inject({ method: "POST", url: "/api/identity/signup", payload: { email: "user@example.com", password: "password123" } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty("token");
  });

  it("returns 409 when user already exists", async () => {
    vi.mocked(svc.signup).mockResolvedValue({ ok: false, conflict: true });
    const res = await app.inject({ method: "POST", url: "/api/identity/signup", payload: { email: "user@example.com", password: "password123" } });
    expect(res.statusCode).toBe(409);
  });

  it("returns 400 on invalid body", async () => {
    const res = await app.inject({ method: "POST", url: "/api/identity/signup", payload: { email: "not-email", password: "short" } });
    expect(res.statusCode).toBe(400);
    expect(svc.signup).not.toHaveBeenCalled();
  });
});

// ── POST /login ───────────────────────────────────────────────────────────────

describe("POST /api/identity/login", () => {
  it("returns 200 with token on valid credentials", async () => {
    vi.mocked(svc.login).mockResolvedValue({ ok: true, user: mockUser });
    const res = await app.inject({ method: "POST", url: "/api/identity/login", payload: { email: "user@example.com", password: "password123" } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty("token");
  });

  it("returns 401 on invalid credentials", async () => {
    vi.mocked(svc.login).mockResolvedValue({ ok: false, unauthorized: true });
    const res = await app.inject({ method: "POST", url: "/api/identity/login", payload: { email: "user@example.com", password: "wrongpass" } });
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    const res = await app.inject({ method: "POST", url: "/api/identity/login", payload: {} });
    expect(res.statusCode).toBe(400);
  });
});

// ── POST /google ──────────────────────────────────────────────────────────────

describe("POST /api/identity/google", () => {
  it("returns 200 with token on valid Google token", async () => {
    vi.mocked(svc.googleAuth).mockResolvedValue(mockUser);
    const res = await app.inject({ method: "POST", url: "/api/identity/google", payload: { idToken: "valid.google.token" } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty("token");
  });

  it("returns 401 when Google token is invalid", async () => {
    vi.mocked(svc.googleAuth).mockRejectedValue(new Error("Token expired"));
    const res = await app.inject({ method: "POST", url: "/api/identity/google", payload: { idToken: "bad.token" } });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: "Invalid Google token", message: "Token expired" });
  });

  it("returns 400 on invalid body", async () => {
    const res = await app.inject({ method: "POST", url: "/api/identity/google", payload: {} });
    expect(res.statusCode).toBe(400);
  });
});

// ── POST /reset-request ───────────────────────────────────────────────────────

describe("POST /api/identity/reset-request", () => {
  it("always returns 200 regardless of whether user exists (no email enumeration)", async () => {
    vi.mocked(svc.requestPasswordReset).mockResolvedValue(null);
    const res = await app.inject({ method: "POST", url: "/api/identity/reset-request", payload: { email: "anyone@example.com" } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("sends reset email when user exists", async () => {
    vi.mocked(svc.requestPasswordReset).mockResolvedValue("reset-token");
    vi.mocked(svc.sendPasswordResetEmail).mockResolvedValue(undefined);
    await app.inject({ method: "POST", url: "/api/identity/reset-request", payload: { email: "user@example.com" } });
    expect(svc.sendPasswordResetEmail).toHaveBeenCalledWith("user@example.com", expect.stringContaining("reset-token"));
  });

  it("does not send email when user does not exist", async () => {
    vi.mocked(svc.requestPasswordReset).mockResolvedValue(null);
    await app.inject({ method: "POST", url: "/api/identity/reset-request", payload: { email: "ghost@example.com" } });
    expect(svc.sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});

// ── POST /reset ───────────────────────────────────────────────────────────────

describe("POST /api/identity/reset", () => {
  it("returns 200 on valid reset token", async () => {
    const token = app.jwt.sign({ sub: "user-1", kind: "reset" }, { expiresIn: "30m" });
    vi.mocked(svc.resetPassword).mockResolvedValue(undefined);
    const res = await app.inject({ method: "POST", url: "/api/identity/reset", payload: { token, newPassword: "newpassword1" } });
    expect(res.statusCode).toBe(200);
    expect(svc.resetPassword).toHaveBeenCalledWith("user-1", "newpassword1");
  });

  it("returns 400 on invalid token", async () => {
    const res = await app.inject({ method: "POST", url: "/api/identity/reset", payload: { token: "not.a.token", newPassword: "newpassword1" } });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when token kind is not reset", async () => {
    const token = app.jwt.sign({ sub: "user-1", kind: "auth" }, { expiresIn: "30m" });
    const res = await app.inject({ method: "POST", url: "/api/identity/reset", payload: { token, newPassword: "newpassword1" } });
    expect(res.statusCode).toBe(400);
  });
});

// ── GET /me ───────────────────────────────────────────────────────────────────

describe("GET /api/identity/me", () => {
  it("returns 200 with user when authenticated", async () => {
    vi.mocked(svc.getMe).mockResolvedValue(mockUser);
    const token = signToken(app);
    const res = await app.inject({ method: "GET", url: "/api/identity/me", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ user: mockUser });
  });

  it("returns 401 without auth token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/identity/me" });
    expect(res.statusCode).toBe(401);
  });
});

// ── PUT /me ───────────────────────────────────────────────────────────────────

describe("PUT /api/identity/me", () => {
  it("returns 200 with updated user", async () => {
    const updated = { ...mockUser, profile: { name: "Alice" } };
    vi.mocked(svc.updateMe).mockResolvedValue(updated);
    const token = signToken(app);
    const res = await app.inject({
      method: "PUT",
      url: "/api/identity/me",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Alice" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ user: updated });
  });

  it("returns 401 without auth token", async () => {
    const res = await app.inject({ method: "PUT", url: "/api/identity/me", payload: { name: "Alice" } });
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    const token = signToken(app);
    const res = await app.inject({
      method: "PUT",
      url: "/api/identity/me",
      headers: { authorization: `Bearer ${token}` },
      payload: { avatarUrl: "not-a-url" },
    });
    expect(res.statusCode).toBe(400);
  });
});

// ── GET /me/avatar-upload-url ─────────────────────────────────────────────────

describe("GET /api/identity/me/avatar-upload-url", () => {
  it("returns presigned upload URL", async () => {
    vi.mocked(svc.getAvatarUploadUrl).mockResolvedValue({ key: "uploads/abc", url: "https://s3.signed" });
    const token = signToken(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/identity/me/avatar-upload-url?contentType=image/jpeg&contentLength=1024",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ key: "uploads/abc", url: "https://s3.signed" });
  });

  it("returns 400 when S3 is not configured", async () => {
    vi.mocked(svc.getAvatarUploadUrl).mockRejectedValue(new Error("S3 not configured"));
    const token = signToken(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/identity/me/avatar-upload-url?contentType=image/jpeg&contentLength=1024",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 401 without auth token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/identity/me/avatar-upload-url?contentType=image/jpeg&contentLength=1024" });
    expect(res.statusCode).toBe(401);
  });
});

// ── DELETE /me ────────────────────────────────────────────────────────────────

describe("DELETE /api/identity/me", () => {
  it("returns 200 on successful account deletion", async () => {
    vi.mocked(svc.deleteAccount).mockResolvedValue(undefined);
    const token = signToken(app);
    const res = await app.inject({ method: "DELETE", url: "/api/identity/me", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(svc.deleteAccount).toHaveBeenCalledWith("user-1");
  });

  it("returns 401 without auth token", async () => {
    const res = await app.inject({ method: "DELETE", url: "/api/identity/me" });
    expect(res.statusCode).toBe(401);
  });
});

// ── POST /consent ─────────────────────────────────────────────────────────────

describe("POST /api/identity/consent", () => {
  it("records consent and returns it", async () => {
    const consent = { id: "c-1", type: "terms", version: "1.0", locale: "en" };
    vi.mocked(svc.recordConsent).mockResolvedValue(consent as never);
    const token = signToken(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/identity/consent",
      headers: { authorization: `Bearer ${token}` },
      payload: { type: "terms", version: "1.0" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ consent });
    expect(svc.recordConsent).toHaveBeenCalledWith("user-1", "terms", "1.0", "en");
  });

  it("returns 401 without auth token", async () => {
    const res = await app.inject({ method: "POST", url: "/api/identity/consent", payload: { type: "terms", version: "1.0" } });
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 on invalid consent type", async () => {
    const token = signToken(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/identity/consent",
      headers: { authorization: `Bearer ${token}` },
      payload: { type: "marketing", version: "1.0" },
    });
    expect(res.statusCode).toBe(400);
  });
});

// ── GET /google-redirect ──────────────────────────────────────────────────────

describe("GET /api/identity/google-redirect", () => {
  it("redirects to mobile deep link", async () => {
    const res = await app.inject({ method: "GET", url: "/api/identity/google-redirect?code=abc&state=xyz" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("parenting://?code=abc&state=xyz");
  });

  it("redirects to bare scheme when no query params", async () => {
    const res = await app.inject({ method: "GET", url: "/api/identity/google-redirect" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("parenting://");
  });
});
