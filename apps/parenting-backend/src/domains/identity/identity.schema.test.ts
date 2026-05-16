import { describe, it, expect } from "vitest";
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

describe("signupSchema", () => {
  it("accepts valid email and password", () => {
    const result = signupSchema.safeParse({ email: "user@example.com", password: "password123" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = signupSchema.safeParse({ email: "not-an-email", password: "password123" });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 chars", () => {
    const result = signupSchema.safeParse({ email: "user@example.com", password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(signupSchema.safeParse({}).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(loginSchema.safeParse({ email: "user@example.com", password: "password123" }).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(loginSchema.safeParse({ email: "bad", password: "password123" }).success).toBe(false);
  });

  it("rejects short password", () => {
    expect(loginSchema.safeParse({ email: "user@example.com", password: "x" }).success).toBe(false);
  });
});

describe("googleSchema", () => {
  it("accepts a valid idToken", () => {
    expect(googleSchema.safeParse({ idToken: "some.jwt.token" }).success).toBe(true);
  });

  it("rejects missing idToken", () => {
    expect(googleSchema.safeParse({}).success).toBe(false);
  });
});

describe("resetRequestSchema", () => {
  it("accepts valid email", () => {
    expect(resetRequestSchema.safeParse({ email: "user@example.com" }).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(resetRequestSchema.safeParse({ email: "not-email" }).success).toBe(false);
  });
});

describe("resetSchema", () => {
  it("accepts valid token and new password", () => {
    expect(resetSchema.safeParse({ token: "abc", newPassword: "newpass1" }).success).toBe(true);
  });

  it("rejects short new password", () => {
    expect(resetSchema.safeParse({ token: "abc", newPassword: "short" }).success).toBe(false);
  });

  it("rejects missing token", () => {
    expect(resetSchema.safeParse({ newPassword: "newpass1" }).success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("accepts empty object (all optional)", () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });

  it("accepts all fields", () => {
    const result = updateProfileSchema.safeParse({
      name: "Alice",
      avatarUrl: "https://example.com/avatar.jpg",
      onboarded: true,
      roleInHousehold: "parent",
      interests: ["sleep", "feeding"],
      locale: "en",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name over 100 chars", () => {
    const result = updateProfileSchema.safeParse({ name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rejects non-URL avatarUrl", () => {
    const result = updateProfileSchema.safeParse({ avatarUrl: "not-a-url" });
    expect(result.success).toBe(false);
  });
});

describe("consentSchema", () => {
  it.each(["terms", "privacy", "cookie"] as const)("accepts type %s", (type) => {
    expect(consentSchema.safeParse({ type, version: "1.0" }).success).toBe(true);
  });

  it("defaults locale to en", () => {
    const result = consentSchema.safeParse({ type: "terms", version: "1.0" });
    expect(result.success && result.data.locale).toBe("en");
  });

  it("rejects invalid consent type", () => {
    expect(consentSchema.safeParse({ type: "marketing", version: "1.0" }).success).toBe(false);
  });
});

describe("avatarUploadQuerySchema", () => {
  it("accepts valid contentType and contentLength", () => {
    const result = avatarUploadQuerySchema.safeParse({ contentType: "image/jpeg", contentLength: "1024" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.contentLength).toBe(1024);
  });

  it("coerces contentLength string to number", () => {
    const result = avatarUploadQuerySchema.safeParse({ contentType: "image/png", contentLength: "2048" });
    expect(result.success && result.data.contentLength).toBe(2048);
  });

  it("rejects missing contentType", () => {
    expect(avatarUploadQuerySchema.safeParse({ contentLength: "1024" }).success).toBe(false);
  });

  it("rejects non-positive contentLength", () => {
    expect(avatarUploadQuerySchema.safeParse({ contentType: "image/jpeg", contentLength: "0" }).success).toBe(false);
  });
});
