import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { env } from "../../config/env.js";

const client =
  env.AWS_REGION && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
    ? new S3Client({
        region: env.AWS_REGION,
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      })
    : undefined;

export type PresignOptions = {
  contentType: string;
  contentLength: number;
  allowedMime?: string[];
  maxSizeBytes?: number;
};

export const createUploadUrl = async (opts: PresignOptions) => {
  if (!client || !env.S3_BUCKET) throw new Error("S3 not configured");
  if (opts.maxSizeBytes && opts.contentLength > opts.maxSizeBytes) throw new Error("File too large");
  if (opts.allowedMime && !opts.allowedMime.includes(opts.contentType)) throw new Error("Unsupported mime type");

  const key = `uploads/${randomUUID()}`;
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: opts.contentType,
    ContentLength: opts.contentLength,
  });
  const url = await getSignedUrl(client, command, { expiresIn: 300 });
  return { key, url };
};

export const getSignedViewUrl = async (key: string, expiresIn = 3600) => {
  if (!client || !env.S3_BUCKET) throw new Error("S3 not configured");
  const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn });
};

/** Presigned PUT URL targeting a specific bucket (e.g. S3_BUCKET_SURVEY_AUDIO). */
export const createUploadUrlForBucket = async (
  bucket: string,
  opts: PresignOptions,
): Promise<{ key: string; url: string }> => {
  if (!client) throw new Error("S3 not configured");
  if (opts.maxSizeBytes && opts.contentLength > opts.maxSizeBytes) throw new Error("File too large");
  if (opts.allowedMime && !opts.allowedMime.includes(opts.contentType)) throw new Error("Unsupported mime type");

  const key = `uploads/${randomUUID()}`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: opts.contentType,
    ContentLength: opts.contentLength,
  });
  const url = await getSignedUrl(client, command, { expiresIn: 300 });
  return { key, url };
};

/** Presigned GET URL for a specific bucket and key (e.g. survey audio). */
export const getSignedViewUrlForBucket = async (
  bucket: string,
  key: string,
  expiresIn = 3600,
): Promise<string> => {
  if (!client) throw new Error("S3 not configured");
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn });
};

export const extractS3Key = (url: string): string | null => {
  if (!url) return null;
  const noQuery = url.trim().split("?")[0];
  if (noQuery.startsWith("uploads/")) return noQuery;
  try {
    const parsed = new URL(noQuery.startsWith("//") ? `https:${noQuery}` : noQuery);
    const path = parsed.pathname.replace(/^\/+/, "");
    if (!path.startsWith("uploads/")) return null;
    const h = parsed.hostname.toLowerCase();
    const isS3 = (h.endsWith(".amazonaws.com") || h.endsWith(".amazonaws.com.cn")) && (h.includes(".s3.") || /^s3[.-]/.test(h));
    if (!isS3) return null;
    return path;
  } catch {
    return null;
  }
};
