import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { walletId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wallet = await prisma.cryptoWallet.findUnique({
    where: { id: params.walletId },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!wallet) return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  if (wallet.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (wallet.status !== "confirmed") {
    return NextResponse.json({ error: "Receipt is only available after the deposit is confirmed." }, { status: 400 });
  }

  const amount = formatCurrency(Number(wallet.amountUsd));
  const date = formatDate(wallet.confirmedAt ?? wallet.createdAt);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Deposit Receipt — ${wallet.id}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 600px; margin: 60px auto; color: #111; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .badge { display: inline-block; background: #16a34a; color: #fff; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  td { padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
  td:first-child { color: #6b7280; width: 40%; }
  .total td { font-weight: 700; font-size: 16px; border-bottom: none; }
  footer { margin-top: 40px; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
<h1>Deposit Receipt</h1>
<span class="badge">Confirmed</span>
<table>
  <tr><td>Reference</td><td>${wallet.id}</td></tr>
  <tr><td>Account name</td><td>${wallet.user.name ?? wallet.user.email}</td></tr>
  <tr><td>Method</td><td>Crypto (${wallet.network})${wallet.isManual ? " — manual" : ""}</td></tr>
  ${wallet.txHash ? `<tr><td>Transaction hash</td><td style="word-break:break-all">${wallet.txHash}</td></tr>` : ""}
  ${wallet.amountCrypto ? `<tr><td>Amount received</td><td>${wallet.amountCrypto} ${wallet.currency.toUpperCase()}</td></tr>` : ""}
  <tr><td>Date confirmed</td><td>${date}</td></tr>
  <tr class="total"><td>Amount credited</td><td>${amount}</td></tr>
</table>
<footer>AccsMarkets &middot; Keep this receipt for your records.</footer>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="deposit-${wallet.id}.html"`,
    },
  });
}
