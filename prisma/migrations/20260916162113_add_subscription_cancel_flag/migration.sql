-- AlterTable
-- Adds a single non-nullable boolean column with a default, so it backfills
-- existing rows safely with no data loss and no downtime. Purely additive:
-- no columns dropped, no types changed, no existing data touched.
ALTER TABLE `User` ADD COLUMN `subscriptionCancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT false;
