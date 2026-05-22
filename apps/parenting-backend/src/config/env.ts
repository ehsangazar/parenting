import { z } from "zod";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "..", "..", ".env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),

  // Database
  DATABASE_URL: z.string().url(),

  // Auth
  JWT_SECRET: z.string().min(10),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // App
  APP_URL: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),

  // Email
  EMAIL_FROM: z.string().optional(),
  SMTP_URL: z.string().optional(),
  SMTP_ENDPOINT: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_ACCESS_KEY: z.string().optional(),
  SMTP_ACCESS_KEY_SECRET: z.string().optional(),

  // AWS / S3
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  S3_BUCKET_SURVEY_AUDIO: z.string().optional(),

  // AI
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_GEMINI_API_KEY: z.string().optional(),

  // Billing
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().optional(),

  // Reminders
  REMINDER_HOUR: z.coerce.number().int().min(0).max(23).default(9),
  REMINDER_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== "false"),

  // Web Push
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),

  // Loop CRM (fire-and-forget lead notifications)
  LOOP_WEBHOOK_URL: z.string().url().optional(),
  LOOP_WEBHOOK_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten());
  process.exit(1);
}

export const env = parsed.data;
