import nodemailer from "nodemailer";
import { env } from "../../config/env.js";
import { notifyLoopLead } from "../loop/index.js";

const transporter = (() => {
  if (env.SMTP_ENDPOINT && env.SMTP_PORT && env.SMTP_ACCESS_KEY && env.SMTP_ACCESS_KEY_SECRET) {
    return nodemailer.createTransport({
      host: env.SMTP_ENDPOINT,
      port: env.SMTP_PORT,
      secure: false,
      auth: { user: env.SMTP_ACCESS_KEY, pass: env.SMTP_ACCESS_KEY_SECRET },
    });
  }
  if (env.SMTP_URL) {
    return nodemailer.createTransport(env.SMTP_URL);
  }
  return null;
})();

const sendMail = async (opts: { to: string; subject: string; html: string }) => {
  if (!transporter || !env.EMAIL_FROM) return;
  await transporter.sendMail({ from: env.EMAIL_FROM, ...opts });

  notifyLoopLead({
    productSlug: "raised",
    email: opts.to,
    interaction: {
      kind: "email_sent",
      subject: opts.subject,
      externalId: `raised-email:${Date.now()}:${opts.to}`,
      occurredAt: new Date().toISOString(),
    },
  }).catch(() => {});
};

export const sendWelcomeEmail = (to: string) =>
  sendMail({
    to,
    subject: "Welcome to Parenting",
    html: `<p>Welcome! Your account is ready.</p>`,
  });

export const sendPasswordResetEmail = (to: string, link: string) =>
  sendMail({
    to,
    subject: "Reset your password",
    html: `<p>Reset your password: <a href="${link}">${link}</a></p>`,
  });

export const sendResetEmail = sendPasswordResetEmail;

export const sendFamilyInviteEmail = (to: string, token: string, familyName: string) => {
  const inviteLink = `${env.APP_URL}/signup?invite=${token}`;
  return sendMail({
    to,
    subject: `Join ${familyName} on Parenting`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h1>You've been invited!</h1>
        <p>You've been invited to join the <strong>${familyName}</strong> family.</p>
        <div style="margin:30px 0;">
          <a href="${inviteLink}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Join Family</a>
        </div>
      </div>
    `,
  });
};

export const sendSurveyNotification = (responseId: string) =>
  sendMail({
    to: "eadomestic@gmail.com",
    subject: "New survey submitted",
    html: `<p>A new survey response was submitted. ID: ${responseId}</p>`,
  });

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatEventTime = (start: Date, allDay: boolean) => {
  if (allDay) {
    return new Intl.DateTimeFormat("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(start);
  }
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(start);
};

export const sendEventReminderEmail = (opts: {
  to: string;
  childName: string;
  title: string;
  startDate: Date;
  allDay: boolean;
  location?: string | null;
  appUrl?: string;
}) => {
  const when = formatEventTime(opts.startDate, opts.allDay);
  const safeChild = escapeHtml(opts.childName);
  const safeTitle = escapeHtml(opts.title);
  const safeWhen = escapeHtml(when);
  const safeLocation = opts.location ? escapeHtml(opts.location) : null;
  const calendarUrl = opts.appUrl
    ? `${opts.appUrl.replace(/\/$/, "")}/app/calendar`
    : null;
  const cta = calendarUrl
    ? `<div style="margin:24px 0;">
        <a href="${calendarUrl}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Open calendar</a>
      </div>`
    : "";
  return sendMail({
    to: opts.to,
    subject: `Tomorrow: ${opts.title} for ${opts.childName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111;">
        <h1 style="margin:0 0 16px;">Reminder</h1>
        <p style="margin:0 0 8px;font-size:16px;"><strong>${safeChild}</strong> has <strong>${safeTitle}</strong>.</p>
        <p style="margin:0 0 8px;color:#444;">${safeWhen}</p>
        ${safeLocation ? `<p style="margin:0 0 8px;color:#444;">📍 ${safeLocation}</p>` : ""}
        ${cta}
        <p style="font-size:12px;color:#888;margin-top:32px;">You're getting this because the event is on your family calendar.</p>
      </div>
    `,
  });
};
