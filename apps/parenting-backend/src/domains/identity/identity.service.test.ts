import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("./identity.repository.js");
vi.mock("../../shared/mailer/index.js");
vi.mock("../../shared/storage/index.js");
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
}));
vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = vi.fn();
  },
}));

import * as repo from "./identity.repository.js";
import * as mailer from "../../shared/mailer/index.js";
import * as storage from "../../shared/storage/index.js";
import bcrypt from "bcryptjs";
import {
  signup,
  login,
  requestPasswordReset,
  resetPassword,
  getMe,
  updateMe,
  getAvatarUploadUrl,
  deleteAccount,
  recordConsent,
  signProfileAvatarUrl,
} from "./identity.service.js";

const mockUser = {
  id: "user-1",
  email: "user@example.com",
  role: "user",
  profile: null,
  locale: "en",
};

beforeEach(() => vi.clearAllMocks());

// ── signProfileAvatarUrl ──────────────────────────────────────────────────────

describe("signProfileAvatarUrl", () => {
  it("returns non-object profile unchanged", async () => {
    expect(await signProfileAvatarUrl(null)).toBeNull();
    expect(await signProfileAvatarUrl("string")).toBe("string");
  });

  it("returns profile unchanged when no avatarUrl", async () => {
    const profile = { name: "Alice" };
    expect(await signProfileAvatarUrl(profile)).toEqual(profile);
  });

  it("returns profile unchanged for non-S3 URL", async () => {
    vi.mocked(storage.extractS3Key).mockReturnValue(null);
    const profile = { avatarUrl: "https://external.com/pic.jpg" };
    const result = await signProfileAvatarUrl(profile);
    expect(result).toEqual(profile);
  });

  it("signs S3 avatar URL", async () => {
    vi.mocked(storage.extractS3Key).mockReturnValue("uploads/abc.jpg");
    vi.mocked(storage.getSignedViewUrl).mockResolvedValue("https://signed.url/abc.jpg");
    const result = await signProfileAvatarUrl({ avatarUrl: "uploads/abc.jpg" });
    expect(result).toEqual({ avatarUrl: "https://signed.url/abc.jpg" });
  });

  it("returns null avatarUrl when signing fails", async () => {
    vi.mocked(storage.extractS3Key).mockReturnValue("uploads/abc.jpg");
    vi.mocked(storage.getSignedViewUrl).mockRejectedValue(new Error("S3 error"));
    const result = await signProfileAvatarUrl({ avatarUrl: "uploads/abc.jpg" }) as Record<string, unknown>;
    expect(result.avatarUrl).toBeNull();
  });
});

// ── signup ────────────────────────────────────────────────────────────────────

describe("signup", () => {
  it("returns conflict when user already exists", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue({ id: "existing", email: "user@example.com" } as never);
    const result = await signup("user@example.com", "password123");
    expect(result).toEqual({ ok: false, conflict: true });
    expect(repo.createUser).not.toHaveBeenCalled();
  });

  it("creates user, sends welcome email, records audit on success", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(null);
    vi.mocked(repo.createUser).mockResolvedValue(mockUser);
    vi.mocked(repo.createAuditLog).mockResolvedValue({} as never);
    vi.mocked(mailer.sendWelcomeEmail).mockResolvedValue(undefined);

    const result = await signup("user@example.com", "password123");

    expect(result).toEqual({ ok: true, user: mockUser });
    expect(repo.createUser).toHaveBeenCalledWith({ email: "user@example.com", passwordHash: "hashed-password" });
    expect(mailer.sendWelcomeEmail).toHaveBeenCalledWith("user@example.com");
    expect(repo.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "signup", resourceType: "user" }),
    );
  });
});

// ── login ─────────────────────────────────────────────────────────────────────

describe("login", () => {
  it("returns unauthorized when user not found", async () => {
    vi.mocked(repo.findUserWithHashByEmail).mockResolvedValue(null);
    expect(await login("user@example.com", "password")).toEqual({ ok: false, unauthorized: true });
  });

  it("returns unauthorized when user has no password (Google-only account)", async () => {
    vi.mocked(repo.findUserWithHashByEmail).mockResolvedValue({ ...mockUser, passwordHash: null, googleId: "g-123" });
    expect(await login("user@example.com", "password")).toEqual({ ok: false, unauthorized: true });
  });

  it("returns unauthorized when password does not match", async () => {
    vi.mocked(repo.findUserWithHashByEmail).mockResolvedValue({ ...mockUser, passwordHash: "hashed", googleId: null });
    (bcrypt.compare as Mock).mockResolvedValue(false);
    expect(await login("user@example.com", "wrong")).toEqual({ ok: false, unauthorized: true });
  });

  it("returns public user on valid credentials", async () => {
    vi.mocked(repo.findUserWithHashByEmail).mockResolvedValue({ ...mockUser, passwordHash: "hashed", googleId: null });
    (bcrypt.compare as Mock).mockResolvedValue(true);
    const result = await login("user@example.com", "password");
    expect(result).toEqual({ ok: true, user: mockUser });
  });

  it("does not expose passwordHash or googleId in result", async () => {
    vi.mocked(repo.findUserWithHashByEmail).mockResolvedValue({ ...mockUser, passwordHash: "secret", googleId: "g-1" });
    (bcrypt.compare as Mock).mockResolvedValue(true);
    const result = await login("user@example.com", "password");
    if (!result.ok) throw new Error("Expected ok");
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(result.user).not.toHaveProperty("googleId");
  });
});

// ── requestPasswordReset ──────────────────────────────────────────────────────

describe("requestPasswordReset", () => {
  it("returns null when user not found", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(null);
    const signToken = vi.fn();
    expect(await requestPasswordReset("missing@example.com", signToken)).toBeNull();
    expect(signToken).not.toHaveBeenCalled();
  });

  it("calls signToken with reset payload and returns token", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue({ id: "user-1" } as never);
    const signToken = vi.fn().mockReturnValue("reset-token");
    const result = await requestPasswordReset("user@example.com", signToken);
    expect(signToken).toHaveBeenCalledWith({ sub: "user-1", kind: "reset" }, { expiresIn: "30m" });
    expect(result).toBe("reset-token");
  });
});

// ── resetPassword ─────────────────────────────────────────────────────────────

describe("resetPassword", () => {
  it("hashes the new password and updates the user", async () => {
    vi.mocked(repo.updateUser).mockResolvedValue(mockUser);
    await resetPassword("user-1", "newpassword");
    expect(bcrypt.hash).toHaveBeenCalledWith("newpassword", 10);
    expect(repo.updateUser).toHaveBeenCalledWith("user-1", { passwordHash: "hashed-password" });
  });
});

// ── getMe ─────────────────────────────────────────────────────────────────────

describe("getMe", () => {
  it("returns null when user not found", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(null);
    expect(await getMe("user-1")).toBeNull();
  });

  it("returns user with profile when found", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(mockUser);
    vi.mocked(storage.extractS3Key).mockReturnValue(null);
    const result = await getMe("user-1");
    expect(result).toMatchObject({ id: "user-1", email: "user@example.com" });
  });
});

// ── updateMe ──────────────────────────────────────────────────────────────────

describe("updateMe", () => {
  it("merges new fields into existing profile", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue({
      ...mockUser,
      profile: { name: "Old Name", onboarded: false },
    });
    vi.mocked(repo.updateUser).mockResolvedValue({ ...mockUser, profile: { name: "New Name", onboarded: false } });
    vi.mocked(repo.createAuditLog).mockResolvedValue({} as never);
    vi.mocked(storage.extractS3Key).mockReturnValue(null);

    await updateMe("user-1", { name: "New Name" });

    expect(repo.updateUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ profile: expect.objectContaining({ name: "New Name", onboarded: false }) }),
    );
  });

  it("records an audit log on update", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(mockUser);
    vi.mocked(repo.updateUser).mockResolvedValue(mockUser);
    vi.mocked(repo.createAuditLog).mockResolvedValue({} as never);
    vi.mocked(storage.extractS3Key).mockReturnValue(null);

    await updateMe("user-1", { locale: "fr" });

    expect(repo.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "update", resourceType: "user" }),
    );
  });

  it("updates locale when provided", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(mockUser);
    vi.mocked(repo.updateUser).mockResolvedValue(mockUser);
    vi.mocked(repo.createAuditLog).mockResolvedValue({} as never);
    vi.mocked(storage.extractS3Key).mockReturnValue(null);

    await updateMe("user-1", { locale: "fr" });

    expect(repo.updateUser).toHaveBeenCalledWith("user-1", expect.objectContaining({ locale: "fr" }));
  });
});

// ── getAvatarUploadUrl ────────────────────────────────────────────────────────

describe("getAvatarUploadUrl", () => {
  it("calls createUploadUrl with correct constraints", async () => {
    vi.mocked(storage.createUploadUrl).mockResolvedValue({ key: "uploads/abc", url: "https://s3.url" });
    await getAvatarUploadUrl("image/jpeg", 512000);
    expect(storage.createUploadUrl).toHaveBeenCalledWith({
      contentType: "image/jpeg",
      contentLength: 512000,
      allowedMime: ["image/jpeg", "image/png", "image/webp"],
      maxSizeBytes: 5 * 1024 * 1024,
    });
  });
});

// ── deleteAccount ─────────────────────────────────────────────────────────────

describe("deleteAccount", () => {
  it("calls deleteUser with the user id", async () => {
    vi.mocked(repo.deleteUser).mockResolvedValue(undefined);
    await deleteAccount("user-1");
    expect(repo.deleteUser).toHaveBeenCalledWith("user-1");
  });
});

// ── recordConsent ─────────────────────────────────────────────────────────────

describe("recordConsent", () => {
  it("delegates to createConsent with all params", async () => {
    vi.mocked(repo.createConsent).mockResolvedValue({} as never);
    await recordConsent("user-1", "terms", "1.0", "en");
    expect(repo.createConsent).toHaveBeenCalledWith({ userId: "user-1", type: "terms", version: "1.0", locale: "en" });
  });
});
