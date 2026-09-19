-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: accsmarkets
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `account`
--

DROP TABLE IF EXISTS `account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `account` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `provider` varchar(191) NOT NULL,
  `providerAccountId` varchar(191) NOT NULL,
  `refresh_token` text DEFAULT NULL,
  `access_token` text DEFAULT NULL,
  `expires_at` int(11) DEFAULT NULL,
  `token_type` varchar(191) DEFAULT NULL,
  `scope` varchar(191) DEFAULT NULL,
  `id_token` text DEFAULT NULL,
  `session_state` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Account_provider_providerAccountId_key` (`provider`,`providerAccountId`),
  KEY `Account_userId_idx` (`userId`),
  CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `account`
--

LOCK TABLES `account` WRITE;
/*!40000 ALTER TABLE `account` DISABLE KEYS */;
/*!40000 ALTER TABLE `account` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `activesession`
--

DROP TABLE IF EXISTS `activesession`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `activesession` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `userAgent` text DEFAULT NULL,
  `ip` varchar(191) DEFAULT NULL,
  `lastSeenAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `ActiveSession_userId_idx` (`userId`),
  CONSTRAINT `ActiveSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activesession`
--

LOCK TABLES `activesession` WRITE;
/*!40000 ALTER TABLE `activesession` DISABLE KEYS */;
/*!40000 ALTER TABLE `activesession` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `activityevent`
--

DROP TABLE IF EXISTS `activityevent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `activityevent` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`metadata`)),
  `isPublic` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `ActivityEvent_userId_createdAt_idx` (`userId`,`createdAt`),
  KEY `ActivityEvent_isPublic_createdAt_idx` (`isPublic`,`createdAt`),
  CONSTRAINT `ActivityEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activityevent`
--

LOCK TABLES `activityevent` WRITE;
/*!40000 ALTER TABLE `activityevent` DISABLE KEYS */;
/*!40000 ALTER TABLE `activityevent` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `adminauditlog`
--

DROP TABLE IF EXISTS `adminauditlog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `adminauditlog` (
  `id` varchar(191) NOT NULL,
  `adminId` varchar(191) NOT NULL,
  `action` varchar(191) NOT NULL,
  `targetType` varchar(191) NOT NULL,
  `targetId` varchar(191) NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `AdminAuditLog_adminId_idx` (`adminId`),
  KEY `AdminAuditLog_targetType_targetId_idx` (`targetType`,`targetId`),
  CONSTRAINT `AdminAuditLog_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `user` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adminauditlog`
--

LOCK TABLES `adminauditlog` WRITE;
/*!40000 ALTER TABLE `adminauditlog` DISABLE KEYS */;
INSERT INTO `adminauditlog` VALUES ('cmrxycpdq0054pnrd1ijvgc0s','cmrxycp3p0005pnrdzzoawa9h','listing.approve','Listing','cmrxycp4z000lpnrdt79w6do9',NULL,'2026-07-16 20:16:56.702'),('cmrxycpdv0056pnrd7u55q2qg','cmrxycp3p0005pnrdzzoawa9h','listing.approve','Listing','cmrxycp52000zpnrd0dsuiwkb',NULL,'2026-07-19 20:16:56.702'),('cmrxycpdz0058pnrdxjj7dqyz','cmrxycp3p0005pnrdzzoawa9h','listing.approve','Listing','cmrxycp51000npnrdp2n8i6w8',NULL,'2026-07-20 20:16:56.702'),('cmrxycpe2005apnrdy1h9ovm6','cmrxycp3p0005pnrdzzoawa9h','listing.approve','Listing','cmrxycp51000rpnrdxcubskk3',NULL,'2026-07-18 20:16:56.702'),('cmrxycpe6005cpnrdijzgcp0g','cmrxycp3p0005pnrdzzoawa9h','listing.approve','Listing','cmrxycp52000upnrdpmcyyqru',NULL,'2026-07-21 20:16:56.702'),('cmrxycpea005epnrd56ak45ng','cmrxycp3p0005pnrdzzoawa9h','deposit.confirm','CryptoWallet','manual',NULL,'2026-07-13 20:16:56.702'),('cmrxycped005gpnrdpubz6vwq','cmrxycp3p0005pnrdzzoawa9h','user.badge.award','User','cmrxycp4b000bpnrdeuregzht','\"{\\\"badge\\\":\\\"POWER_SELLER\\\"}\"','2026-05-24 20:16:56.702'),('cmrxycpeh005ipnrdxcqvoqkt','cmrxycp3p0005pnrdzzoawa9h','escrow.verify','Escrow','cmrxycp63001fpnrdttzl6qlg',NULL,'2026-07-20 20:16:56.702'),('cmry4ul670002j7hujrxfjut7','cmrxycp3p0005pnrdzzoawa9h','update_pricing','SubscriptionPlan','bulk','{\"planCount\":4}','2026-07-23 23:18:48.752'),('cmry8yhv10001gkze4sa2ex2o','cmrxycp3p0005pnrdzzoawa9h','enable_maintenance_mode','PlatformSettings','singleton','{\"maintenanceTitle\":\"Maintenance in Progress\",\"maintenanceEndTime\":null}','2026-07-24 01:13:49.549'),('cmry8yijn0003gkzebkvezbox','cmrxycp3p0005pnrdzzoawa9h','disable_maintenance_mode','PlatformSettings','singleton','{\"maintenanceTitle\":\"Maintenance in Progress\",\"maintenanceEndTime\":null}','2026-07-24 01:13:50.435');
/*!40000 ALTER TABLE `adminauditlog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `announcement`
--

DROP TABLE IF EXISTS `announcement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `announcement` (
  `id` varchar(191) NOT NULL,
  `type` enum('INFO','WARNING','SUCCESS') NOT NULL DEFAULT 'INFO',
  `message` text NOT NULL,
  `linkUrl` varchar(191) DEFAULT NULL,
  `linkText` varchar(191) DEFAULT NULL,
  `targetAudience` enum('ALL','BUYER','SELLER') NOT NULL DEFAULT 'ALL',
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `startsAt` datetime(3) DEFAULT NULL,
  `endsAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `announcement`
--

LOCK TABLES `announcement` WRITE;
/*!40000 ALTER TABLE `announcement` DISABLE KEYS */;
INSERT INTO `announcement` VALUES ('cmry9baws0008gkzebioq2y4j','INFO','New feature: Bank transfer deposits are now available! Deposit via wire transfer with lower fees.','http://localhost:3000/dashboard/wallet/deposit','Try it out!','ALL',1,NULL,NULL,'2026-07-24 01:23:47.068','2026-07-24 01:23:47.068');
/*!40000 ALTER TABLE `announcement` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `apikey`
--

DROP TABLE IF EXISTS `apikey`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `apikey` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `keyHash` varchar(191) NOT NULL,
  `keyPrefix` varchar(191) NOT NULL,
  `scopes` varchar(191) NOT NULL DEFAULT 'read',
  `lastUsedAt` datetime(3) DEFAULT NULL,
  `expiresAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `revokedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ApiKey_keyHash_key` (`keyHash`),
  KEY `ApiKey_userId_idx` (`userId`),
  CONSTRAINT `ApiKey_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `apikey`
--

LOCK TABLES `apikey` WRITE;
/*!40000 ALTER TABLE `apikey` DISABLE KEYS */;
/*!40000 ALTER TABLE `apikey` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appinstallation`
--

DROP TABLE IF EXISTS `appinstallation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `appinstallation` (
  `id` varchar(191) NOT NULL,
  `appId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `grantedScopes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`grantedScopes`)),
  `installedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `AppInstallation_appId_userId_key` (`appId`,`userId`),
  KEY `AppInstallation_userId_idx` (`userId`),
  CONSTRAINT `AppInstallation_appId_fkey` FOREIGN KEY (`appId`) REFERENCES `applisting` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `AppInstallation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appinstallation`
--

LOCK TABLES `appinstallation` WRITE;
/*!40000 ALTER TABLE `appinstallation` DISABLE KEYS */;
/*!40000 ALTER TABLE `appinstallation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `applisting`
--

DROP TABLE IF EXISTS `applisting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `applisting` (
  `id` varchar(191) NOT NULL,
  `developerId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `iconUrl` varchar(191) DEFAULT NULL,
  `websiteUrl` varchar(191) DEFAULT NULL,
  `apiScopesRequested` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`apiScopesRequested`)),
  `status` enum('DRAFT','SUBMITTED','APPROVED','REJECTED') NOT NULL DEFAULT 'DRAFT',
  `installCount` int(11) NOT NULL DEFAULT 0,
  `rejectionReason` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `AppListing_developerId_idx` (`developerId`),
  KEY `AppListing_status_idx` (`status`),
  CONSTRAINT `AppListing_developerId_fkey` FOREIGN KEY (`developerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `applisting`
--

LOCK TABLES `applisting` WRITE;
/*!40000 ALTER TABLE `applisting` DISABLE KEYS */;
/*!40000 ALTER TABLE `applisting` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auctionbid`
--

DROP TABLE IF EXISTS `auctionbid`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auctionbid` (
  `id` varchar(191) NOT NULL,
  `listingId` varchar(191) NOT NULL,
  `bidderId` varchar(191) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `placedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `AuctionBid_listingId_placedAt_idx` (`listingId`,`placedAt`),
  KEY `AuctionBid_bidderId_idx` (`bidderId`),
  CONSTRAINT `AuctionBid_bidderId_fkey` FOREIGN KEY (`bidderId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `AuctionBid_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `listing` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auctionbid`
--

LOCK TABLES `auctionbid` WRITE;
/*!40000 ALTER TABLE `auctionbid` DISABLE KEYS */;
/*!40000 ALTER TABLE `auctionbid` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `banktransferorder`
--

DROP TABLE IF EXISTS `banktransferorder`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `banktransferorder` (
  `id` varchar(191) NOT NULL,
  `referenceId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `bankAccountId` varchar(191) NOT NULL,
  `amountUsd` decimal(10,2) NOT NULL,
  `feeUsd` decimal(10,2) NOT NULL,
  `totalDue` decimal(10,2) NOT NULL,
  `amountReceived` decimal(10,2) DEFAULT NULL,
  `status` enum('PENDING','SENT','VERIFIED','REJECTED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `senderName` varchar(191) DEFAULT NULL,
  `proofImageUrl` varchar(191) DEFAULT NULL,
  `sentAt` datetime(3) DEFAULT NULL,
  `verifiedAt` datetime(3) DEFAULT NULL,
  `rejectedAt` datetime(3) DEFAULT NULL,
  `rejectionReason` text DEFAULT NULL,
  `adminNotes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `BankTransferOrder_referenceId_key` (`referenceId`),
  KEY `BankTransferOrder_userId_status_idx` (`userId`,`status`),
  KEY `BankTransferOrder_status_createdAt_idx` (`status`,`createdAt`),
  KEY `BankTransferOrder_bankAccountId_fkey` (`bankAccountId`),
  CONSTRAINT `BankTransferOrder_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `platformbankaccount` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `BankTransferOrder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `banktransferorder`
--

LOCK TABLES `banktransferorder` WRITE;
/*!40000 ALTER TABLE `banktransferorder` DISABLE KEYS */;
/*!40000 ALTER TABLE `banktransferorder` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blogautomationlog`
--

DROP TABLE IF EXISTS `blogautomationlog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blogautomationlog` (
  `id` varchar(191) NOT NULL,
  `prompt` text NOT NULL,
  `postId` varchar(191) DEFAULT NULL,
  `success` tinyint(1) NOT NULL,
  `error` text DEFAULT NULL,
  `tokensIn` int(11) DEFAULT NULL,
  `tokensOut` int(11) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blogautomationlog`
--

LOCK TABLES `blogautomationlog` WRITE;
/*!40000 ALTER TABLE `blogautomationlog` DISABLE KEYS */;
INSERT INTO `blogautomationlog` VALUES ('cmry9lsy1000igkze4t3l8agb','How to safely buy a YouTube channel on AccsMarkets - Complete Guide 2025',NULL,0,'Gemini API error 404: {\n  \"error\": {\n    \"code\": 404,\n    \"message\": \"models/gemini-1.5-pro is not found for API version v1beta, or is not supported for generateContent. Call ModelService.ListModels to see the list of avai',0,0,'2026-07-24 01:31:57.001'),('cmry9m1eo000kgkzezdtpr7k2','How to safely buy a YouTube channel on AccsMarkets - Complete Guide 2025',NULL,0,'OpenAI API error 429: {\n    \"error\": {\n        \"message\": \"You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/gu',0,0,'2026-07-24 01:32:07.968'),('cmry9m90b000mgkzej3tjw6k2','How to safely buy a YouTube channel on AccsMarkets - Complete Guide 2025',NULL,0,'OpenAI API error 429: {\n    \"error\": {\n        \"message\": \"You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/gu',0,0,'2026-07-24 01:32:17.820'),('cmry9oqik0001nb1tvs2mh59p','How to safely buy a YouTube channel on AccsMarkets in 2025',NULL,0,'OpenAI API error 429: {\n    \"error\": {\n        \"message\": \"You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/gu',0,0,'2026-07-24 01:34:13.821'),('cmry9r9z70003nb1t1k4xpozz','How to safely buy a YouTube channel on AccsMarkets in 2025',NULL,0,'Gemini API error 404: {\n  \"error\": {\n    \"code\": 404,\n    \"message\": \"models/gemini-1.5-pro is not found for API version v1beta, or is not supported for generateContent. Call ModelService.ListModels to see the list of avai',0,0,'2026-07-24 01:36:12.356'),('cmry9u1i40005nb1t788zwvq0','How to safely buy a YouTube channel on AccsMarkets in 2025',NULL,0,'Grok API error 403: {\"code\":\"permission-denied\",\"error\":\"Your team 7b1657c8-84ec-49d1-99c3-727a1d931bcd has either used all available credits or reached its monthly spending limit. To continue making API requests, please',0,0,'2026-07-24 01:38:21.341'),('cmry9x4fa0007nb1tmpawelae','How to safely buy a YouTube channel on AccsMarkets in 2025',NULL,0,'Bad control character in string literal in JSON at position 387 (line 4 column 71)',212,1723,'2026-07-24 01:40:45.094'),('cmry9za7t0009nb1ts39h7z3v','How to safely buy a YouTube channel on AccsMarkets in 2025',NULL,0,'Expected property name or \'}\' in JSON at position 2 (line 1 column 3)',212,1403,'2026-07-24 01:42:25.913'),('cmrya0511000bnb1t1wslsyqb','How to safely buy a YouTube channel on AccsMarkets in 2025',NULL,0,'Expected property name or \'}\' in JSON at position 2 (line 1 column 3)',212,1670,'2026-07-24 01:43:05.845'),('cmrya1chg000enb1tksf5zmv2','How to safely buy a YouTube channel on AccsMarkets in 2025','cmrya1ch6000dnb1totgc2y09',1,NULL,212,1502,'2026-07-24 01:44:02.164');
/*!40000 ALTER TABLE `blogautomationlog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blogpost`
--

DROP TABLE IF EXISTS `blogpost`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blogpost` (
  `id` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `excerpt` text NOT NULL,
  `content` mediumtext NOT NULL,
  `coverImage` varchar(191) DEFAULT NULL,
  `status` enum('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `authorId` varchar(191) DEFAULT NULL,
  `tags` varchar(191) DEFAULT NULL,
  `viewCount` int(11) NOT NULL DEFAULT 0,
  `isAiGen` tinyint(1) NOT NULL DEFAULT 0,
  `publishedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `BlogPost_slug_key` (`slug`),
  KEY `BlogPost_status_publishedAt_idx` (`status`,`publishedAt`),
  KEY `BlogPost_slug_idx` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blogpost`
--

LOCK TABLES `blogpost` WRITE;
/*!40000 ALTER TABLE `blogpost` DISABLE KEYS */;
INSERT INTO `blogpost` VALUES ('cmrya1ch6000dnb1totgc2y09','how-to-safely-buy-a-youtube-channel-on-accsmarkets-in-2025','How to Safely Buy a YouTube Channel on AccsMarkets in 2025','Safely purchasing a YouTube channel requires careful consideration of several factors, including the channel\'s content, audience engagement, and monetization potential, to ensure a successful and profitable acquisition.','<h2>Introduction to Buying a YouTube Channel</h2><p>Purchasing a YouTube channel can be a great way to establish an online presence, tap into an existing audience, and monetize content. However, it\'s essential to approach this process with caution to avoid potential pitfalls. In this article, we\'ll guide you through the steps to safely buy a YouTube channel on AccsMarkets in 2025.</p><h2>Research and Due Diligence</h2><p>Before making a purchase, it\'s crucial to conduct thorough research on the channel you\'re interested in. This includes:</p><ul><li>Reviewing the channel\'s content to ensure it aligns with your brand and values</li><li>Analyzing the channel\'s audience engagement, including views, likes, and comments</li><li>Evaluating the channel\'s monetization potential, including ads, sponsorships, and merchandise sales</li><li>Checking the channel\'s history, including any previous controversies or strikes</li></ul><p>AccsMarkets provides a platform for buyers to connect with sellers, but it\'s still important to do your own research and verify the information provided.</p><h3>Verifying Channel Ownership and Authenticity</h3><p>To ensure a smooth transaction, it\'s vital to verify the channel\'s ownership and authenticity. This can be done by:</p><ul><li>Checking the channel\'s YouTube verification status</li><li>Verifying the seller\'s identity and contact information</li><li>Reviewing the channel\'s analytics and performance data</li></ul><p>AccsMarkets offers a secure and transparent platform for buying and selling social media accounts, including YouTube channels.</p><h2>Understanding the Purchase Process</h2><p>Once you\'ve found a channel you\'re interested in and have completed your research, it\'s time to make an offer. The purchase process typically involves:</p><ul><li>Negotiating a price with the seller</li><li>Completing a payment through a secure payment gateway</li><li>Transferring ownership of the channel</li></ul><p>AccsMarkets provides a secure and convenient payment system, ensuring a smooth transaction for both buyers and sellers.</p><h2>Post-Purchase Considerations</h2><p>After completing the purchase, it\'s essential to consider the next steps, including:</p><ul><li>Updating the channel\'s branding and content to align with your own</li><li>Engaging with the existing audience and building a community</li><li>Optimizing the channel for monetization and growth</li></ul><p>AccsMarkets offers resources and support to help buyers succeed with their new channel.</p><h2>Conclusion</h2><p>Purchasing a YouTube channel can be a great way to establish an online presence and tap into an existing audience. By following the steps outlined in this article and using a reputable marketplace like AccsMarkets, you can safely buy a YouTube channel and set yourself up for success. If you\'re ready to take your online presence to the next level, visit AccsMarkets today to browse our selection of available YouTube channels and start growing your audience.</p>',NULL,'PUBLISHED',NULL,'YouTube channel, social media marketing, online presence, AccsMarkets, buying a YouTube channel',1,1,'2026-07-24 01:44:38.662','2026-07-24 01:44:02.154','2026-07-24 01:45:37.432');
/*!40000 ALTER TABLE `blogpost` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blogtopicqueue`
--

DROP TABLE IF EXISTS `blogtopicqueue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blogtopicqueue` (
  `id` varchar(191) NOT NULL,
  `prompt` text NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'PENDING',
  `blogPostId` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `processedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `BlogTopicQueue_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blogtopicqueue`
--

LOCK TABLES `blogtopicqueue` WRITE;
/*!40000 ALTER TABLE `blogtopicqueue` DISABLE KEYS */;
INSERT INTO `blogtopicqueue` VALUES ('cmry9lsok000hgkzeup24du58','How to safely buy a YouTube channel on AccsMarkets - Complete Guide 2025','FAILED',NULL,'2026-07-24 01:31:56.660','2026-07-24 01:31:56.991'),('cmry9m09h000jgkze5alf5pp2','How to safely buy a YouTube channel on AccsMarkets - Complete Guide 2025','FAILED',NULL,'2026-07-24 01:32:06.485','2026-07-24 01:32:07.958'),('cmry9m8ti000lgkzebbwp5a0c','How to safely buy a YouTube channel on AccsMarkets - Complete Guide 2025','FAILED',NULL,'2026-07-24 01:32:17.574','2026-07-24 01:32:17.809'),('cmry9opwi0000nb1tk8eq1xct','How to safely buy a YouTube channel on AccsMarkets in 2025','FAILED',NULL,'2026-07-24 01:34:13.023','2026-07-24 01:34:13.808'),('cmry9r99u0002nb1terolxkdv','How to safely buy a YouTube channel on AccsMarkets in 2025','FAILED',NULL,'2026-07-24 01:36:11.442','2026-07-24 01:36:12.345'),('cmry9u1960004nb1tm60i3jbv','How to safely buy a YouTube channel on AccsMarkets in 2025','FAILED',NULL,'2026-07-24 01:38:21.018','2026-07-24 01:38:21.330'),('cmry9x18w0006nb1tyokf4pnz','How to safely buy a YouTube channel on AccsMarkets in 2025','FAILED',NULL,'2026-07-24 01:40:40.977','2026-07-24 01:40:45.084'),('cmry9z7e10008nb1tt5i5yoc7','How to safely buy a YouTube channel on AccsMarkets in 2025','FAILED',NULL,'2026-07-24 01:42:22.249','2026-07-24 01:42:25.899'),('cmrya01u7000anb1twx6jnz5u','How to safely buy a YouTube channel on AccsMarkets in 2025','FAILED',NULL,'2026-07-24 01:43:01.711','2026-07-24 01:43:05.832'),('cmrya19jr000cnb1t83nclj0u','How to safely buy a YouTube channel on AccsMarkets in 2025','DONE','cmrya1ch6000dnb1totgc2y09','2026-07-24 01:43:58.359','2026-07-24 01:44:02.159');
/*!40000 ALTER TABLE `blogtopicqueue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cannedresponse`
--

DROP TABLE IF EXISTS `cannedresponse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cannedresponse` (
  `id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `body` text NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cannedresponse`
--

LOCK TABLES `cannedresponse` WRITE;
/*!40000 ALTER TABLE `cannedresponse` DISABLE KEYS */;
/*!40000 ALTER TABLE `cannedresponse` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contactmessage`
--

DROP TABLE IF EXISTS `contactmessage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contactmessage` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `subject` varchar(191) NOT NULL,
  `message` text NOT NULL,
  `ip` varchar(191) DEFAULT NULL,
  `isRead` tinyint(1) NOT NULL DEFAULT 0,
  `readAt` datetime(3) DEFAULT NULL,
  `readById` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `ContactMessage_isRead_createdAt_idx` (`isRead`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contactmessage`
--

LOCK TABLES `contactmessage` WRITE;
/*!40000 ALTER TABLE `contactmessage` DISABLE KEYS */;
/*!40000 ALTER TABLE `contactmessage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cookieconsent`
--

DROP TABLE IF EXISTS `cookieconsent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cookieconsent` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `categories` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`categories`)),
  `consentedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `CookieConsent_userId_key` (`userId`),
  CONSTRAINT `CookieConsent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cookieconsent`
--

LOCK TABLES `cookieconsent` WRITE;
/*!40000 ALTER TABLE `cookieconsent` DISABLE KEYS */;
INSERT INTO `cookieconsent` VALUES ('cmry6tp2v000176vnhoy229d7','cmrxycp3w0007pnrdv1agkll3','{\"essential\":true,\"analytics\":true,\"marketing\":true}','2026-07-24 00:14:06.392','2026-07-24 00:14:06.392');
/*!40000 ALTER TABLE `cookieconsent` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cryptowallet`
--

DROP TABLE IF EXISTS `cryptowallet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cryptowallet` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `network` varchar(191) NOT NULL,
  `address` varchar(191) DEFAULT NULL,
  `paymentId` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'waiting',
  `amountUsd` decimal(12,2) NOT NULL,
  `amountCrypto` decimal(24,8) DEFAULT NULL,
  `currency` varchar(191) NOT NULL,
  `isManual` tinyint(1) NOT NULL DEFAULT 0,
  `txHash` varchar(191) DEFAULT NULL,
  `proofImageUrl` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `confirmedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `CryptoWallet_paymentId_key` (`paymentId`),
  KEY `CryptoWallet_userId_idx` (`userId`),
  KEY `CryptoWallet_status_idx` (`status`),
  CONSTRAINT `CryptoWallet_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cryptowallet`
--

LOCK TABLES `cryptowallet` WRITE;
/*!40000 ALTER TABLE `cryptowallet` DISABLE KEYS */;
/*!40000 ALTER TABLE `cryptowallet` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dataerasurerequest`
--

DROP TABLE IF EXISTS `dataerasurerequest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dataerasurerequest` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `status` enum('PENDING','READY','EXPIRED','COMPLETED','REVIEWING','DENIED') NOT NULL DEFAULT 'PENDING',
  `requestedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `completedAt` datetime(3) DEFAULT NULL,
  `adminNotes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `DataErasureRequest_userId_idx` (`userId`),
  KEY `DataErasureRequest_status_idx` (`status`),
  CONSTRAINT `DataErasureRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dataerasurerequest`
--

LOCK TABLES `dataerasurerequest` WRITE;
/*!40000 ALTER TABLE `dataerasurerequest` DISABLE KEYS */;
/*!40000 ALTER TABLE `dataerasurerequest` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dataexportrequest`
--

DROP TABLE IF EXISTS `dataexportrequest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dataexportrequest` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `status` enum('PENDING','READY','EXPIRED','COMPLETED','REVIEWING','DENIED') NOT NULL DEFAULT 'PENDING',
  `requestedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `completedAt` datetime(3) DEFAULT NULL,
  `downloadUrl` varchar(191) DEFAULT NULL,
  `expiresAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `DataExportRequest_userId_idx` (`userId`),
  CONSTRAINT `DataExportRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dataexportrequest`
--

LOCK TABLES `dataexportrequest` WRITE;
/*!40000 ALTER TABLE `dataexportrequest` DISABLE KEYS */;
/*!40000 ALTER TABLE `dataexportrequest` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `depositmethodfee`
--

DROP TABLE IF EXISTS `depositmethodfee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `depositmethodfee` (
  `id` varchar(191) NOT NULL,
  `method` varchar(191) NOT NULL,
  `feeRate` double NOT NULL DEFAULT 0,
  `minFee` double NOT NULL DEFAULT 0,
  `maxFee` double DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `DepositMethodFee_method_key` (`method`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `depositmethodfee`
--

LOCK TABLES `depositmethodfee` WRITE;
/*!40000 ALTER TABLE `depositmethodfee` DISABLE KEYS */;
INSERT INTO `depositmethodfee` VALUES ('cmry94ga10000jxse4o87nfcz','crypto',0,0,NULL,1,'2026-07-24 01:18:27.434'),('cmry94ga70001jxselpirxreb','bank_transfer',0.01,2,50,1,'2026-07-24 01:18:27.439'),('cmry94gag0002jxseceiug2sz','card',0.025,1,NULL,1,'2026-07-24 01:18:27.449');
/*!40000 ALTER TABLE `depositmethodfee` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `devicefingerprint`
--

DROP TABLE IF EXISTS `devicefingerprint`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `devicefingerprint` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `fingerprintHash` varchar(191) NOT NULL,
  `firstSeenAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `lastSeenAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `DeviceFingerprint_userId_fingerprintHash_key` (`userId`,`fingerprintHash`),
  KEY `DeviceFingerprint_fingerprintHash_idx` (`fingerprintHash`),
  KEY `DeviceFingerprint_userId_idx` (`userId`),
  CONSTRAINT `DeviceFingerprint_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `devicefingerprint`
--

LOCK TABLES `devicefingerprint` WRITE;
/*!40000 ALTER TABLE `devicefingerprint` DISABLE KEYS */;
/*!40000 ALTER TABLE `devicefingerprint` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dispute`
--

DROP TABLE IF EXISTS `dispute`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dispute` (
  `id` varchar(191) NOT NULL,
  `escrowId` varchar(191) NOT NULL,
  `openedById` varchar(191) NOT NULL,
  `status` enum('OPEN','UNDER_REVIEW','RESOLVED_BUYER','RESOLVED_SELLER','CLOSED') NOT NULL DEFAULT 'OPEN',
  `reason` text NOT NULL,
  `resolution` text DEFAULT NULL,
  `adminNotes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `resolvedAt` datetime(3) DEFAULT NULL,
  `appealDecision` text DEFAULT NULL,
  `appealReason` text DEFAULT NULL,
  `appealReviewedAt` datetime(3) DEFAULT NULL,
  `appealedAt` datetime(3) DEFAULT NULL,
  `evidenceDeadline` datetime(3) DEFAULT NULL,
  `mediationAccepted` tinyint(1) DEFAULT NULL,
  `mediationCounterOffer` decimal(12,2) DEFAULT NULL,
  `mediationOffer` decimal(12,2) DEFAULT NULL,
  `phase` enum('EVIDENCE','REVIEW','MEDIATION','RULING','APPEAL','FINAL') NOT NULL DEFAULT 'EVIDENCE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `Dispute_escrowId_key` (`escrowId`),
  CONSTRAINT `Dispute_escrowId_fkey` FOREIGN KEY (`escrowId`) REFERENCES `escrow` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dispute`
--

LOCK TABLES `dispute` WRITE;
/*!40000 ALTER TABLE `dispute` DISABLE KEYS */;
/*!40000 ALTER TABLE `dispute` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `disputeevidence`
--

DROP TABLE IF EXISTS `disputeevidence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `disputeevidence` (
  `id` varchar(191) NOT NULL,
  `disputeId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `statement` text NOT NULL,
  `submittedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachments`)),
  PRIMARY KEY (`id`),
  KEY `DisputeEvidence_disputeId_idx` (`disputeId`),
  KEY `DisputeEvidence_disputeId_userId_idx` (`disputeId`,`userId`),
  CONSTRAINT `DisputeEvidence_disputeId_fkey` FOREIGN KEY (`disputeId`) REFERENCES `dispute` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `disputeevidence`
--

LOCK TABLES `disputeevidence` WRITE;
/*!40000 ALTER TABLE `disputeevidence` DISABLE KEYS */;
/*!40000 ALTER TABLE `disputeevidence` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `disputetimeline`
--

DROP TABLE IF EXISTS `disputetimeline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `disputetimeline` (
  `id` varchar(191) NOT NULL,
  `disputeId` varchar(191) NOT NULL,
  `eventType` varchar(191) NOT NULL,
  `actorId` varchar(191) DEFAULT NULL,
  `description` text NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `DisputeTimeline_disputeId_createdAt_idx` (`disputeId`,`createdAt`),
  CONSTRAINT `DisputeTimeline_disputeId_fkey` FOREIGN KEY (`disputeId`) REFERENCES `dispute` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `disputetimeline`
--

LOCK TABLES `disputetimeline` WRITE;
/*!40000 ALTER TABLE `disputetimeline` DISABLE KEYS */;
/*!40000 ALTER TABLE `disputetimeline` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `emailtemplate`
--

DROP TABLE IF EXISTS `emailtemplate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `emailtemplate` (
  `id` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `subject` varchar(191) NOT NULL,
  `html` text NOT NULL,
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `EmailTemplate_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `emailtemplate`
--

LOCK TABLES `emailtemplate` WRITE;
/*!40000 ALTER TABLE `emailtemplate` DISABLE KEYS */;
/*!40000 ALTER TABLE `emailtemplate` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `escrow`
--

DROP TABLE IF EXISTS `escrow`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `escrow` (
  `id` varchar(191) NOT NULL,
  `listingId` varchar(191) NOT NULL,
  `offerId` varchar(191) DEFAULT NULL,
  `buyerId` varchar(191) NOT NULL,
  `sellerId` varchar(191) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `feeAmount` decimal(12,2) NOT NULL,
  `totalCharged` decimal(12,2) NOT NULL,
  `status` enum('FUNDED','AWAITING_MANAGER_ADD','PENDING_VERIFICATION','SUBMITTED','VERIFIED','IN_TRANSFER','COMPLETED','CANCELLED','DISPUTED') NOT NULL DEFAULT 'FUNDED',
  `cryptoNetwork` varchar(191) DEFAULT NULL,
  `ownershipEmail` varchar(191) DEFAULT NULL,
  `credentialsPayload` text DEFAULT NULL,
  `transferDeadline` datetime(3) DEFAULT NULL,
  `fundedAt` datetime(3) DEFAULT NULL,
  `submittedAt` datetime(3) DEFAULT NULL,
  `verifiedAt` datetime(3) DEFAULT NULL,
  `transferStartedAt` datetime(3) DEFAULT NULL,
  `completedAt` datetime(3) DEFAULT NULL,
  `cancelledAt` datetime(3) DEFAULT NULL,
  `cancelReason` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `isHighValue` tinyint(1) NOT NULL DEFAULT 0,
  `videoVerificationRequired` tinyint(1) NOT NULL DEFAULT 0,
  `videoVerificationCompletedAt` datetime(3) DEFAULT NULL,
  `transferModel` enum('STANDARD','TRUSTLESS') DEFAULT NULL,
  `managerEmailId` varchar(191) DEFAULT NULL,
  `managerAddedAt` datetime(3) DEFAULT NULL,
  `buyerManagerAddedAt` datetime(3) DEFAULT NULL,
  `countdownEndsAt` datetime(3) DEFAULT NULL,
  `escrowOwnerPromotedAt` datetime(3) DEFAULT NULL,
  `sellerConfirmedHandoverAt` datetime(3) DEFAULT NULL,
  `verifiedBy` varchar(191) DEFAULT NULL,
  `organizationId` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Escrow_offerId_key` (`offerId`),
  UNIQUE KEY `Escrow_managerEmailId_key` (`managerEmailId`),
  KEY `Escrow_listingId_idx` (`listingId`),
  KEY `Escrow_buyerId_idx` (`buyerId`),
  KEY `Escrow_sellerId_idx` (`sellerId`),
  KEY `Escrow_status_idx` (`status`),
  KEY `Escrow_organizationId_fkey` (`organizationId`),
  CONSTRAINT `Escrow_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `user` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `Escrow_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `listing` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `Escrow_managerEmailId_fkey` FOREIGN KEY (`managerEmailId`) REFERENCES `escrowmanageremail` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Escrow_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `offer` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Escrow_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Escrow_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `escrow`
--

LOCK TABLES `escrow` WRITE;
/*!40000 ALTER TABLE `escrow` DISABLE KEYS */;
/*!40000 ALTER TABLE `escrow` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `escrowmanageremail`
--

DROP TABLE IF EXISTS `escrowmanageremail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `escrowmanageremail` (
  `id` varchar(191) NOT NULL,
  `address` varchar(191) NOT NULL,
  `platform` varchar(191) NOT NULL,
  `status` enum('AVAILABLE','IN_USE','FLAGGED') NOT NULL DEFAULT 'AVAILABLE',
  `notes` text DEFAULT NULL,
  `addedAsManagerAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `EscrowManagerEmail_address_key` (`address`),
  KEY `EscrowManagerEmail_platform_status_idx` (`platform`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `escrowmanageremail`
--

LOCK TABLES `escrowmanageremail` WRITE;
/*!40000 ALTER TABLE `escrowmanageremail` DISABLE KEYS */;
/*!40000 ALTER TABLE `escrowmanageremail` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `escrowmilestone`
--

DROP TABLE IF EXISTS `escrowmilestone`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `escrowmilestone` (
  `id` varchar(191) NOT NULL,
  `escrowId` varchar(191) NOT NULL,
  `description` varchar(191) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `status` enum('PENDING','RELEASED') NOT NULL DEFAULT 'PENDING',
  `completedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `EscrowMilestone_escrowId_idx` (`escrowId`),
  CONSTRAINT `EscrowMilestone_escrowId_fkey` FOREIGN KEY (`escrowId`) REFERENCES `escrow` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `escrowmilestone`
--

LOCK TABLES `escrowmilestone` WRITE;
/*!40000 ALTER TABLE `escrowmilestone` DISABLE KEYS */;
/*!40000 ALTER TABLE `escrowmilestone` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `featureflag`
--

DROP TABLE IF EXISTS `featureflag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `featureflag` (
  `id` varchar(191) NOT NULL,
  `key` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 0,
  `rolloutPct` int(11) NOT NULL DEFAULT 100,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `FeatureFlag_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `featureflag`
--

LOCK TABLES `featureflag` WRITE;
/*!40000 ALTER TABLE `featureflag` DISABLE KEYS */;
/*!40000 ALTER TABLE `featureflag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fiatpayment`
--

DROP TABLE IF EXISTS `fiatpayment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fiatpayment` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `provider` varchar(191) NOT NULL,
  `providerPaymentId` varchar(191) NOT NULL,
  `amountUsd` decimal(12,2) NOT NULL,
  `currency` varchar(191) NOT NULL DEFAULT 'usd',
  `status` varchar(191) NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `completedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `FiatPayment_providerPaymentId_key` (`providerPaymentId`),
  KEY `FiatPayment_userId_idx` (`userId`),
  KEY `FiatPayment_status_idx` (`status`),
  CONSTRAINT `FiatPayment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fiatpayment`
--

LOCK TABLES `fiatpayment` WRITE;
/*!40000 ALTER TABLE `fiatpayment` DISABLE KEYS */;
/*!40000 ALTER TABLE `fiatpayment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kybsubmission`
--

DROP TABLE IF EXISTS `kybsubmission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kybsubmission` (
  `id` varchar(191) NOT NULL,
  `orgId` varchar(191) NOT NULL,
  `businessName` varchar(191) NOT NULL,
  `registrationNumber` varchar(191) DEFAULT NULL,
  `country` varchar(2) NOT NULL,
  `regDocUrl` varchar(191) DEFAULT NULL,
  `utilityBillUrl` varchar(191) DEFAULT NULL,
  `beneficialOwners` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`beneficialOwners`)),
  `status` varchar(191) NOT NULL DEFAULT 'SUBMITTED',
  `rejectionReason` text DEFAULT NULL,
  `reviewedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `KybSubmission_orgId_key` (`orgId`),
  CONSTRAINT `KybSubmission_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kybsubmission`
--

LOCK TABLES `kybsubmission` WRITE;
/*!40000 ALTER TABLE `kybsubmission` DISABLE KEYS */;
/*!40000 ALTER TABLE `kybsubmission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kycsubmission`
--

DROP TABLE IF EXISTS `kycsubmission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kycsubmission` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `idFrontUrl` varchar(191) NOT NULL,
  `idBackUrl` varchar(191) NOT NULL,
  `selfieUrl` varchar(191) NOT NULL,
  `ocrName` varchar(191) DEFAULT NULL,
  `ocrDob` varchar(191) DEFAULT NULL,
  `ocrDocNumber` varchar(191) DEFAULT NULL,
  `ocrExpiry` varchar(191) DEFAULT NULL,
  `kycScore` double DEFAULT NULL,
  `isLive` tinyint(1) DEFAULT NULL,
  `faceSimilarity` double DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'PENDING',
  `rejectionReason` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `reviewedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `KycSubmission_userId_idx` (`userId`),
  KEY `KycSubmission_status_idx` (`status`),
  CONSTRAINT `KycSubmission_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kycsubmission`
--

LOCK TABLES `kycsubmission` WRITE;
/*!40000 ALTER TABLE `kycsubmission` DISABLE KEYS */;
/*!40000 ALTER TABLE `kycsubmission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `listing`
--

DROP TABLE IF EXISTS `listing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `listing` (
  `id` varchar(191) NOT NULL,
  `sellerId` varchar(191) NOT NULL,
  `platform` enum('YOUTUBE','INSTAGRAM','TIKTOK','FACEBOOK','TELEGRAM','TWITTER_X','SNAPCHAT','PINTEREST','LINKEDIN','WEBSITE') NOT NULL,
  `accountUrl` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `followers` int(11) DEFAULT NULL,
  `engagementRate` double DEFAULT NULL,
  `accountAgeMonths` int(11) DEFAULT NULL,
  `monetized` tinyint(1) NOT NULL DEFAULT 0,
  `lifetimeViews` int(11) DEFAULT NULL,
  `lifetimeRevenue` decimal(12,2) DEFAULT NULL,
  `channelRpm` decimal(8,2) DEFAULT NULL,
  `audienceLanguage` varchar(191) DEFAULT NULL,
  `channelCreationDate` datetime(3) DEFAULT NULL,
  `strikeCount` int(11) NOT NULL DEFAULT 0,
  `warningCount` int(11) NOT NULL DEFAULT 0,
  `strikeWarningContext` text DEFAULT NULL,
  `adsenseStatus` enum('ON','OFF','CHANGEABLE') DEFAULT NULL,
  `displayName` varchar(191) DEFAULT NULL,
  `screenshots` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`screenshots`)),
  `ownershipVerificationCode` varchar(191) DEFAULT NULL,
  `ownershipVerified` tinyint(1) NOT NULL DEFAULT 0,
  `ownershipMethod` varchar(191) DEFAULT NULL,
  `ownershipVerifiedAt` datetime(3) DEFAULT NULL,
  `verifiedPlatformId` varchar(191) DEFAULT NULL,
  `status` enum('DRAFT','PENDING','ACTIVE','SOLD','REJECTED','SUSPENDED','EXPIRED') NOT NULL DEFAULT 'DRAFT',
  `moderationScore` int(11) NOT NULL DEFAULT 0,
  `rejectionReason` varchar(191) DEFAULT NULL,
  `viewCount` int(11) NOT NULL DEFAULT 0,
  `isFeatured` tinyint(1) NOT NULL DEFAULT 0,
  `isPremiumFeatured` tinyint(1) NOT NULL DEFAULT 0,
  `isPinned` tinyint(1) NOT NULL DEFAULT 0,
  `featuredUntil` datetime(3) DEFAULT NULL,
  `pinnedUntil` datetime(3) DEFAULT NULL,
  `lastBumpedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `approvedAt` datetime(3) DEFAULT NULL,
  `soldAt` datetime(3) DEFAULT NULL,
  `saleType` enum('FIXED','AUCTION') NOT NULL DEFAULT 'FIXED',
  `isPrivate` tinyint(1) NOT NULL DEFAULT 0,
  `auctionEndsAt` datetime(3) DEFAULT NULL,
  `reservePrice` decimal(12,2) DEFAULT NULL,
  `buyNowPrice` decimal(12,2) DEFAULT NULL,
  `minBidIncrement` decimal(12,2) DEFAULT NULL,
  `organizationId` varchar(191) DEFAULT NULL,
  `accountLogo` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `Listing_status_platform_idx` (`status`,`platform`),
  KEY `Listing_sellerId_idx` (`sellerId`),
  KEY `Listing_saleType_status_idx` (`saleType`,`status`),
  KEY `Listing_organizationId_fkey` (`organizationId`),
  FULLTEXT KEY `Listing_title_description_idx` (`title`,`description`),
  CONSTRAINT `Listing_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Listing_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `listing`
--

LOCK TABLES `listing` WRITE;
/*!40000 ALTER TABLE `listing` DISABLE KEYS */;
/*!40000 ALTER TABLE `listing` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `listingviewevent`
--

DROP TABLE IF EXISTS `listingviewevent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `listingviewevent` (
  `id` varchar(191) NOT NULL,
  `listingId` varchar(191) NOT NULL,
  `viewerHash` varchar(191) NOT NULL,
  `userId` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `ListingViewEvent_listingId_createdAt_idx` (`listingId`,`createdAt`),
  KEY `ListingViewEvent_listingId_idx` (`listingId`),
  KEY `ListingViewEvent_userId_fkey` (`userId`),
  CONSTRAINT `ListingViewEvent_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `listing` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ListingViewEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `listingviewevent`
--

LOCK TABLES `listingviewevent` WRITE;
/*!40000 ALTER TABLE `listingviewevent` DISABLE KEYS */;
/*!40000 ALTER TABLE `listingviewevent` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loginattempt`
--

DROP TABLE IF EXISTS `loginattempt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loginattempt` (
  `id` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `ip` varchar(191) NOT NULL,
  `success` tinyint(1) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `LoginAttempt_email_createdAt_idx` (`email`,`createdAt`),
  KEY `LoginAttempt_ip_createdAt_idx` (`ip`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loginattempt`
--

LOCK TABLES `loginattempt` WRITE;
/*!40000 ALTER TABLE `loginattempt` DISABLE KEYS */;
INSERT INTO `loginattempt` VALUES ('cmry9edkc000agkzeuho5fwk3','admin@accsmarkets.org','unknown',1,'2026-07-24 01:26:10.476');
/*!40000 ALTER TABLE `loginattempt` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message`
--

DROP TABLE IF EXISTS `message`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `message` (
  `id` varchar(191) NOT NULL,
  `conversationId` varchar(191) NOT NULL,
  `senderId` varchar(191) NOT NULL,
  `recipientId` varchar(191) NOT NULL,
  `escrowId` varchar(191) DEFAULT NULL,
  `content` text NOT NULL,
  `attachmentUrl` varchar(191) DEFAULT NULL,
  `attachmentName` varchar(191) DEFAULT NULL,
  `isRead` tinyint(1) NOT NULL DEFAULT 0,
  `isArchived` tinyint(1) NOT NULL DEFAULT 0,
  `moderationFlagged` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `isPinned` tinyint(1) NOT NULL DEFAULT 0,
  `pinnedAt` datetime(3) DEFAULT NULL,
  `pinnedById` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `Message_conversationId_createdAt_idx` (`conversationId`,`createdAt`),
  KEY `Message_recipientId_isRead_idx` (`recipientId`,`isRead`),
  KEY `Message_senderId_fkey` (`senderId`),
  KEY `Message_escrowId_isPinned_idx` (`escrowId`,`isPinned`),
  CONSTRAINT `Message_escrowId_fkey` FOREIGN KEY (`escrowId`) REFERENCES `escrow` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Message_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `user` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message`
--

LOCK TABLES `message` WRITE;
/*!40000 ALTER TABLE `message` DISABLE KEYS */;
/*!40000 ALTER TABLE `message` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification`
--

DROP TABLE IF EXISTS `notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notification` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `type` enum('LISTING','LISTING_APPROVED','LISTING_REJECTED','OFFER','ESCROW','MESSAGE','PAYMENT','DEPOSIT_CONFIRMED','SYSTEM','DISPUTE','SECURITY') NOT NULL,
  `title` varchar(191) NOT NULL,
  `body` text NOT NULL,
  `link` varchar(191) DEFAULT NULL,
  `isRead` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `Notification_userId_isRead_idx` (`userId`,`isRead`),
  CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification`
--

LOCK TABLES `notification` WRITE;
/*!40000 ALTER TABLE `notification` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `npsresponse`
--

DROP TABLE IF EXISTS `npsresponse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `npsresponse` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `score` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `submittedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `NpsResponse_userId_idx` (`userId`),
  CONSTRAINT `NpsResponse_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `npsresponse`
--

LOCK TABLES `npsresponse` WRITE;
/*!40000 ALTER TABLE `npsresponse` DISABLE KEYS */;
/*!40000 ALTER TABLE `npsresponse` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `offer`
--

DROP TABLE IF EXISTS `offer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `offer` (
  `id` varchar(191) NOT NULL,
  `listingId` varchar(191) NOT NULL,
  `buyerId` varchar(191) NOT NULL,
  `sellerId` varchar(191) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `message` text DEFAULT NULL,
  `status` enum('PENDING','ACCEPTED','DECLINED','EXPIRED','COUNTERED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `parentOfferId` varchar(191) DEFAULT NULL,
  `round` int(11) NOT NULL DEFAULT 1,
  `expiresAt` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Offer_listingId_buyerId_status_idx` (`listingId`,`buyerId`,`status`),
  KEY `Offer_sellerId_status_idx` (`sellerId`,`status`),
  KEY `Offer_buyerId_fkey` (`buyerId`),
  KEY `Offer_parentOfferId_fkey` (`parentOfferId`),
  CONSTRAINT `Offer_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `user` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `Offer_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `listing` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `Offer_parentOfferId_fkey` FOREIGN KEY (`parentOfferId`) REFERENCES `offer` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `offer`
--

LOCK TABLES `offer` WRITE;
/*!40000 ALTER TABLE `offer` DISABLE KEYS */;
/*!40000 ALTER TABLE `offer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organization`
--

DROP TABLE IF EXISTS `organization`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `organization` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `ownerId` varchar(191) NOT NULL,
  `kybStatus` enum('NONE','SUBMITTED','APPROVED','REJECTED') NOT NULL DEFAULT 'NONE',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Organization_ownerId_idx` (`ownerId`),
  CONSTRAINT `Organization_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organization`
--

LOCK TABLES `organization` WRITE;
/*!40000 ALTER TABLE `organization` DISABLE KEYS */;
/*!40000 ALTER TABLE `organization` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organizationmember`
--

DROP TABLE IF EXISTS `organizationmember`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `organizationmember` (
  `id` varchar(191) NOT NULL,
  `orgId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `role` enum('OWNER','ADMIN','MEMBER') NOT NULL DEFAULT 'MEMBER',
  `invitedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `joinedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `OrganizationMember_orgId_userId_key` (`orgId`,`userId`),
  KEY `OrganizationMember_userId_idx` (`userId`),
  CONSTRAINT `OrganizationMember_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `OrganizationMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organizationmember`
--

LOCK TABLES `organizationmember` WRITE;
/*!40000 ALTER TABLE `organizationmember` DISABLE KEYS */;
/*!40000 ALTER TABLE `organizationmember` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phoneverification`
--

DROP TABLE IF EXISTS `phoneverification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `phoneverification` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `phoneNumber` varchar(191) NOT NULL,
  `codeHash` varchar(191) NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `verifiedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `PhoneVerification_userId_key` (`userId`),
  CONSTRAINT `PhoneVerification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phoneverification`
--

LOCK TABLES `phoneverification` WRITE;
/*!40000 ALTER TABLE `phoneverification` DISABLE KEYS */;
/*!40000 ALTER TABLE `phoneverification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `platformbankaccount`
--

DROP TABLE IF EXISTS `platformbankaccount`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `platformbankaccount` (
  `id` varchar(191) NOT NULL,
  `bankName` varchar(191) NOT NULL,
  `accountName` varchar(191) NOT NULL,
  `accountNumber` varchar(191) NOT NULL,
  `routingNumber` varchar(191) DEFAULT NULL,
  `swiftCode` varchar(191) DEFAULT NULL,
  `iban` varchar(191) DEFAULT NULL,
  `currency` varchar(191) NOT NULL DEFAULT 'USD',
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `PlatformBankAccount_isActive_sortOrder_idx` (`isActive`,`sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platformbankaccount`
--

LOCK TABLES `platformbankaccount` WRITE;
/*!40000 ALTER TABLE `platformbankaccount` DISABLE KEYS */;
/*!40000 ALTER TABLE `platformbankaccount` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `platformsettings`
--

DROP TABLE IF EXISTS `platformsettings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `platformsettings` (
  `id` varchar(191) NOT NULL DEFAULT 'singleton',
  `siteName` varchar(191) NOT NULL DEFAULT 'AccsMarkets',
  `maintenanceMode` tinyint(1) NOT NULL DEFAULT 0,
  `registrationOpen` tinyint(1) NOT NULL DEFAULT 1,
  `requireEmailVerification` tinyint(1) NOT NULL DEFAULT 1,
  `minDeposit` decimal(12,2) NOT NULL DEFAULT 10.00,
  `minWithdrawal` decimal(12,2) NOT NULL DEFAULT 20.00,
  `escrowTransferDays` int(11) NOT NULL DEFAULT 3,
  `disputeWindowHours` int(11) NOT NULL DEFAULT 48,
  `highValueEscrowThreshold` decimal(12,2) NOT NULL DEFAULT 500.00,
  `officialSupportUserId` varchar(191) DEFAULT NULL,
  `listingReviewHours` int(11) NOT NULL DEFAULT 48,
  `bankTransferShortfallToleranceUsd` double NOT NULL DEFAULT 1,
  `bankTransferShortfallTolerancePct` double NOT NULL DEFAULT 0.01,
  `updatedAt` datetime(3) NOT NULL,
  `maintenanceAllowAdmins` tinyint(1) NOT NULL DEFAULT 1,
  `maintenanceEndTime` datetime(3) DEFAULT NULL,
  `maintenanceMessage` text DEFAULT NULL,
  `maintenanceTitle` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platformsettings`
--

LOCK TABLES `platformsettings` WRITE;
/*!40000 ALTER TABLE `platformsettings` DISABLE KEYS */;
INSERT INTO `platformsettings` VALUES ('singleton','AccsMarkets',0,1,1,10.00,20.00,7,48,500.00,'cmrxycp3w0007pnrdv1agkll3',48,1,0.01,'2026-07-24 01:13:50.431',1,NULL,'We\'ll be back shortly. Thank you for your patience.','Maintenance in Progress');
/*!40000 ALTER TABLE `platformsettings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `platformtransferpolicy`
--

DROP TABLE IF EXISTS `platformtransferpolicy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `platformtransferpolicy` (
  `id` varchar(191) NOT NULL,
  `platform` varchar(191) NOT NULL,
  `transferDays` int(11) NOT NULL DEFAULT 3,
  `policyNote` text DEFAULT NULL,
  `allowTrustless` tinyint(1) NOT NULL DEFAULT 0,
  `trustlessBootstrapDays` int(11) NOT NULL DEFAULT 7,
  `sourceNote` text DEFAULT NULL,
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `PlatformTransferPolicy_platform_key` (`platform`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platformtransferpolicy`
--

LOCK TABLES `platformtransferpolicy` WRITE;
/*!40000 ALTER TABLE `platformtransferpolicy` DISABLE KEYS */;
INSERT INTO `platformtransferpolicy` VALUES ('cmrxycpcl0043pnrd5d1z255z','YOUTUBE',7,'YouTube channels transfer via manager email invite. Buyer must have a Google account.',1,7,'YouTube Creator Studio ownership transfer','2026-07-23 23:58:20.109'),('cmrxycpcq0044pnrdrwi0habe','INSTAGRAM',7,'Instagram accounts transfer via email/phone change. Requires 2FA disable first.',1,7,'Instagram Help Center','2026-07-23 23:58:27.178'),('cmrxycpcu0045pnrdx9rqfklz','TIKTOK',2,'TikTok accounts transfer via email change. Phone number must be removed first.',1,2,'TikTok Support','2026-07-23 23:58:58.026'),('cmrxycpd30046pnrdcbvus6fo','TWITTER_X',2,'X accounts transfer via email/phone change. Premium subscription does NOT transfer.',0,5,'X Help Center','2026-07-23 20:16:56.679'),('cmrxycpd70047pnrd4xg4t5b4','TELEGRAM',1,'Telegram channels transfer via admin rights. Groups transfer via owner change.',0,3,'Telegram FAQ','2026-07-23 23:59:02.042'),('cmrxycpdb0048pnrdbx685x7s','FACEBOOK',7,'Facebook pages transfer via admin role assignment. Personal profiles cannot be transferred.',1,7,'Facebook Business Help','2026-07-23 23:58:57.303');
/*!40000 ALTER TABLE `platformtransferpolicy` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `privatelistinginvite`
--

DROP TABLE IF EXISTS `privatelistinginvite`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `privatelistinginvite` (
  `id` varchar(191) NOT NULL,
  `listingId` varchar(191) NOT NULL,
  `invitedUserId` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `PrivateListingInvite_listingId_invitedUserId_key` (`listingId`,`invitedUserId`),
  KEY `PrivateListingInvite_invitedUserId_idx` (`invitedUserId`),
  CONSTRAINT `PrivateListingInvite_invitedUserId_fkey` FOREIGN KEY (`invitedUserId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PrivateListingInvite_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `listing` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `privatelistinginvite`
--

LOCK TABLES `privatelistinginvite` WRITE;
/*!40000 ALTER TABLE `privatelistinginvite` DISABLE KEYS */;
/*!40000 ALTER TABLE `privatelistinginvite` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promocode`
--

DROP TABLE IF EXISTS `promocode`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `promocode` (
  `id` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `type` enum('PERCENT_OFF_FEE','FLAT_CREDIT') NOT NULL,
  `value` decimal(12,2) NOT NULL,
  `maxRedemptions` int(11) DEFAULT NULL,
  `redemptionCount` int(11) NOT NULL DEFAULT 0,
  `expiresAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `PromoCode_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promocode`
--

LOCK TABLES `promocode` WRITE;
/*!40000 ALTER TABLE `promocode` DISABLE KEYS */;
/*!40000 ALTER TABLE `promocode` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promoredemption`
--

DROP TABLE IF EXISTS `promoredemption`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `promoredemption` (
  `id` varchar(191) NOT NULL,
  `promoCodeId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `redeemedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `PromoRedemption_promoCodeId_userId_key` (`promoCodeId`,`userId`),
  KEY `PromoRedemption_userId_idx` (`userId`),
  CONSTRAINT `PromoRedemption_promoCodeId_fkey` FOREIGN KEY (`promoCodeId`) REFERENCES `promocode` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `PromoRedemption_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promoredemption`
--

LOCK TABLES `promoredemption` WRITE;
/*!40000 ALTER TABLE `promoredemption` DISABLE KEYS */;
/*!40000 ALTER TABLE `promoredemption` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pushsubscription`
--

DROP TABLE IF EXISTS `pushsubscription`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pushsubscription` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `endpoint` varchar(1000) NOT NULL,
  `p256dh` varchar(500) NOT NULL,
  `auth` varchar(200) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `PushSubscription_endpoint_key` (`endpoint`) USING HASH,
  KEY `PushSubscription_userId_idx` (`userId`),
  CONSTRAINT `PushSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pushsubscription`
--

LOCK TABLES `pushsubscription` WRITE;
/*!40000 ALTER TABLE `pushsubscription` DISABLE KEYS */;
/*!40000 ALTER TABLE `pushsubscription` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ratelimitevent`
--

DROP TABLE IF EXISTS `ratelimitevent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ratelimitevent` (
  `id` varchar(191) NOT NULL,
  `key` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `RateLimitEvent_key_createdAt_idx` (`key`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ratelimitevent`
--

LOCK TABLES `ratelimitevent` WRITE;
/*!40000 ALTER TABLE `ratelimitevent` DISABLE KEYS */;
INSERT INTO `ratelimitevent` VALUES ('cmry5llwo000aj7hughojvjga','forgot-password:::1','2026-07-23 23:39:49.416'),('cmry6uwvw000276vn1y4cm4eq','register:::1','2026-07-24 00:15:03.165'),('cmry6v1bi000376vn7m2gaeth','register:::1','2026-07-24 00:15:08.911'),('cmry6v21n000476vnry2t43a6','register:::1','2026-07-24 00:15:09.852');
/*!40000 ALTER TABLE `ratelimitevent` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `referral`
--

DROP TABLE IF EXISTS `referral`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `referral` (
  `id` varchar(191) NOT NULL,
  `referrerId` varchar(191) NOT NULL,
  `refereeId` varchar(191) NOT NULL,
  `referralCodeId` varchar(191) NOT NULL,
  `status` enum('PENDING','REWARDED') NOT NULL DEFAULT 'PENDING',
  `rewardedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Referral_refereeId_key` (`refereeId`),
  KEY `Referral_referrerId_idx` (`referrerId`),
  KEY `Referral_referralCodeId_idx` (`referralCodeId`),
  CONSTRAINT `Referral_refereeId_fkey` FOREIGN KEY (`refereeId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Referral_referralCodeId_fkey` FOREIGN KEY (`referralCodeId`) REFERENCES `referralcode` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `referral`
--

LOCK TABLES `referral` WRITE;
/*!40000 ALTER TABLE `referral` DISABLE KEYS */;
/*!40000 ALTER TABLE `referral` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `referralcode`
--

DROP TABLE IF EXISTS `referralcode`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `referralcode` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ReferralCode_userId_key` (`userId`),
  UNIQUE KEY `ReferralCode_code_key` (`code`),
  CONSTRAINT `ReferralCode_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `referralcode`
--

LOCK TABLES `referralcode` WRITE;
/*!40000 ALTER TABLE `referralcode` DISABLE KEYS */;
INSERT INTO `referralcode` VALUES ('cmry1p3xm0001w7bzazjs01ep','cmrxycp4k000fpnrdtvjgadqb','JASONPSHF4XT','2026-07-23 21:50:34.283');
/*!40000 ALTER TABLE `referralcode` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `report`
--

DROP TABLE IF EXISTS `report`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `report` (
  `id` varchar(191) NOT NULL,
  `reporterId` varchar(191) NOT NULL,
  `targetType` enum('LISTING','USER','MESSAGE') NOT NULL,
  `targetId` varchar(191) NOT NULL,
  `reason` enum('SCAM','FAKE_ACCOUNT','INAPPROPRIATE_CONTENT','SPAM','HARASSMENT','OTHER') NOT NULL,
  `details` text DEFAULT NULL,
  `status` enum('PENDING','REVIEWING','RESOLVED','DISMISSED') NOT NULL DEFAULT 'PENDING',
  `resolutionAction` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `resolvedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `Report_status_idx` (`status`),
  KEY `Report_targetType_targetId_idx` (`targetType`,`targetId`),
  KEY `Report_reporterId_fkey` (`reporterId`),
  CONSTRAINT `Report_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `user` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `report`
--

LOCK TABLES `report` WRITE;
/*!40000 ALTER TABLE `report` DISABLE KEYS */;
/*!40000 ALTER TABLE `report` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `review`
--

DROP TABLE IF EXISTS `review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `review` (
  `id` varchar(191) NOT NULL,
  `escrowId` varchar(191) NOT NULL,
  `reviewerId` varchar(191) NOT NULL,
  `revieweeId` varchar(191) NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Review_escrowId_reviewerId_key` (`escrowId`,`reviewerId`),
  KEY `Review_revieweeId_idx` (`revieweeId`),
  KEY `Review_reviewerId_fkey` (`reviewerId`),
  CONSTRAINT `Review_escrowId_fkey` FOREIGN KEY (`escrowId`) REFERENCES `escrow` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `Review_revieweeId_fkey` FOREIGN KEY (`revieweeId`) REFERENCES `user` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `Review_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `user` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `review`
--

LOCK TABLES `review` WRITE;
/*!40000 ALTER TABLE `review` DISABLE KEYS */;
/*!40000 ALTER TABLE `review` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `riskscore`
--

DROP TABLE IF EXISTS `riskscore`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `riskscore` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `score` int(11) NOT NULL DEFAULT 0,
  `severity` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'LOW',
  `factors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`factors`)),
  `computedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `dismissedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `RiskScore_userId_key` (`userId`),
  KEY `RiskScore_score_idx` (`score`),
  KEY `RiskScore_severity_idx` (`severity`),
  CONSTRAINT `RiskScore_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `riskscore`
--

LOCK TABLES `riskscore` WRITE;
/*!40000 ALTER TABLE `riskscore` DISABLE KEYS */;
/*!40000 ALTER TABLE `riskscore` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `savedsearch`
--

DROP TABLE IF EXISTS `savedsearch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `savedsearch` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `filters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`filters`)),
  `alertEnabled` tinyint(1) NOT NULL DEFAULT 0,
  `lastNotifiedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `SavedSearch_userId_idx` (`userId`),
  CONSTRAINT `SavedSearch_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `savedsearch`
--

LOCK TABLES `savedsearch` WRITE;
/*!40000 ALTER TABLE `savedsearch` DISABLE KEYS */;
/*!40000 ALTER TABLE `savedsearch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `securityflag`
--

DROP TABLE IF EXISTS `securityflag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `securityflag` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `source` varchar(191) NOT NULL,
  `severity` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  `reason` text NOT NULL,
  `resolvedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `SecurityFlag_userId_idx` (`userId`),
  KEY `SecurityFlag_severity_resolvedAt_idx` (`severity`,`resolvedAt`),
  CONSTRAINT `SecurityFlag_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `securityflag`
--

LOCK TABLES `securityflag` WRITE;
/*!40000 ALTER TABLE `securityflag` DISABLE KEYS */;
/*!40000 ALTER TABLE `securityflag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `session`
--

DROP TABLE IF EXISTS `session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `session` (
  `id` varchar(191) NOT NULL,
  `sessionToken` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `expires` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Session_sessionToken_key` (`sessionToken`),
  KEY `Session_userId_idx` (`userId`),
  CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `session`
--

LOCK TABLES `session` WRITE;
/*!40000 ALTER TABLE `session` DISABLE KEYS */;
/*!40000 ALTER TABLE `session` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staffinvite`
--

DROP TABLE IF EXISTS `staffinvite`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staffinvite` (
  `id` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `staffRoleId` varchar(191) DEFAULT NULL,
  `invitedById` varchar(191) NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `StaffInvite_email_key` (`email`),
  KEY `StaffInvite_email_idx` (`email`),
  KEY `StaffInvite_staffRoleId_fkey` (`staffRoleId`),
  KEY `StaffInvite_invitedById_fkey` (`invitedById`),
  CONSTRAINT `StaffInvite_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `StaffInvite_staffRoleId_fkey` FOREIGN KEY (`staffRoleId`) REFERENCES `staffrole` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staffinvite`
--

LOCK TABLES `staffinvite` WRITE;
/*!40000 ALTER TABLE `staffinvite` DISABLE KEYS */;
/*!40000 ALTER TABLE `staffinvite` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staffrole`
--

DROP TABLE IF EXISTS `staffrole`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staffrole` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`permissions`)),
  `isSystem` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `StaffRole_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staffrole`
--

LOCK TABLES `staffrole` WRITE;
/*!40000 ALTER TABLE `staffrole` DISABLE KEYS */;
/*!40000 ALTER TABLE `staffrole` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptionplan`
--

DROP TABLE IF EXISTS `subscriptionplan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subscriptionplan` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `priceMonthly` decimal(12,2) NOT NULL,
  `listingLimit` int(11) NOT NULL,
  `escrowFeeRate` double NOT NULL,
  `minFee` decimal(12,2) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `SubscriptionPlan_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptionplan`
--

LOCK TABLES `subscriptionplan` WRITE;
/*!40000 ALTER TABLE `subscriptionplan` DISABLE KEYS */;
INSERT INTO `subscriptionplan` VALUES ('cmrxycond0000pnrdp6petwcy','FREE',0.00,5,0.05,4.00,'2026-07-23 20:16:55.753'),('cmrxyconj0001pnrd0x3ysam0','STARTER',6.00,20,0.04,3.00,'2026-07-23 20:16:55.759'),('cmrxycont0002pnrdr7ch00i0','PRO',15.00,75,0.03,2.00,'2026-07-23 20:16:55.770'),('cmrxyconx0003pnrd97eeb5g1','ENTERPRISE',30.00,999,0.02,1.00,'2026-07-23 20:16:55.774');
/*!40000 ALTER TABLE `subscriptionplan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `termsacceptance`
--

DROP TABLE IF EXISTS `termsacceptance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `termsacceptance` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `version` varchar(191) NOT NULL,
  `acceptedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `ip` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `TermsAcceptance_userId_version_key` (`userId`,`version`),
  KEY `TermsAcceptance_userId_idx` (`userId`),
  CONSTRAINT `TermsAcceptance_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `termsacceptance`
--

LOCK TABLES `termsacceptance` WRITE;
/*!40000 ALTER TABLE `termsacceptance` DISABLE KEYS */;
INSERT INTO `termsacceptance` VALUES ('cmry9ak8c0005gkzeg1q1fhof','cmrxycp3w0007pnrdv1agkll3','2.5','2026-07-24 01:23:16.021','::1');
/*!40000 ALTER TABLE `termsacceptance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction`
--

DROP TABLE IF EXISTS `transaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transaction` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `type` enum('DEPOSIT','WITHDRAWAL','ESCROW_PAYMENT','ESCROW_RELEASE','PLATFORM_FEE','REFUND','WALLET_CREDIT','WALLET_DEBIT','PROMOTION','BUMP','SUBSCRIPTION') NOT NULL,
  `status` enum('PENDING','COMPLETED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `amount` decimal(12,2) NOT NULL,
  `balanceBefore` decimal(12,2) NOT NULL,
  `balanceAfter` decimal(12,2) NOT NULL,
  `escrowId` varchar(191) DEFAULT NULL,
  `cryptoPaymentId` varchar(191) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Transaction_cryptoPaymentId_key` (`cryptoPaymentId`),
  KEY `Transaction_userId_type_idx` (`userId`,`type`),
  KEY `Transaction_status_idx` (`status`),
  KEY `Transaction_escrowId_fkey` (`escrowId`),
  CONSTRAINT `Transaction_escrowId_fkey` FOREIGN KEY (`escrowId`) REFERENCES `escrow` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Transaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction`
--

LOCK TABLES `transaction` WRITE;
/*!40000 ALTER TABLE `transaction` DISABLE KEYS */;
INSERT INTO `transaction` VALUES ('cmrxycp6o001lpnrdn1jtkl1q','cmrxycp4k000fpnrdtvjgadqb','DEPOSIT','COMPLETED',50000.00,0.00,50000.00,NULL,NULL,NULL,'2026-07-13 20:16:56.448'),('cmrxycp6t001npnrdu9t60se8','cmrxycp4k000fpnrdtvjgadqb','ESCROW_PAYMENT','COMPLETED',42840.00,50000.00,7160.00,NULL,NULL,NULL,'2026-07-18 20:16:56.448'),('cmrxycp6w001ppnrdiuza4bz0','cmrxycp4p000hpnrdz8h82h1c','DEPOSIT','COMPLETED',10000.00,0.00,10000.00,NULL,NULL,NULL,'2026-06-23 20:16:56.448'),('cmrxycp75001rpnrd8ix87g9m','cmrxycp4p000hpnrdz8h82h1c','ESCROW_PAYMENT','COMPLETED',7725.00,10000.00,2275.00,NULL,NULL,NULL,'2026-06-29 20:16:56.448'),('cmrxycp79001tpnrdyumcq9be','cmrxycp450009pnrdyp431c8c','ESCROW_RELEASE','COMPLETED',7500.00,0.00,7500.00,NULL,NULL,NULL,'2026-07-03 20:16:56.448'),('cmrxycp7d001vpnrdrc8agz8g','cmrxycp450009pnrdyp431c8c','WITHDRAWAL','COMPLETED',5000.00,7500.00,2500.00,NULL,NULL,NULL,'2026-07-05 20:16:56.448'),('cmrxycp7h001xpnrddfg5xqkr','cmrxycp3p0005pnrdzzoawa9h','PLATFORM_FEE','COMPLETED',225.00,4775.00,5000.00,NULL,NULL,NULL,'2026-07-03 20:16:56.448'),('cmrxycp7k001zpnrd1ujxlftj','cmrxycp4u000jpnrdo5db7e4m','DEPOSIT','COMPLETED',9500.00,0.00,9500.00,NULL,NULL,NULL,'2026-07-20 20:16:56.448'),('cmrxycp7o0021pnrd8dyunc2k','cmrxycp4u000jpnrdo5db7e4m','ESCROW_PAYMENT','COMPLETED',8670.00,9500.00,830.00,NULL,NULL,NULL,'2026-07-22 20:16:56.448'),('cmrxycp7r0023pnrdzllm0qhu','cmrxycp4b000bpnrdeuregzht','DEPOSIT','COMPLETED',500.00,7700.00,8200.00,NULL,NULL,NULL,'2026-07-09 20:16:56.448'),('cmrxycp7v0025pnrdnwuy2f9y','cmrxycp4f000dpnrd86hyiwf3','DEPOSIT','PENDING',200.00,320.00,320.00,NULL,NULL,NULL,'2026-07-23 16:16:56.448');
/*!40000 ALTER TABLE `transaction` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `twofactorauth`
--

DROP TABLE IF EXISTS `twofactorauth`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `twofactorauth` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `secret` varchar(191) NOT NULL,
  `backupCodes` text NOT NULL,
  `enabledAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `TwoFactorAuth_userId_key` (`userId`),
  CONSTRAINT `TwoFactorAuth_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `twofactorauth`
--

LOCK TABLES `twofactorauth` WRITE;
/*!40000 ALTER TABLE `twofactorauth` DISABLE KEYS */;
INSERT INTO `twofactorauth` VALUES ('cmry5a3160008j7huwmwy10e3','cmrxycp3p0005pnrdzzoawa9h','78911068d4e654b000af7e78:0a5e56f6d3165e56e30d1bf0640867b6:8ad167371029368fbf8a964f9f9750ca38d757ed53137cc150ebda2105498fe4','[\"$2a$10$PLOTmeEXoIiYM10kXtfequ10cweuVwl6EgL0wuWS9PG7hgJaH9X8y\",\"$2a$10$0WkN8nrIFzHDBzck1sTnh.P9AYlV5cbKLjElCiQ5d0ztNdRcq3EdK\",\"$2a$10$qGeD2nu0rKBf/z9uY0I27er3sgBvXCpVuZGSw7Gsf9a1I1q.G/ZWG\",\"$2a$10$qk1yWcByiSey3pqj.jJ0BuGsbF1LkVEW8SHPzRgl9V.QpLBXBzQX.\",\"$2a$10$OQOnCPdqgqw0Xw3ieFiGEO.mR0nfucF1lEFepBh26jCBxOfhZpYIS\",\"$2a$10$XIRGE2gqj6AMvsJrn3AKkenANQWr/LlLmGWvGnEIfO1OKinEuWydG\",\"$2a$10$oKQhYgP0TZEvjhYpR.KwxurTtwLhRxeSh4a46zP/rcXVsus7YR/oK\",\"$2a$10$hbKXeIQQdMcPkAXdo9nug.hbxIWE1xmmHGmyD2cy6vsmXd5V7JtIa\",\"$2a$10$u7A4ilW9R5/NzJ2NJDZpi.tB6QT7gx1eFlK2TI1raDohx1fG6vt6q\",\"$2a$10$IYQvEbkaYJQiOkzd3AqQ9eh3.VLEmdKlrtgZ1hOOSxbbwPOLOdx..\"]','2026-07-23 23:31:44.424');
/*!40000 ALTER TABLE `twofactorauth` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user` (
  `id` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `emailVerified` datetime(3) DEFAULT NULL,
  `password` varchar(191) DEFAULT NULL,
  `name` varchar(191) DEFAULT NULL,
  `username` varchar(191) DEFAULT NULL,
  `image` varchar(191) DEFAULT NULL,
  `role` enum('USER','ADMIN') NOT NULL DEFAULT 'USER',
  `kycLevel` enum('NONE','EMAIL','PHONE','ID_VERIFIED') NOT NULL DEFAULT 'NONE',
  `verifiedBadge` enum('NONE','BLUE','GOLD','GREY','OFFICIAL') NOT NULL DEFAULT 'NONE',
  `trustScore` int(11) NOT NULL DEFAULT 0,
  `walletBalance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `subscriptionPlanId` varchar(191) DEFAULT NULL,
  `subscriptionExpiresAt` datetime(3) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `socialLinks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`socialLinks`)),
  `isBanned` tinyint(1) NOT NULL DEFAULT 0,
  `bannedReason` varchar(191) DEFAULT NULL,
  `lastSeenAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `displayCurrency` varchar(191) NOT NULL DEFAULT 'USD',
  `referralCookie` varchar(191) DEFAULT NULL,
  `countryCode` varchar(2) DEFAULT NULL,
  `primaryIntent` enum('BUYER','SELLER','BOTH') DEFAULT NULL,
  `sellIntentPlatforms` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`sellIntentPlatforms`)),
  `sellReason` enum('NO_LONGER_NEEDED','FUNDING_NEW_PROJECT','DIVERSIFYING','OTHER') DEFAULT NULL,
  `onboardingCompletedAt` datetime(3) DEFAULT NULL,
  `notifPrefs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`notifPrefs`)),
  `staffRoleId` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`),
  UNIQUE KEY `User_username_key` (`username`),
  KEY `User_role_idx` (`role`),
  KEY `User_subscriptionPlanId_fkey` (`subscriptionPlanId`),
  KEY `User_staffRoleId_fkey` (`staffRoleId`),
  CONSTRAINT `User_staffRoleId_fkey` FOREIGN KEY (`staffRoleId`) REFERENCES `staffrole` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `User_subscriptionPlanId_fkey` FOREIGN KEY (`subscriptionPlanId`) REFERENCES `subscriptionplan` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES ('cmrxycp3p0005pnrdzzoawa9h','admin@accsmarkets.org','2026-07-23 20:16:56.339','$2a$12$2RqfvfIgnYm.c0fvksFkVu6aQsB2TQroxCB7.oaynNBcD0uc5gW86','Platform Admin','admin','https://res.cloudinary.com/ay5pafey/image/upload/v1784850880/accsmarkets/avatars/gvbw4t9agtdmrt8d9qe7.png','ADMIN','ID_VERIFIED','GOLD',100,5000.00,'cmrxyconx0003pnrd97eeb5g1',NULL,'','{}',0,NULL,'2026-07-24 00:18:14.613','2025-07-23 20:16:56.339','2026-07-24 00:18:14.614','USD',NULL,'US',NULL,NULL,NULL,NULL,NULL,NULL),('cmrxycp3w0007pnrdv1agkll3','support@accsmarkets.org','2026-07-23 20:16:56.347','$2a$12$r4A44BqvMklMrOTB0prYpeNXqxrPR4U4myW6fwupR2uvyEqLtlDMC','AccsMarkets Support','support','https://res.cloudinary.com/ay5pafey/image/upload/v1784850253/accsmarkets/avatars/xcqyv9o6cnpukypjgeim.png','ADMIN','ID_VERIFIED','OFFICIAL',100,0.00,'cmrxycond0000pnrdp6petwcy',NULL,'','{}',0,NULL,'2026-07-24 01:50:21.554','2025-07-23 20:16:56.347','2026-07-24 01:50:21.555','USD',NULL,'US',NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `userachievementbadge`
--

DROP TABLE IF EXISTS `userachievementbadge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `userachievementbadge` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `badge` enum('RISING_STAR','POWER_SELLER','TOP_SELLER','LEGEND','BIG_EARNER','WHALE','FIVE_STAR_SELLER','FAST_RESPONDER','TRUSTED_SELLER') NOT NULL,
  `awardedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserAchievementBadge_userId_badge_key` (`userId`,`badge`),
  KEY `UserAchievementBadge_userId_idx` (`userId`),
  CONSTRAINT `UserAchievementBadge_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `userachievementbadge`
--

LOCK TABLES `userachievementbadge` WRITE;
/*!40000 ALTER TABLE `userachievementbadge` DISABLE KEYS */;
INSERT INTO `userachievementbadge` VALUES ('cmrxycpbr003tpnrda4rk8xjh','cmrxycp4b000bpnrdeuregzht','POWER_SELLER','2026-05-24 20:16:56.631'),('cmrxycpbr003upnrdk3nc3cyh','cmrxycp4b000bpnrdeuregzht','TRUSTED_SELLER','2026-04-24 20:16:56.631'),('cmrxycpbr003vpnrd0mdv4sxe','cmrxycp4b000bpnrdeuregzht','FIVE_STAR_SELLER','2026-06-23 20:16:56.631'),('cmrxycpbr003wpnrdnu69rdkt','cmrxycp450009pnrdyp431c8c','RISING_STAR','2026-03-25 20:16:56.631'),('cmrxycpbr003xpnrdeankmfif','cmrxycp450009pnrdyp431c8c','FAST_RESPONDER','2026-05-24 20:16:56.631'),('cmrxycpbr003ypnrdh2pxcn0d','cmrxycp4p000hpnrdz8h82h1c','RISING_STAR','2026-07-03 20:16:56.631');
/*!40000 ALTER TABLE `userachievementbadge` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `userfollow`
--

DROP TABLE IF EXISTS `userfollow`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `userfollow` (
  `id` varchar(191) NOT NULL,
  `followerId` varchar(191) NOT NULL,
  `followingId` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserFollow_followerId_followingId_key` (`followerId`,`followingId`),
  KEY `UserFollow_followingId_idx` (`followingId`),
  CONSTRAINT `UserFollow_followerId_fkey` FOREIGN KEY (`followerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserFollow_followingId_fkey` FOREIGN KEY (`followingId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `userfollow`
--

LOCK TABLES `userfollow` WRITE;
/*!40000 ALTER TABLE `userfollow` DISABLE KEYS */;
/*!40000 ALTER TABLE `userfollow` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `verificationtoken`
--

DROP TABLE IF EXISTS `verificationtoken`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `verificationtoken` (
  `identifier` varchar(191) NOT NULL,
  `token` varchar(191) NOT NULL,
  `expires` datetime(3) NOT NULL,
  UNIQUE KEY `VerificationToken_token_key` (`token`),
  UNIQUE KEY `VerificationToken_identifier_token_key` (`identifier`,`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `verificationtoken`
--

LOCK TABLES `verificationtoken` WRITE;
/*!40000 ALTER TABLE `verificationtoken` DISABLE KEYS */;
/*!40000 ALTER TABLE `verificationtoken` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wantedlisting`
--

DROP TABLE IF EXISTS `wantedlisting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wantedlisting` (
  `id` varchar(191) NOT NULL,
  `buyerId` varchar(191) NOT NULL,
  `platform` enum('YOUTUBE','INSTAGRAM','TIKTOK','FACEBOOK','TELEGRAM','TWITTER_X','SNAPCHAT','PINTEREST','LINKEDIN','WEBSITE') DEFAULT NULL,
  `title` varchar(191) NOT NULL,
  `criteria` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`criteria`)),
  `budget` decimal(12,2) DEFAULT NULL,
  `status` enum('OPEN','FULFILLED','CLOSED') NOT NULL DEFAULT 'OPEN',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `WantedListing_buyerId_status_idx` (`buyerId`,`status`),
  KEY `WantedListing_platform_status_idx` (`platform`,`status`),
  CONSTRAINT `WantedListing_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wantedlisting`
--

LOCK TABLES `wantedlisting` WRITE;
/*!40000 ALTER TABLE `wantedlisting` DISABLE KEYS */;
/*!40000 ALTER TABLE `wantedlisting` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `watchlist`
--

DROP TABLE IF EXISTS `watchlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `watchlist` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `listingId` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Watchlist_userId_listingId_key` (`userId`,`listingId`),
  KEY `Watchlist_userId_idx` (`userId`),
  KEY `Watchlist_listingId_fkey` (`listingId`),
  CONSTRAINT `Watchlist_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `listing` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Watchlist_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `watchlist`
--

LOCK TABLES `watchlist` WRITE;
/*!40000 ALTER TABLE `watchlist` DISABLE KEYS */;
/*!40000 ALTER TABLE `watchlist` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `webhookdelivery`
--

DROP TABLE IF EXISTS `webhookdelivery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `webhookdelivery` (
  `id` varchar(191) NOT NULL,
  `endpointId` varchar(191) NOT NULL,
  `eventType` enum('ESCROW_CREATED','ESCROW_FUNDED','ESCROW_COMPLETED','ESCROW_DISPUTED','OFFER_RECEIVED','OFFER_ACCEPTED','LISTING_SOLD','PAYMENT_RECEIVED') NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `status` enum('PENDING','SUCCESS','FAILED') NOT NULL DEFAULT 'PENDING',
  `responseStatus` int(11) DEFAULT NULL,
  `responseBody` text DEFAULT NULL,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `nextRetryAt` datetime(3) DEFAULT NULL,
  `deliveredAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `WebhookDelivery_endpointId_idx` (`endpointId`),
  KEY `WebhookDelivery_status_idx` (`status`),
  CONSTRAINT `WebhookDelivery_endpointId_fkey` FOREIGN KEY (`endpointId`) REFERENCES `webhookendpoint` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webhookdelivery`
--

LOCK TABLES `webhookdelivery` WRITE;
/*!40000 ALTER TABLE `webhookdelivery` DISABLE KEYS */;
/*!40000 ALTER TABLE `webhookdelivery` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `webhookendpoint`
--

DROP TABLE IF EXISTS `webhookendpoint`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `webhookendpoint` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `url` varchar(191) NOT NULL,
  `secret` varchar(191) NOT NULL,
  `events` varchar(191) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `WebhookEndpoint_userId_idx` (`userId`),
  CONSTRAINT `WebhookEndpoint_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webhookendpoint`
--

LOCK TABLES `webhookendpoint` WRITE;
/*!40000 ALTER TABLE `webhookendpoint` DISABLE KEYS */;
/*!40000 ALTER TABLE `webhookendpoint` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'accsmarkets'
--

--
-- Dumping routines for database 'accsmarkets'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-24  5:50:30
