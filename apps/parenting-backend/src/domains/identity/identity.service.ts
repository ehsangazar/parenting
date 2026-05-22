import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env.js";
import { sendWelcomeEmail, sendResetEmail } from "../../shared/mailer/index.js";
import { createUploadUrl, getSignedViewUrl, extractS3Key } from "../../shared/storage/index.js";
import { notifyLoopLead } from "../../shared/loop/index.js";
import * as repo from "./identity.repository.js";
import type { PublicUser, SignupResult, LoginResult } from "./identity.types.js";
import type { updateProfileSchema } from "./identity.schema.js";
import type { z } from "zod";

const oauthClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

const hashPassword = (password: string) => bcrypt.hash(password, 10);

export const signProfileAvatarUrl = async (profile: unknown): Promise<unknown> => {
  if (!profile || typeof profile !== "object") return profile;
  const p = profile as Record<string, unknown>;
  if (typeof p.avatarUrl !== "string") return profile;
  const key = extractS3Key(p.avatarUrl);
  if (!key) return profile;
  try {
    return { ...p, avatarUrl: await getSignedViewUrl(key, 60 * 60 * 24 * 7) };
  } catch {
    return { ...p, avatarUrl: null };
  }
};

export const signup = async (email: string, password: string): Promise<SignupResult> => {
  const existing = await repo.findUserByEmail(email);
  if (existing) return { ok: false, conflict: true };

  const passwordHash = await hashPassword(password);
  const user = await repo.createUser({ email, passwordHash });

  await sendWelcomeEmail(email);
  await repo.createAuditLog({ userId: user.id, action: "signup", resourceType: "user", resourceId: user.id });

  notifyLoopLead({
    productSlug: "raised",
    email: user.email,
    source: "signup_email",
    customFields: { userId: user.id },
    interaction: {
      kind: "note",
      subject: "Signed up (email/password)",
      externalId: `raised-signup:${user.id}`,
      occurredAt: new Date().toISOString(),
    },
  }).catch(() => {});

  // TODO: emit UserSignedUp domain event so the family domain can create the default family
  return { ok: true, user };
};

export const login = async (email: string, password: string): Promise<LoginResult> => {
  const user = await repo.findUserWithHashByEmail(email);
  if (!user?.passwordHash) return { ok: false, unauthorized: true };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { ok: false, unauthorized: true };

  const { passwordHash: _, googleId: __, ...publicUser } = user;
  return { ok: true, user: publicUser };
};

export const googleAuth = async (idToken: string): Promise<PublicUser | null> => {
  if (!oauthClient) return null;

  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) return null;

  const existing = await repo.findUserByEmail(payload.email);
  if (existing) {
    const { id, email, role, profile, locale } = existing;
    return { id, email, role, profile, locale };
  }

  const user = await repo.createUser({ email: payload.email, googleId: payload.sub ?? undefined });

  notifyLoopLead({
    productSlug: "raised",
    email: user.email,
    name: payload.name ?? undefined,
    source: "signup_google",
    customFields: { userId: user.id, googleSub: payload.sub ?? null },
    interaction: {
      kind: "note",
      subject: "Signed up (Google)",
      externalId: `raised-signup:${user.id}`,
      occurredAt: new Date().toISOString(),
    },
  }).catch(() => {});

  // TODO: emit UserSignedUp domain event so the family domain can create the default family
  return user;
};

export const requestPasswordReset = async (
  email: string,
  signToken: (payload: { sub: string; kind: string }, opts: { expiresIn: string }) => string,
): Promise<string | null> => {
  const user = await repo.findUserByEmail(email);
  if (!user) return null;
  return signToken({ sub: user.id, kind: "reset" }, { expiresIn: "30m" });
};

export const sendPasswordResetEmail = (email: string, link: string) =>
  sendResetEmail(email, link);

export const resetPassword = async (userId: string, newPassword: string) => {
  const passwordHash = await hashPassword(newPassword);
  await repo.updateUser(userId, { passwordHash });
};

export const getMe = async (userId: string): Promise<PublicUser | null> => {
  const user = await repo.findUserWithHashById(userId);
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return {
    ...rest,
    hasPassword: passwordHash != null,
    profile: await signProfileAvatarUrl(user.profile),
  };
};

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: "wrong_current" | "no_password" | "same_as_old" };

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> => {
  const user = await repo.findUserWithHashById(userId);
  if (!user?.passwordHash) return { ok: false, reason: "no_password" };

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return { ok: false, reason: "wrong_current" };

  const sameAsOld = await bcrypt.compare(newPassword, user.passwordHash);
  if (sameAsOld) return { ok: false, reason: "same_as_old" };

  const passwordHash = await hashPassword(newPassword);
  await repo.updateUser(userId, { passwordHash });
  await repo.createAuditLog({
    userId,
    action: "password_change",
    resourceType: "user",
    resourceId: userId,
  });

  return { ok: true };
};

export const updateMe = async (
  userId: string,
  body: z.infer<typeof updateProfileSchema>,
): Promise<PublicUser> => {
  const current = await repo.findUserById(userId);
  const currentProfile =
    current?.profile && typeof current.profile === "object" && !Array.isArray(current.profile)
      ? (current.profile as Record<string, unknown>)
      : {};

  const updatedProfile = {
    ...currentProfile,
    ...(body.name !== undefined && { name: body.name ?? null }),
    ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl ?? null }),
    ...(body.onboarded !== undefined && { onboarded: body.onboarded }),
    ...(body.roleInHousehold !== undefined && { roleInHousehold: body.roleInHousehold }),
    ...(body.interests !== undefined && { interests: body.interests }),
    ...(body.notificationPrefs !== undefined && { notificationPrefs: body.notificationPrefs }),
    ...(body.timeZone !== undefined && { timeZone: body.timeZone }),
  };

  const updated = await repo.updateUser(userId, {
    profile: updatedProfile,
    ...(body.locale !== undefined && { locale: body.locale }),
  });

  await repo.createAuditLog({ userId, action: "update", resourceType: "user", resourceId: userId });
  return { ...updated, profile: await signProfileAvatarUrl(updated.profile) };
};

export const getAvatarUploadUrl = (contentType: string, contentLength: number) =>
  createUploadUrl({
    contentType,
    contentLength,
    allowedMime: ["image/jpeg", "image/png", "image/webp"],
    maxSizeBytes: 5 * 1024 * 1024,
  });

export const deleteAccount = (userId: string) =>
  // TODO: emit UserDeleted domain event so other domains can clean up their data
  repo.deleteUser(userId);

export const recordConsent = (
  userId: string,
  type: string,
  version: string,
  locale: string,
) => repo.createConsent({ userId, type, version, locale });
