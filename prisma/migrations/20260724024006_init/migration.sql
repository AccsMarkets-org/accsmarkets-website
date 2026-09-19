-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    INDEX `Account_userId_idx`(`userId`),
    UNIQUE INDEX `Account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationToken` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VerificationToken_token_key`(`token`),
    UNIQUE INDEX `VerificationToken_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `emailVerified` DATETIME(3) NULL,
    `password` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `username` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `kycLevel` ENUM('NONE', 'EMAIL', 'PHONE', 'ID_VERIFIED') NOT NULL DEFAULT 'NONE',
    `verifiedBadge` ENUM('NONE', 'BLUE', 'GOLD', 'GREY', 'OFFICIAL') NOT NULL DEFAULT 'NONE',
    `trustScore` INTEGER NOT NULL DEFAULT 0,
    `walletBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `subscriptionPlanId` VARCHAR(191) NULL,
    `subscriptionExpiresAt` DATETIME(3) NULL,
    `bio` TEXT NULL,
    `socialLinks` JSON NULL,
    `isBanned` BOOLEAN NOT NULL DEFAULT false,
    `bannedReason` VARCHAR(191) NULL,
    `lastSeenAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `displayCurrency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `referralCookie` VARCHAR(191) NULL,
    `countryCode` VARCHAR(2) NULL,
    `primaryIntent` ENUM('BUYER', 'SELLER', 'BOTH') NULL,
    `sellIntentPlatforms` JSON NULL,
    `sellReason` ENUM('NO_LONGER_NEEDED', 'FUNDING_NEW_PROJECT', 'DIVERSIFYING', 'OTHER') NULL,
    `onboardingCompletedAt` DATETIME(3) NULL,
    `notifPrefs` JSON NULL,
    `staffRoleId` VARCHAR(191) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_username_key`(`username`),
    INDEX `User_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Listing` (
    `id` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `platform` ENUM('YOUTUBE', 'INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'TELEGRAM', 'TWITTER_X', 'SNAPCHAT', 'PINTEREST', 'LINKEDIN', 'WEBSITE') NOT NULL,
    `accountUrl` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `followers` INTEGER NULL,
    `engagementRate` DOUBLE NULL,
    `accountAgeMonths` INTEGER NULL,
    `monetized` BOOLEAN NOT NULL DEFAULT false,
    `lifetimeViews` INTEGER NULL,
    `lifetimeRevenue` DECIMAL(12, 2) NULL,
    `channelRpm` DECIMAL(8, 2) NULL,
    `audienceLanguage` VARCHAR(191) NULL,
    `channelCreationDate` DATETIME(3) NULL,
    `strikeCount` INTEGER NOT NULL DEFAULT 0,
    `warningCount` INTEGER NOT NULL DEFAULT 0,
    `strikeWarningContext` TEXT NULL,
    `adsenseStatus` ENUM('ON', 'OFF', 'CHANGEABLE') NULL,
    `displayName` VARCHAR(191) NULL,
    `accountLogo` VARCHAR(191) NULL,
    `screenshots` JSON NOT NULL,
    `ownershipVerificationCode` VARCHAR(191) NULL,
    `ownershipVerified` BOOLEAN NOT NULL DEFAULT false,
    `ownershipMethod` VARCHAR(191) NULL,
    `ownershipVerifiedAt` DATETIME(3) NULL,
    `verifiedPlatformId` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PENDING', 'ACTIVE', 'SOLD', 'REJECTED', 'SUSPENDED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `moderationScore` INTEGER NOT NULL DEFAULT 0,
    `rejectionReason` VARCHAR(191) NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `isPremiumFeatured` BOOLEAN NOT NULL DEFAULT false,
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `featuredUntil` DATETIME(3) NULL,
    `pinnedUntil` DATETIME(3) NULL,
    `lastBumpedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `approvedAt` DATETIME(3) NULL,
    `soldAt` DATETIME(3) NULL,
    `saleType` ENUM('FIXED', 'AUCTION') NOT NULL DEFAULT 'FIXED',
    `isPrivate` BOOLEAN NOT NULL DEFAULT false,
    `auctionEndsAt` DATETIME(3) NULL,
    `reservePrice` DECIMAL(12, 2) NULL,
    `buyNowPrice` DECIMAL(12, 2) NULL,
    `minBidIncrement` DECIMAL(12, 2) NULL,
    `organizationId` VARCHAR(191) NULL,

    INDEX `Listing_status_platform_idx`(`status`, `platform`),
    INDEX `Listing_sellerId_idx`(`sellerId`),
    INDEX `Listing_saleType_status_idx`(`saleType`, `status`),
    FULLTEXT INDEX `Listing_title_description_idx`(`title`, `description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Offer` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `message` TEXT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'COUNTERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `parentOfferId` VARCHAR(191) NULL,
    `round` INTEGER NOT NULL DEFAULT 1,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Offer_listingId_buyerId_status_idx`(`listingId`, `buyerId`, `status`),
    INDEX `Offer_sellerId_status_idx`(`sellerId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Escrow` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `feeAmount` DECIMAL(12, 2) NOT NULL,
    `totalCharged` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('FUNDED', 'AWAITING_MANAGER_ADD', 'PENDING_VERIFICATION', 'SUBMITTED', 'VERIFIED', 'IN_TRANSFER', 'COMPLETED', 'CANCELLED', 'DISPUTED') NOT NULL DEFAULT 'FUNDED',
    `cryptoNetwork` VARCHAR(191) NULL,
    `ownershipEmail` VARCHAR(191) NULL,
    `credentialsPayload` TEXT NULL,
    `transferDeadline` DATETIME(3) NULL,
    `fundedAt` DATETIME(3) NULL,
    `submittedAt` DATETIME(3) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `transferStartedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancelReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isHighValue` BOOLEAN NOT NULL DEFAULT false,
    `videoVerificationRequired` BOOLEAN NOT NULL DEFAULT false,
    `videoVerificationCompletedAt` DATETIME(3) NULL,
    `transferModel` ENUM('STANDARD', 'TRUSTLESS') NULL,
    `managerEmailId` VARCHAR(191) NULL,
    `managerAddedAt` DATETIME(3) NULL,
    `buyerManagerAddedAt` DATETIME(3) NULL,
    `countdownEndsAt` DATETIME(3) NULL,
    `escrowOwnerPromotedAt` DATETIME(3) NULL,
    `sellerConfirmedHandoverAt` DATETIME(3) NULL,
    `verifiedBy` VARCHAR(191) NULL,
    `organizationId` VARCHAR(191) NULL,

    UNIQUE INDEX `Escrow_offerId_key`(`offerId`),
    UNIQUE INDEX `Escrow_managerEmailId_key`(`managerEmailId`),
    INDEX `Escrow_listingId_idx`(`listingId`),
    INDEX `Escrow_buyerId_idx`(`buyerId`),
    INDEX `Escrow_sellerId_idx`(`sellerId`),
    INDEX `Escrow_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dispute` (
    `id` VARCHAR(191) NOT NULL,
    `escrowId` VARCHAR(191) NOT NULL,
    `openedById` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `phase` ENUM('EVIDENCE', 'REVIEW', 'MEDIATION', 'RULING', 'APPEAL', 'FINAL') NOT NULL DEFAULT 'EVIDENCE',
    `reason` TEXT NOT NULL,
    `resolution` TEXT NULL,
    `adminNotes` TEXT NULL,
    `evidenceDeadline` DATETIME(3) NULL,
    `mediationOffer` DECIMAL(12, 2) NULL,
    `mediationCounterOffer` DECIMAL(12, 2) NULL,
    `mediationAccepted` BOOLEAN NULL,
    `appealedAt` DATETIME(3) NULL,
    `appealReason` TEXT NULL,
    `appealReviewedAt` DATETIME(3) NULL,
    `appealDecision` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Dispute_escrowId_key`(`escrowId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DisputeEvidence` (
    `id` VARCHAR(191) NOT NULL,
    `disputeId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `statement` TEXT NOT NULL,
    `attachments` JSON NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DisputeEvidence_disputeId_idx`(`disputeId`),
    INDEX `DisputeEvidence_disputeId_userId_idx`(`disputeId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DisputeTimeline` (
    `id` VARCHAR(191) NOT NULL,
    `disputeId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DisputeTimeline_disputeId_createdAt_idx`(`disputeId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `recipientId` VARCHAR(191) NOT NULL,
    `escrowId` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `attachmentUrl` VARCHAR(191) NULL,
    `attachmentName` VARCHAR(191) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `moderationFlagged` BOOLEAN NOT NULL DEFAULT false,
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `pinnedAt` DATETIME(3) NULL,
    `pinnedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Message_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    INDEX `Message_recipientId_isRead_idx`(`recipientId`, `isRead`),
    INDEX `Message_escrowId_isPinned_idx`(`escrowId`, `isPinned`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('LISTING', 'LISTING_APPROVED', 'LISTING_REJECTED', 'OFFER', 'ESCROW', 'MESSAGE', 'PAYMENT', 'DEPOSIT_CONFIRMED', 'SYSTEM', 'DISPUTE', 'SECURITY') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `link` VARCHAR(191) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_isRead_idx`(`userId`, `isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('DEPOSIT', 'WITHDRAWAL', 'ESCROW_PAYMENT', 'ESCROW_RELEASE', 'PLATFORM_FEE', 'REFUND', 'WALLET_CREDIT', 'WALLET_DEBIT', 'PROMOTION', 'BUMP', 'SUBSCRIPTION') NOT NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `amount` DECIMAL(12, 2) NOT NULL,
    `balanceBefore` DECIMAL(12, 2) NOT NULL,
    `balanceAfter` DECIMAL(12, 2) NOT NULL,
    `escrowId` VARCHAR(191) NULL,
    `cryptoPaymentId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Transaction_cryptoPaymentId_key`(`cryptoPaymentId`),
    INDEX `Transaction_userId_type_idx`(`userId`, `type`),
    INDEX `Transaction_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionPlan` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `priceMonthly` DECIMAL(12, 2) NOT NULL,
    `listingLimit` INTEGER NOT NULL,
    `escrowFeeRate` DOUBLE NOT NULL,
    `minFee` DECIMAL(12, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SubscriptionPlan_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CryptoWallet` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `network` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'waiting',
    `amountUsd` DECIMAL(12, 2) NOT NULL,
    `amountCrypto` DECIMAL(24, 8) NULL,
    `currency` VARCHAR(191) NOT NULL,
    `isManual` BOOLEAN NOT NULL DEFAULT false,
    `txHash` VARCHAR(191) NULL,
    `proofImageUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmedAt` DATETIME(3) NULL,

    UNIQUE INDEX `CryptoWallet_paymentId_key`(`paymentId`),
    INDEX `CryptoWallet_userId_idx`(`userId`),
    INDEX `CryptoWallet_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformSettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `siteName` VARCHAR(191) NOT NULL DEFAULT 'AccsMarkets',
    `maintenanceMode` BOOLEAN NOT NULL DEFAULT false,
    `maintenanceTitle` VARCHAR(191) NULL,
    `maintenanceMessage` TEXT NULL,
    `maintenanceEndTime` DATETIME(3) NULL,
    `maintenanceAllowAdmins` BOOLEAN NOT NULL DEFAULT true,
    `registrationOpen` BOOLEAN NOT NULL DEFAULT true,
    `requireEmailVerification` BOOLEAN NOT NULL DEFAULT true,
    `minDeposit` DECIMAL(12, 2) NOT NULL DEFAULT 10,
    `minWithdrawal` DECIMAL(12, 2) NOT NULL DEFAULT 20,
    `escrowTransferDays` INTEGER NOT NULL DEFAULT 3,
    `disputeWindowHours` INTEGER NOT NULL DEFAULT 48,
    `highValueEscrowThreshold` DECIMAL(12, 2) NOT NULL DEFAULT 500,
    `officialSupportUserId` VARCHAR(191) NULL,
    `listingReviewHours` INTEGER NOT NULL DEFAULT 48,
    `bankTransferShortfallToleranceUsd` DOUBLE NOT NULL DEFAULT 1.0,
    `bankTransferShortfallTolerancePct` DOUBLE NOT NULL DEFAULT 0.01,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformTransferPolicy` (
    `id` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `transferDays` INTEGER NOT NULL DEFAULT 3,
    `policyNote` TEXT NULL,
    `allowTrustless` BOOLEAN NOT NULL DEFAULT false,
    `trustlessBootstrapDays` INTEGER NOT NULL DEFAULT 7,
    `sourceNote` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlatformTransferPolicy_platform_key`(`platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EscrowManagerEmail` (
    `id` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `status` ENUM('AVAILABLE', 'IN_USE', 'FLAGGED') NOT NULL DEFAULT 'AVAILABLE',
    `notes` TEXT NULL,
    `addedAsManagerAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EscrowManagerEmail_address_key`(`address`),
    INDEX `EscrowManagerEmail_platform_status_idx`(`platform`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminAuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdminAuditLog_adminId_idx`(`adminId`),
    INDEX `AdminAuditLog_targetType_targetId_idx`(`targetType`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CannedResponse` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RateLimitEvent` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RateLimitEvent_key_createdAt_idx`(`key`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TwoFactorAuth` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `secret` VARCHAR(191) NOT NULL,
    `backupCodes` TEXT NOT NULL,
    `enabledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TwoFactorAuth_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoginAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `success` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LoginAttempt_email_createdAt_idx`(`email`, `createdAt`),
    INDEX `LoginAttempt_ip_createdAt_idx`(`ip`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActiveSession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userAgent` TEXT NULL,
    `ip` VARCHAR(191) NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActiveSession_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Review` (
    `id` VARCHAR(191) NOT NULL,
    `escrowId` VARCHAR(191) NOT NULL,
    `reviewerId` VARCHAR(191) NOT NULL,
    `revieweeId` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Review_revieweeId_idx`(`revieweeId`),
    UNIQUE INDEX `Review_escrowId_reviewerId_key`(`escrowId`, `reviewerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Report` (
    `id` VARCHAR(191) NOT NULL,
    `reporterId` VARCHAR(191) NOT NULL,
    `targetType` ENUM('LISTING', 'USER', 'MESSAGE') NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `reason` ENUM('SCAM', 'FAKE_ACCOUNT', 'INAPPROPRIATE_CONTENT', 'SPAM', 'HARASSMENT', 'OTHER') NOT NULL,
    `details` TEXT NULL,
    `status` ENUM('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
    `resolutionAction` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,

    INDEX `Report_status_idx`(`status`),
    INDEX `Report_targetType_targetId_idx`(`targetType`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Watchlist` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Watchlist_userId_idx`(`userId`),
    UNIQUE INDEX `Watchlist_userId_listingId_key`(`userId`, `listingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PhoneVerification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `codeHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PhoneVerification_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KycSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `idFrontUrl` VARCHAR(191) NOT NULL,
    `idBackUrl` VARCHAR(191) NOT NULL,
    `selfieUrl` VARCHAR(191) NOT NULL,
    `ocrName` VARCHAR(191) NULL,
    `ocrDob` VARCHAR(191) NULL,
    `ocrDocNumber` VARCHAR(191) NULL,
    `ocrExpiry` VARCHAR(191) NULL,
    `kycScore` DOUBLE NULL,
    `isLive` BOOLEAN NULL,
    `faceSimilarity` DOUBLE NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,

    INDEX `KycSubmission_userId_idx`(`userId`),
    INDEX `KycSubmission_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserAchievementBadge` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `badge` ENUM('RISING_STAR', 'POWER_SELLER', 'TOP_SELLER', 'LEGEND', 'BIG_EARNER', 'WHALE', 'FIVE_STAR_SELLER', 'FAST_RESPONDER', 'TRUSTED_SELLER') NOT NULL,
    `awardedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserAchievementBadge_userId_idx`(`userId`),
    UNIQUE INDEX `UserAchievementBadge_userId_badge_key`(`userId`, `badge`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Announcement` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('INFO', 'WARNING', 'SUCCESS') NOT NULL DEFAULT 'INFO',
    `message` TEXT NOT NULL,
    `linkUrl` VARCHAR(191) NULL,
    `linkText` VARCHAR(191) NULL,
    `targetAudience` ENUM('ALL', 'BUYER', 'SELLER') NOT NULL DEFAULT 'ALL',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `html` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmailTemplate_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlogPost` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `excerpt` TEXT NOT NULL,
    `content` MEDIUMTEXT NOT NULL,
    `coverImage` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `authorId` VARCHAR(191) NULL,
    `tags` VARCHAR(191) NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `isAiGen` BOOLEAN NOT NULL DEFAULT false,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BlogPost_slug_key`(`slug`),
    INDEX `BlogPost_status_publishedAt_idx`(`status`, `publishedAt`),
    INDEX `BlogPost_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlogTopicQueue` (
    `id` VARCHAR(191) NOT NULL,
    `prompt` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `blogPostId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,

    INDEX `BlogTopicQueue_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlogAutomationLog` (
    `id` VARCHAR(191) NOT NULL,
    `prompt` TEXT NOT NULL,
    `postId` VARCHAR(191) NULL,
    `success` BOOLEAN NOT NULL,
    `error` TEXT NULL,
    `tokensIn` INTEGER NULL,
    `tokensOut` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TermsAcceptance` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip` VARCHAR(191) NULL,

    INDEX `TermsAcceptance_userId_idx`(`userId`),
    UNIQUE INDEX `TermsAcceptance_userId_version_key`(`userId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DataExportRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'READY', 'EXPIRED', 'COMPLETED', 'REVIEWING', 'DENIED') NOT NULL DEFAULT 'PENDING',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `downloadUrl` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NULL,

    INDEX `DataExportRequest_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DataErasureRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'READY', 'EXPIRED', 'COMPLETED', 'REVIEWING', 'DENIED') NOT NULL DEFAULT 'PENDING',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `adminNotes` TEXT NULL,

    INDEX `DataErasureRequest_userId_idx`(`userId`),
    INDEX `DataErasureRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CookieConsent` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `categories` JSON NOT NULL,
    `consentedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CookieConsent_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeviceFingerprint` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `fingerprintHash` VARCHAR(191) NOT NULL,
    `firstSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL,

    INDEX `DeviceFingerprint_fingerprintHash_idx`(`fingerprintHash`),
    INDEX `DeviceFingerprint_userId_idx`(`userId`),
    UNIQUE INDEX `DeviceFingerprint_userId_fingerprintHash_key`(`userId`, `fingerprintHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiskScore` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'LOW',
    `factors` JSON NOT NULL,
    `computedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dismissedAt` DATETIME(3) NULL,

    UNIQUE INDEX `RiskScore_userId_key`(`userId`),
    INDEX `RiskScore_score_idx`(`score`),
    INDEX `RiskScore_severity_idx`(`severity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SecurityFlag` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `reason` TEXT NOT NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SecurityFlag_userId_idx`(`userId`),
    INDEX `SecurityFlag_severity_resolvedAt_idx`(`severity`, `resolvedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EscrowMilestone` (
    `id` VARCHAR(191) NOT NULL,
    `escrowId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('PENDING', 'RELEASED') NOT NULL DEFAULT 'PENDING',
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EscrowMilestone_escrowId_idx`(`escrowId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralCode` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ReferralCode_userId_key`(`userId`),
    UNIQUE INDEX `ReferralCode_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Referral` (
    `id` VARCHAR(191) NOT NULL,
    `referrerId` VARCHAR(191) NOT NULL,
    `refereeId` VARCHAR(191) NOT NULL,
    `referralCodeId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'REWARDED') NOT NULL DEFAULT 'PENDING',
    `rewardedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Referral_refereeId_key`(`refereeId`),
    INDEX `Referral_referrerId_idx`(`referrerId`),
    INDEX `Referral_referralCodeId_idx`(`referralCodeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromoCode` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` ENUM('PERCENT_OFF_FEE', 'FLAT_CREDIT') NOT NULL,
    `value` DECIMAL(12, 2) NOT NULL,
    `maxRedemptions` INTEGER NULL,
    `redemptionCount` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PromoCode_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromoRedemption` (
    `id` VARCHAR(191) NOT NULL,
    `promoCodeId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `redeemedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PromoRedemption_userId_idx`(`userId`),
    UNIQUE INDEX `PromoRedemption_promoCodeId_userId_key`(`promoCodeId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FiatPayment` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerPaymentId` VARCHAR(191) NOT NULL,
    `amountUsd` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'usd',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    UNIQUE INDEX `FiatPayment_providerPaymentId_key`(`providerPaymentId`),
    INDEX `FiatPayment_userId_idx`(`userId`),
    INDEX `FiatPayment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SavedSearch` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `filters` JSON NOT NULL,
    `alertEnabled` BOOLEAN NOT NULL DEFAULT false,
    `lastNotifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SavedSearch_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApiKey` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `keyHash` VARCHAR(191) NOT NULL,
    `keyPrefix` VARCHAR(191) NOT NULL,
    `scopes` VARCHAR(191) NOT NULL DEFAULT 'read',
    `lastUsedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ApiKey_keyHash_key`(`keyHash`),
    INDEX `ApiKey_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebhookEndpoint` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `secret` VARCHAR(191) NOT NULL,
    `events` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WebhookEndpoint_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebhookDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `endpointId` VARCHAR(191) NOT NULL,
    `eventType` ENUM('ESCROW_CREATED', 'ESCROW_FUNDED', 'ESCROW_COMPLETED', 'ESCROW_DISPUTED', 'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'LISTING_SOLD', 'PAYMENT_RECEIVED') NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `responseStatus` INTEGER NULL,
    `responseBody` TEXT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `nextRetryAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WebhookDelivery_endpointId_idx`(`endpointId`),
    INDEX `WebhookDelivery_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PushSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `endpoint` VARCHAR(1000) NOT NULL,
    `p256dh` VARCHAR(500) NOT NULL,
    `auth` VARCHAR(200) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PushSubscription_endpoint_key`(`endpoint`),
    INDEX `PushSubscription_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeatureFlag` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `rolloutPct` INTEGER NOT NULL DEFAULT 100,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FeatureFlag_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ListingViewEvent` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `viewerHash` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ListingViewEvent_listingId_createdAt_idx`(`listingId`, `createdAt`),
    INDEX `ListingViewEvent_listingId_idx`(`listingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuctionBid` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `bidderId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `placedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuctionBid_listingId_placedAt_idx`(`listingId`, `placedAt`),
    INDEX `AuctionBid_bidderId_idx`(`bidderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PrivateListingInvite` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `invitedUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PrivateListingInvite_invitedUserId_idx`(`invitedUserId`),
    UNIQUE INDEX `PrivateListingInvite_listingId_invitedUserId_key`(`listingId`, `invitedUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WantedListing` (
    `id` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `platform` ENUM('YOUTUBE', 'INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'TELEGRAM', 'TWITTER_X', 'SNAPCHAT', 'PINTEREST', 'LINKEDIN', 'WEBSITE') NULL,
    `title` VARCHAR(191) NOT NULL,
    `criteria` JSON NOT NULL,
    `budget` DECIMAL(12, 2) NULL,
    `status` ENUM('OPEN', 'FULFILLED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WantedListing_buyerId_status_idx`(`buyerId`, `status`),
    INDEX `WantedListing_platform_status_idx`(`platform`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Organization` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `kybStatus` ENUM('NONE', 'SUBMITTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NONE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Organization_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrganizationMember` (
    `id` VARCHAR(191) NOT NULL,
    `orgId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `invitedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `joinedAt` DATETIME(3) NULL,

    INDEX `OrganizationMember_userId_idx`(`userId`),
    UNIQUE INDEX `OrganizationMember_orgId_userId_key`(`orgId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KybSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `orgId` VARCHAR(191) NOT NULL,
    `businessName` VARCHAR(191) NOT NULL,
    `registrationNumber` VARCHAR(191) NULL,
    `country` VARCHAR(2) NOT NULL,
    `regDocUrl` VARCHAR(191) NULL,
    `utilityBillUrl` VARCHAR(191) NULL,
    `beneficialOwners` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SUBMITTED',
    `rejectionReason` TEXT NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `KybSubmission_orgId_key`(`orgId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserFollow` (
    `id` VARCHAR(191) NOT NULL,
    `followerId` VARCHAR(191) NOT NULL,
    `followingId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserFollow_followingId_idx`(`followingId`),
    UNIQUE INDEX `UserFollow_followerId_followingId_key`(`followerId`, `followingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityEvent` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `metadata` JSON NOT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityEvent_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `ActivityEvent_isPublic_createdAt_idx`(`isPublic`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NpsResponse` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `NpsResponse_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppListing` (
    `id` VARCHAR(191) NOT NULL,
    `developerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `iconUrl` VARCHAR(191) NULL,
    `websiteUrl` VARCHAR(191) NULL,
    `apiScopesRequested` JSON NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `installCount` INTEGER NOT NULL DEFAULT 0,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AppListing_developerId_idx`(`developerId`),
    INDEX `AppListing_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppInstallation` (
    `id` VARCHAR(191) NOT NULL,
    `appId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `grantedScopes` JSON NOT NULL,
    `installedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AppInstallation_userId_idx`(`userId`),
    UNIQUE INDEX `AppInstallation_appId_userId_key`(`appId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformBankAccount` (
    `id` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `accountName` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `routingNumber` VARCHAR(191) NULL,
    `swiftCode` VARCHAR(191) NULL,
    `iban` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlatformBankAccount_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankTransferOrder` (
    `id` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `bankAccountId` VARCHAR(191) NOT NULL,
    `amountUsd` DECIMAL(10, 2) NOT NULL,
    `feeUsd` DECIMAL(10, 2) NOT NULL,
    `totalDue` DECIMAL(10, 2) NOT NULL,
    `amountReceived` DECIMAL(10, 2) NULL,
    `status` ENUM('PENDING', 'SENT', 'VERIFIED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `senderName` VARCHAR(191) NULL,
    `proofImageUrl` VARCHAR(191) NULL,
    `sentAt` DATETIME(3) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `adminNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BankTransferOrder_referenceId_key`(`referenceId`),
    INDEX `BankTransferOrder_userId_status_idx`(`userId`, `status`),
    INDEX `BankTransferOrder_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DepositMethodFee` (
    `id` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `feeRate` DOUBLE NOT NULL DEFAULT 0,
    `minFee` DOUBLE NOT NULL DEFAULT 0,
    `maxFee` DOUBLE NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DepositMethodFee_method_key`(`method`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffRole` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `permissions` JSON NOT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StaffRole_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffInvite` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `staffRoleId` VARCHAR(191) NULL,
    `invitedById` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `StaffInvite_email_key`(`email`),
    INDEX `StaffInvite_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactMessage` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `ip` VARCHAR(191) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `readById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContactMessage_isRead_createdAt_idx`(`isRead`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_subscriptionPlanId_fkey` FOREIGN KEY (`subscriptionPlanId`) REFERENCES `SubscriptionPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_staffRoleId_fkey` FOREIGN KEY (`staffRoleId`) REFERENCES `StaffRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Listing` ADD CONSTRAINT `Listing_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Listing` ADD CONSTRAINT `Listing_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_parentOfferId_fkey` FOREIGN KEY (`parentOfferId`) REFERENCES `Offer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Escrow` ADD CONSTRAINT `Escrow_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Escrow` ADD CONSTRAINT `Escrow_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `Offer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Escrow` ADD CONSTRAINT `Escrow_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Escrow` ADD CONSTRAINT `Escrow_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Escrow` ADD CONSTRAINT `Escrow_managerEmailId_fkey` FOREIGN KEY (`managerEmailId`) REFERENCES `EscrowManagerEmail`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Escrow` ADD CONSTRAINT `Escrow_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_escrowId_fkey` FOREIGN KEY (`escrowId`) REFERENCES `Escrow`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeEvidence` ADD CONSTRAINT `DisputeEvidence_disputeId_fkey` FOREIGN KEY (`disputeId`) REFERENCES `Dispute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeTimeline` ADD CONSTRAINT `DisputeTimeline_disputeId_fkey` FOREIGN KEY (`disputeId`) REFERENCES `Dispute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_escrowId_fkey` FOREIGN KEY (`escrowId`) REFERENCES `Escrow`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_escrowId_fkey` FOREIGN KEY (`escrowId`) REFERENCES `Escrow`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CryptoWallet` ADD CONSTRAINT `CryptoWallet_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminAuditLog` ADD CONSTRAINT `AdminAuditLog_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TwoFactorAuth` ADD CONSTRAINT `TwoFactorAuth_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActiveSession` ADD CONSTRAINT `ActiveSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_escrowId_fkey` FOREIGN KEY (`escrowId`) REFERENCES `Escrow`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_revieweeId_fkey` FOREIGN KEY (`revieweeId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Watchlist` ADD CONSTRAINT `Watchlist_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Watchlist` ADD CONSTRAINT `Watchlist_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PhoneVerification` ADD CONSTRAINT `PhoneVerification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KycSubmission` ADD CONSTRAINT `KycSubmission_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserAchievementBadge` ADD CONSTRAINT `UserAchievementBadge_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TermsAcceptance` ADD CONSTRAINT `TermsAcceptance_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DataExportRequest` ADD CONSTRAINT `DataExportRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DataErasureRequest` ADD CONSTRAINT `DataErasureRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CookieConsent` ADD CONSTRAINT `CookieConsent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeviceFingerprint` ADD CONSTRAINT `DeviceFingerprint_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiskScore` ADD CONSTRAINT `RiskScore_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SecurityFlag` ADD CONSTRAINT `SecurityFlag_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscrowMilestone` ADD CONSTRAINT `EscrowMilestone_escrowId_fkey` FOREIGN KEY (`escrowId`) REFERENCES `Escrow`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralCode` ADD CONSTRAINT `ReferralCode_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Referral` ADD CONSTRAINT `Referral_referralCodeId_fkey` FOREIGN KEY (`referralCodeId`) REFERENCES `ReferralCode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Referral` ADD CONSTRAINT `Referral_refereeId_fkey` FOREIGN KEY (`refereeId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromoRedemption` ADD CONSTRAINT `PromoRedemption_promoCodeId_fkey` FOREIGN KEY (`promoCodeId`) REFERENCES `PromoCode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromoRedemption` ADD CONSTRAINT `PromoRedemption_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FiatPayment` ADD CONSTRAINT `FiatPayment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavedSearch` ADD CONSTRAINT `SavedSearch_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApiKey` ADD CONSTRAINT `ApiKey_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WebhookEndpoint` ADD CONSTRAINT `WebhookEndpoint_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WebhookDelivery` ADD CONSTRAINT `WebhookDelivery_endpointId_fkey` FOREIGN KEY (`endpointId`) REFERENCES `WebhookEndpoint`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PushSubscription` ADD CONSTRAINT `PushSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListingViewEvent` ADD CONSTRAINT `ListingViewEvent_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListingViewEvent` ADD CONSTRAINT `ListingViewEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuctionBid` ADD CONSTRAINT `AuctionBid_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuctionBid` ADD CONSTRAINT `AuctionBid_bidderId_fkey` FOREIGN KEY (`bidderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrivateListingInvite` ADD CONSTRAINT `PrivateListingInvite_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrivateListingInvite` ADD CONSTRAINT `PrivateListingInvite_invitedUserId_fkey` FOREIGN KEY (`invitedUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WantedListing` ADD CONSTRAINT `WantedListing_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Organization` ADD CONSTRAINT `Organization_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrganizationMember` ADD CONSTRAINT `OrganizationMember_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrganizationMember` ADD CONSTRAINT `OrganizationMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KybSubmission` ADD CONSTRAINT `KybSubmission_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserFollow` ADD CONSTRAINT `UserFollow_followerId_fkey` FOREIGN KEY (`followerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserFollow` ADD CONSTRAINT `UserFollow_followingId_fkey` FOREIGN KEY (`followingId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityEvent` ADD CONSTRAINT `ActivityEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NpsResponse` ADD CONSTRAINT `NpsResponse_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AppListing` ADD CONSTRAINT `AppListing_developerId_fkey` FOREIGN KEY (`developerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AppInstallation` ADD CONSTRAINT `AppInstallation_appId_fkey` FOREIGN KEY (`appId`) REFERENCES `AppListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AppInstallation` ADD CONSTRAINT `AppInstallation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankTransferOrder` ADD CONSTRAINT `BankTransferOrder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankTransferOrder` ADD CONSTRAINT `BankTransferOrder_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `PlatformBankAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffInvite` ADD CONSTRAINT `StaffInvite_staffRoleId_fkey` FOREIGN KEY (`staffRoleId`) REFERENCES `StaffRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffInvite` ADD CONSTRAINT `StaffInvite_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
