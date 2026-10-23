-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: stock_trading_db
-- ------------------------------------------------------
-- Server version	8.0.46-0ubuntu0.24.04.4

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ad_campaigns`
--

DROP TABLE IF EXISTS `ad_campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ad_campaigns` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `advertiser_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `description` text,
  `budget` decimal(15,2) DEFAULT NULL,
  `spent` decimal(15,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `priority` int DEFAULT NULL,
  `target_audience` json DEFAULT NULL,
  `creative_urls` json DEFAULT NULL,
  `impressions` int DEFAULT NULL,
  `clicks` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ad_campaigns`
--

LOCK TABLES `ad_campaigns` WRITE;
/*!40000 ALTER TABLE `ad_campaigns` DISABLE KEYS */;
/*!40000 ALTER TABLE `ad_campaigns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ad_transactions`
--

DROP TABLE IF EXISTS `ad_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ad_transactions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `campaign_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `description` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `campaign_id` (`campaign_id`),
  CONSTRAINT `ad_transactions_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ad_transactions`
--

LOCK TABLES `ad_transactions` WRITE;
/*!40000 ALTER TABLE `ad_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `ad_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `advisor_pledge_access_requests`
--

DROP TABLE IF EXISTS `advisor_pledge_access_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `advisor_pledge_access_requests` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `advisor_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `pledge_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `status` varchar(255) DEFAULT 'pending',
  `requested_at` datetime DEFAULT NULL,
  `responded_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `advisor_pledge_access_requests`
--

LOCK TABLES `advisor_pledge_access_requests` WRITE;
/*!40000 ALTER TABLE `advisor_pledge_access_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `advisor_pledge_access_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `advisor_pledge_commissions`
--

DROP TABLE IF EXISTS `advisor_pledge_commissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `advisor_pledge_commissions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `advisor_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `pledge_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `advisor_id` (`advisor_id`),
  CONSTRAINT `advisor_pledge_commissions_ibfk_1` FOREIGN KEY (`advisor_id`) REFERENCES `advisors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `advisor_pledge_commissions`
--

LOCK TABLES `advisor_pledge_commissions` WRITE;
/*!40000 ALTER TABLE `advisor_pledge_commissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `advisor_pledge_commissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `advisor_posts`
--

DROP TABLE IF EXISTS `advisor_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `advisor_posts` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `advisor_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `content` text,
  `media_urls` json DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `likes_count` int DEFAULT NULL,
  `comments_count` int DEFAULT NULL,
  `is_pinned` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `advisor_posts`
--

LOCK TABLES `advisor_posts` WRITE;
/*!40000 ALTER TABLE `advisor_posts` DISABLE KEYS */;
/*!40000 ALTER TABLE `advisor_posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `advisor_recommendations`
--

DROP TABLE IF EXISTS `advisor_recommendations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `advisor_recommendations` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `advisor_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `stock_symbol` varchar(255) DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `target_price` decimal(15,4) DEFAULT NULL,
  `stop_loss` decimal(15,4) DEFAULT NULL,
  `reason` text,
  `status` varchar(255) DEFAULT NULL,
  `confidence` int DEFAULT NULL,
  `timeframe` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `advisor_id` (`advisor_id`),
  CONSTRAINT `advisor_recommendations_ibfk_1` FOREIGN KEY (`advisor_id`) REFERENCES `advisors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `advisor_recommendations`
--

LOCK TABLES `advisor_recommendations` WRITE;
/*!40000 ALTER TABLE `advisor_recommendations` DISABLE KEYS */;
/*!40000 ALTER TABLE `advisor_recommendations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `advisors`
--

DROP TABLE IF EXISTS `advisors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `advisors` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `bio` text,
  `rating` decimal(3,2) DEFAULT NULL,
  `total_clients` int DEFAULT NULL,
  `total_earnings` decimal(15,2) DEFAULT NULL,
  `specialization` json DEFAULT NULL,
  `status` varchar(255) DEFAULT 'pending_approval',
  `verified` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `display_name` varchar(255) DEFAULT NULL,
  `profile_image_url` varchar(255) DEFAULT NULL,
  `sebi_registration_number` varchar(255) DEFAULT NULL,
  `sebi_document_url` varchar(255) DEFAULT NULL,
  `rejection_reason` text,
  `follower_count` int DEFAULT '0',
  `success_rate` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `advisors`
--

LOCK TABLES `advisors` WRITE;
/*!40000 ALTER TABLE `advisors` DISABLE KEYS */;
INSERT INTO `advisors` VALUES ('d452d13d-adcc-4e01-b937-1d240420ded5','8720b484-8c4f-4377-9e16-d18a7d5901cc',NULL,NULL,'Testing',NULL,NULL,NULL,NULL,'approved',1,'2026-10-09 16:34:54','2026-10-09 16:34:54','test',NULL,'313131','http://98.87.150.151/api/files/view/private/8720b484-8c4f-4377-9e16-d18a7d5901cc/sebi-certificates/8a4fed06-613f-434e-95a2-ac62c220fcf4-og-default.png',NULL,0,NULL);
/*!40000 ALTER TABLE `advisors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alert_configurations`
--

DROP TABLE IF EXISTS `alert_configurations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alert_configurations` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `alert_type` varchar(255) DEFAULT NULL,
  `conditions` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `notification_channels` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert_configurations`
--

LOCK TABLES `alert_configurations` WRITE;
/*!40000 ALTER TABLE `alert_configurations` DISABLE KEYS */;
INSERT INTO `alert_configurations` VALUES ('0064d667-7d43-435e-a189-74891868f4df',NULL,'poll_anomaly',NULL,NULL,NULL,'2025-12-24 10:10:28','2025-12-24 10:10:28'),('019ea207-c885-4b33-b4a1-795223317f2e',NULL,'poll_premium_conversion',NULL,NULL,NULL,'2025-12-24 10:10:28','2025-12-24 10:10:28'),('2e2a2ac6-38dd-4330-869c-096356ee8f8c',NULL,'pledge_near_target',NULL,NULL,NULL,'2025-12-24 10:10:28','2025-12-24 10:10:28'),('742aa21b-116e-4eda-b59c-6c8ade551a4a',NULL,'poll_high_engagement',NULL,NULL,NULL,'2025-12-24 10:10:28','2025-12-24 10:10:28'),('8804d73b-b159-4e9f-92ab-4c674d4ff93e',NULL,'pledge_expired',NULL,NULL,NULL,'2025-12-24 10:10:28','2025-12-24 10:10:28'),('ac216278-a910-46bb-971c-9ea4a714dbab',NULL,'pledge_target_achieved',NULL,NULL,NULL,'2025-12-24 10:10:28','2025-12-24 10:10:28'),('ad2b3a86-8bae-4f6f-9af3-913c54f2c6b7',NULL,'pledge_low_participation',NULL,NULL,NULL,'2025-12-24 10:10:28','2025-12-24 10:10:28'),('e524ea0b-f821-4239-9a46-be787420e85c',NULL,'poll_flagged',NULL,NULL,NULL,'2025-12-24 10:10:28','2025-12-24 10:10:28');
/*!40000 ALTER TABLE `alert_configurations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alert_logs`
--

DROP TABLE IF EXISTS `alert_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alert_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `alert_type` varchar(255) DEFAULT NULL,
  `severity` varchar(255) DEFAULT 'info',
  `message` text,
  `status` varchar(255) DEFAULT 'open',
  `entity_type` varchar(255) DEFAULT NULL,
  `entity_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `triggered_at` datetime DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `resolved_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert_logs`
--

LOCK TABLES `alert_logs` WRITE;
/*!40000 ALTER TABLE `alert_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `alert_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alert_settings`
--

DROP TABLE IF EXISTS `alert_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alert_settings` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `stock_symbol` varchar(255) DEFAULT NULL,
  `alert_type` varchar(255) DEFAULT NULL,
  `price_above` decimal(15,4) DEFAULT NULL,
  `price_below` decimal(15,4) DEFAULT NULL,
  `percent_change` decimal(5,2) DEFAULT NULL,
  `volume_threshold` bigint DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `notification_email` tinyint(1) DEFAULT NULL,
  `notification_push` tinyint(1) DEFAULT NULL,
  `notification_sms` tinyint(1) DEFAULT NULL,
  `last_triggered_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `alert_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert_settings`
--

LOCK TABLES `alert_settings` WRITE;
/*!40000 ALTER TABLE `alert_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `alert_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `analytics_events`
--

DROP TABLE IF EXISTS `analytics_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `analytics_events` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `event_type` varchar(255) DEFAULT NULL,
  `event_data` json DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `page_url` varchar(255) DEFAULT NULL,
  `referrer` varchar(255) DEFAULT NULL,
  `device_info` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `analytics_events`
--

LOCK TABLES `analytics_events` WRITE;
/*!40000 ALTER TABLE `analytics_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `analytics_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `announcements`
--

DROP TABLE IF EXISTS `announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcements` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text,
  `type` varchar(255) DEFAULT 'info',
  `priority` varchar(255) DEFAULT 'normal',
  `target` varchar(255) DEFAULT 'all',
  `is_active` tinyint(1) DEFAULT '1',
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `announcements`
--

LOCK TABLES `announcements` WRITE;
/*!40000 ALTER TABLE `announcements` DISABLE KEYS */;
/*!40000 ALTER TABLE `announcements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `entity_type` varchar(255) DEFAULT NULL,
  `entity_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `old_data` json DEFAULT NULL,
  `new_data` json DEFAULT NULL,
  `description` text,
  `ip_address` varchar(255) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES ('3074166a-23c0-4404-92cb-1827313291bc',NULL,'CONTENT_MODERATED','ModerationLog','720c38c8-d808-4d1a-9f8c-322982343d6f',NULL,NULL,NULL,NULL,NULL,'2025-12-31 02:11:45','2025-12-31 02:11:45'),('4aea707a-8c6c-4fe2-b9be-ed0a7b6119d8',NULL,'CHATROOM_CREATED','ChatRoom','666257ae-9a19-4d0d-a719-350797918e79',NULL,NULL,NULL,NULL,NULL,'2025-12-31 02:13:25','2025-12-31 02:13:25'),('51bb6c9d-c83d-4026-b975-7149790644b4',NULL,'CHATROOM_CREATED','ChatRoom','665bd456-a52f-4d06-bfad-a85651f77805',NULL,NULL,NULL,NULL,NULL,'2025-12-31 02:13:25','2025-12-31 02:13:25'),('723f5211-c5d9-4a76-902a-b975f2131af9',NULL,'CHATROOM_CREATED','ChatRoom','a8a1464b-e5ec-466d-b6d7-493bf5ea592d',NULL,NULL,NULL,NULL,NULL,'2025-12-31 02:13:22','2025-12-31 02:13:22'),('7ebbc1a6-c168-4d6b-9cf5-3ed1f6934e2c',NULL,'CHATROOM_CREATED','ChatRoom','3fa1ba44-74d8-44bb-8610-e9e835487dcd',NULL,NULL,NULL,NULL,NULL,'2025-12-31 02:13:25','2025-12-31 02:13:25'),('9541c314-69b1-4ff7-bd00-b4ecaa3662c5',NULL,'CHATROOM_CREATED','ChatRoom','b88a47df-9330-43d5-9031-e8e67b0c6f6d',NULL,NULL,NULL,NULL,NULL,'2025-12-31 02:13:22','2025-12-31 02:13:22'),('985f6d5b-54d0-4072-9f76-0a1b3f0214b7',NULL,'CHATROOM_CREATED','ChatRoom','bef0f226-f5c5-4c5d-8721-c6eae2065ea2',NULL,NULL,NULL,NULL,NULL,'2025-12-31 02:13:22','2025-12-31 02:13:22'),('9c80db83-d645-4629-8243-9f64d2903d32',NULL,'CHATROOM_CREATED','ChatRoom','f8f13aa4-ad16-4089-9fd2-a7af639a9fa6',NULL,NULL,NULL,NULL,NULL,'2025-12-31 02:13:26','2025-12-31 02:13:26'),('c3d022f7-be31-4acf-a779-d9c689e8e08a',NULL,'CHATROOM_CREATED','ChatRoom','c51dd18d-6c2c-4265-9b6a-8d8b6c7002b2',NULL,NULL,NULL,NULL,NULL,'2025-12-31 02:13:22','2025-12-31 02:13:22'),('d63781e2-24b0-4169-a265-1177551d9cba',NULL,'CHATROOM_CREATED','ChatRoom','c5f71bda-686b-4ee6-97a7-71f77d71961d',NULL,NULL,NULL,NULL,NULL,'2025-12-31 02:13:25','2025-12-31 02:13:25'),('daf24651-24a0-4032-9f1f-2f2e0a6b2baa',NULL,'CHATROOM_CREATED','ChatRoom','eb7610b3-2539-47f4-ab11-acb370d68ae6',NULL,NULL,NULL,NULL,NULL,'2025-12-31 02:13:25','2025-12-31 02:13:25'),('defb5f7b-c722-4d5d-99f8-0376811ddc03',NULL,'CHATROOM_UPDATED','ChatRoom','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783',NULL,NULL,NULL,NULL,NULL,'2025-12-24 10:09:34','2025-12-24 10:09:34');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bot_conversations`
--

DROP TABLE IF EXISTS `bot_conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bot_conversations` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `bot_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `message` text,
  `context` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bot_id` (`bot_id`),
  CONSTRAINT `bot_conversations_ibfk_1` FOREIGN KEY (`bot_id`) REFERENCES `chat_bots` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bot_conversations`
--

LOCK TABLES `bot_conversations` WRITE;
/*!40000 ALTER TABLE `bot_conversations` DISABLE KEYS */;
/*!40000 ALTER TABLE `bot_conversations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campaign_billing`
--

DROP TABLE IF EXISTS `campaign_billing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaign_billing` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `campaign_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `invoice_number` varchar(255) DEFAULT NULL,
  `due_date` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `timestamp` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `campaign_id` (`campaign_id`),
  CONSTRAINT `campaign_billing_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaign_billing`
--

LOCK TABLES `campaign_billing` WRITE;
/*!40000 ALTER TABLE `campaign_billing` DISABLE KEYS */;
/*!40000 ALTER TABLE `campaign_billing` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_bots`
--

DROP TABLE IF EXISTS `chat_bots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_bots` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `description` text,
  `status` varchar(255) DEFAULT NULL,
  `config` json DEFAULT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `welcome_message` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_bots`
--

LOCK TABLES `chat_bots` WRITE;
/*!40000 ALTER TABLE `chat_bots` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_bots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_invites`
--

DROP TABLE IF EXISTS `chat_invites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_invites` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chat_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `code` varchar(255) DEFAULT NULL,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `max_uses` int DEFAULT NULL,
  `uses_count` int DEFAULT '0',
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `role_to_assign` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_invites`
--

LOCK TABLES `chat_invites` WRITE;
/*!40000 ALTER TABLE `chat_invites` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_invites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_room_participants`
--

DROP TABLE IF EXISTS `chat_room_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_room_participants` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chat_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `joined_at` datetime DEFAULT NULL,
  `muted` tinyint(1) DEFAULT NULL,
  `last_read_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `chat_room_id` (`chat_room_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `chat_room_participants_ibfk_215` FOREIGN KEY (`chat_room_id`) REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chat_room_participants_ibfk_216` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_room_participants`
--

LOCK TABLES `chat_room_participants` WRITE;
/*!40000 ALTER TABLE `chat_room_participants` DISABLE KEYS */;
INSERT INTO `chat_room_participants` VALUES ('10fad096-b003-4af4-b33b-b7961770cf1d','f8166250-4f89-403d-88a5-87e50a9015b6','b8bdd193-9c08-4310-8411-1f950308217c','member','2025-12-31 14:40:06',NULL,'2025-12-31 14:40:08','2025-12-31 14:40:06','2025-12-31 14:40:06'),('17842646-389b-4221-aabf-88717d879def','f8f13aa4-ad16-4089-9fd2-a7af639a9fa6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','member','2025-12-31 04:00:17',NULL,NULL,'2025-12-31 04:00:17','2025-12-31 04:00:17'),('2a317592-b13f-4b6b-b4e1-21a404ac4c28','eb7610b3-2539-47f4-ab11-acb370d68ae6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','member','2025-12-31 15:16:45',NULL,NULL,'2025-12-31 15:16:45','2025-12-31 15:16:45'),('348b8e6b-bdec-4bd8-b6d0-3585275795f9','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783','b8bdd193-9c08-4310-8411-1f950308217c','member','2025-12-31 14:40:46',NULL,'2025-12-31 14:41:01','2025-12-31 14:40:46','2025-12-31 14:40:46'),('358ab575-35a0-4e13-bb45-0c641833ef00','b406180e-461a-4741-b3dc-6e43407372ac','6ff49abd-07c1-421c-9c52-0b292c67956b','member','2025-12-16 14:46:43',NULL,'2025-12-16 14:46:44','2025-12-16 14:46:43','2025-12-16 14:46:43'),('39bfe68f-a974-493e-8ee4-a86eb6e89a6e','63a8557f-7b08-4387-852b-f06bfcd47405','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','member','2025-12-31 02:12:30',NULL,'2025-12-31 02:12:38','2025-12-31 02:12:30','2025-12-31 02:12:30'),('3e329c8c-504e-4e87-b44e-0e8f1b88e127','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','member','2025-12-17 02:01:16',NULL,'2025-12-31 08:05:54','2025-12-17 02:01:16','2025-12-17 02:01:16'),('48306447-b37a-4333-9589-f34bc1335759','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783','61796564-4a39-457e-a218-1a4dc9bd5f22','member','2026-09-05 03:10:08',NULL,'2026-09-05 03:10:13','2026-09-05 03:10:08','2026-09-05 03:10:08'),('496a15cb-749b-442f-a46e-8536ca4d1795','12e83e76-b87c-444f-8810-bcba2bdcee62','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','member','2025-12-30 17:27:12',NULL,'2025-12-31 02:12:27','2025-12-30 17:27:12','2025-12-30 17:27:12'),('505ebbd7-071a-4249-8a3d-eea0f7326ca5','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','member','2025-12-17 11:08:51',NULL,'2025-12-31 05:54:20','2025-12-17 11:08:51','2025-12-17 11:08:51'),('570700ac-faef-4e7e-b8c7-914b2f883103','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c','member','2025-12-31 14:41:14',NULL,'2025-12-31 14:43:30','2025-12-31 14:41:14','2025-12-31 14:41:14'),('5bd8ff5b-dd11-4e15-b62a-9b955f3e7ad7','3fa1ba44-74d8-44bb-8610-e9e835487dcd','61796564-4a39-457e-a218-1a4dc9bd5f22','member','2026-09-05 03:11:16',NULL,'2026-09-05 03:11:17','2026-09-05 03:11:16','2026-09-05 03:11:16'),('651c7500-cd79-4425-8a6d-afdce4d1f5ea','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','member','2025-12-16 05:22:29',NULL,'2025-12-24 12:25:39','2025-12-16 05:22:29','2025-12-16 05:22:29'),('66b7395e-fe73-4914-9bf2-ac74645d4174','666257ae-9a19-4d0d-a719-350797918e79','b8bdd193-9c08-4310-8411-1f950308217c','member','2025-12-31 14:39:46',NULL,'2025-12-31 14:39:58','2025-12-31 14:39:46','2025-12-31 14:39:46'),('8b9017ab-ddc0-4103-b67b-ba8c65f8808e','12e83e76-b87c-444f-8810-bcba2bdcee62','b8bdd193-9c08-4310-8411-1f950308217c','member','2025-12-30 12:28:21',NULL,NULL,'2025-12-30 12:28:21','2025-12-30 12:28:21'),('8d2dfafd-09bc-4712-8050-b1bd80ef37d5','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','6ff49abd-07c1-421c-9c52-0b292c67956b','member','2025-12-16 14:41:14',NULL,'2025-12-16 14:47:20','2025-12-16 14:41:14','2025-12-16 14:41:14'),('8daea6d4-559e-4b26-8874-2699368af71e','63a8557f-7b08-4387-852b-f06bfcd47405','eceba0d7-3225-492d-a1e9-04f609ff9571','member','2025-12-30 12:04:53',NULL,'2025-12-30 12:13:39','2025-12-30 12:04:53','2025-12-30 12:04:53'),('a3fcc935-4e8c-45f2-82cf-68971c262eed','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','member','2025-12-17 06:03:46',NULL,'2025-12-31 14:35:16','2025-12-17 06:03:46','2025-12-17 06:03:46'),('beb8f6a7-15c2-4ed2-8de2-3e6d00f3b9c1','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','member','2025-12-16 14:28:03',NULL,'2025-12-17 11:08:14','2025-12-16 14:28:03','2025-12-16 14:28:03'),('bf75be29-5edc-401a-97f8-e831e6cda539','3fa1ba44-74d8-44bb-8610-e9e835487dcd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','member','2025-12-31 15:13:55',NULL,'2026-08-28 13:41:28','2025-12-31 15:13:55','2025-12-31 15:13:55'),('ce4943ef-66fe-468e-a9b7-8a150e1eb758','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b','member','2025-12-16 13:55:17',NULL,'2025-12-16 14:40:40','2025-12-16 13:55:17','2025-12-16 13:55:17'),('d22bb2ac-edbe-4e0c-8ed1-1efcdc50e20f','63a8557f-7b08-4387-852b-f06bfcd47405','b8bdd193-9c08-4310-8411-1f950308217c','member','2025-12-30 12:24:49',NULL,'2025-12-30 12:58:52','2025-12-30 12:24:49','2025-12-30 12:24:49'),('ec835a66-976e-4ee5-b9ab-837958640a8d','b88a47df-9330-43d5-9031-e8e67b0c6f6d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','member','2025-12-31 03:56:52',NULL,NULL,'2025-12-31 03:56:52','2025-12-31 03:56:52');
/*!40000 ALTER TABLE `chat_room_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_rooms`
--

DROP TABLE IF EXISTS `chat_rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_rooms` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `description` text,
  `stock_symbol` varchar(255) DEFAULT NULL,
  `room_type` enum('general','stock_specific','sector','admin','premium','premium_admin') DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT NULL,
  `is_premium` tinyint(1) DEFAULT NULL,
  `required_plan` varchar(255) DEFAULT NULL,
  `admin_only_post` tinyint(1) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `participant_count` int DEFAULT NULL,
  `owner_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `last_message_at` datetime DEFAULT NULL,
  `settings` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `vip_features_enabled` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `owner_id` (`owner_id`),
  CONSTRAINT `chat_rooms_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_rooms`
--

LOCK TABLES `chat_rooms` WRITE;
/*!40000 ALTER TABLE `chat_rooms` DISABLE KEYS */;
INSERT INTO `chat_rooms` VALUES ('12e83e76-b87c-444f-8810-bcba2bdcee62','Test Room Auto','Test','','general',NULL,1,'premium',0,NULL,3,'eceba0d7-3225-492d-a1e9-04f609ff9571',NULL,'2025-12-30 17:27:18',NULL,'2025-12-30 12:28:07','2025-12-30 12:28:07',0),('3fa1ba44-74d8-44bb-8610-e9e835487dcd','Pharma Sector','Pharma stocks discussion',NULL,'sector',NULL,NULL,NULL,NULL,NULL,NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,'2026-08-28 13:41:22',NULL,'2025-12-31 02:13:25','2025-12-31 02:13:25',NULL),('63a8557f-7b08-4387-852b-f06bfcd47405','Premium Alpha Group 1767094238867','Exclusive group for premium users',NULL,'premium',NULL,1,'basic',0,'active',NULL,'eceba0d7-3225-492d-a1e9-04f609ff9571',NULL,'2025-12-31 02:12:38',NULL,'2025-12-30 11:30:38','2025-12-30 11:30:38',0),('665bd456-a52f-4d06-bfad-a85651f77805','Premium Trading Signals',NULL,NULL,'premium_admin',NULL,1,'premium',1,NULL,NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,NULL,NULL,'2025-12-31 02:13:25','2025-12-31 02:13:25',NULL),('666257ae-9a19-4d0d-a719-350797918e79','Banking Sector','Banking stocks discussion',NULL,'sector',NULL,NULL,NULL,NULL,NULL,NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,'2025-12-31 14:39:58',NULL,'2025-12-31 02:13:25','2025-12-31 02:13:25',NULL),('7bb16e6a-6f5a-478c-aa83-ed7a1f45c783','JIO','Testing new','JIO','general',NULL,0,'basic',0,NULL,4,NULL,NULL,'2026-09-05 03:10:13',NULL,'2025-12-17 11:08:32','2025-12-17 11:08:32',0),('7da343c5-473a-4373-aba4-83c9ce3be24b','Test Room Auto','Testing','','general',NULL,0,'basic',0,NULL,3,NULL,NULL,'2025-12-16 14:40:40',NULL,'2025-12-10 07:29:21','2025-12-10 07:29:21',0),('a8a1464b-e5ec-466d-b6d7-493bf5ea592d','ICICIBANK Discussion',NULL,'ICICIBANK','stock_specific',NULL,NULL,NULL,NULL,NULL,NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,NULL,NULL,'2025-12-31 02:13:22','2025-12-31 02:13:22',NULL),('b406180e-461a-4741-b3dc-6e43407372ac','TEST N','','TEST N','general',NULL,0,'basic',0,NULL,3,NULL,NULL,'2025-12-16 14:46:29',NULL,'2025-12-16 14:28:01','2025-12-16 14:28:01',0),('b88a47df-9330-43d5-9031-e8e67b0c6f6d','RELIANCE Discussion',NULL,'RELIANCE','stock_specific',NULL,NULL,NULL,NULL,NULL,NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,NULL,NULL,'2025-12-31 02:13:22','2025-12-31 02:13:22',NULL),('bef0f226-f5c5-4c5d-8721-c6eae2065ea2','INFY Discussion',NULL,'INFY','stock_specific',NULL,NULL,NULL,NULL,NULL,NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,NULL,NULL,'2025-12-31 02:13:22','2025-12-31 02:13:22',NULL),('c51dd18d-6c2c-4265-9b6a-8d8b6c7002b2','HDFCBANK Discussion',NULL,'HDFCBANK','stock_specific',NULL,NULL,NULL,NULL,NULL,NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,NULL,NULL,'2025-12-31 02:13:22','2025-12-31 02:13:22',NULL),('c5f71bda-686b-4ee6-97a7-71f77d71961d','Auto Sector','Auto stocks discussion',NULL,'sector',NULL,NULL,NULL,NULL,NULL,NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,NULL,NULL,'2025-12-31 02:13:25','2025-12-31 02:13:25',NULL),('eb7610b3-2539-47f4-ab11-acb370d68ae6','IT Sector','IT stocks discussion',NULL,'sector',NULL,NULL,NULL,NULL,NULL,NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,NULL,NULL,'2025-12-31 02:13:25','2025-12-31 02:13:25',NULL),('f246acd0-0bf1-4489-bf3a-fdbb1e39c642','TCS','disuss TCS','','general',NULL,0,'basic',0,NULL,3,NULL,NULL,'2025-12-20 13:32:19',NULL,'2025-12-16 14:41:06','2025-12-16 14:41:06',0),('f8166250-4f89-403d-88a5-87e50a9015b6','TCS','Test','TCS','general',NULL,0,'basic',0,NULL,3,NULL,NULL,'2025-12-31 04:07:28',NULL,'2025-12-17 06:03:44','2025-12-17 06:03:44',0),('f8f13aa4-ad16-4089-9fd2-a7af639a9fa6','VIP Insider Tips',NULL,NULL,'premium_admin',NULL,1,'vip',1,NULL,NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,NULL,NULL,'2025-12-31 02:13:26','2025-12-31 02:13:26',NULL);
/*!40000 ALTER TABLE `chat_rooms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commission_settings`
--

DROP TABLE IF EXISTS `commission_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `commission_settings` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `entity_type` varchar(255) DEFAULT NULL,
  `commission_percent` decimal(5,2) DEFAULT NULL,
  `flat_fee` decimal(15,2) DEFAULT NULL,
  `currency` varchar(255) DEFAULT 'INR',
  `is_active` tinyint(1) DEFAULT '1',
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commission_settings`
--

LOCK TABLES `commission_settings` WRITE;
/*!40000 ALTER TABLE `commission_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `commission_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commission_tracking`
--

DROP TABLE IF EXISTS `commission_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `commission_tracking` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `advisor_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `pledge_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `event_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `commission_type` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT 'pending',
  `payout_method` varchar(255) DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commission_tracking`
--

LOCK TABLES `commission_tracking` WRITE;
/*!40000 ALTER TABLE `commission_tracking` DISABLE KEYS */;
/*!40000 ALTER TABLE `commission_tracking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contact_inquiries`
--

DROP TABLE IF EXISTS `contact_inquiries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_inquiries` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `message` text,
  `status` varchar(255) DEFAULT NULL,
  `assigned_to` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contact_inquiries`
--

LOCK TABLES `contact_inquiries` WRITE;
/*!40000 ALTER TABLE `contact_inquiries` DISABLE KEYS */;
/*!40000 ALTER TABLE `contact_inquiries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_enrollments`
--

DROP TABLE IF EXISTS `course_enrollments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_enrollments` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `course_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `progress` int DEFAULT NULL,
  `enrolled_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `certificate_url` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `course_id` (`course_id`),
  CONSTRAINT `course_enrollments_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_enrollments`
--

LOCK TABLES `course_enrollments` WRITE;
/*!40000 ALTER TABLE `course_enrollments` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_enrollments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courses`
--

DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text,
  `instructor_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT NULL,
  `enrollment_count` int DEFAULT NULL,
  `thumbnail_url` varchar(255) DEFAULT NULL,
  `duration_hours` int DEFAULT NULL,
  `level` varchar(255) DEFAULT NULL,
  `syllabus` json DEFAULT NULL,
  `rating` decimal(3,2) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courses`
--

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `educators`
--

DROP TABLE IF EXISTS `educators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `educators` (
  `id` char(36) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `display_name` varchar(255) DEFAULT NULL,
  `bio` text,
  `profile_image_url` varchar(255) DEFAULT NULL,
  `specialization` json DEFAULT NULL,
  `certification` json DEFAULT NULL,
  `social_links` json DEFAULT NULL,
  `course_price_range` json DEFAULT NULL,
  `teaching_style` varchar(255) DEFAULT NULL,
  `experience_years` int DEFAULT NULL,
  `student_count` int DEFAULT '0',
  `success_rate` decimal(5,2) DEFAULT NULL,
  `rating` decimal(3,2) DEFAULT NULL,
  `verified` tinyint(1) DEFAULT '0',
  `status` varchar(255) DEFAULT NULL,
  `rejection_reason` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `educators_user_id_idx` (`user_id`),
  KEY `educators_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `educators`
--

LOCK TABLES `educators` WRITE;
/*!40000 ALTER TABLE `educators` DISABLE KEYS */;
/*!40000 ALTER TABLE `educators` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_logs`
--

DROP TABLE IF EXISTS `email_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `template_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `to_email` varchar(255) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `body` text,
  `status` varchar(255) DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `error_message` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_logs`
--

LOCK TABLES `email_logs` WRITE;
/*!40000 ALTER TABLE `email_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_templates`
--

DROP TABLE IF EXISTS `email_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_templates` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `body` text,
  `type` varchar(255) DEFAULT NULL,
  `variables` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_templates`
--

LOCK TABLES `email_templates` WRITE;
/*!40000 ALTER TABLE `email_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `entity_configs`
--

DROP TABLE IF EXISTS `entity_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entity_configs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `entity_type` varchar(255) DEFAULT NULL,
  `config` json DEFAULT NULL,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `entity_configs`
--

LOCK TABLES `entity_configs` WRITE;
/*!40000 ALTER TABLE `entity_configs` DISABLE KEYS */;
/*!40000 ALTER TABLE `entity_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_attendees`
--

DROP TABLE IF EXISTS `event_attendees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_attendees` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `event_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `checked_in` tinyint(1) DEFAULT NULL,
  `checked_in_at` datetime DEFAULT NULL,
  `ticket_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `event_attendees_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_attendees`
--

LOCK TABLES `event_attendees` WRITE;
/*!40000 ALTER TABLE `event_attendees` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_attendees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_check_ins`
--

DROP TABLE IF EXISTS `event_check_ins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_check_ins` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `event_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `attendee_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `checked_in_at` datetime DEFAULT NULL,
  `checked_in_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `event_check_ins_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_check_ins`
--

LOCK TABLES `event_check_ins` WRITE;
/*!40000 ALTER TABLE `event_check_ins` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_check_ins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_commission_tracking`
--

DROP TABLE IF EXISTS `event_commission_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_commission_tracking` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `event_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `referrer_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_commission_tracking`
--

LOCK TABLES `event_commission_tracking` WRITE;
/*!40000 ALTER TABLE `event_commission_tracking` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_commission_tracking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_feedback`
--

DROP TABLE IF EXISTS `event_feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_feedback` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `event_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `feedback` text,
  `rating` int DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `event_feedback_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_feedback`
--

LOCK TABLES `event_feedback` WRITE;
/*!40000 ALTER TABLE `event_feedback` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_organizers`
--

DROP TABLE IF EXISTS `event_organizers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_organizers` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `verified` tinyint(1) DEFAULT NULL,
  `total_events` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_organizers`
--

LOCK TABLES `event_organizers` WRITE;
/*!40000 ALTER TABLE `event_organizers` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_organizers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_promo_codes`
--

DROP TABLE IF EXISTS `event_promo_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_promo_codes` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `event_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `code` varchar(255) DEFAULT NULL,
  `discount_percent` int DEFAULT NULL,
  `discount_amount` decimal(10,2) DEFAULT NULL,
  `max_uses` int DEFAULT NULL,
  `uses_count` int DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `event_promo_codes_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_promo_codes`
--

LOCK TABLES `event_promo_codes` WRITE;
/*!40000 ALTER TABLE `event_promo_codes` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_promo_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_reminders`
--

DROP TABLE IF EXISTS `event_reminders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_reminders` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `event_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `remind_at` datetime DEFAULT NULL,
  `reminder_type` varchar(255) DEFAULT NULL,
  `is_sent` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `event_reminders_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_reminders`
--

LOCK TABLES `event_reminders` WRITE;
/*!40000 ALTER TABLE `event_reminders` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_reminders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_reviews`
--

DROP TABLE IF EXISTS `event_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_reviews` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `event_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `rating` int DEFAULT NULL,
  `comment` text,
  `is_verified` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `event_reviews_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_reviews`
--

LOCK TABLES `event_reviews` WRITE;
/*!40000 ALTER TABLE `event_reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_tickets`
--

DROP TABLE IF EXISTS `event_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_tickets` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `event_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `ticket_type` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `qr_code` varchar(255) DEFAULT NULL,
  `seat_number` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `event_tickets_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_tickets`
--

LOCK TABLES `event_tickets` WRITE;
/*!40000 ALTER TABLE `event_tickets` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `venue` varchar(255) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `organizer_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `max_attendees` int DEFAULT NULL,
  `ticket_price` decimal(10,2) DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT NULL,
  `is_online` tinyint(1) DEFAULT NULL,
  `meeting_link` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
INSERT INTO `events` VALUES ('978948e7-ff79-4c09-8a70-4c2550a9a62b','Test Meetup','Testing events',NULL,NULL,'Online',NULL,NULL,'pending_approval','d9bd62e0-4721-4a94-85e4-fa69f96d0974',NULL,0.00,NULL,NULL,NULL,NULL,'2025-12-14 02:02:00','2025-12-14 02:02:00'),('c534a88f-251b-4604-9de6-61916c0cec3c','test','testtesttest',NULL,NULL,'test',NULL,NULL,'pending_approval','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,0.00,NULL,NULL,NULL,NULL,'2025-12-16 14:27:36','2025-12-16 14:27:36');
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `category` varchar(255) DEFAULT NULL,
  `description` text,
  `amount` decimal(15,2) DEFAULT NULL,
  `currency` varchar(255) DEFAULT 'INR',
  `vendor` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT 'recorded',
  `expense_date` datetime DEFAULT NULL,
  `recorded_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feature_configs`
--

DROP TABLE IF EXISTS `feature_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feature_configs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `feature_key` varchar(100) NOT NULL,
  `feature_name` varchar(255) NOT NULL,
  `is_enabled` tinyint(1) DEFAULT '1',
  `access_level` enum('free','premium','vip') DEFAULT 'free',
  `tier` enum('basic','premium','vip') DEFAULT 'basic',
  `description` text,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `feature_key` (`feature_key`),
  UNIQUE KEY `feature_key_2` (`feature_key`),
  UNIQUE KEY `feature_key_3` (`feature_key`),
  UNIQUE KEY `feature_key_4` (`feature_key`),
  UNIQUE KEY `feature_key_5` (`feature_key`),
  UNIQUE KEY `feature_key_6` (`feature_key`),
  UNIQUE KEY `feature_key_7` (`feature_key`),
  UNIQUE KEY `feature_key_8` (`feature_key`),
  UNIQUE KEY `feature_key_9` (`feature_key`),
  UNIQUE KEY `feature_key_10` (`feature_key`),
  UNIQUE KEY `feature_key_11` (`feature_key`),
  UNIQUE KEY `feature_key_12` (`feature_key`),
  UNIQUE KEY `feature_key_13` (`feature_key`),
  UNIQUE KEY `feature_key_14` (`feature_key`),
  UNIQUE KEY `feature_key_15` (`feature_key`),
  UNIQUE KEY `feature_key_16` (`feature_key`),
  UNIQUE KEY `feature_key_17` (`feature_key`),
  UNIQUE KEY `feature_key_18` (`feature_key`),
  UNIQUE KEY `feature_key_19` (`feature_key`),
  UNIQUE KEY `feature_key_20` (`feature_key`),
  UNIQUE KEY `feature_key_21` (`feature_key`),
  UNIQUE KEY `feature_key_22` (`feature_key`),
  UNIQUE KEY `feature_key_23` (`feature_key`),
  UNIQUE KEY `feature_key_24` (`feature_key`),
  UNIQUE KEY `feature_key_25` (`feature_key`),
  UNIQUE KEY `feature_key_26` (`feature_key`),
  UNIQUE KEY `feature_key_27` (`feature_key`),
  UNIQUE KEY `feature_key_28` (`feature_key`),
  UNIQUE KEY `feature_key_29` (`feature_key`),
  UNIQUE KEY `feature_key_30` (`feature_key`),
  UNIQUE KEY `feature_key_31` (`feature_key`),
  UNIQUE KEY `feature_key_32` (`feature_key`),
  UNIQUE KEY `feature_key_33` (`feature_key`),
  UNIQUE KEY `feature_key_34` (`feature_key`),
  UNIQUE KEY `feature_key_35` (`feature_key`),
  UNIQUE KEY `feature_key_36` (`feature_key`),
  UNIQUE KEY `feature_key_37` (`feature_key`),
  UNIQUE KEY `feature_key_38` (`feature_key`),
  UNIQUE KEY `feature_key_39` (`feature_key`),
  UNIQUE KEY `feature_key_40` (`feature_key`),
  UNIQUE KEY `feature_key_41` (`feature_key`),
  UNIQUE KEY `feature_key_42` (`feature_key`),
  UNIQUE KEY `feature_key_43` (`feature_key`),
  UNIQUE KEY `feature_key_44` (`feature_key`),
  UNIQUE KEY `feature_key_45` (`feature_key`),
  UNIQUE KEY `feature_key_46` (`feature_key`),
  UNIQUE KEY `feature_key_47` (`feature_key`),
  UNIQUE KEY `feature_key_48` (`feature_key`),
  UNIQUE KEY `feature_key_49` (`feature_key`),
  UNIQUE KEY `feature_key_50` (`feature_key`),
  UNIQUE KEY `feature_key_51` (`feature_key`),
  UNIQUE KEY `feature_key_52` (`feature_key`),
  UNIQUE KEY `feature_key_53` (`feature_key`),
  UNIQUE KEY `feature_key_54` (`feature_key`),
  UNIQUE KEY `feature_key_55` (`feature_key`),
  UNIQUE KEY `feature_key_56` (`feature_key`),
  UNIQUE KEY `feature_key_57` (`feature_key`),
  UNIQUE KEY `feature_key_58` (`feature_key`),
  UNIQUE KEY `feature_key_59` (`feature_key`),
  UNIQUE KEY `feature_key_60` (`feature_key`),
  UNIQUE KEY `feature_key_61` (`feature_key`),
  UNIQUE KEY `feature_key_62` (`feature_key`),
  UNIQUE KEY `feature_key_63` (`feature_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feature_configs`
--

LOCK TABLES `feature_configs` WRITE;
/*!40000 ALTER TABLE `feature_configs` DISABLE KEYS */;
INSERT INTO `feature_configs` VALUES ('0ff6d5b1-cf81-4ecb-b94b-dbe6cf6449d6','my_portfolio','My Portfolio',1,'free','basic','Track your investments and portfolio performance','2025-12-24 14:26:10','2025-12-24 14:26:10'),('26121c8b-3186-42d9-924b-4c8b8f639772','premium_chat_rooms','Premium Chat Rooms',1,'free','premium','Access to exclusive premium chat rooms','2025-12-24 14:26:11','2025-12-24 14:26:11'),('29de4d7f-5f44-40a1-b51a-ba5d6eb3fab3','advanced_analytics','Advanced Analytics',1,'free','premium','Advanced portfolio analytics','2025-12-24 14:26:11','2025-12-24 14:26:11'),('2b20c238-608e-4111-9dc4-cb79902433f4','one_on_one_consultation','One-on-One Consultation',1,'free','vip','Direct analyst access and consultation','2025-12-24 14:26:11','2025-12-24 14:26:11'),('448d3ecf-c5cf-4e5e-8f0d-14fe18a83bff','refund_management','Refund Management',1,'free','basic','Manage refunds across all platform services','2025-12-24 14:26:10','2025-12-24 14:26:10'),('4a0b6353-e632-4e8d-a272-130c4e573d3c','custom_alerts','Custom Alerts & Notifications',1,'free','premium','Set custom price and volume alerts','2025-12-24 14:26:11','2025-12-24 14:26:11'),('57aa9d2c-d689-447a-9bff-151dfe97f272','exclusive_finfluencer_content','Exclusive Finfluencer Content',1,'free','vip','Access exclusive content from finfluencers','2025-12-24 14:26:11','2025-12-24 14:26:11'),('64346c84-a188-4af1-9c9a-ff2b628ddf10','entity_dashboard','Entity Dashboard',1,'free','basic','Dashboard for platform entities','2025-12-24 14:26:11','2025-12-24 14:26:11'),('6bec880e-63f9-4536-b722-e37576066819','priority_support','Priority Support',1,'free','premium','Get priority customer support','2025-12-24 14:26:11','2025-12-24 14:26:11'),('7239a63c-178a-462d-a73b-c5c515a9a7e6','vip_events_webinars','VIP Events & Webinars',1,'free','vip','Exclusive VIP events and webinars','2025-12-24 14:26:11','2025-12-24 14:26:11'),('72648cd3-284e-4a1e-86a7-b627a2196fd6','vendor_dashboard','Vendor Dashboard',1,'free','basic','Dashboard for all vendors','2025-12-24 14:26:11','2025-12-24 14:26:11'),('79fc34e5-cab9-443f-9d27-0b4dd3b30b86','market_news','Market News',1,'free','basic','Latest market news and stock updates','2025-12-24 14:26:10','2025-12-24 14:26:10'),('a7f7edc5-74d5-408e-b23d-9d120a29efdd','ai_stock_predictions','AI Stock Predictions',1,'free','basic','Purchase \"AI Stock Predictions\"','2025-12-24 14:26:11','2025-12-24 14:26:11'),('b025ef51-904d-4063-81a1-a5422994be72','premium_events','Premium Events',1,'free','premium','Access to premium events','2025-12-24 14:26:11','2025-12-24 14:26:11'),('b1befb40-a2ad-4377-9583-97dfa87cf714','premium_polls','Premium Polls',1,'free','premium','Participate in premium polls','2025-12-24 14:26:11','2025-12-24 14:26:11'),('b9b5bd0e-8b6f-497b-90a8-3c75f85deb94','advisor_subscriptions','Advisor Subscriptions',1,'free','vip','Subscribe to expert advisors','2025-12-24 14:26:11','2025-12-24 14:26:11'),('e5d651ce-9566-41d2-ae96-276382c0ff6d','admin_recommendations','Admin Recommendations',1,'free','vip','Get personalized admin recommendations','2025-12-24 14:26:11','2025-12-24 14:26:11'),('f7a73a5e-a6dc-4870-b568-6defb956f105','dedicated_account_manager','Dedicated Account Manager',1,'free','vip','Personal account manager','2025-12-24 14:26:11','2025-12-24 14:26:11');
/*!40000 ALTER TABLE `feature_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback`
--

DROP TABLE IF EXISTS `feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `content` text,
  `status` varchar(255) DEFAULT NULL,
  `rating` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback`
--

LOCK TABLES `feedback` WRITE;
/*!40000 ALTER TABLE `feedback` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `files`
--

DROP TABLE IF EXISTS `files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `files` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `filename` varchar(255) DEFAULT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `mime_type` varchar(255) DEFAULT NULL,
  `size` int DEFAULT NULL,
  `path` varchar(255) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `entity_type` varchar(255) DEFAULT NULL,
  `entity_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `files`
--

LOCK TABLES `files` WRITE;
/*!40000 ALTER TABLE `files` DISABLE KEYS */;
/*!40000 ALTER TABLE `files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `financial_audit_logs`
--

DROP TABLE IF EXISTS `financial_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `financial_audit_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `admin_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `admin_name` varchar(255) DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `entity_type` varchar(255) DEFAULT NULL,
  `entity_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `details` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `financial_audit_logs`
--

LOCK TABLES `financial_audit_logs` WRITE;
/*!40000 ALTER TABLE `financial_audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `financial_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `finfluencers`
--

DROP TABLE IF EXISTS `finfluencers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finfluencers` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `bio` text,
  `follower_count` int DEFAULT NULL,
  `status` varchar(255) DEFAULT 'pending_approval',
  `is_featured` tinyint(1) DEFAULT NULL,
  `social_links` json DEFAULT NULL,
  `specialization` json DEFAULT NULL,
  `rating` decimal(3,2) DEFAULT NULL,
  `total_subscribers` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `finfluencers`
--

LOCK TABLES `finfluencers` WRITE;
/*!40000 ALTER TABLE `finfluencers` DISABLE KEYS */;
/*!40000 ALTER TABLE `finfluencers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fund_allocations`
--

DROP TABLE IF EXISTS `fund_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fund_allocations` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `fund_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `stock_symbol` varchar(255) DEFAULT NULL,
  `percentage` decimal(5,2) DEFAULT NULL,
  `allocation_type` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fund_allocations`
--

LOCK TABLES `fund_allocations` WRITE;
/*!40000 ALTER TABLE `fund_allocations` DISABLE KEYS */;
/*!40000 ALTER TABLE `fund_allocations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fund_invoices`
--

DROP TABLE IF EXISTS `fund_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fund_invoices` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT 'pending',
  `invoice_number` varchar(255) DEFAULT NULL,
  `due_date` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fund_invoices`
--

LOCK TABLES `fund_invoices` WRITE;
/*!40000 ALTER TABLE `fund_invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `fund_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fund_notifications`
--

DROP TABLE IF EXISTS `fund_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fund_notifications` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `fund_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `message` text,
  `type` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fund_notifications`
--

LOCK TABLES `fund_notifications` WRITE;
/*!40000 ALTER TABLE `fund_notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `fund_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fund_payout_requests`
--

DROP TABLE IF EXISTS `fund_payout_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fund_payout_requests` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT 'pending',
  `payout_method` varchar(255) DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fund_payout_requests`
--

LOCK TABLES `fund_payout_requests` WRITE;
/*!40000 ALTER TABLE `fund_payout_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `fund_payout_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fund_plans`
--

DROP TABLE IF EXISTS `fund_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fund_plans` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `description` text,
  `target_return` decimal(5,2) DEFAULT NULL,
  `risk_level` varchar(255) DEFAULT NULL,
  `min_investment` decimal(15,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fund_plans`
--

LOCK TABLES `fund_plans` WRITE;
/*!40000 ALTER TABLE `fund_plans` DISABLE KEYS */;
/*!40000 ALTER TABLE `fund_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fund_transactions`
--

DROP TABLE IF EXISTS `fund_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fund_transactions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `investor_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `transaction_type` enum('purchase','redemption','transfer','payment') NOT NULL,
  `amount` decimal(20,2) NOT NULL,
  `units` decimal(20,4) DEFAULT NULL,
  `transaction_date` datetime DEFAULT NULL,
  `status` enum('pending','completed','failed','cancelled') DEFAULT 'pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `payment_intent_id` varchar(255) DEFAULT NULL,
  `source` varchar(255) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `fund_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `currency` varchar(255) DEFAULT 'INR',
  `description` text,
  `transaction_id` varchar(255) DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `fund_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fund_transactions`
--

LOCK TABLES `fund_transactions` WRITE;
/*!40000 ALTER TABLE `fund_transactions` DISABLE KEYS */;
INSERT INTO `fund_transactions` VALUES ('0867a51d-23c3-4e03-8993-781385df30a0',NULL,'payment',592.00,NULL,'2025-12-26 07:43:42','pending','2025-12-26 07:43:42','2025-12-26 07:43:42','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','order_RwA62rbC4XIRWF','razorpay','\"{\\\"order_id\\\":\\\"order_RwA62rbC4XIRWF\\\",\\\"plan_id\\\":\\\"33f3b00e-083d-4071-89c0-379d3c14f75d\\\",\\\"coupon_id\\\":null,\\\"cycle\\\":\\\"monthly\\\"}\"',NULL,'INR',NULL,NULL,NULL),('204cc038-f376-4030-b3d6-cb8b1fb294c3',NULL,'payment',499.00,NULL,'2025-12-13 16:41:14','pending','2025-12-13 16:41:14','2025-12-13 16:41:14','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,NULL,NULL,NULL,'INR',NULL,NULL,NULL),('2533c297-f273-4926-b6ca-ef18c515588a',NULL,'payment',592.00,NULL,'2026-01-05 13:52:43','completed','2026-01-05 13:52:43','2026-01-05 13:53:09','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','order_S0Dj3upyyfJrHh','razorpay','\"{\\\"order_id\\\":\\\"order_S0Dj3upyyfJrHh\\\",\\\"plan_id\\\":\\\"33f3b00e-083d-4071-89c0-379d3c14f75d\\\",\\\"coupon_id\\\":null,\\\"cycle\\\":\\\"month\\\",\\\"redirect_url\\\":null}\"',NULL,'INR',NULL,NULL,NULL),('349a3c87-9d2e-46eb-a655-c394318a2672',NULL,'payment',499.00,NULL,'2025-12-13 16:42:28','completed','2025-12-13 16:42:28','2025-12-13 16:42:28','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,NULL,NULL,NULL,'INR',NULL,NULL,NULL),('48b8b16b-1c67-4f00-88cf-a105a2d2c64e',NULL,'payment',499.00,NULL,'2025-12-16 06:14:49','completed','2025-12-16 06:14:49','2025-12-16 06:15:40','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','order_RsBEx0vNSoKC3I','razorpay','\"{\\\"plan_id\\\":\\\"premium_sample\\\",\\\"cycle\\\":\\\"monthly\\\",\\\"type\\\":\\\"subscription\\\",\\\"order_id\\\":\\\"order_RsBEx0vNSoKC3I\\\",\\\"payment_id\\\":\\\"pay_RsBFUENu8uIK0t\\\",\\\"signature\\\":\\\"6a2b64d3d57a2a0e98b81db9326940bcb35b111d9808adeeb4664faa6842f4b0\\\"}\"',NULL,'INR',NULL,NULL,NULL),('48c24df4-0b3f-49fc-a5a7-7f0e936d1980',NULL,'payment',592.00,NULL,'2026-01-07 11:44:35','completed','2026-01-07 11:44:35','2026-01-07 11:44:35','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,'razorpay','{\"cycle\": \"monthly\", \"plan_id\": \"33f3b00e-083d-4071-89c0-379d3c14f75d\", \"order_id\": \"order_S0ybTVDiTSNFW6\"}',NULL,'INR','Subscription payment for plan 33f3b00e-083d-4071-89c0-379d3c14f75d','pay_S0ybfLMDWxKHlr','2026-01-07 11:44:35'),('4de4185b-512d-4f8a-81e6-3e4dee9a0882',NULL,'payment',592.00,NULL,'2025-12-31 14:45:05','pending','2025-12-31 14:45:05','2025-12-31 14:45:05','b8bdd193-9c08-4310-8411-1f950308217c','order_RyFwm5Hqc1lOgN','razorpay','\"{\\\"order_id\\\":\\\"order_RyFwm5Hqc1lOgN\\\",\\\"plan_id\\\":\\\"33f3b00e-083d-4071-89c0-379d3c14f75d\\\",\\\"coupon_id\\\":null,\\\"cycle\\\":\\\"month\\\"}\"',NULL,'INR',NULL,NULL,NULL),('5762f85e-7eea-4edc-a901-a3ecd4b57a3f',NULL,'payment',499.00,NULL,'2025-12-13 16:49:11','pending','2025-12-13 16:49:11','2025-12-13 16:49:11','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,NULL,NULL,NULL,'INR',NULL,NULL,NULL),('60d069a1-7bff-45c9-8329-3228b46d5706',NULL,'payment',999.00,NULL,'2025-12-31 14:36:15','completed','2025-12-31 14:36:15','2025-12-31 14:36:41','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','order_RyFnQtYcZli7HK','razorpay','\"{\\\"order_id\\\":\\\"order_RyFnQtYcZli7HK\\\",\\\"plan_id\\\":\\\"a53f1dc4-ade6-41d0-b11d-c0ba5c673442\\\",\\\"coupon_id\\\":null,\\\"cycle\\\":\\\"month\\\"}\"',NULL,'INR',NULL,NULL,NULL),('6a4ab205-cd84-4fc3-bc28-e98fefbf8cf8',NULL,'payment',0.00,NULL,'2025-12-20 13:43:46','completed','2025-12-20 13:43:46','2025-12-20 13:43:46','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','mock_1766238226655','mock','\"{\\\"plan_id\\\":\\\"basic_sample\\\",\\\"cycle\\\":\\\"monthly\\\",\\\"type\\\":\\\"subscription\\\"}\"',NULL,'INR',NULL,NULL,NULL),('70dc7405-be2b-4346-9c40-a100f3942300',NULL,'payment',592.00,NULL,'2026-01-07 12:43:00','completed','2026-01-07 12:43:00','2026-01-07 12:43:00','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,'razorpay','{\"cycle\": \"monthly\", \"coupon\": \"\", \"plan_id\": \"33f3b00e-083d-4071-89c0-379d3c14f75d\", \"order_id\": \"order_S0zazRqHKm9RUr\"}',NULL,'INR','Subscription payment for plan 33f3b00e-083d-4071-89c0-379d3c14f75d','pay_S0zbKxIFMAuJmn','2026-01-07 12:43:00'),('b6a1c824-64b6-4033-9b6c-651b478626bf',NULL,'payment',592.00,NULL,'2026-01-07 11:43:08','completed','2026-01-07 11:43:08','2026-01-07 11:43:08','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,'razorpay','{\"cycle\": \"monthly\", \"plan_id\": \"33f3b00e-083d-4071-89c0-379d3c14f75d\", \"order_id\": \"order_S0yZrUwCY2s4Jk\"}',NULL,'INR','Subscription payment for plan 33f3b00e-083d-4071-89c0-379d3c14f75d','pay_S0ya6JBRzV596w','2026-01-07 11:43:08'),('b78bb586-de05-45ab-856a-75c0e26632a7',NULL,'payment',999.00,NULL,'2026-01-05 14:32:35','completed','2026-01-05 14:32:35','2026-01-05 14:33:26','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','order_S0EPAJjlOR1OFX','razorpay','\"{\\\"order_id\\\":\\\"order_S0EPAJjlOR1OFX\\\",\\\"plan_id\\\":\\\"a53f1dc4-ade6-41d0-b11d-c0ba5c673442\\\",\\\"coupon_id\\\":null,\\\"cycle\\\":\\\"month\\\",\\\"redirect_url\\\":null}\"',NULL,'INR',NULL,'pay_S0EPqqfbWv1Gz3','2026-01-05 14:33:26'),('b7cdf89e-0975-4813-9d9f-a6bdc45059ce',NULL,'payment',499.00,NULL,'2025-12-13 17:10:08','completed','2025-12-13 17:10:08','2025-12-13 17:11:16','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','order_RrAnoVb9ZDPjtn','razorpay','\"{\\\"plan_id\\\":\\\"premium_sample\\\",\\\"cycle\\\":\\\"monthly\\\",\\\"type\\\":\\\"subscription\\\",\\\"order_id\\\":\\\"order_RrAnoVb9ZDPjtn\\\",\\\"payment_id\\\":\\\"pay_RrAonLa4nfkkAP\\\",\\\"signature\\\":\\\"ae2acc24d10fba4f0a5590861903a327a05257391e17a386df95966c3b9c8638\\\"}\"',NULL,'INR',NULL,NULL,NULL),('b7fdab94-934e-46ce-bed9-8736d898fe91',NULL,'payment',592.00,NULL,'2026-01-07 11:59:09','completed','2026-01-07 11:59:09','2026-01-07 11:59:09','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',NULL,'razorpay','{\"cycle\": \"monthly\", \"plan_id\": \"33f3b00e-083d-4071-89c0-379d3c14f75d\", \"order_id\": \"order_S0yqtv0PS4m7bY\"}',NULL,'INR','Subscription payment for plan 33f3b00e-083d-4071-89c0-379d3c14f75d','pay_S0yr3v9sVF7K7g','2026-01-07 11:59:09'),('baa15c74-61e2-49bc-a682-b651457c64dc',NULL,'payment',5999.00,NULL,'2025-12-26 09:08:24','pending','2025-12-26 09:08:24','2025-12-26 09:08:24','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','order_RwBXWarjow5QOP','razorpay','\"{\\\"order_id\\\":\\\"order_RwBXWarjow5QOP\\\",\\\"plan_id\\\":\\\"33f3b00e-083d-4071-89c0-379d3c14f75d\\\",\\\"coupon_id\\\":null,\\\"cycle\\\":\\\"year\\\"}\"',NULL,'INR',NULL,NULL,NULL),('bcecd3d6-2a8c-447b-bc45-be554aaac384',NULL,'payment',592.00,NULL,'2025-12-31 14:45:27','completed','2025-12-31 14:45:27','2025-12-31 14:46:35','b8bdd193-9c08-4310-8411-1f950308217c','order_RyFxAJ4Hvr5NGB','razorpay','\"{\\\"order_id\\\":\\\"order_RyFxAJ4Hvr5NGB\\\",\\\"plan_id\\\":\\\"33f3b00e-083d-4071-89c0-379d3c14f75d\\\",\\\"coupon_id\\\":null,\\\"cycle\\\":\\\"month\\\"}\"',NULL,'INR',NULL,NULL,NULL),('bec17cd4-6f76-4f70-a9f3-2725ea8bf7d8',NULL,'payment',592.00,NULL,'2025-12-26 07:44:43','completed','2025-12-26 07:44:43','2025-12-26 07:45:14','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','order_RwA773iyiPths7','razorpay','\"{\\\"order_id\\\":\\\"order_RwA773iyiPths7\\\",\\\"plan_id\\\":\\\"33f3b00e-083d-4071-89c0-379d3c14f75d\\\",\\\"coupon_id\\\":null,\\\"cycle\\\":\\\"monthly\\\"}\"',NULL,'INR',NULL,NULL,NULL),('c5f98467-f26e-463b-a0f1-4461ee8cc369',NULL,'payment',499.00,NULL,'2025-12-13 16:51:57','completed','2025-12-13 16:51:57','2025-12-13 16:52:43','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','order_RrAUcMDJ2CCNuR','razorpay','\"{\\\"plan_id\\\":\\\"premium_sample\\\",\\\"cycle\\\":\\\"monthly\\\",\\\"type\\\":\\\"subscription\\\",\\\"order_id\\\":\\\"order_RrAUcMDJ2CCNuR\\\",\\\"payment_id\\\":\\\"pay_RrAVCTkidVcEVi\\\",\\\"signature\\\":\\\"ecf1685ba9d87f1802643a4d076cea219df11fcbc6ce97dd78c2f0391876a6a6\\\"}\"',NULL,'INR',NULL,NULL,NULL),('eb451fce-c028-49ce-a179-56afae2aace5',NULL,'payment',592.00,NULL,'2025-12-26 07:43:27','pending','2025-12-26 07:43:27','2025-12-26 07:43:27','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','order_RwA5mtbNZLSCwS','razorpay','\"{\\\"order_id\\\":\\\"order_RwA5mtbNZLSCwS\\\",\\\"plan_id\\\":\\\"33f3b00e-083d-4071-89c0-379d3c14f75d\\\",\\\"coupon_id\\\":null,\\\"cycle\\\":\\\"monthly\\\"}\"',NULL,'INR',NULL,NULL,NULL),('f13a4f5d-363c-4273-924e-4e44b1460a89',NULL,'payment',499.00,NULL,'2025-12-24 12:24:13','pending','2025-12-24 12:24:13','2025-12-24 12:24:13','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','order_RvRo7KKlH7x3GF','razorpay','\"{\\\"plan_id\\\":\\\"premium_sample\\\",\\\"cycle\\\":\\\"monthly\\\",\\\"type\\\":\\\"subscription\\\",\\\"order_id\\\":\\\"order_RvRo7KKlH7x3GF\\\"}\"',NULL,'INR',NULL,NULL,NULL),('fcc37772-60cd-470c-add5-114564b7d45b',NULL,'payment',592.00,NULL,'2025-12-26 07:41:27','pending','2025-12-26 07:41:27','2025-12-26 07:41:27','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','order_RwA3fRbI1BTTmV','razorpay','\"{\\\"order_id\\\":\\\"order_RwA3fRbI1BTTmV\\\",\\\"plan_id\\\":\\\"33f3b00e-083d-4071-89c0-379d3c14f75d\\\",\\\"coupon_id\\\":null,\\\"cycle\\\":\\\"monthly\\\"}\"',NULL,'INR',NULL,NULL,NULL);
/*!40000 ALTER TABLE `fund_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fund_wallets`
--

DROP TABLE IF EXISTS `fund_wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fund_wallets` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `balance` decimal(15,2) DEFAULT NULL,
  `currency` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fund_wallets`
--

LOCK TABLES `fund_wallets` WRITE;
/*!40000 ALTER TABLE `fund_wallets` DISABLE KEYS */;
/*!40000 ALTER TABLE `fund_wallets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fund_withdrawal_requests`
--

DROP TABLE IF EXISTS `fund_withdrawal_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fund_withdrawal_requests` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `wallet_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT 'pending',
  `bank_details` json DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fund_withdrawal_requests`
--

LOCK TABLES `fund_withdrawal_requests` WRITE;
/*!40000 ALTER TABLE `fund_withdrawal_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `fund_withdrawal_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `income`
--

DROP TABLE IF EXISTS `income`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `income` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `source` varchar(255) DEFAULT NULL,
  `description` text,
  `amount` decimal(15,2) DEFAULT NULL,
  `currency` varchar(255) DEFAULT 'INR',
  `status` varchar(255) DEFAULT 'recorded',
  `income_date` datetime DEFAULT NULL,
  `recorded_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `income`
--

LOCK TABLES `income` WRITE;
/*!40000 ALTER TABLE `income` DISABLE KEYS */;
/*!40000 ALTER TABLE `income` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `influencer_posts`
--

DROP TABLE IF EXISTS `influencer_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `influencer_posts` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `influencer_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `content` text,
  `media_urls` json DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `likes_count` int DEFAULT NULL,
  `comments_count` int DEFAULT NULL,
  `shares_count` int DEFAULT NULL,
  `is_pinned` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `influencer_id` (`influencer_id`),
  CONSTRAINT `influencer_posts_ibfk_1` FOREIGN KEY (`influencer_id`) REFERENCES `finfluencers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `influencer_posts`
--

LOCK TABLES `influencer_posts` WRITE;
/*!40000 ALTER TABLE `influencer_posts` DISABLE KEYS */;
/*!40000 ALTER TABLE `influencer_posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `investment_allocations`
--

DROP TABLE IF EXISTS `investment_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `investment_allocations` (
  `id` char(36) NOT NULL,
  `investor_id` char(36) DEFAULT NULL,
  `fund_plan_id` char(36) DEFAULT NULL,
  `investment_request_id` char(36) DEFAULT NULL,
  `allocation_amount` decimal(15,2) DEFAULT NULL,
  `allocation_date` datetime DEFAULT NULL,
  `nav_at_allocation` decimal(15,4) DEFAULT NULL,
  `units_allocated` decimal(15,4) DEFAULT NULL,
  `current_value` decimal(15,2) DEFAULT NULL,
  `profit_earned` decimal(15,2) DEFAULT '0.00',
  `days_held` int DEFAULT '0',
  `status` varchar(255) DEFAULT 'active',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `investment_allocations_investor_id_idx` (`investor_id`),
  KEY `investment_allocations_fund_plan_id_idx` (`fund_plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `investment_allocations`
--

LOCK TABLES `investment_allocations` WRITE;
/*!40000 ALTER TABLE `investment_allocations` DISABLE KEYS */;
/*!40000 ALTER TABLE `investment_allocations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `investment_requests`
--

DROP TABLE IF EXISTS `investment_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `investment_requests` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `investment_type` varchar(255) DEFAULT NULL,
  `notes` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `investment_requests`
--

LOCK TABLES `investment_requests` WRITE;
/*!40000 ALTER TABLE `investment_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `investment_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `investor_requests`
--

DROP TABLE IF EXISTS `investor_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `investor_requests` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `investor_type` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `documents` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `investor_requests`
--

LOCK TABLES `investor_requests` WRITE;
/*!40000 ALTER TABLE `investor_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `investor_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `investors`
--

DROP TABLE IF EXISTS `investors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `investors` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `investment_amount` decimal(15,2) DEFAULT NULL,
  `risk_profile` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `investors`
--

LOCK TABLES `investors` WRITE;
/*!40000 ALTER TABLE `investors` DISABLE KEYS */;
/*!40000 ALTER TABLE `investors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `invoice_number` varchar(255) DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `subscription_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `plan_name` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `discount` decimal(10,2) DEFAULT '0.00',
  `tax` decimal(10,2) DEFAULT '0.00',
  `total_amount` decimal(10,2) DEFAULT NULL,
  `currency` varchar(255) DEFAULT 'INR',
  `status` varchar(255) DEFAULT 'pending',
  `payment_method` varchar(255) DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `billing_period_start` datetime DEFAULT NULL,
  `billing_period_end` datetime DEFAULT NULL,
  `issued_date` datetime DEFAULT NULL,
  `due_date` datetime DEFAULT NULL,
  `paid_date` datetime DEFAULT NULL,
  `pdf_url` varchar(255) DEFAULT NULL,
  `email_sent` tinyint(1) DEFAULT '0',
  `notes` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `subscription_id` (`subscription_id`),
  CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
INSERT INTO `invoices` VALUES ('c52a7d09-4fce-4a2f-b340-37abb33f072b','INV-20260107-0001','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','7fe57bc1-4784-4cdc-a648-5ad7ab533b96','Premium',592.00,0.00,0.00,592.00,'INR','paid','razorpay','pay_S0zbKxIFMAuJmn','2026-01-07 12:43:00','2026-02-06 12:43:00','2026-01-07 12:43:00',NULL,'2026-01-07 12:43:00','/uploads/invoices/INV-20260107-0001.pdf',0,'Subscription: Premium - monthly','2026-01-07 12:43:00','2026-01-07 12:43:00');
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localizations`
--

DROP TABLE IF EXISTS `localizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `localizations` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `key` varchar(255) DEFAULT NULL,
  `language` varchar(255) DEFAULT NULL,
  `value` text,
  `category` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localizations`
--

LOCK TABLES `localizations` WRITE;
/*!40000 ALTER TABLE `localizations` DISABLE KEYS */;
/*!40000 ALTER TABLE `localizations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meetings`
--

DROP TABLE IF EXISTS `meetings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meetings` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chat_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `stock_symbol` varchar(255) DEFAULT NULL,
  `meeting_url` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `participant_count` int DEFAULT NULL,
  `max_participants` int DEFAULT NULL,
  `host_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `recording_url` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `chat_room_id` (`chat_room_id`),
  CONSTRAINT `meetings_ibfk_1` FOREIGN KEY (`chat_room_id`) REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meetings`
--

LOCK TABLES `meetings` WRITE;
/*!40000 ALTER TABLE `meetings` DISABLE KEYS */;
INSERT INTO `meetings` VALUES ('484474f3-c8d5-4181-a5a8-73de44cec58e','7da343c5-473a-4373-aba4-83c9ce3be24b','GENERAL','https://meet.google.com/gi2dfl','ended','2025-12-14 02:33:32','2025-12-14 02:33:33',0,50,NULL,NULL,NULL,NULL,'2025-12-14 02:33:32','2025-12-14 02:33:32'),('985f2c29-c451-4ae7-944a-51ddf38c67b2','7da343c5-473a-4373-aba4-83c9ce3be24b','GENERAL','http://localhost:5173/ChatRooms','ended','2025-12-16 14:25:22','2025-12-16 14:26:00',0,50,NULL,NULL,NULL,NULL,'2025-12-16 14:25:22','2025-12-16 14:25:22'),('a755d47f-329a-4778-a44d-d8d5b5c5ab31','7da343c5-473a-4373-aba4-83c9ce3be24b','GENERAL','https://meet.google.com/zqxhds','ended','2025-12-10 07:30:28','2025-12-10 07:30:36',0,50,NULL,NULL,NULL,NULL,'2025-12-10 07:30:28','2025-12-10 07:30:28'),('ab0a29f7-334d-4dc9-b22e-d43738ca90bb','f8166250-4f89-403d-88a5-87e50a9015b6','TCS','http://localhost:5173/ChatRooms','ended','2025-12-17 11:11:00','2025-12-17 11:11:18',0,50,NULL,NULL,NULL,NULL,'2025-12-17 11:11:00','2025-12-17 11:11:00'),('abc7bf47-450a-4c76-a5f9-afe3bf6946a1','7da343c5-473a-4373-aba4-83c9ce3be24b','GENERAL','https://meet.google.com/exz53y','ended','2025-12-14 02:28:58','2025-12-14 02:29:57',0,50,NULL,NULL,NULL,NULL,'2025-12-14 02:28:58','2025-12-14 02:28:58'),('c41b863c-0536-4f6c-a790-f0ab6b860f43','7da343c5-473a-4373-aba4-83c9ce3be24b','GENERAL','https://meet.google.com/lva0ch','ended','2025-12-14 03:40:51','2025-12-14 04:28:30',0,50,NULL,NULL,NULL,NULL,'2025-12-14 03:40:51','2025-12-14 03:40:51');
/*!40000 ALTER TABLE `meetings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_reactions`
--

DROP TABLE IF EXISTS `message_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_reactions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `message_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `emoji` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `message_id` (`message_id`),
  CONSTRAINT `message_reactions_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_reactions`
--

LOCK TABLES `message_reactions` WRITE;
/*!40000 ALTER TABLE `message_reactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `message_reactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_read_receipts`
--

DROP TABLE IF EXISTS `message_read_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_read_receipts` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `message_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `message_id` (`message_id`),
  CONSTRAINT `message_read_receipts_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_read_receipts`
--

LOCK TABLES `message_read_receipts` WRITE;
/*!40000 ALTER TABLE `message_read_receipts` DISABLE KEYS */;
INSERT INTO `message_read_receipts` VALUES ('00101fcc-faf0-4773-9c97-1797d97802d8','0d91552c-f5a8-4238-b85d-726a88291999','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:02:27','2025-12-17 02:02:27','2025-12-17 02:02:27'),('003ddf91-b30e-493a-acd6-ee8512008f60','598851e2-f6ed-4f7d-963f-b497fe5c5979','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:09:17','2025-12-17 11:09:17','2025-12-17 11:09:17'),('004bffe8-4bfb-46ae-8560-f8f8d8752e50','7760e63a-19c7-4497-830c-1193765db760','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:11:55','2025-12-16 14:11:55','2025-12-16 14:11:55'),('00516488-5b23-46de-bdd6-3d5182a6f7b8','37ed0181-94c1-40cf-88fe-395416f7dbef','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:01:35','2025-12-17 07:01:35','2025-12-17 07:01:35'),('005eb859-666c-422a-945c-086596b946c8','43c1fdb3-81aa-4b70-99f9-e294019aa8f9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:20:32','2025-12-16 14:20:32','2025-12-16 14:20:32'),('00a4ae16-98df-4576-84e9-bbb0b1d63c02','121a686c-d1fa-4bdc-b8d3-f8e63ab9d1b3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:59:12','2025-12-17 07:59:12','2025-12-17 07:59:12'),('012bfd46-51fa-4612-a4fb-8511b5b0fdc1','004aa27f-0a68-437f-b1b7-2954b7f63441','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:39:53','2025-12-31 14:39:53','2025-12-31 14:39:53'),('015f1c5f-335f-492a-9b9c-dfc94a52d193','3c1f89e3-4a75-4f2d-a2a5-8540b611315a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:05:02','2025-12-17 07:05:02','2025-12-17 07:05:02'),('01b16f5e-89cd-45bc-aeb2-dd6374eb905b','c1e8d6bb-a477-419a-a862-501ecd54353e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:16:36','2025-12-16 12:16:36','2025-12-16 12:16:36'),('01d3c26c-19e6-4f11-ba43-c847401ece04','fd524242-29dd-446a-8a1d-668a985304f7','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:26:34','2025-12-30 17:26:34','2025-12-30 17:26:34'),('01dc83f7-5aa6-47cd-bfaf-5b6d83e18f2e','976b0b1d-6fc2-43f3-98f9-8c52316712f9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:26:33','2025-12-30 17:26:33','2025-12-30 17:26:33'),('020717a9-a4d1-4c52-a311-2f3e81ddd508','bee5e1e7-fbff-4c36-8e36-9bafb2181d09','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:51:01','2025-12-16 13:51:01','2025-12-16 13:51:01'),('023246d7-d265-460e-8362-c07b606dbd49','be063f9c-6e46-4344-b40c-1bd259de0ba3','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:26:01','2025-12-16 14:26:01','2025-12-16 14:26:01'),('024ad48e-2924-49b8-9ab3-323bf2c5b184','6f0c06e4-eb39-400c-85e2-65d0f106a0a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:03:30','2025-12-17 02:03:30','2025-12-17 02:03:30'),('02dbfafa-b36f-40b9-bff2-055ecc9b1186','7bc35a22-67df-42ad-81cb-a67d2d5192ca','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-24 12:25:28','2025-12-24 12:25:28','2025-12-24 12:25:28'),('02e12f22-e871-4b06-8015-5b3a40b3e1dd','23513fcc-213f-4348-8ffa-87953658ef79','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:47:28','2025-12-16 14:47:28','2025-12-16 14:47:28'),('0355e247-ed74-4769-ad1e-462b9509eb53','9bfb1d17-5cd1-4b55-b223-a694f8041482','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:23','2025-12-31 05:54:23','2025-12-31 05:54:23'),('036ee445-ca4c-43af-87e9-4785345e1c19','59ffc799-d8f2-4dc1-8d1b-a34087fc784c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:03:45','2025-12-31 04:03:45','2025-12-31 04:03:45'),('03f7dc84-cd35-497a-afa7-6ba499836fb6','61036518-5928-473c-b46e-c2e2d68caecd','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:47:19','2025-12-16 14:47:19','2025-12-16 14:47:19'),('04078416-f4bc-4638-ae78-86822c1387a6','d9ea34ef-3acd-4d10-b537-397f159521f4','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:50:14','2025-12-16 13:50:14','2025-12-16 13:50:14'),('04df00c6-f1f0-4178-b402-71ae5d5426db','6f19d64b-91e6-47d1-a855-c754f415d69d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2026-01-01 15:44:51','2026-01-01 15:44:51','2026-01-01 15:44:51'),('04e81d7a-5df9-4e57-a1f6-21a88c5693ad','3c03aca5-f6f0-43d3-bd60-27640d1be658','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:58:56','2025-12-17 07:58:56','2025-12-17 07:58:56'),('04f33e96-5a7c-4c3f-a68e-677033cd8528','32f38528-d0dd-45fb-b8b1-7864d7e37af4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:28:08','2025-12-16 14:28:08','2025-12-16 14:28:08'),('0509fe5c-ad4a-45b7-9f99-f0d9b4b793b2','ba0cae45-1b05-4f13-894b-b0d5e48cb0a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:12:15','2025-12-17 11:12:15','2025-12-17 11:12:15'),('0592a6c3-eedf-48e6-a49b-476b1e6a464e','7d206b8e-8957-4b6d-85ac-ce23da9e29f9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:25:42','2025-12-31 06:25:42','2025-12-31 06:25:42'),('0610a705-6500-4bb5-bc6a-611bb2472bbe','f9823aa6-c4f6-4755-a788-ed5bad9f36c2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:33:45','2025-12-20 13:33:45','2025-12-20 13:33:45'),('078a1378-0d86-4ffb-8603-a43160327d6e','814c21fa-95f6-4541-97f9-f0c83040c25f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:20:08','2025-12-16 12:20:08','2025-12-16 12:20:08'),('07aa037a-e6b8-45d3-b6d5-85ed96d6e3af','e3661cdf-c684-4094-b75b-eaf3cf26850f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:47:50','2025-12-16 14:47:51','2025-12-16 14:47:51'),('07cf6a5c-1ed3-43a1-8535-fb0062a5de70','7ac5412b-7151-4086-a8da-a6e4a2c43a85','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:32:13','2025-12-20 13:32:13','2025-12-20 13:32:13'),('07f3c58b-cd00-45ab-bf2f-f8e51f07e464','233f9396-6dde-4e8a-9ce0-a6c40eda68f7','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:37:23','2025-12-17 07:37:23','2025-12-17 07:37:23'),('0868ef64-f5a1-4631-bf20-8f01b5b08192','9f722b95-009a-4876-9e9e-6522eef25412','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:26:14','2025-12-31 08:26:14','2025-12-31 08:26:14'),('086fd1d7-15a4-46e7-b05f-1beb878e1ca2','e63da05c-f31e-4983-b429-ac4bfa0f3e2d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:57:33','2025-12-31 04:57:33','2025-12-31 04:57:33'),('087974c0-54e0-4462-9498-1aa6f1bca7df','2f304594-e93a-4dec-bbf8-731af26f9c6a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:09:28','2025-12-31 04:09:28','2025-12-31 04:09:28'),('0886e91a-8952-42ed-8f81-3321fde3f15c','9f722b95-009a-4876-9e9e-6522eef25412','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 14:31:36','2025-12-31 14:31:36','2025-12-31 14:31:36'),('0891f0e4-3660-418f-86a9-63497f2c0f3a','5161411d-3f79-4942-8c29-969df6afafda','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:16:10','2025-12-16 14:16:10','2025-12-16 14:16:10'),('08ad292d-a51f-4cf4-ab3e-a467b54c7f68','c65c4e20-da37-4736-ad59-4341c800f594','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:03:31','2025-12-17 02:03:31','2025-12-17 02:03:31'),('094a3c56-ebd1-42af-8fc4-5bac68671723','ab58e831-9b7c-4943-826e-26efea420ac1','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-30 12:58:52','2025-12-30 12:58:52','2025-12-30 12:58:52'),('097b3569-48cf-47c0-bd9e-388757326813','9a724947-d218-4acf-b33a-62bee94447a4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:17:58','2025-12-16 12:17:58','2025-12-16 12:17:58'),('099b95b6-18e2-4b24-83ce-bfda49697cd9','c3fb6f4b-a83c-4335-b229-d8c9ab5ee308','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:50:37','2025-12-16 13:50:37','2025-12-16 13:50:37'),('0a0bcd91-9654-4358-bb2a-475479215ea4','94367287-7ed5-44a4-8602-d9c6732ce501','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:18:38','2025-12-16 12:18:39','2025-12-16 12:18:39'),('0a4c21a8-f90c-4f74-bbde-866b12b4eafe','fc005df3-29e6-484d-8fbf-bcacefccd0a1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:08:57','2025-12-17 11:08:57','2025-12-17 11:08:57'),('0a58079d-e58c-4274-a0cd-899d51d7fad1','7e14ae9f-3b68-4c34-b26f-bd65853ced75','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 09:09:01','2025-12-26 09:09:01','2025-12-26 09:09:01'),('0a641039-3dc6-43d0-ab08-74c8c528015c','f9a37238-dbbd-454c-8f77-e9485858cdf2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:00:39','2025-12-16 02:00:39','2025-12-16 02:00:39'),('0a72ace7-3a09-46a3-a4af-264edf4ada89','55995966-f767-4b30-89e0-8def248bd9f4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:32:19','2025-12-20 13:32:19','2025-12-20 13:32:19'),('0a8a5d59-ef81-400e-9f1b-8670630ec10f','865c5585-e2ed-45e1-bba3-53951a71a73e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:31:56','2025-12-16 13:31:56','2025-12-16 13:31:56'),('0ac42028-ff54-4246-b365-0066423c7662','c73bdcff-5fb0-4d23-9f82-62bdce1e15fc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:20:42','2025-12-16 13:20:42','2025-12-16 13:20:42'),('0b02a40a-d393-4c90-a70d-ef99278ba8d2','1f120ccc-77ea-4c52-a53f-6904ba36ae6a','eceba0d7-3225-492d-a1e9-04f609ff9571','2025-12-30 12:13:39','2025-12-30 12:13:39','2025-12-30 12:13:39'),('0b070abc-b8f1-4eb4-a2c7-affe79c1d52a','2a9a88d7-5c48-425f-8d64-ba4ff979fb5e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:27','2025-12-17 07:38:27','2025-12-17 07:38:27'),('0b28c1bb-1314-45c5-9940-e590ef807a7c','210dd46c-881e-483b-9dba-90d1259b0f2f','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:38:49','2025-12-16 14:38:49','2025-12-16 14:38:49'),('0bbc505a-ed89-4ec1-9841-6ad2010b9dff','1f120ccc-77ea-4c52-a53f-6904ba36ae6a','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-30 12:24:50','2025-12-30 12:24:50','2025-12-30 12:24:50'),('0c324c19-998c-4784-989f-293dcbe799e5','1b7e6107-52a3-4d76-be13-56079924159b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-14 14:48:54','2025-12-14 14:48:54','2025-12-14 14:48:54'),('0c3fbf6b-0cd9-42f6-b5e5-fd3c2fc9f7d7','0d636ec6-d28f-4a1e-924e-1c8e03ed572b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:09:29','2025-12-31 04:09:29','2025-12-31 04:09:29'),('0c5f9467-d9db-414d-85a9-fb231d505e7e','18d824f1-ac1d-4bfe-899a-609fb75b1e3f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:30:36','2025-12-17 07:30:36','2025-12-17 07:30:36'),('0c74d463-3bb9-4337-b4c0-3f78a89852bf','fcb74f61-e96a-47ef-ab8e-d2f4fbc2a99f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:37:43','2025-12-17 07:37:43','2025-12-17 07:37:43'),('0cc8248e-f18a-4e2e-8668-574a47a243e9','e0a932e9-d1a5-4a70-8ded-b0215ca6b783','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:41:38','2025-12-16 14:41:38','2025-12-16 14:41:38'),('0cdd631c-254e-45e3-8f60-03215fcaa846','7bc35a22-67df-42ad-81cb-a67d2d5192ca','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 07:46:38','2025-12-26 07:46:38','2025-12-26 07:46:38'),('0d849294-bb5c-4846-b6a8-d6dac02961df','edb9b7ff-fae2-4986-ad56-71cdca019789','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:03:58','2025-12-17 04:03:58','2025-12-17 04:03:58'),('0da5ae6b-6bef-48dc-a8ec-5e8de805cca6','e63da05c-f31e-4983-b429-ac4bfa0f3e2d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:53:54','2025-12-31 04:53:54','2025-12-31 04:53:54'),('0dc8cd9d-8ebf-4c97-b96b-b0517f7ea5df','3e011570-22eb-4d5c-95d2-7cf5d2e61322','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:16:25','2025-12-16 02:16:25','2025-12-16 02:16:25'),('0e163a8b-7888-4f30-b03e-7c4f92f902ef','9a29c581-7610-40fc-ac63-7c4a9ebb6571','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 03:56:17','2025-12-31 03:56:17','2025-12-31 03:56:17'),('0e846e25-9b00-4c4d-a2f0-3ae778285543','756b87df-092b-4382-adde-bd10ff1339d2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:22:13','2025-12-16 12:22:13','2025-12-16 12:22:13'),('0e8b8384-e1aa-40bf-b2aa-eca4298de32a','67d3807d-1598-4256-8b27-d0f3e217c21d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:03:59','2025-12-17 04:03:59','2025-12-17 04:03:59'),('0e931676-7f6f-4518-bd00-2f654af70088','5effaeeb-989e-4476-b07c-f5e8dbd9427d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:59','2025-12-17 02:01:59','2025-12-17 02:01:59'),('0ec40ee0-a197-4534-9240-65a716f56535','da0d750f-0c2b-47bc-9f56-6d4e8b1bc397','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:35:38','2025-12-20 13:35:38','2025-12-20 13:35:38'),('0f1959e2-f8e7-4b1b-9f6d-7b9375fb2012','67d3807d-1598-4256-8b27-d0f3e217c21d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:03:18','2025-12-17 06:03:18','2025-12-17 06:03:18'),('0f82e2ee-a6b6-4051-8117-62c64e0ce18a','299f1fb6-49ca-4559-89af-6c2b9fe04ddf','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:33:03','2025-12-20 13:33:03','2025-12-20 13:33:03'),('0fcd44b3-e585-4809-84ea-6dff05ea846c','0c1179b7-0a43-4c5f-8b2a-16d5b8f1f82c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:30:04','2025-12-17 07:30:04','2025-12-17 07:30:04'),('1052e206-62bc-4db0-b683-e3fd46d30271','89ca8212-4feb-4c70-8f6e-90f15b58136e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:46:29','2025-12-16 14:46:29','2025-12-16 14:46:29'),('10877e06-2633-4005-8356-50450fb17298','71d9dfcf-ff61-4aba-9244-a442e23b5c8d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:58:55','2025-12-17 07:58:55','2025-12-17 07:58:55'),('10b34d55-2273-4b27-beca-bdd5da5c5d55','a5acc285-0c3a-4231-a92d-567bd70c98d1','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-16 12:59:53','2026-09-16 12:59:53','2026-09-16 12:59:53'),('10c25608-999c-4c1d-973f-82537e14a51c','4436aad2-6514-4419-a2e8-0b2190d001cd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:10:27','2025-12-16 13:10:27','2025-12-16 13:10:27'),('10ec45f7-e7da-4207-82f6-475a921e3e04','5161411d-3f79-4942-8c29-969df6afafda','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:16:09','2025-12-16 14:16:09','2025-12-16 14:16:09'),('1156b54b-ee87-4a6d-baa8-3d13ac1b3184','ebc238dd-21a4-4ddd-9a6a-7038dae6cebf','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:46','2025-12-17 07:36:46','2025-12-17 07:36:46'),('116e9ca4-bf16-444f-8407-ea7311c09a1e','79ddefb5-a30d-4118-8bd5-6cf51371fb5c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:40','2025-12-31 05:54:40','2025-12-31 05:54:40'),('11945b96-e0e3-4cd7-b0bf-4a8c5f52fd86','dbcd1db3-f501-462e-82ce-0c2196e911b4','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:17:00','2025-12-16 14:17:00','2025-12-16 14:17:00'),('11d18610-a0de-4ec0-b4ad-d54d87f3792a','ebc238dd-21a4-4ddd-9a6a-7038dae6cebf','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:48:18','2025-12-16 14:48:18','2025-12-16 14:48:18'),('12286e56-0162-43e5-9622-51d5b6627f7d','7e14ae9f-3b68-4c34-b26f-bd65853ced75','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 09:09:01','2025-12-26 09:09:01','2025-12-26 09:09:01'),('123d8bd5-5532-4435-81f5-ef5aebdb8502','eaaeac77-3638-44f3-a5ef-07477cbab71f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:35:32','2025-12-16 13:35:32','2025-12-16 13:35:32'),('125c5e77-fe5d-45c9-848a-4780a6998991','a61345d4-cf93-4315-b576-a077cd21e346','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:02:40','2025-12-17 02:02:40','2025-12-17 02:02:40'),('12bf18c0-e1f9-4632-8719-dbbf0ad309d4','23513fcc-213f-4348-8ffa-87953658ef79','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:48:17','2025-12-16 14:48:17','2025-12-16 14:48:17'),('13813c68-41a4-4043-9491-3832ca390ec0','43c1fdb3-81aa-4b70-99f9-e294019aa8f9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:20:32','2025-12-16 14:20:32','2025-12-16 14:20:32'),('13b52fed-d27b-4708-98b3-a13a46a8a8fc','76238fa3-04cd-45cf-a478-1ae9d6b6827c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:30:46','2025-12-16 14:30:46','2025-12-16 14:30:46'),('13b565ab-b177-4c49-a7af-da8df1be3775','5e436bdc-5c0d-4708-9461-8f3e3bd18ed4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-15 17:09:00','2025-12-15 17:09:00','2025-12-15 17:09:00'),('13dc0e95-4d8f-40d1-8280-becc7daf4d3f','073a6c81-b99a-447c-876c-27acaeed85d9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:35:44','2025-12-16 13:35:44','2025-12-16 13:35:44'),('13df135c-238c-4e69-b87c-f5c1daf63a95','e4e1b7f4-1aaf-4ea0-93c5-94b7992a24e9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:36:29','2025-12-16 14:36:29','2025-12-16 14:36:29'),('1416e07a-e34c-41e4-9f60-2de1ac622d74','a5acc285-0c3a-4231-a92d-567bd70c98d1','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-05 07:40:25','2026-09-05 07:40:25','2026-09-05 07:40:25'),('144439db-5f63-4467-8a03-a48c3084069b','34a7cb1c-73fa-4894-a0dd-e8167f8ed9dc','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:16:01','2025-12-16 14:16:01','2025-12-16 14:16:01'),('144f7058-68f5-4cc2-84fc-ad8e4c574d03','0d636ec6-d28f-4a1e-924e-1c8e03ed572b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:35:48','2025-12-31 04:35:48','2025-12-31 04:35:48'),('145d7aa5-5c3f-4795-9399-d113a104f3e9','63f46750-8e0a-4073-a22d-fc2c47aede29','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:27','2025-12-31 02:12:27','2025-12-31 02:12:27'),('14caeddb-8218-49d4-a66b-332b7efd94c9','831b5005-fcba-44bc-b089-6bb611fa9fe5','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:41:01','2025-12-31 14:41:01','2025-12-31 14:41:01'),('15189c1a-33c5-4ef8-8e8d-e797aa9b1f13','27e5204a-9daa-4528-ba63-ac69b5d67936','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-16 13:01:39','2026-09-16 13:01:38','2026-09-16 13:01:38'),('156bee8e-1410-4a56-831b-3e87b842b9f9','db1b727e-75ef-4bbd-9417-64d13fb993f8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:05:26','2025-12-31 08:05:26','2025-12-31 08:05:26'),('157af760-a18e-4375-8d8a-36fc0ce3246c','121a686c-d1fa-4bdc-b8d3-f8e63ab9d1b3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:59:22','2025-12-17 07:59:22','2025-12-17 07:59:22'),('15a4ca3b-0083-4d40-9dc5-ff87a254dcbd','814c21fa-95f6-4541-97f9-f0c83040c25f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:19:57','2025-12-16 12:19:57','2025-12-16 12:19:57'),('15da53ee-4f06-4742-9e32-e86cc8a2b148','db8c44b2-a59a-44c0-bba2-9313990467aa','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:37:09','2025-12-16 13:37:09','2025-12-16 13:37:09'),('16192c68-3710-497f-b5c2-c94a555fe1c4','1b7e6107-52a3-4d76-be13-56079924159b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-14 14:42:36','2025-12-14 14:42:36','2025-12-14 14:42:36'),('1663fdc2-b4ff-4712-97e6-708a9de3ab22','6019fce4-f9cc-44d8-a97e-db9f1419513a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:49:24','2025-12-31 05:49:24','2025-12-31 05:49:24'),('1695cc5f-f52c-4689-bd16-b38edd92d501','30078510-8c6c-4d8e-955d-c0e53404d921','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 04:59:02','2025-12-16 04:59:02','2025-12-16 04:59:02'),('16d697c6-1436-4ec3-a859-d1e5d1e997d2','e472fb86-65c1-489b-9f70-44517850a7a5','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:31:22','2025-12-16 14:31:22','2025-12-16 14:31:22'),('174e7dd7-4709-4d0a-8628-1b3ab6724b09','63f46750-8e0a-4073-a22d-fc2c47aede29','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:27','2025-12-31 02:12:27','2025-12-31 02:12:27'),('1751b9c9-8eb9-4820-8668-18e11c20086b','8181a722-9702-41ba-abad-6ad71dd006ba','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:06:18','2025-12-17 02:06:18','2025-12-17 02:06:18'),('177ba343-2715-49ef-a3d0-9eb5a28152f4','269a9a84-287b-4ca4-8d1c-93241fd2d655','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:38:12','2025-12-16 13:38:12','2025-12-16 13:38:12'),('17c06bef-4fc5-4cad-bf96-0860a6357c9f','413b6761-224b-4386-9fdd-f2bbe92514b0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:04:19','2025-12-17 06:04:19','2025-12-17 06:04:19'),('18143d9d-ef4a-48a7-9e82-9a7d104c64a2','6940025c-bd03-43c7-8fbf-6e0cfc46876d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:25:28','2025-12-31 06:25:28','2025-12-31 06:25:28'),('182016bc-9171-4e4d-b085-cf64eefa26f9','60c55544-b0ab-4255-b501-af6965a0aa27','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:25:22','2025-12-16 14:25:23','2025-12-16 14:25:23'),('1826a1ea-a763-4c08-8bc2-21a68e4b378a','86383844-861c-4e7b-821d-29fe64e22b89','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:16:25','2025-12-16 14:16:25','2025-12-16 14:16:25'),('1898a3dd-86aa-4315-8b14-24a261eb901c','f59c149c-920e-4fe2-a549-207b2cedac47','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:21:26','2025-12-16 14:21:26','2025-12-16 14:21:26'),('18a098b6-31fb-4aa2-aeb1-798893bb98a2','6a39ead8-1696-418a-82d1-1f78cee4aa5b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:37:04','2025-12-16 13:37:04','2025-12-16 13:37:04'),('18aa5e66-5668-49b9-bef0-6aecf6b40d41','d3999c52-0983-45aa-89ba-5e9b1c5fb17c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:11:00','2025-12-17 11:11:00','2025-12-17 11:11:00'),('18e39ee8-4abb-4cb5-b1bf-905533d035d4','4436aad2-6514-4419-a2e8-0b2190d001cd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:07:16','2025-12-16 13:07:16','2025-12-16 13:07:16'),('1926585c-400f-41f1-ab52-5516762393ac','1ab281c5-0482-4d2b-be65-cd573767b345','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-24 12:25:39','2025-12-24 12:25:39','2025-12-24 12:25:39'),('1939124b-53cf-4190-bfab-028df94e065b','6448382e-2278-4ab8-96bd-67faea3ba680','eceba0d7-3225-492d-a1e9-04f609ff9571','2025-12-30 12:13:38','2025-12-30 12:13:38','2025-12-30 12:13:38'),('1956680b-ae20-4400-90a3-26273dd94924','06feb165-1894-47ee-b224-1b05668e6750','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:34:30','2025-12-17 07:34:30','2025-12-17 07:34:30'),('195f9691-660f-45d7-83bc-738f037088a0','413b6761-224b-4386-9fdd-f2bbe92514b0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:04:19','2025-12-17 06:04:19','2025-12-17 06:04:19'),('1960d92a-a64d-401b-8d3e-4d7a301fa8b4','0c47bbd1-bae2-4218-a7d4-9a0ce64dec67','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:11:46','2025-12-16 12:11:46','2025-12-16 12:11:46'),('19bba61a-d1dc-4cf4-85ce-c609ea3c0fa1','a51e88d8-5b40-4959-8e79-901ef38516a1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:58','2025-12-17 02:01:58','2025-12-17 02:01:58'),('19bc5a10-9974-4061-9caa-944cc6c5a97e','b466c161-ed6d-4540-8872-d8973aa87b18','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:34','2025-12-17 07:36:34','2025-12-17 07:36:34'),('19ecc7f8-7367-4532-966c-c49ac81859f5','bcf5f535-e293-4842-8f61-0f64a0ed3f3a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2026-08-28 13:41:27','2026-08-28 13:41:28','2026-08-28 13:41:28'),('19f5e55e-58f2-49d2-8fed-304c9f1f223d','073a6c81-b99a-447c-876c-27acaeed85d9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:35:44','2025-12-16 13:35:44','2025-12-16 13:35:44'),('1a05b3a2-f92e-45f3-ae12-7fafd6035a7d','ab58e831-9b7c-4943-826e-26efea420ac1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:30','2025-12-31 02:12:30','2025-12-31 02:12:30'),('1a10b340-a4ad-4833-95be-e2b84d77be3a','9b62b42d-5122-41c0-ab59-6fb479cd300f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:32','2025-12-17 02:01:33','2025-12-17 02:01:33'),('1a48d0d6-c548-40e2-88d1-bf9b87a7062f','11c16b3b-852c-41ab-befb-69ae75f2ca79','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:29:55','2026-10-01 10:29:53','2026-10-01 10:29:53'),('1ab245a0-0220-47f2-a22f-d5445c45f75d','0c8406f7-b1d6-45d0-8338-ee079c7d6551','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:44','2025-12-31 02:12:44','2025-12-31 02:12:44'),('1b31c05d-2384-476e-b660-598dff14d19a','b080d858-fa50-4bfe-97aa-1a1ee6ec4012','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:20','2025-12-31 05:54:20','2025-12-31 05:54:20'),('1b5bb46d-997f-43e5-9906-37b59f953f5e','195fcc85-e87c-40a5-94c4-6b43021c94bd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:30:56','2025-12-16 14:30:57','2025-12-16 14:30:57'),('1b79a07c-7ab5-402f-9699-71220a2c94df','2466be8f-1730-4724-a010-59f9cbc110d9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:55:44','2025-12-16 13:55:44','2025-12-16 13:55:44'),('1baffb0d-3662-46e3-81a3-968b1b03c726','a98974b4-f57d-4d5f-81c0-7f4a7f3dd7d4','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:41:28','2025-12-16 14:41:28','2025-12-16 14:41:28'),('1be3a9c1-2b6a-4264-a6a9-65d9979f990c','5effaeeb-989e-4476-b07c-f5e8dbd9427d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:59','2025-12-17 02:01:59','2025-12-17 02:01:59'),('1c446282-2e09-4d3b-8034-848a03d96b25','cc716dce-b978-4ce2-9689-bbdf44aa27a0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:58:37','2025-12-17 07:58:37','2025-12-17 07:58:37'),('1c5b594d-cbe0-4f18-a723-5ed2ca7e0971','cb338679-30c7-460b-8ff6-13031002a98e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:25:40','2025-12-16 12:25:41','2025-12-16 12:25:41'),('1ca5bb32-0c92-48ee-b239-c456a9838398','2a52a948-ae1f-49d9-bd42-58e3bf89f402','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 14:31:37','2025-12-31 14:31:37','2025-12-31 14:31:37'),('1cb31c23-b465-4100-99b8-b5c618294eb0','caeee4ee-3ebd-4f76-bd68-f95030315742','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:00:15','2025-12-17 04:00:15','2025-12-17 04:00:15'),('1cd0873e-62c5-4480-ab60-036470f0946f','233f9396-6dde-4e8a-9ce0-a6c40eda68f7','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:54','2025-12-17 07:36:54','2025-12-17 07:36:54'),('1d386954-5aa1-44c6-94d9-5ea0b4906f90','30078510-8c6c-4d8e-955d-c0e53404d921','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 04:59:00','2025-12-16 04:59:00','2025-12-16 04:59:00'),('1d5ccd7b-51ac-4aa9-8c7b-17aff6eb89c0','86383844-861c-4e7b-821d-29fe64e22b89','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:16:25','2025-12-16 14:16:25','2025-12-16 14:16:25'),('1d9ec3c8-3095-4f70-86ee-82c4cd0be02d','8346b36a-613a-4c8e-9fa1-ebf86a500f8c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:08:56','2025-12-17 11:08:56','2025-12-17 11:08:56'),('1dc75542-91d4-4520-baf6-56bcd7f87b4c','8b95850a-0ce7-430c-bc4b-99d563db0111','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:21:21','2025-12-16 14:21:21','2025-12-16 14:21:21'),('1dcc236e-4f1a-4a94-a957-86b3bf00d14b','74d73c85-98f7-49af-9cf7-34ce64818ccc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:11:18','2025-12-16 02:11:18','2025-12-16 02:11:18'),('1de13e74-1c87-475d-9651-37e4e0670907','43d12912-9650-45d2-8bf8-490981b94bb1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:06:17','2025-12-17 02:06:17','2025-12-17 02:06:17'),('1e20bd82-4cf9-44d1-a6da-55c3805fd634','67d3807d-1598-4256-8b27-d0f3e217c21d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:03:59','2025-12-17 04:03:59','2025-12-17 04:03:59'),('1ee8ad9b-5441-4a56-a193-fa31da7b6e6a','b76f1ce6-ee6c-47bb-a4e2-7943de3bfa7d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:23:03','2025-12-16 14:23:03','2025-12-16 14:23:03'),('1f19f791-dd3a-48be-b834-5661fcf4cf10','912088a1-4faa-40bc-aebc-e031f4b34089','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:31:21','2025-12-16 14:31:21','2025-12-16 14:31:21'),('1f1cfa96-0193-4d9f-907d-b0559bf497fb','6cd6afbe-143f-4470-8df9-c8ea1d247761','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:35:26','2025-12-16 13:35:26','2025-12-16 13:35:26'),('1f630eb0-71b4-4dc3-900f-1de2626202f3','e63da05c-f31e-4983-b429-ac4bfa0f3e2d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:53:54','2025-12-31 04:53:54','2025-12-31 04:53:54'),('1f88bb6d-3aaa-40a5-acdc-5af0c185a9d2','3926489c-7171-4afc-8427-10528fdd5385','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-30 13:39:57','2026-09-30 13:39:57','2026-09-30 13:39:57'),('1fa4f78e-99d5-4a4d-9bc4-c1e123095c69','bb7fc8f0-75c8-4361-9ca3-9409bef55760','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:04:04','2025-12-17 02:04:04','2025-12-17 02:04:04'),('1ffea374-45e9-49c4-b804-93308584889a','fcca83de-d79e-4541-8a04-cc2158e0a902','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:10:17','2025-12-17 11:10:17','2025-12-17 11:10:17'),('201a6991-1a3b-459c-82b6-8581feaf5cbb','bbea81db-a256-408a-83c2-161bcdb171f7','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:18:33','2025-12-16 14:18:33','2025-12-16 14:18:33'),('2151774b-0fc7-4464-a93e-6caaefb31604','43d12912-9650-45d2-8bf8-490981b94bb1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:06:17','2025-12-17 02:06:17','2025-12-17 02:06:17'),('21870570-5b6d-4f9d-9ef4-118705b6af84','da0d750f-0c2b-47bc-9f56-6d4e8b1bc397','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:35:38','2025-12-20 13:35:38','2025-12-20 13:35:38'),('21ae6dde-d686-44ea-aef0-71df57f8607a','25ebd46b-9ea2-4874-b86b-1e48d631dd0b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:45:29','2025-12-31 05:45:29','2025-12-31 05:45:29'),('21de547c-1411-4a9b-98fb-695dc9c41458','a98974b4-f57d-4d5f-81c0-7f4a7f3dd7d4','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:41:28','2025-12-16 14:41:28','2025-12-16 14:41:28'),('220f8f56-e8b0-43cc-841e-42f6163cd7c9','94367287-7ed5-44a4-8602-d9c6732ce501','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:18:13','2025-12-16 12:18:13','2025-12-16 12:18:13'),('22d0f315-4d8b-452a-9107-be3a2ef9de81','f4f78346-fcfd-49e6-b74c-941b4c20026b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:40:44','2025-12-16 13:40:44','2025-12-16 13:40:44'),('2380ca2f-e4bd-460e-99f3-6b6c00f1f15a','96473d9f-109c-4446-9e79-f849b4782f6a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:47:27','2025-12-16 14:47:27','2025-12-16 14:47:27'),('23a52239-c31f-4ac3-85f0-ab226c06d951','18d824f1-ac1d-4bfe-899a-609fb75b1e3f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:33:32','2025-12-17 07:33:32','2025-12-17 07:33:32'),('24d058ab-ba1e-4591-b2cc-7fab1cca0d7f','990f3976-fad2-46a5-b342-57225227deac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:59:23','2025-12-17 07:59:23','2025-12-17 07:59:23'),('25000ab9-2d6b-4ccd-92cf-c0fe9296e3ce','71d9dfcf-ff61-4aba-9244-a442e23b5c8d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:58:55','2025-12-17 07:58:55','2025-12-17 07:58:55'),('2504a9bc-f30e-4f67-8625-999d545b5fc9','5ff35203-c7f2-43b3-98df-3bc65f9950ad','61796564-4a39-457e-a218-1a4dc9bd5f22','2026-09-05 03:10:10','2026-09-05 03:10:10','2026-09-05 03:10:10'),('2505db3e-8a72-4582-beaf-0e9c09e05265','8181a722-9702-41ba-abad-6ad71dd006ba','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:06:18','2025-12-17 02:06:18','2025-12-17 02:06:18'),('25417742-d803-40a0-8f46-12c930d60001','e3661cdf-c684-4094-b75b-eaf3cf26850f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:47:51','2025-12-16 14:47:51','2025-12-16 14:47:51'),('254f43e1-ace9-473d-a580-abb7cc5ae5f1','bcf5f535-e293-4842-8f61-0f64a0ed3f3a','61796564-4a39-457e-a218-1a4dc9bd5f22','2026-09-05 03:11:16','2026-09-05 03:11:16','2026-09-05 03:11:16'),('2592bb25-a282-4a1c-b47d-1f7b13505446','ad29958c-418b-497c-9b94-01229387830c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:08:14','2025-12-17 11:08:14','2025-12-17 11:08:14'),('26628d7b-1cc2-4b63-a379-fe4ba69ac059','bcf5f535-e293-4842-8f61-0f64a0ed3f3a','61796564-4a39-457e-a218-1a4dc9bd5f22','2026-09-05 03:11:16','2026-09-05 03:11:16','2026-09-05 03:11:16'),('2680f384-79cf-4977-943f-89174191aa4b','61036518-5928-473c-b46e-c2e2d68caecd','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:42:13','2025-12-16 14:42:13','2025-12-16 14:42:13'),('26da4b73-de27-443d-a62b-f698586f6f7a','ca0d2382-242f-408c-a979-8043a20cb50d','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-30 12:58:47','2025-12-30 12:58:47','2025-12-30 12:58:47'),('26dec3b5-c1c1-4650-b8cf-b811fe765963','6f19d64b-91e6-47d1-a855-c754f415d69d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2026-01-01 15:44:51','2026-01-01 15:44:51','2026-01-01 15:44:51'),('26e1cdc1-9adc-4cbc-bc72-d1604f7d8f10','74d73c85-98f7-49af-9cf7-34ce64818ccc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:01:05','2025-12-16 02:01:05','2025-12-16 02:01:05'),('270e54e3-652b-4df1-b707-f39e9d2d080e','b080d858-fa50-4bfe-97aa-1a1ee6ec4012','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:20','2025-12-31 05:54:20','2025-12-31 05:54:20'),('27235fff-5814-4b32-a250-d0a5297ec01f','34a7cb1c-73fa-4894-a0dd-e8167f8ed9dc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:16:01','2025-12-16 14:16:01','2025-12-16 14:16:01'),('272f7a26-40cb-4611-acd7-8169020d647a','7bc35a22-67df-42ad-81cb-a67d2d5192ca','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 07:46:38','2025-12-26 07:46:38','2025-12-26 07:46:38'),('2772cd5d-e487-4e44-8a0d-070bfd12141e','2f304594-e93a-4dec-bbf8-731af26f9c6a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:07:28','2025-12-31 04:07:28','2025-12-31 04:07:28'),('27c402a1-e864-4ca8-988a-b017ad9a2ba8','0c47bbd1-bae2-4218-a7d4-9a0ce64dec67','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:11:46','2025-12-16 12:11:46','2025-12-16 12:11:46'),('27c770eb-650d-4ca1-b4fb-84bbafacdaf2','422f2679-4aad-4807-a965-0efb09b350ad','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:41:32','2025-12-31 06:41:32','2025-12-31 06:41:32'),('27fa08a3-3e06-41e9-b7e4-cd8e0a11effe','5ff35203-c7f2-43b3-98df-3bc65f9950ad','61796564-4a39-457e-a218-1a4dc9bd5f22','2026-09-05 03:10:10','2026-09-05 03:10:10','2026-09-05 03:10:10'),('28132bad-a14c-48a3-8f85-580e8254a460','63425463-e948-4997-a596-f8f89cc3cb59','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:50:36','2025-12-16 13:50:36','2025-12-16 13:50:36'),('281dfbb5-d8ed-41df-8066-afb0143a046e','912088a1-4faa-40bc-aebc-e031f4b34089','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:31:13','2025-12-16 14:31:13','2025-12-16 14:31:13'),('283e3234-87a6-4ee2-831c-7967ff5e6a0d','f226db02-7b36-43aa-8327-622c441ed672','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 04:54:41','2025-12-16 04:54:41','2025-12-16 04:54:41'),('2860aaa4-4a9d-46a6-8450-87b82f6aa1d7','18d824f1-ac1d-4bfe-899a-609fb75b1e3f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:33:32','2025-12-17 07:33:32','2025-12-17 07:33:32'),('2866e463-4cee-46a6-aa63-88ab859c5bec','31de8c08-4a72-421c-a082-0247f51e2f87','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:51:12','2025-12-17 06:51:12','2025-12-17 06:51:12'),('28aec791-2864-4df0-8428-85e76fc1ed10','be063f9c-6e46-4344-b40c-1bd259de0ba3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:30:45','2025-12-16 14:30:45','2025-12-16 14:30:45'),('28b899ce-3021-4180-83a9-6313f204a2fc','bce77d89-02eb-4651-b605-c86f9e70c60e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 14:32:48','2025-12-31 14:32:48','2025-12-31 14:32:48'),('290a187a-9122-4db0-a6bb-1dba689ceb0d','df4f393e-e384-496a-a73c-c29db51737c0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:25:38','2025-12-16 14:25:38','2025-12-16 14:25:38'),('2979406c-da83-4136-9a5e-76636ddc9c8e','b31ccc0f-fc55-4ff4-b5b2-fc7f0c54056e','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-05 11:23:09','2026-09-05 11:23:09','2026-09-05 11:23:09'),('2996a981-7c54-4a36-9ce8-25805f1b39c1','7a5021df-ac05-4827-9b41-55353e5fc485','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:03:57','2025-12-17 06:03:57','2025-12-17 06:03:57'),('29c819dc-63df-4eb6-9ca0-5dc4691c1785','e4e1b7f4-1aaf-4ea0-93c5-94b7992a24e9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:36:01','2025-12-16 14:36:01','2025-12-16 14:36:01'),('2a1e3514-3bca-42d1-ae79-96ce77aac9fc','43c1fdb3-81aa-4b70-99f9-e294019aa8f9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:21:20','2025-12-16 14:21:20','2025-12-16 14:21:20'),('2a63f058-bc0d-4c6a-a4e6-daa1935100bd','2466be8f-1730-4724-a010-59f9cbc110d9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:55:18','2025-12-16 13:55:18','2025-12-16 13:55:18'),('2ac24b8e-9647-4f2f-b53f-2e15fd8e48bb','269a9a84-287b-4ca4-8d1c-93241fd2d655','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:38:13','2025-12-16 13:38:13','2025-12-16 13:38:13'),('2b041690-8f67-4136-bcde-c0cdcf542c98','814c21fa-95f6-4541-97f9-f0c83040c25f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:20:06','2025-12-16 12:20:06','2025-12-16 12:20:06'),('2b552edf-49ca-408e-b8d3-f2d8c17526e3','dc30a8f5-b2bf-49f2-8896-8c13339ebd88','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:40:06','2025-12-31 14:40:07','2025-12-31 14:40:07'),('2b6c0050-fa65-4bf4-8cc8-d14fd5ae043b','42f4b1a0-3a89-46a4-a240-d29f466d35c6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:03:05','2025-12-17 04:03:05','2025-12-17 04:03:05'),('2b72f226-2a53-4cf5-b3b4-167ed1ee77a5','93d76b8d-e41f-4f31-892e-6cd449692db1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:08:58','2025-12-16 14:08:59','2025-12-16 14:08:59'),('2b8683e0-6373-4696-a6ba-ba7eb9b7af3c','f2118363-2ea7-4191-945d-2339a64df870','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:51:09','2025-12-16 12:51:09','2025-12-16 12:51:09'),('2b8c5797-284a-4c55-9f3c-7ff42c4a1dc2','976b0b1d-6fc2-43f3-98f9-8c52316712f9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 07:46:23','2025-12-26 07:46:23','2025-12-26 07:46:23'),('2ba5b72e-cffc-4816-97d7-d443c62514e7','0c8406f7-b1d6-45d0-8338-ee079c7d6551','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:44','2025-12-31 02:12:44','2025-12-31 02:12:44'),('2bd2bd01-cc32-445d-9486-29d4f85411b0','ba0cae45-1b05-4f13-894b-b0d5e48cb0a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 13:11:57','2025-12-17 13:11:57','2025-12-17 13:11:57'),('2c232aae-5a7d-41f4-a67d-264b7a81cd12','411a83a6-0699-4f89-b0b3-bd4510546e67','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:15:29','2025-12-16 14:15:29','2025-12-16 14:15:29'),('2c6e1523-0244-4783-af21-b4911f1f3009','64a2744f-5d29-4a40-a8cc-e1c5c92e2b76','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:10:13','2025-12-17 11:10:13','2025-12-17 11:10:13'),('2cad7751-7240-4a06-a69b-493802a2ec2d','71d9dfcf-ff61-4aba-9244-a442e23b5c8d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:58:55','2025-12-17 07:58:55','2025-12-17 07:58:55'),('2d219a1d-39f8-45e0-aa59-51dc72fb0b1e','c1798abb-cff2-4168-a7d2-178639036bfb','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-15 11:39:36','2025-12-15 11:39:36','2025-12-15 11:39:36'),('2d46637a-dcb2-476d-a28f-b37d24643ce6','1f120ccc-77ea-4c52-a53f-6904ba36ae6a','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-30 12:24:50','2025-12-30 12:24:50','2025-12-30 12:24:50'),('2d6283b1-e0fc-46e5-b6a2-b149ae5504ac','019d7b97-1280-4200-a964-a397bbfb3a4c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:14:42','2025-12-16 12:14:42','2025-12-16 12:14:42'),('2dc27f7d-d820-415e-9460-424fb9460903','93d76b8d-e41f-4f31-892e-6cd449692db1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:08:59','2025-12-16 14:08:59','2025-12-16 14:08:59'),('2dfe865b-5273-430c-927b-ed8cc9879b39','cc716dce-b978-4ce2-9689-bbdf44aa27a0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:58:33','2025-12-17 07:58:33','2025-12-17 07:58:33'),('2e529971-c3b3-43a5-9f29-e77aee6c3afc','1d6a15f2-12f9-4f11-9af6-4eb4a1e39cb6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 06:12:54','2025-12-16 06:12:54','2025-12-16 06:12:54'),('2e98a3a2-7177-4a16-86bb-a4b0e09a0451','6f19d64b-91e6-47d1-a855-c754f415d69d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 15:13:56','2025-12-31 15:13:56','2025-12-31 15:13:56'),('2ea3277a-dd48-40e4-ae46-6b760016c0c5','0d91552c-f5a8-4238-b85d-726a88291999','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:02:27','2025-12-17 02:02:27','2025-12-17 02:02:27'),('2ec8a826-c33e-40d3-844f-5b73eebaad45','7189e59f-76c5-43b6-a9c4-d31e5c66cf4c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:30:05','2025-12-17 07:30:05','2025-12-17 07:30:05'),('2ee2e831-0bae-4c35-a28e-6f476846b72c','86383844-861c-4e7b-821d-29fe64e22b89','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:16:25','2025-12-16 14:16:25','2025-12-16 14:16:25'),('2ee43b51-08f9-4c07-947e-57a829f7f46b','a4502205-6ae9-41f0-9d86-14f78813797f','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:15:29','2025-12-16 14:15:29','2025-12-16 14:15:29'),('2fad4b7f-b745-43b2-b758-fe409d9b3b56','c65c4e20-da37-4736-ad59-4341c800f594','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:03:31','2025-12-17 02:03:31','2025-12-17 02:03:31'),('2fc9218c-d3ef-4b99-804e-e577a0354da1','f71da1e8-cdc8-49b8-ab8d-0a84dae4f0a0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:39','2025-12-31 05:54:39','2025-12-31 05:54:39'),('2fee1b36-2485-4a78-a926-ce3a5917d306','94367287-7ed5-44a4-8602-d9c6732ce501','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:18:13','2025-12-16 12:18:13','2025-12-16 12:18:13'),('302ae626-9a85-4b73-9448-83c1f6da9e6b','0c1179b7-0a43-4c5f-8b2a-16d5b8f1f82c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:30:04','2025-12-17 07:30:04','2025-12-17 07:30:04'),('30346657-2e6a-4780-8b4b-db0014084499','976b0b1d-6fc2-43f3-98f9-8c52316712f9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:26:33','2025-12-30 17:26:34','2025-12-30 17:26:34'),('30393c9a-33d0-427b-b4df-5d21577ce07c','000314de-1839-4009-97b9-949b231ae022','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-24 12:25:38','2025-12-24 12:25:38','2025-12-24 12:25:38'),('30580e33-2185-4cd2-96b3-83333ad099b4','897e00ce-e2bb-44c5-bca3-65c4b70acda4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:36:30','2025-12-16 14:36:30','2025-12-16 14:36:30'),('31042642-6498-4595-b624-da2c1df0b028','f0a44ed8-820e-460e-a93d-2ac1ceb048bb','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 06:02:25','2025-12-16 06:02:25','2025-12-16 06:02:25'),('311993f2-49c4-4b37-91b3-85e7b8ca8f0f','30078510-8c6c-4d8e-955d-c0e53404d921','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 04:59:02','2025-12-16 04:59:02','2025-12-16 04:59:02'),('311e1259-d740-414d-a4ee-ed7096d307b2','c1e8d6bb-a477-419a-a862-501ecd54353e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:16:32','2025-12-16 12:16:32','2025-12-16 12:16:32'),('313e725a-4ec7-45d0-9849-e163848eae3a','814c21fa-95f6-4541-97f9-f0c83040c25f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:19:57','2025-12-16 12:19:57','2025-12-16 12:19:57'),('3163f7dc-73f7-4e76-8522-ad28cf419178','9cac8fa8-8d1e-447c-85e6-b89487147025','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:10:50','2025-12-31 06:10:50','2025-12-31 06:10:50'),('31e43501-3f07-4e5a-8255-13c8edcbcbcf','b76f1ce6-ee6c-47bb-a4e2-7943de3bfa7d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:23:03','2025-12-16 14:23:03','2025-12-16 14:23:03'),('32256e99-4f76-4452-8dae-11464c242560','4436aad2-6514-4419-a2e8-0b2190d001cd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:07:17','2025-12-16 13:07:17','2025-12-16 13:07:17'),('324a4af7-83f8-4811-b207-6d35c79bea0d','2a9a88d7-5c48-425f-8d64-ba4ff979fb5e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:37:24','2025-12-17 07:37:24','2025-12-17 07:37:24'),('329c80fd-0939-4466-8ef3-6febb5de6224','43c1fdb3-81aa-4b70-99f9-e294019aa8f9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:20:38','2025-12-16 14:20:38','2025-12-16 14:20:38'),('32c67c39-763c-4c56-922b-b7659b37f26a','79ddefb5-a30d-4118-8bd5-6cf51371fb5c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:05:53','2025-12-31 08:05:53','2025-12-31 08:05:53'),('32ee7578-1f64-4a18-9582-851c984c3eab','bce77d89-02eb-4651-b605-c86f9e70c60e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 14:35:15','2025-12-31 14:35:15','2025-12-31 14:35:15'),('33063fc1-421f-49b1-a5e0-fe81b37b909d','a0cc0b45-d5e1-49e3-a463-d37e9ff546c8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:05:03','2025-12-17 07:05:03','2025-12-17 07:05:03'),('330e6f36-15eb-47e1-83cd-1b0bb73309be','3c1f89e3-4a75-4f2d-a2a5-8540b611315a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:01:51','2025-12-17 07:01:51','2025-12-17 07:01:51'),('33196052-df54-41bb-a2b6-48849287d48c','f4f78346-fcfd-49e6-b74c-941b4c20026b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:40:44','2025-12-16 13:40:44','2025-12-16 13:40:44'),('33449739-8aae-4ce8-8aab-a3091b76dc74','6d956381-b651-423f-b0b5-b34b42982a51','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:10:20','2025-12-31 02:10:20','2025-12-31 02:10:20'),('33532760-26fb-4bc3-9240-2504d6067d47','8181a722-9702-41ba-abad-6ad71dd006ba','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:06:46','2025-12-17 02:06:46','2025-12-17 02:06:46'),('3392afb9-2705-4571-954c-b5d303380409','ec635ca2-62a2-4be0-ba07-9b72757f9ede','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-05 07:40:24','2026-09-05 07:40:24','2026-09-05 07:40:24'),('33dcb1a0-1b04-43d6-9e5c-604fc1d8f383','9ba43158-5b24-4c6f-a09f-81500220e34d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:28','2025-12-17 07:38:28','2025-12-17 07:38:28'),('33df94e0-305e-4136-a9f5-eda166a29c6d','fcca83de-d79e-4541-8a04-cc2158e0a902','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:10:17','2025-12-17 11:10:17','2025-12-17 11:10:17'),('33e548cf-aa0f-46e2-bb64-307029b45e4a','dc82fbbb-8429-46ed-85c4-bb25b8066a39','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:25:53','2025-12-16 14:25:53','2025-12-16 14:25:53'),('341450ba-c533-46b6-a884-928f1331066c','a61345d4-cf93-4315-b576-a077cd21e346','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:02:40','2025-12-17 02:02:40','2025-12-17 02:02:40'),('343159c6-0f51-4366-8ec4-1fb0ceb41f79','ab58e831-9b7c-4943-826e-26efea420ac1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:30','2025-12-31 02:12:30','2025-12-31 02:12:30'),('34368ff9-834f-4626-9dbd-bea8e96782e9','b31ccc0f-fc55-4ff4-b5b2-fc7f0c54056e','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-05 11:23:09','2026-09-05 11:23:09','2026-09-05 11:23:09'),('34662733-2250-4324-a847-6e33b12f3ad2','6940025c-bd03-43c7-8fbf-6e0cfc46876d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:10:51','2025-12-31 06:10:51','2025-12-31 06:10:51'),('3549cee0-c843-4172-8af6-eac7afbb1035','da0d750f-0c2b-47bc-9f56-6d4e8b1bc397','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:35:38','2025-12-20 13:35:38','2025-12-20 13:35:38'),('3552aa38-459f-4516-929e-e52c06f8e645','865c5585-e2ed-45e1-bba3-53951a71a73e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:27:26','2025-12-16 13:27:26','2025-12-16 13:27:26'),('3594ecb0-137c-4631-a757-08c8909c4ac4','61036518-5928-473c-b46e-c2e2d68caecd','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:47:19','2025-12-16 14:47:19','2025-12-16 14:47:19'),('35ae27b4-fd65-4522-9932-527270ba2079','31de8c08-4a72-421c-a082-0247f51e2f87','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:59:32','2025-12-17 06:59:32','2025-12-17 06:59:32'),('35aea60f-8364-4926-acba-d26c88eced7b','0d91552c-f5a8-4238-b85d-726a88291999','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:02:39','2025-12-17 02:02:39','2025-12-17 02:02:39'),('36a14987-1a91-439b-ad5b-055283d65989','fcb74f61-e96a-47ef-ab8e-d2f4fbc2a99f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:37:43','2025-12-17 07:37:43','2025-12-17 07:37:43'),('36b94744-eda9-434f-9877-610473806c7a','2466be8f-1730-4724-a010-59f9cbc110d9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:51:22','2025-12-16 13:51:23','2025-12-16 13:51:23'),('36c5576c-2db3-460c-8a2c-0e4db3070579','6604c0d8-d208-4def-a895-d1726eb703eb','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:38:34','2025-12-16 13:38:34','2025-12-16 13:38:34'),('36e85636-7230-42cb-9944-941dd7245b76','865c5585-e2ed-45e1-bba3-53951a71a73e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:31:56','2025-12-16 13:31:56','2025-12-16 13:31:56'),('37299da2-ddbc-4182-adcb-d8136b7612de','fd524242-29dd-446a-8a1d-668a985304f7','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 03:56:21','2025-12-31 03:56:21','2025-12-31 03:56:21'),('37518d65-a01d-43be-97d9-f6fda65b378a','9b62b42d-5122-41c0-ab59-6fb479cd300f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:17','2025-12-17 02:01:17','2025-12-17 02:01:17'),('377400fc-0f94-4b72-bc66-43a5ba9466ae','bcf5f535-e293-4842-8f61-0f64a0ed3f3a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2026-08-28 13:41:28','2026-08-28 13:41:28','2026-08-28 13:41:28'),('379f98b7-a2c7-4ccc-af2c-5d8a37866fc0','cdb382c1-c659-48c8-b349-d2e78956fee8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:11:35','2025-12-16 02:11:35','2025-12-16 02:11:35'),('37bdcc5f-e933-4d6a-af9c-e3e8ae6d0828','5b18f413-c689-4bc2-9f6c-e414c24e067c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:06:16','2025-12-31 04:06:16','2025-12-31 04:06:16'),('37c087c4-c43f-41d8-a222-f5f259eced73','edb9b7ff-fae2-4986-ad56-71cdca019789','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:03:06','2025-12-17 04:03:06','2025-12-17 04:03:06'),('38156632-cc75-48af-b756-2e412dee40e1','a0cc0b45-d5e1-49e3-a463-d37e9ff546c8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:29:32','2025-12-17 07:29:32','2025-12-17 07:29:32'),('38725922-1a1d-4072-88d4-8f853a714b3f','43fef7d5-0879-4d67-96be-061936ddbec3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:12:06','2025-12-16 02:12:06','2025-12-16 02:12:06'),('38c96147-79de-4951-9c67-2d1c9025873e','9ba43158-5b24-4c6f-a09f-81500220e34d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:37','2025-12-17 07:38:37','2025-12-17 07:38:37'),('38f70d6a-2be8-443c-8ad0-69b4c8a8a70a','7760e63a-19c7-4497-830c-1193765db760','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:15:23','2025-12-16 14:15:23','2025-12-16 14:15:23'),('395b04b3-4152-4754-be24-6cda8d2b8b09','8bc25ca3-3618-4a71-b1a2-5b5ccfcfb15d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2026-08-28 13:41:19','2026-08-28 13:41:19','2026-08-28 13:41:19'),('39b10268-d0f1-41a9-9807-5a1a399db7b7','7ac5412b-7151-4086-a8da-a6e4a2c43a85','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:32:13','2025-12-20 13:32:13','2025-12-20 13:32:13'),('39d9924e-5801-489e-a403-4af2a7878040','a477a953-67e3-4736-9fce-cb516ba69d44','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:45:29','2025-12-31 05:45:29','2025-12-31 05:45:29'),('39e277ef-c260-484c-920a-23e3ccae49df','aa69f0a8-1489-44a8-b4bd-ef2ea26519f0','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:58:33','2025-12-16 13:58:33','2025-12-16 13:58:33'),('39fbf385-44b5-409e-9769-2b4f475a77ee','eb9c31e7-9c05-454f-bccb-9412aec0cc53','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:43:29','2025-12-31 14:43:29','2025-12-31 14:43:29'),('3a231aa1-7db7-472f-99c7-ee4247c43b94','7760e63a-19c7-4497-830c-1193765db760','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:15:23','2025-12-16 14:15:23','2025-12-16 14:15:23'),('3a23c313-76f5-4011-8feb-8667068f3114','3926489c-7171-4afc-8427-10528fdd5385','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-30 13:39:56','2026-09-30 13:39:56','2026-09-30 13:39:56'),('3a62f324-194b-46f4-83dc-ff0382f4eb11','6cd6afbe-143f-4470-8df9-c8ea1d247761','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:35:27','2025-12-16 13:35:27','2025-12-16 13:35:27'),('3adf8cb4-89ce-4e80-8e3d-1e282ad8d0d4','6019fce4-f9cc-44d8-a97e-db9f1419513a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:58:50','2025-12-31 05:58:50','2025-12-31 05:58:50'),('3afe8967-dc6a-4db6-b38d-645167fecf82','a6b7b064-ae55-4200-a7f3-d96d727c8954','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:16','2025-12-17 02:01:16','2025-12-17 02:01:16'),('3b0b3ecf-45e0-4b58-8d5c-557ae0cecdaa','5a66415b-07fb-4395-9719-c72397728254','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:19:41','2025-12-16 02:19:41','2025-12-16 02:19:41'),('3b468f08-f77c-487b-918c-2339db164731','ca0e3862-5aff-437d-8aa2-276aa394d51c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:10:38','2025-12-31 06:10:38','2025-12-31 06:10:38'),('3bd416c6-2f8b-4cd3-a1d1-85862f947570','f71da1e8-cdc8-49b8-ab8d-0a84dae4f0a0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:24','2025-12-31 05:54:24','2025-12-31 05:54:24'),('3c52f5da-cf3b-4723-9464-0578a82cf0eb','43c1fdb3-81aa-4b70-99f9-e294019aa8f9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:20:32','2025-12-16 14:20:32','2025-12-16 14:20:32'),('3c8dd1f7-e427-4d0d-a125-0a6f9a5f334e','110ae15d-897b-44be-8fb2-fa1a572d6b58','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-24 12:25:33','2025-12-24 12:25:33','2025-12-24 12:25:33'),('3c9b20c1-42db-4acf-99fa-a2c6d33f2091','bbf011d3-08b4-454d-a8b5-f246b5bb3759','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:07:13','2025-12-31 04:07:13','2025-12-31 04:07:13'),('3ca64205-6971-447c-a292-a12ae4b8c530','9cac8fa8-8d1e-447c-85e6-b89487147025','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:10:50','2025-12-31 06:10:50','2025-12-31 06:10:50'),('3cee2f93-c233-4fbc-803b-349ef7243c4e','db48d5c6-28ad-4899-99eb-8ca928be158e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:15:53','2025-12-16 14:15:53','2025-12-16 14:15:53'),('3eb79c50-35d9-42e9-b554-841fa9021728','c88ebd2c-bf5e-4dfe-9ff3-5222b7e5d0fb','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-15 17:09:03','2025-12-15 17:09:03','2025-12-15 17:09:03'),('3eec55ef-dc01-47eb-af12-206573bbf108','50222596-7e4f-4289-9bd2-607b1654de0c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:00:53','2025-12-16 02:00:53','2025-12-16 02:00:53'),('3ef388be-52b6-4345-a133-87cf52cc7e8f','e40ce425-3c4c-4259-80f0-8ca7636f87ee','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 06:16:07','2025-12-16 06:16:08','2025-12-16 06:16:08'),('3ef62621-c7bf-4676-acce-18b7581e358f','7c78675c-f3d0-412f-93b3-4f8f1fb8c8f0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:52:10','2025-12-31 04:52:10','2025-12-31 04:52:10'),('3f11121c-e38a-4499-9ee2-69934e92a41c','a6b7b064-ae55-4200-a7f3-d96d727c8954','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:16','2025-12-17 02:01:16','2025-12-17 02:01:16'),('3f11236f-7f46-4a54-bf5f-6eead30acbd8','2a9a88d7-5c48-425f-8d64-ba4ff979fb5e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:37:24','2025-12-17 07:37:24','2025-12-17 07:37:24'),('3f6a8f61-99f3-4671-8c66-5a340e262d43','bce77d89-02eb-4651-b605-c86f9e70c60e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 14:35:15','2025-12-31 14:35:15','2025-12-31 14:35:15'),('3fbbadd5-e89a-4f19-baa7-3f90606d2ff8','cee9c995-982c-452c-937d-49c457902cd5','8720b484-8c4f-4377-9e16-d18a7d5901cc','2026-10-09 16:34:00','2026-10-09 16:34:00','2026-10-09 16:34:00'),('3fd36baf-e518-4070-81b2-b995f836bfcb','c7057a30-db2c-4f71-8040-0583c3827a0c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:44','2025-12-17 07:36:44','2025-12-17 07:36:44'),('3ff266f7-518b-4439-8168-37cc8c345e94','23f317c4-d28f-4539-8044-cee3e71825df','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:16:01','2025-12-16 14:16:01','2025-12-16 14:16:01'),('4056810b-e926-4a73-9060-d9611657a8bc','37eefda6-ab9e-4cc5-a3b9-6b3198de4e6a','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-30 13:39:37','2026-09-30 13:39:37','2026-09-30 13:39:37'),('4059172c-8c40-417f-9940-65ceac4d7a6f','6fb75884-2272-479a-840a-3c7f0945c9a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:11:18','2025-12-17 11:11:18','2025-12-17 11:11:18'),('407c4513-1f0f-437c-ad30-d5559ca3e745','e3661cdf-c684-4094-b75b-eaf3cf26850f','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:46:44','2025-12-16 14:46:44','2025-12-16 14:46:44'),('40d6982e-f2e7-4a0c-8f8e-4d150ff6de14','210dd46c-881e-483b-9dba-90d1259b0f2f','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:37:54','2025-12-16 14:37:54','2025-12-16 14:37:54'),('40fd26e3-367a-4104-a5b3-9f9d02e9725b','43c1fdb3-81aa-4b70-99f9-e294019aa8f9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:20:32','2025-12-16 14:20:32','2025-12-16 14:20:32'),('414b72c4-e680-4a8a-987b-d0889b2267cf','110ae15d-897b-44be-8fb2-fa1a572d6b58','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 07:46:22','2025-12-26 07:46:22','2025-12-26 07:46:22'),('4193bacd-4b79-4f1b-9f23-7ac12b95f0f4','cc716dce-b978-4ce2-9689-bbdf44aa27a0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:55:49','2025-12-17 07:55:49','2025-12-17 07:55:49'),('4277321d-7586-45ce-af8a-3e8002302395','9d5e0763-d7fb-40f9-a7dc-da03ec3351e8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:30:27','2025-12-16 14:30:27','2025-12-16 14:30:27'),('429e2532-fa99-42cd-a56d-19f591d2182e','43c1fdb3-81aa-4b70-99f9-e294019aa8f9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:21:20','2025-12-16 14:21:20','2025-12-16 14:21:20'),('42a15037-a19c-42fe-a6b8-e91e38ceb352','6d81c0a1-575e-47e2-a71a-ed2e76b0048b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:35:29','2025-12-20 13:35:29','2025-12-20 13:35:29'),('43285dd8-cfcd-4c7e-adb5-f58c7b545c02','23513fcc-213f-4348-8ffa-87953658ef79','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:47:28','2025-12-16 14:47:28','2025-12-16 14:47:28'),('43d8f3f9-0091-47ae-a6ba-8d885e360096','ede10a4e-323b-4267-8320-9af1e538c58c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:07:03','2025-12-17 02:07:03','2025-12-17 02:07:03'),('4409f28a-4ab2-4e62-a9f0-3bc7714f8045','2a9a88d7-5c48-425f-8d64-ba4ff979fb5e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:27','2025-12-17 07:38:27','2025-12-17 07:38:27'),('442c5ed5-9f5a-49a0-9767-efd4d7a334df','7ddd25fb-23f7-4fc0-8f90-705849bf95dc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:28:40','2025-12-16 14:28:40','2025-12-16 14:28:40'),('444548a3-582d-426b-8dc2-0d475396998d','59ffc799-d8f2-4dc1-8d1b-a34087fc784c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:03:45','2025-12-31 04:03:45','2025-12-31 04:03:45'),('44531a36-2f27-44dd-8fec-14aeedd5e489','6f0c06e4-eb39-400c-85e2-65d0f106a0a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:03:18','2025-12-17 02:03:18','2025-12-17 02:03:18'),('44538997-8e7c-4254-afcb-9948eea76517','a477a953-67e3-4736-9fce-cb516ba69d44','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:57:34','2025-12-31 04:57:34','2025-12-31 04:57:34'),('448706b8-ef9d-42c0-af99-444757a59f2d','25ebd46b-9ea2-4874-b86b-1e48d631dd0b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:49:23','2025-12-31 05:49:23','2025-12-31 05:49:23'),('44f466f3-5c49-42ee-b459-346952bc789e','1d6a15f2-12f9-4f11-9af6-4eb4a1e39cb6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 06:02:44','2025-12-16 06:02:44','2025-12-16 06:02:44'),('4521c536-397f-4644-a6ca-74e934e058fb','a0cc0b45-d5e1-49e3-a463-d37e9ff546c8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:05:03','2025-12-17 07:05:03','2025-12-17 07:05:03'),('454e7ae8-2498-41bf-b96e-1ac3710cd0b4','31de8c08-4a72-421c-a082-0247f51e2f87','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:51:12','2025-12-17 06:51:12','2025-12-17 06:51:12'),('45755da4-3e8c-41a7-950c-2b0b2be02508','b31ccc0f-fc55-4ff4-b5b2-fc7f0c54056e','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-05 11:23:09','2026-09-05 11:23:10','2026-09-05 11:23:10'),('45a1c086-74e1-4b05-80fb-6c7ae456a299','ac9e4724-0145-4446-b3a9-d953369ea4ca','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:16:09','2025-12-16 14:16:09','2025-12-16 14:16:09'),('45b54953-7c0e-4852-9acc-cb7b353ad86d','7ac5412b-7151-4086-a8da-a6e4a2c43a85','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:37:50','2025-12-17 07:37:50','2025-12-17 07:37:50'),('45c243d7-52d5-4850-a56e-a013d7a39bee','34a7cb1c-73fa-4894-a0dd-e8167f8ed9dc','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:16:01','2025-12-16 14:16:01','2025-12-16 14:16:01'),('462475c8-a5b5-47e2-bc6f-0af2f171a818','3e6f89e6-f4ba-4d55-a699-c5b16d0ee966','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:29:51','2026-10-01 10:29:50','2026-10-01 10:29:50'),('46434b18-e892-4d22-8969-87031347092e','92328b71-24ce-4259-be7b-eefc6eb36cc4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 13:11:58','2025-12-17 13:11:58','2025-12-17 13:11:58'),('466f1e2e-8242-4f54-bd3e-3d8602463a1b','1f120ccc-77ea-4c52-a53f-6904ba36ae6a','eceba0d7-3225-492d-a1e9-04f609ff9571','2025-12-30 12:13:39','2025-12-30 12:13:39','2025-12-30 12:13:39'),('46c294e2-c52a-48e6-96dd-85475257f54f','f6785d61-61fe-4c34-bd1d-4468b6f33a7a','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:16:25','2025-12-16 14:16:25','2025-12-16 14:16:25'),('472d3e5f-bb02-443d-bddf-0c7c2c12d37f','9602e638-c41c-4070-a44f-9681554b6bf4','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:41:18','2025-12-16 14:41:18','2025-12-16 14:41:18'),('4745bce6-6719-4f7d-bad1-c1b6fee85787','42f4b1a0-3a89-46a4-a240-d29f466d35c6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:03:05','2025-12-17 04:03:05','2025-12-17 04:03:05'),('47703839-ce1b-441f-9600-41a70212e5d1','7bc35a22-67df-42ad-81cb-a67d2d5192ca','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-24 12:25:28','2025-12-24 12:25:28','2025-12-24 12:25:28'),('47a0de9f-58f9-4733-a4be-b1a1a7fb970d','b76f1ce6-ee6c-47bb-a4e2-7943de3bfa7d','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:23:03','2025-12-16 14:23:03','2025-12-16 14:23:03'),('47f0f3fc-dc0d-4a7c-91c8-a7a2b41698c9','f9f246ac-bac4-48c3-a57f-4f7e9843b121','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 15:13:55','2025-12-31 15:13:55','2025-12-31 15:13:55'),('4813484e-5aae-4450-8c15-e5ed633d38d7','b003f86f-4a0f-490c-aacc-9eec17ffa6dd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:45','2025-12-31 02:12:45','2025-12-31 02:12:45'),('4816f12a-9b08-4991-b618-24c1b2ab2062','32f38528-d0dd-45fb-b8b1-7864d7e37af4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:28:08','2025-12-16 14:28:08','2025-12-16 14:28:08'),('48348c0a-89e4-4dba-ba9d-d13d2ca84a0c','422f2679-4aad-4807-a965-0efb09b350ad','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:05:24','2025-12-31 08:05:24','2025-12-31 08:05:24'),('48961386-60ce-4e4e-a0fc-440bb5928158','27e5204a-9daa-4528-ba63-ac69b5d67936','61796564-4a39-457e-a218-1a4dc9bd5f22','2026-09-05 03:11:17','2026-09-05 03:11:17','2026-09-05 03:11:17'),('48cb02ae-b008-408e-9fd4-b0b2db13d7c6','89ca8212-4feb-4c70-8f6e-90f15b58136e','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:46:43','2025-12-16 14:46:43','2025-12-16 14:46:43'),('490f8382-f94b-47b8-b894-1640fc7916bf','71fdc289-af52-43dd-98af-e251126d96b4','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-30 12:58:40','2025-12-30 12:58:40','2025-12-30 12:58:40'),('494f0938-b3fd-4415-b3c1-3458a59b6614','ef4feed6-4dcc-41e0-8a9d-9a6bf7cbf984','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:49','2025-12-17 07:38:49','2025-12-17 07:38:49'),('49a828ee-c6e5-4b05-8fc6-461d8f47c3ee','e63da05c-f31e-4983-b429-ac4bfa0f3e2d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:57:33','2025-12-31 04:57:33','2025-12-31 04:57:33'),('49d4d6df-7f91-4ee0-a183-af795c918e53','e4e1b7f4-1aaf-4ea0-93c5-94b7992a24e9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:36:01','2025-12-16 14:36:01','2025-12-16 14:36:01'),('4a769ca3-7abe-489f-942a-3a6cb67a3e6c','2f304594-e93a-4dec-bbf8-731af26f9c6a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:09:28','2025-12-31 04:09:28','2025-12-31 04:09:28'),('4a9f5a28-c60d-4701-9db5-bc38980f1ef8','30078510-8c6c-4d8e-955d-c0e53404d921','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 05:02:39','2025-12-16 05:02:39','2025-12-16 05:02:39'),('4aa700a9-ff7a-4f61-9ef7-bb1e0a47345a','9196b369-7694-4842-a456-98a7cb1698b8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:53','2025-12-17 07:36:53','2025-12-17 07:36:53'),('4acebe30-2ac4-4f14-a4e9-89743742e301','c73bdcff-5fb0-4d23-9f82-62bdce1e15fc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:20:41','2025-12-16 13:20:42','2025-12-16 13:20:42'),('4af789a4-15f6-48bc-9013-dd7555437e73','5a66415b-07fb-4395-9719-c72397728254','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 04:46:11','2025-12-16 04:46:11','2025-12-16 04:46:11'),('4b98f9c5-5c2f-4f15-af3f-44b826500954','a8497683-217a-4ba4-8434-4c1bfc4cbe8d','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:20:37','2026-10-01 10:20:36','2026-10-01 10:20:36'),('4bcbe667-9a03-42f6-9c27-207185a4f9cc','9bfb1d17-5cd1-4b55-b223-a694f8041482','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:23','2025-12-31 05:54:23','2025-12-31 05:54:23'),('4bf056e6-ec1e-45b8-8b41-a9b33cf480fd','b76f1ce6-ee6c-47bb-a4e2-7943de3bfa7d','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:23:03','2025-12-16 14:23:03','2025-12-16 14:23:03'),('4bf7ef8d-059d-4147-a40c-b929cb648458','42f4b1a0-3a89-46a4-a240-d29f466d35c6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:00:16','2025-12-17 04:00:16','2025-12-17 04:00:16'),('4cca4974-14d3-413e-a254-0ff9b8f25bef','073a6c81-b99a-447c-876c-27acaeed85d9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:36:46','2025-12-16 13:36:46','2025-12-16 13:36:46'),('4d65d204-fe1a-46bc-a97c-d0b0c3d39fa6','7e14ae9f-3b68-4c34-b26f-bd65853ced75','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 07:46:39','2025-12-26 07:46:39','2025-12-26 07:46:39'),('4d74c029-d388-4915-b23b-df93b7a9ceb0','3e6f89e6-f4ba-4d55-a699-c5b16d0ee966','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:28:30','2026-10-01 10:28:28','2026-10-01 10:28:28'),('4de81de3-74eb-4530-822c-08d2941de9c2','43c1fdb3-81aa-4b70-99f9-e294019aa8f9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:20:38','2025-12-16 14:20:38','2025-12-16 14:20:38'),('4df62bd8-a087-4247-a28e-9eb3b3c2fe9c','db1b727e-75ef-4bbd-9417-64d13fb993f8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:22:40','2025-12-31 08:22:40','2025-12-31 08:22:40'),('4e21680c-8291-4f0b-b89c-4e3f28f5aa2c','4f37b0b7-21d8-414d-a00a-df16acd9f2ad','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:30:38','2025-12-16 14:30:38','2025-12-16 14:30:38'),('4e754080-5a35-4130-98c6-b34f20b6d40f','58b01e60-a0ed-4055-b864-b9f55e0b6547','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:30:03','2026-10-01 10:30:02','2026-10-01 10:30:02'),('4e797ed9-2c24-4ae1-a428-479761f8adc2','ac9e4724-0145-4446-b3a9-d953369ea4ca','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:16:10','2025-12-16 14:16:10','2025-12-16 14:16:10'),('4ec5cd84-fc22-4328-88c9-90a323e74a3a','299f1fb6-49ca-4559-89af-6c2b9fe04ddf','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:33:03','2025-12-20 13:33:03','2025-12-20 13:33:03'),('4ec880d1-0804-4c69-86be-1c16dfb76867','7bb8f624-2747-4c0d-bb4f-8a667991f931','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:39:58','2025-12-31 14:39:58','2025-12-31 14:39:58'),('4ecac0d5-1c66-4c07-a817-c775392c16b1','e4e1b7f4-1aaf-4ea0-93c5-94b7992a24e9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:36:29','2025-12-16 14:36:29','2025-12-16 14:36:29'),('4ef36836-1661-4d0c-b042-15debe32410c','7d206b8e-8957-4b6d-85ac-ce23da9e29f9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:31:25','2025-12-31 06:31:25','2025-12-31 06:31:25'),('4efb5051-fbc5-48a1-ace0-256cccc83075','18d824f1-ac1d-4bfe-899a-609fb75b1e3f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:33:32','2025-12-17 07:33:32','2025-12-17 07:33:32'),('4efe52ff-79e6-427d-8c5f-b9bb8361daee','c73bdcff-5fb0-4d23-9f82-62bdce1e15fc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:20:42','2025-12-16 13:20:42','2025-12-16 13:20:42'),('4fbea1f5-a69f-4c31-a256-5ba6f0429e92','bbf011d3-08b4-454d-a8b5-f246b5bb3759','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:03:47','2025-12-31 04:03:47','2025-12-31 04:03:47'),('5010e1c9-cd37-4dec-9f5a-6405ed2938de','94367287-7ed5-44a4-8602-d9c6732ce501','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:18:39','2025-12-16 12:18:39','2025-12-16 12:18:39'),('501c5514-b9a8-4567-8118-c81489a0ba6f','814c21fa-95f6-4541-97f9-f0c83040c25f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:20:15','2025-12-16 12:20:15','2025-12-16 12:20:15'),('50750362-4672-410b-a6bd-5f60738b673b','4436aad2-6514-4419-a2e8-0b2190d001cd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:10:27','2025-12-16 13:10:27','2025-12-16 13:10:27'),('5100f00e-25d1-4696-8129-338fb4f57833','9e2435bd-2822-49c6-8358-7db2310aaedb','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:09:10','2025-12-17 11:09:10','2025-12-17 11:09:10'),('517806ff-862c-4577-986e-acaa5d5e014c','6d81c0a1-575e-47e2-a71a-ed2e76b0048b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:47','2025-12-17 07:36:47','2025-12-17 07:36:47'),('517bfb09-4192-4f11-a6bb-1785655ffc88','ece39c36-9ca5-4fbe-9953-3e4b98be58b8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:26:13','2025-12-31 08:26:13','2025-12-31 08:26:13'),('51cc79a2-a714-458b-bdaa-833dbeebeb5c','8aa5ca7e-3217-42c9-9754-4517d9125508','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:35:27','2025-12-16 14:35:27','2025-12-16 14:35:27'),('51edfc7c-bd25-4e86-8eed-a638c1a5b169','d5ed3e2e-1329-45cf-b514-dac4452b18fd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 10:16:11','2025-12-17 10:16:11','2025-12-17 10:16:11'),('521a97b4-4a73-45f1-82ca-9ae6795ce670','71fdc289-af52-43dd-98af-e251126d96b4','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-30 12:24:51','2025-12-30 12:24:51','2025-12-30 12:24:51'),('523027e4-bcce-4f7e-b5de-9bd0b62d0e8b','db1b727e-75ef-4bbd-9417-64d13fb993f8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:22:40','2025-12-31 08:22:40','2025-12-31 08:22:40'),('523fabda-be75-4bfb-a83d-0942f49fb5c0','bbea81db-a256-408a-83c2-161bcdb171f7','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:18:32','2025-12-16 14:18:33','2025-12-16 14:18:33'),('5246f408-8a00-47e5-a84b-f443f057b29d','f59c149c-920e-4fe2-a549-207b2cedac47','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:21:26','2025-12-16 14:21:26','2025-12-16 14:21:26'),('524d2d35-ebb6-40a8-831e-b794e441eb8d','2a52a948-ae1f-49d9-bd42-58e3bf89f402','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 14:31:37','2025-12-31 14:31:37','2025-12-31 14:31:37'),('52552f01-ff27-4fdc-aa08-d082423480dc','b003f86f-4a0f-490c-aacc-9eec17ffa6dd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:45','2025-12-31 02:12:45','2025-12-31 02:12:45'),('5267caf7-e435-4de4-925e-0b22053b20ef','7c78675c-f3d0-412f-93b3-4f8f1fb8c8f0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:35:49','2025-12-31 04:35:49','2025-12-31 04:35:49'),('52ad7dbf-5760-441e-9721-fd50dda59223','e4e1b7f4-1aaf-4ea0-93c5-94b7992a24e9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:36:29','2025-12-16 14:36:29','2025-12-16 14:36:29'),('52f35ee3-3ae9-4919-8178-a43d341a28f1','7ddd25fb-23f7-4fc0-8f90-705849bf95dc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:28:40','2025-12-16 14:28:40','2025-12-16 14:28:40'),('5316fc2e-5b56-483d-bc8e-9dd065bb65e4','831b5005-fcba-44bc-b089-6bb611fa9fe5','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:41:01','2025-12-31 14:41:01','2025-12-31 14:41:01'),('532e72b9-27c9-41c2-ab98-653064d094c6','25ebd46b-9ea2-4874-b86b-1e48d631dd0b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:45:30','2025-12-31 05:45:30','2025-12-31 05:45:30'),('539b3450-ae46-4b5b-9370-172c31c73f8f','3a90ceec-1aa7-46ab-8136-697d0f012109','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2026-01-01 15:44:52','2026-01-01 15:44:52','2026-01-01 15:44:52'),('543b5db5-fbe4-4fcc-bf4a-3a88cbce95a0','98d08f95-8b16-4f5f-87c5-eb1e12df1669','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 03:59:46','2025-12-17 03:59:46','2025-12-17 03:59:46'),('54519aff-6381-43ec-aae3-cb81a66e0d57','9cac8fa8-8d1e-447c-85e6-b89487147025','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:10:39','2025-12-31 06:10:39','2025-12-31 06:10:39'),('545878af-0a26-435b-a626-074e40d128ef','ece39c36-9ca5-4fbe-9953-3e4b98be58b8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:22:41','2025-12-31 08:22:41','2025-12-31 08:22:41'),('54662729-4435-4387-bd51-dad06cd02a0d','8ad89a75-cac7-40f2-8bf1-7556da67f6fd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 03:57:14','2025-12-31 03:57:14','2025-12-31 03:57:14'),('547f71dd-a1cd-49ed-a89e-86e88d9bcee9','0c1179b7-0a43-4c5f-8b2a-16d5b8f1f82c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:29:33','2025-12-17 07:29:33','2025-12-17 07:29:33'),('54851593-96e8-4d23-bf35-1f1be7a5097c','7ddd25fb-23f7-4fc0-8f90-705849bf95dc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:28:09','2025-12-16 14:28:09','2025-12-16 14:28:09'),('54a2fac6-4d5e-4d78-bcd7-31517407d638','865c5585-e2ed-45e1-bba3-53951a71a73e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:31:56','2025-12-16 13:31:56','2025-12-16 13:31:56'),('54ef0e80-3f24-47d6-8c32-28eace52d3d2','0d636ec6-d28f-4a1e-924e-1c8e03ed572b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:35:48','2025-12-31 04:35:48','2025-12-31 04:35:48'),('550c7556-b433-4612-945e-a3f9e7fb58bc','ec635ca2-62a2-4be0-ba07-9b72757f9ede','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-05 07:40:23','2026-09-05 07:40:23','2026-09-05 07:40:23'),('555194bf-a727-4ebf-bfe6-fef976a62a1c','865c5585-e2ed-45e1-bba3-53951a71a73e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:35:22','2025-12-16 13:35:22','2025-12-16 13:35:22'),('55c62ba4-ee5f-42ce-b159-692d3ec8c5ab','33861e74-4e23-4f84-bbe4-558ebcc4da0e','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:41:00','2025-12-31 14:41:00','2025-12-31 14:41:00'),('55d24162-c7ef-47c8-a8ef-867aed2fa23a','948f0e69-c414-4cc3-a3a0-403e57304c43','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:25:41','2025-12-31 06:25:41','2025-12-31 06:25:41'),('5607688b-575f-4d2a-8fd4-30349c0c9819','7c78675c-f3d0-412f-93b3-4f8f1fb8c8f0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:52:10','2025-12-31 04:52:10','2025-12-31 04:52:10'),('5675bf83-27d0-4ef6-b6b0-f04e816079b7','ba0cae45-1b05-4f13-894b-b0d5e48cb0a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 13:11:57','2025-12-17 13:11:57','2025-12-17 13:11:57'),('56867c42-a222-4721-9929-f783173bc2fc','96473d9f-109c-4446-9e79-f849b4782f6a','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:40:40','2025-12-16 14:40:40','2025-12-16 14:40:40'),('56e8d40b-683b-4166-ad9d-7d739858ca5b','ece39c36-9ca5-4fbe-9953-3e4b98be58b8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:26:13','2025-12-31 08:26:13','2025-12-31 08:26:13'),('57422be8-6dc8-4094-9240-ce0ceaddd0ea','814c21fa-95f6-4541-97f9-f0c83040c25f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:20:09','2025-12-16 12:20:09','2025-12-16 12:20:09'),('5744be3b-76f2-480d-b9aa-f13f63dc63d6','b466c161-ed6d-4540-8872-d8973aa87b18','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:03:19','2025-12-17 06:03:19','2025-12-17 06:03:19'),('576813ce-0bd6-44f5-b22d-377bea098b3b','60c55544-b0ab-4255-b501-af6965a0aa27','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:25:37','2025-12-16 14:25:37','2025-12-16 14:25:37'),('580e4e6a-dfd1-45fd-a531-8969272fc57d','e0f04034-2bb4-4a60-a75f-205a078e2618','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:51:08','2025-12-16 13:51:08','2025-12-16 13:51:08'),('581ee79d-0c49-4736-9aa1-f31bc8c93489','c65c4e20-da37-4736-ad59-4341c800f594','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:04:03','2025-12-17 02:04:03','2025-12-17 02:04:03'),('58355ff2-ac02-408b-b860-17406e829056','79ddefb5-a30d-4118-8bd5-6cf51371fb5c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:40','2025-12-31 05:54:40','2025-12-31 05:54:40'),('583888c4-be49-446d-b807-290f1f859857','8181a722-9702-41ba-abad-6ad71dd006ba','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:06:46','2025-12-17 02:06:46','2025-12-17 02:06:46'),('587017b0-1cbf-4c10-b3a7-c43b30d728e4','c88ebd2c-bf5e-4dfe-9ff3-5222b7e5d0fb','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-15 17:10:15','2025-12-15 17:10:15','2025-12-15 17:10:15'),('5886157f-ff70-49ab-bcba-53e331fefd11','37ed0181-94c1-40cf-88fe-395416f7dbef','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:01:35','2025-12-17 07:01:35','2025-12-17 07:01:35'),('58a0ea6d-8d2f-4a63-856d-6f8180d77977','abdc0e1a-6e9d-4a9c-aaec-12e707045ae2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:01:50','2025-12-17 07:01:50','2025-12-17 07:01:50'),('58adb604-908e-45f4-9fd5-2887eeefd651','7885b209-2134-4605-8684-451ddf7cc535','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:04:18','2025-12-17 06:04:18','2025-12-17 06:04:18'),('58f8995b-5334-4ebe-b7b3-b587b941b466','e0a932e9-d1a5-4a70-8ded-b0215ca6b783','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:42:12','2025-12-16 14:42:12','2025-12-16 14:42:12'),('59393414-024b-4c1d-9712-c939881fd1cb','61036518-5928-473c-b46e-c2e2d68caecd','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:42:13','2025-12-16 14:42:13','2025-12-16 14:42:13'),('599ebd56-8efb-4287-9bb6-883bb1b8fd4a','b080d858-fa50-4bfe-97aa-1a1ee6ec4012','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:40:46','2025-12-31 14:40:46','2025-12-31 14:40:46'),('59d74cc9-ffe2-4710-8bcd-9f5d6e0397bb','9f722b95-009a-4876-9e9e-6522eef25412','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 14:31:36','2025-12-31 14:31:36','2025-12-31 14:31:36'),('5a890b18-a8bd-4e8e-94a3-55317894a903','db48d5c6-28ad-4899-99eb-8ca928be158e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:15:53','2025-12-16 14:15:53','2025-12-16 14:15:53'),('5aa975d4-6c7a-4a60-be33-92e821a171e9','3c1f89e3-4a75-4f2d-a2a5-8540b611315a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:05:02','2025-12-17 07:05:02','2025-12-17 07:05:02'),('5ab6dd84-d2a6-47a1-896f-014d75eb9a28','0b1880c4-f141-4845-86b4-86d0e838e897','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:05:54','2025-12-31 08:05:54','2025-12-31 08:05:54'),('5ae6da2e-14bf-48e1-8248-bfa737661899','f226db02-7b36-43aa-8327-622c441ed672','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 04:49:06','2025-12-16 04:49:06','2025-12-16 04:49:06'),('5b166d04-d137-4bcf-8025-0e57ed71b7da','9a724947-d218-4acf-b33a-62bee94447a4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:17:58','2025-12-16 12:17:58','2025-12-16 12:17:58'),('5b382a61-e3da-4eab-88f3-d9260dedebbf','6f44d861-a661-47d3-bc3a-9d836b7b95f0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:09:05','2025-12-17 11:09:05','2025-12-17 11:09:05'),('5ba3be3e-17e6-4148-a936-3c5c8e387b03','976b0b1d-6fc2-43f3-98f9-8c52316712f9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 07:46:22','2025-12-26 07:46:23','2025-12-26 07:46:23'),('5c102f05-9875-4166-81c6-b5262d79db1b','e0a932e9-d1a5-4a70-8ded-b0215ca6b783','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:42:12','2025-12-16 14:42:12','2025-12-16 14:42:12'),('5c463658-e906-42fe-9182-c9ef618dbecd','e472fb86-65c1-489b-9f70-44517850a7a5','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:31:22','2025-12-16 14:31:22','2025-12-16 14:31:22'),('5c515f3c-d0c8-4443-866b-ceec2083be4f','ba0cae45-1b05-4f13-894b-b0d5e48cb0a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 13:11:57','2025-12-17 13:11:57','2025-12-17 13:11:57'),('5c88942b-f77f-48dd-81d9-e6aa095c551e','990f3976-fad2-46a5-b342-57225227deac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 10:16:10','2025-12-17 10:16:10','2025-12-17 10:16:10'),('5c90bf0f-2ffe-43b0-ba47-008a4f61b90a','a925c1f1-3081-477f-b9f7-4fe8342b3dba','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:13:18','2025-12-16 02:13:18','2025-12-16 02:13:18'),('5ccda60b-fa9e-44ce-b0c4-3f36b96f67b4','f71da1e8-cdc8-49b8-ab8d-0a84dae4f0a0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:39','2025-12-31 05:54:39','2025-12-31 05:54:39'),('5ce8baf9-7061-4563-9815-9937d3cf84c2','675fd1f0-0456-4f60-8f21-dc5861323540','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:38','2025-12-17 07:38:38','2025-12-17 07:38:38'),('5ceb4d52-8db8-411a-b9e6-3071df9ebe34','c1798abb-cff2-4168-a7d2-178639036bfb','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-14 14:49:39','2025-12-14 14:49:39','2025-12-14 14:49:39'),('5cf6d6b3-92f6-4d34-ae2d-c604eee33193','c7057a30-db2c-4f71-8040-0583c3827a0c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:08:13','2025-12-17 11:08:13','2025-12-17 11:08:13'),('5d122604-07ce-44b5-b52f-34bf5ca8ee83','675fd1f0-0456-4f60-8f21-dc5861323540','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:48','2025-12-17 07:38:48','2025-12-17 07:38:48'),('5d3c5371-7e34-461e-9a82-d05487af829b','990f3976-fad2-46a5-b342-57225227deac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 10:16:10','2025-12-17 10:16:10','2025-12-17 10:16:10'),('5e1e52ad-68ed-41d0-9f71-1ef22c65cf9f','9b62b42d-5122-41c0-ab59-6fb479cd300f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:17','2025-12-17 02:01:17','2025-12-17 02:01:17'),('5e941a70-589c-468c-a089-4f5a19252d62','121a686c-d1fa-4bdc-b8d3-f8e63ab9d1b3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:59:12','2025-12-17 07:59:12','2025-12-17 07:59:12'),('5eedf1f1-fd51-4dc8-89db-24e79bd00477','a4502205-6ae9-41f0-9d86-14f78813797f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:15:51','2025-12-16 14:15:52','2025-12-16 14:15:52'),('5f0633c2-9f1c-4087-b87b-85d2979d7267','11c16b3b-852c-41ab-befb-69ae75f2ca79','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:29:55','2026-10-01 10:29:53','2026-10-01 10:29:53'),('5f084706-feea-42b6-897b-c92dc752f5b0','95f6b22f-98a0-4266-a9c8-74aff556f32a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:07:14','2025-12-31 04:07:14','2025-12-31 04:07:14'),('5f49f40e-1aa4-4148-8faf-055f2fc2b8ed','6019fce4-f9cc-44d8-a97e-db9f1419513a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:49:24','2025-12-31 05:49:24','2025-12-31 05:49:24'),('5fafc199-f527-463c-be44-514a25b7944b','f59c149c-920e-4fe2-a549-207b2cedac47','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:21:26','2025-12-16 14:21:26','2025-12-16 14:21:26'),('60071927-c0f5-4a7b-a02d-863fd98b0fcf','abdc0e1a-6e9d-4a9c-aaec-12e707045ae2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:01:50','2025-12-17 07:01:50','2025-12-17 07:01:50'),('600d2b2b-df4f-4450-9e4f-589904763dd5','27e5204a-9daa-4528-ba63-ac69b5d67936','61796564-4a39-457e-a218-1a4dc9bd5f22','2026-09-05 03:11:17','2026-09-05 03:11:17','2026-09-05 03:11:17'),('60468256-b408-43be-a854-8cd99af4b967','5b18f413-c689-4bc2-9f6c-e414c24e067c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:26:29','2025-12-30 17:26:29','2025-12-30 17:26:29'),('607f87a7-cf00-45c7-9cda-a1478f3f66e3','a4502205-6ae9-41f0-9d86-14f78813797f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:15:52','2025-12-16 14:15:52','2025-12-16 14:15:52'),('6136810a-89c2-4ada-9189-100d129f17f0','269a9a84-287b-4ca4-8d1c-93241fd2d655','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:38:28','2025-12-16 13:38:29','2025-12-16 13:38:29'),('61c6a3e8-f1b6-420c-9395-a196760d9885','e3661cdf-c684-4094-b75b-eaf3cf26850f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:47:51','2025-12-16 14:47:51','2025-12-16 14:47:51'),('620bd423-27c2-41e9-8aae-02620fe98599','c7057a30-db2c-4f71-8040-0583c3827a0c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:44','2025-12-17 07:36:44','2025-12-17 07:36:44'),('625d790c-99d8-46e1-9a9e-196085574277','ece39c36-9ca5-4fbe-9953-3e4b98be58b8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:22:41','2025-12-31 08:22:41','2025-12-31 08:22:41'),('6274dfe9-50a0-433c-9aee-6987929e9ceb','5f048c97-b1b4-4332-9a38-59dd48b0dcb6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:00:15','2025-12-17 07:00:15','2025-12-17 07:00:15'),('628d6e1d-fa34-4fba-b099-19e31539b0c3','b466c161-ed6d-4540-8872-d8973aa87b18','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:34','2025-12-17 07:36:34','2025-12-17 07:36:34'),('629bd5d0-7897-4b69-b62a-6c1d9343af04','6448382e-2278-4ab8-96bd-67faea3ba680','eceba0d7-3225-492d-a1e9-04f609ff9571','2025-12-30 12:13:38','2025-12-30 12:13:38','2025-12-30 12:13:38'),('62d6cd59-42c4-497d-8372-0ce345c0f45d','7885b209-2134-4605-8684-451ddf7cc535','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:03:58','2025-12-17 06:03:58','2025-12-17 06:03:58'),('63b85a1a-479e-43ab-a8d2-93871adbfb4f','ede10a4e-323b-4267-8320-9af1e538c58c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:07:17','2025-12-17 02:07:17','2025-12-17 02:07:17'),('63baf561-6dab-4d28-a857-832b14f22447','ac607fc6-1775-4615-b7d6-e7aabbf3c2d6','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:39:54','2025-12-31 14:39:54','2025-12-31 14:39:54'),('63cb2b9e-f94b-4ee5-b9dd-367662caaaa1','4f37b0b7-21d8-414d-a00a-df16acd9f2ad','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:36:00','2025-12-16 14:36:00','2025-12-16 14:36:00'),('63d1de04-4ee1-455b-8590-aa8962d1de8f','64ac7a42-2306-4b0a-a1bf-119310f08ff6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:41:31','2025-12-31 06:41:31','2025-12-31 06:41:31'),('63fd7b91-1b06-4df5-965c-82e4466195c2','33652329-f6cf-424e-b76f-703747b4b88a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:26:28','2025-12-30 17:26:28','2025-12-30 17:26:28'),('640942b9-9f8d-46d3-aec7-67dea8832070','ede10a4e-323b-4267-8320-9af1e538c58c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:07:17','2025-12-17 02:07:17','2025-12-17 02:07:17'),('641885c8-d1be-4f09-ad3c-3f53034b4a1a','814c21fa-95f6-4541-97f9-f0c83040c25f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:20:02','2025-12-16 12:20:02','2025-12-16 12:20:02'),('6432d93f-5439-4cad-b820-eaaff6fc0516','c24f95b6-5f65-4fb4-a34c-318d9faca6e6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:04:09','2025-12-16 13:04:09','2025-12-16 13:04:09'),('64487c8e-8792-408f-8133-556d269f2af1','9438b962-b666-4bf9-a774-7a1709dde2fd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:31','2025-12-31 02:12:31','2025-12-31 02:12:31'),('64536956-7182-448b-876f-93869cafa1af','3e011570-22eb-4d5c-95d2-7cf5d2e61322','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:19:23','2025-12-16 02:19:23','2025-12-16 02:19:23'),('64537a14-2b29-4727-929d-24abed48eb52','8b95850a-0ce7-430c-bc4b-99d563db0111','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:21:21','2025-12-16 14:21:21','2025-12-16 14:21:21'),('6458138f-b75d-4038-9b3a-a8b7e277de11','7fdcc95b-6474-4f07-9d90-8724bad01a50','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:49:17','2025-12-16 13:49:17','2025-12-16 13:49:17'),('646ee2ab-4cdf-459a-9a34-32eab37de8e3','f9442f2a-a984-41e5-88a2-3d369cf51bd3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:15:03','2025-12-16 13:15:03','2025-12-16 13:15:03'),('65364469-255e-4bbf-8fec-124d4e6090cd','2466be8f-1730-4724-a010-59f9cbc110d9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:55:44','2025-12-16 13:55:44','2025-12-16 13:55:44'),('65373252-cf27-4206-9ba7-403539a78160','a61345d4-cf93-4315-b576-a077cd21e346','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:03:17','2025-12-17 02:03:17','2025-12-17 02:03:17'),('654b5828-51c8-47a1-99e5-51db5a63405b','f2af311e-e6b3-4c72-8e14-60a9cfc8da73','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:48:20','2025-12-16 12:48:21','2025-12-16 12:48:21'),('6582dcfc-9424-4e6b-80fc-79ff0a59cb31','f9442f2a-a984-41e5-88a2-3d369cf51bd3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:15:03','2025-12-16 13:15:03','2025-12-16 13:15:03'),('65d31549-4b65-456a-b206-900abee98ec2','8ad89a75-cac7-40f2-8bf1-7556da67f6fd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 03:57:14','2025-12-31 03:57:14','2025-12-31 03:57:14'),('65eebed4-4249-4d19-818d-9d215ab1eab5','c7057a30-db2c-4f71-8040-0583c3827a0c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:08:13','2025-12-17 11:08:13','2025-12-17 11:08:13'),('66bae800-cae7-4f2f-ba9e-fe13760acc4f','33652329-f6cf-424e-b76f-703747b4b88a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:26:28','2025-12-30 17:26:28','2025-12-30 17:26:28'),('671bea32-0e03-4a8b-a790-798bb9e030db','ef2a9681-7653-4c0c-af66-80f771f58587','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:30:26','2025-12-16 14:30:26','2025-12-16 14:30:26'),('676283fb-4024-4197-84cf-baeb7e18cff5','55995966-f767-4b30-89e0-8def248bd9f4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:32:19','2025-12-20 13:32:19','2025-12-20 13:32:19'),('67d1500d-02b3-4874-9c8c-4c60b7f01794','76238fa3-04cd-45cf-a478-1ae9d6b6827c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:30:46','2025-12-16 14:30:46','2025-12-16 14:30:46'),('68198a66-1d0e-4266-939a-0022c1beae45','6f19d64b-91e6-47d1-a855-c754f415d69d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 15:13:56','2025-12-31 15:13:56','2025-12-31 15:13:56'),('6857d1a7-eac6-4696-8278-696f7a88ae69','7885b209-2134-4605-8684-451ddf7cc535','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:04:18','2025-12-17 06:04:18','2025-12-17 06:04:18'),('68c1a32d-bf51-4457-9489-89cacad708d1','6f0c06e4-eb39-400c-85e2-65d0f106a0a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:03:30','2025-12-17 02:03:30','2025-12-17 02:03:30'),('6913c0a4-9f02-4180-9f95-5dadbee2c64b','7d206b8e-8957-4b6d-85ac-ce23da9e29f9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:31:25','2025-12-31 06:31:25','2025-12-31 06:31:25'),('691bdb99-1fe3-43a1-b1da-2ce020ef74e9','b466c161-ed6d-4540-8872-d8973aa87b18','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:03:19','2025-12-17 06:03:19','2025-12-17 06:03:19'),('69c1c892-ba16-4b34-9359-342d89884762','747ba0fa-8673-4f28-b9e8-269f584de5d3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:00:23','2025-12-31 04:00:23','2025-12-31 04:00:23'),('69c30e7b-e437-4f90-8cea-b55c1b75a9d1','1f120ccc-77ea-4c52-a53f-6904ba36ae6a','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-30 12:24:50','2025-12-30 12:24:50','2025-12-30 12:24:50'),('69c98495-adcb-4465-84b8-395e54e47614','2495e0a6-a94f-4944-bd9f-7cf58930430e','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:15:25','2025-12-16 14:15:25','2025-12-16 14:15:25'),('6a1dea9c-f53c-43ce-b6f8-81f9832557d2','67d3807d-1598-4256-8b27-d0f3e217c21d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:03:59','2025-12-17 04:03:59','2025-12-17 04:03:59'),('6a4f4a5e-d004-4586-9798-b3a5f1ce81ba','675fd1f0-0456-4f60-8f21-dc5861323540','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:38','2025-12-17 07:38:38','2025-12-17 07:38:38'),('6a7b8f8c-1c0e-4adc-b0ec-39710f3d6a3b','a74da425-b84b-48e4-99ab-881889dbe848','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:27:18','2025-12-30 17:27:18','2025-12-30 17:27:18'),('6a82896e-de91-4f83-b555-59be7c610ade','96473d9f-109c-4446-9e79-f849b4782f6a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:47:27','2025-12-16 14:47:27','2025-12-16 14:47:27'),('6a94a707-c50d-4628-bced-67d41ec0cdcb','6a39ead8-1696-418a-82d1-1f78cee4aa5b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:37:04','2025-12-16 13:37:04','2025-12-16 13:37:04'),('6acedbc6-ee00-4a44-9f57-f0cd868315da','019d7b97-1280-4200-a964-a397bbfb3a4c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:15:07','2025-12-16 12:15:08','2025-12-16 12:15:08'),('6ad95671-fefd-4d87-8bdb-af32f5f12e2f','7fdcc95b-6474-4f07-9d90-8724bad01a50','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:48:35','2025-12-16 13:48:36','2025-12-16 13:48:36'),('6afb618d-c41f-400e-8a6f-2c8268a61d3f','838ba1c2-c029-4ace-b2eb-eb376ea34184','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:50:51','2025-12-16 13:50:51','2025-12-16 13:50:51'),('6b0a7a6e-1657-46a1-a01e-6deb9b4500fa','58768460-fffd-498f-9d9f-616ce0280c02','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:58:09','2025-12-16 13:58:09','2025-12-16 13:58:09'),('6b6d1756-0f2a-47aa-8827-a03e8d47be45','6f0c06e4-eb39-400c-85e2-65d0f106a0a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:03:30','2025-12-17 02:03:30','2025-12-17 02:03:30'),('6b7d92bb-0b4f-4d39-be59-3cb656eb4cde','948f0e69-c414-4cc3-a3a0-403e57304c43','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:25:41','2025-12-31 06:25:41','2025-12-31 06:25:41'),('6bd64ff7-5a73-48f7-ba7f-ad8faa6a4836','0c8406f7-b1d6-45d0-8338-ee079c7d6551','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:44','2025-12-31 02:12:44','2025-12-31 02:12:44'),('6c18022a-7c61-4b00-811f-9cb85bcb609b','6f19d64b-91e6-47d1-a855-c754f415d69d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 15:13:56','2025-12-31 15:13:56','2025-12-31 15:13:56'),('6c48bff7-831a-48fe-bfdf-a307889aaddc','ef4feed6-4dcc-41e0-8a9d-9a6bf7cbf984','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:55:05','2025-12-17 07:55:05','2025-12-17 07:55:05'),('6c5207df-d05f-43d7-a763-bf4d65f28c75','7fdcc95b-6474-4f07-9d90-8724bad01a50','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:49:25','2025-12-16 13:49:25','2025-12-16 13:49:25'),('6c728ba5-8634-4242-bbf7-53e2774c5876','a477a953-67e3-4736-9fce-cb516ba69d44','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:45:28','2025-12-31 05:45:28','2025-12-31 05:45:28'),('6c782751-3108-4a98-8788-f607e6ebd636','9602e638-c41c-4070-a44f-9681554b6bf4','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:41:26','2025-12-16 14:41:26','2025-12-16 14:41:26'),('6cf8cf1e-32e9-4cb5-8290-a06fd74943b2','9a29c581-7610-40fc-ac63-7c4a9ebb6571','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:19','2025-12-31 05:54:19','2025-12-31 05:54:19'),('6d58695d-4d1a-473f-b958-ec3d57717e95','2a9a88d7-5c48-425f-8d64-ba4ff979fb5e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:27','2025-12-17 07:38:27','2025-12-17 07:38:27'),('6d7f81bb-4bf2-464a-bd3e-acc4a7c9c2da','004aa27f-0a68-437f-b1b7-2954b7f63441','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:39:53','2025-12-31 14:39:53','2025-12-31 14:39:53'),('6d865ec8-f356-4c0c-804c-445d7bb00cea','71fdc289-af52-43dd-98af-e251126d96b4','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-30 12:24:51','2025-12-30 12:24:51','2025-12-30 12:24:51'),('6d885c6d-8ef5-4fe2-acf0-58da92ed9dcf','93d76b8d-e41f-4f31-892e-6cd449692db1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:08:59','2025-12-16 14:08:59','2025-12-16 14:08:59'),('6db7897d-7755-4abe-8ab7-595afc61acda','8a92fb37-bec2-4b80-a20b-79ca21758b34','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:29:16','2025-12-16 14:29:16','2025-12-16 14:29:16'),('6db80f92-6e03-4201-b07f-7658f9405bc5','ef4feed6-4dcc-41e0-8a9d-9a6bf7cbf984','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:49','2025-12-17 07:38:49','2025-12-17 07:38:49'),('6e9f06d9-c326-4633-b01a-c01f256f3929','60c55544-b0ab-4255-b501-af6965a0aa27','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:25:37','2025-12-16 14:25:37','2025-12-16 14:25:37'),('6ea253b4-a9ca-44f6-a478-c638d795425a','b3d53a9d-dc45-4039-93eb-f02a5135743c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:58:33','2025-12-16 13:58:33','2025-12-16 13:58:33'),('6eb6d12a-4d13-4f87-a1c2-79728b04e70c','b3d53a9d-dc45-4039-93eb-f02a5135743c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:59:19','2025-12-16 13:59:19','2025-12-16 13:59:19'),('6edae627-4c55-4381-a9fa-24c7065c9d8e','7760e63a-19c7-4497-830c-1193765db760','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:09:00','2025-12-16 14:09:00','2025-12-16 14:09:00'),('6efdaf72-f948-47cf-826a-b9383d51199d','7189e59f-76c5-43b6-a9c4-d31e5c66cf4c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:30:05','2025-12-17 07:30:05','2025-12-17 07:30:05'),('6f7a91ae-15cf-4ecd-9e1e-02a0374d6a36','ba0cae45-1b05-4f13-894b-b0d5e48cb0a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:12:15','2025-12-17 11:12:15','2025-12-17 11:12:15'),('70169e2a-7a58-4f81-ae2a-e04a92c56e1d','865c5585-e2ed-45e1-bba3-53951a71a73e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:27:26','2025-12-16 13:27:26','2025-12-16 13:27:26'),('70401f66-b241-45b9-9024-b7d6aed0bb2d','831b5005-fcba-44bc-b089-6bb611fa9fe5','61796564-4a39-457e-a218-1a4dc9bd5f22','2026-09-05 03:10:09','2026-09-05 03:10:09','2026-09-05 03:10:09'),('7048d2a7-c93d-4c76-a5ba-2c82713a5de0','5a66415b-07fb-4395-9719-c72397728254','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:19:28','2025-12-16 02:19:28','2025-12-16 02:19:28'),('7057e31c-9c93-45ff-9a3a-e551d1b4667e','814c21fa-95f6-4541-97f9-f0c83040c25f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:20:06','2025-12-16 12:20:06','2025-12-16 12:20:06'),('709076f4-8f5d-472e-a4dc-2e2cee3c6cdd','3a90ceec-1aa7-46ab-8136-697d0f012109','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2026-01-01 15:44:52','2026-01-01 15:44:52','2026-01-01 15:44:52'),('70b8b268-4d5d-43ef-8777-44c28237f899','ede10a4e-323b-4267-8320-9af1e538c58c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:07:03','2025-12-17 02:07:03','2025-12-17 02:07:03'),('71483aff-baa0-4e1f-8fb1-af7f0973d150','3c1f89e3-4a75-4f2d-a2a5-8540b611315a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:01:51','2025-12-17 07:01:51','2025-12-17 07:01:51'),('716cc60d-d5db-4840-80eb-6935f3a7a695','6d81c0a1-575e-47e2-a71a-ed2e76b0048b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:48','2025-12-17 07:36:48','2025-12-17 07:36:48'),('717bb541-f4d7-4a04-a535-89d917114aa5','9a29c581-7610-40fc-ac63-7c4a9ebb6571','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 03:56:17','2025-12-31 03:56:17','2025-12-31 03:56:17'),('71edb1ad-a7e4-416d-bd4f-12e4a80412cb','7760e63a-19c7-4497-830c-1193765db760','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:11:55','2025-12-16 14:11:55','2025-12-16 14:11:55'),('72413f68-60c8-4c19-b3cd-c9db53fac1f6','938e4eb6-fbe8-4756-af9d-09545609b5b8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:07:02','2025-12-17 02:07:02','2025-12-17 02:07:02'),('72916d4f-fe7b-4886-b296-ecd5f8e290fc','003d374c-0aa0-4e05-9a55-ba42df54965c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:53:53','2025-12-31 04:53:53','2025-12-31 04:53:53'),('7298ebe2-7650-41dd-863d-2bf73f26a159','110ae15d-897b-44be-8fb2-fa1a572d6b58','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 07:46:21','2025-12-26 07:46:21','2025-12-26 07:46:21'),('72a3828d-1561-4596-88c4-40447382b06d','bbbba7e4-94de-4f35-8de9-065b11b4bf9c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:16:16','2025-12-16 02:16:16','2025-12-16 02:16:16'),('72aadee6-f510-4d0b-99ce-9c7985592bb9','58768460-fffd-498f-9d9f-616ce0280c02','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:57:46','2025-12-16 13:57:46','2025-12-16 13:57:46'),('72c32566-16eb-4993-b6b6-f44ecccd960b','2d78471c-ac6e-47e6-8a3e-6d2c30d7ffc2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-14 14:42:31','2025-12-14 14:42:31','2025-12-14 14:42:31'),('72dfc5b9-aa64-4401-a9f3-5f220836e7b4','ac607fc6-1775-4615-b7d6-e7aabbf3c2d6','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:39:54','2025-12-31 14:39:54','2025-12-31 14:39:54'),('736fee6b-6f45-4ebd-881c-08a1df800393','ece39c36-9ca5-4fbe-9953-3e4b98be58b8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:26:13','2025-12-31 08:26:13','2025-12-31 08:26:13'),('73974156-362b-4813-bf9b-cbfe89f4a94e','2a9a88d7-5c48-425f-8d64-ba4ff979fb5e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:37:24','2025-12-17 07:37:24','2025-12-17 07:37:24'),('73a81cc4-2c1b-460b-8a93-71a441b493b7','a4f308eb-fd74-4956-aeb0-5c025e929e24','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:51:21','2025-12-16 13:51:21','2025-12-16 13:51:21'),('73e6ecfa-07e1-4aa0-ae66-a86cb45f9981','9b62b42d-5122-41c0-ab59-6fb479cd300f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:32','2025-12-17 02:01:32','2025-12-17 02:01:32'),('73eec4a2-a363-4e5b-8599-28a0073540f5','c1e13256-9470-4ab4-8d0c-23d5ff53c0cc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:00:18','2025-12-16 02:00:18','2025-12-16 02:00:18'),('74f3b92c-cfde-422a-94cb-1381016989f3','ca0e3862-5aff-437d-8aa2-276aa394d51c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:58:51','2025-12-31 05:58:51','2025-12-31 05:58:51'),('754ab9f8-f619-421c-90e9-56fbd00a55ff','ca0e3862-5aff-437d-8aa2-276aa394d51c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:10:38','2025-12-31 06:10:38','2025-12-31 06:10:38'),('757aab87-9be4-4b2c-9c5e-7bb491d6613e','d5dcd4bc-abdf-418d-a68d-26077c5a2441','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2026-08-28 13:41:22','2026-08-28 13:41:22','2026-08-28 13:41:22'),('75e917ac-ffe7-4fb6-a0af-ca56e7a38090','96473d9f-109c-4446-9e79-f849b4782f6a','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:40:40','2025-12-16 14:40:40','2025-12-16 14:40:40'),('75ed2b13-12c3-44a1-a110-78288d48d7d8','6d81c0a1-575e-47e2-a71a-ed2e76b0048b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:35:29','2025-12-20 13:35:29','2025-12-20 13:35:29'),('7635241f-2b23-4a49-9b9a-aaf441a599f2','e472fb86-65c1-489b-9f70-44517850a7a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:35:26','2025-12-16 14:35:26','2025-12-16 14:35:26'),('765beb37-f537-44af-9354-f806a5800b0f','33861e74-4e23-4f84-bbe4-558ebcc4da0e','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:40:47','2025-12-31 14:40:47','2025-12-31 14:40:47'),('76636489-5a39-475e-a9da-d01784dfd4e8','f71da1e8-cdc8-49b8-ab8d-0a84dae4f0a0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:24','2025-12-31 05:54:24','2025-12-31 05:54:24'),('76f56c19-f300-4ce0-8fce-38795b904d9a','9ba43158-5b24-4c6f-a09f-81500220e34d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:37','2025-12-17 07:38:37','2025-12-17 07:38:37'),('777e4a04-b907-4040-a60d-9df453e4ed0e','3e6f89e6-f4ba-4d55-a699-c5b16d0ee966','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:28:30','2026-10-01 10:28:28','2026-10-01 10:28:28'),('77b1d071-7908-4d94-af0d-badb9e61c118','cc716dce-b978-4ce2-9689-bbdf44aa27a0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:58:33','2025-12-17 07:58:33','2025-12-17 07:58:33'),('77d2b28b-d5cb-4e8a-8643-c109a3f5afc9','2f304594-e93a-4dec-bbf8-731af26f9c6a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:07:28','2025-12-31 04:07:28','2025-12-31 04:07:28'),('786516e5-50ae-4e0a-99d3-b3d1083f83e8','dc30a8f5-b2bf-49f2-8896-8c13339ebd88','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 14:35:16','2025-12-31 14:35:16','2025-12-31 14:35:16'),('78e67c03-0b5e-4f6e-9bef-8cb5e686b214','413b6761-224b-4386-9fdd-f2bbe92514b0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:51:11','2025-12-17 06:51:11','2025-12-17 06:51:11'),('78ebb8c6-d0b9-47e5-a54b-6ada064e16c0','8e18874b-9ad0-470a-9f22-42843616b8ef','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:26:22','2025-12-30 17:26:22','2025-12-30 17:26:22'),('791d9aef-0bf9-4290-a9c3-674f0d7a52dc','23513fcc-213f-4348-8ffa-87953658ef79','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:48:16','2025-12-16 14:48:17','2025-12-16 14:48:17'),('7943e093-9f99-4dbe-8814-d54f33ef236b','e4c48d0f-3a6a-48c4-88bb-b972c653f5df','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-30 13:39:39','2026-09-30 13:39:39','2026-09-30 13:39:39'),('79c2b19b-827a-4b2b-b1c0-a668317100a8','2466be8f-1730-4724-a010-59f9cbc110d9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:55:17','2025-12-16 13:55:17','2025-12-16 13:55:17'),('79ebbad0-1d24-4b17-a88a-fd1641ecd550','bf2ff94a-40bc-4f22-bb4c-0d9852acecb0','61796564-4a39-457e-a218-1a4dc9bd5f22','2026-09-05 03:10:13','2026-09-05 03:10:13','2026-09-05 03:10:13'),('7a13397b-e9b7-4f37-8d0e-daffb1fa3ad0','865c5585-e2ed-45e1-bba3-53951a71a73e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:31:56','2025-12-16 13:31:56','2025-12-16 13:31:56'),('7a1b4590-ae43-4bf1-9f17-81deb2fbb6d4','fd524242-29dd-446a-8a1d-668a985304f7','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:26:34','2025-12-30 17:26:34','2025-12-30 17:26:34'),('7a29b5b1-812f-470b-a0f6-2ce5e648b804','9e2435bd-2822-49c6-8358-7db2310aaedb','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:09:10','2025-12-17 11:09:10','2025-12-17 11:09:10'),('7a37985d-ce05-4574-bb64-548ec60d983b','8346b36a-613a-4c8e-9fa1-ebf86a500f8c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 10:16:37','2025-12-17 10:16:37','2025-12-17 10:16:37'),('7a3ef774-ac92-44f5-9ba3-50c95ddf5397','993f3132-015d-4597-bcf0-c88c4219f7a2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:55:51','2025-12-16 13:55:51','2025-12-16 13:55:51'),('7aa3e9b3-2e41-49cd-abb1-6006f182d3d1','121a686c-d1fa-4bdc-b8d3-f8e63ab9d1b3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:59:22','2025-12-17 07:59:22','2025-12-17 07:59:22'),('7acd89d8-5bdc-43a2-bc16-e8e5469e9d8f','f59c149c-920e-4fe2-a549-207b2cedac47','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:21:26','2025-12-16 14:21:26','2025-12-16 14:21:26'),('7af7d537-218d-4660-8669-b88f3a4b4392','7ac5412b-7151-4086-a8da-a6e4a2c43a85','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:37:50','2025-12-17 07:37:50','2025-12-17 07:37:50'),('7b841af2-f9a5-4d6b-b167-d291cb1d0717','2466be8f-1730-4724-a010-59f9cbc110d9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:55:17','2025-12-16 13:55:17','2025-12-16 13:55:17'),('7be4dbe7-dd61-416a-9eea-096a72a93538','e472fb86-65c1-489b-9f70-44517850a7a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:35:26','2025-12-16 14:35:27','2025-12-16 14:35:27'),('7be93d5f-8f94-48ed-ad01-edcceca95f8b','ede10a4e-323b-4267-8320-9af1e538c58c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:07:17','2025-12-17 02:07:17','2025-12-17 02:07:17'),('7bf74dc2-2929-4a1b-b9d7-8066f77abe89','6d81c0a1-575e-47e2-a71a-ed2e76b0048b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:35:29','2025-12-20 13:35:29','2025-12-20 13:35:29'),('7c112888-5aa8-4ddc-9ab5-03d20b3f101e','0b1880c4-f141-4845-86b4-86d0e838e897','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:05:54','2025-12-31 08:05:54','2025-12-31 08:05:54'),('7c14ae00-8a60-4411-bc88-2513e8550561','d5ed3e2e-1329-45cf-b514-dac4452b18fd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 10:16:11','2025-12-17 10:16:11','2025-12-17 10:16:11'),('7c1b87cf-4669-4321-b2f1-7653666a4686','bee5e1e7-fbff-4c36-8e36-9bafb2181d09','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:51:01','2025-12-16 13:51:01','2025-12-16 13:51:01'),('7c4cc6c3-348b-437f-957a-3f4f36bdffec','67d3807d-1598-4256-8b27-d0f3e217c21d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:03:18','2025-12-17 06:03:18','2025-12-17 06:03:18'),('7cfca9b3-1462-4053-90cc-45e2cf20a01b','95a72116-bc77-4996-8920-10d2d11c3b19','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:58:59','2025-12-17 07:58:59','2025-12-17 07:58:59'),('7d12f137-d564-40f0-a945-e7f153373447','8bc25ca3-3618-4a71-b1a2-5b5ccfcfb15d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2026-08-28 13:41:19','2026-08-28 13:41:19','2026-08-28 13:41:19'),('7d31dafd-80a4-4b69-af2d-577bab82a760','4fa2428f-5fde-49f2-9f80-351c0a2dd5c0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 06:17:45','2025-12-16 06:17:45','2025-12-16 06:17:45'),('7d3c6260-3451-40ee-892c-e91f17bd5636','61036518-5928-473c-b46e-c2e2d68caecd','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:47:19','2025-12-16 14:47:19','2025-12-16 14:47:19'),('7d70b146-326b-47e2-b5a6-b783724a7f91','8ad89a75-cac7-40f2-8bf1-7556da67f6fd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 03:56:23','2025-12-31 03:56:23','2025-12-31 03:56:23'),('7e052a37-3e6c-4c53-9fbb-f4ae9663727c','ef4feed6-4dcc-41e0-8a9d-9a6bf7cbf984','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:55:05','2025-12-17 07:55:05','2025-12-17 07:55:05'),('7e2a9af1-dd54-4c23-b426-a6642274e1a5','0c1179b7-0a43-4c5f-8b2a-16d5b8f1f82c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:29:33','2025-12-17 07:29:33','2025-12-17 07:29:33'),('7e796b38-4d2a-4c73-a4eb-6d850f72ccdb','b3d53a9d-dc45-4039-93eb-f02a5135743c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:59:19','2025-12-16 13:59:19','2025-12-16 13:59:19'),('7ec676e1-edc2-409a-b2e9-5512ba71cecc','3926489c-7171-4afc-8427-10528fdd5385','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:28:28','2026-10-01 10:28:26','2026-10-01 10:28:26'),('7ef7aab6-f977-4234-ae5d-284daaa65a0f','a8497683-217a-4ba4-8434-4c1bfc4cbe8d','8720b484-8c4f-4377-9e16-d18a7d5901cc','2026-10-09 16:33:57','2026-10-09 16:33:57','2026-10-09 16:33:57'),('7f81fa1c-d4e1-4aae-9584-7804cd8de01b','019d7b97-1280-4200-a964-a397bbfb3a4c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:14:43','2025-12-16 12:14:43','2025-12-16 12:14:43'),('7f99db54-a670-4385-b3d9-b38e6c955997','5f048c97-b1b4-4332-9a38-59dd48b0dcb6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:59:33','2025-12-17 06:59:33','2025-12-17 06:59:33'),('7fdc1213-fff6-4d53-8232-29ce44cfa989','a6b7b064-ae55-4200-a7f3-d96d727c8954','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:16','2025-12-17 02:01:16','2025-12-17 02:01:16'),('8014f805-5962-418b-96c5-8519b3fa7953','6019fce4-f9cc-44d8-a97e-db9f1419513a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:58:50','2025-12-31 05:58:50','2025-12-31 05:58:50'),('806bad41-25f7-4227-8cdf-79da4dcb6856','a74da425-b84b-48e4-99ab-881889dbe848','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:27:18','2025-12-30 17:27:18','2025-12-30 17:27:18'),('80a72c73-d042-4265-98ea-b13f5f18c2ce','a51e88d8-5b40-4959-8e79-901ef38516a1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:47:52','2025-12-16 14:47:52','2025-12-16 14:47:52'),('80f6d87b-b4df-4135-9eca-0d9fd3bb5492','e472fb86-65c1-489b-9f70-44517850a7a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:35:26','2025-12-16 14:35:26','2025-12-16 14:35:26'),('8198f964-3bdf-4364-a6bd-49f1a2b00308','7d206b8e-8957-4b6d-85ac-ce23da9e29f9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:25:42','2025-12-31 06:25:42','2025-12-31 06:25:42'),('81b8473a-dc2f-48eb-905e-7c0faa8f603c','37ed0181-94c1-40cf-88fe-395416f7dbef','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:00:16','2025-12-17 07:00:16','2025-12-17 07:00:16'),('81ba1999-61a4-42b2-8721-67acd694cb1c','e0f04034-2bb4-4a60-a75f-205a078e2618','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:51:08','2025-12-16 13:51:08','2025-12-16 13:51:08'),('81c36aa4-1527-4aec-ad07-371f1775991c','bb7fc8f0-75c8-4361-9ca3-9409bef55760','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:43','2025-12-17 07:36:43','2025-12-17 07:36:43'),('81d72a6b-ae85-4c0e-8000-6e0acd21501c','a5acc285-0c3a-4231-a92d-567bd70c98d1','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-16 12:59:53','2026-09-16 12:59:53','2026-09-16 12:59:53'),('82076e05-50d7-4a75-9e42-1b793f03bf58','bce77d89-02eb-4651-b605-c86f9e70c60e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 14:35:15','2025-12-31 14:35:15','2025-12-31 14:35:15'),('82ac5fab-5686-4da9-92b7-ccae9d38a549','2b0d627e-6986-4087-b870-d8081bbc0097','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:00:33','2025-12-16 02:00:33','2025-12-16 02:00:33'),('82eecfce-5cb6-400a-b9a9-dc9ca6509011','004aa27f-0a68-437f-b1b7-2954b7f63441','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:39:53','2025-12-31 14:39:53','2025-12-31 14:39:53'),('831b2b82-297f-4892-b440-5d64ab5a5ca3','06feb165-1894-47ee-b224-1b05668e6750','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:33:33','2025-12-17 07:33:33','2025-12-17 07:33:33'),('83305f16-883e-4034-a0b3-b5d58effef7c','cee9c995-982c-452c-937d-49c457902cd5','8720b484-8c4f-4377-9e16-d18a7d5901cc','2026-10-09 16:34:00','2026-10-09 16:34:01','2026-10-09 16:34:01'),('8357e3d5-2691-4da2-adf7-3c43f174880f','772f9335-b5ed-49df-b396-7f88aad66e66','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:13:25','2025-12-16 02:13:25','2025-12-16 02:13:25'),('83596837-7a66-44c0-bf50-3d046cf5bec2','aa69f0a8-1489-44a8-b4bd-ef2ea26519f0','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:58:33','2025-12-16 13:58:33','2025-12-16 13:58:33'),('83afe69a-06ea-40a0-a13b-d639dd0a765a','e3661cdf-c684-4094-b75b-eaf3cf26850f','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:46:44','2025-12-16 14:46:44','2025-12-16 14:46:44'),('83dd1a39-c761-4720-b03d-c375213f20e4','747ba0fa-8673-4f28-b9e8-269f584de5d3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 03:57:15','2025-12-31 03:57:15','2025-12-31 03:57:15'),('8444cb14-90c9-4a40-80a7-640f614e790d','cfeb9a10-af39-4df7-97f0-29435b1d9835','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-05 11:23:10','2026-09-05 11:23:11','2026-09-05 11:23:11'),('84d1a42a-5996-4a88-b675-c2ee98627164','0d91552c-f5a8-4238-b85d-726a88291999','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:02:39','2025-12-17 02:02:39','2025-12-17 02:02:39'),('84d5ed2c-e7c9-4d12-8bc6-5bfdfbb14dfc','0a469ae1-b501-4193-ad6f-282638a9138a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:35','2025-12-17 07:36:35','2025-12-17 07:36:35'),('85096e87-6e5f-4caa-bb08-cc9353ab19b6','db8c44b2-a59a-44c0-bba2-9313990467aa','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:37:16','2025-12-16 13:37:16','2025-12-16 13:37:16'),('8547494a-1199-4169-b5e8-b991bbd4bdef','e8e1c706-1d50-483f-bd53-1bfa4ab31341','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:55:50','2025-12-16 13:55:50','2025-12-16 13:55:50'),('8547f3d6-d2b1-439f-9ed2-8f9dd6d1e871','912088a1-4faa-40bc-aebc-e031f4b34089','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:31:13','2025-12-16 14:31:13','2025-12-16 14:31:13'),('854c84e8-06b2-424d-8b79-3a93b8ec8efa','bbf011d3-08b4-454d-a8b5-f246b5bb3759','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:07:13','2025-12-31 04:07:13','2025-12-31 04:07:13'),('8558b9ba-55ae-4080-8f77-e13820e0f2b4','7bc35a22-67df-42ad-81cb-a67d2d5192ca','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 07:46:38','2025-12-26 07:46:38','2025-12-26 07:46:38'),('857253ef-99ca-490e-ae83-7cd0bb3190f6','42f4b1a0-3a89-46a4-a240-d29f466d35c6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:03:05','2025-12-17 04:03:05','2025-12-17 04:03:05'),('8580afb7-6d58-4a18-bb20-e57616628ead','37ed0181-94c1-40cf-88fe-395416f7dbef','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:01:35','2025-12-17 07:01:35','2025-12-17 07:01:35'),('85e1eb06-68da-4cd7-a160-d5823685385c','993f3132-015d-4597-bcf0-c88c4219f7a2','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:57:45','2025-12-16 13:57:45','2025-12-16 13:57:45'),('85fc4bc1-6ec2-4ecf-8aef-aeddef280a5f','814c21fa-95f6-4541-97f9-f0c83040c25f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:20:15','2025-12-16 12:20:15','2025-12-16 12:20:15'),('86370699-50e2-41a1-937b-df4715729f8f','3926489c-7171-4afc-8427-10528fdd5385','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-30 13:39:56','2026-09-30 13:39:56','2026-09-30 13:39:56'),('864904a1-8d4f-4371-920e-e4fad10a6018','f226db02-7b36-43aa-8327-622c441ed672','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 04:49:06','2025-12-16 04:49:06','2025-12-16 04:49:06'),('864bcce9-1ece-4ec0-97de-3ac5aff6e14b','58b01e60-a0ed-4055-b864-b9f55e0b6547','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:30:03','2026-10-01 10:30:02','2026-10-01 10:30:02'),('864cbc6c-207f-4001-9f74-73804072bbcb','756b87df-092b-4382-adde-bd10ff1339d2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:22:13','2025-12-16 12:22:13','2025-12-16 12:22:13'),('86578a7a-d0ad-42e3-902d-759fd9065197','bc8cf05c-0521-45b3-8200-2bdb401303bc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:50:50','2025-12-16 13:50:50','2025-12-16 13:50:50'),('86865fa2-1bba-4509-8ad4-d119609643db','831b5005-fcba-44bc-b089-6bb611fa9fe5','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:41:01','2025-12-31 14:41:01','2025-12-31 14:41:01'),('86aadbf0-bbee-4fdb-80e9-7507d745d2a7','3c1f89e3-4a75-4f2d-a2a5-8540b611315a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:05:02','2025-12-17 07:05:02','2025-12-17 07:05:02'),('86f280f0-53e6-4605-9894-7fd3724ef0f6','33799069-f69a-48ec-b739-1069b660c773','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:12:26','2025-12-16 12:12:27','2025-12-16 12:12:27'),('875debd4-1d41-4b10-a4fb-05aeeee9e633','c1e8d6bb-a477-419a-a862-501ecd54353e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:16:52','2025-12-16 12:16:52','2025-12-16 12:16:52'),('87617690-7e30-4c34-9d15-747dace68086','e40ce425-3c4c-4259-80f0-8ca7636f87ee','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 06:16:08','2025-12-16 06:16:08','2025-12-16 06:16:08'),('8798cdcd-141a-4036-bb57-55aca3577425','43d12912-9650-45d2-8bf8-490981b94bb1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:34','2025-12-17 02:01:34','2025-12-17 02:01:34'),('87b7f539-7b46-49cd-bc1d-d4a83b39fceb','865c5585-e2ed-45e1-bba3-53951a71a73e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:35:22','2025-12-16 13:35:22','2025-12-16 13:35:22'),('880fea85-f10a-4164-9138-60f08d9c585b','0a469ae1-b501-4193-ad6f-282638a9138a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:35','2025-12-17 07:36:35','2025-12-17 07:36:35'),('882d50b6-406e-46c4-ba89-a037b8e36556','37eefda6-ab9e-4cc5-a3b9-6b3198de4e6a','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-16 13:07:20','2026-09-16 13:07:20','2026-09-16 13:07:20'),('883adc3f-cbc3-4e39-82a3-d9135cf8f537','003d374c-0aa0-4e05-9a55-ba42df54965c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:53:53','2025-12-31 04:53:53','2025-12-31 04:53:53'),('88787f49-9a31-4cbe-922c-a4b260bc264e','7760e63a-19c7-4497-830c-1193765db760','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:09:00','2025-12-16 14:09:00','2025-12-16 14:09:00'),('88c5b87c-9438-48ab-8d14-ddb1b133fd2b','a6b7b064-ae55-4200-a7f3-d96d727c8954','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:16','2025-12-17 02:01:16','2025-12-17 02:01:16'),('894af125-471f-4b6a-a0c6-9607ed9166d9','2dec49d3-92e8-48ee-83df-796dbe1e02dd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:07:06','2025-12-16 13:07:06','2025-12-16 13:07:06'),('89791650-e38a-4a3d-bbe5-099a504ba43f','675fd1f0-0456-4f60-8f21-dc5861323540','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:48','2025-12-17 07:38:48','2025-12-17 07:38:48'),('8a11fba1-7dfd-4193-885d-934cc87a48fa','eb9c31e7-9c05-454f-bccb-9412aec0cc53','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:43:29','2025-12-31 14:43:29','2025-12-31 14:43:29'),('8a562970-d9e6-4d06-bee6-ea3a83f5294d','3a90ceec-1aa7-46ab-8136-697d0f012109','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2026-08-28 13:41:17','2026-08-28 13:41:17','2026-08-28 13:41:17'),('8a9c768d-feaf-4ae5-ad55-9c0199b40ae6','bce77d89-02eb-4651-b605-c86f9e70c60e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 14:32:48','2025-12-31 14:32:48','2025-12-31 14:32:48'),('8aa4a3ad-1d9e-43a6-a9d9-cfe3fcf3042d','8e18874b-9ad0-470a-9f22-42843616b8ef','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 09:09:02','2025-12-26 09:09:02','2025-12-26 09:09:02'),('8abf5ce5-3700-4209-b1af-e57daf9ad29c','e4c48d0f-3a6a-48c4-88bb-b972c653f5df','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-30 13:39:39','2026-09-30 13:39:39','2026-09-30 13:39:39'),('8acc0664-26b2-4d03-8444-880cd39a59c3','7fdcc95b-6474-4f07-9d90-8724bad01a50','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:49:17','2025-12-16 13:49:17','2025-12-16 13:49:17'),('8b295756-6788-4b7e-9352-620bc8bf585e','9602e638-c41c-4070-a44f-9681554b6bf4','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:41:26','2025-12-16 14:41:26','2025-12-16 14:41:26'),('8b317078-0542-46a7-be33-f3e4f4c74217','7a46bda3-84cc-4963-9ceb-d3bbe337daf7','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:20:36','2026-10-01 10:20:34','2026-10-01 10:20:34'),('8bfc484d-c229-4a59-b618-356ad80c5d40','8181a722-9702-41ba-abad-6ad71dd006ba','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:06:46','2025-12-17 02:06:46','2025-12-17 02:06:46'),('8c01eee4-24d5-4306-a5f7-440f55816c65','509870ad-2f71-4bd0-bcba-f0cd3a9050df','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:10:19','2025-12-31 02:10:19','2025-12-31 02:10:19'),('8c256930-ad31-4f78-bf3a-da33e80ba60c','f9f246ac-bac4-48c3-a57f-4f7e9843b121','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:43:30','2025-12-31 14:43:30','2025-12-31 14:43:30'),('8c5a83fe-1a5c-494b-bb29-7b3ad96b360a','6940025c-bd03-43c7-8fbf-6e0cfc46876d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:10:51','2025-12-31 06:10:51','2025-12-31 06:10:51'),('8c5fa642-9559-493b-9358-28ad948507bc','747ba0fa-8673-4f28-b9e8-269f584de5d3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:00:23','2025-12-31 04:00:23','2025-12-31 04:00:23'),('8c9e19ca-5ea8-4728-901d-7a9423f67863','db8c44b2-a59a-44c0-bba2-9313990467aa','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:37:10','2025-12-16 13:37:10','2025-12-16 13:37:10'),('8cdcba39-4796-4e08-b269-3286ce86e9a7','f4d8f812-b119-4137-9316-1451b5cbe79d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:55:06','2025-12-17 07:55:06','2025-12-17 07:55:06'),('8cfb7860-57aa-4ac7-b3dd-4ba5584c0032','d5dcd4bc-abdf-418d-a68d-26077c5a2441','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2026-08-28 13:41:22','2026-08-28 13:41:22','2026-08-28 13:41:22'),('8d2fefce-4737-4a5b-8317-3073432f1ca2','831b5005-fcba-44bc-b089-6bb611fa9fe5','61796564-4a39-457e-a218-1a4dc9bd5f22','2026-09-05 03:10:09','2026-09-05 03:10:09','2026-09-05 03:10:09'),('8d9e0d66-863b-4611-a323-5956a515e547','9b6cb9ef-2d70-4af8-839f-990acd5c7c35','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:50:26','2025-12-16 13:50:26','2025-12-16 13:50:26'),('8da68763-f0f4-435a-9839-b716b251375f','5a66415b-07fb-4395-9719-c72397728254','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:19:41','2025-12-16 02:19:41','2025-12-16 02:19:41'),('8dec1735-95f4-4dfb-ad56-6f08ad920c10','9cac8fa8-8d1e-447c-85e6-b89487147025','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:10:50','2025-12-31 06:10:50','2025-12-31 06:10:50'),('8e4b107e-47c3-49ce-903a-843ffc24b7a9','8e972d08-7981-4ba3-8e79-b0cc6aa9b7b9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:17:00','2025-12-16 14:17:00','2025-12-16 14:17:00'),('8e98de03-b17e-4ebb-96db-cf30bf024200','0c8406f7-b1d6-45d0-8338-ee079c7d6551','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:26:23','2025-12-30 17:26:23','2025-12-30 17:26:23'),('8e99eeac-e8c9-4704-9d2c-92ad00ceaa33','a61345d4-cf93-4315-b576-a077cd21e346','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:03:18','2025-12-17 02:03:18','2025-12-17 02:03:18'),('8ea65f15-ba7e-438d-a6d7-ae215faaa34b','ac607fc6-1775-4615-b7d6-e7aabbf3c2d6','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:39:54','2025-12-31 14:39:54','2025-12-31 14:39:54'),('8eabd220-bad0-49e8-912c-5bf7004bb5bb','8346b36a-613a-4c8e-9fa1-ebf86a500f8c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 10:16:37','2025-12-17 10:16:37','2025-12-17 10:16:37'),('8f488ca8-9656-41c8-b2ec-e4fb999a3e2e','cc716dce-b978-4ce2-9689-bbdf44aa27a0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:55:49','2025-12-17 07:55:49','2025-12-17 07:55:49'),('8f55eb01-c657-4f39-bec5-0daf3fcec6d5','c88ebd2c-bf5e-4dfe-9ff3-5222b7e5d0fb','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-15 17:10:15','2025-12-15 17:10:15','2025-12-15 17:10:15'),('8f6fe65b-6444-441a-9f89-3a0fc3a8811a','18d824f1-ac1d-4bfe-899a-609fb75b1e3f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:30:36','2025-12-17 07:30:36','2025-12-17 07:30:36'),('8f720dd5-f291-485a-8315-46803eda4c23','33861e74-4e23-4f84-bbe4-558ebcc4da0e','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:40:47','2025-12-31 14:40:47','2025-12-31 14:40:47'),('8f9aa6cd-154b-4a29-b890-fd3197afb3fc','92328b71-24ce-4259-be7b-eefc6eb36cc4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 13:11:58','2025-12-17 13:11:58','2025-12-17 13:11:58'),('8fa69db2-1922-4911-bcfa-9690eb45eed9','0a469ae1-b501-4193-ad6f-282638a9138a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:37:41','2025-12-17 07:37:41','2025-12-17 07:37:41'),('90057dbe-cd81-4cf5-9884-ee91aa92e59f','2b0d627e-6986-4087-b870-d8081bbc0097','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:00:33','2025-12-16 02:00:33','2025-12-16 02:00:33'),('90317603-0880-42f2-9343-35c28bdcd1b1','7189e59f-76c5-43b6-a9c4-d31e5c66cf4c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:30:35','2025-12-17 07:30:35','2025-12-17 07:30:35'),('90b1cb93-4311-4960-beb1-b3cf2e374ace','c1798abb-cff2-4168-a7d2-178639036bfb','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-14 14:49:39','2025-12-14 14:49:39','2025-12-14 14:49:39'),('90d6390d-dbb4-4e9d-ab7f-a04644479596','233f9396-6dde-4e8a-9ce0-a6c40eda68f7','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:37:23','2025-12-17 07:37:23','2025-12-17 07:37:23'),('90fa7566-fad4-40ee-9c6f-b54e1fad3997','2f304594-e93a-4dec-bbf8-731af26f9c6a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:09:28','2025-12-31 04:09:28','2025-12-31 04:09:28'),('90fbf55b-9e13-47ec-9fbf-fd3f9c45d16c','a51e88d8-5b40-4959-8e79-901ef38516a1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:58','2025-12-17 02:01:58','2025-12-17 02:01:58'),('910e04d7-d60d-4737-bc41-bb044571a1a4','bc8cf05c-0521-45b3-8200-2bdb401303bc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:50:50','2025-12-16 13:50:50','2025-12-16 13:50:50'),('9190802c-2d24-4daf-90c8-36ecd66fca6c','b466c161-ed6d-4540-8872-d8973aa87b18','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:34','2025-12-17 07:36:34','2025-12-17 07:36:34'),('922c848b-5b6c-42bd-9641-44d5fdd0704e','edb9b7ff-fae2-4986-ad56-71cdca019789','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:03:58','2025-12-17 04:03:58','2025-12-17 04:03:58'),('92e9f37f-4d7e-439f-a00d-0eca27231640','33799069-f69a-48ec-b739-1069b660c773','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:12:27','2025-12-16 12:12:27','2025-12-16 12:12:27'),('931db1d3-b114-4032-81bf-73afb1309bc6','a6b7b064-ae55-4200-a7f3-d96d727c8954','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:47:20','2025-12-16 14:47:20','2025-12-16 14:47:20'),('935639ee-f46b-4acd-ba8e-22d8b2fc5db5','8a92fb37-bec2-4b80-a20b-79ca21758b34','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:29:16','2025-12-16 14:29:16','2025-12-16 14:29:16'),('9376b2e9-221a-4fd6-848b-cd8aaf374bc8','7fdcc95b-6474-4f07-9d90-8724bad01a50','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:50:13','2025-12-16 13:50:13','2025-12-16 13:50:13'),('93c7e876-397e-440a-8965-a57ef59db2fb','64ac7a42-2306-4b0a-a1bf-119310f08ff6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:41:31','2025-12-31 06:41:31','2025-12-31 06:41:31'),('948e3027-f2bb-4305-8eeb-922cbdd0e2ea','210dd46c-881e-483b-9dba-90d1259b0f2f','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:37:54','2025-12-16 14:37:54','2025-12-16 14:37:54'),('949ff710-bff9-4623-8bae-c9fbb591b37e','7c78675c-f3d0-412f-93b3-4f8f1fb8c8f0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:35:49','2025-12-31 04:35:49','2025-12-31 04:35:49'),('94d3c16a-f61b-4534-b691-248f0eca8d46','dc30a8f5-b2bf-49f2-8896-8c13339ebd88','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 14:35:16','2025-12-31 14:35:16','2025-12-31 14:35:16'),('94efb690-fce4-43bd-8218-b4da12e7f583','95a72116-bc77-4996-8920-10d2d11c3b19','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:58:59','2025-12-17 07:58:59','2025-12-17 07:58:59'),('9512aa0d-c698-4661-9227-3a813abd8d0d','f2118363-2ea7-4191-945d-2339a64df870','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:51:09','2025-12-16 12:51:09','2025-12-16 12:51:09'),('95e6b078-90a6-43ca-8439-cca41eb8973a','cc716dce-b978-4ce2-9689-bbdf44aa27a0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:55:49','2025-12-17 07:55:49','2025-12-17 07:55:49'),('95fdee64-1a8a-43e1-afa0-8516a49478ab','1ab8f3fe-9095-4017-a154-93568cd6419b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:52:39','2025-12-31 04:52:39','2025-12-31 04:52:39'),('961299f0-9a48-4f90-8e76-37f5b05ff7c6','814c21fa-95f6-4541-97f9-f0c83040c25f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:20:01','2025-12-16 12:20:01','2025-12-16 12:20:01'),('966073b6-4459-42b3-a6b5-fa664310ea44','caeee4ee-3ebd-4f76-bd68-f95030315742','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:00:15','2025-12-17 04:00:15','2025-12-17 04:00:15'),('970ed51c-4cd8-410b-b888-bf74792f3da2','42f4b1a0-3a89-46a4-a240-d29f466d35c6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:00:16','2025-12-17 04:00:16','2025-12-17 04:00:16'),('9726230c-d0da-4671-8305-c2a4fc199792','df4f393e-e384-496a-a73c-c29db51737c0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:25:38','2025-12-16 14:25:38','2025-12-16 14:25:38'),('97388ee7-6459-45d0-bfbd-2064b2690de6','747ba0fa-8673-4f28-b9e8-269f584de5d3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:00:23','2025-12-31 04:00:23','2025-12-31 04:00:23'),('974bc8c4-70df-424b-8082-27e394db2ed1','71d9dfcf-ff61-4aba-9244-a442e23b5c8d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:58:38','2025-12-17 07:58:38','2025-12-17 07:58:38'),('97538212-f378-4784-8b8c-895e55810d5e','f71da1e8-cdc8-49b8-ab8d-0a84dae4f0a0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:39','2025-12-31 05:54:39','2025-12-31 05:54:39'),('9767f38c-3764-40bf-ae7d-515e77854a4e','3e6f89e6-f4ba-4d55-a699-c5b16d0ee966','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:28:30','2026-10-01 10:28:28','2026-10-01 10:28:28'),('976889fc-c0b8-4d6b-95b9-28cb3b9ba8ac','e8e1c706-1d50-483f-bd53-1bfa4ab31341','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:55:50','2025-12-16 13:55:50','2025-12-16 13:55:50'),('97f16c81-5ee4-40fe-8975-b0ad997f4d46','4e6812b5-e807-4939-a482-56e77128326f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:08:56','2025-12-16 12:08:57','2025-12-16 12:08:57'),('97fc7671-510f-42a0-ba7e-f89008360899','be063f9c-6e46-4344-b40c-1bd259de0ba3','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:26:01','2025-12-16 14:26:01','2025-12-16 14:26:01'),('980dc842-3520-4112-940e-c8e0d97de782','f9f246ac-bac4-48c3-a57f-4f7e9843b121','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:43:30','2025-12-31 14:43:30','2025-12-31 14:43:30'),('98141e11-0b0e-4a33-a8de-07147ff48602','92328b71-24ce-4259-be7b-eefc6eb36cc4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-24 12:25:32','2025-12-24 12:25:32','2025-12-24 12:25:32'),('98376b6a-2092-4690-86dc-37841caa4916','938e4eb6-fbe8-4756-af9d-09545609b5b8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:06:47','2025-12-17 02:06:47','2025-12-17 02:06:47'),('98c5bc38-3db2-4f74-b248-117cc7020115','163bcec0-916c-4711-9576-96f8079e322d','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:50:17','2025-12-16 13:50:17','2025-12-16 13:50:17'),('99259ac8-9a7b-4495-b03f-cd6c1762d691','0b1880c4-f141-4845-86b4-86d0e838e897','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:05:54','2025-12-31 08:05:54','2025-12-31 08:05:54'),('992641cf-5d35-4087-9ca9-39ede5385db0','33861e74-4e23-4f84-bbe4-558ebcc4da0e','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:40:47','2025-12-31 14:40:47','2025-12-31 14:40:47'),('9931d945-dd4e-4f10-b21f-55d263aafae8','b003f86f-4a0f-490c-aacc-9eec17ffa6dd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 03:56:16','2025-12-31 03:56:16','2025-12-31 03:56:16'),('9a0b5689-e1d2-4240-bff1-b27915bb563f','eaa359ec-4698-43e6-a55a-4cf25aa61f21','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-16 13:07:19','2026-09-16 13:07:18','2026-09-16 13:07:18'),('9a287a76-82d0-47fd-8569-503580abcd9e','a74da425-b84b-48e4-99ab-881889dbe848','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:27:18','2025-12-30 17:27:18','2025-12-30 17:27:18'),('9a4832f3-5646-4227-9110-9ee4112c2c14','9a29c581-7610-40fc-ac63-7c4a9ebb6571','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:19','2025-12-31 05:54:19','2025-12-31 05:54:19'),('9ab7c366-9950-428f-8e2e-6e186980151c','7ddd25fb-23f7-4fc0-8f90-705849bf95dc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:28:40','2025-12-16 14:28:40','2025-12-16 14:28:40'),('9b144579-9d83-4d25-af00-a17e7f202110','db8c44b2-a59a-44c0-bba2-9313990467aa','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:37:16','2025-12-16 13:37:16','2025-12-16 13:37:16'),('9b51aa3b-45b9-4de5-8284-a2c99ab23593','210dd46c-881e-483b-9dba-90d1259b0f2f','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:38:49','2025-12-16 14:38:49','2025-12-16 14:38:49'),('9b59297b-5b9e-4640-994d-482f19868343','ef2a9681-7653-4c0c-af66-80f771f58587','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:29:17','2025-12-16 14:29:17','2025-12-16 14:29:17'),('9b871d84-b9be-44aa-b751-364f076cb83b','7189e59f-76c5-43b6-a9c4-d31e5c66cf4c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:30:35','2025-12-17 07:30:35','2025-12-17 07:30:35'),('9b93237b-d52f-446d-9b21-5adba2c6e4cb','233f9396-6dde-4e8a-9ce0-a6c40eda68f7','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:54','2025-12-17 07:36:54','2025-12-17 07:36:54'),('9b9e94d1-5cd7-4116-af32-287ed7db8abe','783d7ac9-aef2-408e-b810-0d3b71c6da4d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:38','2025-12-31 02:12:38','2025-12-31 02:12:38'),('9c02aa15-c489-4aed-a3bd-1cd2345a5a74','59ffc799-d8f2-4dc1-8d1b-a34087fc784c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:00:24','2025-12-31 04:00:24','2025-12-31 04:00:24'),('9c45e14a-80a8-43df-8dbf-f4943ecde773','b6ce7735-ad86-4b72-9084-65eb42fd4997','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:58:11','2025-12-16 13:58:11','2025-12-16 13:58:11'),('9c7a7402-4d53-4367-8efb-e73223269aec','58b01e60-a0ed-4055-b864-b9f55e0b6547','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:30:04','2026-10-01 10:30:02','2026-10-01 10:30:02'),('9ca5d648-5d58-4a3c-ba91-2e3ed8b1ec35','caeee4ee-3ebd-4f76-bd68-f95030315742','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 03:59:47','2025-12-17 03:59:47','2025-12-17 03:59:47'),('9cd0eb18-b0bd-48dc-9697-4dd293fa5002','93d76b8d-e41f-4f31-892e-6cd449692db1','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:08:52','2025-12-16 14:08:52','2025-12-16 14:08:52'),('9d535ba6-6629-4476-9cca-fcbaab1609b1','2a52a948-ae1f-49d9-bd42-58e3bf89f402','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 14:32:47','2025-12-31 14:32:47','2025-12-31 14:32:47'),('9d8f3e23-66f9-4c88-8a09-1ba1e195b26a','edb9b7ff-fae2-4986-ad56-71cdca019789','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:03:58','2025-12-17 04:03:58','2025-12-17 04:03:58'),('9dd59f25-b243-4936-aaa4-018e5e3e3119','9196b369-7694-4842-a456-98a7cb1698b8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:34:31','2025-12-17 07:34:32','2025-12-17 07:34:32'),('9dd8cc86-2eef-45bc-a45b-6b888abe6d39','013b1335-0cbe-4ae1-82c8-508f367b6d80','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-30 12:58:41','2025-12-30 12:58:41','2025-12-30 12:58:41'),('9dff361d-5791-4ee1-99c4-c4d43cde7cc1','63425463-e948-4997-a596-f8f89cc3cb59','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:50:28','2025-12-16 13:50:28','2025-12-16 13:50:28'),('9e1d0645-7e61-4079-a577-92d159eb811f','d5ed3e2e-1329-45cf-b514-dac4452b18fd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 10:16:36','2025-12-17 10:16:36','2025-12-17 10:16:36'),('9e27ee6a-4bba-470b-889e-e152638c4d92','3e011570-22eb-4d5c-95d2-7cf5d2e61322','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:19:23','2025-12-16 02:19:23','2025-12-16 02:19:23'),('9e601ba3-00a8-439f-9b5b-d0dc25a13eff','8a92fb37-bec2-4b80-a20b-79ca21758b34','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:29:16','2025-12-16 14:29:16','2025-12-16 14:29:16'),('9ebef170-bd2c-4aff-824c-8f48f5836692','9d5e0763-d7fb-40f9-a7dc-da03ec3351e8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:30:27','2025-12-16 14:30:27','2025-12-16 14:30:27'),('9f083ddc-56b5-4e1d-a78f-8a60cc3f6154','7d206b8e-8957-4b6d-85ac-ce23da9e29f9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:31:25','2025-12-31 06:31:25','2025-12-31 06:31:25'),('9f52adad-9090-44c1-b867-5a057ad72602','7fdcc95b-6474-4f07-9d90-8724bad01a50','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:48:36','2025-12-16 13:48:36','2025-12-16 13:48:36'),('9f671bcf-66e3-4bf9-833a-e0c70e1a830f','74d73c85-98f7-49af-9cf7-34ce64818ccc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:11:18','2025-12-16 02:11:18','2025-12-16 02:11:18'),('9f998fca-9e49-467f-a1c5-397aa4c6e70b','509870ad-2f71-4bd0-bcba-f0cd3a9050df','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:27:19','2025-12-30 17:27:19','2025-12-30 17:27:19'),('9fbb1124-b6fd-4d12-922a-ce4227c13147','1b7e6107-52a3-4d76-be13-56079924159b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-14 14:42:36','2025-12-14 14:42:36','2025-12-14 14:42:36'),('9fcd5c92-8a0a-45bb-9690-89daae3d85d2','000314de-1839-4009-97b9-949b231ae022','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-24 12:25:38','2025-12-24 12:25:38','2025-12-24 12:25:38'),('9fd2ce94-a81c-4971-8f61-cd74c14be8bc','7760e63a-19c7-4497-830c-1193765db760','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:15:23','2025-12-16 14:15:23','2025-12-16 14:15:23'),('a069072f-a34b-4047-a82d-c6c0bd75b3b7','fd20b77e-4969-4fb7-a239-098db49bd9d7','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:41:17','2025-12-16 14:41:17','2025-12-16 14:41:17'),('a1072745-69a1-4a6c-a9c7-09b9e4a68f99','6019fce4-f9cc-44d8-a97e-db9f1419513a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:58:50','2025-12-31 05:58:50','2025-12-31 05:58:50'),('a1301455-c565-4e1f-b7e9-b8192c2ffef2','ec635ca2-62a2-4be0-ba07-9b72757f9ede','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-05 07:40:23','2026-09-05 07:40:23','2026-09-05 07:40:23'),('a13ccd21-2047-452e-97e2-01fbab953040','c24f95b6-5f65-4fb4-a34c-318d9faca6e6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:04:09','2025-12-16 13:04:09','2025-12-16 13:04:09'),('a1933c99-31e9-41c4-a25a-0b7dfddbc5fb','5f048c97-b1b4-4332-9a38-59dd48b0dcb6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:00:15','2025-12-17 07:00:15','2025-12-17 07:00:15'),('a198da73-59c0-47a6-884a-342135b30bd6','a8497683-217a-4ba4-8434-4c1bfc4cbe8d','8720b484-8c4f-4377-9e16-d18a7d5901cc','2026-10-09 16:33:57','2026-10-09 16:33:58','2026-10-09 16:33:58'),('a1c2e9d6-a17e-4fa0-808e-7badf6e20f88','9f722b95-009a-4876-9e9e-6522eef25412','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:26:14','2025-12-31 08:26:14','2025-12-31 08:26:14'),('a20790e5-7c86-4263-a30f-559d613bd955','9a29c581-7610-40fc-ac63-7c4a9ebb6571','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 03:56:17','2025-12-31 03:56:17','2025-12-31 03:56:17'),('a2de7251-42a1-47fb-9eae-6e92a8666f12','67d3807d-1598-4256-8b27-d0f3e217c21d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:03:18','2025-12-17 06:03:18','2025-12-17 06:03:18'),('a3891502-8f72-404f-97df-eb58f1573cd5','0c8406f7-b1d6-45d0-8338-ee079c7d6551','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:26:23','2025-12-30 17:26:23','2025-12-30 17:26:23'),('a39e9a4b-3d8c-4d3b-bb70-1d03813b2835','98d08f95-8b16-4f5f-87c5-eb1e12df1669','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:07:18','2025-12-17 02:07:18','2025-12-17 02:07:18'),('a3a57a14-222d-4ad9-a31f-5230a501c5fa','7bb8f624-2747-4c0d-bb4f-8a667991f931','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:39:58','2025-12-31 14:39:58','2025-12-31 14:39:58'),('a3e42fc4-f7db-490a-8dc1-f41da7920714','2466be8f-1730-4724-a010-59f9cbc110d9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:51:23','2025-12-16 13:51:23','2025-12-16 13:51:23'),('a3f0f144-8c5e-47c5-a8e2-ce966cec3886','db1b727e-75ef-4bbd-9417-64d13fb993f8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:05:25','2025-12-31 08:05:25','2025-12-31 08:05:25'),('a4ccced1-301c-4856-885c-ab2ba6ef0213','9bfb1d17-5cd1-4b55-b223-a694f8041482','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:23','2025-12-31 05:54:23','2025-12-31 05:54:23'),('a500e6a2-c985-455b-b275-feaf7260f890','0a469ae1-b501-4193-ad6f-282638a9138a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:37:41','2025-12-17 07:37:41','2025-12-17 07:37:41'),('a539d806-753d-44d2-bf0a-844f9f7cf9c1','33861e74-4e23-4f84-bbe4-558ebcc4da0e','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:41:00','2025-12-31 14:41:00','2025-12-31 14:41:00'),('a562bfd2-a0ca-4663-8191-0cb2c55e3d21','675fd1f0-0456-4f60-8f21-dc5861323540','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:38','2025-12-17 07:38:38','2025-12-17 07:38:38'),('a58365e6-05c6-4f3b-ac43-6f4c410193c8','422f2679-4aad-4807-a965-0efb09b350ad','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:05:24','2025-12-31 08:05:24','2025-12-31 08:05:24'),('a5a786cd-6d95-4aa7-add1-ee02f7630806','eaa359ec-4698-43e6-a55a-4cf25aa61f21','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-16 12:59:55','2026-09-16 12:59:55','2026-09-16 12:59:55'),('a5bb62c2-2605-4397-8edf-aa97fb6b4a60','11c16b3b-852c-41ab-befb-69ae75f2ca79','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:29:55','2026-10-01 10:29:53','2026-10-01 10:29:53'),('a5c8f713-f48f-48dc-af85-7e16a8c40dd5','c73bdcff-5fb0-4d23-9f82-62bdce1e15fc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:20:42','2025-12-16 13:20:42','2025-12-16 13:20:42'),('a600ec0d-052e-440f-a898-8ab655d7c987','e0a932e9-d1a5-4a70-8ded-b0215ca6b783','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:41:38','2025-12-16 14:41:38','2025-12-16 14:41:38'),('a615921c-73c0-4d61-af3f-0b64ea558463','8181a722-9702-41ba-abad-6ad71dd006ba','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:06:46','2025-12-17 02:06:46','2025-12-17 02:06:46'),('a703d91a-2ba1-4fc9-890a-d41666d58744','7760e63a-19c7-4497-830c-1193765db760','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:11:55','2025-12-16 14:11:55','2025-12-16 14:11:55'),('a7392d24-2948-4a93-be5e-0eab01d591f3','64a2744f-5d29-4a40-a8cc-e1c5c92e2b76','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:10:13','2025-12-17 11:10:13','2025-12-17 11:10:13'),('a746c297-ca68-4c2d-8d5a-c9465e61bccd','c1e8d6bb-a477-419a-a862-501ecd54353e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:16:52','2025-12-16 12:16:52','2025-12-16 12:16:52'),('a75a03e5-af1c-4126-ade7-83fe86ff4a8d','8e18874b-9ad0-470a-9f22-42843616b8ef','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 09:09:02','2025-12-26 09:09:02','2025-12-26 09:09:02'),('a7933347-8cb8-4e9e-b760-31751420600b','4f37b0b7-21d8-414d-a00a-df16acd9f2ad','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:36:00','2025-12-16 14:36:00','2025-12-16 14:36:00'),('a7c6333d-a36b-48b4-90ad-d4f9331c2781','a61345d4-cf93-4315-b576-a077cd21e346','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:02:40','2025-12-17 02:02:40','2025-12-17 02:02:40'),('a7ffe1e1-d7ca-47bb-bad3-442d139134f9','93d76b8d-e41f-4f31-892e-6cd449692db1','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:08:51','2025-12-16 14:08:51','2025-12-16 14:08:51'),('a8064f9a-4f73-4ff8-9668-fa9b23326831','2466be8f-1730-4724-a010-59f9cbc110d9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:55:18','2025-12-16 13:55:18','2025-12-16 13:55:18'),('a84466ca-b965-4fba-bfde-c30eb9f77330','c1e8d6bb-a477-419a-a862-501ecd54353e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:16:36','2025-12-16 12:16:36','2025-12-16 12:16:36'),('a86591bc-0d31-49ce-a676-84c330efb8e3','79ddefb5-a30d-4118-8bd5-6cf51371fb5c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:05:53','2025-12-31 08:05:53','2025-12-31 08:05:53'),('a882410e-90c7-42a1-b96f-fd421fa84169','c1e8d6bb-a477-419a-a862-501ecd54353e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:16:32','2025-12-16 12:16:32','2025-12-16 12:16:32'),('a88b91cb-0fd3-4017-9659-585d5e335559','747ba0fa-8673-4f28-b9e8-269f584de5d3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 03:57:15','2025-12-31 03:57:15','2025-12-31 03:57:15'),('a8b0f76b-0a14-441d-b95e-1fd1866ed24b','5effaeeb-989e-4476-b07c-f5e8dbd9427d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:59','2025-12-17 02:01:59','2025-12-17 02:01:59'),('a8da19be-f8b9-4602-bc38-d9a2bcf60373','9a29c581-7610-40fc-ac63-7c4a9ebb6571','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:19','2025-12-31 05:54:19','2025-12-31 05:54:19'),('a9083761-ac25-4594-a802-3162bc3bd3e6','5f048c97-b1b4-4332-9a38-59dd48b0dcb6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:59:33','2025-12-17 06:59:33','2025-12-17 06:59:33'),('a958e9e7-ea28-432e-91d0-fbe445b06015','163bcec0-916c-4711-9576-96f8079e322d','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:50:17','2025-12-16 13:50:17','2025-12-16 13:50:17'),('a970d497-9554-439a-848d-138bd08711bb','2466be8f-1730-4724-a010-59f9cbc110d9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:55:45','2025-12-16 13:55:45','2025-12-16 13:55:45'),('a9a0cd2b-f2c6-485b-b39a-c5ea9e662e34','8346b36a-613a-4c8e-9fa1-ebf86a500f8c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:08:56','2025-12-17 11:08:56','2025-12-17 11:08:56'),('a9b43a6c-d443-4c25-9dc3-3c1e0c61f06b','9196b369-7694-4842-a456-98a7cb1698b8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:53','2025-12-17 07:36:53','2025-12-17 07:36:53'),('aa66525d-34f6-4c76-a8ae-1e0f099e14fe','210dd46c-881e-483b-9dba-90d1259b0f2f','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:38:49','2025-12-16 14:38:49','2025-12-16 14:38:49'),('aadb578d-8c3d-445f-9ef2-8e206ed29694','abdc0e1a-6e9d-4a9c-aaec-12e707045ae2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:01:36','2025-12-17 07:01:36','2025-12-17 07:01:36'),('aae28315-51c6-41d6-beb2-73e74eaab751','abdc0e1a-6e9d-4a9c-aaec-12e707045ae2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:01:36','2025-12-17 07:01:36','2025-12-17 07:01:36'),('ab283158-0110-4dc8-9987-722f7da19458','e0a932e9-d1a5-4a70-8ded-b0215ca6b783','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:42:12','2025-12-16 14:42:12','2025-12-16 14:42:12'),('ab322657-a054-4588-8d62-55c91cfcf8aa','ce04f929-04bb-4988-bf9b-aed655516809','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 01:55:54','2025-12-16 01:55:54','2025-12-16 01:55:54'),('ab5a9145-b0b5-4b2e-806e-bccf05095181','cee9c995-982c-452c-937d-49c457902cd5','8720b484-8c4f-4377-9e16-d18a7d5901cc','2026-10-09 16:34:01','2026-10-09 16:34:01','2026-10-09 16:34:01'),('ab5fd5c8-0372-4f3c-947d-24922537e6fb','33861e74-4e23-4f84-bbe4-558ebcc4da0e','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:41:00','2025-12-31 14:41:00','2025-12-31 14:41:00'),('ab61c1f3-7374-4273-ba92-7bd0499f98de','a3241eaf-4285-4018-90ca-cea46e67ada2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 06:13:35','2025-12-16 06:13:35','2025-12-16 06:13:35'),('ab792375-e9ac-4c20-a4f6-a523847fc319','003d374c-0aa0-4e05-9a55-ba42df54965c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:52:40','2025-12-31 04:52:40','2025-12-31 04:52:40'),('abdc8f56-feba-40f7-9bf1-49b48cfdc7c9','14dc3ae4-0b2f-4c91-9310-c8f99b9c597a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 06:19:56','2025-12-16 06:19:56','2025-12-16 06:19:56'),('ac0758c2-ee7d-4877-80aa-46e1bb148a17','58768460-fffd-498f-9d9f-616ce0280c02','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:57:46','2025-12-16 13:57:46','2025-12-16 13:57:46'),('ac52e8ed-33fa-44db-903e-5c12ab3780ca','7fdcc95b-6474-4f07-9d90-8724bad01a50','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:49:25','2025-12-16 13:49:25','2025-12-16 13:49:25'),('ac76206e-df32-48ed-98ac-a5e3d2dea4dc','dc82fbbb-8429-46ed-85c4-bb25b8066a39','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:25:53','2025-12-16 14:25:53','2025-12-16 14:25:53'),('ac8a2809-c9bd-4225-beef-6fb2a6f78bb8','3e011570-22eb-4d5c-95d2-7cf5d2e61322','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:16:25','2025-12-16 02:16:25','2025-12-16 02:16:25'),('acce85ff-1215-4e85-8e1e-33c393d5de5e','eb9c31e7-9c05-454f-bccb-9412aec0cc53','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:43:29','2025-12-31 14:43:29','2025-12-31 14:43:29'),('ad09f4e8-add8-454c-8b79-e26014aa8451','bf2ff94a-40bc-4f22-bb4c-0d9852acecb0','61796564-4a39-457e-a218-1a4dc9bd5f22','2026-09-05 03:10:13','2026-09-05 03:10:13','2026-09-05 03:10:13'),('ad674e38-e80a-48d3-8551-ca751b1e96eb','43c1fdb3-81aa-4b70-99f9-e294019aa8f9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:20:38','2025-12-16 14:20:38','2025-12-16 14:20:38'),('ad870916-232d-411b-9b5e-c62ba52a2345','dbcd1db3-f501-462e-82ce-0c2196e911b4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:17:00','2025-12-16 14:17:00','2025-12-16 14:17:00'),('addc74ad-4a7a-4f3c-8427-1b43f467c104','c73bdcff-5fb0-4d23-9f82-62bdce1e15fc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:26:42','2025-12-16 13:26:43','2025-12-16 13:26:43'),('adf6ec1d-bcc0-4fff-ae1e-3e3f31574d88','ce04f929-04bb-4988-bf9b-aed655516809','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 01:55:54','2025-12-16 01:55:54','2025-12-16 01:55:54'),('ae21c4e2-239a-4f2e-a65b-6dbf33ffbfb2','aceed091-0dc4-436e-9e39-8193767ef535','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:29:53','2026-10-01 10:29:51','2026-10-01 10:29:51'),('aef9b754-3ccb-4fc0-b503-be1714490780','9602e638-c41c-4070-a44f-9681554b6bf4','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:41:18','2025-12-16 14:41:18','2025-12-16 14:41:18'),('af46802a-d7d3-4c7f-bb86-aecac5c1c42a','413b6761-224b-4386-9fdd-f2bbe92514b0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:04:19','2025-12-17 06:04:19','2025-12-17 06:04:19'),('af8307a3-fb29-4cd7-b211-8b7d11f733a4','9438b962-b666-4bf9-a774-7a1709dde2fd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:31','2025-12-31 02:12:31','2025-12-31 02:12:31'),('affab930-c288-40f5-9593-120866b162c5','413b6761-224b-4386-9fdd-f2bbe92514b0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:51:11','2025-12-17 06:51:11','2025-12-17 06:51:11'),('b052e71a-4040-4f80-ae4a-710064330606','7e14ae9f-3b68-4c34-b26f-bd65853ced75','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 07:46:39','2025-12-26 07:46:39','2025-12-26 07:46:39'),('b06a2497-4876-4f86-80f7-fe6fab82383f','25ebd46b-9ea2-4874-b86b-1e48d631dd0b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:49:23','2025-12-31 05:49:23','2025-12-31 05:49:23'),('b0d2e90d-e0d1-4b0f-a0dd-f2a839e1b0ef','a477a953-67e3-4736-9fce-cb516ba69d44','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:57:34','2025-12-31 04:57:34','2025-12-31 04:57:34'),('b0f9cb40-0a65-48a8-9d20-1aaee6736c4c','cb338679-30c7-460b-8ff6-13031002a98e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:45:38','2025-12-16 12:45:38','2025-12-16 12:45:38'),('b10507a7-0e10-4c03-995c-e6e61fe9003c','bbf011d3-08b4-454d-a8b5-f246b5bb3759','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:03:46','2025-12-31 04:03:46','2025-12-31 04:03:46'),('b13a9daa-fe09-4220-b712-f1e74086ea74','14dc3ae4-0b2f-4c91-9310-c8f99b9c597a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 06:19:56','2025-12-16 06:19:56','2025-12-16 06:19:56'),('b1abafd3-e1d9-44f1-9670-5f86ad8b36ff','1ab8f3fe-9095-4017-a154-93568cd6419b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:52:39','2025-12-31 04:52:39','2025-12-31 04:52:39'),('b1b63d4c-94f1-4db8-b601-7a2e4dde7842','121a686c-d1fa-4bdc-b8d3-f8e63ab9d1b3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:59:22','2025-12-17 07:59:22','2025-12-17 07:59:22'),('b1ba3eae-01d8-441a-88fb-f38f8adbca6a','000314de-1839-4009-97b9-949b231ae022','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:35:39','2025-12-20 13:35:39','2025-12-20 13:35:39'),('b1cb21f7-4dfe-403c-98a9-a3d7fc457561','7885b209-2134-4605-8684-451ddf7cc535','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:03:58','2025-12-17 06:03:58','2025-12-17 06:03:58'),('b1e6141e-8804-45a4-9b5f-f94a44a385b2','838ba1c2-c029-4ace-b2eb-eb376ea34184','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:50:51','2025-12-16 13:50:51','2025-12-16 13:50:51'),('b1fb0a78-b8bf-4e57-95d7-ac5318ffe9c4','bbf011d3-08b4-454d-a8b5-f246b5bb3759','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:07:14','2025-12-31 04:07:14','2025-12-31 04:07:14'),('b20f9c3f-1a25-4dd5-a2d6-4feefba63cd0','6604c0d8-d208-4def-a895-d1726eb703eb','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:38:34','2025-12-16 13:38:34','2025-12-16 13:38:34'),('b224d63f-f831-4c55-874e-02e7a9421baa','89ca8212-4feb-4c70-8f6e-90f15b58136e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:46:29','2025-12-16 14:46:29','2025-12-16 14:46:29'),('b2464b5a-aa4f-46d5-a41e-6b24e179ff5b','7a5021df-ac05-4827-9b41-55353e5fc485','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:03:57','2025-12-17 06:03:57','2025-12-17 06:03:57'),('b261f6fb-d43c-459b-9a7b-e5139aeaa01e','dc30a8f5-b2bf-49f2-8896-8c13339ebd88','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:40:07','2025-12-31 14:40:07','2025-12-31 14:40:07'),('b27c8d95-d931-4b1f-8ddd-113f3210f8b9','ebc238dd-21a4-4ddd-9a6a-7038dae6cebf','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:46','2025-12-17 07:36:46','2025-12-17 07:36:46'),('b2fb0191-b64c-47d8-ad0b-143adb2a6ea1','37eefda6-ab9e-4cc5-a3b9-6b3198de4e6a','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-16 13:07:20','2026-09-16 13:07:20','2026-09-16 13:07:20'),('b2fcce94-7296-4ef1-b9cf-2fd3714dcc1e','cfeb9a10-af39-4df7-97f0-29435b1d9835','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-05 11:23:10','2026-09-05 11:23:11','2026-09-05 11:23:11'),('b31b07b5-7892-45f6-b5de-99b76413814e','a76ec385-9713-482e-8fba-ecbf9f422867','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-24 12:25:27','2025-12-24 12:25:27','2025-12-24 12:25:27'),('b31fc633-2141-4400-99c9-a63b075710fa','98d08f95-8b16-4f5f-87c5-eb1e12df1669','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 03:59:46','2025-12-17 03:59:46','2025-12-17 03:59:46'),('b357c09b-a56d-4c79-88a2-9805bc627724','6d956381-b651-423f-b0b5-b34b42982a51','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:26','2025-12-31 02:12:26','2025-12-31 02:12:26'),('b386a471-b007-4484-821b-b17c7a0f79dd','f71da1e8-cdc8-49b8-ab8d-0a84dae4f0a0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:24','2025-12-31 05:54:24','2025-12-31 05:54:24'),('b40d2cbf-bd26-4203-9067-4e815489963a','abdc0e1a-6e9d-4a9c-aaec-12e707045ae2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:01:36','2025-12-17 07:01:36','2025-12-17 07:01:36'),('b42b3dda-fe3b-4f08-baa0-1df013ab1c28','a4f308eb-fd74-4956-aeb0-5c025e929e24','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:51:22','2025-12-16 13:51:22','2025-12-16 13:51:22'),('b4653870-bb37-4702-84ed-2b5d7e9b08db','a4f308eb-fd74-4956-aeb0-5c025e929e24','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:51:14','2025-12-16 13:51:14','2025-12-16 13:51:14'),('b4721f2f-cba9-4e0d-aac4-cad870f2a933','003d374c-0aa0-4e05-9a55-ba42df54965c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:53:53','2025-12-31 04:53:53','2025-12-31 04:53:53'),('b4850e2b-388b-4816-a48a-cac436f5060d','f0a44ed8-820e-460e-a93d-2ac1ceb048bb','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 06:02:25','2025-12-16 06:02:25','2025-12-16 06:02:25'),('b4e08d02-4e69-4d9b-be4e-d1ccb218d4da','5b18f413-c689-4bc2-9f6c-e414c24e067c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:06:16','2025-12-31 04:06:16','2025-12-31 04:06:16'),('b4eb13fc-7eae-4312-a59c-2468f2c58121','5b18f413-c689-4bc2-9f6c-e414c24e067c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:06:16','2025-12-31 04:06:16','2025-12-31 04:06:16'),('b4f711c5-5b37-4c62-b7bf-b65851c7994d','3c03aca5-f6f0-43d3-bd60-27640d1be658','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:58:56','2025-12-17 07:58:56','2025-12-17 07:58:56'),('b5250170-514b-400b-8c8b-99cbc7e69369','43fef7d5-0879-4d67-96be-061936ddbec3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:12:06','2025-12-16 02:12:06','2025-12-16 02:12:06'),('b54126c1-1c4f-4120-bf2e-02f02223f07f','eaa359ec-4698-43e6-a55a-4cf25aa61f21','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-16 12:59:55','2026-09-16 12:59:55','2026-09-16 12:59:55'),('b598f771-6742-428c-91b7-dae73be21b9e','897e00ce-e2bb-44c5-bca3-65c4b70acda4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:36:30','2025-12-16 14:36:30','2025-12-16 14:36:30'),('b5d3357e-88f9-4844-822e-cadf73ec95db','c65c4e20-da37-4736-ad59-4341c800f594','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:04:03','2025-12-17 02:04:03','2025-12-17 02:04:03'),('b5d81965-fead-4245-9c56-77b9bd919ceb','9196b369-7694-4842-a456-98a7cb1698b8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:34:32','2025-12-17 07:34:32','2025-12-17 07:34:32'),('b61c34e5-ec7c-4a99-8980-38c8c1b7f20e','ad29958c-418b-497c-9b94-01229387830c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:08:14','2025-12-17 11:08:14','2025-12-17 11:08:14'),('b6a1c90b-e805-4b0d-a6db-f1ebada5e248','b003f86f-4a0f-490c-aacc-9eec17ffa6dd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 03:56:16','2025-12-31 03:56:16','2025-12-31 03:56:16'),('b6ef037f-7efc-40e6-8117-c21bafd35ba1','63425463-e948-4997-a596-f8f89cc3cb59','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:50:28','2025-12-16 13:50:28','2025-12-16 13:50:28'),('b6ff9423-c0e5-49c7-9e68-81333313147f','f226db02-7b36-43aa-8327-622c441ed672','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 04:54:41','2025-12-16 04:54:41','2025-12-16 04:54:41'),('b779b5cc-133e-404d-b4e2-b0331a38f432','fd524242-29dd-446a-8a1d-668a985304f7','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 03:56:21','2025-12-31 03:56:21','2025-12-31 03:56:21'),('b78a3004-52a5-419d-a8ce-3b6c23a3d33e','7fdcc95b-6474-4f07-9d90-8724bad01a50','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:50:13','2025-12-16 13:50:13','2025-12-16 13:50:13'),('b80280c8-81ac-438f-b693-b8e32e8acea8','1d6a15f2-12f9-4f11-9af6-4eb4a1e39cb6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 06:02:45','2025-12-16 06:02:45','2025-12-16 06:02:45'),('b8f807a6-5b4e-470e-b02e-8fdd393a719a','c95ab3df-9611-4f3d-90c1-23e296ede79d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:50:07','2025-12-16 12:50:08','2025-12-16 12:50:08'),('b8fd93e5-49a9-4794-8069-a24d8d823fb3','caeee4ee-3ebd-4f76-bd68-f95030315742','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 03:59:47','2025-12-17 03:59:47','2025-12-17 03:59:47'),('b936f204-7d5d-43db-afea-1c150b980e9e','9196b369-7694-4842-a456-98a7cb1698b8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:53','2025-12-17 07:36:53','2025-12-17 07:36:53'),('b9a80125-4cd5-4ea6-9386-82800e26b6cd','8aa5ca7e-3217-42c9-9754-4517d9125508','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:35:27','2025-12-16 14:35:27','2025-12-16 14:35:27'),('b9ac18f3-e76c-4afc-b153-ae6d9c86180a','b080d858-fa50-4bfe-97aa-1a1ee6ec4012','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:40:46','2025-12-31 14:40:46','2025-12-31 14:40:46'),('ba064485-896b-4470-a375-986ec27f49d9','4f37b0b7-21d8-414d-a00a-df16acd9f2ad','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:30:37','2025-12-16 14:30:37','2025-12-16 14:30:37'),('ba405f23-3513-4e25-b792-c7af67762cc1','000314de-1839-4009-97b9-949b231ae022','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:35:39','2025-12-20 13:35:39','2025-12-20 13:35:39'),('ba51fd1a-4056-46ce-ae5a-79cb49b85a87','772f9335-b5ed-49df-b396-7f88aad66e66','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:15:47','2025-12-16 02:15:47','2025-12-16 02:15:47'),('ba7a6003-7a0a-437c-91df-12d47807a27e','ac9e4724-0145-4446-b3a9-d953369ea4ca','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:16:09','2025-12-16 14:16:09','2025-12-16 14:16:09'),('ba953048-c556-4354-b38d-795906b97e7c','948f0e69-c414-4cc3-a3a0-403e57304c43','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:25:41','2025-12-31 06:25:41','2025-12-31 06:25:41'),('baae84d3-c26d-45dd-a75c-17eaa395b59b','e8e1c706-1d50-483f-bd53-1bfa4ab31341','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:55:46','2025-12-16 13:55:46','2025-12-16 13:55:46'),('bac7f3e1-047c-45fb-908b-f74ed4103118','37ed0181-94c1-40cf-88fe-395416f7dbef','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:00:16','2025-12-17 07:00:16','2025-12-17 07:00:16'),('bb51feab-c864-43c9-a2e1-bd3d5b5eeffb','e1deb9ca-d595-43cc-9730-d29bbadf106f','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:38:50','2025-12-16 14:38:50','2025-12-16 14:38:50'),('bb82c99a-28df-4989-a922-ff28a5e94a9c','f9f246ac-bac4-48c3-a57f-4f7e9843b121','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 15:13:55','2025-12-31 15:13:55','2025-12-31 15:13:55'),('bb96db56-03d6-4d76-a5ab-bec809f45f53','43c1fdb3-81aa-4b70-99f9-e294019aa8f9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:18:33','2025-12-16 14:18:33','2025-12-16 14:18:33'),('bbaf9ed3-7823-442b-875c-8af8b0ce3a81','98d08f95-8b16-4f5f-87c5-eb1e12df1669','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 03:59:46','2025-12-17 03:59:46','2025-12-17 03:59:46'),('bbcadb3e-e963-4c06-9a48-e328352bed94','33652329-f6cf-424e-b76f-703747b4b88a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:26:28','2025-12-30 17:26:28','2025-12-30 17:26:28'),('bc66d328-c528-4734-ac8d-78d1d45f5e4c','dc30a8f5-b2bf-49f2-8896-8c13339ebd88','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:40:07','2025-12-31 14:40:07','2025-12-31 14:40:07'),('bc776c5a-e969-4b39-a861-8dae18317ba3','993f3132-015d-4597-bcf0-c88c4219f7a2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:55:51','2025-12-16 13:55:51','2025-12-16 13:55:51'),('bc7fb975-591e-4631-80ea-c413b7a574b7','06feb165-1894-47ee-b224-1b05668e6750','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:33:33','2025-12-17 07:33:33','2025-12-17 07:33:33'),('bc9c4006-2508-476a-b0b8-5f49156047b0','3c1f89e3-4a75-4f2d-a2a5-8540b611315a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:01:51','2025-12-17 07:01:51','2025-12-17 07:01:51'),('bcab8711-e100-4127-810d-588adcb09871','ab58e831-9b7c-4943-826e-26efea420ac1','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-30 12:58:52','2025-12-30 12:58:52','2025-12-30 12:58:52'),('bd401536-c9d4-4c5a-9e46-29c1d2753e9e','ede10a4e-323b-4267-8320-9af1e538c58c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:07:03','2025-12-17 02:07:03','2025-12-17 02:07:03'),('bd85bb61-861b-4192-a162-56afb8d1cd99','8ad89a75-cac7-40f2-8bf1-7556da67f6fd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 03:57:14','2025-12-31 03:57:14','2025-12-31 03:57:14'),('bd8bc618-3c69-49a6-a7fd-5f7fd778ce8d','9bfb1d17-5cd1-4b55-b223-a694f8041482','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:06:17','2025-12-31 04:06:17','2025-12-31 04:06:17'),('bdd4bf08-50bc-4484-99fe-964ae4fc8f3f','8ad89a75-cac7-40f2-8bf1-7556da67f6fd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 03:56:23','2025-12-31 03:56:23','2025-12-31 03:56:23'),('be2c60b3-06e1-4468-9c8f-efb27f2b1393','8aa5ca7e-3217-42c9-9754-4517d9125508','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:37:53','2025-12-16 14:37:53','2025-12-16 14:37:53'),('be31c366-1820-4133-9baf-2c0a308f9f4a','5f048c97-b1b4-4332-9a38-59dd48b0dcb6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:00:15','2025-12-17 07:00:15','2025-12-17 07:00:15'),('be689c32-58de-4f0a-859f-8d375b912ad7','c73bdcff-5fb0-4d23-9f82-62bdce1e15fc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:20:41','2025-12-16 13:20:41','2025-12-16 13:20:41'),('be69566a-769b-4adc-9ca2-5251ce6a49c2','976b0b1d-6fc2-43f3-98f9-8c52316712f9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:26:33','2025-12-30 17:26:34','2025-12-30 17:26:34'),('be6d2d94-59a5-480b-8f39-131d5b0051e1','eaa359ec-4698-43e6-a55a-4cf25aa61f21','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-16 13:07:19','2026-09-16 13:07:19','2026-09-16 13:07:19'),('be998874-318e-4a49-b472-c29b617eeec5','7189e59f-76c5-43b6-a9c4-d31e5c66cf4c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:30:35','2025-12-17 07:30:35','2025-12-17 07:30:35'),('bea0ea64-e2a5-439d-befe-44d137dc49f0','79ddefb5-a30d-4118-8bd5-6cf51371fb5c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:05:52','2025-12-31 08:05:53','2025-12-31 08:05:53'),('beb56796-d587-479c-946a-8e8f22aa3863','772f9335-b5ed-49df-b396-7f88aad66e66','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:13:25','2025-12-16 02:13:26','2025-12-16 02:13:26'),('beb8d1cd-98c5-49c9-a6fd-f128da925808','30078510-8c6c-4d8e-955d-c0e53404d921','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 05:02:39','2025-12-16 05:02:39','2025-12-16 05:02:39'),('bebf7cf9-1b21-43b2-9801-ab412811489d','fd20b77e-4969-4fb7-a239-098db49bd9d7','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:41:17','2025-12-16 14:41:17','2025-12-16 14:41:17'),('bfa5710d-3ed3-4058-aeed-998f61ee722b','6940025c-bd03-43c7-8fbf-6e0cfc46876d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:25:28','2025-12-31 06:25:28','2025-12-31 06:25:28'),('bfa85feb-7c63-4ac8-b0f4-37d955194ac7','c8dba756-6af7-431d-b363-3ab5b9409e45','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:08:50','2025-12-16 14:08:50','2025-12-16 14:08:50'),('bfbcc61a-2a20-42fc-b4a1-14942eb7c6e8','74d73c85-98f7-49af-9cf7-34ce64818ccc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:01:05','2025-12-16 02:01:05','2025-12-16 02:01:05'),('bff38720-f424-4d31-993c-c5776faf8c38','bb7fc8f0-75c8-4361-9ca3-9409bef55760','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:04:04','2025-12-17 02:04:04','2025-12-17 02:04:04'),('c044d35a-04b2-4f2a-a267-7e05af130934','948f0e69-c414-4cc3-a3a0-403e57304c43','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:25:29','2025-12-31 06:25:29','2025-12-31 06:25:29'),('c0c89bf9-2e09-498f-92e2-3fee3431d1a6','43d12912-9650-45d2-8bf8-490981b94bb1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:06:17','2025-12-17 02:06:17','2025-12-17 02:06:17'),('c0f1ccf6-5678-4087-8677-438ea01e3edf','a76ec385-9713-482e-8fba-ecbf9f422867','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-24 12:25:27','2025-12-24 12:25:27','2025-12-24 12:25:27'),('c126dabe-7554-41f7-8808-8fa897f83fa7','7885b209-2134-4605-8684-451ddf7cc535','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:04:18','2025-12-17 06:04:18','2025-12-17 06:04:18'),('c15ae5d6-5b0a-4c94-aea6-b7e6a6e7f1fd','b3d53a9d-dc45-4039-93eb-f02a5135743c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:58:33','2025-12-16 13:58:34','2025-12-16 13:58:34'),('c19a4615-ecae-4410-af7e-e104c76dc77d','7189e59f-76c5-43b6-a9c4-d31e5c66cf4c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:30:05','2025-12-17 07:30:05','2025-12-17 07:30:05'),('c2097ecb-456e-4d52-b8fa-0327fbdb714e','993f3132-015d-4597-bcf0-c88c4219f7a2','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:57:45','2025-12-16 13:57:45','2025-12-16 13:57:45'),('c3aacd1f-ccb3-4d46-a352-4aed920e4a6b','e8e1c706-1d50-483f-bd53-1bfa4ab31341','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:55:50','2025-12-16 13:55:50','2025-12-16 13:55:50'),('c3bac2fc-0be5-4bf0-af88-d89c6b41e65b','7760e63a-19c7-4497-830c-1193765db760','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:11:56','2025-12-16 14:11:56','2025-12-16 14:11:56'),('c3c889f6-1b57-4e3a-99ea-15e7f7e755d0','64ac7a42-2306-4b0a-a1bf-119310f08ff6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:31:26','2025-12-31 06:31:26','2025-12-31 06:31:26'),('c4426795-a978-4455-843f-7706ad078e49','019d7b97-1280-4200-a964-a397bbfb3a4c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:15:08','2025-12-16 12:15:08','2025-12-16 12:15:08'),('c45ac7fa-8932-4e7c-a327-151ab7beaa9e','a477a953-67e3-4736-9fce-cb516ba69d44','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:45:28','2025-12-31 05:45:28','2025-12-31 05:45:28'),('c4706b7b-5325-4e32-93f3-14351ad05512','b6ce7735-ad86-4b72-9084-65eb42fd4997','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:58:11','2025-12-16 13:58:11','2025-12-16 13:58:11'),('c4aa89cd-c64e-4744-93db-15629eefaf1d','751b0a9f-60dd-474b-a00a-0bf41eeb3338','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 05:23:13','2025-12-16 05:23:13','2025-12-16 05:23:13'),('c4d86541-5550-4630-974a-fafcebcc8043','be063f9c-6e46-4344-b40c-1bd259de0ba3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:30:45','2025-12-16 14:30:45','2025-12-16 14:30:45'),('c569200f-1fce-48c1-ac5a-ad71aa6d8ea7','f2af311e-e6b3-4c72-8e14-60a9cfc8da73','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:48:20','2025-12-16 12:48:21','2025-12-16 12:48:21'),('c59cbc4c-adbd-417f-8f8f-59ddb1d2e53c','1884abd5-dce7-4ba2-9627-f8b470cb436a','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:40:08','2025-12-31 14:40:08','2025-12-31 14:40:08'),('c5a7686b-5ad4-48b7-8c61-f8918714f4d7','1884abd5-dce7-4ba2-9627-f8b470cb436a','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:40:08','2025-12-31 14:40:08','2025-12-31 14:40:08'),('c607dbe7-84cf-43c4-9965-83d982574415','a5acc285-0c3a-4231-a92d-567bd70c98d1','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-05 07:40:25','2026-09-05 07:40:25','2026-09-05 07:40:25'),('c6653d22-0082-4a56-8d32-55c4367aece4','bc8cf05c-0521-45b3-8200-2bdb401303bc','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:50:45','2025-12-16 13:50:45','2025-12-16 13:50:45'),('c6a275ed-2281-4594-8698-fc12f35c9a57','000314de-1839-4009-97b9-949b231ae022','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-24 12:25:38','2025-12-24 12:25:38','2025-12-24 12:25:38'),('c6a75090-d8bc-4264-9fe6-ce2da169e1ec','5a66415b-07fb-4395-9719-c72397728254','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:19:28','2025-12-16 02:19:28','2025-12-16 02:19:28'),('c6f7954c-e33d-47ad-b74b-d68d23dfcd89','1ab8f3fe-9095-4017-a154-93568cd6419b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:52:11','2025-12-31 04:52:11','2025-12-31 04:52:11'),('c717cedc-61a8-4b33-b3c4-c2215c7f9ad5','43c1fdb3-81aa-4b70-99f9-e294019aa8f9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:21:19','2025-12-16 14:21:20','2025-12-16 14:21:20'),('c737020b-bef9-4091-9016-fbd37cbece0f','b003f86f-4a0f-490c-aacc-9eec17ffa6dd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:45','2025-12-31 02:12:45','2025-12-31 02:12:45'),('c74fbe59-143b-451b-bf4d-ae44ed8c0e6f','c73bdcff-5fb0-4d23-9f82-62bdce1e15fc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:26:43','2025-12-16 13:26:43','2025-12-16 13:26:43'),('c773c4ab-1015-411b-b78e-2ecd0e6fdda4','31de8c08-4a72-421c-a082-0247f51e2f87','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:51:12','2025-12-17 06:51:12','2025-12-17 06:51:12'),('c795cef4-8ae1-4b4c-b5d4-6822d385541d','0a469ae1-b501-4193-ad6f-282638a9138a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:35','2025-12-17 07:36:35','2025-12-17 07:36:35'),('c81a903a-6fb1-4695-8aee-855aaaff8db9','bcf5f535-e293-4842-8f61-0f64a0ed3f3a','61796564-4a39-457e-a218-1a4dc9bd5f22','2026-09-05 03:11:16','2026-09-05 03:11:16','2026-09-05 03:11:16'),('c8335545-0002-42e1-aa8d-f0d0332c4570','073a6c81-b99a-447c-876c-27acaeed85d9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:36:45','2025-12-16 13:36:46','2025-12-16 13:36:46'),('c8376732-a181-4a8c-9502-5bef05e7d315','6d956381-b651-423f-b0b5-b34b42982a51','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:26','2025-12-31 02:12:26','2025-12-31 02:12:26'),('c83c4f08-a247-4a48-8a93-590abf5d9eea','a4f308eb-fd74-4956-aeb0-5c025e929e24','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:51:14','2025-12-16 13:51:14','2025-12-16 13:51:14'),('c8636d58-9354-46c6-a4f2-7e79cd79542e','110ae15d-897b-44be-8fb2-fa1a572d6b58','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 07:46:21','2025-12-26 07:46:21','2025-12-26 07:46:21'),('c896738d-20dc-4060-99fd-fbc5bd2f6ec2','8e18874b-9ad0-470a-9f22-42843616b8ef','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:26:22','2025-12-30 17:26:22','2025-12-30 17:26:22'),('c8e4195f-d5a2-42d9-94a1-6bebb8b6d4e1','865c5585-e2ed-45e1-bba3-53951a71a73e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:31:56','2025-12-16 13:31:56','2025-12-16 13:31:56'),('c961a2b3-7e10-483a-9e5a-aab3b19e68a1','8346b36a-613a-4c8e-9fa1-ebf86a500f8c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:08:56','2025-12-17 11:08:56','2025-12-17 11:08:56'),('c97ff21d-b8dc-4f93-8f53-2b63d72f4230','9b6cb9ef-2d70-4af8-839f-990acd5c7c35','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:50:26','2025-12-16 13:50:26','2025-12-16 13:50:26'),('c9aa2ffd-845a-459a-8d57-2981627fe1cf','6f0c06e4-eb39-400c-85e2-65d0f106a0a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:03:18','2025-12-17 02:03:18','2025-12-17 02:03:18'),('c9bd8859-b202-466d-afa5-1f8e7b90f5e1','299f1fb6-49ca-4559-89af-6c2b9fe04ddf','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:33:03','2025-12-20 13:33:03','2025-12-20 13:33:03'),('ca98753e-ab84-41f6-8dfe-68c09503fbf1','71d9dfcf-ff61-4aba-9244-a442e23b5c8d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:58:38','2025-12-17 07:58:38','2025-12-17 07:58:38'),('cb5df292-0840-495a-b8a2-42297c27a63b','7fdcc95b-6474-4f07-9d90-8724bad01a50','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:49:22','2025-12-16 13:49:22','2025-12-16 13:49:22'),('cba50013-ae66-498a-8a44-78b7408e20fa','be063f9c-6e46-4344-b40c-1bd259de0ba3','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:30:45','2025-12-16 14:30:45','2025-12-16 14:30:45'),('cba60452-67b4-4c35-826c-15e4df143341','a925c1f1-3081-477f-b9f7-4fe8342b3dba','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:13:18','2025-12-16 02:13:18','2025-12-16 02:13:18'),('cbd03272-5859-4321-8033-5e85231d397c','a51e88d8-5b40-4959-8e79-901ef38516a1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:58','2025-12-17 02:01:58','2025-12-17 02:01:58'),('cbf964c9-c2fb-48be-a8b5-7a782893dd19','8e18874b-9ad0-470a-9f22-42843616b8ef','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:26:22','2025-12-30 17:26:22','2025-12-30 17:26:22'),('cbff950c-3ea6-4d25-a785-8cc91caa69b4','f9823aa6-c4f6-4755-a788-ed5bad9f36c2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:33:45','2025-12-20 13:33:45','2025-12-20 13:33:45'),('cc8694f4-2b25-48e6-9185-c3caeb8d407c','59ffc799-d8f2-4dc1-8d1b-a34087fc784c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:00:24','2025-12-31 04:00:24','2025-12-31 04:00:24'),('ccbde2e9-4064-41ea-9880-2a8901433367','a0cc0b45-d5e1-49e3-a463-d37e9ff546c8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:29:32','2025-12-17 07:29:32','2025-12-17 07:29:32'),('cd7ac3b7-40bb-4424-a262-90689d17abb9','a0cc0b45-d5e1-49e3-a463-d37e9ff546c8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:29:32','2025-12-17 07:29:32','2025-12-17 07:29:32'),('cdb2a5d0-944e-45bb-8d51-d9e115da405b','b080d858-fa50-4bfe-97aa-1a1ee6ec4012','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:54:20','2025-12-31 05:54:20','2025-12-31 05:54:20'),('ce9174b3-3709-4a3f-b3d3-9e903a176e24','aceed091-0dc4-436e-9e39-8193767ef535','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:29:53','2026-10-01 10:29:51','2026-10-01 10:29:51'),('cebeb6fa-17e6-437d-9939-cef3378c041f','cb338679-30c7-460b-8ff6-13031002a98e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:45:38','2025-12-16 12:45:38','2025-12-16 12:45:38'),('cf5a1fc7-7fa7-4fa3-bd2f-0b1dc645eb2c','30078510-8c6c-4d8e-955d-c0e53404d921','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 04:58:59','2025-12-16 04:59:00','2025-12-16 04:59:00'),('cf628ba4-19aa-4834-87a7-8a94e963bec9','5e436bdc-5c0d-4708-9461-8f3e3bd18ed4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-15 17:09:00','2025-12-15 17:09:00','2025-12-15 17:09:00'),('d01ba7ec-928b-45e7-a643-fc5e651b5d28','43d12912-9650-45d2-8bf8-490981b94bb1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:34','2025-12-17 02:01:34','2025-12-17 02:01:34'),('d02f3e5a-38c6-443d-90e0-356422592c55','dbcd1db3-f501-462e-82ce-0c2196e911b4','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:17:00','2025-12-16 14:17:00','2025-12-16 14:17:00'),('d06aecaf-6b55-4c25-82b1-202dec07be97','6fb75884-2272-479a-840a-3c7f0945c9a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:11:18','2025-12-17 11:11:18','2025-12-17 11:11:18'),('d0710151-dcae-41c4-8ab8-2d794553d98c','ef4feed6-4dcc-41e0-8a9d-9a6bf7cbf984','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:49','2025-12-17 07:38:49','2025-12-17 07:38:49'),('d09adc09-b3c6-4ca6-af05-6d2c23dcc748','5f048c97-b1b4-4332-9a38-59dd48b0dcb6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:59:33','2025-12-17 06:59:33','2025-12-17 06:59:33'),('d0a2621e-c42a-4363-8a11-e07674e1aae6','1ab8f3fe-9095-4017-a154-93568cd6419b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:52:39','2025-12-31 04:52:39','2025-12-31 04:52:39'),('d14d5cac-c3ce-467e-b9fe-62b71cd80cd5','cc716dce-b978-4ce2-9689-bbdf44aa27a0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:58:37','2025-12-17 07:58:37','2025-12-17 07:58:37'),('d1db7664-286f-4c50-85b5-31cbc19c3f2a','c8dba756-6af7-431d-b363-3ab5b9409e45','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:08:50','2025-12-16 14:08:50','2025-12-16 14:08:50'),('d214f7b7-a350-4bca-a596-1f272fcf0de8','3e6f89e6-f4ba-4d55-a699-c5b16d0ee966','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:29:51','2026-10-01 10:29:50','2026-10-01 10:29:50'),('d2a81388-1fb4-4a48-98f6-1a0188c592fc','c3fb6f4b-a83c-4335-b229-d8c9ab5ee308','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:50:37','2025-12-16 13:50:37','2025-12-16 13:50:37'),('d2be3606-476d-4ae1-8264-648a17f840b5','cc716dce-b978-4ce2-9689-bbdf44aa27a0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:58:37','2025-12-17 07:58:37','2025-12-17 07:58:37'),('d2c2fdd5-de79-4e6c-825b-2595c906fa68','2d78471c-ac6e-47e6-8a3e-6d2c30d7ffc2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-14 14:42:31','2025-12-14 14:42:31','2025-12-14 14:42:31'),('d2f9616e-a3d6-46b4-ae60-9f91e19463c9','95f6b22f-98a0-4266-a9c8-74aff556f32a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:07:14','2025-12-31 04:07:15','2025-12-31 04:07:15'),('d315e601-16f1-4d80-9704-2a381678ccc2','d3999c52-0983-45aa-89ba-5e9b1c5fb17c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:11:00','2025-12-17 11:11:00','2025-12-17 11:11:00'),('d3321f8f-0c53-449a-a915-92d0185a742d','eaaeac77-3638-44f3-a5ef-07477cbab71f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:35:33','2025-12-16 13:35:33','2025-12-16 13:35:33'),('d44b1fca-d55d-4700-b437-461e65114efe','c1e13256-9470-4ab4-8d0c-23d5ff53c0cc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:00:18','2025-12-16 02:00:18','2025-12-16 02:00:18'),('d45b1c77-7b4c-48d3-97ec-c01bc8d8659a','7e14ae9f-3b68-4c34-b26f-bd65853ced75','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 09:09:01','2025-12-26 09:09:01','2025-12-26 09:09:01'),('d477ca75-7b67-4b7b-bf54-3c8c31a2ace3','db1b727e-75ef-4bbd-9417-64d13fb993f8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 08:22:40','2025-12-31 08:22:40','2025-12-31 08:22:40'),('d4a000f2-8324-4c5a-90df-748bd4bc9dd5','71d9dfcf-ff61-4aba-9244-a442e23b5c8d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:58:38','2025-12-17 07:58:38','2025-12-17 07:58:38'),('d4ad1042-1416-429e-a1c3-0a982de70d33','f9f246ac-bac4-48c3-a57f-4f7e9843b121','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:43:30','2025-12-31 14:43:30','2025-12-31 14:43:30'),('d4b4d12b-8585-4ef9-81d5-efd344c3e2a4','7c78675c-f3d0-412f-93b3-4f8f1fb8c8f0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:52:10','2025-12-31 04:52:10','2025-12-31 04:52:10'),('d5055644-2adf-443e-b0fd-4e667e3d5ae4','990f3976-fad2-46a5-b342-57225227deac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:59:23','2025-12-17 07:59:23','2025-12-17 07:59:23'),('d50ef5be-1aad-434a-b4fa-8fc3e0bca7a4','7a46bda3-84cc-4963-9ceb-d3bbe337daf7','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-16 13:01:40','2026-09-16 13:01:40','2026-09-16 13:01:40'),('d5118fb2-7b67-4631-930d-61a3f8e850a3','94367287-7ed5-44a4-8602-d9c6732ce501','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:18:17','2025-12-16 12:18:17','2025-12-16 12:18:17'),('d5684510-5119-42fd-9dcf-796128451913','509870ad-2f71-4bd0-bcba-f0cd3a9050df','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:27:19','2025-12-30 17:27:19','2025-12-30 17:27:19'),('d599ba12-aa51-4702-b6af-f5022c288912','d5ed3e2e-1329-45cf-b514-dac4452b18fd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 10:16:36','2025-12-17 10:16:36','2025-12-17 10:16:36'),('d5c0835d-7e95-4ab0-b88a-74ff1b529b68','ef2a9681-7653-4c0c-af66-80f771f58587','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:30:26','2025-12-16 14:30:26','2025-12-16 14:30:26'),('d619e16f-e78f-44e4-97b3-dc371ad9870c','92328b71-24ce-4259-be7b-eefc6eb36cc4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-24 12:25:32','2025-12-24 12:25:32','2025-12-24 12:25:32'),('d650c062-af52-42b4-ac7a-e95ec4a0fda7','eaa359ec-4698-43e6-a55a-4cf25aa61f21','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-16 13:07:19','2026-09-16 13:07:19','2026-09-16 13:07:19'),('d66c2c6e-5bdd-49ee-9f9c-32e43f5584df','bbbba7e4-94de-4f35-8de9-065b11b4bf9c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:16:16','2025-12-16 02:16:16','2025-12-16 02:16:16'),('d6703711-70fe-43fa-a09d-0920ad0a8566','990f3976-fad2-46a5-b342-57225227deac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 10:16:10','2025-12-17 10:16:10','2025-12-17 10:16:10'),('d683d661-a759-4b76-9904-ab19cae61d42','4fa2428f-5fde-49f2-9f80-351c0a2dd5c0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 06:17:44','2025-12-16 06:17:45','2025-12-16 06:17:45'),('d6bd0b73-543f-434a-8953-b140600ac6ef','1d6a15f2-12f9-4f11-9af6-4eb4a1e39cb6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 06:12:54','2025-12-16 06:12:54','2025-12-16 06:12:54'),('d6d7b2fd-2519-4dfd-9663-5b04bd670224','2495e0a6-a94f-4944-bd9f-7cf58930430e','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:15:25','2025-12-16 14:15:25','2025-12-16 14:15:25'),('d6ec1904-9966-4cbe-ab35-2fd2d6f78a50','c8dba756-6af7-431d-b363-3ab5b9409e45','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:59:21','2025-12-16 13:59:21','2025-12-16 13:59:21'),('d6f635ad-5901-466a-8293-7782d7b54457','55995966-f767-4b30-89e0-8def248bd9f4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:32:19','2025-12-20 13:32:19','2025-12-20 13:32:19'),('d76bc0fa-4024-45fd-a7c0-f05699423cb9','0a469ae1-b501-4193-ad6f-282638a9138a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:37:41','2025-12-17 07:37:41','2025-12-17 07:37:41'),('d7fa85c3-343c-4398-8824-a868554899bd','6a39ead8-1696-418a-82d1-1f78cee4aa5b','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:36:50','2025-12-16 13:36:50','2025-12-16 13:36:50'),('d80bd971-8ebd-4831-a0da-b649da5c4791','ef2a9681-7653-4c0c-af66-80f771f58587','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:30:26','2025-12-16 14:30:26','2025-12-16 14:30:26'),('d8403a32-6527-4c80-9377-c57bb1e8b3b9','f491e7a2-94fa-45fc-a7b1-3f503edb3ffe','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:32:14','2025-12-20 13:32:14','2025-12-20 13:32:14'),('d8506b89-dea4-4c0d-9e7c-e80b12cd7b60','7a46bda3-84cc-4963-9ceb-d3bbe337daf7','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-16 13:01:40','2026-09-16 13:01:40','2026-09-16 13:01:40'),('d862fa43-0adf-4ccb-adb6-019994b82cfb','a0cc0b45-d5e1-49e3-a463-d37e9ff546c8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:05:03','2025-12-17 07:05:03','2025-12-17 07:05:03'),('d875f7bf-406a-4738-a844-f2cabcbe7ba1','98d08f95-8b16-4f5f-87c5-eb1e12df1669','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:07:18','2025-12-17 02:07:18','2025-12-17 02:07:18'),('d8827ac5-83bf-475b-bc21-d66ef05a228e','8e18874b-9ad0-470a-9f22-42843616b8ef','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 09:09:02','2025-12-26 09:09:02','2025-12-26 09:09:02'),('d896133e-4d0e-4dff-8add-0b383e750bc0','5a66415b-07fb-4395-9719-c72397728254','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 04:46:12','2025-12-16 04:46:12','2025-12-16 04:46:12'),('d92139f2-a8ee-43fe-8259-d7def4ad25f2','ef2a9681-7653-4c0c-af66-80f771f58587','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:29:17','2025-12-16 14:29:17','2025-12-16 14:29:17'),('d93ab935-3f89-4c86-8e7d-9f49d0d08e16','2a52a948-ae1f-49d9-bd42-58e3bf89f402','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 14:32:47','2025-12-31 14:32:47','2025-12-31 14:32:47'),('d9a309f8-1c15-4d51-8ac3-fd5e7935cd18','63425463-e948-4997-a596-f8f89cc3cb59','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:50:36','2025-12-16 13:50:36','2025-12-16 13:50:36'),('d9a5d5b2-e914-4e55-91ef-838c02a1b875','1ab281c5-0482-4d2b-be65-cd573767b345','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-24 12:25:39','2025-12-24 12:25:39','2025-12-24 12:25:39'),('da1c17ff-2201-49a6-8259-3125aac2acf0','b003f86f-4a0f-490c-aacc-9eec17ffa6dd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 03:56:16','2025-12-31 03:56:16','2025-12-31 03:56:16'),('daf1eee3-b71a-4a32-8527-4cae58fb95c2','f491e7a2-94fa-45fc-a7b1-3f503edb3ffe','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:32:14','2025-12-20 13:32:14','2025-12-20 13:32:14'),('db1ce9d1-8a8f-4649-b61c-aa1fe17d4c45','43c1fdb3-81aa-4b70-99f9-e294019aa8f9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:20:38','2025-12-16 14:20:38','2025-12-16 14:20:38'),('db3f910b-4f97-43bd-a09a-9c94d550c888','5b18f413-c689-4bc2-9f6c-e414c24e067c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:26:29','2025-12-30 17:26:29','2025-12-30 17:26:29'),('db46ecaa-8774-405b-994c-e7090fd6cfff','63f46750-8e0a-4073-a22d-fc2c47aede29','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:27','2025-12-31 02:12:27','2025-12-31 02:12:27'),('db810e46-20b0-4692-9532-7559bc5c0d8d','a8497683-217a-4ba4-8434-4c1bfc4cbe8d','8720b484-8c4f-4377-9e16-d18a7d5901cc','2026-10-09 16:33:57','2026-10-09 16:33:57','2026-10-09 16:33:57'),('dbe05d6a-4f59-4372-8aa8-239dbc8bc99d','912088a1-4faa-40bc-aebc-e031f4b34089','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:31:21','2025-12-16 14:31:21','2025-12-16 14:31:21'),('dcece668-8b79-42b8-aa5a-e77a1355729b','3926489c-7171-4afc-8427-10528fdd5385','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:28:28','2026-10-01 10:28:26','2026-10-01 10:28:26'),('dcf54809-fecd-4fbc-a450-fb2f4f43d755','50222596-7e4f-4289-9bd2-607b1654de0c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:00:53','2025-12-16 02:00:53','2025-12-16 02:00:53'),('dd430ff3-9977-4a73-b7aa-509b3cc38dd9','33652329-f6cf-424e-b76f-703747b4b88a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:34:18','2025-12-20 13:34:18','2025-12-20 13:34:18'),('dd47b845-251a-4c70-80ec-c8e3677191fe','3a90ceec-1aa7-46ab-8136-697d0f012109','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2026-08-28 13:41:17','2026-08-28 13:41:17','2026-08-28 13:41:17'),('de56dd6e-011b-4328-9066-91d67e721418','37eefda6-ab9e-4cc5-a3b9-6b3198de4e6a','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-30 13:39:37','2026-09-30 13:39:37','2026-09-30 13:39:37'),('de60586f-2b68-4879-b7e1-50ba14bb06ec','da0d750f-0c2b-47bc-9f56-6d4e8b1bc397','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:35:30','2025-12-20 13:35:30','2025-12-20 13:35:30'),('deac1340-f98d-4c55-865f-76199c8f5bc5','d9ea34ef-3acd-4d10-b537-397f159521f4','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:50:15','2025-12-16 13:50:15','2025-12-16 13:50:15'),('def0d82f-1d78-42d0-a745-6a7068435985','f9a37238-dbbd-454c-8f77-e9485858cdf2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:00:39','2025-12-16 02:00:39','2025-12-16 02:00:39'),('df6c3865-8776-415b-8fb3-aa3d95eea6fa','edb9b7ff-fae2-4986-ad56-71cdca019789','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:03:06','2025-12-17 04:03:06','2025-12-17 04:03:06'),('df6db9b2-7a77-4d5c-b9a8-e4843542fb0d','bb7fc8f0-75c8-4361-9ca3-9409bef55760','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:43','2025-12-17 07:36:43','2025-12-17 07:36:43'),('e02c5886-0fdc-4955-95a0-72612916f819','bb7fc8f0-75c8-4361-9ca3-9409bef55760','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:43','2025-12-17 07:36:43','2025-12-17 07:36:43'),('e086c404-8086-4a7e-9c85-007bf70ac122','cdb382c1-c659-48c8-b349-d2e78956fee8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:11:35','2025-12-16 02:11:35','2025-12-16 02:11:35'),('e0b54373-3990-4bdf-beb6-280a1993c5c7','c8dba756-6af7-431d-b363-3ab5b9409e45','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:59:21','2025-12-16 13:59:21','2025-12-16 13:59:21'),('e100585b-b3ec-4e5e-ad32-c3bbddc5f1dd','fc005df3-29e6-484d-8fbf-bcacefccd0a1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:08:57','2025-12-17 11:08:57','2025-12-17 11:08:57'),('e1168335-d386-491c-91e4-674059dc023b','bc8cf05c-0521-45b3-8200-2bdb401303bc','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:50:45','2025-12-16 13:50:45','2025-12-16 13:50:45'),('e11f2117-0da7-4e02-9d9e-61ce8ff5e761','0d636ec6-d28f-4a1e-924e-1c8e03ed572b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:09:29','2025-12-31 04:09:29','2025-12-31 04:09:29'),('e2073fad-d2cb-4c95-8711-88ace0d0c92a','33652329-f6cf-424e-b76f-703747b4b88a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:34:18','2025-12-20 13:34:18','2025-12-20 13:34:18'),('e252bb0f-5388-45cd-90aa-f34a5adde16a','4f37b0b7-21d8-414d-a00a-df16acd9f2ad','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:36:00','2025-12-16 14:36:00','2025-12-16 14:36:00'),('e265666b-54d4-4c89-9d20-e53c3be50816','e4c48d0f-3a6a-48c4-88bb-b972c653f5df','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-30 13:39:39','2026-09-30 13:39:39','2026-09-30 13:39:39'),('e26682bb-1760-4cfc-b4a4-7424c85eb945','71fdc289-af52-43dd-98af-e251126d96b4','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-30 12:58:40','2025-12-30 12:58:40','2025-12-30 12:58:40'),('e2da3745-eca6-4cd3-bfb1-8256ec1e40fa','233f9396-6dde-4e8a-9ce0-a6c40eda68f7','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:37:23','2025-12-17 07:37:23','2025-12-17 07:37:23'),('e2f43928-6254-413d-acca-696493b9b822','8a92fb37-bec2-4b80-a20b-79ca21758b34','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:28:41','2025-12-16 14:28:41','2025-12-16 14:28:41'),('e32acd52-555a-43df-a51a-979669cc3887','ca0e3862-5aff-437d-8aa2-276aa394d51c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:58:51','2025-12-31 05:58:51','2025-12-31 05:58:51'),('e37d04d6-a350-4072-bd7c-99b1a3b356e1','598851e2-f6ed-4f7d-963f-b497fe5c5979','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:09:17','2025-12-17 11:09:17','2025-12-17 11:09:17'),('e3820c1e-099c-4f54-9e5b-be36c32c6485','64ac7a42-2306-4b0a-a1bf-119310f08ff6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:31:26','2025-12-31 06:31:26','2025-12-31 06:31:26'),('e3ed33ee-8966-4a94-af18-1e8c3f45082c','013b1335-0cbe-4ae1-82c8-508f367b6d80','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-30 12:58:41','2025-12-30 12:58:41','2025-12-30 12:58:41'),('e41195a9-fa94-4740-b7e5-a7ac8722f12a','6a39ead8-1696-418a-82d1-1f78cee4aa5b','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:36:50','2025-12-16 13:36:50','2025-12-16 13:36:50'),('e44d98e3-45e6-49d8-9c10-b1bd4aabde89','ab58e831-9b7c-4943-826e-26efea420ac1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:30','2025-12-31 02:12:30','2025-12-31 02:12:30'),('e50cacc9-ea5f-4568-93f3-276da9e0d86f','caeee4ee-3ebd-4f76-bd68-f95030315742','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:00:15','2025-12-17 04:00:15','2025-12-17 04:00:15'),('e52ec1df-a587-460b-ad66-a18194136018','edb9b7ff-fae2-4986-ad56-71cdca019789','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:03:06','2025-12-17 04:03:06','2025-12-17 04:03:06'),('e52ef3dd-8c7a-4a46-b8e3-140f540f989c','783d7ac9-aef2-408e-b810-0d3b71c6da4d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:38','2025-12-31 02:12:38','2025-12-31 02:12:38'),('e5696398-1223-4614-ac27-5808a4b4a88f','89ca8212-4feb-4c70-8f6e-90f15b58136e','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:46:43','2025-12-16 14:46:43','2025-12-16 14:46:43'),('e56b28ed-5ff5-4ea8-9385-e4d878552e99','7a5021df-ac05-4827-9b41-55353e5fc485','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:03:57','2025-12-17 06:03:57','2025-12-17 06:03:57'),('e5e63e32-35fb-4c83-af8d-87f0e3257c6a','dbcd1db3-f501-462e-82ce-0c2196e911b4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:17:00','2025-12-16 14:17:00','2025-12-16 14:17:00'),('e616772f-53c8-4f6d-a2d6-4fdf0044da0f','18d824f1-ac1d-4bfe-899a-609fb75b1e3f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:30:36','2025-12-17 07:30:36','2025-12-17 07:30:36'),('e64a34a5-35f2-4a29-be3c-4e65ab094e63','60c55544-b0ab-4255-b501-af6965a0aa27','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:25:22','2025-12-16 14:25:22','2025-12-16 14:25:22'),('e690c402-14ad-4aa1-bf67-4e9e246ba1cd','422f2679-4aad-4807-a965-0efb09b350ad','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:41:32','2025-12-31 06:41:32','2025-12-31 06:41:32'),('e6d03bfc-e459-42dd-a8e0-94d2e1d6d7a7','0c1179b7-0a43-4c5f-8b2a-16d5b8f1f82c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:29:33','2025-12-17 07:29:33','2025-12-17 07:29:33'),('e726a5a6-0814-450c-b7cb-10c8d0056665','a4502205-6ae9-41f0-9d86-14f78813797f','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:15:29','2025-12-16 14:15:29','2025-12-16 14:15:29'),('e73fc1f1-5999-4af0-876a-e532b3c32c55','938e4eb6-fbe8-4756-af9d-09545609b5b8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:06:47','2025-12-17 02:06:47','2025-12-17 02:06:47'),('e78aff09-8505-49f7-aa5f-d3c58798a4dd','ca0d2382-242f-408c-a979-8043a20cb50d','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-30 12:58:47','2025-12-30 12:58:47','2025-12-30 12:58:47'),('e83da85f-d745-4968-abc8-16955f83226a','865c5585-e2ed-45e1-bba3-53951a71a73e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:31:56','2025-12-16 13:31:56','2025-12-16 13:31:56'),('e848c4c1-1667-40fb-90aa-b8609337a939','98d08f95-8b16-4f5f-87c5-eb1e12df1669','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:07:18','2025-12-17 02:07:18','2025-12-17 02:07:18'),('e889cd2e-4a91-4772-ad29-ebcab85f0514','269a9a84-287b-4ca4-8d1c-93241fd2d655','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:38:29','2025-12-16 13:38:29','2025-12-16 13:38:29'),('e8d679e2-1cb0-4d77-b20c-a729956edf09','9bfb1d17-5cd1-4b55-b223-a694f8041482','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:06:17','2025-12-31 04:06:17','2025-12-31 04:06:17'),('e95c62f4-b0db-42fb-8ae4-b87d1e0d4071','42f4b1a0-3a89-46a4-a240-d29f466d35c6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 04:00:16','2025-12-17 04:00:16','2025-12-17 04:00:16'),('ea00b43a-5b28-4d4d-b7f8-e259443d37bb','aceed091-0dc4-436e-9e39-8193767ef535','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:29:53','2026-10-01 10:29:52','2026-10-01 10:29:52'),('eab0e6c6-183a-4897-a666-aea64926e3c5','9ba43158-5b24-4c6f-a09f-81500220e34d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:28','2025-12-17 07:38:28','2025-12-17 07:38:28'),('eab38b98-8826-40c2-822a-497df4944273','6f44d861-a661-47d3-bc3a-9d836b7b95f0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:09:05','2025-12-17 11:09:05','2025-12-17 11:09:05'),('eacd1792-5b15-4057-bc6d-48b4af0fe402','8aa5ca7e-3217-42c9-9754-4517d9125508','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:37:53','2025-12-16 14:37:53','2025-12-16 14:37:53'),('eaf5226e-b885-4f36-a1a2-ad4f0d03d34f','23513fcc-213f-4348-8ffa-87953658ef79','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:48:17','2025-12-16 14:48:17','2025-12-16 14:48:17'),('eb0fa498-ed43-4a19-89ac-e05bdecd25a9','31de8c08-4a72-421c-a082-0247f51e2f87','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:59:32','2025-12-17 06:59:32','2025-12-17 06:59:32'),('eb433235-039e-4e98-8f89-52958396e5cb','94367287-7ed5-44a4-8602-d9c6732ce501','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:18:16','2025-12-16 12:18:16','2025-12-16 12:18:16'),('eb9eb713-7a08-4c0f-9a45-338eb5ba7dac','013b1335-0cbe-4ae1-82c8-508f367b6d80','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-30 12:58:41','2025-12-30 12:58:41','2025-12-30 12:58:41'),('ec16da00-2416-4b21-a103-29e1638ba57e','8181a722-9702-41ba-abad-6ad71dd006ba','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:06:18','2025-12-17 02:06:18','2025-12-17 02:06:18'),('ec1b8fef-40f0-4a3c-b8ed-97bf72772478','6f19d64b-91e6-47d1-a855-c754f415d69d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2026-01-01 15:44:51','2026-01-01 15:44:51','2026-01-01 15:44:51'),('ec475bc6-3690-441c-ba20-a23307bcc9aa','9ba43158-5b24-4c6f-a09f-81500220e34d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:28','2025-12-17 07:38:28','2025-12-17 07:38:28'),('ec4a1327-8291-4ba9-82a8-4b66830ee3f4','6448382e-2278-4ab8-96bd-67faea3ba680','eceba0d7-3225-492d-a1e9-04f609ff9571','2025-12-30 12:13:38','2025-12-30 12:13:38','2025-12-30 12:13:38'),('ec71bd5c-0bbe-4c22-8d38-9e571fb883e3','25ebd46b-9ea2-4874-b86b-1e48d631dd0b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:49:23','2025-12-31 05:49:23','2025-12-31 05:49:23'),('ec748b74-2d7d-4348-9256-f049edabe317','06feb165-1894-47ee-b224-1b05668e6750','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:34:30','2025-12-17 07:34:30','2025-12-17 07:34:30'),('ec8e796d-3bea-440d-8305-666a2b06f663','a51e88d8-5b40-4959-8e79-901ef38516a1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:47:52','2025-12-16 14:47:52','2025-12-16 14:47:52'),('ec9437de-b26f-44eb-9ecd-131efc895132','a8497683-217a-4ba4-8434-4c1bfc4cbe8d','8720b484-8c4f-4377-9e16-d18a7d5901cc','2026-10-09 16:33:58','2026-10-09 16:33:58','2026-10-09 16:33:58'),('ec9a4ed6-54e2-46ce-888e-2185d133117b','195fcc85-e87c-40a5-94c4-6b43021c94bd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:30:56','2025-12-16 14:30:56','2025-12-16 14:30:56'),('eca4d94e-a06b-459b-a07c-9a62128af069','7a5021df-ac05-4827-9b41-55353e5fc485','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:03:57','2025-12-17 06:03:57','2025-12-17 06:03:57'),('ecb24efb-2941-4bf7-81e4-05e31e8550f7','f6785d61-61fe-4c34-bd1d-4468b6f33a7a','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:16:26','2025-12-16 14:16:26','2025-12-16 14:16:26'),('ecf624a5-f618-4e78-929b-3d5b3a7280f4','751b0a9f-60dd-474b-a00a-0bf41eeb3338','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 05:23:12','2025-12-16 05:23:13','2025-12-16 05:23:13'),('ed150d76-80fb-487b-a361-47b6c772b713','0d636ec6-d28f-4a1e-924e-1c8e03ed572b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:35:48','2025-12-31 04:35:48','2025-12-31 04:35:48'),('ed21611f-576e-4ae1-a36f-bc3c81a7d025','27e5204a-9daa-4528-ba63-ac69b5d67936','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-16 13:01:39','2026-09-16 13:01:38','2026-09-16 13:01:38'),('ed3e4854-a1ae-49e0-8d7a-8bb24d458d74','cb338679-30c7-460b-8ff6-13031002a98e','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:25:41','2025-12-16 12:25:41','2025-12-16 12:25:41'),('ed56d697-6a2e-45f4-ac77-9e2f473da9ce','938e4eb6-fbe8-4756-af9d-09545609b5b8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:07:02','2025-12-17 02:07:02','2025-12-17 02:07:02'),('ee294815-8c83-4869-9e66-2b2e381fdf0d','da0d750f-0c2b-47bc-9f56-6d4e8b1bc397','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:35:30','2025-12-20 13:35:30','2025-12-20 13:35:30'),('ee376319-415f-455b-b4aa-347378f42e3e','43c1fdb3-81aa-4b70-99f9-e294019aa8f9','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:18:33','2025-12-16 14:18:33','2025-12-16 14:18:33'),('eeaae6f7-1717-4ff5-92f2-59f6a3d1966b','43d12912-9650-45d2-8bf8-490981b94bb1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:34','2025-12-17 02:01:34','2025-12-17 02:01:34'),('ef3de700-5c81-48cc-9c4c-4b2c0ae653ae','9b62b42d-5122-41c0-ab59-6fb479cd300f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:01:32','2025-12-17 02:01:32','2025-12-17 02:01:32'),('efe8c132-0e90-4e1c-b9a9-9b999e2174f1','a6b7b064-ae55-4200-a7f3-d96d727c8954','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:47:20','2025-12-16 14:47:20','2025-12-16 14:47:20'),('f0465ce7-fafd-432a-827e-ce7fa0dcf719','59ffc799-d8f2-4dc1-8d1b-a34087fc784c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:03:46','2025-12-31 04:03:46','2025-12-31 04:03:46'),('f09abcf7-14b7-4e8b-8a6c-40030d3a5306','8a92fb37-bec2-4b80-a20b-79ca21758b34','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:28:41','2025-12-16 14:28:41','2025-12-16 14:28:41'),('f0c010a7-ee87-4a2a-a130-a3e9ecabf433','948f0e69-c414-4cc3-a3a0-403e57304c43','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:25:29','2025-12-31 06:25:29','2025-12-31 06:25:29'),('f1399fb6-f98b-4fa8-a390-1ed6b0c352aa','c95ab3df-9611-4f3d-90c1-23e296ede79d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:50:08','2025-12-16 12:50:08','2025-12-16 12:50:08'),('f14e9925-2390-49e0-919d-9d3775552122','e3661cdf-c684-4094-b75b-eaf3cf26850f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:47:51','2025-12-16 14:47:51','2025-12-16 14:47:51'),('f175eac8-3ea0-43b4-a48d-9f94a6a5b6be','4e6812b5-e807-4939-a482-56e77128326f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 12:08:56','2025-12-16 12:08:56','2025-12-16 12:08:56'),('f191aa93-8e33-4b82-b9c0-4e22526ca774','003d374c-0aa0-4e05-9a55-ba42df54965c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:52:40','2025-12-31 04:52:40','2025-12-31 04:52:40'),('f19f6b83-89bf-448a-98f7-6697021f07ce','58768460-fffd-498f-9d9f-616ce0280c02','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:58:10','2025-12-16 13:58:10','2025-12-16 13:58:10'),('f1a4c732-a71d-469e-90ad-04343b54ce98','938e4eb6-fbe8-4756-af9d-09545609b5b8','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 02:07:02','2025-12-17 02:07:03','2025-12-17 02:07:03'),('f1b5ffdc-4d49-490f-a03e-f897a6576712','f4d8f812-b119-4137-9316-1451b5cbe79d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:55:06','2025-12-17 07:55:06','2025-12-17 07:55:06'),('f1e949bc-8f25-46b2-9e63-fe017b8abbf0','37ed0181-94c1-40cf-88fe-395416f7dbef','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:00:16','2025-12-17 07:00:16','2025-12-17 07:00:16'),('f1ffd542-59dd-4703-a94a-65728f8834ac','9f722b95-009a-4876-9e9e-6522eef25412','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 14:31:36','2025-12-31 14:31:36','2025-12-31 14:31:36'),('f22c08bf-b18e-4cfa-bf0d-7221ee9d283b','7fdcc95b-6474-4f07-9d90-8724bad01a50','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:49:22','2025-12-16 13:49:22','2025-12-16 13:49:22'),('f25edf75-8ed3-445d-81e3-920ebfb48348','96473d9f-109c-4446-9e79-f849b4782f6a','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:47:27','2025-12-16 14:47:27','2025-12-16 14:47:27'),('f2b69c8c-9e2f-4794-8cb0-787e2a014e8d','8aa5ca7e-3217-42c9-9754-4517d9125508','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:37:53','2025-12-16 14:37:53','2025-12-16 14:37:53'),('f2c31e5e-f6be-4c56-8e59-3fe740d0eb56','caeee4ee-3ebd-4f76-bd68-f95030315742','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 03:59:47','2025-12-17 03:59:47','2025-12-17 03:59:47'),('f2f38e17-a96b-4e91-9819-365832572999','fcb74f61-e96a-47ef-ab8e-d2f4fbc2a99f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:37:43','2025-12-17 07:37:43','2025-12-17 07:37:43'),('f315d20f-34ac-4fb5-b05d-8c41a978788d','9cac8fa8-8d1e-447c-85e6-b89487147025','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:10:39','2025-12-31 06:10:39','2025-12-31 06:10:39'),('f32a1d08-789e-4cba-a5c6-1ac693d16ca9','233f9396-6dde-4e8a-9ce0-a6c40eda68f7','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:36:54','2025-12-17 07:36:54','2025-12-17 07:36:54'),('f37ac11c-2f5a-47aa-a58f-8092573b1c49','b080d858-fa50-4bfe-97aa-1a1ee6ec4012','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-31 14:40:46','2025-12-31 14:40:46','2025-12-31 14:40:46'),('f395a84c-9d6a-419c-9db2-fbf0612df5b7','1b7e6107-52a3-4d76-be13-56079924159b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-14 14:48:54','2025-12-14 14:48:54','2025-12-14 14:48:54'),('f41e8444-84d0-496c-a3e4-e530608b4c17','9ba43158-5b24-4c6f-a09f-81500220e34d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:37','2025-12-17 07:38:37','2025-12-17 07:38:37'),('f443cdf7-06d0-4e15-8f88-3cf3e070db6a','7bc35a22-67df-42ad-81cb-a67d2d5192ca','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-24 12:25:28','2025-12-24 12:25:28','2025-12-24 12:25:28'),('f4851b1d-9969-4259-bb93-810a52099a7c','7ac5412b-7151-4086-a8da-a6e4a2c43a85','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-20 13:32:13','2025-12-20 13:32:13','2025-12-20 13:32:13'),('f4c6b699-c981-4012-b726-8daed00485a1','1ab8f3fe-9095-4017-a154-93568cd6419b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:52:11','2025-12-31 04:52:11','2025-12-31 04:52:11'),('f4ee522f-1add-4005-a6ca-901f72ef09eb','e63da05c-f31e-4983-b429-ac4bfa0f3e2d','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 04:57:33','2025-12-31 04:57:33','2025-12-31 04:57:33'),('f5963abb-d0d3-480d-97b5-8ac6bbd824ae','a3241eaf-4285-4018-90ca-cea46e67ada2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 06:13:34','2025-12-16 06:13:35','2025-12-16 06:13:35'),('f5ad3023-3133-4eb8-9bea-60d5fdee184d','9438b962-b666-4bf9-a774-7a1709dde2fd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:31','2025-12-31 02:12:31','2025-12-31 02:12:31'),('f5c24b5e-4c83-40af-ad27-0977c1ce865f','2dec49d3-92e8-48ee-83df-796dbe1e02dd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:07:05','2025-12-16 13:07:06','2025-12-16 13:07:06'),('f5dfab44-8ec0-44e2-9fdc-f405e89c02e7','7ddd25fb-23f7-4fc0-8f90-705849bf95dc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:28:09','2025-12-16 14:28:09','2025-12-16 14:28:09'),('f5e59575-b2cf-43fb-bb47-e9605ceffcb6','7a46bda3-84cc-4963-9ceb-d3bbe337daf7','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:20:36','2026-10-01 10:20:34','2026-10-01 10:20:34'),('f63bafbc-2483-41cf-81e8-4246bac2083c','ba0cae45-1b05-4f13-894b-b0d5e48cb0a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:12:15','2025-12-17 11:12:15','2025-12-17 11:12:15'),('f691a272-c990-45b1-a089-d7837586b290','7885b209-2134-4605-8684-451ddf7cc535','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:03:58','2025-12-17 06:03:58','2025-12-17 06:03:58'),('f73a826d-9988-4225-872c-25461ec0ae0e','31de8c08-4a72-421c-a082-0247f51e2f87','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:59:32','2025-12-17 06:59:32','2025-12-17 06:59:32'),('f751850d-742f-4ade-8094-6d9fffafbaf0','ab58e831-9b7c-4943-826e-26efea420ac1','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:12:30','2025-12-31 02:12:30','2025-12-31 02:12:30'),('f7b0330e-af12-40ae-b17b-3b13b8789822','ebc238dd-21a4-4ddd-9a6a-7038dae6cebf','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:48:18','2025-12-16 14:48:18','2025-12-16 14:48:18'),('f8501872-4bff-4170-bafb-ee52dcf03909','ca0e3862-5aff-437d-8aa2-276aa394d51c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 06:10:37','2025-12-31 06:10:38','2025-12-31 06:10:38'),('f964db2e-3309-4a8f-9ef8-b6c36a090113','509870ad-2f71-4bd0-bcba-f0cd3a9050df','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:10:19','2025-12-31 02:10:19','2025-12-31 02:10:19'),('fa4d245a-5dc4-4fd5-9937-bb3c749ef6ae','c88ebd2c-bf5e-4dfe-9ff3-5222b7e5d0fb','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-15 17:09:03','2025-12-15 17:09:03','2025-12-15 17:09:03'),('fa94021b-f328-4505-b5ee-64359d80f6ee','3a90ceec-1aa7-46ab-8136-697d0f012109','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2026-08-28 13:41:17','2026-08-28 13:41:17','2026-08-28 13:41:17'),('fac5c589-84b7-49b5-bdae-0957ca61c473','675fd1f0-0456-4f60-8f21-dc5861323540','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:38:48','2025-12-17 07:38:48','2025-12-17 07:38:48'),('face5bde-bfc0-442b-907e-fe6b7ff71548','e4c48d0f-3a6a-48c4-88bb-b972c653f5df','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-09-30 13:39:39','2026-09-30 13:39:39','2026-09-30 13:39:39'),('fb6e80ce-050f-4b8b-8919-3fbaa430d58f','c73bdcff-5fb0-4d23-9f82-62bdce1e15fc','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 13:20:41','2025-12-16 13:20:41','2025-12-16 13:20:41'),('fc31d345-8991-476d-8d0c-4de2cdaa188a','e1deb9ca-d595-43cc-9730-d29bbadf106f','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:38:50','2025-12-16 14:38:50','2025-12-16 14:38:50'),('fc360429-ede4-4432-b93d-366bed8701d3','0c1179b7-0a43-4c5f-8b2a-16d5b8f1f82c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:30:04','2025-12-17 07:30:04','2025-12-17 07:30:04'),('fc5192cf-a3c5-4f82-8b2e-c77b32b0eda1','f9f246ac-bac4-48c3-a57f-4f7e9843b121','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 15:13:55','2025-12-31 15:13:55','2025-12-31 15:13:55'),('fc640dd9-562b-4784-a452-bbe6b247a076','c1798abb-cff2-4168-a7d2-178639036bfb','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-15 11:39:36','2025-12-15 11:39:36','2025-12-15 11:39:36'),('fc83a25c-e174-48be-af8c-97b375801d52','abdc0e1a-6e9d-4a9c-aaec-12e707045ae2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:01:50','2025-12-17 07:01:50','2025-12-17 07:01:50'),('fce0f769-ab31-4fc9-a538-893745f25323','509870ad-2f71-4bd0-bcba-f0cd3a9050df','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-30 17:27:19','2025-12-30 17:27:19','2025-12-30 17:27:19'),('fd0772f2-d43f-4055-8be5-5636ade5cb7a','fd20b77e-4969-4fb7-a239-098db49bd9d7','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 14:41:17','2025-12-16 14:41:17','2025-12-16 14:41:17'),('fd0c8b14-0739-4fdd-b763-cf01eac47917','413b6761-224b-4386-9fdd-f2bbe92514b0','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 06:51:11','2025-12-17 06:51:11','2025-12-17 06:51:11'),('fd3b58fa-d074-46fb-aace-cb093982a9b0','23f317c4-d28f-4539-8044-cee3e71825df','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:16:01','2025-12-16 14:16:01','2025-12-16 14:16:01'),('fd66aea3-5980-4ecd-b971-f7751ab6f71a','6d956381-b651-423f-b0b5-b34b42982a51','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 02:10:20','2025-12-31 02:10:20','2025-12-31 02:10:20'),('fd848137-ddac-4038-b3a1-4121dcf92466','a8497683-217a-4ba4-8434-4c1bfc4cbe8d','eceba0d7-3225-492d-a1e9-04f609ff9571','2026-10-01 10:20:37','2026-10-01 10:20:36','2026-10-01 10:20:36'),('fdef2c12-62bd-4901-b760-7e802d3ea36f','831b5005-fcba-44bc-b089-6bb611fa9fe5','61796564-4a39-457e-a218-1a4dc9bd5f22','2026-09-05 03:10:09','2026-09-05 03:10:09','2026-09-05 03:10:09'),('fe64d671-d341-4faa-9904-de15a04e9e6c','772f9335-b5ed-49df-b396-7f88aad66e66','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 02:15:47','2025-12-16 02:15:47','2025-12-16 02:15:47'),('fec83c4d-25e1-47d3-b852-465d7faceec3','e8e1c706-1d50-483f-bd53-1bfa4ab31341','6ff49abd-07c1-421c-9c52-0b292c67956b','2025-12-16 13:55:45','2025-12-16 13:55:46','2025-12-16 13:55:46'),('fed2faea-446f-4177-9ada-376b86093447','8e972d08-7981-4ba3-8e79-b0cc6aa9b7b9','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:17:00','2025-12-16 14:17:00','2025-12-16 14:17:00'),('ff0b20d4-75f1-4042-876a-cd4fb0126e75','ef4feed6-4dcc-41e0-8a9d-9a6bf7cbf984','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 07:55:05','2025-12-17 07:55:05','2025-12-17 07:55:05'),('ff111f66-dc1e-471c-a3a4-f7ae426a1aad','a76ec385-9713-482e-8fba-ecbf9f422867','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-24 12:25:27','2025-12-24 12:25:27','2025-12-24 12:25:27'),('ffa9679b-224a-4d9e-80a0-f53b955fe5ec','110ae15d-897b-44be-8fb2-fa1a572d6b58','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-24 12:25:33','2025-12-24 12:25:33','2025-12-24 12:25:33'),('ffc8ce4d-5a1b-4085-9ee9-79ad2939d5fb','c7057a30-db2c-4f71-8040-0583c3827a0c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-17 11:08:13','2025-12-17 11:08:13','2025-12-17 11:08:13'),('ffd96996-b372-4cea-8ca0-6f4a85a9df9e','71fdc289-af52-43dd-98af-e251126d96b4','b8bdd193-9c08-4310-8411-1f950308217c','2025-12-30 12:58:40','2025-12-30 12:58:40','2025-12-30 12:58:40'),('ffe70962-b893-4922-a4e6-8bf56e3543ce','a4502205-6ae9-41f0-9d86-14f78813797f','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-16 14:15:52','2025-12-16 14:15:52','2025-12-16 14:15:52');
/*!40000 ALTER TABLE `message_read_receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chat_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `content` text,
  `is_pinned` tinyint(1) DEFAULT NULL,
  `reply_to_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `message_type` varchar(255) DEFAULT NULL,
  `media_urls` json DEFAULT NULL,
  `is_edited` tinyint(1) DEFAULT NULL,
  `edited_at` datetime DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `chat_room_id` (`chat_room_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `messages_ibfk_299` FOREIGN KEY (`chat_room_id`) REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `messages_ibfk_300` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES ('000314de-1839-4009-97b9-949b231ae022','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-20 13:35:39','2025-12-20 13:35:39'),('003d374c-0aa0-4e05-9a55-ba42df54965c','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 04:52:40','2025-12-31 04:52:40'),('004aa27f-0a68-437f-b1b7-2954b7f63441','666257ae-9a19-4d0d-a719-350797918e79','b8bdd193-9c08-4310-8411-1f950308217c','ji',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-31 14:39:53','2025-12-31 14:39:53'),('006a08ca-bdda-43a5-96b5-99debd7cf50f','7da343c5-473a-4373-aba4-83c9ce3be24b','d9bd62e0-4721-4a94-85e4-fa69f96d0974','$TSLA to the moon',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 01:56:53','2025-12-14 01:56:53'),('008307e5-da12-4380-9728-84d9df1ddbaa','7da343c5-473a-4373-aba4-83c9ce3be24b','d9bd62e0-4721-4a94-85e4-fa69f96d0974','ICICI',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 02:30:28','2025-12-14 02:30:28'),('013b1335-0cbe-4ae1-82c8-508f367b6d80','63a8557f-7b08-4387-852b-f06bfcd47405',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-30 12:58:41','2025-12-30 12:58:41'),('018e22be-941d-4f47-8c00-e18e7d9e2c5b','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:36:46','2025-12-16 13:36:46'),('019d7b97-1280-4200-a964-a397bbfb3a4c','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 12:12:27','2025-12-16 12:12:27'),('01b5b789-4640-4736-b2ef-e56a91207bff','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-13 16:53:03','2025-12-13 16:53:03'),('02d3f0f5-9fae-44f8-9ac5-c83d370af525','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-10 07:29:26','2025-12-10 07:29:26'),('048f23b9-99c0-45e0-b2e1-c74fb6df2f90','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 14:42:32','2025-12-14 14:42:32'),('06212a18-8f8f-40cd-b525-562ba918ac59','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 02:41:32','2025-12-14 02:41:32'),('06feb165-1894-47ee-b224-1b05668e6750','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:33:33','2025-12-17 07:33:33'),('073a6c81-b99a-447c-876c-27acaeed85d9','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 13:35:44','2025-12-16 13:35:44'),('095c0482-e5fc-46aa-8ebe-89279e8c9d19','7da343c5-473a-4373-aba4-83c9ce3be24b','d9bd62e0-4721-4a94-85e4-fa69f96d0974','hello',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 02:08:53','2025-12-14 02:08:53'),('09b353c3-697c-4abb-8c29-ca30422f9e83','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'Meeting has ended.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 02:29:57','2025-12-14 02:29:57'),('0a469ae1-b501-4193-ad6f-282638a9138a','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:36:35','2025-12-17 07:36:35'),('0b1880c4-f141-4845-86b4-86d0e838e897','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 08:05:53','2025-12-31 08:05:53'),('0c1179b7-0a43-4c5f-8b2a-16d5b8f1f82c','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:29:33','2025-12-17 07:29:33'),('0c47bbd1-bae2-4218-a7d4-9a0ce64dec67','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 12:08:57','2025-12-16 12:08:57'),('0c8406f7-b1d6-45d0-8338-ee079c7d6551','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-30 17:26:23','2025-12-30 17:26:23'),('0d636ec6-d28f-4a1e-924e-1c8e03ed572b','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 04:09:29','2025-12-31 04:09:29'),('0d689458-f86f-44b3-81da-ed79d75ae871','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'❌ Unable to fetch stock trend data at the moment. Please try later.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-10 07:36:34','2025-12-10 07:36:34'),('0d91552c-f5a8-4238-b85d-726a88291999','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'📊 New poll created: \"What\'s your trading view on TEST N?\". Cast your vote in the sidebar!',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 02:02:27','2025-12-17 02:02:27'),('10074755-47f9-47cc-8803-b7f8b9b6e16a','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'Meeting has ended.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-10 07:30:36','2025-12-10 07:30:36'),('110ae15d-897b-44be-8fb2-fa1a572d6b58','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-24 12:25:33','2025-12-24 12:25:33'),('11c16b3b-852c-41ab-befb-69ae75f2ca79','f8f13aa4-ad16-4089-9fd2-a7af639a9fa6','eceba0d7-3225-492d-a1e9-04f609ff9571','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2026-10-01 10:29:53','2026-10-01 10:29:53'),('121a686c-d1fa-4bdc-b8d3-f8e63ab9d1b3','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hello',0,'95a72116-bc77-4996-8920-10d2d11c3b19','text',NULL,NULL,NULL,NULL,'2025-12-17 07:59:12','2025-12-17 07:59:12'),('13d3d30a-107c-4932-a37a-56cfeaccece7','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','TATA',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-13 17:13:35','2025-12-13 17:13:35'),('1407549c-26ae-4481-a362-6e4f8fdc5586','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','TATA',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-13 16:12:34','2025-12-13 16:12:34'),('142acaa1-dbfc-4424-8213-9f782f29d1fc','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 14:48:55','2025-12-14 14:48:55'),('146939cc-7bbb-4e5b-a9e5-2c0fd2c8a92e','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 03:42:02','2025-12-14 03:42:02'),('1474e5c7-32b2-418c-ad60-2a9412aa069d','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-10 09:34:49','2025-12-10 09:34:49'),('14dc3ae4-0b2f-4c91-9310-c8f99b9c597a','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 06:17:45','2025-12-16 06:17:45'),('163bcec0-916c-4711-9576-96f8079e322d','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 13:50:17','2025-12-16 13:50:17'),('16a65b90-09e0-49d8-97c4-804e99c7a8ac','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-13 15:32:08','2025-12-13 15:32:08'),('1884abd5-dce7-4ba2-9627-f8b470cb436a','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 14:40:07','2025-12-31 14:40:07'),('18d824f1-ac1d-4bfe-899a-609fb75b1e3f','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:30:36','2025-12-17 07:30:36'),('195fcc85-e87c-40a5-94c4-6b43021c94bd','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','$TSLA',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:30:56','2025-12-16 14:30:56'),('1ab281c5-0482-4d2b-be65-cd573767b345','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-24 12:25:39','2025-12-24 12:25:39'),('1ab8f3fe-9095-4017-a154-93568cd6419b','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 04:52:11','2025-12-31 04:52:11'),('1b7e6107-52a3-4d76-be13-56079924159b','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','i',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 14:42:36','2025-12-14 14:42:36'),('1be6b766-6037-43df-b8de-400428d6b16e','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','jio',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-13 17:14:27','2025-12-13 17:14:27'),('1d6a15f2-12f9-4f11-9af6-4eb4a1e39cb6','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 06:02:44','2025-12-16 06:02:44'),('1f120ccc-77ea-4c52-a53f-6904ba36ae6a','63a8557f-7b08-4387-852b-f06bfcd47405',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-30 12:13:39','2025-12-30 12:13:39'),('1f8b3433-ac65-4248-b255-8f01f91a342e','7da343c5-473a-4373-aba4-83c9ce3be24b','d9bd62e0-4721-4a94-85e4-fa69f96d0974','$APLE',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 02:03:20','2025-12-14 02:03:20'),('20fcaf48-3aae-43d8-9c85-043bc1413e31','7da343c5-473a-4373-aba4-83c9ce3be24b','d9bd62e0-4721-4a94-85e4-fa69f96d0974','tcs',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 02:08:58','2025-12-14 02:08:58'),('210dd46c-881e-483b-9dba-90d1259b0f2f','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:37:54','2025-12-16 14:37:54'),('21e0a786-82a0-4799-b527-51da5daad04c','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:37:17','2025-12-16 13:37:17'),('233f9396-6dde-4e8a-9ce0-a6c40eda68f7','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:36:54','2025-12-17 07:36:54'),('234368ba-31e8-49b6-bb3e-bdfc85ca276a','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-10 09:34:44','2025-12-10 09:34:44'),('23513fcc-213f-4348-8ffa-87953658ef79','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:47:28','2025-12-16 14:47:28'),('23f317c4-d28f-4539-8044-cee3e71825df','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hello',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:16:01','2025-12-16 14:16:01'),('2466be8f-1730-4724-a010-59f9cbc110d9','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:51:22','2025-12-16 13:51:22'),('2495e0a6-a94f-4944-bd9f-7cf58930430e','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:15:24','2025-12-16 14:15:24'),('25ebd46b-9ea2-4874-b86b-1e48d631dd0b','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 05:45:29','2025-12-31 05:45:29'),('269a9a84-287b-4ca4-8d1c-93241fd2d655','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 13:38:12','2025-12-16 13:38:12'),('27e2c975-9d35-4864-bd20-ea84d238b470','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','HI',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 03:58:36','2025-12-14 03:58:36'),('27e5204a-9daa-4528-ba63-ac69b5d67936','3fa1ba44-74d8-44bb-8610-e9e835487dcd',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2026-09-05 03:11:17','2026-09-05 03:11:17'),('284f8ec7-14cd-4192-9d03-1001af696cc8','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-10 07:36:28','2025-12-10 07:36:28'),('299f1fb6-49ca-4559-89af-6c2b9fe04ddf','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 Bot is online and ready! ✅',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-20 13:33:03','2025-12-20 13:33:03'),('2a52a948-ae1f-49d9-bd42-58e3bf89f402','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 14:31:37','2025-12-31 14:31:37'),('2a967411-6582-4140-99e3-c2df99bfa3e7','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','TCS',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 03:58:03','2025-12-14 03:58:03'),('2a9a88d7-5c48-425f-8d64-ba4ff979fb5e','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:37:24','2025-12-17 07:37:24'),('2b0d627e-6986-4087-b870-d8081bbc0097','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 02:00:33','2025-12-16 02:00:33'),('2bae2181-9633-4c6b-acd3-80a2e226ebe3','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 04:03:33','2025-12-14 04:03:33'),('2d78471c-ac6e-47e6-8a3e-6d2c30d7ffc2','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'📊 New poll created: \"What\'s your trading view on TCS?\". Cast your vote in the sidebar!',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 04:33:24','2025-12-14 04:33:24'),('2dec49d3-92e8-48ee-83df-796dbe1e02dd','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:04:10','2025-12-16 13:04:10'),('2f304594-e93a-4dec-bbf8-731af26f9c6a','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',0,'ba0cae45-1b05-4f13-894b-b0d5e48cb0a5','text',NULL,NULL,NULL,NULL,'2025-12-31 04:07:28','2025-12-31 04:07:28'),('30078510-8c6c-4d8e-955d-c0e53404d921','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 04:54:42','2025-12-16 04:54:42'),('31de8c08-4a72-421c-a082-0247f51e2f87','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 06:51:12','2025-12-17 06:51:12'),('327fd714-884a-461e-badd-36e66f080b28','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 04:11:30','2025-12-14 04:11:30'),('32f38528-d0dd-45fb-b8b1-7864d7e37af4','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hii',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:28:08','2025-12-16 14:28:08'),('33652329-f6cf-424e-b76f-703747b4b88a','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'📋 Community Guidelines:\n• Keep discussions respectful and professional\n• No personal contact sharing (WhatsApp/Telegram)\n• No scam links or fraudulent content\n• Focus on legitimate trading strategies',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-20 13:34:18','2025-12-20 13:34:18'),('33799069-f69a-48ec-b739-1069b660c773','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 12:11:47','2025-12-16 12:11:47'),('33861e74-4e23-4f84-bbe4-558ebcc4da0e','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 14:40:47','2025-12-31 14:40:47'),('34a7cb1c-73fa-4894-a0dd-e8167f8ed9dc','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hello',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:16:01','2025-12-16 14:16:01'),('36b647a9-d360-4c5f-994e-4eab9f4648d6','7da343c5-473a-4373-aba4-83c9ce3be24b','d9bd62e0-4721-4a94-85e4-fa69f96d0974','hello',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 03:41:07','2025-12-14 03:41:07'),('37ed0181-94c1-40cf-88fe-395416f7dbef','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:00:16','2025-12-17 07:00:16'),('37eefda6-ab9e-4cc5-a3b9-6b3198de4e6a','f8f13aa4-ad16-4089-9fd2-a7af639a9fa6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2026-09-16 13:07:19','2026-09-16 13:07:19'),('3920d22e-bfb6-450d-91f3-46dd6cbd87dd','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-13 16:54:17','2025-12-13 16:54:17'),('3926489c-7171-4afc-8427-10528fdd5385','f8f13aa4-ad16-4089-9fd2-a7af639a9fa6','eceba0d7-3225-492d-a1e9-04f609ff9571','Hello',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2026-09-30 13:39:56','2026-09-30 13:39:56'),('3a90ceec-1aa7-46ab-8136-697d0f012109','3fa1ba44-74d8-44bb-8610-e9e835487dcd',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2026-01-01 15:44:52','2026-01-01 15:44:52'),('3b2a433c-540c-4f7a-9e50-94a2c7071a44','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','ch',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-13 16:08:56','2025-12-13 16:08:56'),('3c03aca5-f6f0-43d3-bd60-27640d1be658','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:58:56','2025-12-17 07:58:56'),('3c1f89e3-4a75-4f2d-a2a5-8540b611315a','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:01:51','2025-12-17 07:01:51'),('3d9b585b-b1a2-44aa-b783-fb91df54d222','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-10 07:29:54','2025-12-10 07:29:54'),('3e011570-22eb-4d5c-95d2-7cf5d2e61322','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 02:16:25','2025-12-16 02:16:25'),('3e6f89e6-f4ba-4d55-a699-c5b16d0ee966','f8f13aa4-ad16-4089-9fd2-a7af639a9fa6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2026-10-01 10:28:27','2026-10-01 10:28:27'),('411a83a6-0699-4f89-b0b3-bd4510546e67','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b','hi',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:15:28','2025-12-16 14:15:28'),('413b6761-224b-4386-9fdd-f2bbe92514b0','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 06:04:19','2025-12-17 06:04:19'),('415e6699-94c3-4da6-9d62-20b1a437515c','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-10 07:29:25','2025-12-10 07:29:25'),('4200d42b-97f0-4e03-9f20-0acc53d1bc5f','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','Invoice-TMFNBSZ0-0002.pdf',NULL,NULL,'file',NULL,NULL,NULL,NULL,'2025-12-13 16:55:04','2025-12-13 16:55:04'),('422f2679-4aad-4807-a965-0efb09b350ad','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 06:41:32','2025-12-31 06:41:32'),('42f4b1a0-3a89-46a4-a240-d29f466d35c6','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 04:00:16','2025-12-17 04:00:16'),('43c1fdb3-81aa-4b70-99f9-e294019aa8f9','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b','hii',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:18:33','2025-12-16 14:18:33'),('43d12912-9650-45d2-8bf8-490981b94bb1','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 02:01:33','2025-12-17 02:01:33'),('43d61a0b-bfce-49a0-8eb9-01f6a231dd8d','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 02:33:10','2025-12-14 02:33:10'),('43fef7d5-0879-4d67-96be-061936ddbec3','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 02:12:06','2025-12-16 02:12:06'),('4436aad2-6514-4419-a2e8-0b2190d001cd','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hii',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 13:07:16','2025-12-16 13:07:16'),('49050511-5ea4-4f83-ad6f-ee83285a114b','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-13 17:08:29','2025-12-13 17:08:29'),('497d72f9-59d3-418f-b0ca-219ccfb8ca73','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 04:28:15','2025-12-14 04:28:15'),('4e6812b5-e807-4939-a482-56e77128326f','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 06:19:57','2025-12-16 06:19:57'),('4f37b0b7-21d8-414d-a00a-df16acd9f2ad','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','$ADLP',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:30:37','2025-12-16 14:30:37'),('4fa2428f-5fde-49f2-9f80-351c0a2dd5c0','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 06:16:08','2025-12-16 06:16:08'),('50096205-1c2f-4398-8215-a10fae06a7fb','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-13 16:54:47','2025-12-13 16:54:47'),('50222596-7e4f-4289-9bd2-607b1654de0c','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hii',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 02:00:53','2025-12-16 02:00:53'),('509870ad-2f71-4bd0-bcba-f0cd3a9050df','12e83e76-b87c-444f-8810-bcba2bdcee62',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-30 17:27:19','2025-12-30 17:27:19'),('5161411d-3f79-4942-8c29-969df6afafda','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:16:09','2025-12-16 14:16:09'),('51ef7e0e-c101-410c-8ea6-1aaf1e7d2192','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-13 17:13:24','2025-12-13 17:13:24'),('52d9cbc1-22b5-4f61-b35a-1e323d6eea8b','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 01:56:30','2025-12-14 01:56:30'),('55995966-f767-4b30-89e0-8def248bd9f4','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hello',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-20 13:32:19','2025-12-20 13:32:19'),('58768460-fffd-498f-9d9f-616ce0280c02','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:57:46','2025-12-16 13:57:46'),('58b01e60-a0ed-4055-b864-b9f55e0b6547','f8f13aa4-ad16-4089-9fd2-a7af639a9fa6','eceba0d7-3225-492d-a1e9-04f609ff9571','Hello',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2026-10-01 10:30:01','2026-10-01 10:30:01'),('598851e2-f6ed-4f7d-963f-b497fe5c5979','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'📋 Community Guidelines:\n• Keep discussions respectful and professional\n• No personal contact sharing (WhatsApp/Telegram)\n• No scam links or fraudulent content\n• Focus on legitimate trading strategies',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 11:09:17','2025-12-17 11:09:17'),('59ffc799-d8f2-4dc1-8d1b-a34087fc784c','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 04:00:24','2025-12-31 04:00:24'),('5a66415b-07fb-4395-9719-c72397728254','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','helllo',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 02:19:27','2025-12-16 02:19:27'),('5b18f413-c689-4bc2-9f6c-e414c24e067c','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-30 17:26:29','2025-12-30 17:26:29'),('5e436bdc-5c0d-4708-9461-8f3e3bd18ed4','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-15 11:39:37','2025-12-15 11:39:37'),('5effaeeb-989e-4476-b07c-f5e8dbd9427d','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 02:01:59','2025-12-17 02:01:59'),('5f048c97-b1b4-4332-9a38-59dd48b0dcb6','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 06:59:33','2025-12-17 06:59:33'),('5ff35203-c7f2-43b3-98df-3bc65f9950ad','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2026-09-05 03:10:10','2026-09-05 03:10:10'),('6019fce4-f9cc-44d8-a97e-db9f1419513a','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 05:49:24','2025-12-31 05:49:24'),('608cb489-6846-4830-b35e-01643eea0d6d','7da343c5-473a-4373-aba4-83c9ce3be24b','d9bd62e0-4721-4a94-85e4-fa69f96d0974','APLE',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 02:03:09','2025-12-14 02:03:09'),('60c55544-b0ab-4255-b501-af6965a0aa27','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'Meeting started! Join here: http://localhost:5173/ChatRooms',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:25:22','2025-12-16 14:25:22'),('61036518-5928-473c-b46e-c2e2d68caecd','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:42:13','2025-12-16 14:42:13'),('62d52c0f-7ed4-454d-8b5f-92e2e2a89abc','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 03:58:29','2025-12-14 03:58:29'),('63425463-e948-4997-a596-f8f89cc3cb59','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 13:50:28','2025-12-16 13:50:28'),('63f46750-8e0a-4073-a22d-fc2c47aede29','12e83e76-b87c-444f-8810-bcba2bdcee62',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 02:12:27','2025-12-31 02:12:27'),('6448382e-2278-4ab8-96bd-67faea3ba680','63a8557f-7b08-4387-852b-f06bfcd47405','eceba0d7-3225-492d-a1e9-04f609ff9571','hi',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-30 12:13:38','2025-12-30 12:13:38'),('64a2744f-5d29-4a40-a8cc-e1c5c92e2b76','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 Available commands:\n/ping - Check bot status\n/trend - Get current stock trend\n/rules - View community guidelines',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 11:10:13','2025-12-17 11:10:13'),('64ac7a42-2306-4b0a-a1bf-119310f08ff6','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 06:31:26','2025-12-31 06:31:26'),('65f5e437-dadb-4696-8caf-445a702f0c5d','7da343c5-473a-4373-aba4-83c9ce3be24b','d9bd62e0-4721-4a94-85e4-fa69f96d0974','Hello World from A',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 01:56:52','2025-12-14 01:56:52'),('6604c0d8-d208-4def-a895-d1726eb703eb','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 13:38:34','2025-12-16 13:38:34'),('675fd1f0-0456-4f60-8f21-dc5861323540','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:38:38','2025-12-17 07:38:38'),('67d3807d-1598-4256-8b27-d0f3e217c21d','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 04:03:59','2025-12-17 04:03:59'),('6940025c-bd03-43c7-8fbf-6e0cfc46876d','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 06:10:51','2025-12-31 06:10:51'),('6a39ead8-1696-418a-82d1-1f78cee4aa5b','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 13:36:50','2025-12-16 13:36:50'),('6cd6afbe-143f-4470-8df9-c8ea1d247761','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hello',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 13:35:26','2025-12-16 13:35:26'),('6d81c0a1-575e-47e2-a71a-ed2e76b0048b','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:36:47','2025-12-17 07:36:47'),('6d956381-b651-423f-b0b5-b34b42982a51','12e83e76-b87c-444f-8810-bcba2bdcee62',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 02:10:20','2025-12-31 02:10:20'),('6e4ff829-297e-4c94-8c29-79bef189c9a7','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:40:45','2025-12-16 13:40:45'),('6f0c06e4-eb39-400c-85e2-65d0f106a0a5','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 02:03:18','2025-12-17 02:03:18'),('6f19d64b-91e6-47d1-a855-c754f415d69d','3fa1ba44-74d8-44bb-8610-e9e835487dcd',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 15:13:56','2025-12-31 15:13:56'),('6f44d861-a661-47d3-bc3a-9d836b7b95f0','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-17 11:09:05','2025-12-17 11:09:05'),('6fb75884-2272-479a-840a-3c7f0945c9a5','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'Meeting has ended.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 11:11:18','2025-12-17 11:11:18'),('7189e59f-76c5-43b6-a9c4-d31e5c66cf4c','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:30:05','2025-12-17 07:30:05'),('71d9dfcf-ff61-4aba-9244-a442e23b5c8d','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:58:38','2025-12-17 07:58:38'),('71fdc289-af52-43dd-98af-e251126d96b4','63a8557f-7b08-4387-852b-f06bfcd47405',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-30 12:24:51','2025-12-30 12:24:51'),('74656b48-992d-4c86-a0dc-2191d3f2f429','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 Bot is online and ready! ✅',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 03:42:12','2025-12-14 03:42:12'),('747ba0fa-8673-4f28-b9e8-269f584de5d3','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 03:57:15','2025-12-31 03:57:15'),('74d73c85-98f7-49af-9cf7-34ce64818ccc','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hiii',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 02:01:05','2025-12-16 02:01:05'),('751b0a9f-60dd-474b-a00a-0bf41eeb3338','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 05:22:30','2025-12-16 05:22:30'),('756b87df-092b-4382-adde-bd10ff1339d2','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 12:20:16','2025-12-16 12:20:16'),('76238fa3-04cd-45cf-a478-1ae9d6b6827c','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:30:46','2025-12-16 14:30:46'),('772f9335-b5ed-49df-b396-7f88aad66e66','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','he',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 02:13:25','2025-12-16 02:13:25'),('7760e63a-19c7-4497-830c-1193765db760','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:08:59','2025-12-16 14:08:59'),('7820f46d-ba76-430c-89c4-47f69e6aad61','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:07:06','2025-12-16 13:07:06'),('783d7ac9-aef2-408e-b810-0d3b71c6da4d','63a8557f-7b08-4387-852b-f06bfcd47405','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','scam me',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-31 02:12:38','2025-12-31 02:12:38'),('7885b209-2134-4605-8684-451ddf7cc535','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 06:03:58','2025-12-17 06:03:58'),('79ddefb5-a30d-4118-8bd5-6cf51371fb5c','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 05:54:40','2025-12-31 05:54:40'),('7a46bda3-84cc-4963-9ceb-d3bbe337daf7','3fa1ba44-74d8-44bb-8610-e9e835487dcd',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2026-09-16 13:01:39','2026-09-16 13:01:39'),('7a5021df-ac05-4827-9b41-55353e5fc485','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-17 06:03:57','2025-12-17 06:03:57'),('7ac5412b-7151-4086-a8da-a6e4a2c43a85','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-17 07:37:50','2025-12-17 07:37:50'),('7bb8f624-2747-4c0d-bb4f-8a667991f931','666257ae-9a19-4d0d-a719-350797918e79','b8bdd193-9c08-4310-8411-1f950308217c','hello',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-31 14:39:58','2025-12-31 14:39:58'),('7bc35a22-67df-42ad-81cb-a67d2d5192ca','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-24 12:25:28','2025-12-24 12:25:28'),('7c78675c-f3d0-412f-93b3-4f8f1fb8c8f0','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 04:35:49','2025-12-31 04:35:49'),('7d206b8e-8957-4b6d-85ac-ce23da9e29f9','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 06:25:42','2025-12-31 06:25:42'),('7ddd25fb-23f7-4fc0-8f90-705849bf95dc','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:28:09','2025-12-16 14:28:09'),('7e14ae9f-3b68-4c34-b26f-bd65853ced75','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-26 07:46:39','2025-12-26 07:46:39'),('7ed579f0-ded2-43df-83bc-d668e3ca5e93','7da343c5-473a-4373-aba4-83c9ce3be24b','d9bd62e0-4721-4a94-85e4-fa69f96d0974','$ICICI',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 02:30:36','2025-12-14 02:30:36'),('7fdcc95b-6474-4f07-9d90-8724bad01a50','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'📋 Community Guidelines:\n• Keep discussions respectful and professional\n• No personal contact sharing (WhatsApp/Telegram)\n• No scam links or fraudulent content\n• Focus on legitimate trading strategies',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:40:49','2025-12-16 13:40:49'),('814c21fa-95f6-4541-97f9-f0c83040c25f','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 12:18:40','2025-12-16 12:18:40'),('8181a722-9702-41ba-abad-6ad71dd006ba','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 02:06:18','2025-12-17 02:06:18'),('831b5005-fcba-44bc-b089-6bb611fa9fe5','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 14:41:01','2025-12-31 14:41:01'),('8346b36a-613a-4c8e-9fa1-ebf86a500f8c','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 10:16:37','2025-12-17 10:16:37'),('838ba1c2-c029-4ace-b2eb-eb376ea34184','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:50:51','2025-12-16 13:50:51'),('84a943d8-4d00-442f-8484-1039bd54cc7b','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:38:30','2025-12-16 13:38:30'),('86383844-861c-4e7b-821d-29fe64e22b89','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b','hello',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:16:25','2025-12-16 14:16:25'),('865c5585-e2ed-45e1-bba3-53951a71a73e','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 13:27:25','2025-12-16 13:27:25'),('86ea0ba7-5ca9-4625-9f96-5529abb12ecb','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','$SSMD',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 02:33:19','2025-12-14 02:33:19'),('87ab15be-6f9b-4dc2-9540-d2c31f774642','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-10 07:31:42','2025-12-10 07:31:42'),('897e00ce-e2bb-44c5-bca3-65c4b70acda4','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:36:30','2025-12-16 14:36:30'),('89ca8212-4feb-4c70-8f6e-90f15b58136e','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','CAN WE CONNECT',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:46:29','2025-12-16 14:46:29'),('8a621910-efba-43a2-be72-90ce931f3989','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-10 07:36:53','2025-12-10 07:36:53'),('8a92fb37-bec2-4b80-a20b-79ca21758b34','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:28:41','2025-12-16 14:28:41'),('8aa5ca7e-3217-42c9-9754-4517d9125508','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:35:27','2025-12-16 14:35:27'),('8ad89a75-cac7-40f2-8bf1-7556da67f6fd','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 03:56:22','2025-12-31 03:56:22'),('8b95850a-0ce7-430c-bc4b-99d563db0111','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:21:20','2025-12-16 14:21:20'),('8bc25ca3-3618-4a71-b1a2-5b5ccfcfb15d','3fa1ba44-74d8-44bb-8610-e9e835487dcd',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2026-08-28 13:41:18','2026-08-28 13:41:18'),('8d2d048e-e508-47bd-a21d-e067e4dde45b','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 Available commands:\n/ping - Check bot status\n/trend - Get current stock trend\n/rules - View community guidelines',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-10 07:37:00','2025-12-10 07:37:00'),('8e18874b-9ad0-470a-9f22-42843616b8ef','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-26 09:09:02','2025-12-26 09:09:02'),('8e8c9909-c2c2-419c-b98c-d32d815ae508','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 Available commands:\n/ping - Check bot status\n/trend - Get current stock trend\n/rules - View community guidelines',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 06:02:35','2025-12-16 06:02:35'),('8e972d08-7981-4ba3-8e79-b0cc6aa9b7b9','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','thiskjing so hard',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:17:00','2025-12-16 14:17:00'),('8e9f085b-6fba-4928-8c6f-9800ec9d9255','7da343c5-473a-4373-aba4-83c9ce3be24b','d9bd62e0-4721-4a94-85e4-fa69f96d0974','$AAPL',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 02:41:38','2025-12-14 02:41:38'),('8f5b8d7e-a9d0-43f7-b6a6-39f5ba46a650','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-10 07:30:51','2025-12-10 07:30:51'),('90e230e6-766a-4e9b-88ad-d5043bdc8106','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 Bot is online and ready! ✅',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 06:13:04','2025-12-16 06:13:04'),('912088a1-4faa-40bc-aebc-e031f4b34089','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','HI',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:31:13','2025-12-16 14:31:13'),('9196b369-7694-4842-a456-98a7cb1698b8','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:34:31','2025-12-17 07:34:31'),('92328b71-24ce-4259-be7b-eefc6eb36cc4','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 13:11:58','2025-12-17 13:11:58'),('928d5b11-c4d2-4640-a91f-cfd9e0b5d96a','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'Meeting has ended.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 04:28:30','2025-12-14 04:28:30'),('938e4eb6-fbe8-4756-af9d-09545609b5b8','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 02:06:47','2025-12-17 02:06:47'),('93d76b8d-e41f-4f31-892e-6cd449692db1','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:08:51','2025-12-16 14:08:51'),('94367287-7ed5-44a4-8602-d9c6732ce501','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 12:17:59','2025-12-16 12:17:59'),('9438b962-b666-4bf9-a774-7a1709dde2fd','63a8557f-7b08-4387-852b-f06bfcd47405',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 02:12:31','2025-12-31 02:12:31'),('948f0e69-c414-4cc3-a3a0-403e57304c43','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 06:25:29','2025-12-31 06:25:29'),('94a6e642-6415-4194-a792-96f5759361b8','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-13 16:08:53','2025-12-13 16:08:53'),('95a72116-bc77-4996-8920-10d2d11c3b19','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hiiiii',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-17 07:58:59','2025-12-17 07:58:59'),('95f6b22f-98a0-4266-a9c8-74aff556f32a','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 04:07:14','2025-12-31 04:07:14'),('9602e638-c41c-4070-a44f-9681554b6bf4','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:41:18','2025-12-16 14:41:18'),('96473d9f-109c-4446-9e79-f849b4782f6a','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b','NEED TO show poll card in chat',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:40:40','2025-12-16 14:40:40'),('96d4edb7-a7da-420a-923e-1b16ff316989','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-13 15:31:20','2025-12-13 15:31:20'),('976b0b1d-6fc2-43f3-98f9-8c52316712f9','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-26 07:46:22','2025-12-26 07:46:22'),('98d08f95-8b16-4f5f-87c5-eb1e12df1669','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 02:07:18','2025-12-17 02:07:18'),('990f3976-fad2-46a5-b342-57225227deac','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:59:23','2025-12-17 07:59:23'),('993f3132-015d-4597-bcf0-c88c4219f7a2','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:55:51','2025-12-16 13:55:51'),('9a29c581-7610-40fc-ac63-7c4a9ebb6571','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 03:56:17','2025-12-31 03:56:17'),('9a724947-d218-4acf-b33a-62bee94447a4','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 12:16:53','2025-12-16 12:16:53'),('9b398921-60fe-44f7-a3bd-6ef55a587cea','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'📊 New poll created: \"What\'s your trading view on TEST?\". Cast your vote in the sidebar!',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-13 17:09:40','2025-12-13 17:09:40'),('9b62b42d-5122-41c0-ab59-6fb479cd300f','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 02:01:17','2025-12-17 02:01:17'),('9b6cb9ef-2d70-4af8-839f-990acd5c7c35','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b','hello',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 13:50:26','2025-12-16 13:50:26'),('9ba43158-5b24-4c6f-a09f-81500220e34d','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:38:28','2025-12-17 07:38:28'),('9bfb1d17-5cd1-4b55-b223-a694f8041482','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 04:06:17','2025-12-31 04:06:17'),('9ca6709d-3bca-4e14-9b57-58b7a5857c90','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'Meeting has ended.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 02:33:33','2025-12-14 02:33:33'),('9cac8fa8-8d1e-447c-85e6-b89487147025','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 06:10:39','2025-12-31 06:10:39'),('9d5e0763-d7fb-40f9-a7dc-da03ec3351e8','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:30:27','2025-12-16 14:30:27'),('9e2435bd-2822-49c6-8358-7db2310aaedb','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 Available commands:\n/ping - Check bot status\n/trend - Get current stock trend\n/rules - View community guidelines',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 11:09:10','2025-12-17 11:09:10'),('9e33285c-ddab-4844-bc23-8593f8a55ec3','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 03:41:50','2025-12-14 03:41:50'),('9f19a276-38c8-4ab6-bb7d-de79872befe4','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-13 16:52:55','2025-12-13 16:52:55'),('9f722b95-009a-4876-9e9e-6522eef25412','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 08:26:14','2025-12-31 08:26:14'),('a0cc0b45-d5e1-49e3-a463-d37e9ff546c8','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:05:03','2025-12-17 07:05:03'),('a3241eaf-4285-4018-90ca-cea46e67ada2','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'❌ Unable to fetch stock trend data at the moment. Please try later.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 06:13:24','2025-12-16 06:13:24'),('a4502205-6ae9-41f0-9d86-14f78813797f','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:15:29','2025-12-16 14:15:29'),('a477a953-67e3-4736-9fce-cb516ba69d44','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 04:57:34','2025-12-31 04:57:34'),('a4f308eb-fd74-4956-aeb0-5c025e929e24','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'📋 Community Guidelines:\n• Keep discussions respectful and professional\n• No personal contact sharing (WhatsApp/Telegram)\n• No scam links or fraudulent content\n• Focus on legitimate trading strategies',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:51:14','2025-12-16 13:51:14'),('a51e88d8-5b40-4959-8e79-901ef38516a1','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:47:52','2025-12-16 14:47:52'),('a5acc285-0c3a-4231-a92d-567bd70c98d1','f8f13aa4-ad16-4089-9fd2-a7af639a9fa6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2026-09-05 07:40:24','2026-09-05 07:40:24'),('a61345d4-cf93-4315-b576-a077cd21e346','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 02:02:40','2025-12-17 02:02:40'),('a6b7b064-ae55-4200-a7f3-d96d727c8954','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:47:20','2025-12-16 14:47:20'),('a74da425-b84b-48e4-99ab-881889dbe848','12e83e76-b87c-444f-8810-bcba2bdcee62','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-30 17:27:18','2025-12-30 17:27:18'),('a76ec385-9713-482e-8fba-ecbf9f422867','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-24 12:25:27','2025-12-24 12:25:27'),('a83bfd73-06a2-48a9-a1fb-7de66dcac92f','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:26:43','2025-12-16 13:26:43'),('a8497683-217a-4ba4-8434-4c1bfc4cbe8d','3fa1ba44-74d8-44bb-8610-e9e835487dcd',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2026-10-01 10:20:35','2026-10-01 10:20:35'),('a925c1f1-3081-477f-b9f7-4fe8342b3dba','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 02:13:18','2025-12-16 02:13:18'),('a98974b4-f57d-4d5f-81c0-7f4a7f3dd7d4','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:41:27','2025-12-16 14:41:27'),('a9db1e2c-4f27-4662-aa4d-4c3759c423f1','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:35:23','2025-12-16 13:35:23'),('aa69f0a8-1489-44a8-b4bd-ef2ea26519f0','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',0,'b6ce7735-ad86-4b72-9084-65eb42fd4997','text',NULL,NULL,NULL,NULL,'2025-12-16 13:58:33','2025-12-16 13:58:33'),('ab58e831-9b7c-4943-826e-26efea420ac1','63a8557f-7b08-4387-852b-f06bfcd47405','b8bdd193-9c08-4310-8411-1f950308217c','hello',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-30 12:58:52','2025-12-30 12:58:52'),('abc57aed-ee26-43b8-b02c-a8251c5090a6','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-13 15:31:25','2025-12-13 15:31:25'),('abdc0e1a-6e9d-4a9c-aaec-12e707045ae2','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:01:36','2025-12-17 07:01:36'),('ac607fc6-1775-4615-b7d6-e7aabbf3c2d6','666257ae-9a19-4d0d-a719-350797918e79',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 14:39:54','2025-12-31 14:39:54'),('ac8e97bb-1b7b-4f23-82b6-f167a89675b8','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 02:19:24','2025-12-16 02:19:24'),('ac9e4724-0145-4446-b3a9-d953369ea4ca','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:16:09','2025-12-16 14:16:09'),('aceed091-0dc4-436e-9e39-8193767ef535','f8f13aa4-ad16-4089-9fd2-a7af639a9fa6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2026-10-01 10:29:51','2026-10-01 10:29:51'),('ad29958c-418b-497c-9b94-01229387830c','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 11:08:14','2025-12-17 11:08:14'),('b003f86f-4a0f-490c-aacc-9eec17ffa6dd','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 02:12:45','2025-12-31 02:12:45'),('b080d858-fa50-4bfe-97aa-1a1ee6ec4012','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 05:54:20','2025-12-31 05:54:20'),('b31ccc0f-fc55-4ff4-b5b2-fc7f0c54056e','eb7610b3-2539-47f4-ab11-acb370d68ae6','eceba0d7-3225-492d-a1e9-04f609ff9571','Hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2026-09-05 11:23:09','2026-09-05 11:23:09'),('b3d53a9d-dc45-4039-93eb-f02a5135743c','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,'b6ce7735-ad86-4b72-9084-65eb42fd4997','text',NULL,NULL,NULL,NULL,'2025-12-16 13:58:33','2025-12-16 13:58:33'),('b466c161-ed6d-4540-8872-d8973aa87b18','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 06:03:19','2025-12-17 06:03:19'),('b64e9d67-3ec1-47c3-be99-6361ac75b4ab','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'Meeting started! Join here: https://meet.google.com/exz53y',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 02:28:58','2025-12-14 02:28:58'),('b6ce7735-ad86-4b72-9084-65eb42fd4997','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:58:10','2025-12-16 13:58:10'),('b76f1ce6-ee6c-47bb-a4e2-7943de3bfa7d','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:23:03','2025-12-16 14:23:03'),('ba0cae45-1b05-4f13-894b-b0d5e48cb0a5','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','PROTOCALL-V1 (1).pdf',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-17 11:12:15','2025-12-17 11:12:15'),('ba21021a-d019-4c8c-98bc-81e0abcddb7d','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'📋 Community Guidelines:\n• Keep discussions respectful and professional\n• No personal contact sharing (WhatsApp/Telegram)\n• No scam links or fraudulent content\n• Focus on legitimate trading strategies',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 06:13:15','2025-12-16 06:13:15'),('bb7fc8f0-75c8-4361-9ca3-9409bef55760','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 02:04:04','2025-12-17 02:04:04'),('bbbba7e4-94de-4f35-8de9-065b11b4bf9c','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 02:16:16','2025-12-16 02:16:16'),('bbea81db-a256-408a-83c2-161bcdb171f7','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b','hii',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:18:32','2025-12-16 14:18:32'),('bbf011d3-08b4-454d-a8b5-f246b5bb3759','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 04:03:46','2025-12-31 04:03:46'),('bc8cf05c-0521-45b3-8200-2bdb401303bc','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 13:50:45','2025-12-16 13:50:45'),('bcd04a19-401f-4d70-8caf-3edb9aa7dba7','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 Available commands:\n/ping - Check bot status\n/trend - Get current stock trend\n/rules - View community guidelines',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-13 16:54:37','2025-12-13 16:54:37'),('bce77d89-02eb-4651-b605-c86f9e70c60e','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 14:32:48','2025-12-31 14:32:48'),('bcf5f535-e293-4842-8f61-0f64a0ed3f3a','3fa1ba44-74d8-44bb-8610-e9e835487dcd',NULL,'🤖 Bot is online and ready! ✅',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2026-08-28 13:41:27','2026-08-28 13:41:27'),('be063f9c-6e46-4344-b40c-1bd259de0ba3','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'Meeting has ended.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:26:00','2025-12-16 14:26:00'),('bee5e1e7-fbff-4c36-8e36-9bafb2181d09','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 Bot is online and ready! ✅',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:51:01','2025-12-16 13:51:01'),('bf2ff94a-40bc-4f22-bb4c-0d9852acecb0','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783','61796564-4a39-457e-a218-1a4dc9bd5f22','hii',0,NULL,'text',NULL,NULL,NULL,NULL,'2026-09-05 03:10:13','2026-09-05 03:10:13'),('bfd5d534-0c6c-4d33-8122-174198d379a7','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 02:00:19','2025-12-16 02:00:19'),('c1543038-e525-43b8-9ea5-89e27d991bd6','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 04:30:59','2025-12-14 04:30:59'),('c1798abb-cff2-4168-a7d2-178639036bfb','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hello',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 14:49:39','2025-12-14 14:49:39'),('c184de49-1618-469d-b6b1-e1f60471f1ed','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','ii',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-13 17:09:05','2025-12-13 17:09:05'),('c1e13256-9470-4ab4-8d0c-23d5ff53c0cc','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 01:55:55','2025-12-16 01:55:55'),('c1e8d6bb-a477-419a-a862-501ecd54353e','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 12:15:09','2025-12-16 12:15:09'),('c24f95b6-5f65-4fb4-a34c-318d9faca6e6','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 12:51:10','2025-12-16 12:51:10'),('c3fb6f4b-a83c-4335-b229-d8c9ab5ee308','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:50:37','2025-12-16 13:50:37'),('c47ea3d8-666c-4e3c-a682-5fcd6842b738','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','SSMD',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 02:33:12','2025-12-14 02:33:12'),('c557f030-c51a-4cd6-8da9-64d1e006c0d1','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'📊 New poll created: \"What\'s your trading view on TEST APPU?\". Cast your vote in the sidebar!',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-10 07:29:35','2025-12-10 07:29:35'),('c65c4e20-da37-4736-ad59-4341c800f594','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 02:03:31','2025-12-17 02:03:31'),('c6c78fa4-aafd-4de8-b784-0223b481263d','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 Available commands:\n/ping - Check bot status\n/trend - Get current stock trend\n/rules - View community guidelines',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 02:08:38','2025-12-14 02:08:38'),('c7057a30-db2c-4f71-8040-0583c3827a0c','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:36:44','2025-12-17 07:36:44'),('c73bdcff-5fb0-4d23-9f82-62bdce1e15fc','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:15:04','2025-12-16 13:15:04'),('c88ebd2c-bf5e-4dfe-9ff3-5222b7e5d0fb','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','helllo',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-15 17:09:03','2025-12-15 17:09:03'),('c8dba756-6af7-431d-b363-3ab5b9409e45','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:59:20','2025-12-16 13:59:20'),('c95ab3df-9611-4f3d-90c1-23e296ede79d','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 12:48:21','2025-12-16 12:48:21'),('ca0d2382-242f-408c-a979-8043a20cb50d','63a8557f-7b08-4387-852b-f06bfcd47405','b8bdd193-9c08-4310-8411-1f950308217c','hi',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-30 12:58:47','2025-12-30 12:58:47'),('ca0e3862-5aff-437d-8aa2-276aa394d51c','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 05:58:51','2025-12-31 05:58:51'),('caeee4ee-3ebd-4f76-bd68-f95030315742','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 03:59:47','2025-12-17 03:59:47'),('cb26f7b7-f0cd-43ea-b98b-41ba7a86b3c6','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:37:05','2025-12-16 13:37:05'),('cb338679-30c7-460b-8ff6-13031002a98e','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 12:22:14','2025-12-16 12:22:14'),('cb3a2bb6-191a-4117-bb89-4513fa39d7b1','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 06:02:26','2025-12-16 06:02:26'),('cb8aad9a-b5d6-44b6-83f6-5897d7240ca6','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'Meeting started! Join here: https://meet.google.com/gi2dfl',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 02:33:32','2025-12-14 02:33:32'),('cc055891-9d79-43aa-837f-4332d1eaa8e8','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-10 07:33:44','2025-12-10 07:33:44'),('cc716dce-b978-4ce2-9689-bbdf44aa27a0','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',0,'7a5021df-ac05-4827-9b41-55353e5fc485','text',NULL,NULL,NULL,NULL,'2025-12-17 07:55:49','2025-12-17 07:55:49'),('cd7e56f2-709c-4e71-a18b-96c58b631b33','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','BSC',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-10 07:31:31','2025-12-10 07:31:31'),('cdb382c1-c659-48c8-b349-d2e78956fee8','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hello',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 02:11:35','2025-12-16 02:11:35'),('ce04f929-04bb-4988-bf9b-aed655516809','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-15 17:10:16','2025-12-15 17:10:16'),('cee9c995-982c-452c-937d-49c457902cd5','c51dd18d-6c2c-4265-9b6a-8d8b6c7002b2','8720b484-8c4f-4377-9e16-d18a7d5901cc','🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2026-10-09 16:33:58','2026-10-09 16:33:58'),('cfeb9a10-af39-4df7-97f0-29435b1d9835','eb7610b3-2539-47f4-ab11-acb370d68ae6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2026-09-05 11:23:10','2026-09-05 11:23:10'),('d10cb0ce-a48b-4458-a3f3-1d2afdd25a65','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 02:11:19','2025-12-16 02:11:19'),('d19da751-2764-4eab-afbe-518e3d26a755','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','spine.pdf',NULL,NULL,'file',NULL,NULL,NULL,NULL,'2025-12-10 07:30:46','2025-12-10 07:30:46'),('d234bc60-c459-4cf5-a801-3a51c8d64379','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 03:57:56','2025-12-14 03:57:56'),('d3999c52-0983-45aa-89ba-5e9b1c5fb17c','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'Meeting started! Join here: http://localhost:5173/ChatRooms',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 11:11:00','2025-12-17 11:11:00'),('d465c502-9c52-4b1f-904e-e8fcd121b82e','7da343c5-473a-4373-aba4-83c9ce3be24b','d9bd62e0-4721-4a94-85e4-fa69f96d0974','$tcs',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 04:28:56','2025-12-14 04:28:56'),('d5041f4c-3c4c-4c2c-9670-a014a8fda304','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 02:03:00','2025-12-14 02:03:00'),('d5dcd4bc-abdf-418d-a68d-26077c5a2441','3fa1ba44-74d8-44bb-8610-e9e835487dcd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',0,NULL,'text',NULL,NULL,NULL,NULL,'2026-08-28 13:41:22','2026-08-28 13:41:22'),('d5ed3e2e-1329-45cf-b514-dac4452b18fd','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 10:16:11','2025-12-17 10:16:11'),('d9ea34ef-3acd-4d10-b537-397f159521f4','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:50:14','2025-12-16 13:50:14'),('da0d750f-0c2b-47bc-9f56-6d4e8b1bc397','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-20 13:35:30','2025-12-20 13:35:30'),('db1b727e-75ef-4bbd-9417-64d13fb993f8','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 08:05:25','2025-12-31 08:05:25'),('db48d5c6-28ad-4899-99eb-8ca928be158e','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:15:53','2025-12-16 14:15:53'),('db8c44b2-a59a-44c0-bba2-9313990467aa','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hello',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 13:37:09','2025-12-16 13:37:09'),('dbcd1db3-f501-462e-82ce-0c2196e911b4','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','thiskjing so hard',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:17:00','2025-12-16 14:17:00'),('dc30a8f5-b2bf-49f2-8896-8c13339ebd88','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 14:35:16','2025-12-31 14:35:16'),('dc82fbbb-8429-46ed-85c4-bb25b8066a39','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'Meeting has ended.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:25:53','2025-12-16 14:25:53'),('dca595f4-8c7c-4825-b4a5-96fb2a9a5ca5','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'Meeting started! Join here: https://meet.google.com/zqxhds',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-10 07:30:28','2025-12-10 07:30:28'),('deac0c57-2ed8-4330-a5d8-0cb4a4cc5648','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 02:06:31','2025-12-14 02:06:31'),('df4f393e-e384-496a-a73c-c29db51737c0','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:25:38','2025-12-16 14:25:38'),('e0a932e9-d1a5-4a70-8ded-b0215ca6b783','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'📊 New poll created: \"What\'s your trading view on TCS?\". Cast your vote in the sidebar!',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:41:38','2025-12-16 14:41:38'),('e0f04034-2bb4-4a60-a75f-205a078e2618','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 Available commands:\n/ping - Check bot status\n/trend - Get current stock trend\n/rules - View community guidelines',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:51:07','2025-12-16 13:51:07'),('e0f0c429-5b9e-43d8-bdfd-38944efc5065','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 06:12:55','2025-12-16 06:12:55'),('e1deb9ca-d595-43cc-9730-d29bbadf106f','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:38:50','2025-12-16 14:38:50'),('e3661cdf-c684-4094-b75b-eaf3cf26850f','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:46:44','2025-12-16 14:46:44'),('e40ce425-3c4c-4259-80f0-8ca7636f87ee','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 06:13:35','2025-12-16 06:13:35'),('e472fb86-65c1-489b-9f70-44517850a7a5','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:31:22','2025-12-16 14:31:22'),('e492ecfc-7334-440e-83e7-999384a0b3fa','7da343c5-473a-4373-aba4-83c9ce3be24b','d9bd62e0-4721-4a94-85e4-fa69f96d0974','maruti',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 02:31:26','2025-12-14 02:31:26'),('e4c48d0f-3a6a-48c4-88bb-b972c653f5df','f8f13aa4-ad16-4089-9fd2-a7af639a9fa6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2026-09-30 13:39:38','2026-09-30 13:39:38'),('e4e1b7f4-1aaf-4ea0-93c5-94b7992a24e9','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:36:01','2025-12-16 14:36:01'),('e52d5599-cdb0-4b42-baa5-38dedad05b72','7da343c5-473a-4373-aba4-83c9ce3be24b','d9bd62e0-4721-4a94-85e4-fa69f96d0974','AAPL',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 02:41:33','2025-12-14 02:41:33'),('e568e689-54b2-4ef6-90a9-5be83cd4a467','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 02:29:45','2025-12-14 02:29:45'),('e63da05c-f31e-4983-b429-ac4bfa0f3e2d','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 04:53:54','2025-12-31 04:53:54'),('e7b4037b-7069-4d89-93d0-b05284cf3bdd','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','GOOGLE',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-13 17:13:43','2025-12-13 17:13:43'),('e8e1c706-1d50-483f-bd53-1bfa4ab31341','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:55:45','2025-12-16 13:55:45'),('e9ed9b2a-50e8-4bc5-8596-e67955a96469','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 03:40:47','2025-12-14 03:40:47'),('eaa359ec-4698-43e6-a55a-4cf25aa61f21','f8f13aa4-ad16-4089-9fd2-a7af639a9fa6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2026-09-16 12:59:54','2026-09-16 12:59:54'),('eaaeac77-3638-44f3-a5ef-07477cbab71f','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 13:35:32','2025-12-16 13:35:32'),('eb9c31e7-9c05-454f-bccb-9412aec0cc53','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',':(',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-31 14:43:29','2025-12-31 14:43:29'),('ebc238dd-21a4-4ddd-9a6a-7038dae6cebf','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:48:17','2025-12-16 14:48:17'),('ec635ca2-62a2-4be0-ba07-9b72757f9ede','f8f13aa4-ad16-4089-9fd2-a7af639a9fa6','eceba0d7-3225-492d-a1e9-04f609ff9571','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2026-09-05 07:40:23','2026-09-05 07:40:23'),('ec9c15f1-ab3e-4c03-b145-6d00c866f9d8','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-15 17:09:01','2025-12-15 17:09:01'),('ece39c36-9ca5-4fbe-9953-3e4b98be58b8','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 08:22:41','2025-12-31 08:22:41'),('edb9b7ff-fae2-4986-ad56-71cdca019789','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 04:03:06','2025-12-17 04:03:06'),('ede10a4e-323b-4267-8320-9af1e538c58c','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 02:07:03','2025-12-17 02:07:03'),('ef2a9681-7653-4c0c-af66-80f771f58587','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 14:29:17','2025-12-16 14:29:17'),('ef4feed6-4dcc-41e0-8a9d-9a6bf7cbf984','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:38:49','2025-12-17 07:38:49'),('f0a44ed8-820e-460e-a93d-2ac1ceb048bb','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 05:23:13','2025-12-16 05:23:13'),('f2118363-2ea7-4191-945d-2339a64df870','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 12:50:08','2025-12-16 12:50:08'),('f226db02-7b36-43aa-8327-622c441ed672','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 04:46:13','2025-12-16 04:46:13'),('f2af311e-e6b3-4c72-8e14-60a9cfc8da73','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 12:45:39','2025-12-16 12:45:39'),('f491e7a2-94fa-45fc-a7b1-3f503edb3ffe','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-20 13:32:14','2025-12-20 13:32:14'),('f4d8f812-b119-4137-9316-1451b5cbe79d','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:55:06','2025-12-17 07:55:06'),('f4f78346-fcfd-49e6-b74c-941b4c20026b','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 Available commands:\n/ping - Check bot status\n/trend - Get current stock trend\n/rules - View community guidelines',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:40:22','2025-12-16 13:40:22'),('f59c149c-920e-4fe2-a549-207b2cedac47','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b','hi',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:21:25','2025-12-16 14:21:25'),('f6785d61-61fe-4c34-bd1d-4468b6f33a7a','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b','hello',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:16:25','2025-12-16 14:16:25'),('f71da1e8-cdc8-49b8-ab8d-0a84dae4f0a0','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 05:54:24','2025-12-31 05:54:24'),('f769a81d-bf60-4dac-839c-4de5fa122a3f','7da343c5-473a-4373-aba4-83c9ce3be24b','d9bd62e0-4721-4a94-85e4-fa69f96d0974','hello',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 02:10:57','2025-12-14 02:10:57'),('f82c8e17-5434-4828-b918-78e9a71f010a','7da343c5-473a-4373-aba4-83c9ce3be24b','d9bd62e0-4721-4a94-85e4-fa69f96d0974','hi',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-14 04:28:37','2025-12-14 04:28:37'),('f851a2e4-3036-4770-8856-b004d5549e9b','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-10 07:31:28','2025-12-10 07:31:28'),('f9442f2a-a984-41e5-88a2-3d369cf51bd3','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-16 13:10:28','2025-12-16 13:10:28'),('f9823aa6-c4f6-4755-a788-ed5bad9f36c2','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 Available commands:\n/ping - Check bot status\n/trend - Get current stock trend\n/rules - View community guidelines',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-20 13:33:45','2025-12-20 13:33:45'),('f9a37238-dbbd-454c-8f77-e9485858cdf2','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','hello',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 02:00:38','2025-12-16 02:00:38'),('f9f246ac-bac4-48c3-a57f-4f7e9843b121','3fa1ba44-74d8-44bb-8610-e9e835487dcd',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-31 14:43:30','2025-12-31 14:43:30'),('fa2e96a9-37d6-441d-92c5-7b2e97b4b656','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 02:29:20','2025-12-14 02:29:20'),('fc005df3-29e6-484d-8fbf-bcacefccd0a1','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 11:08:57','2025-12-17 11:08:57'),('fc1d0254-8009-4207-98a2-0ffdf425b29e','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'🤖 Available commands:\n/ping - Check bot status\n/trend - Get current stock trend\n/rules - View community guidelines',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-13 17:09:18','2025-12-13 17:09:18'),('fc4b3844-760c-4e3f-9429-0d7005645808','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'Meeting started! Join here: https://meet.google.com/lva0ch',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-14 03:40:51','2025-12-14 03:40:51'),('fcb74f61-e96a-47ef-ab8e-d2f4fbc2a99f','f246acd0-0bf1-4489-bf3a-fdbb1e39c642',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 07:37:42','2025-12-17 07:37:42'),('fcca83de-d79e-4541-8a04-cc2158e0a902','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 Bot is online and ready! ✅',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-17 11:10:17','2025-12-17 11:10:17'),('fd20b77e-4969-4fb7-a239-098db49bd9d7','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','6ff49abd-07c1-421c-9c52-0b292c67956b','HI',0,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-16 14:41:17','2025-12-16 14:41:17'),('fd524242-29dd-446a-8a1d-668a985304f7','f8166250-4f89-403d-88a5-87e50a9015b6',NULL,'🤖 AI Assistant is online! Use /ping to test or /trend for market data. Type /help for all commands.',NULL,NULL,'bot_insight',NULL,NULL,NULL,NULL,'2025-12-30 17:26:34','2025-12-30 17:26:34'),('fea9c646-d216-4e9e-b170-593369f72af4','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','i',NULL,NULL,'text',NULL,NULL,NULL,NULL,'2025-12-13 17:08:36','2025-12-13 17:08:36');
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `moderation_logs`
--

DROP TABLE IF EXISTS `moderation_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `moderation_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `moderator_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `target_type` varchar(255) DEFAULT NULL,
  `target_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `reason` text,
  `severity` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `admin_reviewed` tinyint(1) DEFAULT '0',
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `violation_type` varchar(255) DEFAULT NULL,
  `message_content` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `moderation_logs`
--

LOCK TABLES `moderation_logs` WRITE;
/*!40000 ALTER TABLE `moderation_logs` DISABLE KEYS */;
INSERT INTO `moderation_logs` VALUES ('720c38c8-d808-4d1a-9f8c-322982343d6f',NULL,NULL,NULL,NULL,NULL,'medium','escalated','2025-12-30 17:30:40','2025-12-30 17:30:40',1,'47c4b2b5-1e5f-4829-86a4-16ac0b44b78f','harassment','You are the worst trader ever.'),('a8b8ed28-78d0-4da5-b9d0-55b98f8e3b4c',NULL,NULL,NULL,NULL,NULL,'high','pending','2025-12-30 17:30:40','2025-12-30 17:30:40',0,'47c4b2b5-1e5f-4829-86a4-16ac0b44b78f','spam','Buy this crypto now!!! http://scam.me'),('d0d0c5dd-2feb-452f-879f-387fc0019e7f',NULL,NULL,NULL,NULL,NULL,'low','pending','2025-12-30 17:30:40','2025-12-30 17:30:40',0,'47c4b2b5-1e5f-4829-86a4-16ac0b44b78f','off_topic','What did you eat for breakfast?');
/*!40000 ALTER TABLE `moderation_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `moderation_rules`
--

DROP TABLE IF EXISTS `moderation_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `moderation_rules` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chat_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `rule_type` varchar(255) DEFAULT NULL,
  `conditions` json DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `sensitivity` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `moderation_rules`
--

LOCK TABLES `moderation_rules` WRITE;
/*!40000 ALTER TABLE `moderation_rules` DISABLE KEYS */;
/*!40000 ALTER TABLE `moderation_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `module_approval_requests`
--

DROP TABLE IF EXISTS `module_approval_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `module_approval_requests` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `module_name` varchar(255) DEFAULT NULL,
  `requested_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `approved_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejection_reason` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `module_approval_requests`
--

LOCK TABLES `module_approval_requests` WRITE;
/*!40000 ALTER TABLE `module_approval_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `module_approval_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `news`
--

DROP TABLE IF EXISTS `news`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `news` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `content` text,
  `summary` text,
  `category` varchar(255) DEFAULT NULL,
  `stock_symbols` varchar(255) DEFAULT NULL,
  `tags` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `author_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `source` varchar(255) DEFAULT NULL,
  `views_count` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `news`
--

LOCK TABLES `news` WRITE;
/*!40000 ALTER TABLE `news` DISABLE KEYS */;
INSERT INTO `news` VALUES ('029247cd-20a8-4470-befa-ddcf04af7a8a','Nvidia in advanced talks to buy Israel\'s AI21 Labs for up to $3 billion, report says - Yahoo Finance','Nvidia is in advanced talks to buy Israel-based AI startup AI21 Labs for as much as $3 ​billion, the Calcalist financial daily reported on Tuesday.  Nvidia...','Nvidia is in advanced talks to buy Israel-based AI startup AI21 Labs for as much as $3 ​billion, the Calcalist financial daily reported on Tuesday.  Nvidia...','business',NULL,NULL,'published','2025-12-30 17:10:25',NULL,'https://media.zenfs.com/en/reuters-finance.com/0e8f4a29dfb47f492a7b710def79f858','Yahoo Entertainment',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL),('083f6963-77f3-4f19-bde6-c4d60ab4d6d7','The top car trends to expect at CES 2026 - Mashable','You can still find futuristic EVs at CES, but this year it\'s all about the software on board.','You can still find futuristic EVs at CES, but this year it\'s all about the software on board.','business',NULL,NULL,'published','2025-12-30 17:05:00',NULL,'https://helios-i.mashable.com/imagery/articles/00dCmfhYcwT1z5KAXCivxXP/hero-image.fill.size_1200x675.v1767044061.jpg','Mashable',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL),('1abe4fba-99e2-4b7c-8b25-c953f454cfa6','Ashley Christensen will close beloved Raleigh restaurant early next year - Raleigh News & Observer','A Southern-style fried chicken restaurant in downtown Raleigh will close in 2026 after 14 years. James Beard winner Ashley Christen announced the closing.','A Southern-style fried chicken restaurant in downtown Raleigh will close in 2026 after 14 years. James Beard winner Ashley Christen announced the closing.','business',NULL,NULL,'published','2025-12-30 15:47:00',NULL,'https://www.newsobserver.com/public/entertainment/restaurants/eheub2/picture140251263/alternates/LANDSCAPE_1140/DISPLAY_%20CHICKENBISCUIT1-FE-031','Raleigh News & Observer',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL),('2a9b7c43-9f70-4d99-8ed4-d9f5c54825df','Benihana reveals ambitious expansion plan for the Bay Area - SFGATE','The One Group Hospitality, which acquired international teppanyaki chain Benihana last year, has announced plans to open 10 new restaurants in the Bay Area.','The One Group Hospitality, which acquired international teppanyaki chain Benihana last year, has announced plans to open 10 new restaurants in the Bay Area.','business',NULL,NULL,'published','2025-12-30 21:00:33',NULL,'https://s.hdnux.com/photos/01/06/06/04/18374936/6/rawImage.jpg','SFGate',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL),('319b5d7b-0d7c-4d8e-8eb9-d1f5972f7c16','Jim Cramer\'s top 10 things to watch in the stock market Thursday','This is a fulcrum day for the market.','This is a fulcrum day for the market.','general',NULL,NULL,'published','2026-10-15 12:54:30',NULL,'https://image.cnbcfm.com/api/v1/image/108333423-1783694664972-gettyimages-2284861394-SK_HYNIX_IPO.jpeg?v=1783694687&w=1920&h=1080','CNBC',0,'2026-10-15 13:23:41','2026-10-15 13:23:41','https://www.cnbc.com/investingclub/2026/10/15/jim-cramers-top-10-things-to-watch-in-the-stock-market-thursday.html'),('32c05c58-d75b-4266-93b4-daf8f116ac0b','Nvidia must work with Chinese AI companies on safety, Jensen Huang tells CNBC','Huang told CNBC he has ongoing \"dialogs\" with researchers in China.','Huang told CNBC he has ongoing \"dialogs\" with researchers in China.','general',NULL,NULL,'published','2026-10-15 11:12:51',NULL,'https://image.cnbcfm.com/api/v1/image/108364527-1789665953765-gettyimages-2294936867-2026_sep_14_dreamforce_2974.jpeg?v=1789665981&w=1920&h=1080','CNBC',0,'2026-10-15 11:32:33','2026-10-15 11:32:33','https://www.cnbc.com/2026/10/15/jensen-huang-nvidia-china-ai.html'),('38f37821-d96d-4ad8-9b0e-6172edb7beac','Trump’s social-media company just launched five ‘Made in America’ ETFs - MarketWatch','Truth Social ETFs have unique holdings, but it’s unclear how much Trump’s policies will influence their performance','Truth Social ETFs have unique holdings, but it’s unclear how much Trump’s policies will influence their performance','business',NULL,NULL,'published','2025-12-30 21:11:00',NULL,'https://images.mktw.net/im-517918/social','MarketWatch',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL),('4091b4f6-0c75-4023-a5b8-9df462e0b280','Scammers notched $333 million from bitcoin ATM scams in 2025, FBI says - ABC News','',NULL,'business',NULL,NULL,'published','2025-12-30 22:39:15',NULL,NULL,'ABC News',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL),('4f50c54c-8b34-4008-8cef-5d7da7c12e1e','Idaho company recalls nearly 3,000 pounds of ground beef for E. coli risk - ABC News','An Idaho company is recalling nearly 3,000 pounds of raw ground beef that may have been contaminated with E','An Idaho company is recalling nearly 3,000 pounds of raw ground beef that may have been contaminated with E','business',NULL,NULL,'published','2025-12-30 18:54:53',NULL,'https://i.abcnewsfe.com/a/bbb4fb93-dd96-49c6-ac7d-38bb54605f2a/wirestory_1c4f5260427721b900a694ce0547a70b_16x9.jpg?w=1600','ABC News',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL),('5526d614-2403-48b1-9699-dfa551d1dc8d','Gold and silver see rollercoaster end to blockbuster year - BBC','The price of gold soared by more than 60% this year to hit a record high of more than $4,549.','The price of gold soared by more than 60% this year to hit a record high of more than $4,549.','business',NULL,NULL,'published','2025-12-31 02:18:56',NULL,'https://ichef.bbci.co.uk/news/1024/branded_news/2238/live/88647ff0-e5e3-11f0-956e-47166c96f12f.jpg','BBC News',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL),('58e435b1-3b9b-4910-86a3-03e0e006d3eb','ChatGPT for Teens is not necessarily \'safer than the previous version,\' Common Sense Media finds','Common Sense Media released its report about ChatGPT for Teens\' new features, concluding the tool does not meet the safety standards OpenAI set.','Common Sense Media released its report about ChatGPT for Teens\' new features, concluding the tool does not meet the safety standards OpenAI set.','general',NULL,NULL,'published','2026-10-09 15:07:53',NULL,'https://image.cnbcfm.com/api/v1/image/108374311-1791397647575-Teen_Girl_Using_Phone_While_Preparing_To_Do_Laundr-2185461236-Getty.jpg?v=1791397917&w=1920&h=1080','CNBC',0,'2026-10-09 16:33:36','2026-10-09 16:33:36','https://www.cnbc.com/make-it/2026/10/09/chatgpt-for-teens-safety-common-sense-media.html'),('7af3e673-5ade-4391-a864-e7b438063761','Verizon stock heads for worst day since 2002 as SpaceX U.S. network plans whack telcos','SpaceX announced the spectrum deal Thursday, as the company aims to push deeper into the telecom market through its Starlink service.','SpaceX announced the spectrum deal Thursday, as the company aims to push deeper into the telecom market through its Starlink service.','general',NULL,NULL,'published','2026-10-09 16:26:44',NULL,'https://image.cnbcfm.com/api/v1/image/108252686-1768430174745-gettyimages-2255691654-verizon_08_adjan25.jpeg?v=1791561569&w=1920&h=1080','CNBC',0,'2026-10-09 16:33:36','2026-10-09 16:33:36','https://www.cnbc.com/2026/10/09/verizon-att-tmobile-stocks-spacex-network.html'),('7d7e62bf-7f74-4438-9834-e8944f94d45b','You may never work with an Elizabeth Holmes—but here\'s how to handle a co-worker who makes false claims','You may never a co-worker as enigmatic as Elizabeth Holmes. But you might have one who doesn\'t deliver or misrepresents situations. Try these strategies.','You may never a co-worker as enigmatic as Elizabeth Holmes. But you might have one who doesn\'t deliver or misrepresents situations. Try these strategies.','general',NULL,NULL,'published','2026-10-15 12:49:01',NULL,'https://image.cnbcfm.com/api/v1/image/108409086-1791990684066-261012_COWORKER_FALSE_INFO.png?v=1791990809&w=1920&h=1080','CNBC',0,'2026-10-15 14:30:49','2026-10-15 14:30:49','https://www.cnbc.com/make-it/2026/10/15/how-to-handle-coworker-giving-false-information-expert.html'),('83dce15e-cf3e-42c7-a56c-4bca3b4fb131','Oysters, crab and $400,000 worth of lobster meat stolen in New England - ABC News','Forty-thousand oysters, lobster worth $400,000 and a cache of crabmeat all were stolen in separate recent incidents in New England','Forty-thousand oysters, lobster worth $400,000 and a cache of crabmeat all were stolen in separate recent incidents in New England','business',NULL,NULL,'published','2025-12-31 00:13:39',NULL,'https://i.abcnewsfe.com/a/23a4f5b0-1353-4ed7-82cb-76fdf5770387/wirestory_fdec139a25b80ea05981d1ce09f5940a_16x9.jpg?w=1600','ABC News',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL),('871cab20-7dea-446b-a604-52ac1b7ded09','Idaho $1,000,000 Raffle: See where the winning tickets were sold - KTVB','Are you one of the Gem State\'s newest millionaires? Officials have unveiled the purchase locations of the winning tickets for the Idaho $1,000,000 Raffle.','Are you one of the Gem State\'s newest millionaires? Officials have unveiled the purchase locations of the winning tickets for the Idaho $1,000,000 Raffle.','business',NULL,NULL,'published','2025-12-30 18:14:00',NULL,'https://media.ktvb.com/assets/KTVB/images/ec50635e-1e69-459f-b75c-fbe844b410c6/20251230T180744/ec50635e-1e69-459f-b75c-fbe844b410c6_1140x641.jpg','KTVB.com',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL),('91a78e7f-2871-4760-983b-70b14d19854e','Analyst who predicted S&P 500 rally offers 2026 warning - thestreet.com','Here\'s what could happen to stocks in 2026.','Here\'s what could happen to stocks in 2026.','business',NULL,NULL,'published','2025-12-30 16:42:23',NULL,'https://www.thestreet.com/.image/w_1200,h_630,g_auto,c_fill/NDA6MDAwMDAwMDAyODA1OTAw/wall-street-trader-12-28-2025-gettyimages-2251196257-1.jpg','TheStreet',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL),('95b64264-0ecf-4733-aef5-31e6b323f398','Tech sector outlook remains positive for Q4','Major IT companies are expected to report robust earnings growth in the upcoming quarter, driven by AI adoption.','Major IT companies are expected to report robust earnings growth in the upcoming quarter, driven by AI adoption.','technology',NULL,NULL,'published','2025-12-31 16:22:40',NULL,'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=300','Tech Daily',0,'2025-12-31 17:22:40','2025-12-31 17:22:40',NULL),('967e9ae9-1a39-4cdf-9465-f18b2d965218','Disney Agrees to $10M Civil Penalty and Injunction for Alleged Violations of Children’s Privacy Laws - Department of Justice (.gov)','',NULL,'business',NULL,NULL,'published','2025-12-30 18:12:44',NULL,NULL,'Justice.gov',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL),('a99ca360-2eef-4ff1-b76d-b027a4758c4f','Market hits fresh record high led by banking stocks','Sensex and Nifty scaled new peaks today as banking and financial shares witnessed strong buying interest from foreign investors.','Sensex and Nifty scaled new peaks today as banking and financial shares witnessed strong buying interest from foreign investors.','business',NULL,NULL,'published','2025-12-31 17:22:40',NULL,'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=300','Market Weekly',0,'2025-12-31 17:22:40','2025-12-31 17:22:40',NULL),('ab96b1b5-7690-4b5b-9d2a-088c58913267','UnitedHealth Group tops estimates, hikes profit outlook as insurer manages high medical costs','UnitedHealth Group said it expects 2026 adjusted earnings of at least $20.50 per share, up from a previous outlook of $19.50 to $20.00 per share.','UnitedHealth Group said it expects 2026 adjusted earnings of at least $20.50 per share, up from a previous outlook of $19.50 to $20.00 per share.','general',NULL,NULL,'published','2026-10-13 09:57:53',NULL,'https://image.cnbcfm.com/api/v1/image/108146030-1755268343131-108146030-1747316528172-gettyimages-2210767100-US_STOCKS.jpeg?v=1783017319&w=1920&h=1080','CNBC',0,'2026-10-13 10:17:25','2026-10-13 10:17:25','https://www.cnbc.com/2026/10/13/unitedhealth-group-unh-earnings-q3-2026.html'),('ad6a206e-a184-4bae-9ec6-b54b03b7c27c','Cramer: Investors selling Apple on latest iPhone 18 report are \'stupid as plywood\'','Cramer says investors who don\'t own the stock should use Friday\'s weakness to build a position.','Cramer says investors who don\'t own the stock should use Friday\'s weakness to build a position.','general',NULL,NULL,'published','2026-10-09 16:43:00',NULL,'https://image.cnbcfm.com/api/v1/image/108365128-1789759496314-gettyimages-2295295597-APPLE_IPHONE_18.jpeg?v=1789759546&w=1920&h=1080','CNBC',0,'2026-10-09 16:55:48','2026-10-09 16:55:48','https://www.cnbc.com/investingclub/2026/10/09/cramer-investors-selling-apple-on-iphone-report-are-stupid-as-plywood.html'),('b9e09b2b-d758-4f80-953a-d5db9ce60ceb','Treasury yields slide as investors flee to safety of bonds amid tech rout','Treasury yields slide as investors flee to safety of bonds amid tech rout.','Treasury yields slide as investors flee to safety of bonds amid tech rout.','general',NULL,NULL,'published','2026-10-15 12:56:38',NULL,'https://image.cnbcfm.com/api/v1/image/108363714-1791231710449-108363714-1789572211685-108363714-17895721022026-09-16t151959z_4801821_rc2dknacke3t_rtrmadp_0_usa-stocks.jpeg?v=1791231728&w=1920&h=1080','CNBC',0,'2026-10-15 13:23:41','2026-10-15 13:23:41','https://www.cnbc.com/2026/10/15/us-treasury-yields-investors-economic-data-.html'),('c1bde5f5-83d5-4327-9f40-3f5091ff51f0','Jim Cramer sets a Starbucks buy level — plus his take on 3 stocks we just bought','The Investing Club holds its \"Morning Meeting\" every weekday at 10:20 a.m. ET.','The Investing Club holds its \"Morning Meeting\" every weekday at 10:20 a.m. ET.','general',NULL,NULL,'published','2026-10-09 15:47:15',NULL,'https://image.cnbcfm.com/api/v1/image/108259664-1769793014361-gettyimages-2258479926-NICCOL_INTERVIEW.jpeg?v=1789055210&w=1920&h=1080','CNBC',0,'2026-10-09 16:33:36','2026-10-09 16:33:36','https://www.cnbc.com/investingclub/2026/10/09/cramer-sets-starbucks-buy-level-and-reviews-3-stocks-we-bought.html'),('cbceb47d-1712-4334-9bd8-7dfa2821648e','Rule expands penalty-free early 401(k) withdrawals — but new use ‘might not be practical,’ advisor says - CNBC','A provision from the 2022 Secure Act 2.0 is now in effect that allows limited penalty-free withdrawals from 401(k)s to pay long-term care insurance premiums.','A provision from the 2022 Secure Act 2.0 is now in effect that allows limited penalty-free withdrawals from 401(k)s to pay long-term care insurance premiums.','business',NULL,NULL,'published','2025-12-30 16:30:01',NULL,'https://image.cnbcfm.com/api/v1/image/108246471-1767048079121-gettyimages-1602737921-hhhelderlyoutdoorhealthcaregetty2023hhh327.jpeg?v=1767048392&w=1920&h=1080','CNBC',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL),('cd1a9a1e-ac18-437e-8348-7f71aa26154a','Four signs it is about to get uglier in the bond market as yields rise - Reuters','Four signs it is about to get uglier in the bond market as yields rise  Reuters','Four signs it is about to get uglier in the bond market as yields rise  Reuters','general',NULL,NULL,'published','2026-10-09 15:36:04',NULL,'https://static2.finnhub.io/file/finnhub/logo/reuters_logo.jpeg','Reuters',0,'2026-10-09 16:33:36','2026-10-09 16:33:36','https://news.google.com/rss/articles/CBMilAFBVV95cUxOZnpPbXRYRlc0T3dINmZIZnM3VEgxWWJzS2tLRVBadmJMVnQ2ekdHaTQ1NG1SZlhfTV84VjNsM3JNR0RRSTZyVWJ1ODJFZmxpa1pxckluaktPY0d6T0d3bUVUUnRGQjlCVmwxWUNGWEs2cEo1VGV4R3MxN19PakJaZ3FUZnZfMWxqUHAzNk1nOTVFT0hr?oc=5'),('d247f24e-6e09-4961-bf81-cc574521fafc','You can take it with you: Five tax tips before selling your business','Business owners can leave millions of dollars on the table by delaying tax planning. Here are five tips for entrepreneurs to maximize their windfall.','Business owners can leave millions of dollars on the table by delaying tax planning. Here are five tips for entrepreneurs to maximize their windfall.','general',NULL,NULL,'published','2026-10-15 11:32:59',NULL,'https://image.cnbcfm.com/api/v1/image/108412618-1792042313040-gettyimages-2291975124-022a1276.jpeg?v=1792042497&w=1920&h=1080','CNBC',0,'2026-10-15 12:47:13','2026-10-15 12:47:13','https://www.cnbc.com/2026/10/15/you-can-take-it-with-you-five-tax-tips-for-selling-your-business.html'),('ddccf8aa-afa5-4536-b7e0-871657f3c89a','Investors are questioning neoclouds\' business model but Nebius says AI computing prices are rising','The comments come as investors scrutinize the debt, borrowing costs and economics of companies building AI infrastructure.','The comments come as investors scrutinize the debt, borrowing costs and economics of companies building AI infrastructure.','general',NULL,NULL,'published','2026-10-21 12:21:07',NULL,'https://image.cnbcfm.com/api/v1/image/108199590-1758055673663-gettyimages-2235804693-dji_20250916100435_0516_d_b9kjre4c.jpeg?v=1774943203&w=1920&h=1080','CNBC',0,'2026-10-21 12:55:39','2026-10-21 12:55:39','https://www.cnbc.com/2026/10/21/nebius-ai-computing-nvidia-gpu-prices.html'),('e2a1521e-eff3-4a22-bd95-efff74e966b8','Warner Bros plans to reject Paramount’s latest hostile bid - Financial Times','Personal guarantee from Oracle’s Larry Ellison insufficient to persuade Hollywood studio’s board','Personal guarantee from Oracle’s Larry Ellison insufficient to persuade Hollywood studio’s board','business',NULL,NULL,'published','2025-12-30 21:11:09',NULL,'https://images.ft.com/v3/image/raw/https%3A%2F%2Fd1e00ek4ebabms.cloudfront.net%2Fproduction%2F33b8b031-c3cb-4250-b79c-0717fa76f57e.jpg?source=next-barrier-page','Financial Times',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL),('e62d5fcb-c9ca-4299-805f-202bde6f9f8e','Opinion | This playbook got Indiana to a Rose Bowl. It can improve college education. - The Washington Post','What my fellow university presidents could learn from the Hoosiers’ football approach.','What my fellow university presidents could learn from the Hoosiers’ football approach.','business',NULL,NULL,'published','2025-12-30 19:30:18',NULL,'https://www.washingtonpost.com/wp-apps/imrs.php?src=https://arc-anglerfish-washpost-prod-washpost.s3.amazonaws.com/public/MMLBEGV7BQKQVTQEFNFW7ILX44_size-normalized.jpg&w=1440','The Washington Post',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL),('f4979056-edf7-4135-82c5-3b689421420c','Cboe to expand options trading hours for major stocks and ETFs','Cboe will offer trading on 24 of the most actively traded companies and five ETFs between 7:30 a.m. and 9:25 a.m. ET and 4:00 p.m. to 4:15 p.m. ET.','Cboe will offer trading on 24 of the most actively traded companies and five ETFs between 7:30 a.m. and 9:25 a.m. ET and 4:00 p.m. to 4:15 p.m. ET.','general',NULL,NULL,'published','2026-10-15 12:01:59',NULL,'https://image.cnbcfm.com/api/v1/image/108363764-1789576270258-gettyimages-2295603575-6e6a8946_copy_805hl6kr.jpeg?v=1789576365&w=1920&h=1080','CNBC',0,'2026-10-15 12:47:13','2026-10-15 12:47:13','https://www.cnbc.com/2026/10/15/cboe-stock-etf-options-extended-hours.html'),('f6cd5f22-1fd2-4e79-ad71-8b9a2842de76','Meta buys Chinese-founded AI agent start-up Manus - BBC','The tech giant wants to build into its own AI tools which do complex things with minimal interaction.','The tech giant wants to build into its own AI tools which do complex things with minimal interaction.','business',NULL,NULL,'published','2025-12-30 17:30:36',NULL,'https://ichef.bbci.co.uk/news/1024/branded_news/f148/live/57d2c670-e59e-11f0-8bbe-6935d94eeebc.jpg','BBC News',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL),('f725e2c2-3d32-4eca-94fc-ff75c24a7bc5','Security increased at US Fairford air base in England - reuters.com','Security increased at US Fairford air base in England  reuters.com','Security increased at US Fairford air base in England  reuters.com','general',NULL,NULL,'published','2026-09-27 07:12:09',NULL,'https://static2.finnhub.io/file/finnhub/logo/reuters_logo.jpeg','Reuters',0,'2026-09-27 08:53:38','2026-09-27 08:53:38','https://news.google.com/rss/articles/CBMilwFBVV95cUxPOThaUHcwMHZuZEY2dldUNjhYQ29PeWRJdEYxWFBPV3NEUUdSc0l4MkdhN3liTGdyNG9XaEhwWG8xRk8xR29JVlA0ZEV2ZXM3RVZCRDlPSHhzU29Pek9tZVREdUdvOHRXS1ZuaTR0TXVGV253bkplU1lNbG85WXRjYzcwV2ZSekFCa1gtR1RtV09zM3NYeF93?oc=5'),('fc6ff496-1925-43af-b369-94cbcb252217','Asia-Pacific markets open lower in year-end trade - CNBC','Asia-Pacific markets were poised for modest gains on the holiday-shortened and final trading day of the year.','Asia-Pacific markets were poised for modest gains on the holiday-shortened and final trading day of the year.','business',NULL,NULL,'published','2025-12-31 00:03:00',NULL,'https://image.cnbcfm.com/api/v1/image/108206822-1759376123798-gettyimages-976177846-zb5423_241410_0009.jpeg?v=1759376155&w=1920&h=1080','CNBC',0,'2026-01-01 03:33:53','2026-01-01 03:33:53',NULL);
/*!40000 ALTER TABLE `news` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_settings`
--

DROP TABLE IF EXISTS `notification_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_settings` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `email_enabled` tinyint(1) DEFAULT NULL,
  `push_enabled` tinyint(1) DEFAULT NULL,
  `sms_enabled` tinyint(1) DEFAULT NULL,
  `preferences` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_settings`
--

LOCK TABLES `notification_settings` WRITE;
/*!40000 ALTER TABLE `notification_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text,
  `is_read` tinyint(1) DEFAULT NULL,
  `data` json DEFAULT NULL,
  `action_url` varchar(255) DEFAULT NULL,
  `priority` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `oauth_tokens`
--

DROP TABLE IF EXISTS `oauth_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `oauth_tokens` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `token_hash` varchar(64) DEFAULT NULL,
  `refresh_token` text,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `replaced_by_hash` varchar(64) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `oauth_tokens_token_hash_idx` (`token_hash`),
  KEY `oauth_tokens_user_id_idx` (`user_id`),
  KEY `oauth_tokens_token_hash` (`token_hash`),
  KEY `oauth_tokens_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=162 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `oauth_tokens`
--

LOCK TABLES `oauth_tokens` WRITE;
/*!40000 ALTER TABLE `oauth_tokens` DISABLE KEYS */;
INSERT INTO `oauth_tokens` VALUES (116,'8720b484-8c4f-4377-9e16-d18a7d5901cc','cc2f50241e1353d038497ef703b889da457b51623955857249ae9d58780f6047',NULL,'2026-11-08 16:32:25','2026-10-09 16:32:25','2026-10-09 16:32:25',NULL,NULL,NULL,NULL),(117,'8720b484-8c4f-4377-9e16-d18a7d5901cc','c6602387bb052a20496b47d9dd016658c57ecaaa6d892acdb97b37cb13b84ffd',NULL,'2026-11-08 16:33:35','2026-10-09 16:33:35','2026-10-09 16:33:35',NULL,NULL,'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(118,'9075cfe7-e8ec-44b9-8e7d-8aaba9537f8b','ff35df84d763694c0a420f06e48c7689dce026478d5c1f203f66d99bbe6d3f53',NULL,'2026-11-08 16:46:14','2026-10-09 16:46:14','2026-10-09 16:46:14',NULL,NULL,'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(119,'8720b484-8c4f-4377-9e16-d18a7d5901cc','5733f1a8c1819128d32cd61995931453dacfbc07c62771d896fbccaf3fd9d3df',NULL,'2026-11-08 16:55:47','2026-10-09 16:55:47','2026-10-09 16:55:47',NULL,NULL,'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(120,'8720b484-8c4f-4377-9e16-d18a7d5901cc','9c3344cc98eca0eacb00e627d24681420b176b48e733f498fa88bd9e40ee65d0',NULL,'2026-11-09 02:18:53','2026-10-10 02:18:53','2026-10-10 02:18:53',NULL,NULL,'curl/7.81.0','::ffff:127.0.0.1'),(121,'8720b484-8c4f-4377-9e16-d18a7d5901cc','64998c75f19a0c540c9128f66c147d5f000f89a698080b4276a5f3a79f8da60b',NULL,'2026-11-09 04:01:54','2026-10-10 04:01:54','2026-10-10 04:01:54',NULL,NULL,'curl/7.81.0','::ffff:127.0.0.1'),(122,'eceba0d7-3225-492d-a1e9-04f609ff9571','7c0dd0b58444fd632f99f4c9b9077d290cf65643a384184363dc6b0f1cee5a23',NULL,'2026-11-12 10:17:23','2026-10-13 10:17:23','2026-10-13 10:39:07','2026-10-13 10:39:07','1786cf53748b925d7108673a189d412e058d9f5ff2c499f406770746ef833792','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(123,'eceba0d7-3225-492d-a1e9-04f609ff9571','1786cf53748b925d7108673a189d412e058d9f5ff2c499f406770746ef833792',NULL,'2026-11-12 10:39:07','2026-10-13 10:39:07','2026-10-13 11:33:43','2026-10-13 11:33:43','eac839dccab23f4f20378580e67bfe4dc31e79740815fb6e4ce1c7fcd06f9ead','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(124,'eceba0d7-3225-492d-a1e9-04f609ff9571','eac839dccab23f4f20378580e67bfe4dc31e79740815fb6e4ce1c7fcd06f9ead',NULL,'2026-11-12 11:33:43','2026-10-13 11:33:43','2026-10-14 14:17:32','2026-10-14 14:17:32',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(125,'eceba0d7-3225-492d-a1e9-04f609ff9571','a71707b8bab94ea264821a24c0c9c6a66d72cb6d0fb9ce2db45b2855d5d94894',NULL,'2026-11-13 14:18:11','2026-10-14 14:18:11','2026-10-14 14:33:32','2026-10-14 14:33:32','f459d1e2e2219708de610e1a0c33642d5a399e3e303ef829c341d2063e4e821e','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(126,'eceba0d7-3225-492d-a1e9-04f609ff9571','f459d1e2e2219708de610e1a0c33642d5a399e3e303ef829c341d2063e4e821e',NULL,'2026-11-13 14:33:32','2026-10-14 14:33:32','2026-10-14 14:48:35','2026-10-14 14:48:35','a4b7b9e70416b88be8f007857a9b98d80e7307403a942dd008fdb5fbefb41028','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(127,'eceba0d7-3225-492d-a1e9-04f609ff9571','a4b7b9e70416b88be8f007857a9b98d80e7307403a942dd008fdb5fbefb41028',NULL,'2026-11-13 14:48:35','2026-10-14 14:48:35','2026-10-14 15:05:57','2026-10-14 15:05:57','75668be6b44c348ae9060e902d9b0acfde72885227d5bb1c678827bc213ee328','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(128,'eceba0d7-3225-492d-a1e9-04f609ff9571','75668be6b44c348ae9060e902d9b0acfde72885227d5bb1c678827bc213ee328',NULL,'2026-11-13 15:05:57','2026-10-14 15:05:57','2026-10-14 15:05:57','2026-10-14 15:05:57','3e656e81e123fa1885fc0a47d3d77901eeb1d946e9b157ec0057c900a2d28942','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(129,'eceba0d7-3225-492d-a1e9-04f609ff9571','3e656e81e123fa1885fc0a47d3d77901eeb1d946e9b157ec0057c900a2d28942',NULL,'2026-11-13 15:05:57','2026-10-14 15:05:57','2026-10-14 15:21:31','2026-10-14 15:21:31','24fe570fc209f9a0c5cc600873008b2288ade9a637589de6b77467a39ac00dce','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(130,'eceba0d7-3225-492d-a1e9-04f609ff9571','24fe570fc209f9a0c5cc600873008b2288ade9a637589de6b77467a39ac00dce',NULL,'2026-11-13 15:21:31','2026-10-14 15:21:31','2026-10-15 10:59:29','2026-10-15 10:59:29','63f0174701b58b54d38eea697e370e60f13a26a17f9c682fb67664d333c38ef4','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(131,'eceba0d7-3225-492d-a1e9-04f609ff9571','63f0174701b58b54d38eea697e370e60f13a26a17f9c682fb67664d333c38ef4',NULL,'2026-11-14 10:59:29','2026-10-15 10:59:29','2026-10-15 11:15:23','2026-10-15 11:15:23','666ff2e20fdae6d84bc2bbabc3639a72061635ea0fe3f9588132c8461477c70e','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(132,'eceba0d7-3225-492d-a1e9-04f609ff9571','666ff2e20fdae6d84bc2bbabc3639a72061635ea0fe3f9588132c8461477c70e',NULL,'2026-11-14 11:15:23','2026-10-15 11:15:23','2026-10-15 11:30:23','2026-10-15 11:30:23','f43787313ed1c0c2eda0546dfde844bf65e09b8a347803bee8af7746f583a65c','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(133,'eceba0d7-3225-492d-a1e9-04f609ff9571','f43787313ed1c0c2eda0546dfde844bf65e09b8a347803bee8af7746f583a65c',NULL,'2026-11-14 11:30:23','2026-10-15 11:30:23','2026-10-15 11:45:23','2026-10-15 11:45:23','2c277ea80e13fd7044d3fe0b66b8a292d43dc5fa6601662000311663ab70dc4b','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(134,'eceba0d7-3225-492d-a1e9-04f609ff9571','2c277ea80e13fd7044d3fe0b66b8a292d43dc5fa6601662000311663ab70dc4b',NULL,'2026-11-14 11:45:23','2026-10-15 11:45:23','2026-10-15 12:00:23','2026-10-15 12:00:23','f3f264fdc50c7ed8203385b60ae3ed42dd800104dd20fc6e8022b6174f479001','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(135,'eceba0d7-3225-492d-a1e9-04f609ff9571','f3f264fdc50c7ed8203385b60ae3ed42dd800104dd20fc6e8022b6174f479001',NULL,'2026-11-14 12:00:23','2026-10-15 12:00:23','2026-10-15 12:41:41','2026-10-15 12:41:41','88343fe64674737879f638128a20d8a6b838759f3545ec642a91de5a171fb8e6','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(136,'eceba0d7-3225-492d-a1e9-04f609ff9571','88343fe64674737879f638128a20d8a6b838759f3545ec642a91de5a171fb8e6',NULL,'2026-11-14 12:41:41','2026-10-15 12:41:41','2026-10-15 12:57:23','2026-10-15 12:57:23','3684958ee092a8e56b868aeca7c8d2c3f7ee4da3be8652805700d8f441eb6c86','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(137,'eceba0d7-3225-492d-a1e9-04f609ff9571','3684958ee092a8e56b868aeca7c8d2c3f7ee4da3be8652805700d8f441eb6c86',NULL,'2026-11-14 12:57:23','2026-10-15 12:57:23','2026-10-15 13:12:23','2026-10-15 13:12:23','ba054489d3108cb25fd3d08a79ea0da8acecc147c019aea19addda4bda51b7c4','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(138,'eceba0d7-3225-492d-a1e9-04f609ff9571','ba054489d3108cb25fd3d08a79ea0da8acecc147c019aea19addda4bda51b7c4',NULL,'2026-11-14 13:12:23','2026-10-15 13:12:23','2026-10-15 13:27:42','2026-10-15 13:27:42','7e68b7e6f67a4b6b33b36309bf69f828b88f9cbdda5be82bf5a1f40863c55ae9','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(139,'eceba0d7-3225-492d-a1e9-04f609ff9571','7e68b7e6f67a4b6b33b36309bf69f828b88f9cbdda5be82bf5a1f40863c55ae9',NULL,'2026-11-14 13:27:42','2026-10-15 13:27:42','2026-10-15 13:43:23','2026-10-15 13:43:23','3b21b1059b79ebcff7eaa7012060cc8ad52a609b93b9756234fc7ff53931d544','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(140,'eceba0d7-3225-492d-a1e9-04f609ff9571','3b21b1059b79ebcff7eaa7012060cc8ad52a609b93b9756234fc7ff53931d544',NULL,'2026-11-14 13:43:23','2026-10-15 13:43:23','2026-10-15 13:58:23','2026-10-15 13:58:23','d441505fde53820d3f4ea4e92b209f1d337c5bd9c3539837a37da338e962c307','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(141,'eceba0d7-3225-492d-a1e9-04f609ff9571','d441505fde53820d3f4ea4e92b209f1d337c5bd9c3539837a37da338e962c307',NULL,'2026-11-14 13:58:23','2026-10-15 13:58:23','2026-10-15 14:13:42','2026-10-15 14:13:42','bd2c7923dbde8eb24190aa98eee21bf50339eccc990d6a5f9c2a2f5bcde742d5','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(142,'eceba0d7-3225-492d-a1e9-04f609ff9571','bd2c7923dbde8eb24190aa98eee21bf50339eccc990d6a5f9c2a2f5bcde742d5',NULL,'2026-11-14 14:13:42','2026-10-15 14:13:42','2026-10-15 14:28:42','2026-10-15 14:28:42','ed74d920b23343b5efa0464b0cbc976d33943be5f9b5fcfd3d95d90bf658af8a','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(143,'eceba0d7-3225-492d-a1e9-04f609ff9571','ed74d920b23343b5efa0464b0cbc976d33943be5f9b5fcfd3d95d90bf658af8a',NULL,'2026-11-14 14:28:42','2026-10-15 14:28:42','2026-10-15 14:43:49','2026-10-15 14:43:49','1007750f3924eee0ab50c0b44d0f435b6f559e37c975ed7aadec141cf2a68643','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(144,'eceba0d7-3225-492d-a1e9-04f609ff9571','1007750f3924eee0ab50c0b44d0f435b6f559e37c975ed7aadec141cf2a68643',NULL,'2026-11-14 14:43:49','2026-10-15 14:43:49','2026-10-15 15:00:17','2026-10-15 15:00:17','8dcdccd522866d1aa8255f819ed156f6ba9cb5bb4980e4a192f8581b61997d1b','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(145,'eceba0d7-3225-492d-a1e9-04f609ff9571','8dcdccd522866d1aa8255f819ed156f6ba9cb5bb4980e4a192f8581b61997d1b',NULL,'2026-11-14 15:00:17','2026-10-15 15:00:17','2026-10-15 15:15:17','2026-10-15 15:15:17','a59c5fa27ff79a1cf7d301e64347d0d358266a0d34342189b4692bda98420250','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(146,'eceba0d7-3225-492d-a1e9-04f609ff9571','a59c5fa27ff79a1cf7d301e64347d0d358266a0d34342189b4692bda98420250',NULL,'2026-11-14 15:15:17','2026-10-15 15:15:17','2026-10-15 15:30:17','2026-10-15 15:30:17','732b7ad5e82f26984aaa6da322db03b0d6ac8edfc8468eda926b0d5efdb8b168','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(147,'eceba0d7-3225-492d-a1e9-04f609ff9571','732b7ad5e82f26984aaa6da322db03b0d6ac8edfc8468eda926b0d5efdb8b168',NULL,'2026-11-14 15:30:17','2026-10-15 15:30:17','2026-10-15 18:41:45','2026-10-15 18:41:45','3d5ccb56b771e0c6d94f5e8484f2f282ecdc6ae52d4b5a7b9be33504216ade1b','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(148,'eceba0d7-3225-492d-a1e9-04f609ff9571','3d5ccb56b771e0c6d94f5e8484f2f282ecdc6ae52d4b5a7b9be33504216ade1b',NULL,'2026-11-14 18:41:45','2026-10-15 18:41:45','2026-10-15 18:57:09','2026-10-15 18:57:09','97b53ba03d1f0c1e33d12a0a79382b85f821b5328bf205051aa7a1980b9cd14e','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(149,'eceba0d7-3225-492d-a1e9-04f609ff9571','97b53ba03d1f0c1e33d12a0a79382b85f821b5328bf205051aa7a1980b9cd14e',NULL,'2026-11-14 18:57:09','2026-10-15 18:57:09','2026-10-15 19:12:09','2026-10-15 19:12:09','94f2703ca62dbcb58c24ceced2a453839ad7a0f76d391bd6426697e81c4ea0fc','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(150,'eceba0d7-3225-492d-a1e9-04f609ff9571','94f2703ca62dbcb58c24ceced2a453839ad7a0f76d391bd6426697e81c4ea0fc',NULL,'2026-11-14 19:12:09','2026-10-15 19:12:09','2026-10-16 11:04:02','2026-10-16 11:04:02','af4fbde2d1b66954c7aa5e4054df2a4a7f377688408725995447702f75362721','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(151,'eceba0d7-3225-492d-a1e9-04f609ff9571','af4fbde2d1b66954c7aa5e4054df2a4a7f377688408725995447702f75362721',NULL,'2026-11-15 11:04:02','2026-10-16 11:04:02','2026-10-21 11:02:10','2026-10-21 11:02:10','8719cbaf1523ed2955c92a15be4e26fa02b0983b3d8e10a19ef79a54eade645c','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(152,'eceba0d7-3225-492d-a1e9-04f609ff9571','8719cbaf1523ed2955c92a15be4e26fa02b0983b3d8e10a19ef79a54eade645c',NULL,'2026-11-20 11:02:10','2026-10-21 11:02:10','2026-10-21 11:17:36','2026-10-21 11:17:36','417105f67fddfdf3bf74798c8b1896ef72b551d09f97f36179429ee6051c6d45','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(153,'eceba0d7-3225-492d-a1e9-04f609ff9571','417105f67fddfdf3bf74798c8b1896ef72b551d09f97f36179429ee6051c6d45',NULL,'2026-11-20 11:17:36','2026-10-21 11:17:36','2026-10-21 11:33:24','2026-10-21 11:33:24','3ee821fbe45c9bd95fafd82fab09e8967d4cdfd71ff6e73f34356664a6ab18d3','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(154,'eceba0d7-3225-492d-a1e9-04f609ff9571','3ee821fbe45c9bd95fafd82fab09e8967d4cdfd71ff6e73f34356664a6ab18d3',NULL,'2026-11-20 11:33:24','2026-10-21 11:33:24','2026-10-21 11:48:24','2026-10-21 11:48:24','e1948296e84d7459dbf945d86a289b846c9d2219e0438d00e84f4a4050baf22f','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(155,'eceba0d7-3225-492d-a1e9-04f609ff9571','e1948296e84d7459dbf945d86a289b846c9d2219e0438d00e84f4a4050baf22f',NULL,'2026-11-20 11:48:24','2026-10-21 11:48:24','2026-10-21 12:03:24','2026-10-21 12:03:24','88625cefd99928c30eb3b073a523712d1da2846f8ea12e048258d8d075abbd9b','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(156,'eceba0d7-3225-492d-a1e9-04f609ff9571','88625cefd99928c30eb3b073a523712d1da2846f8ea12e048258d8d075abbd9b',NULL,'2026-11-20 12:03:24','2026-10-21 12:03:24','2026-10-21 12:18:24','2026-10-21 12:18:24','41f0a170487a0a4bff474308b1102e319e248112f4278e0f86dd3f60ddfeb9e2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(157,'eceba0d7-3225-492d-a1e9-04f609ff9571','41f0a170487a0a4bff474308b1102e319e248112f4278e0f86dd3f60ddfeb9e2',NULL,'2026-11-20 12:18:24','2026-10-21 12:18:24','2026-10-21 12:33:24','2026-10-21 12:33:24','2cf051d45fa08815814a60f77882548de0135b712ed8b0eae4c26f308de12124','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(158,'eceba0d7-3225-492d-a1e9-04f609ff9571','2cf051d45fa08815814a60f77882548de0135b712ed8b0eae4c26f308de12124',NULL,'2026-11-20 12:33:24','2026-10-21 12:33:24','2026-10-21 12:48:24','2026-10-21 12:48:24','d3677bda72b45d87ddf5bf48779f65cf1b2393f9fee83b5e2002f8de47d3286f','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(159,'eceba0d7-3225-492d-a1e9-04f609ff9571','d3677bda72b45d87ddf5bf48779f65cf1b2393f9fee83b5e2002f8de47d3286f',NULL,'2026-11-20 12:48:24','2026-10-21 12:48:24','2026-10-21 13:03:24','2026-10-21 13:03:24','59672f9c364ead0339a6c884c30d1535d81e6504c7966136ab73bd01c6bf63d7','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(160,'eceba0d7-3225-492d-a1e9-04f609ff9571','59672f9c364ead0339a6c884c30d1535d81e6504c7966136ab73bd01c6bf63d7',NULL,'2026-11-20 13:03:24','2026-10-21 13:03:24','2026-10-21 13:18:24','2026-10-21 13:18:24','652212784c1540efbfe2a10580dc533aa52c173a0733edac0b4302f697b8c914','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1'),(161,'eceba0d7-3225-492d-a1e9-04f609ff9571','652212784c1540efbfe2a10580dc533aa52c173a0733edac0b4302f697b8c914',NULL,'2026-11-20 13:18:24','2026-10-21 13:18:24','2026-10-21 13:18:24','2026-10-21 13:18:24',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','::ffff:127.0.0.1');
/*!40000 ALTER TABLE `oauth_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payout_requests`
--

DROP TABLE IF EXISTS `payout_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payout_requests` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `payment_method` varchar(255) DEFAULT NULL,
  `payment_details` json DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `reference_number` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `entity_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `entity_type` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payout_requests`
--

LOCK TABLES `payout_requests` WRITE;
/*!40000 ALTER TABLE `payout_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `payout_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `description` text,
  `module` varchar(255) DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `platform_settings`
--

DROP TABLE IF EXISTS `platform_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `platform_settings` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `description` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `key` varchar(255) DEFAULT NULL,
  `value` text,
  `type` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platform_settings`
--

LOCK TABLES `platform_settings` WRITE;
/*!40000 ALTER TABLE `platform_settings` DISABLE KEYS */;
INSERT INTO `platform_settings` VALUES ('004b35f1-c748-4298-af31-92ca9ea6a78f',NULL,'2026-09-08 10:42:00','2026-09-08 10:42:00',NULL,NULL,NULL),('20b3b144-3c07-416d-a475-474300aef58f',NULL,'2026-09-08 10:42:00','2026-09-08 10:42:00',NULL,NULL,NULL),('29f60990-cd42-4ec8-9288-85369d573828',NULL,'2026-09-08 10:42:00','2026-09-08 10:42:00',NULL,NULL,NULL),('2d23743e-1618-4751-ba0c-5ca38b1c4cf3','Override for tomorrows pick','2025-12-14 04:08:08','2025-12-14 04:08:08',NULL,NULL,NULL),('2e7851fe-f7c4-47d8-886b-2b5360cbbd72',NULL,'2026-09-08 10:42:00','2026-09-08 10:42:00',NULL,NULL,NULL),('3a9fda3e-6285-4dce-86ee-5911aad77c35','Enable/disable Advisor Pledge Management feature visibility','2025-12-31 14:57:38','2025-12-31 14:57:38',NULL,NULL,NULL),('4416b3dd-85b8-42bd-837e-f7e6b2b3e62a',NULL,'2026-09-08 10:42:00','2026-09-08 10:42:00',NULL,NULL,NULL),('63e9edbe-3187-43b8-ae96-5dd2ac946020','Enable/disable Advisor Pledge Management feature visibility','2025-12-31 14:57:39','2025-12-31 14:57:39',NULL,NULL,NULL),('670b414b-a425-4529-851e-2390799676ea',NULL,'2026-09-08 10:42:00','2026-09-08 10:42:00',NULL,NULL,NULL),('8a419cf4-939f-425a-9963-5f126bdb5426',NULL,'2026-09-08 10:42:00','2026-09-08 10:42:00',NULL,NULL,NULL),('9b694915-d4e0-40b8-b3c9-af95e94c75ca',NULL,'2026-09-08 10:42:00','2026-09-08 10:42:00',NULL,NULL,NULL),('a5c9b47c-5dc1-4f68-9833-761a2a94e572',NULL,'2026-09-08 10:42:00','2026-09-08 10:42:00',NULL,NULL,NULL),('d2dfa982-6a9f-403a-a651-9e09bdac4999',NULL,'2026-09-08 10:42:00','2026-09-08 10:42:00',NULL,NULL,NULL);
/*!40000 ALTER TABLE `platform_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pledge_access_requests`
--

DROP TABLE IF EXISTS `pledge_access_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pledge_access_requests` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` int unsigned NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `reason` text,
  `created_date` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pledge_access_requests`
--

LOCK TABLES `pledge_access_requests` WRITE;
/*!40000 ALTER TABLE `pledge_access_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `pledge_access_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pledge_audit_logs`
--

DROP TABLE IF EXISTS `pledge_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pledge_audit_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `pledge_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `details` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pledge_audit_logs`
--

LOCK TABLES `pledge_audit_logs` WRITE;
/*!40000 ALTER TABLE `pledge_audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pledge_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pledge_execution_records`
--

DROP TABLE IF EXISTS `pledge_execution_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pledge_execution_records` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `pledge_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `session_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` int unsigned NOT NULL,
  `demat_account_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `stock_symbol` varchar(50) NOT NULL,
  `side` enum('buy','sell') NOT NULL,
  `pledged_qty` int NOT NULL,
  `executed_qty` int NOT NULL,
  `executed_price` decimal(15,2) NOT NULL,
  `total_execution_value` decimal(20,2) NOT NULL,
  `platform_commission` decimal(15,2) DEFAULT '0.00',
  `commission_rate` decimal(5,2) DEFAULT '2.00',
  `status` enum('completed','failed','partial') DEFAULT 'completed',
  `executed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pledge_execution_records`
--

LOCK TABLES `pledge_execution_records` WRITE;
/*!40000 ALTER TABLE `pledge_execution_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `pledge_execution_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pledge_payments`
--

DROP TABLE IF EXISTS `pledge_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pledge_payments` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `pledge_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT 'pending',
  `payment_method` varchar(255) DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pledge_payments`
--

LOCK TABLES `pledge_payments` WRITE;
/*!40000 ALTER TABLE `pledge_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `pledge_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pledge_sessions`
--

DROP TABLE IF EXISTS `pledge_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pledge_sessions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `stock_symbol` varchar(50) NOT NULL,
  `session_start` datetime NOT NULL,
  `session_end` datetime NOT NULL,
  `status` enum('pending','active','completed','cancelled') DEFAULT 'pending',
  `execution_rule` enum('session_end','manual') DEFAULT 'session_end',
  `last_executed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `pledge_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pledge_sessions`
--

LOCK TABLES `pledge_sessions` WRITE;
/*!40000 ALTER TABLE `pledge_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `pledge_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pledges`
--

DROP TABLE IF EXISTS `pledges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pledges` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `session_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `demat_account_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `stock_symbol` varchar(50) NOT NULL,
  `side` enum('buy','sell') NOT NULL,
  `qty` int NOT NULL,
  `price_target` decimal(15,2) DEFAULT NULL,
  `status` enum('pending','paid','executed','cancelled') DEFAULT 'pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `pledges_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pledges`
--

LOCK TABLES `pledges` WRITE;
/*!40000 ALTER TABLE `pledges` DISABLE KEYS */;
/*!40000 ALTER TABLE `pledges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pm_clients`
--

DROP TABLE IF EXISTS `pm_clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_clients` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `pm_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `invested_amount` decimal(15,2) DEFAULT NULL,
  `current_value` decimal(15,2) DEFAULT NULL,
  `unrealized_pnl` decimal(15,2) DEFAULT NULL,
  `account_number` varchar(255) DEFAULT NULL,
  `risk_profile` varchar(255) DEFAULT NULL,
  `joined_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pm_clients`
--

LOCK TABLES `pm_clients` WRITE;
/*!40000 ALTER TABLE `pm_clients` DISABLE KEYS */;
/*!40000 ALTER TABLE `pm_clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pm_holdings`
--

DROP TABLE IF EXISTS `pm_holdings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_holdings` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `client_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `stock_symbol` varchar(255) DEFAULT NULL,
  `stock_name` varchar(255) DEFAULT NULL,
  `quantity` decimal(15,4) DEFAULT NULL,
  `avg_buy_price` decimal(15,4) DEFAULT NULL,
  `current_price` decimal(15,4) DEFAULT NULL,
  `current_value` decimal(15,2) DEFAULT NULL,
  `unrealized_pnl` decimal(15,2) DEFAULT NULL,
  `allocation_percent` decimal(5,2) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pm_holdings`
--

LOCK TABLES `pm_holdings` WRITE;
/*!40000 ALTER TABLE `pm_holdings` DISABLE KEYS */;
/*!40000 ALTER TABLE `pm_holdings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pm_invoices`
--

DROP TABLE IF EXISTS `pm_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_invoices` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `client_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `invoice_number` varchar(255) DEFAULT NULL,
  `period_start` datetime DEFAULT NULL,
  `period_end` datetime DEFAULT NULL,
  `total_amount` decimal(15,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `generated_at` datetime DEFAULT NULL,
  `due_date` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pm_invoices`
--

LOCK TABLES `pm_invoices` WRITE;
/*!40000 ALTER TABLE `pm_invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `pm_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pm_strategies`
--

DROP TABLE IF EXISTS `pm_strategies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_strategies` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `pm_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `strategy_name` varchar(255) DEFAULT NULL,
  `description` text,
  `risk_level` varchar(255) DEFAULT NULL,
  `min_investment` decimal(15,2) DEFAULT NULL,
  `total_aum` decimal(15,2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pm_strategies`
--

LOCK TABLES `pm_strategies` WRITE;
/*!40000 ALTER TABLE `pm_strategies` DISABLE KEYS */;
/*!40000 ALTER TABLE `pm_strategies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pm_trade_orders`
--

DROP TABLE IF EXISTS `pm_trade_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_trade_orders` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `pm_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `strategy_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `stock_symbol` varchar(255) DEFAULT NULL,
  `order_type` varchar(255) DEFAULT NULL,
  `quantity` decimal(15,4) DEFAULT NULL,
  `price` decimal(15,4) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `executed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pm_trade_orders`
--

LOCK TABLES `pm_trade_orders` WRITE;
/*!40000 ALTER TABLE `pm_trade_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `pm_trade_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `poll_votes`
--

DROP TABLE IF EXISTS `poll_votes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `poll_votes` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `poll_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `option_index` int DEFAULT NULL,
  `voted_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `poll_id` (`poll_id`),
  CONSTRAINT `poll_votes_ibfk_1` FOREIGN KEY (`poll_id`) REFERENCES `polls` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `poll_votes`
--

LOCK TABLES `poll_votes` WRITE;
/*!40000 ALTER TABLE `poll_votes` DISABLE KEYS */;
INSERT INTO `poll_votes` VALUES ('1d854a80-db45-4b07-9dcf-f7caec24cebf','4c4cb18f-3e14-4fac-9490-5bbde23eef91','eceba0d7-3225-492d-a1e9-04f609ff9571',1,'2026-09-16 13:09:19','2026-09-16 13:09:19','2026-09-16 13:09:19'),('60f82995-7009-4309-90ac-d08b2965b904','2026cc25-33ee-4e77-9be6-507d5b8a73c4','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-31 14:31:39','2025-12-31 14:31:39','2025-12-31 14:31:39'),('8398c10b-8637-4780-995b-f0cd4478de3a','2e2ccb22-9f08-44d8-8a3b-8acb805a5ea8','eceba0d7-3225-492d-a1e9-04f609ff9571',0,'2026-09-05 11:25:56','2026-09-05 11:25:56','2026-09-05 11:25:56'),('9c04f3ea-2d84-45d0-a66f-a1a51b75fede','be603a0d-f3d3-486f-8df3-18f7d8210f2c','eceba0d7-3225-492d-a1e9-04f609ff9571',1,'2026-09-05 11:25:59','2026-09-05 11:25:59','2026-09-05 11:25:59'),('a4c746fe-88c3-44f2-a3c8-db3f2e63c826','be603a0d-f3d3-486f-8df3-18f7d8210f2c','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2026-08-28 13:41:46','2026-08-28 13:41:46','2026-08-28 13:41:46'),('b48c72dd-63f0-4524-b3e4-c6139d549192','bfd185db-bfc5-4b32-bc0a-99e59aee59f2','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2026-01-07 10:26:46','2026-01-07 10:26:46','2026-01-07 10:26:46'),('db198c56-83ae-467b-98c9-bb944f3a07e2','baa7a002-0fac-48a5-86ce-43a746ace8bf','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-31 14:32:36','2025-12-31 14:32:36','2025-12-31 14:32:36'),('f53ad4e1-9986-43c8-bae2-d3c337813468','2026cc25-33ee-4e77-9be6-507d5b8a73c4','eceba0d7-3225-492d-a1e9-04f609ff9571',2,'2026-09-05 11:25:53','2026-09-05 11:25:53','2026-09-05 11:25:53');
/*!40000 ALTER TABLE `poll_votes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `polls`
--

DROP TABLE IF EXISTS `polls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `polls` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chat_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_by_role` varchar(255) DEFAULT NULL,
  `question` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text,
  `stock_symbol` varchar(255) DEFAULT NULL,
  `poll_type` varchar(255) DEFAULT NULL,
  `target_price` decimal(10,2) DEFAULT NULL,
  `options` json DEFAULT NULL,
  `votes` json DEFAULT NULL,
  `total_votes` int DEFAULT '0',
  `bullish_votes` int DEFAULT '0',
  `bearish_votes` int DEFAULT '0',
  `neutral_votes` int DEFAULT '0',
  `buy_votes` int DEFAULT '0',
  `sell_votes` int DEFAULT '0',
  `hold_votes` int DEFAULT '0',
  `yes_votes` int DEFAULT '0',
  `no_votes` int DEFAULT '0',
  `status` varchar(255) DEFAULT 'active',
  `expires_at` datetime DEFAULT NULL,
  `is_anonymous` tinyint(1) DEFAULT '0',
  `allow_multiple` tinyint(1) DEFAULT '0',
  `is_premium` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `image_url` varchar(255) DEFAULT NULL,
  `confidence_score` int DEFAULT NULL,
  `creation_source` varchar(255) DEFAULT NULL,
  `created_by_admin` tinyint(1) DEFAULT '0',
  `is_boosted` tinyint(1) DEFAULT '0',
  `boost_expires_at` datetime DEFAULT NULL,
  `boosted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `chat_room_id` (`chat_room_id`),
  CONSTRAINT `polls_ibfk_1` FOREIGN KEY (`chat_room_id`) REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `polls`
--

LOCK TABLES `polls` WRITE;
/*!40000 ALTER TABLE `polls` DISABLE KEYS */;
INSERT INTO `polls` VALUES ('2026cc25-33ee-4e77-9be6-507d5b8a73c4',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8','premium',NULL,'What\'s your trading view on TCS?','TCS Test','TCS','buy_sell_hold',NULL,'[\"Buy\", \"Sell\", \"Hold\"]','{\"0\": 2, \"1\": 0, \"2\": 1}',8,0,0,0,3,2,1,0,0,'active',NULL,0,0,0,1,NULL,3,'admin_panel',0,1,'2026-01-01 14:35:47','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-31 05:58:46','2025-12-31 05:58:46'),('2e2ccb22-9f08-44d8-8a3b-8acb805a5ea8',NULL,'eceba0d7-3225-492d-a1e9-04f609ff9571','super_admin','Should we buy Reliance?','TEST PREMIUM POLL 1767094118799',NULL,'RELIANCE','buy_sell_hold',NULL,'[\"Buy\", \"Sell\", \"Hold\"]','{\"0\": 1}',1,0,0,0,0,0,0,0,0,'active',NULL,0,0,1,1,NULL,NULL,NULL,0,0,NULL,NULL,'2025-12-30 11:28:38','2025-12-30 11:28:38'),('4c4cb18f-3e14-4fac-9490-5bbde23eef91',NULL,'eceba0d7-3225-492d-a1e9-04f609ff9571','super_admin',NULL,'What\'s the market sentiment for WIPRO?','','WIPRO','sentiment',NULL,'[\"Bullish\", \"Bearish\", \"Neutral\"]','{\"0\": 0, \"1\": 1, \"2\": 0}',1,0,0,0,0,0,0,0,0,'active',NULL,0,0,0,1,NULL,3,'admin_panel',1,0,NULL,NULL,'2026-09-16 13:09:14','2026-09-16 13:09:14'),('90d13112-a101-46d6-b79a-2e1bff620b10','b406180e-461a-4741-b3dc-6e43407372ac',NULL,'user',NULL,'What\'s your trading view on TEST N?','','TEST N','buy_sell_hold',NULL,'[\"Buy\", \"Sell\", \"Hold\"]','{\"0\": 1, \"1\": 0, \"2\": 1}',2,0,0,0,0,0,0,0,0,'active',NULL,0,0,0,1,NULL,3,'chatroom',0,0,NULL,NULL,'2025-12-17 02:02:27','2025-12-17 02:02:27'),('baa7a002-0fac-48a5-86ce-43a746ace8bf','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'user',NULL,'What\'s your trading view on TEST APPU?','','TEST APPU','buy_sell_hold',NULL,'[\"Buy\", \"Sell\", \"Hold\"]','{\"0\": 0, \"1\": 2, \"2\": 0}',2,0,0,0,0,0,0,0,0,'active',NULL,0,0,0,1,NULL,3,'chatroom',0,0,NULL,NULL,'2025-12-10 07:29:35','2025-12-10 07:29:35'),('be603a0d-f3d3-486f-8df3-18f7d8210f2c',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8','premium',NULL,'What\'s your trading view on TESTAK?','','TESTAK','buy_sell_hold',NULL,'[\"Buy\", \"Sell\", \"Hold\"]','{\"0\": 1, \"1\": 2, \"2\": 0}',3,0,0,0,0,0,0,0,0,'active',NULL,0,0,0,1,NULL,3,'admin_panel',0,1,'2026-01-01 03:51:16','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','2025-12-26 09:40:49','2025-12-26 09:40:49'),('bfd185db-bfc5-4b32-bc0a-99e59aee59f2',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8','premium',NULL,'Will TCST hit the target price?','','TCST','price_target',NULL,'[\"Yes\", \"No\"]','{\"0\": 1, \"1\": 1}',2,0,0,0,0,0,0,0,0,'active',NULL,0,0,0,1,'/uploads/1766735219136-798625545-Firefly 20250607110713.png',3,'admin_panel',0,0,NULL,NULL,'2025-12-26 07:47:15','2025-12-26 07:47:15'),('c071f8b0-be1d-42de-9a28-a98bc8188d0b','7da343c5-473a-4373-aba4-83c9ce3be24b',NULL,'user',NULL,'What\'s your trading view on TEST?','','TEST','buy_sell_hold',NULL,'[\"Buy\", \"Sell\", \"Hold\"]','{\"0\": 0, \"1\": 2, \"2\": 1}',3,0,0,0,0,0,0,0,0,'active',NULL,0,0,0,1,NULL,3,'chatroom',0,0,NULL,NULL,'2025-12-13 17:09:40','2025-12-13 17:09:40');
/*!40000 ALTER TABLE `polls` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `portfolio_holdings`
--

DROP TABLE IF EXISTS `portfolio_holdings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `portfolio_holdings` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `portfolio_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `stock_symbol` varchar(255) DEFAULT NULL,
  `quantity` decimal(15,4) DEFAULT NULL,
  `cost_basis` decimal(15,2) DEFAULT NULL,
  `current_value` decimal(15,2) DEFAULT NULL,
  `avg_buy_price` decimal(15,4) DEFAULT NULL,
  `profit_loss` decimal(15,2) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `portfolio_id` (`portfolio_id`),
  CONSTRAINT `portfolio_holdings_ibfk_1` FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `portfolio_holdings`
--

LOCK TABLES `portfolio_holdings` WRITE;
/*!40000 ALTER TABLE `portfolio_holdings` DISABLE KEYS */;
INSERT INTO `portfolio_holdings` VALUES ('1441fb56-6967-408f-b473-d3e03b10a2ce','6640e7ef-a30f-48cd-997f-bfdfea2fe906','RELIANCE.NS',130.0000,75900.00,73500.00,583.8462,0.00,'2026-01-05 09:45:25','2026-01-05 09:45:25'),('3b1fa21a-e8d9-4cc8-8a2c-13e264534948','6640e7ef-a30f-48cd-997f-bfdfea2fe906','TCS.NS',50.0000,175000.00,175000.00,3500.0000,0.00,'2026-01-05 09:45:25','2026-01-05 09:45:25'),('4d52a2b9-9b40-47b9-8916-5ce68011a469','6640e7ef-a30f-48cd-997f-bfdfea2fe906','GOOGL',10.0000,1230.00,1230.00,123.0000,0.00,'2026-01-05 13:12:35','2026-01-05 13:12:35'),('c9d8f1e6-95bb-4064-a9f0-8a175ce5ed1c','6640e7ef-a30f-48cd-997f-bfdfea2fe906','HDFCBANK.NS',40.0000,66000.00,66000.00,1650.0000,0.00,'2026-01-05 09:45:25','2026-01-05 09:45:25'),('f13d586c-f461-4a2c-b5f1-ad5a92899746','91da8cf3-da20-42b3-883e-f5c22c5c94d5','RELIANCE.NS',10000.0000,200000.00,200000.00,20.0000,0.00,'2026-09-16 12:54:49','2026-09-16 12:54:49'),('fe761874-e960-43a0-bc07-fa7ff779b491','6640e7ef-a30f-48cd-997f-bfdfea2fe906','INFY.NS',100.0000,145000.00,145000.00,1450.0000,0.00,'2026-01-05 09:45:25','2026-01-05 09:45:25');
/*!40000 ALTER TABLE `portfolio_holdings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `portfolio_managers`
--

DROP TABLE IF EXISTS `portfolio_managers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `portfolio_managers` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `display_name` varchar(255) DEFAULT NULL,
  `sebi_registration_number` varchar(255) DEFAULT NULL,
  `bio` text,
  `status` varchar(255) DEFAULT 'pending_approval',
  `profile_image_url` varchar(255) DEFAULT NULL,
  `total_aum` decimal(15,2) DEFAULT NULL,
  `active_clients` int DEFAULT NULL,
  `years_experience` int DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `portfolio_managers`
--

LOCK TABLES `portfolio_managers` WRITE;
/*!40000 ALTER TABLE `portfolio_managers` DISABLE KEYS */;
/*!40000 ALTER TABLE `portfolio_managers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `portfolios`
--

DROP TABLE IF EXISTS `portfolios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `portfolios` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `description` text,
  `total_value` decimal(15,2) DEFAULT NULL,
  `total_profit_loss` decimal(15,2) DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `portfolios_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `portfolios`
--

LOCK TABLES `portfolios` WRITE;
/*!40000 ALTER TABLE `portfolios` DISABLE KEYS */;
INSERT INTO `portfolios` VALUES ('368fe508-2042-4e12-9978-0f50e44631c9','8720b484-8c4f-4377-9e16-d18a7d5901cc','My Portfolio',NULL,0.00,0.00,NULL,'2026-10-09 16:33:43','2026-10-09 16:33:43'),('6640e7ef-a30f-48cd-997f-bfdfea2fe906','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','My Portfolio',NULL,0.00,0.00,NULL,'2026-01-01 13:21:36','2026-01-01 13:21:36'),('91da8cf3-da20-42b3-883e-f5c22c5c94d5','eceba0d7-3225-492d-a1e9-04f609ff9571','My Portfolio',NULL,0.00,0.00,NULL,'2026-09-05 11:22:27','2026-09-05 11:22:27'),('bc12df66-95aa-4739-bf1d-9dd6663cc24f','61796564-4a39-457e-a218-1a4dc9bd5f22','My Portfolio',NULL,0.00,0.00,NULL,'2026-09-05 03:15:00','2026-09-05 03:15:00'),('e09eff47-8aa3-445a-82e4-a210b2ad6dfc','9075cfe7-e8ec-44b9-8e7d-8aaba9537f8b','My Portfolio',NULL,0.00,0.00,NULL,'2026-01-05 09:36:02','2026-01-05 09:36:02');
/*!40000 ALTER TABLE `portfolios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promo_codes`
--

DROP TABLE IF EXISTS `promo_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promo_codes` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `code` varchar(255) NOT NULL,
  `discount_percent` int DEFAULT NULL,
  `discount_amount` decimal(10,2) DEFAULT NULL,
  `max_uses` int DEFAULT NULL,
  `uses_count` int DEFAULT '0',
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `applicable_to` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `min_order_amount` decimal(10,2) DEFAULT NULL,
  `one_time_per_user` tinyint(1) DEFAULT '0',
  `applies_to_renewal` tinyint(1) DEFAULT '1',
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `code_2` (`code`),
  UNIQUE KEY `code_3` (`code`),
  UNIQUE KEY `code_4` (`code`),
  UNIQUE KEY `code_5` (`code`),
  UNIQUE KEY `code_6` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promo_codes`
--

LOCK TABLES `promo_codes` WRITE;
/*!40000 ALTER TABLE `promo_codes` DISABLE KEYS */;
INSERT INTO `promo_codes` VALUES ('3397f8cf-d4cd-46f9-a1cb-937b1518626c','100',NULL,NULL,NULL,NULL,NULL,1,NULL,'2026-01-07 12:07:27','2026-01-07 12:07:27',NULL,0,1,NULL),('f7e210ce-8c6d-44cd-a37e-8f791782df59','TEST',NULL,NULL,NULL,NULL,NULL,1,NULL,'2026-01-07 11:05:35','2026-01-07 11:05:35',NULL,0,1,NULL);
/*!40000 ALTER TABLE `promo_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `referral_badges`
--

DROP TABLE IF EXISTS `referral_badges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `referral_badges` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `description` text,
  `required_referrals` int DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `reward_amount` decimal(10,2) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `referral_badges`
--

LOCK TABLES `referral_badges` WRITE;
/*!40000 ALTER TABLE `referral_badges` DISABLE KEYS */;
/*!40000 ALTER TABLE `referral_badges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `referrals`
--

DROP TABLE IF EXISTS `referrals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `referrals` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `referrer_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `referred_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `code` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `reward_amount` decimal(10,2) DEFAULT NULL,
  `reward_paid` tinyint(1) DEFAULT NULL,
  `converted_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `referrer_id` (`referrer_id`),
  KEY `referred_id` (`referred_id`),
  CONSTRAINT `referrals_ibfk_1` FOREIGN KEY (`referrer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `referrals_ibfk_2` FOREIGN KEY (`referred_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `referrals`
--

LOCK TABLES `referrals` WRITE;
/*!40000 ALTER TABLE `referrals` DISABLE KEYS */;
INSERT INTO `referrals` VALUES ('54fc1d51-829d-4fc7-b349-6c2c596b407e',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-01 10:12:14','2026-10-01 10:12:14'),('7067df04-bf23-4f15-b320-6a1635276dd5',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-07 10:28:46','2026-01-07 10:28:46'),('80f2ffc0-cc23-4b06-8357-a87b16d7d3f5',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-30 13:37:48','2026-09-30 13:37:48'),('8f61eb7b-5f6f-47aa-9c8f-76cc36633c3a',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-05 07:48:25','2026-09-05 07:48:25'),('a100ef5c-1dad-4efe-9602-b816499511dc',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-30 13:40:43','2026-09-30 13:40:43'),('c40b52d0-f645-4885-89ff-128ae3b868e9',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-13 10:18:08','2026-10-13 10:18:08'),('cb28ada3-3f01-4cce-a8d8-f4a6bba996d3',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-16 12:47:19','2026-09-16 12:47:19'),('fb76fa09-cf18-4a76-836f-d04c4a2b9866',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-12-16 02:19:53','2025-12-16 02:19:53'),('fe06dd4f-57f0-47e0-822b-2ae67b5c157c',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-13 10:21:04','2026-10-13 10:21:04');
/*!40000 ALTER TABLE `referrals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refund_requests`
--

DROP TABLE IF EXISTS `refund_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refund_requests` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `payment_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `event_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `ticket_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `reason` text,
  `status` varchar(255) DEFAULT 'pending',
  `processed_at` datetime DEFAULT NULL,
  `processed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `subscription_id` char(36) DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `transaction_type` varchar(255) DEFAULT 'subscription',
  `razorpay_refund_id` varchar(255) DEFAULT NULL,
  `refund_amount` decimal(10,2) DEFAULT NULL,
  `admin_notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refund_requests`
--

LOCK TABLES `refund_requests` WRITE;
/*!40000 ALTER TABLE `refund_requests` DISABLE KEYS */;
INSERT INTO `refund_requests` VALUES ('91a8e4ac-d7a5-414e-9ab9-5ad72fdca727',NULL,'f50c1e5f-bced-4c7e-a49e-3e8441793a91',NULL,NULL,NULL,'Test Cancellation','approved','2026-01-07 13:05:17',NULL,'2026-01-07 13:05:17','2026-01-07 13:05:17',NULL,NULL,'subscription',NULL,NULL,NULL);
/*!40000 ALTER TABLE `refund_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reports`
--

DROP TABLE IF EXISTS `reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reports` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `params` json DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `result_url` varchar(255) DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `format` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reports`
--

LOCK TABLES `reports` WRITE;
/*!40000 ALTER TABLE `reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `revenue_transactions`
--

DROP TABLE IF EXISTS `revenue_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `revenue_transactions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `source` varchar(255) DEFAULT NULL,
  `reference_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `description` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `revenue_transactions`
--

LOCK TABLES `revenue_transactions` WRITE;
/*!40000 ALTER TABLE `revenue_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `revenue_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `entity_type` varchar(255) DEFAULT NULL,
  `entity_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `rating` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `content` text,
  `status` varchar(255) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT NULL,
  `helpful_count` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `role_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `permission_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_template_permissions`
--

DROP TABLE IF EXISTS `role_template_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_template_permissions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `template_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `permission_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_template_permissions`
--

LOCK TABLES `role_template_permissions` WRITE;
/*!40000 ALTER TABLE `role_template_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `role_template_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_templates`
--

DROP TABLE IF EXISTS `role_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_templates` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `user_count` int DEFAULT '0',
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_by_name` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_templates`
--

LOCK TABLES `role_templates` WRITE;
/*!40000 ALTER TABLE `role_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `role_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `description` text,
  `permissions` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `room_automations`
--

DROP TABLE IF EXISTS `room_automations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_automations` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chat_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `trigger_type` varchar(255) DEFAULT NULL,
  `action_type` varchar(255) DEFAULT NULL,
  `config` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `last_triggered_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `room_automations`
--

LOCK TABLES `room_automations` WRITE;
/*!40000 ALTER TABLE `room_automations` DISABLE KEYS */;
/*!40000 ALTER TABLE `room_automations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `room_subscriptions`
--

DROP TABLE IF EXISTS `room_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_subscriptions` (
  `id` char(36) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `room_id` char(36) DEFAULT NULL,
  `status` varchar(255) DEFAULT 'active',
  `start_date` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `amount_paid` decimal(15,2) DEFAULT NULL,
  `payment_reference` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `room_subscriptions_user_id_idx` (`user_id`),
  KEY `room_subscriptions_room_id_idx` (`room_id`),
  KEY `room_subscriptions_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `room_subscriptions`
--

LOCK TABLES `room_subscriptions` WRITE;
/*!40000 ALTER TABLE `room_subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `room_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `static_pages`
--

DROP TABLE IF EXISTS `static_pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `static_pages` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `content` text,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` text,
  `status` varchar(255) DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `static_pages`
--

LOCK TABLES `static_pages` WRITE;
/*!40000 ALTER TABLE `static_pages` DISABLE KEYS */;
/*!40000 ALTER TABLE `static_pages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stocks`
--

DROP TABLE IF EXISTS `stocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stocks` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `symbol` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `sector` varchar(100) DEFAULT NULL,
  `current_price` decimal(15,2) DEFAULT NULL,
  `market_cap` decimal(20,2) DEFAULT NULL,
  `listed_on` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `exchange` varchar(50) DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `volume` bigint DEFAULT NULL,
  `change` decimal(15,4) DEFAULT NULL,
  `change_percent` decimal(10,4) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `symbol` (`symbol`),
  UNIQUE KEY `symbol_2` (`symbol`),
  UNIQUE KEY `symbol_3` (`symbol`),
  UNIQUE KEY `symbol_4` (`symbol`),
  UNIQUE KEY `symbol_5` (`symbol`),
  UNIQUE KEY `symbol_6` (`symbol`),
  UNIQUE KEY `symbol_7` (`symbol`),
  UNIQUE KEY `symbol_8` (`symbol`),
  UNIQUE KEY `symbol_9` (`symbol`),
  UNIQUE KEY `symbol_10` (`symbol`),
  UNIQUE KEY `symbol_11` (`symbol`),
  UNIQUE KEY `symbol_12` (`symbol`),
  UNIQUE KEY `symbol_13` (`symbol`),
  UNIQUE KEY `symbol_14` (`symbol`),
  UNIQUE KEY `symbol_15` (`symbol`),
  UNIQUE KEY `symbol_16` (`symbol`),
  UNIQUE KEY `symbol_17` (`symbol`),
  UNIQUE KEY `symbol_18` (`symbol`),
  UNIQUE KEY `symbol_19` (`symbol`),
  UNIQUE KEY `symbol_20` (`symbol`),
  UNIQUE KEY `symbol_21` (`symbol`),
  UNIQUE KEY `symbol_22` (`symbol`),
  UNIQUE KEY `symbol_23` (`symbol`),
  UNIQUE KEY `symbol_24` (`symbol`),
  UNIQUE KEY `symbol_25` (`symbol`),
  UNIQUE KEY `symbol_26` (`symbol`),
  UNIQUE KEY `symbol_27` (`symbol`),
  UNIQUE KEY `symbol_28` (`symbol`),
  UNIQUE KEY `symbol_29` (`symbol`),
  UNIQUE KEY `symbol_30` (`symbol`),
  UNIQUE KEY `symbol_31` (`symbol`),
  UNIQUE KEY `symbol_32` (`symbol`),
  UNIQUE KEY `symbol_33` (`symbol`),
  UNIQUE KEY `symbol_34` (`symbol`),
  UNIQUE KEY `symbol_35` (`symbol`),
  UNIQUE KEY `symbol_36` (`symbol`),
  UNIQUE KEY `symbol_37` (`symbol`),
  UNIQUE KEY `symbol_38` (`symbol`),
  UNIQUE KEY `symbol_39` (`symbol`),
  UNIQUE KEY `symbol_40` (`symbol`),
  UNIQUE KEY `symbol_41` (`symbol`),
  UNIQUE KEY `symbol_42` (`symbol`),
  UNIQUE KEY `symbol_43` (`symbol`),
  UNIQUE KEY `symbol_44` (`symbol`),
  UNIQUE KEY `symbol_45` (`symbol`),
  UNIQUE KEY `symbol_46` (`symbol`),
  UNIQUE KEY `symbol_47` (`symbol`),
  UNIQUE KEY `symbol_48` (`symbol`),
  UNIQUE KEY `symbol_49` (`symbol`),
  UNIQUE KEY `symbol_50` (`symbol`),
  UNIQUE KEY `symbol_51` (`symbol`),
  UNIQUE KEY `symbol_52` (`symbol`),
  UNIQUE KEY `symbol_53` (`symbol`),
  UNIQUE KEY `symbol_54` (`symbol`),
  UNIQUE KEY `symbol_55` (`symbol`),
  UNIQUE KEY `symbol_56` (`symbol`),
  UNIQUE KEY `symbol_57` (`symbol`),
  UNIQUE KEY `symbol_58` (`symbol`),
  UNIQUE KEY `symbol_59` (`symbol`),
  UNIQUE KEY `symbol_60` (`symbol`),
  UNIQUE KEY `symbol_61` (`symbol`),
  UNIQUE KEY `symbol_62` (`symbol`),
  UNIQUE KEY `symbol_63` (`symbol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stocks`
--

LOCK TABLES `stocks` WRITE;
/*!40000 ALTER TABLE `stocks` DISABLE KEYS */;
INSERT INTO `stocks` VALUES ('02214530-cd6d-446d-92f1-f56d46c97d22','QQQ','QQQ',NULL,717.63,0.00,NULL,'2026-09-27 06:06:28','2026-10-21 13:18:24',NULL,'USD',0,-0.7300,-0.1016),('064b2b34-7636-4ccd-ba1c-8e764171d055','TATAMOTORS.NS','Tata Motors Limited','Consumer Cyclical',693.00,0.00,NULL,'2026-01-01 13:44:10','2026-01-07 11:03:01',NULL,'USD',0,NULL,NULL),('13a53be9-bbee-4961-bee8-794e4bf6625e','HDFCBANK.NS','HDFC Bank Limited','Financial Services',221.00,0.00,NULL,'2026-01-01 13:44:10','2026-01-01 14:15:47',NULL,'USD',0,NULL,NULL),('1c45710f-6be3-45ac-bdae-e9d85713795d','DIA','DIA',NULL,524.36,0.00,NULL,'2026-09-27 06:06:28','2026-10-21 13:18:24',NULL,'USD',0,5.4400,1.0483),('248cbb0f-1459-4eb8-9f10-63464ee34096','GOOGL','Alphabet Inc.','Technology',340.28,4313765600000.00,NULL,'2026-01-01 13:44:10','2026-10-21 13:18:24','NASDAQ NMS - GLOBAL MARKET','USD',0,-3.9050,-1.1346),('37b014e8-6cdb-46a2-bca9-95793fea66e9','MSFT','Microsoft Corporation','Technology',531.87,4018333953710.75,NULL,'2026-01-01 13:44:10','2026-10-21 13:18:24','NASDAQ NMS - GLOBAL MARKET','USD',0,-1.6500,-0.3093),('3c428fcd-5531-422f-8cb2-154949ab8ccc','V','Visa Inc',NULL,406.57,726785548259.33,NULL,'2026-09-27 06:06:28','2026-10-21 13:18:24','NEW YORK STOCK EXCHANGE, INC.','USD',0,3.6500,0.9059),('4203fc62-6f58-4fb9-8f8d-4faba652b7e4','TSLA','Tesla Inc.','Consumer Cyclical',373.71,1493047529658.01,NULL,'2026-01-01 13:44:10','2026-10-21 13:18:24','NASDAQ NMS - GLOBAL MARKET','USD',0,5.6500,1.5351),('58f6eefd-dc12-48a6-a4b4-c0d0cede8cac','VIP','Greenidge Generation Holdings Inc','Unknown',1.62,57673807.16,NULL,'2026-09-30 13:39:36','2026-10-01 10:28:26','NASDAQ NMS - GLOBAL MARKET','USD',0,0.0000,0.0000),('800e6c41-ff01-4d33-8e5f-93dbca700c47','SBIN.NS','State Bank of India','Financial Services',750.00,NULL,NULL,'2026-01-01 13:44:10','2026-01-01 13:44:10',NULL,NULL,NULL,NULL,NULL),('83b878e4-18ce-4c4e-a587-9b17cbc147b4','TCS.NS','Tata Consultancy Services','Technology',639.00,0.00,NULL,'2026-01-01 13:44:10','2026-09-26 16:05:05',NULL,'USD',0,NULL,NULL),('8c348c24-a9e3-4046-b89f-26ded3afcaee','META','Meta Platforms Inc.','Technology',694.25,1892695112285.64,NULL,'2026-01-01 13:44:10','2026-10-21 13:18:24','NASDAQ NMS - GLOBAL MARKET','USD',0,-11.1900,-1.5862),('a0e5cc60-cbfd-41e0-8728-a3351255916d','NVDA','NVIDIA Corporation','Technology',216.47,5454311970960.80,NULL,'2026-01-01 13:44:10','2026-10-21 13:18:24','NASDAQ NMS - GLOBAL MARKET','USD',0,-0.6200,-0.2856),('aa23b3c7-e960-4dfc-9668-4a86d4c32058','SPY','SPY',NULL,769.05,0.00,NULL,'2026-09-27 06:06:28','2026-10-21 13:18:24',NULL,'USD',0,2.5700,0.3353),('bf3bf1b6-b4ca-4386-9b3f-f71f0d61e4b2','NFLX','Netflix Inc.','Communication Services',600.00,NULL,NULL,'2026-01-01 13:44:10','2026-01-01 13:44:10',NULL,NULL,NULL,NULL,NULL),('bf46a889-5b4c-4a16-b914-0dd390aa6c8e','RELIANCE.NS','Reliance Industries Limited','Energy',570.00,0.00,NULL,'2026-01-01 13:44:10','2026-09-26 16:05:05',NULL,'USD',0,NULL,NULL),('ca9d98d8-e2ac-495a-8919-ef97faea437e','WMT','Walmart Inc',NULL,117.85,884142590000.00,NULL,'2026-09-27 06:06:28','2026-10-21 13:18:24','NASDAQ NMS - GLOBAL MARKET','USD',0,-0.8500,-0.7161),('cf7cf626-37c8-44ee-8268-2f8990f1167b','^BSESN','^BSESN',NULL,357.00,0.00,NULL,'2026-01-01 13:53:28','2026-09-26 16:05:05',NULL,'USD',0,NULL,NULL),('d0b24778-4ce0-49eb-926d-4f246aacf592','^NSEI','^NSEI',NULL,768.00,0.00,NULL,'2026-01-01 13:53:28','2026-09-26 16:05:05',NULL,'USD',0,NULL,NULL),('d3b52b53-6eab-4873-a8b2-67ec24b7651a','JPM','JPMorgan Chase & Co',NULL,335.26,888631647107.75,NULL,'2026-09-27 06:06:28','2026-10-21 13:18:24','NEW YORK STOCK EXCHANGE, INC.','USD',0,1.7300,0.5187),('f7e01d81-f0a0-4fce-be61-c884f834939b','AMZN','Amazon.com Inc.','Consumer Cyclical',262.63,2799372111890.95,NULL,'2026-01-01 13:44:10','2026-10-21 13:18:24','NASDAQ NMS - GLOBAL MARKET','USD',0,0.1800,0.0686),('f87e4425-7430-476a-8775-d75b95b5909d','INFY.NS','Infosys Limited','Technology',685.00,0.00,NULL,'2026-01-01 13:44:10','2026-09-26 16:05:05',NULL,'USD',0,NULL,NULL),('ff3d3a52-43ed-4e96-bdad-220f51138a59','AAPL','Apple Inc.','Technology',339.50,4976177664578.63,NULL,'2026-01-01 13:44:10','2026-10-21 13:18:24','NASDAQ NMS - GLOBAL MARKET','USD',0,-3.4400,-1.0031);
/*!40000 ALTER TABLE `stocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_plans`
--

DROP TABLE IF EXISTS `subscription_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscription_plans` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `price_monthly` decimal(10,2) DEFAULT NULL,
  `price_annually` decimal(10,2) DEFAULT NULL,
  `interval` varchar(255) DEFAULT NULL,
  `features` json DEFAULT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT NULL,
  `is_system_plan` tinyint(1) DEFAULT NULL,
  `trial_days` int DEFAULT NULL,
  `advisor_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `finfluencer_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_is_system_plan` (`is_system_plan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_plans`
--

LOCK TABLES `subscription_plans` WRITE;
/*!40000 ALTER TABLE `subscription_plans` DISABLE KEYS */;
INSERT INTO `subscription_plans` VALUES ('33f3b00e-083d-4071-89c0-379d3c14f75d','Premium',592.00,592.00,5999.00,'month','[\"market_news\", \"my_portfolio\", \"refund_management\", \"premium_chat_rooms\", \"premium_events\", \"priority_support\", \"advanced_analytics\", \"custom_alerts\", \"vip_events_webinars\"]','TEST UPDATE',1,1,7,NULL,NULL,'2025-12-10 08:01:48','2025-12-10 08:01:48'),('5db40e99-d535-4353-8064-ea8570843c21','Free',0.00,0.00,0.00,NULL,'[\"market_news\", \"my_portfolio\"]','Basic access for all users.',1,1,NULL,NULL,NULL,'2025-12-24 14:26:55','2025-12-24 14:26:55'),('a53f1dc4-ade6-41d0-b11d-c0ba5c673442','VIP',999.00,999.00,9999.00,'month','[\"market_news\", \"my_portfolio\", \"refund_management\", \"premium_chat_rooms\", \"premium_polls\", \"premium_events\", \"priority_support\", \"advanced_analytics\", \"custom_alerts\", \"advisor_subscriptions\", \"exclusive_finfluencer_content\", \"admin_recommendations\", \"one_on_one_consultation\", \"vip_events_webinars\", \"dedicated_account_manager\"]','All-access pass to the entire platform.',1,1,NULL,NULL,NULL,'2025-12-24 12:44:34','2025-12-24 12:44:34');
/*!40000 ALTER TABLE `subscription_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_transactions`
--

DROP TABLE IF EXISTS `subscription_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscription_transactions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `subscription_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `payment_method` varchar(255) DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `invoice_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `razorpay_order_id` varchar(255) DEFAULT NULL,
  `coupon_used` varchar(255) DEFAULT NULL,
  `discount_applied` decimal(10,2) DEFAULT NULL,
  `transaction_type` varchar(255) DEFAULT 'charge',
  `date` datetime DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subscription_id` (`subscription_id`),
  CONSTRAINT `subscription_transactions_ibfk_1` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_transactions`
--

LOCK TABLES `subscription_transactions` WRITE;
/*!40000 ALTER TABLE `subscription_transactions` DISABLE KEYS */;
INSERT INTO `subscription_transactions` VALUES ('5a895b2f-2655-425c-8dab-916d70323dbd','c1d7a195-046c-4732-b89c-e420d45d0390',-966.67,'refunded','razorpay','rfnd_mock_123456','2026-01-07 13:05:17','2026-01-07 13:05:17','f50c1e5f-bced-4c7e-a49e-3e8441793a91',NULL,NULL,NULL,NULL,'refund','2026-01-07 13:05:17',NULL),('8bde4ae6-1dab-4ed2-a312-ee4fb603eae0','7fe57bc1-4784-4cdc-a648-5ad7ab533b96',592.00,'completed','razorpay','pay_S0zbKxIFMAuJmn','2026-01-07 12:43:00','2026-01-07 12:43:00','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','c52a7d09-4fce-4a2f-b340-37abb33f072b','order_S0zazRqHKm9RUr',NULL,0.00,'charge','2026-01-07 12:43:00',NULL),('dc9258fe-8dec-4978-85c6-86795ef69c1a','c1d7a195-046c-4732-b89c-e420d45d0390',1000.00,'completed','razorpay','pay_mock_123456','2026-01-07 13:05:17','2026-01-07 13:05:17','f50c1e5f-bced-4c7e-a49e-3e8441793a91',NULL,NULL,NULL,0.00,'charge','2026-01-07 13:05:17',NULL);
/*!40000 ALTER TABLE `subscription_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `plan_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `finfluencer_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `advisor_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `auto_renew` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `plan_type` varchar(255) DEFAULT NULL,
  `cancelAtPeriodEnd` tinyint(1) DEFAULT '0',
  `cancellation_reason` text,
  `cancellation_date` datetime DEFAULT NULL,
  `last_payment_date` datetime DEFAULT NULL,
  `next_billing_date` datetime DEFAULT NULL,
  `billing_cycle` varchar(255) DEFAULT NULL,
  `payment_method_id` varchar(255) DEFAULT NULL,
  `razorpay_subscription_id` varchar(255) DEFAULT NULL,
  `redirect_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `plan_id` (`plan_id`),
  KEY `finfluencer_id` (`finfluencer_id`),
  CONSTRAINT `subscriptions_ibfk_344` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `subscriptions_ibfk_345` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `subscriptions_ibfk_346` FOREIGN KEY (`finfluencer_id`) REFERENCES `finfluencers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
INSERT INTO `subscriptions` VALUES ('7fe57bc1-4784-4cdc-a648-5ad7ab533b96','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','33f3b00e-083d-4071-89c0-379d3c14f75d','expired',NULL,NULL,'standard','2026-01-07 12:43:00','2026-02-06 12:43:00',0,'2026-01-07 12:43:00','2026-01-07 12:43:00','Premium',1,'User requested cancellation','2026-01-07 13:02:12','2026-01-07 12:43:00',NULL,NULL,'razorpay',NULL,NULL),('c1d7a195-046c-4732-b89c-e420d45d0390','f50c1e5f-bced-4c7e-a49e-3e8441793a91','33f3b00e-083d-4071-89c0-379d3c14f75d','expired',NULL,NULL,'standard','2026-01-07 13:05:17','2026-02-06 13:05:17',1,'2026-01-07 13:05:17','2026-01-07 13:05:17','Premium',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trust_score_logs`
--

DROP TABLE IF EXISTS `trust_score_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trust_score_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `score` int DEFAULT NULL,
  `previous_score` int DEFAULT NULL,
  `reason` text,
  `action_type` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trust_score_logs`
--

LOCK TABLES `trust_score_logs` WRITE;
/*!40000 ALTER TABLE `trust_score_logs` DISABLE KEYS */;
INSERT INTO `trust_score_logs` VALUES ('0bd81d54-5c2f-48d6-a4b4-06eed44eb198','eceba0d7-3225-492d-a1e9-04f609ff9571',2,0,'Daily First Poll Vote','poll_vote','2026-09-16 13:09:19','2026-09-16 13:09:19'),('2f01818a-fc06-4afa-8e64-f5d1f7938816','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',2,0,'Daily First Poll Vote','poll_vote','2025-12-31 03:59:40','2025-12-31 03:59:40'),('4734750a-a138-472f-830d-c8a512270efd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',2,0,'Daily First Poll Vote','poll_vote','2025-12-26 07:47:19','2025-12-26 07:47:19'),('4c0bf9ae-3f42-45ce-aad3-9d54f5c7bc59','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',2,0,'Daily First Poll Vote','poll_vote','2025-12-14 14:42:43','2025-12-14 14:42:43'),('5b05e0cd-4b1c-4b0d-82b2-d6111fae5553','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',2,0,'Daily First Poll Vote','poll_vote','2025-12-17 02:01:38','2025-12-17 02:01:38'),('6a2dc8dd-4da7-402f-ae02-7b4f693e844b','b8bdd193-9c08-4310-8411-1f950308217c',2,0,'Daily First Poll Vote','poll_vote','2025-12-30 12:59:02','2025-12-30 12:59:02'),('8da5f0df-75b9-4a96-8d1c-e1a730b381af','6ff49abd-07c1-421c-9c52-0b292c67956b',2,0,'Daily First Poll Vote','poll_vote','2025-12-16 14:26:49','2025-12-16 14:26:49'),('b67924f2-1737-4827-bbb1-dd988c2328a5','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',2,0,'Daily First Poll Vote','poll_vote','2025-12-31 14:31:39','2025-12-31 14:31:39'),('bd71bb6e-bd2a-4d9a-bdd2-5ae3a4c54769','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',2,0,'Daily First Poll Vote','poll_vote','2026-08-28 13:41:46','2026-08-28 13:41:46'),('bda5740f-0ede-40a0-a3ed-cf65238b4d4b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',2,0,'Daily First Poll Vote','poll_vote','2026-01-07 10:26:46','2026-01-07 10:26:46'),('c1dd7c0d-59c6-4410-a1d4-16802f146478','eceba0d7-3225-492d-a1e9-04f609ff9571',2,0,'Daily First Poll Vote','poll_vote','2026-09-05 11:25:53','2026-09-05 11:25:53');
/*!40000 ALTER TABLE `trust_score_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `typing_indicators`
--

DROP TABLE IF EXISTS `typing_indicators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `typing_indicators` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chat_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `is_typing` tinyint(1) DEFAULT NULL,
  `last_typed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `chat_room_id` (`chat_room_id`),
  CONSTRAINT `typing_indicators_ibfk_1` FOREIGN KEY (`chat_room_id`) REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `typing_indicators`
--

LOCK TABLES `typing_indicators` WRITE;
/*!40000 ALTER TABLE `typing_indicators` DISABLE KEYS */;
INSERT INTO `typing_indicators` VALUES ('0045a276-ed6d-426d-9ddc-f77ff8f9699c','666257ae-9a19-4d0d-a719-350797918e79','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:39:56','2025-12-31 14:39:56','2025-12-31 14:39:56'),('0059a9cb-64bf-454c-bbd9-22383f138819',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:02:34','2025-12-16 06:02:34','2025-12-16 06:02:34'),('011442a6-ae70-4be7-8a68-073030caa19e','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:34:16','2025-12-20 13:34:16','2025-12-20 13:34:16'),('01407a79-cea1-402e-9db4-61082f1d9572','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:43:16','2025-12-31 14:43:16','2025-12-31 14:43:16'),('0292898d-00f4-44c8-8ad0-bffc39f753b3',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:36:34','2025-12-10 07:36:34','2025-12-10 07:36:34'),('031ea3f4-973f-47f2-a268-4084735daa76','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:18:32','2025-12-16 14:18:32','2025-12-16 14:18:32'),('041cc1b9-11ae-4396-a39b-571fb5cd67fe',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:09:17','2025-12-13 17:09:17','2025-12-13 17:09:17'),('04cc4c31-bed2-4ff8-87d9-27328e41a12a',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:16:16','2025-12-16 02:16:16','2025-12-16 02:16:16'),('053c0f90-b5b2-483c-997c-18d2ed82cb03','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:24','2025-12-16 14:46:24','2025-12-16 14:46:24'),('058a5584-9fda-4bd9-84d1-fa1ded12f819','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:34:16','2025-12-20 13:34:16','2025-12-20 13:34:16'),('05a21c79-c525-41f7-9dfd-a48d26306c80','63a8557f-7b08-4387-852b-f06bfcd47405','eceba0d7-3225-492d-a1e9-04f609ff9571',0,'2025-12-30 12:13:38','2025-12-30 12:13:38','2025-12-30 12:13:38'),('05a7bca5-6e9b-4e22-bf52-511d35685913',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:10:56','2025-12-14 02:10:56','2025-12-14 02:10:56'),('05b61c3d-07fc-46db-84bd-0873962d8248',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:10:56','2025-12-14 02:10:56','2025-12-14 02:10:56'),('065e9b2d-1bd1-4eca-ad18-ace0a918f632','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:34:15','2025-12-20 13:34:15','2025-12-20 13:34:15'),('086ea6ac-9500-4089-a569-553fbbae372a',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-15 17:09:03','2025-12-15 17:09:03','2025-12-15 17:09:03'),('08df1171-0d0a-423c-83ad-a7316b04a927',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 14:49:39','2025-12-14 14:49:39','2025-12-14 14:49:39'),('08f63b41-738e-479a-8cad-aca628b956ef','666257ae-9a19-4d0d-a719-350797918e79','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:39:56','2025-12-31 14:39:56','2025-12-31 14:39:56'),('09186131-4d26-4852-b4f4-95150e27c367',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 03:42:11','2025-12-14 03:42:11','2025-12-14 03:42:11'),('09af59d0-8b14-4b9b-ab83-3c993decc6b5','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:56','2025-12-16 14:16:56','2025-12-16 14:16:56'),('09d68ad8-fb4b-402e-b2a8-c4f6e0f1ce21',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:03:20','2025-12-14 02:03:20','2025-12-14 02:03:20'),('09e1f9ad-8e6d-4047-9fe4-edee26484ac6','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 06:51:55','2025-12-17 06:51:55','2025-12-17 06:51:55'),('0a5c28d1-9d94-4a07-b542-1ba98580f338',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:08:38','2025-12-14 02:08:38','2025-12-14 02:08:38'),('0a8a94d6-e376-47e3-90ce-2eb78b2b2043','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:27','2025-12-16 14:46:27','2025-12-16 14:46:27'),('0b266020-4c6c-477b-864b-a05a51c27358',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:54:45','2025-12-13 16:54:45','2025-12-13 16:54:45'),('0bfb8697-8163-4b21-8aa4-0568dbe9c0c3','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:55','2025-12-16 14:16:55','2025-12-16 14:16:55'),('0e229ca2-181a-45c7-badc-c82ca7ea7284',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 03:58:35','2025-12-14 03:58:35','2025-12-14 03:58:35'),('0ee592a8-c2d9-4761-b142-edb19d8eec7c',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:40:48','2025-12-16 13:40:48','2025-12-16 13:40:48'),('0f76728d-8148-4e03-a5a2-e92796a9ce4f',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:06','2025-12-16 13:51:06','2025-12-16 13:51:06'),('10b12d2e-8ac3-437c-8195-70cba9a73cf0','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:58','2025-12-16 14:16:58','2025-12-16 14:16:58'),('114b6ba8-3641-4109-b122-605de21988a3','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:08','2025-12-16 14:16:08','2025-12-16 14:16:08'),('1228a1b0-24e7-4b85-996d-33cfbee7d8bc','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:10:09','2025-12-17 11:10:09','2025-12-17 11:10:09'),('130bb68c-dc10-4431-9168-8a7cbb084576',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:35:26','2025-12-16 13:35:26','2025-12-16 13:35:26'),('137ea84e-51b8-4d73-a0b3-1353f660a5ea','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:43:18','2025-12-31 14:43:18','2025-12-31 14:43:18'),('13a0262d-b0d6-4b6a-8e0c-ad9fe58e81a3',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:13:34','2025-12-13 17:13:34','2025-12-13 17:13:34'),('1401b3e6-f399-4656-81e9-5da4f2093018',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:30:28','2025-12-14 02:30:28','2025-12-14 02:30:28'),('148bafc5-9eaf-4627-acc3-06f3a7b742fc','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:00','2025-12-16 14:16:00','2025-12-16 14:16:00'),('14cce245-9af6-43ab-9638-5c4ab6bb4165','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:09:15','2025-12-17 11:09:15','2025-12-17 11:09:15'),('15454bf7-a516-4452-a943-1a4a140b5b42','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:58','2025-12-16 14:16:58','2025-12-16 14:16:58'),('15da67b4-be4b-42e8-8650-ad35edc8d5c7','12e83e76-b87c-444f-8810-bcba2bdcee62','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-30 17:27:17','2025-12-30 17:27:17','2025-12-30 17:27:17'),('16bbebfc-85a1-4789-84de-6b92b98e68de','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:56','2025-12-16 14:16:56','2025-12-16 14:16:56'),('16f65c2e-6919-4e30-a829-58cff18d1a41','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:09','2025-12-16 14:16:09','2025-12-16 14:16:09'),('17c9dfb5-0872-4b7c-8fe0-fd6945eeb6f3','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:30:51','2025-12-16 14:30:51','2025-12-16 14:30:51'),('1850af33-a48c-4374-b73d-e88c512aa2a3',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:37:09','2025-12-16 13:37:09','2025-12-16 13:37:09'),('194725fe-1b47-4628-a7dd-eccead4e9385','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783','61796564-4a39-457e-a218-1a4dc9bd5f22',0,'2026-09-05 03:10:12','2026-09-05 03:10:12','2026-09-05 03:10:12'),('1a0ce13c-92ec-4034-b5a5-99ad75e30cb2',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:02:34','2025-12-16 06:02:34','2025-12-16 06:02:34'),('1cde4fa2-dabf-44e2-9afd-2a7c31bdbbf8','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:00','2025-12-16 14:40:00','2025-12-16 14:40:00'),('1e93ed30-a456-4ee0-bfa1-7412a7a4ecac',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 02:33:11','2025-12-14 02:33:11','2025-12-14 02:33:11'),('1ed36623-ba7b-4ab9-88b1-54c24fd9a97b','666257ae-9a19-4d0d-a719-350797918e79','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:39:52','2025-12-31 14:39:52','2025-12-31 14:39:52'),('1edf4aa5-6b6a-4248-b6fa-1b9d1ee03c8f','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:03','2025-12-16 14:40:03','2025-12-16 14:40:03'),('1f102af5-d376-4cd1-ab4e-fed822f0da86',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:31:25','2025-12-14 02:31:25','2025-12-14 02:31:25'),('1f5aede6-3135-4c52-a50c-8d52188edb3b',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:08:55','2025-12-13 16:08:55','2025-12-13 16:08:55'),('1f855f65-7756-4753-8c5c-06db4c8b72cf',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:37:00','2025-12-10 07:37:00','2025-12-10 07:37:00'),('1ff78be8-13fa-4c74-a73d-10acc3351e67','3fa1ba44-74d8-44bb-8610-e9e835487dcd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2026-08-28 13:41:27','2026-08-28 13:41:27','2026-08-28 13:41:27'),('203d06f2-188a-4c82-b8a1-d60af8843a84','3fa1ba44-74d8-44bb-8610-e9e835487dcd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2026-08-28 13:41:21','2026-08-28 13:41:21','2026-08-28 13:41:21'),('20ae67b3-1a81-441e-98c5-87c32cd3775d',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:13:14','2025-12-16 06:13:14','2025-12-16 06:13:14'),('20c18ce5-725f-454a-a3c8-0348c15088d0',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 03:42:12','2025-12-14 03:42:12','2025-12-14 03:42:12'),('20e8e1c3-8b3e-4652-89e1-bec4ff71a39d','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:24','2025-12-16 14:46:24','2025-12-16 14:46:24'),('21002634-501d-4762-bb09-a3d950ed6de0','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:43:21','2025-12-31 14:43:21','2025-12-31 14:43:21'),('21034131-8b58-4ee4-8a09-dc4fccdeae96','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 07:58:58','2025-12-17 07:58:58','2025-12-17 07:58:58'),('2110cb34-a965-4540-a8a7-6834f4b9398a',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:12','2025-12-16 13:51:12','2025-12-16 13:51:12'),('22296ef0-9d94-48bf-b4f0-3f35583db9d8','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:09:16','2025-12-17 11:09:16','2025-12-17 11:09:16'),('2258a027-93b6-4515-8384-aad7fe836cc1',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:35:31','2025-12-16 13:35:31','2025-12-16 13:35:31'),('235cc6a6-fd65-4eb9-b015-b14f3b2621aa','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:30:33','2025-12-16 14:30:33','2025-12-16 14:30:33'),('2369be6c-6107-4516-98d4-8d031430902b',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:35:25','2025-12-16 13:35:25','2025-12-16 13:35:25'),('24048694-3606-4e50-a751-15a4640e978a',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:31:40','2025-12-10 07:31:40','2025-12-10 07:31:40'),('2468932c-055e-4971-bfe2-ab3f3dea58e0',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:40:49','2025-12-16 13:40:49','2025-12-16 13:40:49'),('246be760-1b50-4545-ab90-1d64dcc288ec','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:02','2025-12-16 14:40:02','2025-12-16 14:40:02'),('24974565-c2fa-423b-80bd-d8f14f5d3aac',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:02:34','2025-12-16 06:02:34','2025-12-16 06:02:34'),('2516511e-e6ce-40f5-ad93-ffdc94bafde1','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:09:16','2025-12-17 11:09:16','2025-12-17 11:09:16'),('253dac70-f6e4-491e-90e6-72cdc9d3fa5a','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:30:55','2025-12-16 14:30:55','2025-12-16 14:30:55'),('25ecc58e-f263-4b38-948e-d32028219d69','666257ae-9a19-4d0d-a719-350797918e79','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:39:56','2025-12-31 14:39:56','2025-12-31 14:39:56'),('278e5fc0-e267-4dd8-9bf6-9b27e2b205ca',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:09:13','2025-12-13 17:09:13','2025-12-13 17:09:13'),('27cee28f-0e94-457a-92e1-f89fddb2f91a',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-15 17:09:03','2025-12-15 17:09:03','2025-12-15 17:09:03'),('294ee7d7-d511-40c9-9fe9-cf224d2fa321','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:30:32','2025-12-16 14:30:32','2025-12-16 14:30:32'),('29769022-59f8-43e6-8e16-274d24b39cc3','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:57','2025-12-16 14:16:57','2025-12-16 14:16:57'),('29a3dde3-e42e-4e94-88dd-5e1000735bcd','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 06:03:56','2025-12-17 06:03:56','2025-12-17 06:03:56'),('29ff0c54-c902-4bdc-83be-077ed0f5ac2c','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:01','2025-12-16 14:40:01','2025-12-16 14:40:01'),('2a4b953c-66b8-4bb4-bd79-190f34c25c5b',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:19:27','2025-12-16 02:19:27','2025-12-16 02:19:27'),('2b85972a-5ffa-4f0e-835a-3d82244a54cf','3fa1ba44-74d8-44bb-8610-e9e835487dcd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2026-08-28 13:41:26','2026-08-28 13:41:26','2026-08-28 13:41:26'),('2ba7b8e0-0beb-4174-96c8-8e0481169268','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:34:18','2025-12-20 13:34:18','2025-12-20 13:34:18'),('2c07ad3b-0279-4f70-9b10-8378b08b0c88',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:08:37','2025-12-14 02:08:37','2025-12-14 02:08:37'),('2c6927d0-97d6-45f7-9baf-593050fd112f','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:08','2025-12-16 14:40:08','2025-12-16 14:40:08'),('2ccd2e8c-ee9c-45c9-a4e5-eedddca43e71',NULL,'6ff49abd-07c1-421c-9c52-0b292c67956b',1,'2025-12-16 13:50:45','2025-12-16 13:50:45','2025-12-16 13:50:45'),('2df69678-65b2-4651-aed4-9aa1962bdc2c','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:10:07','2025-12-17 11:10:07','2025-12-17 11:10:07'),('2e0b18ab-b747-4148-ac0d-05436881275e',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:31:25','2025-12-14 02:31:25','2025-12-14 02:31:25'),('2e9983ec-6263-4651-996c-059f88238edd','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:30:55','2025-12-16 14:30:55','2025-12-16 14:30:55'),('2ecc2458-2f95-47b0-b9c3-5ae0a7ae444d',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:30:27','2025-12-14 02:30:27','2025-12-14 02:30:27'),('2f29a8c5-7051-4058-b362-1c3b69261165',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:07','2025-12-16 13:51:07','2025-12-16 13:51:07'),('2f628217-34d9-4ef7-af8d-5d5799af8780',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:03:08','2025-12-14 02:03:08','2025-12-14 02:03:08'),('2ffd948e-f624-40e3-9f57-35309b16d4f6',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:29:24','2025-12-10 07:29:24','2025-12-10 07:29:24'),('300481b2-50ab-4af0-b227-ee2609c184f6','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:21:25','2025-12-16 14:21:25','2025-12-16 14:21:25'),('30266b6f-e7ac-41ed-893e-7648edca70d8','3fa1ba44-74d8-44bb-8610-e9e835487dcd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2026-08-28 13:41:27','2026-08-28 13:41:27','2026-08-28 13:41:27'),('305b3967-5129-4773-b2af-00070b23269e',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:27:23','2025-12-16 13:27:23','2025-12-16 13:27:23'),('3075af95-1e01-4a92-a77f-dfaaa47d55b6',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:37:00','2025-12-10 07:37:00','2025-12-10 07:37:00'),('30c15d48-9699-4ab4-a8d3-06e86049e2da','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:56','2025-12-16 14:16:56','2025-12-16 14:16:56'),('316054b4-b579-4c4c-a3ba-db4aa90acc59',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:08:51','2025-12-14 02:08:51','2025-12-14 02:08:51'),('3167d316-53d0-452c-9dd5-5ce48d847088',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:01','2025-12-16 13:51:01','2025-12-16 13:51:01'),('316c7303-2391-4281-a9b3-821b25f7776c',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:40:48','2025-12-16 13:40:48','2025-12-16 13:40:48'),('31d5192b-ae4c-43f3-8616-f7f7fe469133','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:51','2025-12-31 14:42:51','2025-12-31 14:42:51'),('32dac16b-9a0c-4a5b-ad99-4c88f29b18c7',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-15 17:09:03','2025-12-15 17:09:03','2025-12-15 17:09:03'),('3300bded-d51d-43c8-9ab9-47690c41d17e','666257ae-9a19-4d0d-a719-350797918e79','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:39:57','2025-12-31 14:39:57','2025-12-31 14:39:57'),('334a1c85-456a-4df4-bda6-041a55c1bca3','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 07:58:59','2025-12-17 07:58:59','2025-12-17 07:58:59'),('33f65457-c62d-49e0-9714-6706dc0d2622',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:00:37','2025-12-16 02:00:37','2025-12-16 02:00:37'),('342c569b-5865-4295-832e-97f8b7a30a37',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:53:02','2025-12-13 16:53:02','2025-12-13 16:53:02'),('34407dd9-dc9f-4a7f-b3ed-32f6095e48fb',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:13:41','2025-12-13 17:13:41','2025-12-13 17:13:41'),('34756d88-b1be-4be6-8d4b-515852f2bd44',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 02:33:18','2025-12-14 02:33:18','2025-12-14 02:33:18'),('3512c85b-8d95-490d-b924-fed7546d287b',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:38:32','2025-12-16 13:38:32','2025-12-16 13:38:32'),('35275de4-9498-4d50-b6c0-2bd4d3c4cc9a','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:26','2025-12-16 14:46:26','2025-12-16 14:46:26'),('352d081e-e8e0-4e2f-b1cb-689fce316cad',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:54:36','2025-12-13 16:54:36','2025-12-13 16:54:36'),('35404c90-173c-4b83-b029-4a6ce5c6e6fd',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:16:25','2025-12-16 02:16:25','2025-12-16 02:16:25'),('35e7edbd-fe31-4aea-8c82-55b9fee2430e','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 07:58:58','2025-12-17 07:58:58','2025-12-17 07:58:58'),('36478abc-d43b-412a-b19a-6e011c5b7d03',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-15 17:09:02','2025-12-15 17:09:02','2025-12-15 17:09:02'),('3663651e-6eb1-4975-9bd2-47441cea5e86',NULL,'6ff49abd-07c1-421c-9c52-0b292c67956b',1,'2025-12-16 13:36:49','2025-12-16 13:36:49','2025-12-16 13:36:49'),('36839510-b771-4a0c-9c81-e0f5826f0df5','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:33:02','2025-12-20 13:33:02','2025-12-20 13:33:02'),('37007999-f2d7-4a23-a754-c8fde177e102',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:05','2025-12-16 13:51:05','2025-12-16 13:51:05'),('37138804-60b9-426c-abbf-84b571c4caa6',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:09:13','2025-12-13 17:09:13','2025-12-13 17:09:13'),('384ab584-e3b4-4b51-aeab-a1151403f979',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:36:59','2025-12-10 07:36:59','2025-12-10 07:36:59'),('3959d9a5-ecd8-4d1e-8dd9-ea0b7e741d90','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:33:03','2025-12-20 13:33:03','2025-12-20 13:33:03'),('39c15b10-a56c-45fa-8560-211e7c710b3e',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-15 17:09:02','2025-12-15 17:09:02','2025-12-15 17:09:02'),('39d4625c-bf95-42d2-a02b-834719648373',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:30:27','2025-12-14 02:30:27','2025-12-14 02:30:27'),('3a005874-32ad-4dca-a916-50c2b8e099e4','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:16:24','2025-12-16 14:16:24','2025-12-16 14:16:24'),('3a0099fd-f8d9-4b28-8508-b72bed9c8dd4',NULL,'6ff49abd-07c1-421c-9c52-0b292c67956b',1,'2025-12-16 13:37:32','2025-12-16 13:37:32','2025-12-16 13:37:32'),('3a3c4898-7677-4a3d-89a4-e1babb7f9c57','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:03','2025-12-16 14:40:03','2025-12-16 14:40:03'),('3a3d3845-3f43-4bb5-8b82-085aae05092d',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:54:36','2025-12-13 16:54:36','2025-12-13 16:54:36'),('3a5fd8ee-2c19-406f-baf2-ea1c2a3f5309','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:34:14','2025-12-20 13:34:14','2025-12-20 13:34:14'),('3a809e37-ff2b-497a-a3c3-bb25bf691794',NULL,'6ff49abd-07c1-421c-9c52-0b292c67956b',1,'2025-12-16 13:50:24','2025-12-16 13:50:24','2025-12-16 13:50:24'),('3acc5633-0177-4c5a-8a33-269055a86b3f','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:22','2025-12-16 14:46:22','2025-12-16 14:46:22'),('3b4620b7-7d14-4c70-a915-118aaa9a0cab','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 07:55:49','2025-12-17 07:55:49','2025-12-17 07:55:49'),('3b5299e4-34ea-4329-be96-cdbbeca01344','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:06','2025-12-16 14:40:06','2025-12-16 14:40:06'),('3bd850bd-93d8-4b65-9a3b-3eec07e67f45',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:36:33','2025-12-10 07:36:33','2025-12-10 07:36:33'),('3c4f822c-8c03-4df4-b699-6826e245eb0d','63a8557f-7b08-4387-852b-f06bfcd47405','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-30 12:58:52','2025-12-30 12:58:52','2025-12-30 12:58:52'),('3c7914d3-2dbf-4158-a904-3d8defdbff55','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 07:37:49','2025-12-17 07:37:49','2025-12-17 07:37:49'),('3cab1fe7-9f4d-48c7-8f66-5257d5176b00','63a8557f-7b08-4387-852b-f06bfcd47405','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-30 12:58:51','2025-12-30 12:58:51','2025-12-30 12:58:51'),('3dba5034-20e6-4a53-adf9-c925a4f575db',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 02:33:18','2025-12-14 02:33:18','2025-12-14 02:33:18'),('3dfdfcf6-e8b8-4030-80b9-5b52cbdc9444',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:31:26','2025-12-14 02:31:26','2025-12-14 02:31:26'),('3e5dcc62-4996-4714-9fe2-7d7f63240083',NULL,'6ff49abd-07c1-421c-9c52-0b292c67956b',1,'2025-12-16 13:36:49','2025-12-16 13:36:49','2025-12-16 13:36:49'),('3e6b2df5-2f7e-44a2-bc5e-d39cf72be62c',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 09:34:46','2025-12-10 09:34:46','2025-12-10 09:34:46'),('3e70749d-480d-4a15-9376-b15a4f4e745d','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:59','2025-12-16 14:39:59','2025-12-16 14:39:59'),('3e71b7f0-23f9-498e-8bd2-25eab91587cb','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:09:09','2025-12-17 11:09:09','2025-12-17 11:09:09'),('3e949d2d-8fc1-447e-ae71-58630422acee','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:27','2025-12-16 14:46:27','2025-12-16 14:46:27'),('3f37ef0a-4064-42d4-942d-d45dfd4279d7',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:54:47','2025-12-13 16:54:47','2025-12-13 16:54:47'),('3f66c92a-c994-471b-beb7-7866e5948788','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:52','2025-12-31 14:42:52','2025-12-31 14:42:52'),('3ff5d276-dffd-4c6f-824b-6718d8d79b1e',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:00','2025-12-16 13:51:00','2025-12-16 13:51:00'),('40a6f470-e27a-4c7d-87bc-d7484486539e','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:02','2025-12-16 14:40:02','2025-12-16 14:40:02'),('40e5b156-314b-4f31-8443-152db56a91a1',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 04:28:55','2025-12-14 04:28:55','2025-12-14 04:28:55'),('419ca592-d86a-41d0-a5f3-0ff07c83fffc',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:08:52','2025-12-14 02:08:52','2025-12-14 02:08:52'),('41a6da8f-55b2-43be-ac4f-b988dda487ee','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:30:36','2025-12-16 14:30:36','2025-12-16 14:30:36'),('423d8909-c4db-40a1-926b-7beb0fdb59c2','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:43:22','2025-12-31 14:43:22','2025-12-31 14:43:22'),('43a2dc8d-564d-4e26-91d6-7b7377241c49','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:50','2025-12-31 14:42:50','2025-12-31 14:42:50'),('43aa045e-bc44-4045-a4e6-749d0ff2b356',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:02:43','2025-12-16 06:02:43','2025-12-16 06:02:43'),('43ae3755-761b-4c81-998f-4b890e8dda2a','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:07','2025-12-16 14:40:07','2025-12-16 14:40:07'),('43c117d0-ccf0-4f72-b4ba-f0cdbd1b2ea5','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:05','2025-12-16 14:40:05','2025-12-16 14:40:05'),('44d5aaa4-3ac8-49fc-a504-504571696ee0','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:30:54','2025-12-16 14:30:54','2025-12-16 14:30:54'),('44de7258-79a4-403e-b517-8b74596e88e9',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:13:03','2025-12-16 06:13:03','2025-12-16 06:13:03'),('4518eba9-2010-4aa3-8f59-cb9d13ac1b23','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:33:02','2025-12-20 13:33:02','2025-12-20 13:33:02'),('45e70365-9dcd-4796-8053-2ea8acf4d0b1','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:48','2025-12-31 14:42:48','2025-12-31 14:42:48'),('4603b453-9c9e-4982-a15d-f02ee71538fc',NULL,'6ff49abd-07c1-421c-9c52-0b292c67956b',1,'2025-12-16 13:50:24','2025-12-16 13:50:24','2025-12-16 13:50:24'),('4633b9c0-9733-48af-961c-1d311e3e88f6',NULL,'6ff49abd-07c1-421c-9c52-0b292c67956b',1,'2025-12-16 13:50:24','2025-12-16 13:50:24','2025-12-16 13:50:24'),('46dfb720-63e6-43a9-9b58-3c1fa1e7cbb2','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:46','2025-12-31 14:42:46','2025-12-31 14:42:46'),('46f81b9f-4f06-4216-8e59-7f92569ade0c','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:57','2025-12-16 14:16:57','2025-12-16 14:16:57'),('475f2924-e367-447c-9ead-127e0c466d54',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:31:41','2025-12-10 07:31:41','2025-12-10 07:31:41'),('4848394b-e353-44a6-b838-6a43d6d683c3','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:00','2025-12-16 14:40:00','2025-12-16 14:40:00'),('49382cd7-840b-43d7-9e31-8fd614eb2674',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:07','2025-12-16 13:51:07','2025-12-16 13:51:07'),('4a0ffbd0-9f13-4d41-bbea-6643fe302be0',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:07:15','2025-12-16 13:07:15','2025-12-16 13:07:15'),('4aebea11-2421-4a19-907c-4ddda973c053',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:36:59','2025-12-10 07:36:59','2025-12-10 07:36:59'),('4c257350-7430-4418-80df-8df1c56b9329','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:10:07','2025-12-17 11:10:07','2025-12-17 11:10:07'),('4c25fb2c-e70b-4553-a61f-e01731ffce64',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:13:03','2025-12-16 06:13:03','2025-12-16 06:13:03'),('4ce33895-cb00-496d-b047-4043d03b35ec',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:02:41','2025-12-16 06:02:41','2025-12-16 06:02:41'),('4d2e7133-9214-4dcc-9199-d172b9fbb403','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:33:44','2025-12-20 13:33:44','2025-12-20 13:33:44'),('4d32de52-4609-4f1e-8e13-ff4e82cf9ad8',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:13:41','2025-12-13 17:13:41','2025-12-13 17:13:41'),('4d773f9b-60d8-42b0-9644-c53f5737d2f1','63a8557f-7b08-4387-852b-f06bfcd47405','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-30 12:58:52','2025-12-30 12:58:52','2025-12-30 12:58:52'),('4e241762-b469-44c7-8615-f5b30e25c788',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:37:09','2025-12-16 13:37:09','2025-12-16 13:37:09'),('4e4c0064-0464-4e3d-b07b-d80354b62ffd','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:53','2025-12-31 14:42:53','2025-12-31 14:42:53'),('4ec0d917-5654-40dd-9ce5-60a16c9d522d',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 04:28:54','2025-12-14 04:28:54','2025-12-14 04:28:54'),('4efc6640-5de5-4e83-a82d-3a964eda746a','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:10:08','2025-12-17 11:10:08','2025-12-17 11:10:08'),('4fb319db-3391-4ef9-8147-d08e1c41eac8',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:13:18','2025-12-16 02:13:18','2025-12-16 02:13:18'),('50a33b1b-8a30-40bb-8910-186820ab245b',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:03:08','2025-12-14 02:03:08','2025-12-14 02:03:08'),('50fb0612-bdf7-4b48-8bc0-ba21bb8d38b0',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:09:15','2025-12-13 17:09:15','2025-12-13 17:09:15'),('5112ee4b-27e7-4bef-8b12-968d6b6d6587','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:55','2025-12-16 14:39:55','2025-12-16 14:39:55'),('51997ecc-eef9-4014-8fbb-2ffb62da321c',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:14:27','2025-12-13 17:14:27','2025-12-13 17:14:27'),('51d4140b-cf07-404c-9823-785f548b73b1',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:40:47','2025-12-16 13:40:47','2025-12-16 13:40:47'),('52236718-ed6c-4be4-81fc-2dd087a5c317','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:56','2025-12-16 14:39:56','2025-12-16 14:39:56'),('522cbad0-12c4-427e-9453-67b35b2a558c',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:35:25','2025-12-16 13:35:25','2025-12-16 13:35:25'),('532d7a41-0b1c-47d0-a069-323e19f7201a','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:00','2025-12-16 14:16:00','2025-12-16 14:16:00'),('534e9f41-3cb0-49c7-8a8a-2dde8e1de0bb','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:57','2025-12-16 14:16:57','2025-12-16 14:16:57'),('53a3d4ac-c355-4c3f-90b6-4d3829d3688e','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:55','2025-12-16 14:16:55','2025-12-16 14:16:55'),('53f22e25-1918-469c-ab93-fa112e23e45b','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-31 04:07:27','2025-12-31 04:07:27','2025-12-31 04:07:27'),('54cfe880-0094-4d67-9d34-cb68e19149cd',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:08:57','2025-12-14 02:08:57','2025-12-14 02:08:57'),('54f6bc37-4335-4e90-b3d1-e40642804a78',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:01:03','2025-12-16 02:01:03','2025-12-16 02:01:03'),('558eef99-6b75-4987-b616-d9a9a013d212',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 02:33:12','2025-12-14 02:33:12','2025-12-14 02:33:12'),('55d1ad99-ab9c-4ff7-95ee-f1f29a1f4dc0',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:54:46','2025-12-13 16:54:46','2025-12-13 16:54:46'),('55f93b29-3a4f-4831-ab2d-0eeab4f85296','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:41:17','2025-12-16 14:41:17','2025-12-16 14:41:17'),('563e07f5-6640-4b0a-98a9-71bf28f41087',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:02:43','2025-12-16 06:02:43','2025-12-16 06:02:43'),('56685c7d-a443-4ddd-928e-b4619f5310c6',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:36:34','2025-12-10 07:36:34','2025-12-10 07:36:34'),('56c2ae01-bf00-4da3-9caf-4cb293c9caeb','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:51','2025-12-31 14:42:51','2025-12-31 14:42:51'),('56fa3d54-740f-4a4f-a90c-2f967c4e9403','63a8557f-7b08-4387-852b-f06bfcd47405','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-31 02:12:35','2025-12-31 02:12:35','2025-12-31 02:12:35'),('579ffad3-9ecf-44db-b358-b8327e6acb9b','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:32:17','2025-12-20 13:32:17','2025-12-20 13:32:17'),('57e84810-2b57-49ea-97ec-4d253c8944e4',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:31:30','2025-12-10 07:31:30','2025-12-10 07:31:30'),('5846d4d8-aa64-4704-bda0-f951aa72e5ed','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:15:58','2025-12-16 14:15:58','2025-12-16 14:15:58'),('58f74def-7cdd-4b9d-8903-2ba5995f3e87',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:03:04','2025-12-14 02:03:04','2025-12-14 02:03:04'),('58fb7d40-0924-49ab-88e9-19d3bf847c67','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:48','2025-12-31 14:42:48','2025-12-31 14:42:48'),('592666f3-de37-4df3-8c4d-e1dd1e524ffd','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783','61796564-4a39-457e-a218-1a4dc9bd5f22',0,'2026-09-05 03:10:12','2026-09-05 03:10:12','2026-09-05 03:10:12'),('594d5665-5170-467f-9e4c-7848acc430d8',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:08:36','2025-12-13 17:08:36','2025-12-13 17:08:36'),('5993544f-dea5-4aa1-a501-2982c64093cc','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:34:14','2025-12-20 13:34:14','2025-12-20 13:34:14'),('59a37155-7175-4166-9388-4e2bb8d49a90','63a8557f-7b08-4387-852b-f06bfcd47405','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-31 02:12:37','2025-12-31 02:12:37','2025-12-31 02:12:37'),('59c05a0a-bfe5-4226-91bc-2347af6f30a5','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:25','2025-12-16 14:46:25','2025-12-16 14:46:25'),('5a351227-67eb-47fd-8a62-06b16297e811',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 14:49:39','2025-12-14 14:49:39','2025-12-14 14:49:39'),('5af2cb79-463a-4456-a028-1a74a5abddd3',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:27:24','2025-12-16 13:27:24','2025-12-16 13:27:24'),('5b086cbf-608a-4a55-ba36-d84afb2af78e',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:03:16','2025-12-14 02:03:16','2025-12-14 02:03:16'),('5bdf5fc5-241e-4e6d-9a48-feafcd05b8a8','63a8557f-7b08-4387-852b-f06bfcd47405','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-31 02:12:38','2025-12-31 02:12:38','2025-12-31 02:12:38'),('5c4126a7-a3a4-42bc-962d-ff3047b5e736','63a8557f-7b08-4387-852b-f06bfcd47405','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-31 02:12:35','2025-12-31 02:12:35','2025-12-31 02:12:35'),('5c6f0319-6582-4ab3-a7b9-3d45a9fcb3db',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 03:58:02','2025-12-14 03:58:02','2025-12-14 03:58:02'),('5d208478-d4bb-410d-ad08-af16dd30ff3c','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-31 04:07:28','2025-12-31 04:07:28','2025-12-31 04:07:28'),('5d92c925-fe13-459a-830a-84fd25396345','63a8557f-7b08-4387-852b-f06bfcd47405','eceba0d7-3225-492d-a1e9-04f609ff9571',0,'2025-12-30 12:13:38','2025-12-30 12:13:38','2025-12-30 12:13:38'),('5ddc31d4-9a12-4bc0-b65f-f47462d97043','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:01','2025-12-16 14:40:01','2025-12-16 14:40:01'),('5e09510c-905e-4218-8c3b-0911f4387691',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:50:27','2025-12-16 13:50:27','2025-12-16 13:50:27'),('5e22bc69-705a-410d-a8ef-4185b7162ad6',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:03:20','2025-12-14 02:03:20','2025-12-14 02:03:20'),('5ee3cf7f-cf18-4f2e-88e4-cd54501e4a26','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:02','2025-12-16 14:40:02','2025-12-16 14:40:02'),('5eee7ade-71ea-4b50-800f-348a26be069a','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:09:16','2025-12-17 11:09:16','2025-12-17 11:09:16'),('5f809ede-9b1c-40d1-b7ad-04e70bea1ae9','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:09:15','2025-12-17 11:09:15','2025-12-17 11:09:15'),('5f96bba3-75b9-4e6e-9dc5-7e11673786d6','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:32:17','2025-12-20 13:32:17','2025-12-20 13:32:17'),('5faf082d-871e-4c67-b41b-6285e960c3e5','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:53','2025-12-31 14:42:53','2025-12-31 14:42:53'),('5ff7348a-d653-4880-9a0c-edb6456a1d58','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 13:58:32','2025-12-16 13:58:32','2025-12-16 13:58:32'),('60033896-e6ee-4041-9171-967d005878d2',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:31:31','2025-12-10 07:31:31','2025-12-10 07:31:31'),('60a9a5cd-9c2b-45dd-b4bc-93d61be8fead','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:01','2025-12-16 14:40:01','2025-12-16 14:40:01'),('60cf2c27-2ebd-44b4-aa2a-301161d75c98','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:43:23','2025-12-31 14:43:23','2025-12-31 14:43:23'),('6121dbd2-d364-4d6c-9062-317831343c7e','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:21','2025-12-16 14:46:21','2025-12-16 14:46:21'),('61e80b8b-af50-467a-b319-9e27e753a646',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:02:42','2025-12-16 06:02:42','2025-12-16 06:02:42'),('63d3cdd2-7bf2-4849-a501-384076869e43',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:37:00','2025-12-10 07:37:00','2025-12-10 07:37:00'),('640ec462-6b39-4296-9ca4-61a744fdd4a8','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:10:16','2025-12-17 11:10:16','2025-12-17 11:10:16'),('642a19d9-507e-4315-81eb-9ac6e5ed4922',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:12:05','2025-12-16 02:12:05','2025-12-16 02:12:05'),('660523fe-18f4-4553-aa99-a93eaaf25188',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:01','2025-12-16 13:51:01','2025-12-16 13:51:01'),('661bd99a-dae4-47ec-a363-a99ec6f2b3af',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:10:56','2025-12-14 02:10:56','2025-12-14 02:10:56'),('66b93e46-c96e-45fc-b8f1-ac4531490907',NULL,'6ff49abd-07c1-421c-9c52-0b292c67956b',1,'2025-12-16 13:50:16','2025-12-16 13:50:16','2025-12-16 13:50:16'),('66caee7e-cbcb-463e-aa45-a28ac55c6708','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:56','2025-12-16 14:39:56','2025-12-16 14:39:56'),('66f9e050-882c-4859-a090-f7f1413447bc','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:02','2025-12-16 14:40:02','2025-12-16 14:40:02'),('6785ae53-a916-4776-818c-b0e3dbb33272','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 07:59:11','2025-12-17 07:59:11','2025-12-17 07:59:11'),('681f3c3d-a5c0-40cd-aeb3-85d8aaa6a5cf',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:00:52','2025-12-16 02:00:52','2025-12-16 02:00:52'),('682b04ea-5a16-4327-a1e0-fb565777ceff',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:30:35','2025-12-14 02:30:35','2025-12-14 02:30:35'),('6848f6b0-b60f-49cd-8003-26e71bf61c22','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:32:18','2025-12-20 13:32:18','2025-12-20 13:32:18'),('68e9b196-88c6-4497-8eb4-e50f37319b98',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:08:52','2025-12-14 02:08:52','2025-12-14 02:08:52'),('69137929-b505-48e0-9e43-109af910372c','63a8557f-7b08-4387-852b-f06bfcd47405','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-31 02:12:38','2025-12-31 02:12:38','2025-12-31 02:12:38'),('69eac365-6057-4320-9799-29d364e87f75',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:07:13','2025-12-16 13:07:13','2025-12-16 13:07:13'),('6a29f730-a1eb-4303-bfde-00d52d2639c9',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:03:17','2025-12-14 02:03:17','2025-12-14 02:03:17'),('6a42c342-e4fb-4a36-84a0-c7334bec2034',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 03:58:34','2025-12-14 03:58:34','2025-12-14 03:58:34'),('6ae2206d-07b8-4287-968d-afb186491840','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:33:44','2025-12-20 13:33:44','2025-12-20 13:33:44'),('6b4cddf4-2f83-4963-8f18-feb5997584da','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:34:18','2025-12-20 13:34:18','2025-12-20 13:34:18'),('6bc8dc2d-d5d2-4e35-9ba1-77067ecdfd57',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:08:52','2025-12-14 02:08:52','2025-12-14 02:08:52'),('6c769b8b-c5ee-4e69-acdc-15b397a9ec39','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:15:28','2025-12-16 14:15:28','2025-12-16 14:15:28'),('6ca68303-e207-4368-9bbc-2d04ce68ef73',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:08:54','2025-12-13 16:08:54','2025-12-13 16:08:54'),('6d6b623d-cc67-4015-889d-07d0daefdf40',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:19:26','2025-12-16 02:19:26','2025-12-16 02:19:26'),('6d978e84-11b2-4c1c-aaa1-2418cda9c53b','666257ae-9a19-4d0d-a719-350797918e79','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:39:57','2025-12-31 14:39:57','2025-12-31 14:39:57'),('6e6e0390-6797-4e4c-99f4-7a22fe2f7993','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:51','2025-12-31 14:42:51','2025-12-31 14:42:51'),('6f23eb89-08ab-4aa3-9928-d30dee5a3a49','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:01','2025-12-16 14:40:01','2025-12-16 14:40:01'),('6f5e56df-c637-4ce2-a17b-3442c322bc78','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:30:36','2025-12-16 14:30:36','2025-12-16 14:30:36'),('703d79f6-97db-4b40-8a2f-c0495fa572d4','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:30:34','2025-12-16 14:30:34','2025-12-16 14:30:34'),('7043ec40-739f-4058-b5d2-c986454466ae','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:30:53','2025-12-16 14:30:53','2025-12-16 14:30:53'),('70631ea2-73a9-4c41-80b7-64c203edecfa',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 03:42:11','2025-12-14 03:42:11','2025-12-14 03:42:11'),('706d20b3-e49f-4d60-bc59-68010ae99190','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:57','2025-12-16 14:16:57','2025-12-16 14:16:57'),('70a79c19-c219-4e69-a95c-3d916da95eaa',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:35:25','2025-12-16 13:35:25','2025-12-16 13:35:25'),('710a9df0-26d6-47ba-a73d-2b8f020a9bd3',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:06','2025-12-16 13:51:06','2025-12-16 13:51:06'),('712863a9-9df4-4dd3-b190-efba7f9e1493',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 03:42:11','2025-12-14 03:42:11','2025-12-14 03:42:11'),('71e119f9-42a0-4711-9455-17621510a289','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783','61796564-4a39-457e-a218-1a4dc9bd5f22',0,'2026-09-05 03:10:12','2026-09-05 03:10:12','2026-09-05 03:10:12'),('71e72dca-dcfa-409a-b857-9c66a661879d',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:30:27','2025-12-14 02:30:27','2025-12-14 02:30:27'),('72e77011-69c2-47a1-9d25-59aa953679e3',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:06','2025-12-16 13:51:06','2025-12-16 13:51:06'),('730dc773-3db4-46b2-8586-4e9c036c5467','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:50','2025-12-31 14:42:50','2025-12-31 14:42:50'),('731254c6-7297-4cf2-9d8b-940bd3ca1c88',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:06','2025-12-16 13:51:06','2025-12-16 13:51:06'),('739ef6b0-6860-4a09-b8cc-54617c8c37d2','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:53','2025-12-16 14:39:53','2025-12-16 14:39:53'),('74636862-81fc-4a26-964a-bee484f3fd63',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:09:18','2025-12-13 17:09:18','2025-12-13 17:09:18'),('74c26377-e2c1-46a1-b802-3bd2668c42f6','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:28:07','2025-12-16 14:28:07','2025-12-16 14:28:07'),('75155947-c440-4ebf-90b1-c051485dfa26',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:08:37','2025-12-14 02:08:37','2025-12-14 02:08:37'),('75799447-9708-4789-8984-210fee04f1b6','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:25','2025-12-16 14:46:25','2025-12-16 14:46:25'),('76761187-9de7-41d7-be78-612ca364167d','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:10:08','2025-12-17 11:10:08','2025-12-17 11:10:08'),('779cac18-778c-4548-9498-2c4b61a12cff',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 14:49:38','2025-12-14 14:49:38','2025-12-14 14:49:38'),('78615e47-a9fc-4ba0-8309-aefa6e69e726','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:59','2025-12-16 14:39:59','2025-12-16 14:39:59'),('786ffb68-2fe7-430e-a872-d52379bf65e1',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:01:03','2025-12-16 02:01:03','2025-12-16 02:01:03'),('79528441-d0e1-49c7-b9bb-a95283925714',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:03:19','2025-12-14 02:03:19','2025-12-14 02:03:19'),('798770e2-355c-4443-99cf-df39b22ed7f3',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:13','2025-12-16 13:51:13','2025-12-16 13:51:13'),('79f13e19-6c8d-4f78-a0ee-b1143f63be67','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:30:36','2025-12-16 14:30:36','2025-12-16 14:30:36'),('7a3e422b-a4bc-4b11-9cf0-420b7cb0f3be',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:38:32','2025-12-16 13:38:32','2025-12-16 13:38:32'),('7a4be49a-3092-4ce4-aeca-fd28bc9bf867',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:00:32','2025-12-16 02:00:32','2025-12-16 02:00:32'),('7adafbbe-f8f0-4c87-9fea-f4b3f79c07d4',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:36:33','2025-12-10 07:36:33','2025-12-10 07:36:33'),('7b645b77-5f6a-441c-8016-01a205e78339',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:41:37','2025-12-14 02:41:37','2025-12-14 02:41:37'),('7c61f728-f335-45f5-95e4-477135997bdc',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:13','2025-12-16 13:51:13','2025-12-16 13:51:13'),('7c8b2ed2-bc7e-44fd-b5ef-cd8b2badfb24',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:13:33','2025-12-13 17:13:33','2025-12-13 17:13:33'),('7e118fd1-a526-4a23-a56d-bc22ad860d90','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:23','2025-12-16 14:46:23','2025-12-16 14:46:23'),('7e5afc87-87b8-4427-981e-bc54bf79d93b',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:30:34','2025-12-14 02:30:34','2025-12-14 02:30:34'),('7e73daba-2a80-4ab1-9884-106589828df8','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:46','2025-12-31 14:42:46','2025-12-31 14:42:46'),('7f02b563-f30d-49ec-81d8-21a4359c6129','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:56','2025-12-16 14:39:56','2025-12-16 14:39:56'),('7f2cefa7-0e7e-4633-88b6-cc7d0b0cd5da',NULL,'6ff49abd-07c1-421c-9c52-0b292c67956b',1,'2025-12-16 13:50:16','2025-12-16 13:50:16','2025-12-16 13:50:16'),('7f3a5748-155e-4d77-9f5b-c312e883a620',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:03:07','2025-12-14 02:03:07','2025-12-14 02:03:07'),('7fe285f5-4adb-410f-8cfe-d1eb720edfaf',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:19:26','2025-12-16 02:19:26','2025-12-16 02:19:26'),('801f46b4-39b9-470c-b790-6509ba5e42f6',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:07:14','2025-12-16 13:07:14','2025-12-16 13:07:14'),('80d58d93-9f24-4401-b395-cc4dafaae505',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:11:34','2025-12-16 02:11:34','2025-12-16 02:11:34'),('8279444b-b933-4dc1-8dc9-ab616f078059','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:48','2025-12-31 14:42:48','2025-12-31 14:42:48'),('83252829-48fe-4dae-a2e6-5990efeec6e3',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 03:42:11','2025-12-14 03:42:11','2025-12-14 03:42:11'),('833cdb03-dbf8-4d41-a91e-d66c17d193c3',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:41:36','2025-12-14 02:41:36','2025-12-14 02:41:36'),('83a47c9e-d1d4-4c59-a0ec-d0cc59eab021','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:10:17','2025-12-17 11:10:17','2025-12-17 11:10:17'),('83e238ca-40b6-4bfb-a298-a144e31b7fe4',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:35:43','2025-12-16 13:35:43','2025-12-16 13:35:43'),('8421ee4f-f888-4430-b9c6-2b267fc5b370','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:34:17','2025-12-20 13:34:17','2025-12-20 13:34:17'),('8477eabc-6ad1-4d15-8148-b91cf8636c84',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:12:06','2025-12-16 02:12:06','2025-12-16 02:12:06'),('8490211e-faac-4185-92e1-3a89037d556f',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:40:21','2025-12-16 13:40:21','2025-12-16 13:40:21'),('85557580-2c08-4f23-9d3c-3de24811c951',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:09:14','2025-12-13 17:09:14','2025-12-13 17:09:14'),('85c945d9-166b-4b1c-ab3f-52d56ba6b721',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:00','2025-12-16 13:51:00','2025-12-16 13:51:00'),('85d922eb-fa83-41e4-960b-4d200234cafb',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:16:24','2025-12-16 02:16:24','2025-12-16 02:16:24'),('86481b75-dcdd-4148-9f9b-e88ad74771eb',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:13:43','2025-12-13 17:13:43','2025-12-13 17:13:43'),('883f55aa-c4a4-4c6c-92b1-c01ff32700d8','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:57','2025-12-16 14:16:57','2025-12-16 14:16:57'),('88b24909-b99e-4b79-a316-dac8b8535a95','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:10:08','2025-12-17 11:10:08','2025-12-17 11:10:08'),('88c29271-6714-41d0-8eb0-b026c4afc6da',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:19:26','2025-12-16 02:19:26','2025-12-16 02:19:26'),('891e684d-608f-4409-9e61-ab68a9b834ab','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:50','2025-12-31 14:42:50','2025-12-31 14:42:50'),('894d621d-d06a-4559-b31c-2db07aa90fef','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:21:25','2025-12-16 14:21:25','2025-12-16 14:21:25'),('8953dd1a-f552-40cd-ab53-cfa3cb77074b','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:18:32','2025-12-16 14:18:32','2025-12-16 14:18:32'),('8a1b6109-f58d-487a-9a42-c1918a60ebfa',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:11:34','2025-12-16 02:11:34','2025-12-16 02:11:34'),('8a3020af-3e53-4fa7-9ff3-07fc5a5a1d23','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:24','2025-12-16 14:46:24','2025-12-16 14:46:24'),('8a6604c4-2b22-4182-be0a-fe29e4aecab2',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:02:43','2025-12-16 06:02:43','2025-12-16 06:02:43'),('8b372db6-82c5-4c31-885b-36768ef17cba',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:37:08','2025-12-16 13:37:08','2025-12-16 13:37:08'),('8b7eeca7-44a8-49b0-99c5-0910835b7ef6','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 07:59:12','2025-12-17 07:59:12','2025-12-17 07:59:12'),('8c86a36a-ebe3-487a-8d80-c39128d3d7e2',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:16:15','2025-12-16 02:16:15','2025-12-16 02:16:15'),('8cebe1e5-87f8-427c-bc7a-377ec7004d4d',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 01:56:52','2025-12-14 01:56:52','2025-12-14 01:56:52'),('8cf376dc-bda1-415a-bcaf-384893d048ca','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:10:16','2025-12-17 11:10:16','2025-12-17 11:10:16'),('8d32907d-c927-424d-a5b5-fe3ae3fe560b',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:37:08','2025-12-16 13:37:08','2025-12-16 13:37:08'),('8d5237b8-fa96-44b5-8231-706f96dbe834',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:41:37','2025-12-14 02:41:37','2025-12-14 02:41:37'),('8df9c352-8a1d-411d-a5a7-62edc5b2fa08','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:01','2025-12-16 14:40:01','2025-12-16 14:40:01'),('8dfc853c-8e96-48b3-8540-575b414fae24','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:57','2025-12-16 14:39:57','2025-12-16 14:39:57'),('8e1e3116-773d-4c57-a016-23ee80b14c4b',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:09:16','2025-12-13 17:09:16','2025-12-13 17:09:16'),('8e9a95c5-ae88-40df-bda4-3e76bb84bbc9','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:53','2025-12-16 14:39:53','2025-12-16 14:39:53'),('8e9d1d29-2e0c-4b1c-bdea-dd6cb9e2de4b',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:12:33','2025-12-13 16:12:33','2025-12-13 16:12:33'),('8ec7a4b2-bb45-43b1-b588-2666d4dde003','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:28:06','2025-12-16 14:28:06','2025-12-16 14:28:06'),('8ecbfbe8-195e-48b8-a2a1-b4bf009f69e6',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:54:46','2025-12-13 16:54:46','2025-12-13 16:54:46'),('8f8f930d-8f97-4663-930a-235c4e10846e',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:13:24','2025-12-16 02:13:24','2025-12-16 02:13:24'),('907b1a0f-a7d1-4772-bdc1-324e8049cd6e',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 14:49:38','2025-12-14 14:49:38','2025-12-14 14:49:38'),('9096ffa6-2ed4-477d-baf8-8886e9f3609c','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:21','2025-12-16 14:46:21','2025-12-16 14:46:21'),('911c2321-a6b3-41aa-a8a1-01c529a3f7bd',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:09:04','2025-12-13 17:09:04','2025-12-13 17:09:04'),('913f41fb-1640-40f5-a3fb-feadccd6e158','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:09:10','2025-12-17 11:09:10','2025-12-17 11:09:10'),('914000d2-209e-407c-bc54-9ce0b28f5ab0',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 14:49:39','2025-12-14 14:49:39','2025-12-14 14:49:39'),('91c1aa3b-41f8-435c-b6f5-dd6af550a5a9','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:33:44','2025-12-20 13:33:44','2025-12-20 13:33:44'),('921c20f0-af96-42a2-8317-653a7f676a58',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 03:41:05','2025-12-14 03:41:05','2025-12-14 03:41:05'),('92a8b774-33a8-40a6-94be-66c61432f3a1','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:41:17','2025-12-16 14:41:17','2025-12-16 14:41:17'),('9362f781-7b66-4855-aa14-98c69388da1f','63a8557f-7b08-4387-852b-f06bfcd47405','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-31 02:12:36','2025-12-31 02:12:36','2025-12-31 02:12:36'),('941c3e08-5cef-48e6-b6e9-fce75e7c4c89',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:12:33','2025-12-13 16:12:33','2025-12-13 16:12:33'),('9488f8af-ac7c-450c-b65f-0ad3c23b1d23','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:10:16','2025-12-17 11:10:16','2025-12-17 11:10:16'),('95bf3479-c614-45d3-8bd5-c9a4c7e52a0b',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:13','2025-12-16 13:51:13','2025-12-16 13:51:13'),('95dacc9b-1be5-437b-b238-738be38dac30','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:18:32','2025-12-16 14:18:32','2025-12-16 14:18:32'),('96d927e6-afad-43ff-a417-db0dd9fc91b7','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:58','2025-12-16 14:39:58','2025-12-16 14:39:58'),('9788e29d-9c5d-4451-9e42-9c86f8b02493','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:57','2025-12-16 14:39:57','2025-12-16 14:39:57'),('97d81d2d-0492-4bc6-a8ed-5de08bbcaf0c','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:33:45','2025-12-20 13:33:45','2025-12-20 13:33:45'),('98464e2d-ecee-4c0e-84ab-6535c6f05b77','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:53','2025-12-31 14:42:53','2025-12-31 14:42:53'),('989536e6-4b31-4b56-81c5-9c3025bce861','63a8557f-7b08-4387-852b-f06bfcd47405','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-31 02:12:36','2025-12-31 02:12:36','2025-12-31 02:12:36'),('98b2c80e-daa6-4f02-8ea0-549fa266842d','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:59','2025-12-16 14:16:59','2025-12-16 14:16:59'),('98ba594e-d16f-4b43-8e5c-8bbb95ff045c',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:02:42','2025-12-16 06:02:42','2025-12-16 06:02:42'),('99e23385-d63b-4a77-8d81-f5b1ebba85fd','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:33:03','2025-12-20 13:33:03','2025-12-20 13:33:03'),('9a9e930c-e698-4d6c-ab84-0f790756247e',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 02:33:11','2025-12-14 02:33:11','2025-12-14 02:33:11'),('9a9f9687-1a88-4447-95e0-4c5d2f9ec1e0',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:05','2025-12-16 13:51:05','2025-12-16 13:51:05'),('9ada46b4-45e5-4c39-8eb4-360c9af4ce2b','666257ae-9a19-4d0d-a719-350797918e79','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:39:52','2025-12-31 14:39:52','2025-12-31 14:39:52'),('9aebac5a-df55-4d5e-b74e-20663b1b30ec',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:41:32','2025-12-14 02:41:32','2025-12-14 02:41:32'),('9aef51be-041c-4c84-ae4b-a3bfe1df5bed','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:50','2025-12-31 14:42:50','2025-12-31 14:42:50'),('9af75e4c-5c60-457e-a6b2-19a5617793bb',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:03:03','2025-12-14 02:03:03','2025-12-14 02:03:03'),('9bec41bd-1099-40be-ad4e-05675d34d0c6',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:30:27','2025-12-14 02:30:27','2025-12-14 02:30:27'),('9c821954-899f-4bf6-bd61-49394418c0e2','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 06:03:57','2025-12-17 06:03:57','2025-12-17 06:03:57'),('9d5a8b86-ab57-4ce1-aaba-a910b6af145a',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:13','2025-12-16 13:51:13','2025-12-16 13:51:13'),('9e4d1c31-ef45-41d6-9492-87ed4940ac99',NULL,'6ff49abd-07c1-421c-9c52-0b292c67956b',1,'2025-12-16 13:50:24','2025-12-16 13:50:24','2025-12-16 13:50:24'),('9f31b4ff-0de6-4cad-970e-418c9bfab90c',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:29:24','2025-12-10 07:29:24','2025-12-10 07:29:24'),('a11912e3-b595-4a84-a6fd-13321ab4b2a5','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:43:21','2025-12-31 14:43:21','2025-12-31 14:43:21'),('a26fd0f9-1e09-46ca-a3bb-cb75d9d3afc3',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:06','2025-12-16 13:51:06','2025-12-16 13:51:06'),('a332fba6-6039-4efd-931e-c4bc9da802ce',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:14:26','2025-12-13 17:14:26','2025-12-13 17:14:26'),('a35504c3-b952-4b35-af0c-8113c4c53170',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 01:56:53','2025-12-14 01:56:53','2025-12-14 01:56:53'),('a3928aca-b639-41b8-85ed-6ca28f826441',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-15 17:09:03','2025-12-15 17:09:03','2025-12-15 17:09:03'),('a424c9f4-00c3-44eb-80bd-d04f5d66fdb6','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:43:23','2025-12-31 14:43:23','2025-12-31 14:43:23'),('a43e1906-a74c-4304-9a8b-c597d0748028','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:59','2025-12-16 14:16:59','2025-12-16 14:16:59'),('a4a22630-e3eb-4556-a4e4-6fb61804afed',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:08:37','2025-12-14 02:08:37','2025-12-14 02:08:37'),('a6761df4-008f-4844-876f-329d69593451',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:09:17','2025-12-13 17:09:17','2025-12-13 17:09:17'),('a698e97a-6dfb-48a2-85a9-61ebe7c08ae9',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:13:34','2025-12-13 17:13:34','2025-12-13 17:13:34'),('a72d1ad5-8fdf-43b0-9cb0-4b7ba3e5d74b',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 02:33:15','2025-12-14 02:33:15','2025-12-14 02:33:15'),('a75b242c-f710-4ac4-ad8d-bf2204021108','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:50','2025-12-31 14:42:50','2025-12-31 14:42:50'),('a75d9bf7-c1df-4407-b02c-def7c1a27b1f',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:40:48','2025-12-16 13:40:48','2025-12-16 13:40:48'),('a7be8092-a96b-49bd-8321-8c3053372b48','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:59','2025-12-16 14:39:59','2025-12-16 14:39:59'),('a805fc61-a97c-423e-944b-154927e52a0a',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:08:57','2025-12-14 02:08:57','2025-12-14 02:08:57'),('a81db536-1a0f-4b70-86cb-eddd95c03fb0','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:30:54','2025-12-16 14:30:54','2025-12-16 14:30:54'),('a8ae20f0-e46f-453c-8277-48055e98b42f',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:02:33','2025-12-16 06:02:33','2025-12-16 06:02:33'),('a966f2cb-548b-4595-9e3e-e628a73fa425','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:43:24','2025-12-31 14:43:24','2025-12-31 14:43:24'),('aa2e20a6-2178-46c9-a20a-dbba270a4e58','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:28','2025-12-16 14:46:28','2025-12-16 14:46:28'),('aac2432b-5374-4d53-a203-aa7d8c957675','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:16:24','2025-12-16 14:16:24','2025-12-16 14:16:24'),('aae48805-a5d3-44d0-bd88-2d52c6ab2c6e',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:31:25','2025-12-14 02:31:25','2025-12-14 02:31:25'),('ab04aee4-6a7f-4c5d-9bdf-c5ba31770988',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:07:15','2025-12-16 13:07:15','2025-12-16 13:07:15'),('ab409c4d-a1d4-4575-acf7-cef7c7ad99b2',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:37:09','2025-12-16 13:37:09','2025-12-16 13:37:09'),('ab41a742-4610-47e6-9260-c0ab00d30e13','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:25','2025-12-16 14:46:25','2025-12-16 14:46:25'),('ab66c99c-651f-49f5-8a54-c563427bb696','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:04','2025-12-16 14:40:04','2025-12-16 14:40:04'),('ab6acadc-cf95-4009-a64a-49753a515c17','3fa1ba44-74d8-44bb-8610-e9e835487dcd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2026-08-28 13:41:26','2026-08-28 13:41:26','2026-08-28 13:41:26'),('aba96f83-3d65-43fa-b864-342495d1d0cb',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:40:48','2025-12-16 13:40:48','2025-12-16 13:40:48'),('abf6c393-e885-4457-9e03-513bc97e2f5a',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:40:21','2025-12-16 13:40:21','2025-12-16 13:40:21'),('ac178377-a5d9-4fa7-89ee-77440fa4792b','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:44','2025-12-31 14:42:44','2025-12-31 14:42:44'),('ac9dba06-4b5e-4473-a293-904da6b3d74e','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:34:17','2025-12-20 13:34:17','2025-12-20 13:34:17'),('acbbd38f-997f-4300-a5e7-31cf14e915f7','3fa1ba44-74d8-44bb-8610-e9e835487dcd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2026-08-28 13:41:21','2026-08-28 13:41:21','2026-08-28 13:41:21'),('ad240736-605e-43d3-90a5-6965c934c97d',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 02:33:19','2025-12-14 02:33:19','2025-12-14 02:33:19'),('ae12730a-0e17-43f2-8bca-45d7c8e6d8ed',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:00:32','2025-12-16 02:00:32','2025-12-16 02:00:32'),('aea0caff-117f-4c4c-aee0-4d3d52e735a9','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:15:59','2025-12-16 14:15:59','2025-12-16 14:15:59'),('b06c024e-7bb8-4a96-96de-2c8cc6799fd2','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 07:58:58','2025-12-17 07:58:58','2025-12-17 07:58:58'),('b07ffd68-2cea-447b-bc7c-ffaf377a94be',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 03:58:03','2025-12-14 03:58:03','2025-12-14 03:58:03'),('b100342e-1194-4cbb-8971-64162ad2765e','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:54','2025-12-16 14:16:54','2025-12-16 14:16:54'),('b141f8ed-27c6-46be-97dd-c8496a2cbff4',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:03:19','2025-12-14 02:03:19','2025-12-14 02:03:19'),('b216028c-8545-4821-be01-3e6bac445270',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:40:20','2025-12-16 13:40:20','2025-12-16 13:40:20'),('b28b963f-8124-4ea3-939b-7bf6ec6333a8','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:28:07','2025-12-16 14:28:07','2025-12-16 14:28:07'),('b2aa7b3f-47ba-49e6-945b-2b2c8d346662',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:03:18','2025-12-14 02:03:18','2025-12-14 02:03:18'),('b3e52950-0ad7-43c1-8577-38832be75625','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:34:15','2025-12-20 13:34:15','2025-12-20 13:34:15'),('b4534286-1096-4338-9131-cd45ddd6bbee','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:54','2025-12-16 14:39:54','2025-12-16 14:39:54'),('b47b0abe-cca1-4984-96a8-6cebf43d5b64','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 06:51:54','2025-12-17 06:51:54','2025-12-17 06:51:54'),('b4f39769-ad74-4036-8ae9-2eb4a7f7e567',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:00:37','2025-12-16 02:00:37','2025-12-16 02:00:37'),('b6726913-f523-407f-b100-91720c87c184','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:23:02','2025-12-16 14:23:02','2025-12-16 14:23:02'),('b6df13fe-9ef4-4d05-ba35-9b85e2e4744b','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-24 12:25:26','2025-12-24 12:25:26','2025-12-24 12:25:26'),('b724239f-14b4-4e0d-9797-9097608b530b','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:59','2025-12-16 14:16:59','2025-12-16 14:16:59'),('b72d0653-08c9-4792-bca7-0f33bcb86754',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 14:42:35','2025-12-14 14:42:35','2025-12-14 14:42:35'),('b75eced7-67ad-4368-b09e-81510b1f92ec',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:03:08','2025-12-14 02:03:08','2025-12-14 02:03:08'),('b775bf05-8ec0-492b-89a5-a2ca77029cd1',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:14:26','2025-12-13 17:14:26','2025-12-13 17:14:26'),('b7ce1a8f-0328-43af-ae28-014bc008daf0',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:09:04','2025-12-13 17:09:04','2025-12-13 17:09:04'),('b7e78c46-91fd-431b-98e4-d3e02455d424',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:54:35','2025-12-13 16:54:35','2025-12-13 16:54:35'),('b8002308-2e77-4d19-b2ec-7d0820ec87ba','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:49','2025-12-31 14:42:49','2025-12-31 14:42:49'),('b87aebf2-d8e3-44fd-9cf2-fad472b5668c','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:09:16','2025-12-17 11:09:16','2025-12-17 11:09:16'),('b8d40e9d-e19f-4add-a3eb-d93d2609cffb','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:10:09','2025-12-17 11:10:09','2025-12-17 11:10:09'),('b921acae-77c7-45c2-a118-d1d2525ee829',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:00:38','2025-12-16 02:00:38','2025-12-16 02:00:38'),('b92d99a8-07fb-4a34-afc4-6de3e3917b9d',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 03:41:06','2025-12-14 03:41:06','2025-12-14 03:41:06'),('b9f581a2-54d0-45ed-8d29-21a027741e98','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:57','2025-12-16 14:39:57','2025-12-16 14:39:57'),('ba53b6c0-dd70-46ac-90b3-79842b695c33','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 07:58:59','2025-12-17 07:58:59','2025-12-17 07:58:59'),('ba660284-1f5c-4ec3-ae2e-93c447231f47','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:31:12','2025-12-16 14:31:12','2025-12-16 14:31:12'),('baab31fe-cfe1-463a-b065-cb36c4cbc300','7bb16e6a-6f5a-478c-aa83-ed7a1f45c783','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-24 12:25:26','2025-12-24 12:25:26','2025-12-24 12:25:26'),('baf3df01-9e1e-4230-a820-a49e6e3c0d72','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:06','2025-12-16 14:40:06','2025-12-16 14:40:06'),('bb2a9553-dfe0-4b9e-90c0-e3f11ef50365',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:19:27','2025-12-16 02:19:27','2025-12-16 02:19:27'),('bbdd4255-2d3b-4881-aaee-6511b7e9fadf','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:31:12','2025-12-16 14:31:12','2025-12-16 14:31:12'),('bbddd84e-acfe-4697-af19-b72e90a5e4c4','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:54','2025-12-16 14:39:54','2025-12-16 14:39:54'),('bc5a70f5-7161-4d2a-912d-bd70970b395e',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:41:37','2025-12-14 02:41:37','2025-12-14 02:41:37'),('bc9a7324-0d95-48aa-ae44-3eb8e45f4bff','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:09:09','2025-12-17 11:09:09','2025-12-17 11:09:09'),('bcd55010-438b-4659-8898-2c6e4265f678',NULL,'6ff49abd-07c1-421c-9c52-0b292c67956b',1,'2025-12-16 13:37:33','2025-12-16 13:37:33','2025-12-16 13:37:33'),('bdf2d735-6354-43d5-980f-7e723ca7ee07','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:52','2025-12-16 14:39:52','2025-12-16 14:39:52'),('bec56760-6982-49c7-8e9f-8ffcc039fb47',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:40:20','2025-12-16 13:40:20','2025-12-16 13:40:20'),('bee151b2-811a-4099-aa60-0d42bc78fc55','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:23:02','2025-12-16 14:23:02','2025-12-16 14:23:02'),('c114607a-96eb-4ef9-a1b1-7b427eff7883','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 06:03:56','2025-12-17 06:03:56','2025-12-17 06:03:56'),('c1357b2b-ee54-44cd-9cf7-80ab13dd3e72','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:09:09','2025-12-17 11:09:09','2025-12-17 11:09:09'),('c183b46e-5549-4616-bf7a-7957b1ac5994',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:19:26','2025-12-16 02:19:26','2025-12-16 02:19:26'),('c22bcf8b-62b1-4b6c-89e2-495149a41b60',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:35:25','2025-12-16 13:35:25','2025-12-16 13:35:25'),('c28b53f9-605b-45bc-97d5-46ea3486c892','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:03','2025-12-16 14:40:03','2025-12-16 14:40:03'),('c3730aeb-d4c0-417e-a843-65bdadf7c88d','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:56','2025-12-16 14:16:56','2025-12-16 14:16:56'),('c37cf25e-53c4-49fa-a378-ccbca2ba803f','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:33:02','2025-12-20 13:33:02','2025-12-20 13:33:02'),('c52e7173-6d14-4a8a-a50a-47689af40e5c',NULL,'6ff49abd-07c1-421c-9c52-0b292c67956b',1,'2025-12-16 13:50:44','2025-12-16 13:50:44','2025-12-16 13:50:44'),('c62a785d-190a-4893-a5a8-0e5478f422d6','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:10:16','2025-12-17 11:10:16','2025-12-17 11:10:16'),('c63b0c15-2023-420e-9ddc-5bb746d7ed9d',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:10:55','2025-12-14 02:10:55','2025-12-14 02:10:55'),('c6bcc81f-454b-4b9f-9f7b-8993ff2fa879',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 03:58:02','2025-12-14 03:58:02','2025-12-14 03:58:02'),('c6cb10d7-00d6-4e56-b91f-db02cf8198e1','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:16:23','2025-12-16 14:16:23','2025-12-16 14:16:23'),('c79849cb-2158-4ba2-85d1-0c9d66dda6b6','3fa1ba44-74d8-44bb-8610-e9e835487dcd','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2026-08-28 13:41:27','2026-08-28 13:41:27','2026-08-28 13:41:27'),('c95c82a7-1bce-4eae-81a2-840d7f6ca56f',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:00:38','2025-12-16 02:00:38','2025-12-16 02:00:38'),('caaef56a-0de2-4e92-9049-3fcae8f52d80','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:28','2025-12-16 14:46:28','2025-12-16 14:46:28'),('cb771fb7-146b-4594-aad1-1b373723a004','63a8557f-7b08-4387-852b-f06bfcd47405','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-30 12:58:52','2025-12-30 12:58:52','2025-12-30 12:58:52'),('cbe18296-1c2c-4f5b-96c6-3d61666d8863',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 03:41:05','2025-12-14 03:41:05','2025-12-14 03:41:05'),('cc2a05e1-8865-4253-a064-1eeba4a270d3',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:13:24','2025-12-16 06:13:24','2025-12-16 06:13:24'),('ccbc74c5-0793-4690-836b-6ab843861f5d','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:34:17','2025-12-20 13:34:17','2025-12-20 13:34:17'),('ccdf9707-7849-42e2-a560-5df0ce4cb7aa','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:16:24','2025-12-16 14:16:24','2025-12-16 14:16:24'),('cce2e7e3-9f66-4ac2-aa2b-aa7cc6673253',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:02:44','2025-12-16 06:02:44','2025-12-16 06:02:44'),('cd3eb209-2c40-42f8-8be0-fae63dbe8cf0',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:00:52','2025-12-16 02:00:52','2025-12-16 02:00:52'),('cda078ec-f55b-40db-b7b8-25b7f388867e','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:09:05','2025-12-17 11:09:05','2025-12-17 11:09:05'),('cdbc0c52-e2c8-4f1c-99e2-13f9ef0593e4','63a8557f-7b08-4387-852b-f06bfcd47405','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-31 02:12:36','2025-12-31 02:12:36','2025-12-31 02:12:36'),('ce084b89-497d-4954-abfc-c652c9edbba9',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:35:43','2025-12-16 13:35:43','2025-12-16 13:35:43'),('cf03ff52-cec3-426f-bb9f-9100bbd48706',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:00','2025-12-16 13:51:00','2025-12-16 13:51:00'),('cf36d846-0067-40d9-96df-af2f04220cb0','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 07:59:12','2025-12-17 07:59:12','2025-12-17 07:59:12'),('d0d9743a-b8b4-490b-8057-d1a3fff89c25',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:35:26','2025-12-16 13:35:26','2025-12-16 13:35:26'),('d0ed9252-b9d7-43bc-91ea-d2b4f3afd465',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:31:26','2025-12-14 02:31:26','2025-12-14 02:31:26'),('d1777a3e-f552-4a42-a2ac-aec7b3bdb8b7','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 06:03:57','2025-12-17 06:03:57','2025-12-17 06:03:57'),('d1e6fff4-4af6-4b72-902b-64ea03746dd4',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 02:33:16','2025-12-14 02:33:16','2025-12-14 02:33:16'),('d2b1443c-073e-4172-b7f3-51163673758a','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:15:28','2025-12-16 14:15:28','2025-12-16 14:15:28'),('d3aa85af-27d1-4f3d-af5e-76dcbc03b512',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:01:03','2025-12-16 02:01:03','2025-12-16 02:01:03'),('d3eb77ab-d44c-4ac4-9311-fc2e65c5c120','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:59','2025-12-16 14:39:59','2025-12-16 14:39:59'),('d4725a3c-a69d-40b0-8670-3b9543735096','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:33:44','2025-12-20 13:33:44','2025-12-20 13:33:44'),('d599090a-793c-4d84-810b-d521fcef6484',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:54:34','2025-12-13 16:54:34','2025-12-13 16:54:34'),('d59fb0aa-c0de-4f45-a1e7-b1fff3c4e91a',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:36:32','2025-12-10 07:36:32','2025-12-10 07:36:32'),('d7109782-1105-4bf8-8bd5-c7b8c4f8c3c5','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:27','2025-12-16 14:46:27','2025-12-16 14:46:27'),('d7c2b51f-33c5-4982-a6ad-a9f5159d8123',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:13:17','2025-12-16 02:13:17','2025-12-16 02:13:17'),('d80e0568-a039-4736-8a6c-eae161a1cf15',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 03:41:06','2025-12-14 03:41:06','2025-12-14 03:41:06'),('d8e80202-0a1e-4f9d-8c0e-c5081f754be8','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 13:58:32','2025-12-16 13:58:32','2025-12-16 13:58:32'),('d9808bca-ce9b-41a5-a7f9-f61436e2e81a','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:16:23','2025-12-16 14:16:23','2025-12-16 14:16:23'),('d9d26bff-403b-4e9e-9b26-dad38a54d956',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:08:38','2025-12-14 02:08:38','2025-12-14 02:08:38'),('da2f4849-ca41-4819-a1b1-2b0796f401a3','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:32:18','2025-12-20 13:32:18','2025-12-20 13:32:18'),('da6d0d0d-77b5-4dd7-ad48-de2e740ac046',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 02:33:18','2025-12-14 02:33:18','2025-12-14 02:33:18'),('db04b92d-45b2-4908-9648-42dfd9c864a6',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:08:36','2025-12-14 02:08:36','2025-12-14 02:08:36'),('db06d2f0-54e2-41ee-bfc0-b3ce6d96313f',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:11:34','2025-12-16 02:11:34','2025-12-16 02:11:34'),('dbe01baa-ba1d-476d-b9b3-0c14996cb6e4','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 07:59:11','2025-12-17 07:59:11','2025-12-17 07:59:11'),('dbf667d1-8d52-4557-b3ae-f3ce9195f902',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:11:34','2025-12-16 02:11:34','2025-12-16 02:11:34'),('dc63a1eb-e401-41ad-a434-673c2525cd44',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:36:33','2025-12-10 07:36:33','2025-12-10 07:36:33'),('dcf5b5bf-191a-4dd0-a590-84b93e5dba32',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:13:24','2025-12-16 02:13:24','2025-12-16 02:13:24'),('dd1e67c7-109a-4a3d-aa94-45f5eceb9fab',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:13:42','2025-12-13 17:13:42','2025-12-13 17:13:42'),('ddae3d46-412e-4e21-aafe-75e5607344b7',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 04:28:55','2025-12-14 04:28:55','2025-12-14 04:28:55'),('ddfdab1a-7f0d-4751-b20e-e776da6439bf',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 02:33:11','2025-12-14 02:33:11','2025-12-14 02:33:11'),('dedd9a5c-29a0-488e-a3fd-995cf9a6556a','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:09:09','2025-12-17 11:09:09','2025-12-17 11:09:09'),('dee4424c-f4bf-4a82-8fa4-8e49ed04063d',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:54:37','2025-12-13 16:54:37','2025-12-13 16:54:37'),('df3b2381-aba4-42cd-a9fb-6612096b05f5','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:40:07','2025-12-16 14:40:07','2025-12-16 14:40:07'),('df547e04-c17f-4273-acb0-ffb737b9287e',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 04:28:37','2025-12-14 04:28:37','2025-12-14 04:28:37'),('df81c002-8fcf-43ae-be56-48c50d7c540d',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 04:28:55','2025-12-14 04:28:55','2025-12-14 04:28:55'),('dfbc6356-e266-4e93-ae6e-9d674229443d',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:03:19','2025-12-14 02:03:19','2025-12-14 02:03:19'),('e10776de-3950-4ad3-a208-598b5496c453','666257ae-9a19-4d0d-a719-350797918e79','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:39:57','2025-12-31 14:39:57','2025-12-31 14:39:57'),('e176ff58-073c-4e2e-aab9-a30d49ca2f41','63a8557f-7b08-4387-852b-f06bfcd47405','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-30 12:58:51','2025-12-30 12:58:51','2025-12-30 12:58:51'),('e1aeeaf6-2fae-42b7-8468-c759ca3407a1',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 04:28:37','2025-12-14 04:28:37','2025-12-14 04:28:37'),('e1ff9ee6-b2ca-47de-830a-5741438d5dfd',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:08:37','2025-12-14 02:08:37','2025-12-14 02:08:37'),('e206cd78-bc28-434f-a21f-71be12d7b26e',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:13:29','2025-12-16 02:13:29','2025-12-16 02:13:29'),('e2281e2b-ab4e-41c1-a2a6-f2dc197de997',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 15:31:24','2025-12-13 15:31:24','2025-12-13 15:31:24'),('e2ead8be-6c4f-478b-9f98-17500baed8fa','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:34:15','2025-12-20 13:34:15','2025-12-20 13:34:15'),('e53ac235-5e72-41e8-8b6a-334a69457ccb','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 07:37:49','2025-12-17 07:37:49','2025-12-17 07:37:49'),('e6402b0a-42c1-48c5-b20c-f1fd2803318a','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:58','2025-12-16 14:39:58','2025-12-16 14:39:58'),('e6a81217-1116-4a40-bffa-d219c4fa5f8f',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:08:52','2025-12-14 02:08:52','2025-12-14 02:08:52'),('e6c6a1ac-e116-4ba7-a9db-7a90a9fcf2f1',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 07:31:31','2025-12-10 07:31:31','2025-12-10 07:31:31'),('e734cbd0-d65c-412f-93d9-ccba49c172c6','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:26','2025-12-16 14:46:26','2025-12-16 14:46:26'),('e765eae6-1f30-49c8-be14-5b44fb2cfd6a',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-14 02:33:17','2025-12-14 02:33:17','2025-12-14 02:33:17'),('e77e1ac5-445f-4ce2-a8d6-13259af3ad1d','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:30:55','2025-12-16 14:30:55','2025-12-16 14:30:55'),('e7b98a83-3ce7-4213-916f-e76183b901e4','12e83e76-b87c-444f-8810-bcba2bdcee62','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-30 17:27:17','2025-12-30 17:27:17','2025-12-30 17:27:17'),('e84e9907-94ec-41c1-a120-9f2dedb22412','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:30:35','2025-12-16 14:30:35','2025-12-16 14:30:35'),('e9597844-8f4a-4a51-8cf1-c6a2612d00e6',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:08:57','2025-12-14 02:08:57','2025-12-14 02:08:57'),('ea8a26b5-0751-4211-8cb6-71bd41240abd',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:13:33','2025-12-13 17:13:33','2025-12-13 17:13:33'),('eac4ec93-eade-4521-95e2-f32830d8325b',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:00:37','2025-12-16 02:00:37','2025-12-16 02:00:37'),('eb029789-bf4d-4331-9a70-a0cb3bd9eb80','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 07:58:58','2025-12-17 07:58:58','2025-12-17 07:58:58'),('ebeb54ca-05a7-4f81-bad8-0c718a86df05',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 15:31:24','2025-12-13 15:31:24','2025-12-13 15:31:24'),('ec10f589-9ecd-4454-b3fe-06ca4b52e7af',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:40:20','2025-12-16 13:40:20','2025-12-16 13:40:20'),('ec31a9c3-e3f1-4b2a-bc39-5fcf45dea4ca',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:12:33','2025-12-13 16:12:33','2025-12-13 16:12:33'),('eca56d73-8fd3-4886-b2b1-17604e4f0c81','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:52','2025-12-16 14:39:52','2025-12-16 14:39:52'),('eca7dd09-c27b-432b-81dc-33147d047944',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:11:33','2025-12-16 02:11:33','2025-12-16 02:11:33'),('edd6b888-fda3-4159-9fae-18db1baf581b',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:13:02','2025-12-16 06:13:02','2025-12-16 06:13:02'),('f011adfd-d482-46f0-a7b8-835c96b87b49','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:22','2025-12-16 14:46:22','2025-12-16 14:46:22'),('f049c5ea-7592-4013-bd08-7da921430773','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:00','2025-12-16 14:16:00','2025-12-16 14:16:00'),('f083e139-9751-4149-8c9d-e72b64dc4822',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:12:33','2025-12-13 16:12:33','2025-12-13 16:12:33'),('f0b08797-b252-41cd-8aca-aeb1c1e4d833','63a8557f-7b08-4387-852b-f06bfcd47405','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-30 12:58:46','2025-12-30 12:58:46','2025-12-30 12:58:46'),('f0c56aa5-7bb9-44fa-b235-c242161808ed',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:00:53','2025-12-16 02:00:53','2025-12-16 02:00:53'),('f24bc407-084c-4a5f-bae1-415520379b62','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:27','2025-12-16 14:46:27','2025-12-16 14:46:27'),('f2abbd4d-5675-499f-8acf-811aaffd7347',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:51:13','2025-12-16 13:51:13','2025-12-16 13:51:13'),('f311b386-37fc-4ccd-8c9e-7ba57907cdff','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:42:53','2025-12-31 14:42:53','2025-12-31 14:42:53'),('f3a1f17d-1ad5-41f3-a6de-730633aae67e','63a8557f-7b08-4387-852b-f06bfcd47405','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-30 12:58:46','2025-12-30 12:58:46','2025-12-30 12:58:46'),('f3c0a8b7-e5ef-471d-9458-7e623ae0ef6f',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 03:41:05','2025-12-14 03:41:05','2025-12-14 03:41:05'),('f3ee6677-df10-40ac-977b-038d24b52614',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-10 09:34:47','2025-12-10 09:34:47','2025-12-10 09:34:47'),('f47bf9e0-2ff1-45d1-b0e7-45e39eebc657',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 16:53:02','2025-12-13 16:53:02','2025-12-13 16:53:02'),('f49ac6d2-a0e6-4ec2-a9d3-0a0c80268f00','b406180e-461a-4741-b3dc-6e43407372ac','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:46:24','2025-12-16 14:46:24','2025-12-16 14:46:24'),('f4e81404-4fd3-43ca-bd72-92841905907c',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:31:25','2025-12-14 02:31:25','2025-12-14 02:31:25'),('f52b5ae2-6105-439d-b5ba-2ee0e1242ebd',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:13:02','2025-12-16 06:13:02','2025-12-16 06:13:02'),('f5dc81bb-b37f-497f-a1cc-7d999864c7f4',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:35:24','2025-12-16 13:35:24','2025-12-16 13:35:24'),('f619d99b-a11c-42bf-8d35-2a00f13bff89','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:43:21','2025-12-31 14:43:21','2025-12-31 14:43:21'),('f63d2ff7-7ceb-460c-bef3-643086bfcb2d','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:32:17','2025-12-20 13:32:17','2025-12-20 13:32:17'),('f665f67e-82f2-46bc-ab61-feea2bb1e8fa',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:35:32','2025-12-16 13:35:32','2025-12-16 13:35:32'),('f6d93bc0-0767-4855-8338-1e473f1090a5',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:02:33','2025-12-16 06:02:33','2025-12-16 06:02:33'),('f7f5197b-28c2-4f42-a194-0faf29c387da','3fa1ba44-74d8-44bb-8610-e9e835487dcd','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:43:18','2025-12-31 14:43:18','2025-12-31 14:43:18'),('f805df88-4145-4ffa-8a1b-2f20a3ef06f8',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:10:56','2025-12-14 02:10:56','2025-12-14 02:10:56'),('f80defd3-bd4f-45e8-ba93-5fefb5e7fb0a','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:56','2025-12-16 14:16:56','2025-12-16 14:16:56'),('f83fa84c-2a36-4f3e-a387-f3cb3acecda2','7da343c5-473a-4373-aba4-83c9ce3be24b','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-16 14:16:55','2025-12-16 14:16:55','2025-12-16 14:16:55'),('f868db3d-c9c1-4864-bac0-f2138ab6b60a',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:13:30','2025-12-16 02:13:30','2025-12-16 02:13:30'),('f8fe8c66-c7ba-4ddb-9625-4e5f92391560',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:09:15','2025-12-13 17:09:15','2025-12-13 17:09:15'),('f909fe8c-ff8c-42c2-960e-e9bdee6fa77f','666257ae-9a19-4d0d-a719-350797918e79','b8bdd193-9c08-4310-8411-1f950308217c',0,'2025-12-31 14:39:57','2025-12-31 14:39:57','2025-12-31 14:39:57'),('f98d7381-a295-480d-a877-b4a1c68b58db','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 07:59:12','2025-12-17 07:59:12','2025-12-17 07:59:12'),('f9ac7155-b5ba-4106-89d1-49bbdb3b63d5','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 07:55:49','2025-12-17 07:55:49','2025-12-17 07:55:49'),('f9f055c6-f612-403b-96e6-e7453375fc1d','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:34:16','2025-12-20 13:34:16','2025-12-20 13:34:16'),('f9f30d48-a259-48c4-ba58-11c018ef7b6b',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:02:44','2025-12-16 06:02:44','2025-12-16 06:02:44'),('fa3c2530-b706-4e34-bee1-9b0edb21b582',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:07:13','2025-12-16 13:07:13','2025-12-16 13:07:13'),('fa51e2f5-c5b1-460e-9988-ab369e331e2c',NULL,'d9bd62e0-4721-4a94-85e4-fa69f96d0974',1,'2025-12-14 02:03:17','2025-12-14 02:03:17','2025-12-14 02:03:17'),('fa689d76-dbc7-478f-82b7-edbbdd15b3c8',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 06:13:03','2025-12-16 06:13:03','2025-12-16 06:13:03'),('fbe832d3-0572-4c2a-b582-d9cf63db1404',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:13:41','2025-12-13 17:13:41','2025-12-13 17:13:41'),('fc0cefb0-6150-41d7-8dfe-11c69529e70f',NULL,'6ff49abd-07c1-421c-9c52-0b292c67956b',1,'2025-12-16 13:50:24','2025-12-16 13:50:24','2025-12-16 13:50:24'),('fc609f2b-41a6-4f5f-8dcc-655a46784f5f',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 02:01:03','2025-12-16 02:01:03','2025-12-16 02:01:03'),('fc846f05-7ea2-451d-add7-8e62c290de4c','63a8557f-7b08-4387-852b-f06bfcd47405','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-31 02:12:36','2025-12-31 02:12:36','2025-12-31 02:12:36'),('fd696b07-55d5-4200-8c61-9cdc78bfe960','f246acd0-0bf1-4489-bf3a-fdbb1e39c642','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-20 13:34:16','2025-12-20 13:34:16','2025-12-20 13:34:16'),('fd8559a8-0f8f-4a7a-884d-db3a17e6c8fd','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:52','2025-12-16 14:39:52','2025-12-16 14:39:52'),('fe1f6a6d-23a8-4684-b1a3-0c0cc9b67f3f',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-13 17:13:42','2025-12-13 17:13:42','2025-12-13 17:13:42'),('fe8b2ca3-15c5-419e-b9d7-3b3322b03a57',NULL,'abc5f3e7-c584-4c10-8a80-98fcf163f0c8',1,'2025-12-16 13:50:27','2025-12-16 13:50:27','2025-12-16 13:50:27'),('feaa4968-1c4c-495b-8dbf-15ba7ee4c78c','f8166250-4f89-403d-88a5-87e50a9015b6','abc5f3e7-c584-4c10-8a80-98fcf163f0c8',0,'2025-12-17 11:09:05','2025-12-17 11:09:05','2025-12-17 11:09:05'),('fee56e59-069e-4608-b9a6-db651edc310a','7da343c5-473a-4373-aba4-83c9ce3be24b','6ff49abd-07c1-421c-9c52-0b292c67956b',0,'2025-12-16 14:39:54','2025-12-16 14:39:54','2025-12-16 14:39:54');
/*!40000 ALTER TABLE `typing_indicators` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_investments`
--

DROP TABLE IF EXISTS `user_investments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_investments` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `stock_symbol` varchar(255) DEFAULT NULL,
  `quantity` decimal(15,4) DEFAULT NULL,
  `avg_price` decimal(15,4) DEFAULT NULL,
  `current_value` decimal(15,2) DEFAULT NULL,
  `profit_loss` decimal(15,2) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_investments`
--

LOCK TABLES `user_investments` WRITE;
/*!40000 ALTER TABLE `user_investments` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_investments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `token` varchar(255) DEFAULT NULL,
  `device_info` json DEFAULT NULL,
  `ip_address` varchar(255) DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sessions`
--

LOCK TABLES `user_sessions` WRITE;
/*!40000 ALTER TABLE `user_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(100) NOT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'user',
  `verify_step` int NOT NULL DEFAULT '0',
  `email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `google_id` varchar(255) DEFAULT NULL,
  `profile_image_url` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `is_premium` tinyint(1) DEFAULT '0',
  `app_role` varchar(255) DEFAULT 'user',
  `status` enum('active','inactive','banned') DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `email_3` (`email`),
  UNIQUE KEY `email_4` (`email`),
  UNIQUE KEY `email_5` (`email`),
  UNIQUE KEY `email_6` (`email`),
  UNIQUE KEY `email_7` (`email`),
  UNIQUE KEY `email_8` (`email`),
  UNIQUE KEY `email_9` (`email`),
  UNIQUE KEY `email_10` (`email`),
  UNIQUE KEY `email_11` (`email`),
  UNIQUE KEY `email_12` (`email`),
  UNIQUE KEY `email_13` (`email`),
  UNIQUE KEY `email_14` (`email`),
  UNIQUE KEY `email_15` (`email`),
  UNIQUE KEY `email_16` (`email`),
  UNIQUE KEY `email_17` (`email`),
  UNIQUE KEY `email_18` (`email`),
  UNIQUE KEY `email_19` (`email`),
  UNIQUE KEY `email_20` (`email`),
  UNIQUE KEY `email_21` (`email`),
  UNIQUE KEY `email_22` (`email`),
  UNIQUE KEY `email_23` (`email`),
  UNIQUE KEY `email_24` (`email`),
  UNIQUE KEY `email_25` (`email`),
  UNIQUE KEY `email_26` (`email`),
  UNIQUE KEY `email_27` (`email`),
  UNIQUE KEY `email_28` (`email`),
  UNIQUE KEY `email_29` (`email`),
  UNIQUE KEY `email_30` (`email`),
  UNIQUE KEY `email_31` (`email`),
  UNIQUE KEY `email_32` (`email`),
  UNIQUE KEY `email_33` (`email`),
  UNIQUE KEY `email_34` (`email`),
  UNIQUE KEY `email_35` (`email`),
  UNIQUE KEY `email_36` (`email`),
  UNIQUE KEY `email_37` (`email`),
  UNIQUE KEY `email_38` (`email`),
  UNIQUE KEY `email_39` (`email`),
  UNIQUE KEY `email_40` (`email`),
  UNIQUE KEY `email_41` (`email`),
  UNIQUE KEY `email_42` (`email`),
  UNIQUE KEY `email_43` (`email`),
  UNIQUE KEY `email_44` (`email`),
  UNIQUE KEY `email_45` (`email`),
  UNIQUE KEY `email_46` (`email`),
  UNIQUE KEY `email_47` (`email`),
  UNIQUE KEY `email_48` (`email`),
  UNIQUE KEY `email_49` (`email`),
  UNIQUE KEY `email_50` (`email`),
  UNIQUE KEY `email_51` (`email`),
  UNIQUE KEY `email_52` (`email`),
  UNIQUE KEY `email_53` (`email`),
  UNIQUE KEY `email_54` (`email`),
  UNIQUE KEY `email_55` (`email`),
  UNIQUE KEY `email_56` (`email`),
  UNIQUE KEY `email_57` (`email`),
  UNIQUE KEY `email_58` (`email`),
  UNIQUE KEY `email_59` (`email`),
  UNIQUE KEY `email_60` (`email`),
  UNIQUE KEY `email_61` (`email`),
  UNIQUE KEY `email_62` (`email`),
  UNIQUE KEY `email_63` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('47c4b2b5-1e5f-4829-86a4-16ac0b44b78f','Test User Rerun','Test User Rerun','test@example.com','$2a$10$X/oX2zP7zWz5vWzWzWzWzuWzWzWzWzWzWzWzWzWzWzWzWzWzWzW','user',1,1,NULL,NULL,'2025-12-10 07:15:00','2025-12-10 07:15:00',0,'user','active'),('5aaf167c-41ca-4309-b595-07f3bb44d4c0','Test Flow User','Test Flow User','testuser_1766582859142@example.com','password123','user',0,1,NULL,NULL,'2025-12-24 13:27:39','2025-12-24 13:27:39',0,'user','active'),('61796564-4a39-457e-a218-1a4dc9bd5f22','Jagadeeshan Jaga','Jagadeeshan Jaga','test123@gmail.com','$2a$10$n4NdpIg7AcsU05gv5d1DOuUqgqot/uAWHVNLPaGLjPKQk8IzpzCF.','user',1,1,NULL,NULL,'2026-09-05 03:09:37','2026-09-05 03:09:37',0,'user','active'),('6ff49abd-07c1-421c-9c52-0b292c67956b','Jtest','Jtest','test1@gmail.com','$2a$10$X9e0Nz2YZNsISU5.K/w/8.S1U3z3zxEUhhQR1LhtwsvWZGB5VBgKC','user',1,1,NULL,NULL,'2025-12-16 13:36:40','2025-12-16 13:36:40',0,'user','active'),('8720b484-8c4f-4377-9e16-d18a7d5901cc','Jagadeeshan Samsara',NULL,'fabctest@gmail.com','$2a$10$7tWiAXuUro.7szvl9t0gkupOAhquw/LMhv4FOjooSqNyhOFSRHEf6','user',1,1,NULL,NULL,'2026-10-09 16:32:25','2026-10-09 16:47:07',0,'advisor','active'),('9075cfe7-e8ec-44b9-8e7d-8aaba9537f8b','Jagadeeshan ','Jagadeeshan ','admin@gmail.com','$2a$12$S6IjmI37kXb5Wu5szXQEgODssJKPAOXtY/ODe9Kin0Rmhp04axuoC','user',1,1,NULL,NULL,'2025-12-24 08:06:45','2025-12-30 17:28:41',0,'super_admin','active'),('abc5f3e7-c584-4c10-8a80-98fcf163f0c8','Test ','Test ','test@gmail.com','$2a$10$eUZaGpauALytjBnEmAP0zO3E3F3lIquTH3goGT2yV9L/0T42A6puu','super_admin',1,1,NULL,NULL,'2025-12-10 07:29:09','2026-09-06 00:00:00',0,'premium','active'),('b8bdd193-9c08-4310-8411-1f950308217c','Jagadeeshan ','Jagadeeshan ','test12@gmail.com','$2a$10$O11WoF6TFLOgpWwgSIUO0.5ylpk3MHyXTo4SNnxdI9wj43JpRW5l6','user',1,1,NULL,NULL,'2025-12-30 12:24:03','2025-12-31 14:46:35',1,'user','active'),('c538e7b1-238d-4181-804a-d13583be9518','Test Flow User','Test Flow User','testuser_1766582639235@example.com','password123','user',0,1,NULL,NULL,'2025-12-24 13:23:59','2025-12-24 13:23:59',0,'user','active'),('c6574319-4d87-4f1a-82ce-389d249ab3e1','Tester B','Tester B','tester_b@example.com','$2a$10$tB2ssWMQGl9WUovwKHiEdu4D9t8df8UhcncPBS2x2ecGz3gak20XW','user',1,1,NULL,NULL,'2025-12-14 01:54:00','2025-12-14 01:54:00',0,'user','active'),('d9bd62e0-4721-4a94-85e4-fa69f96d0974','Tester A','Tester A','tester_a@example.com','$2a$10$L0R3oVvnpvv8JKWpRbnvkuMlDyuL.SZAQspds6FPqO8EH47P6KjR2','user',1,1,NULL,NULL,'2025-12-14 01:53:57','2025-12-14 01:53:57',0,'user','active'),('def4b7a6-2752-4402-bf87-b3d745b180ef','Test Flow User','Test Flow User','testuser_1766583152811@example.com','password123','user',0,1,NULL,NULL,'2025-12-24 13:32:32','2025-12-24 13:32:32',0,'user','active'),('eceba0d7-3225-492d-a1e9-04f609ff9571','Super Admin','Super Admin','myshadow.ims@gmail.com','$2a$10$g8wOB8No0NCSrzDosseh2e5zg6vRAk7OO.mzAZt0XJ/dqZecnd9y6','admin',0,1,NULL,NULL,'2025-12-24 08:51:41','2025-12-24 08:51:41',1,'super_admin','active'),('f0398010-970d-4052-a870-d840987ad359','New User','New User','newuser@gmail.com','$2a$10$yso.SFs2v8Sv3D9Odmt79uKqngc8IJhCnxyLmKOzIgu7hx2aGurFC','investor',1,1,NULL,NULL,'2026-01-05 10:23:14','2026-01-05 10:23:14',0,'user','active'),('f50c1e5f-bced-4c7e-a49e-3e8441793a91','Refund User','Refund User','refund_1767791117065@test.com','password123','client',0,1,NULL,NULL,'2026-01-07 13:05:17','2026-09-06 00:00:00',0,'user','active');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendors`
--

DROP TABLE IF EXISTS `vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendors` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(255) DEFAULT NULL,
  `address` text,
  `logo_url` varchar(255) DEFAULT NULL,
  `verified` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendors`
--

LOCK TABLES `vendors` WRITE;
/*!40000 ALTER TABLE `vendors` DISABLE KEYS */;
INSERT INTO `vendors` VALUES ('047b59a9-6bc2-4854-8210-9bba23ce31bc',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2025-12-26 13:36:40','2025-12-26 13:36:40'),('06122938-2491-4361-a6c6-aa55591a83f3',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2026-01-05 15:06:08','2026-01-05 15:06:08'),('32a7de96-2e94-4931-817b-3c42a9f3ea43',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2026-09-05 09:20:37','2026-09-05 09:20:37'),('6162cbbc-22cd-451f-8f38-c4482e1ad35e',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2026-01-05 15:06:51','2026-01-05 15:06:51'),('6b701a6f-b738-4204-9c44-f7e94719582c',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2026-01-05 15:06:45','2026-01-05 15:06:45'),('7681a2a7-51ab-43ee-bfc1-9cd3d26ed5c6',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2026-01-05 15:06:15','2026-01-05 15:06:15'),('86894a44-1802-4bd5-b683-40160b62860b',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2025-12-26 13:40:21','2025-12-26 13:40:21'),('87c14662-76fe-4472-9fc7-603d10f80728',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2026-01-05 15:06:12','2026-01-05 15:06:12'),('a619aab7-a42b-4fb3-ac6f-b8ba7cc99001',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2026-01-05 15:10:47','2026-01-05 15:10:47'),('a896019c-5f8c-4fb2-8146-e374d040e7f5',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2026-09-08 10:40:11','2026-09-08 10:40:11'),('b6ef1b4e-27a9-46c2-b1d3-458b89c2b6e2',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2025-12-26 15:32:46','2025-12-26 15:32:46'),('bca96b84-5b10-41c5-8536-28a217503cc4',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2025-12-26 09:54:19','2025-12-26 09:54:19'),('bd653893-6cf7-477e-89b6-eee864157e99',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2025-12-31 14:55:26','2025-12-31 14:55:26'),('de7721e5-b97a-4159-b67d-5e1e66b5ccfe',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2025-12-26 13:27:58','2025-12-26 13:27:58'),('e16efc96-cc64-4d75-89fe-e5e47358b549',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2025-12-26 13:30:18','2025-12-26 13:30:18'),('e722d34d-641a-4784-bc46-089b72875167',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2025-12-24 12:07:04','2025-12-24 12:07:04'),('e8ffd246-cc56-4a77-99eb-5f6c48ef1fc7',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2026-01-05 15:06:57','2026-01-05 15:06:57'),('fc4c9fe5-e70b-4bd9-b463-e9c7decc57a8',NULL,NULL,'approved',NULL,NULL,NULL,NULL,NULL,'2025-12-26 13:28:21','2025-12-26 13:28:21');
/*!40000 ALTER TABLE `vendors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `verification_codes`
--

DROP TABLE IF EXISTS `verification_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `verification_codes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` char(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `purpose` varchar(32) NOT NULL,
  `code_hash` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `attempts` int unsigned NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `verification_codes_code_hash_idx` (`code_hash`),
  KEY `verification_codes_user_id_idx` (`user_id`),
  KEY `verification_codes_email_purpose_idx` (`email`,`purpose`),
  KEY `verification_codes_code_hash` (`code_hash`),
  KEY `verification_codes_user_id` (`user_id`),
  KEY `verification_codes_email_purpose` (`email`,`purpose`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `verification_codes`
--

LOCK TABLES `verification_codes` WRITE;
/*!40000 ALTER TABLE `verification_codes` DISABLE KEYS */;
INSERT INTO `verification_codes` VALUES (1,'8720b484-8c4f-4377-9e16-d18a7d5901cc','fabctest@gmail.com','password_reset','b52d5f0d184e80727325afcfe297651df98fa01a207ac73eb0a5776a714e774c','2026-10-10 04:07:22',NULL,0,'2026-10-10 03:37:22','2026-10-10 03:37:22');
/*!40000 ALTER TABLE `verification_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vip_features`
--

DROP TABLE IF EXISTS `vip_features`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vip_features` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chat_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `feature_key` varchar(255) DEFAULT NULL,
  `is_enabled` tinyint(1) DEFAULT NULL,
  `config` json DEFAULT NULL,
  `min_trust_score` int DEFAULT NULL,
  `required_plan_tier` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vip_features`
--

LOCK TABLES `vip_features` WRITE;
/*!40000 ALTER TABLE `vip_features` DISABLE KEYS */;
/*!40000 ALTER TABLE `vip_features` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `watchlists`
--

DROP TABLE IF EXISTS `watchlists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `watchlists` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `stocks` json DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `watchlists_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `watchlists`
--

LOCK TABLES `watchlists` WRITE;
/*!40000 ALTER TABLE `watchlists` DISABLE KEYS */;
INSERT INTO `watchlists` VALUES ('2c56370b-115d-4350-a696-cffc2a2db8ba','9075cfe7-e8ec-44b9-8e7d-8aaba9537f8b','My Watchlist','[]',1,'2026-01-05 09:36:02','2026-01-05 09:36:02'),('4b95b84f-b59e-4981-9f8d-1b02b4ff2c11','abc5f3e7-c584-4c10-8a80-98fcf163f0c8','My Watchlist','[\"TATAMOTORS.NS\"]',1,'2026-01-01 13:14:13','2026-01-01 13:14:13'),('b92f4212-9f55-46ca-bb0b-99efe0b1c44e','eceba0d7-3225-492d-a1e9-04f609ff9571','My Watchlist','[]',1,'2026-09-05 11:22:27','2026-09-05 11:22:27'),('d2727be3-6dc0-408c-9b5f-959c140c2f34','8720b484-8c4f-4377-9e16-d18a7d5901cc','My Watchlist','[]',1,'2026-10-09 16:33:43','2026-10-09 16:33:43'),('d7264da9-fe7f-440e-8b7f-b1ef596b7373','61796564-4a39-457e-a218-1a4dc9bd5f22','My Watchlist','[]',1,'2026-09-05 03:15:00','2026-09-05 03:15:00');
/*!40000 ALTER TABLE `watchlists` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-23 16:28:07
