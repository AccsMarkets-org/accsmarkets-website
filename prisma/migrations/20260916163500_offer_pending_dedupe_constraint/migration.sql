-- Race-safe "at most one PENDING offer per (listing, buyer)" constraint.
--
-- MySQL has no partial/filtered unique index (unlike Postgres' WHERE clause on
-- an index), so this uses a STORED GENERATED column that is only non-NULL
-- while status = 'PENDING', combined with a unique index on that column.
-- MySQL unique indexes treat every NULL as distinct from every other NULL, so
-- the constraint only ever fires among currently-PENDING rows for the same
-- listing+buyer — a buyer can still send a new offer after an old one is
-- accepted/declined/countered/cancelled/expired, since that row's generated
-- value reverts to NULL the moment its status changes away from PENDING
-- (MySQL recomputes STORED generated columns automatically on every UPDATE,
-- so no application code needs to maintain this column).
--
-- This column is intentionally NOT added to prisma/schema.prisma: Prisma
-- doesn't need to model every column, and a GENERATED ALWAYS column can't be
-- written to via the Prisma client anyway. The application only needs to
-- catch the resulting unique-constraint violation (Prisma error P2002) when
-- a second concurrent PENDING offer collides.
ALTER TABLE `Offer`
  ADD COLUMN `pendingDedupeKey` VARCHAR(440)
    GENERATED ALWAYS AS (CASE WHEN `status` = 'PENDING' THEN CONCAT(`listingId`, '|', `buyerId`) ELSE NULL END) STORED;

ALTER TABLE `Offer`
  ADD UNIQUE INDEX `Offer_pendingDedupeKey_key` (`pendingDedupeKey`);
