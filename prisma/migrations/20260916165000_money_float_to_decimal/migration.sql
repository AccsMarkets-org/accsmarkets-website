-- AlterTable: convert money/rate fields from FLOAT (binary, imprecise) to
-- DECIMAL (exact) to match the rest of the ledger, which is already Decimal
-- throughout. MySQL's MODIFY COLUMN converts each existing FLOAT value to the
-- nearest representable DECIMAL at the target precision/scale in place — no
-- rows are dropped or nulled, and NOT NULL / DEFAULT are preserved.
--
-- Precision choices: rates (escrowFeeRate, feeRate) use DECIMAL(6,4) — four
-- decimal places is enough for e.g. 0.0500 (5%) with headroom, matching how
-- these are actually entered/displayed (percent with up to 2 decimal places
-- in the admin UI). Dollar amounts use DECIMAL(12,2), matching every other
-- money column in this schema (walletBalance, Escrow.amount, etc.).
ALTER TABLE `SubscriptionPlan` MODIFY COLUMN `escrowFeeRate` DECIMAL(6, 4) NOT NULL;

ALTER TABLE `PlatformSettings` MODIFY COLUMN `bankTransferShortfallToleranceUsd` DECIMAL(12, 2) NOT NULL DEFAULT 1.00;

ALTER TABLE `DepositMethodFee` MODIFY COLUMN `feeRate` DECIMAL(6, 4) NOT NULL DEFAULT 0;
ALTER TABLE `DepositMethodFee` MODIFY COLUMN `minFee` DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE `DepositMethodFee` MODIFY COLUMN `maxFee` DECIMAL(12, 2) NULL;
