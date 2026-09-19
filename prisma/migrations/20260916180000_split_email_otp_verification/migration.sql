-- PhoneVerification was previously reused by the identity-verification
-- email-OTP step (storing the user's email address in `phoneNumber` as a
-- workaround for not having an SMS/WhatsApp provider). That collided with
-- real WhatsApp phone verification added alongside this migration: both
-- flows upserted the same row keyed by userId, clobbering each other's
-- verifiedAt/phoneNumber. This migration splits them into separate tables
-- and migrates existing email-OTP data out of PhoneVerification so it no
-- longer falsely satisfies the new "real WhatsApp number verified" gate.

CREATE TABLE `EmailOtpVerification` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `codeHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `verifiedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `EmailOtpVerification_userId_key`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `EmailOtpVerification`
  ADD CONSTRAINT `EmailOtpVerification_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry over existing email-OTP records (rows where phoneNumber is actually
-- an email address, from the old reused-table workaround) so users who
-- already completed the KYC email step keep that status.
INSERT INTO `EmailOtpVerification` (`id`, `userId`, `codeHash`, `expiresAt`, `verifiedAt`, `createdAt`)
SELECT `id`, `userId`, `codeHash`, `expiresAt`, `verifiedAt`, `createdAt`
FROM `PhoneVerification`
WHERE `phoneNumber` LIKE '%@%';

-- Remove the misused rows from PhoneVerification so it only ever represents
-- a real, WhatsApp-verified phone number going forward.
DELETE FROM `PhoneVerification` WHERE `phoneNumber` LIKE '%@%';
