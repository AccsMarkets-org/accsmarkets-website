import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";
import { getEmailQueue } from "@/lib/queue";
import { prisma } from "@/lib/db";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  slug?: string; // when provided, DB override is checked first
}

/**
 * Non-fatal by design: email delivery must never break the API response that triggered it.
 * When Redis/BullMQ is available, the job is enqueued and returns immediately (non-blocking).
 * Without Redis, retries once inline then swallows the error.
 */
export async function sendEmail({ to, subject, html, slug }: SendEmailInput): Promise<void> {
  // If a slug is provided, check if an admin-customized DB override exists and use it.
  let resolvedSubject = subject;
  let resolvedHtml = html;
  if (slug) {
    try {
      const override = await prisma.emailTemplate.findUnique({ where: { slug } });
      if (override) {
        resolvedSubject = override.subject;
        resolvedHtml = override.html;
      }
    } catch {
      // Non-fatal — fall through to hardcoded template
    }
  }

  // Off-request-path delivery when queue is available
  const q = getEmailQueue();
  if (q) {
    await q.add("send", { to, subject: resolvedSubject, html: resolvedHtml }, { attempts: 3, backoff: { type: "exponential", delay: 2000 } });
    return;
  }

  // Synchronous fallback (no Redis)
  const client = getTransporter();
  if (!client) {
    logger.warn("email.skipped", { reason: "smtp_not_configured", subject, to });
    return;
  }

  const attempt = () =>
    client.sendMail({
      from: process.env.SMTP_FROM ?? "noreply@accsmarkets.org",
      to,
      subject: resolvedSubject,
      html: resolvedHtml,
    });

  try {
    await attempt();
  } catch (err) {
    logger.warn("email.attempt_failed", { subject, to, attempt: 1, err: String(err) });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      await attempt();
    } catch (err2) {
      logger.error("email.failed", { subject, to, attempt: 2, err: String(err2) });
    }
  }
}
