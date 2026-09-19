import { createHmac } from "crypto";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

type WebhookEventType =
  | "ESCROW_CREATED" | "ESCROW_FUNDED" | "ESCROW_COMPLETED" | "ESCROW_DISPUTED"
  | "OFFER_RECEIVED" | "OFFER_ACCEPTED" | "LISTING_SOLD" | "PAYMENT_RECEIVED";

export async function dispatchWebhook(
  userId: string,
  eventType: WebhookEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { userId, enabled: true },
  });

  const matching = endpoints.filter((ep) => ep.events.split(",").includes(eventType));
  if (matching.length === 0) return;

  await Promise.all(
    matching.map(async (ep) => {
      const delivery = await prisma.webhookDelivery.create({
        data: {
          endpointId: ep.id,
          eventType,
          payload: payload as Prisma.InputJsonValue,
          status: "PENDING",
        },
      });

      await deliverWebhook(delivery.id, ep.url, ep.secret, eventType, payload);
    }),
  );
}

async function deliverWebhook(
  deliveryId: string,
  url: string,
  secret: string,
  eventType: string,
  payload: Record<string, unknown>,
) {
  const body = JSON.stringify({ event: eventType, data: payload, ts: Date.now() });
  const sig = createHmac("sha256", secret).update(body).digest("hex");

  let responseStatus: number | null = null;
  let responseBody: string | null = null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AccsMarkets-Signature": sig,
        "X-AccsMarkets-Event": eventType,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    responseStatus = res.status;
    responseBody = (await res.text()).slice(0, 2000);

    if (res.ok) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: "SUCCESS", responseStatus, responseBody, deliveredAt: new Date(), attempts: { increment: 1 } },
      });
    } else {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "FAILED",
          responseStatus,
          responseBody,
          attempts: { increment: 1 },
          nextRetryAt: new Date(Date.now() + 5 * 60_000), // retry in 5 min
        },
      });
    }
  } catch {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "FAILED",
        responseStatus,
        responseBody: "Network error",
        attempts: { increment: 1 },
        nextRetryAt: new Date(Date.now() + 5 * 60_000),
      },
    });
  }
}
