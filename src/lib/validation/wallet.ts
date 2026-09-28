import { z } from "zod";

export const cryptoDepositSchema = z.object({
  amountUsd: z.number().min(1, "Minimum deposit is $1"),
  network: z.enum(["TRC20", "BEP20", "ERC20", "POLYGON", "SOLANA"]),
});

export const manualDepositSchema = z.object({
  amountUsd: z.number().min(1),
  network: z.enum(["TRC20", "BEP20", "ERC20", "POLYGON", "SOLANA"]),
  txHash: z.string().trim().min(6, "Enter a valid transaction hash"),
  proofImageUrl: z.string().url().optional(),
});

export const cryptoWithdrawSchema = z.object({
  method: z.literal("crypto"),
  amountUsd: z.number().min(1),
  network: z.enum(["TRC20", "BEP20", "ERC20", "POLYGON", "SOLANA"]),
  address: z.string().trim().min(10, "Enter a valid wallet address"),
});

export const bankWithdrawSchema = z.object({
  method: z.literal("bank"),
  amountUsd: z.number().min(1),
  bankAccountName: z.string().trim().min(2, "Enter the account holder name"),
  bankAccountNumber: z.string().trim().min(4, "Enter a valid account number or IBAN"),
  bankName: z.string().trim().min(1, "Enter the bank name"),
  bankRouting: z.string().trim().max(50).optional(),
});

// Discriminated on `method` so a crypto submission can never be mistaken for
// (or silently accepted as) a bank submission or vice versa — the frontend
// must send the matching field set for whichever tab the user is on.
export const withdrawSchema = z.discriminatedUnion("method", [
  cryptoWithdrawSchema,
  bankWithdrawSchema,
]);

export const tagadaDepositSchema = z.object({
  amountUsd: z.number().min(1, "Minimum deposit is $1").max(10000),
  tagadaToken: z.string().trim().min(1, "Missing card token"),
});

export const bankTransferDepositSchema = z.object({
  amountUsd: z.number().min(10, "Minimum bank transfer is $10"),
  // Optional: which platform bank account the user chose to transfer to.
  // Falls back to the first active account when omitted.
  bankAccountId: z.string().trim().min(1).optional(),
});

export const bankTransferMarkSentSchema = z.object({
  senderName: z.string().trim().min(2).max(100),
  proofImageUrl: z.string().url().optional(),
});

export const adminBankTransferActionSchema = z.object({
  action: z.enum(["verify", "reject", "partial"]),
  // AdminActionButtons sends "amount" for promptAmount; support both names
  amountReceived: z.number().min(0).optional(),
  amount: z.number().min(0).optional(),
  reason: z.string().trim().max(500).optional(),
  adminNotes: z.string().trim().max(1000).optional(),
}).transform((v) => ({ ...v, amountReceived: v.amountReceived ?? v.amount }));
