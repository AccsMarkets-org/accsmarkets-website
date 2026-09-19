// WhatsApp Business Cloud API (Meta's official platform — NOT an unofficial
// WhatsApp Web automation library). Requires a Meta Business/WhatsApp Business
// Platform account: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and
// WHATSAPP_BUSINESS_ACCOUNT_ID. Until those are set, sends fail closed with a
// clear "not configured" error rather than silently doing nothing or faking
// success — this is an external-account dependency the user must set up in
// Meta Business Manager (create app -> add WhatsApp product -> verify a
// business phone number -> generate a permanent access token).
//
// Marketing/business-initiated messages outside a customer's 24-hour service
// window MUST use a pre-approved message template (Meta reviews and approves
// template content before it can be sent) — this module only supports
// template sends for that reason; there is no freeform marketing-broadcast
// function, by design.

import { logger } from "@/lib/logger";

const GRAPH_API_VERSION = "v21.0";

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

interface WhatsAppTemplateParam {
  type: "text" | "currency" | "date_time";
  text?: string;
}

interface SendTemplateInput {
  /** E.164 phone number, e.g. "+15551234567" */
  to: string;
  /** Must exactly match an APPROVED template name in Meta Business Manager */
  templateName: string;
  /** BCP-47 language code matching the approved template, e.g. "en_US" */
  languageCode?: string;
  /** Positional {{1}}, {{2}}... body variables, in order */
  bodyParams?: string[];
}

interface WhatsAppSendResult {
  messageId: string;
}

interface GraphErrorResponse {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number };
}

interface GraphSendResponse {
  messages?: Array<{ id: string }>;
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode = "en_US",
  bodyParams = [],
}: SendTemplateInput): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp is not configured — set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID (from Meta Business Manager) to enable sending."
    );
  }

  const components = bodyParams.length
    ? [
        {
          type: "body",
          parameters: bodyParams.map((text): WhatsAppTemplateParam => ({ type: "text", text })),
        },
      ]
    : undefined;

  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components ? { components } : {}),
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const data: GraphSendResponse & GraphErrorResponse = await res.json();

  if (!res.ok || data.error) {
    const msg = data.error?.message ?? `WhatsApp API error ${res.status}`;
    logger.error("whatsapp_send_failed", { to, templateName, status: res.status, error: msg });
    throw new Error(msg);
  }

  const messageId = data.messages?.[0]?.id;
  if (!messageId) throw new Error("WhatsApp API returned no message id");

  return { messageId };
}
