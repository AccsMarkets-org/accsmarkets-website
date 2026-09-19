-- AlterTable
-- Nullable column, no default needed — existing rows simply have no consumedAt
-- yet (correct: any existing redemption was already fully consumed under the
-- old delete-on-use behavior, so there's nothing to backfill; the fix only
-- changes behavior going forward).
ALTER TABLE `PromoRedemption` ADD COLUMN `consumedAt` DATETIME(3) NULL;
