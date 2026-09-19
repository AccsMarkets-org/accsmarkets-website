// Brevo (formerly Sendinblue) transactional email API — used for bulk
// marketing sends to opted-in users. Unlike WhatsApp, Brevo doesn't require
// pre-approved templates for marketing content, so campaigns send freeform
// subject/HTML composed directly in the admin panel.

import { logger } from "@/lib/logger";

export function isBrevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

interface SendBrevoEmailInput {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}

interface BrevoSendResponse {
  messageId?: string;
}

interface BrevoErrorResponse {
  code?: string;
  message?: string;
}

export async function sendBrevoEmail({ to, toName, subject, htmlContent }: SendBrevoEmailInput): Promise<{ messageId: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("Brevo is not configured — set BREVO_API_KEY to enable email campaigns.");
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@accsmarkets.org";
  const senderName = process.env.BREVO_SENDER_NAME || "AccsMarkets";

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const data: BrevoSendResponse & BrevoErrorResponse = await res.json();

  if (!res.ok) {
    const msg = data.message ?? `Brevo API error ${res.status}`;
    logger.error("brevo_send_failed", { to, status: res.status, error: msg });
    throw new Error(msg);
  }

  return { messageId: data.messageId ?? "" };
}
