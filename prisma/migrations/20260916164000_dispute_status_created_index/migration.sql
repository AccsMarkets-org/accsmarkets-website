-- CreateIndex
-- Supports the admin disputes-list query (filter by status, sort by createdAt).
-- Purely additive — building an index does not touch existing row data.
CREATE INDEX `Dispute_status_createdAt_idx` ON `Dispute`(`status`, `createdAt`);
