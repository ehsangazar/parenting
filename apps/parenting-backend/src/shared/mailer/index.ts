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

export const sendResetEmail = (to: string, link: string) =>
  sendMail({
    to,
    subject: "Reset your password",
    html: `<p>Reset your password: <a href="${link}">${link}</a></p>`,
  });
