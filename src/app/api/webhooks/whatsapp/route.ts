import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { logger } from "@/lib/logger";

// Meta's one-time webhook verification handshake, run when you register this
// URL in Meta Business Manager (App -> WhatsApp -> Configuration -> Webhook).
export async function GET(req: NextRequest) {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) return NextResponse.json({ error: "WhatsApp webhook not configured" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

interface WhatsAppWebhookEntry {
  changes?: Array<{
    value?: {
      statuses?: Array<{ id: string; status: string; recipient_id?: string; errors?: Array<{ message?: string }> }>;
      messages?: Array<{ from: string; id: string; type: string; text?: { body?: string } }>;
    };
  }>;
}

// Delivery-status updates (sent/delivered/read/failed) and inbound replies —
// logged for now via the structured logger; not persisted to a dedicated
// table since there's no admin UI consuming per-message status yet (a real
// gap if/when granular delivery reporting is needed, not something to fake).
export async function POST(req: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const rawBody = await req.text();

  // Fail closed: without the app secret the signature can't be verified, so
  // nothing is processed.
  if (!appSecret) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const signature = req.headers.get("x-hub-signature-256");
  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const signatureBuf = Buffer.from(signature ?? "");
  const expectedBuf = Buffer.from(expected);
  // timingSafeEqual throws on unequal lengths — check first.
  if (signatureBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: { entry?: WhatsAppWebhookEntry[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        logger.info("whatsapp_status", { messageId: status.id, status: status.status, to: status.recipient_id });
      }
      for (const msg of change.value?.messages ?? []) {
        logger.info("whatsapp_inbound", { from: msg.from, messageId: msg.id, type: msg.type });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
