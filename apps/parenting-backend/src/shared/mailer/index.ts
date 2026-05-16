import nodemailer from "nodemailer";
import { env } from "../../config/env.js";

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
