import crypto from "crypto";

const API_BASE = "https://api.nowpayments.io/v1";

// Network -> NOWPayments pay_currency ticker
export const NETWORK_CURRENCY: Record<string, string> = {
  TRC20: "usdttrc20",
  BEP20: "usdtbsc",
  ERC20: "usdterc20",
  POLYGON: "usdtmatic",
  SOLANA: "usdtsol",
};

interface CreatePaymentResult {
  paymentId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
}

export async function createNowPayment(
  priceAmountUsd: number,
  network: string,
  orderId: string,
): Promise<CreatePaymentResult> {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) throw new Error("NOWPayments is not configured");

  const payCurrency = NETWORK_CURRENCY[network];
  if (!payCurrency) throw new Error(`Unsupported network: ${network}`);

  const res = await fetch(`${API_BASE}/payment`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: priceAmountUsd,
      price_currency: "usd",
      pay_currency: payCurrency,
      order_id: orderId,
      ipn_callback_url: `${process.env.NEXTAUTH_URL}/api/webhooks/nowpayments`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NOWPayments error: ${text}`);
  }

  const data = await res.json();
  return {
    paymentId: String(data.payment_id),
    payAddress: data.pay_address,
    payAmount: data.pay_amount,
    payCurrency: data.pay_currency,
  };
}

/**
 * NOWPayments signs IPN callbacks with HMAC-SHA512 over the JSON body with keys
 * sorted alphabetically (recursively) and no extra whitespace. Verifies using a
 * constant-time comparison.
 */
export function verifyIpnSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return false;
  }

  const sorted = sortKeysDeep(payload);
  const canonical = JSON.stringify(sorted);
  const expected = crypto.createHmac("sha512", secret).update(canonical).digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  let actualBuf: Buffer;
  try {
    actualBuf = Buffer.from(signatureHeader, "hex");
  } catch {
    return false;
  }
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}
