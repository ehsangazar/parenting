import { recordAudit } from "../../shared/audit/index.js";
import { awardCoins, awardInsight } from "../../shared/gamification/index.js";
import { POINTS } from "../../config/points.js";
import { createUploadUrl, getSignedViewUrl } from "../../shared/storage/index.js";
import * as repo from "./moments.repository.js";
import type {
  CreateMomentInput,
  UpdateMomentInput,
  PresignInput,
  CreateMediaInput,
  CreateTagInput,
  CreateCommentInput,
  CreateReactionInput,
  CreateAlbumInput,
  UpdateAlbumInput,
} from "./moments.schema.js";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
];

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB

// ---- Presign ----

export async function presignUpload(userId: string, familyId: string, input: PresignInput) {
  const result = await createUploadUrl({
    contentType: input.contentType,
    contentLength: input.contentLength,
    allowedMime: ALLOWED_MIME_TYPES,
    maxSizeBytes: MAX_UPLOAD_BYTES,
  });

  await recordAudit({
    userId,
    action: "presign_upload",
    resourceType: "moment_media",
    resourceId: result.key,
  });

  return result;
}

// ---- Moments ----

async function attachSignedUrls<T extends { media: Array<{ s3Key: string }> }>(
  item: T,
): Promise<T & { media: Array<{ s3Key: string; url: string | null }> }> {
  const media = await Promise.all(
    item.media.map(async (m) => {
      try {
        const url = await getSignedViewUrl(m.s3Key);
        return { ...m, url };
      } catch {
        return { ...m, url: null };
      }
    }),
  );
  return { ...item, media };
}

export async function createMoment(
  userId: string,
  familyId: string,
  input: CreateMomentInput,
) {
  const moment = await repo.createMoment(familyId, userId, input);

  await recordAudit({
    userId,
    action: "create",
    resourceType: "moment",
    resourceId: moment.id,
  });

  try {
    await Promise.all([
      awardCoins(userId, POINTS.COINS_CAPTURE_MOMENT),
      awardInsight(userId, POINTS.INSIGHT_CAPTURE_MOMENT, "capture_moment"),
    ]);
  } catch {
    // non-fatal: gamification failure should not block the response
  }

  return moment;
}

export async function getMoments(
  familyId: string,
  opts: repo.FindMomentsOptions,
) {
  const result = await repo.findMoments(familyId, opts);

  const moments = await Promise.all(result.moments.map(attachSignedUrls));

  return { moments, total: result.total, limit: result.limit, offset: result.offset };
}

export async function getMoment(momentId: string, familyId: string) {
  const moment = await repo.findMoment(momentId, familyId);
  if (!moment) return null;
  return attachSignedUrls(moment);
}

export async function updateMoment(
  userId: string,
  momentId: string,
  familyId: string,
  input: UpdateMomentInput,
) {
  const existing = await repo.findMoment(momentId, familyId);
  if (!existing) return null;

  const updated = await repo.updateMoment(momentId, input);

  await recordAudit({
    userId,
    action: "update",
    resourceType: "moment",
    resourceId: momentId,
  });

  return updated;
}

export async function deleteMoment(
  userId: string,
  momentId: string,
  familyId: string,
) {
  const existing = await repo.findMomentOwned(momentId, familyId, userId);
  if (!existing) return false;

  await repo.deleteMoment(momentId);

  await recordAudit({
    userId,
    action: "delete",
    resourceType: "moment",
    resourceId: momentId,
  });

  return true;
}

// ---- Media ----

export async function addMedia(
  userId: string,
  momentId: string,
  familyId: string,
  input: CreateMediaInput,
) {
  const moment = await repo.findMomentOwned(momentId, familyId, userId);
  if (!moment) return null;

  const media = await repo.createMedia(momentId, input);

  await recordAudit({
    userId,
    action: "create",
    resourceType: "moment_media",
    resourceId: media.id,
  });

  return media;
}

export async function removeMedia(
  userId: string,
  momentId: string,
  familyId: string,
  mediaId: string,
) {
  const moment = await repo.findMomentWithMedia(momentId, familyId, userId, mediaId);
  if (!moment || moment.media.length === 0) return false;

  await repo.deleteMedia(mediaId);

  await recordAudit({
    userId,
    action: "delete",
    resourceType: "moment_media",
    resourceId: mediaId,
  });

  return true;
}

// ---- Tags ----

export async function addTag(
  momentId: string,
  familyId: string,
  input: CreateTagInput,
) {
  const moment = await repo.findMoment(momentId, familyId);
  if (!moment) return null;
  return repo.createTag(momentId, input);
}

export async function removeTag(
  momentId: string,
  familyId: string,
  tagId: string,
) {
  const tag = await repo.findTag(tagId, momentId);
  if (!tag) return false;
  await repo.deleteTag(tagId);
  return true;
}

// ---- Comments ----

export async function addComment(
  userId: string,
  momentId: string,
  familyId: string,
  input: CreateCommentInput,
) {
  const moment = await repo.findMoment(momentId, familyId);
  if (!moment) return null;
  return repo.createComment(momentId, userId, input);
}

export async function removeComment(
  userId: string,
  momentId: string,
  familyId: string,
  commentId: string,
) {
  // Verify moment belongs to family first
  const moment = await repo.findMoment(momentId, familyId);
  if (!moment) return false;

  const comment = await repo.findComment(commentId, momentId, userId);
  if (!comment) return false;

  await repo.deleteComment(commentId);
  return true;
}

// ---- Reactions ----

export async function addReaction(
  userId: string,
  momentId: string,
  familyId: string,
  input: CreateReactionInput,
) {
  const moment = await repo.findMoment(momentId, familyId);
  if (!moment) return null;
  return repo.createReaction(momentId, userId, input);
}

export async function removeReaction(
  userId: string,
  momentId: string,
  familyId: string,
) {
  // Verify moment belongs to family first
  const moment = await repo.findMoment(momentId, familyId);
  if (!moment) return false;

  await repo.deleteReaction(momentId, userId);
  return true;
}

// ---- Albums ----

export async function createAlbum(
  userId: string,
  familyId: string,
  input: CreateAlbumInput,
) {
  const album = await repo.createAlbum(familyId, userId, input);

  await recordAudit({
    userId,
    action: "create",
    resourceType: "album",
    resourceId: album.id,
  });

  return album;
}

export async function getAlbums(familyId: string) {
  return repo.findAlbums(familyId);
}

export async function getAlbum(albumId: string, familyId: string) {
  return repo.findAlbum(albumId, familyId);
}

export async function updateAlbum(
  userId: string,
  albumId: string,
  familyId: string,
  input: UpdateAlbumInput,
) {
  const existing = await repo.findAlbumOwned(albumId, familyId, userId);
  if (!existing) return null;

  const updated = await repo.updateAlbum(albumId, input);

  await recordAudit({
    userId,
    action: "update",
    resourceType: "album",
    resourceId: albumId,
  });

  return updated;
}

export async function deleteAlbum(
  userId: string,
  albumId: string,
  familyId: string,
) {
  const existing = await repo.findAlbumOwned(albumId, familyId, userId);
  if (!existing) return false;

  await repo.deleteAlbum(albumId);

  await recordAudit({
    userId,
    action: "delete",
    resourceType: "album",
    resourceId: albumId,
  });

  return true;
}

export async function addMomentToAlbum(
  albumId: string,
  momentId: string,
  familyId: string,
) {
  const [album, moment] = await Promise.all([
    repo.findAlbum(albumId, familyId),
    repo.findMoment(momentId, familyId),
  ]);

  if (!album || !moment) return null;

  return repo.addMomentToAlbum(albumId, momentId);
}

export async function removeMomentFromAlbum(
  albumId: string,
  momentId: string,
  familyId: string,
) {
  const result = await repo.removeMomentFromAlbum(albumId, momentId, familyId);
  return result !== null;
}

export { checkFamilyAccess } from "./moments.repository.js";
