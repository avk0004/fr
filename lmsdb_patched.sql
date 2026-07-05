-- Production LMS Database Schema (Institutional/B2B Model)
-- Target Engine: MySQL 8.0+ / InnoDB

SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================================
-- LEVEL 0: Core Foundation (No Foreign Dependencies)
-- =========================================================================

-- USE CASE: Defines who a user is (e.g., SUPER_ADMIN, COLLEGE_STUDENT, MENTOR) to handle permissions.
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` CHAR(2) NOT NULL,
  `role_name` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(50) DEFAULT NULL, -- Tracks administrative owner/creator string key
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`id`, `role_name`, `user_id`) VALUES 
('1', 'SUPER_ADMIN', NULL),
('2', 'ADMIN', NULL),
('3', 'COLLEGE', NULL),
('4', 'COLLEGE_MENTOR', NULL),
('5', 'VENDOR', NULL),
('6', 'VENDOR_MENTOR', NULL),
('7', 'COLLEGE_STUDENT', NULL),
('8', 'VENDOR_STUDENT', NULL),
('9', 'DIRECT_STUDENT', NULL),
('10','DIRECT_USER',NULL);


-- =========================================================================
-- LEVEL 1: Central Identity & System Registries
-- =========================================================================

-- USE CASE: The core account directory storing emails, login passwords, and profile status updates.
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int AUTO_INCREMENT  NOT NULL, -- Primary tracking key shifted to VARCHAR
  `user_id` VARCHAR(50) DEFAULT NULL, -- Explicit business entity ID (e.g., 'USR-2026-001')
  `username` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role_id` CHAR(2) NOT NULL,
  `status` ENUM('ACTIVE','DISABLED','LOCKED','PENDING') DEFAULT 'PENDING',
  `is_verified` TINYINT(1) DEFAULT '0',
  `is_deleted` TINYINT(1) DEFAULT '0',
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(15) DEFAULT NULL,
  `gender` ENUM('MALE','FEMALE','OTHER','PREFER_NOT_TO_SAY') DEFAULT NULL,
  `timezone` VARCHAR(50) DEFAULT 'Asia/Kolkata',
  `email_notify` TINYINT(1) DEFAULT '1',
  `sms_notify` TINYINT(1) DEFAULT '0',
  `last_login` TIMESTAMP NULL DEFAULT NULL,
  `password_changed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_by` VARCHAR(50) DEFAULT NULL,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `uq_user_id` (`user_id`),
  KEY `fk_users_role_id` (`role_id`),
  CONSTRAINT `fk_users_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_users_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Holds security codes for logins, password resets, and email verifications.
DROP TABLE IF EXISTS `otp_verifications`;
CREATE TABLE `otp_verifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(100) NOT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `otp_code` VARCHAR(255) NOT NULL,
  `purpose` ENUM('REGISTER','FORGOT_PASSWORD','EMAIL_CHANGE','TWO_FA') NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `is_used` TINYINT(1) DEFAULT '0',
  `resend_count` INT DEFAULT '0',
  `last_resent_at` TIMESTAMP NULL DEFAULT NULL,
  `user_agent` TEXT,
  `verified_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_otp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_otp_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- LEVEL 2: Multi-Tenant Workspace Infrastructure & Resource Logging
-- =========================================================================

-- USE CASE: Monitors active user logins, device locations, validation lifecycles, and session tokens.
DROP TABLE IF EXISTS `session_logs`;
CREATE TABLE `session_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) NOT NULL,
  `role_id` CHAR(2) NOT NULL,
  `session_token` VARCHAR(255) DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT,
  `login_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `logout_at` TIMESTAMP NULL DEFAULT NULL,
  `status` ENUM('ACTIVE','EXPIRED','REVOKED') DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sessions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Holds institutional profiles for subscriber colleges using your B2B platform.
DROP TABLE IF EXISTS `colleges`;
CREATE TABLE `colleges` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `clg_id` VARCHAR(50) DEFAULT NULL,
  `college_name` VARCHAR(150) NOT NULL,
  `college_code` VARCHAR(50) NOT NULL,
  `company_email` VARCHAR(100) DEFAULT NULL,
  `support_email` VARCHAR(100) DEFAULT NULL,
  `phone` VARCHAR(15) DEFAULT NULL,
  `address` TEXT,
  `city` VARCHAR(100) DEFAULT NULL,
  `state` VARCHAR(100) DEFAULT NULL,
  `country` VARCHAR(100) DEFAULT 'India',
  `pincode` VARCHAR(10) DEFAULT NULL,
  `logo` VARCHAR(255) DEFAULT NULL,
  `website` VARCHAR(255) DEFAULT NULL,
  `affiliation` VARCHAR(255) DEFAULT NULL,
  `established_year` YEAR DEFAULT NULL,
  `total_students` INT DEFAULT '0',
  `total_mentors` INT DEFAULT '0',
  `total_courses` INT DEFAULT '0',
  `plan` ENUM('BASIC','STANDARD','PREMIUM','ENTERPRISE') DEFAULT 'BASIC',
  `status` ENUM('ACTIVE','DISABLED','SUSPENDED','PENDING') DEFAULT 'PENDING',
  `assigned_admin` VARCHAR(50) DEFAULT NULL,
  `created_by` VARCHAR(50) DEFAULT NULL,
  `approved_by` VARCHAR(50) DEFAULT NULL,
  `approved_at` TIMESTAMP NULL DEFAULT NULL,
  `is_deleted` TINYINT(1) DEFAULT '0',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `college_code` (`college_code`),
  CONSTRAINT `fk_colleges_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_colleges_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_colleges_admin` FOREIGN KEY (`assigned_admin`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_colleges_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_colleges_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: A central cloud storage directory tracking uploaded videos, documents, and images.
DROP TABLE IF EXISTS `media_assets`;
CREATE TABLE `media_assets` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `uploaded_by` VARCHAR(50) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `storage_provider` ENUM('S3','CLOUDINARY','VIMEO','LOCAL') NOT NULL,
  `file_path_url` VARCHAR(500) NOT NULL,
  `file_size_bytes` BIGINT NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_media_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_media_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_media_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Tracks system changes (who edited or deleted data) to maintain accountability.
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `table_name` VARCHAR(100) NOT NULL,
  `record_id` INT DEFAULT NULL,
  `old_values` JSON DEFAULT NULL,
  `new_values` JSON DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_audit_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- LEVEL 3: Base Tenant Domain Overlays (Profiles & Institutional Structure)
-- =========================================================================

-- USE CASE: Stores specialized admin feature flags for system owners.
DROP TABLE IF EXISTS `superadmin_profiles`;
CREATE TABLE `superadmin_profiles` (
  `id` int AUTO_INCREMENT  NOT NULL,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `superadmin_name` VARCHAR(100) DEFAULT NULL,
  `permissions_level` INT DEFAULT '1',
  `can_manage_admins` TINYINT(1) DEFAULT '1',
  `can_manage_vendors` TINYINT(1) DEFAULT '1',
  `can_manage_colleges` TINYINT(1) DEFAULT '1',
  `can_view_reports` TINYINT(1) DEFAULT '1',
  `can_manage_billing` TINYINT(1) DEFAULT '1',
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_superadmin_user_ref` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_superadmin_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_superadmin_user` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Stores internal employee directory profiles for platform operations staff.
DROP TABLE IF EXISTS `admin_profiles`;
CREATE TABLE `admin_profiles` (
  `id` int AUTO_INCREMENT  NOT NULL,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `admin_name` VARCHAR(100) NOT NULL,
  `employee_id` VARCHAR(50) NOT NULL,
  `designation` VARCHAR(100) DEFAULT NULL,
  `mobile` VARCHAR(15) DEFAULT NULL,
  `managed_by_superadmin` VARCHAR(50) DEFAULT NULL,
  `can_create_colleges` TINYINT(1) DEFAULT '1',
  `can_create_vendors` TINYINT(1) DEFAULT '0',
  `can_view_reports` TINYINT(1) DEFAULT '1',
  `can_manage_courses` TINYINT(1) DEFAULT '1',
  `joining_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`),
  CONSTRAINT `fk_admin_user_ref` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_admin_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_admin_user` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_admin_manager` FOREIGN KEY (`managed_by_superadmin`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Houses corporate information for third-party course providers.
DROP TABLE IF EXISTS `vendor_profiles`;
CREATE TABLE `vendor_profiles` (
  `id` int AUTO_INCREMENT  NOT NULL,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `vendor_name` VARCHAR(100) NOT NULL,
  `company_name` VARCHAR(150) DEFAULT NULL,
  `contact_person` VARCHAR(100) DEFAULT NULL,
  `contact_phone` VARCHAR(15) DEFAULT NULL,
  `support_email` VARCHAR(100) DEFAULT NULL,
  `tax_id` VARCHAR(50) DEFAULT NULL,
  `website` VARCHAR(255) DEFAULT NULL,
  `description` TEXT,
  `plan` ENUM('STARTER','BUSINESS','ENTERPRISE') DEFAULT 'STARTER',
  `contract_start` DATE DEFAULT NULL,
  `contract_end` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_vendor_user_ref` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_vendor_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_vendor_user` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Tracks local workspace control settings for college-level administrators.
DROP TABLE IF EXISTS `college_profiles`;
CREATE TABLE `college_profiles` (
  `id` int AUTO_INCREMENT  NOT NULL,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `college_id` INT DEFAULT NULL,
  `designation` VARCHAR(100) DEFAULT NULL,
  `employee_id` VARCHAR(50) DEFAULT NULL,
  `mobile` VARCHAR(15) DEFAULT NULL,
  `can_manage_mentors` TINYINT(1) DEFAULT '1',
  `can_manage_students` TINYINT(1) DEFAULT '1',
  `joining_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_clg_prof_user_ref` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_clg_prof_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_clg_prof_user` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_clg_prof_college` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Defines school semesters, quarters, or calendar years.
DROP TABLE IF EXISTS `academic_terms`;
CREATE TABLE `academic_terms` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `college_id` INT NOT NULL,
  `academic_year` VARCHAR(20) NOT NULL,
  `semester` VARCHAR(50) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` ENUM('ACTIVE','DEACTIVATED','PENDING') DEFAULT 'PENDING',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_terms_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_terms_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_terms_college` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Tracks profile info, titles, and teaching experience for teachers and mentors.
DROP TABLE IF EXISTS `mentor_profiles`;
CREATE TABLE `mentor_profiles` (
  `id` int AUTO_INCREMENT  NOT NULL,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `college_id` INT DEFAULT NULL,
  `mentor_name` VARCHAR(100) NOT NULL,
  `employee_id` VARCHAR(50) NOT NULL,
  `mobile` VARCHAR(15) DEFAULT NULL,
  `specialization` VARCHAR(150) DEFAULT NULL,
  `qualification` VARCHAR(150) DEFAULT NULL,
  `experience_years` INT DEFAULT '0',
  `role_label` ENUM('Lead Mentor','Co-Mentor','Guest Mentor') DEFAULT 'Co-Mentor',
  `is_active` TINYINT(1) DEFAULT '1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`),
  CONSTRAINT `fk_mentor_user_ref` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mentor_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mentor_user` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mentor_college` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- USE CASE: Stores profiles for non-student users (e.g. direct users/general staff).
DROP TABLE IF EXISTS `non_student_profiles`;
CREATE TABLE `non_student_profiles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `mobile` VARCHAR(15) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_non_student_user_ref` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_non_student_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_non_student_user` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- LEVEL 4: Core Educational Elements (Departments, Academic Programs, & Catalogs)
-- =========================================================================

-- USE CASE: Organizes colleges into focus groups (e.g., "Computer Science Department").
DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `college_id` INT NOT NULL,
  `department_name` VARCHAR(150) NOT NULL,
  `department_code` VARCHAR(50) NOT NULL,
  `head_mentor_id` INT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT '1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_college_dept` (`college_id`,`department_name`),
  CONSTRAINT `fk_dept_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dept_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dept_college` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dept_head` FOREIGN KEY (`head_mentor_id`) REFERENCES `mentor_profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: The foundational directory metadata mapping available classes and subject topics.
DROP TABLE IF EXISTS `courses`;
CREATE TABLE `courses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `college_id` INT DEFAULT NULL,
  `creator_id` VARCHAR(50) NOT NULL,
  `vendor_id` INT DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `course_code` VARCHAR(50) NOT NULL,
  `description` TEXT,
  `level` ENUM('BEGINNER','INTERMEDIATE','ADVANCED') DEFAULT 'BEGINNER',
  `credits` INT DEFAULT '3',
  `duration_hrs` INT DEFAULT '0',
  `certificate_available` TINYINT(1) DEFAULT '1',
  `status` ENUM('DRAFT','PUBLISHED','ARCHIVED','UNDER_REVIEW') DEFAULT 'DRAFT',
  `published_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_courses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_courses_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_courses_college` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_courses_creator` FOREIGN KEY (`creator_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_courses_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendor_profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- LEVEL 5: Content Hierarchy, Live Environments, & Student Mapping
-- =========================================================================

-- USE CASE: Acts as course chapters to segment study materials cleanly.
DROP TABLE IF EXISTS `modules`;
CREATE TABLE `modules` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `course_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `sort_order` INT DEFAULT '0',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_modules_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_modules_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_modules_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Controls course enrollment gates.
DROP TABLE IF EXISTS `course_prerequisites`;
CREATE TABLE `course_prerequisites` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `course_id` INT NOT NULL,
  `prerequisite_course_id` INT NOT NULL,
  `minimum_grade_pct` DECIMAL(5,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_prereq_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_prereq_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_prereq_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prereq_required` FOREIGN KEY (`prerequisite_course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Schedules virtual meeting rooms for lectures.
DROP TABLE IF EXISTS `live_sessions`;
CREATE TABLE `live_sessions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `course_id` INT NOT NULL,
  `mentor_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `meeting_platform` ENUM('ZOOM','MEET','TEAMS','NATIVE') NOT NULL,
  `join_url` VARCHAR(500) NOT NULL,
  `scheduled_start` TIMESTAMP NOT NULL,
  `scheduled_end` TIMESTAMP NOT NULL,
  `status` ENUM('SCHEDULED','LIVE','CONCLUDED','CANCELLED') DEFAULT 'SCHEDULED',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_live_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_live_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_live_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_live_mentor` FOREIGN KEY (`mentor_id`) REFERENCES `mentor_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Tracks roll numbers, student IDs, and current terms for enrolled learners.
DROP TABLE IF EXISTS `student_profiles`;
CREATE TABLE `student_profiles` (
  `id` int AUTO_INCREMENT  NOT NULL,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `student_name` VARCHAR(100) NOT NULL,
  `roll_no` VARCHAR(50) NOT NULL,
  `mobile` VARCHAR(15) NOT NULL,
  `degree` VARCHAR(100) DEFAULT NULL,
  `college_id` INT DEFAULT NULL,
  `department_id` INT DEFAULT NULL,
  `term_id` INT DEFAULT NULL,
  `year_of_study` INT DEFAULT NULL,
  `origin_type` ENUM('COLLEGE','VENDOR','DIRECT') NOT NULL DEFAULT 'DIRECT',
  `vendor_user_id` INT DEFAULT NULL,
  `added_by_user_id` VARCHAR(50) NOT NULL,
  `is_active` TINYINT(1) DEFAULT '1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roll_no` (`roll_no`),
  CONSTRAINT `fk_student_user_ref` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_student_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_student_user` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_student_college` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_student_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_student_term` FOREIGN KEY (`term_id`) REFERENCES `academic_terms` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_student_vendor` FOREIGN KEY (`vendor_user_id`) REFERENCES `vendor_profiles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_student_creator` FOREIGN KEY (`added_by_user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Tracks bugs, error messages, and support inquiries raised by platform users.
DROP TABLE IF EXISTS `support_tickets`;
CREATE TABLE `support_tickets` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) NOT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `category` ENUM('TECHNICAL_BUG','CONTENT_ERROR','ACADEMIC_HELP') NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `priority` ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'LOW',
  `status` ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') DEFAULT 'OPEN',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ticket_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ticket_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- LEVEL 6: Granular Curriculum Nodes, Communication Threads, & Metrics Loggers
-- =========================================================================

-- USE CASE: Individual elements within a module (videos, articles, quizzes, etc).
DROP TABLE IF EXISTS `lessons`;
CREATE TABLE `lessons` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `module_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content_type` ENUM('VIDEO','ARTICLE','DOCUMENT','QUIZ','ASSIGNMENT','LIVE_STREAM') NOT NULL,
  `body_content` LONGTEXT,
  `sort_order` INT DEFAULT '0',
  `duration_minutes` INT DEFAULT '0',
  `is_mandatory` TINYINT(1) DEFAULT '1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_lessons_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_lessons_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_lessons_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Forces step-by-step progress sequences.
DROP TABLE IF EXISTS `lesson_dependencies`;
CREATE TABLE `lesson_dependencies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `lesson_id` INT NOT NULL,
  `requires_lesson_id` INT NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_dep_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dep_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dep_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dep_required` FOREIGN KEY (`requires_lesson_id`) REFERENCES `lessons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Stores supplemental resource files.
DROP TABLE IF EXISTS `lesson_resources`;
CREATE TABLE `lesson_resources` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `lesson_id` INT NOT NULL,
  `resource_name` VARCHAR(255) NOT NULL,
  `file_url` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(100) DEFAULT NULL,
  `file_size_bytes` BIGINT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_resources_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_resources_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_resources_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Connects a student profile to a specific course roster.
DROP TABLE IF EXISTS `enrollments`;
CREATE TABLE `enrollments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `student_id` INT NOT NULL,
  `course_id` INT NOT NULL,
  `enrolled_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expiry_at` TIMESTAMP NULL DEFAULT NULL,
  `progress_percentage` DECIMAL(5,2) DEFAULT '0.00',
  `status` ENUM('ACTIVE','COMPLETED','SUSPENDED','EXPIRED') DEFAULT 'ACTIVE',
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_course` (`student_id`,`course_id`),
  CONSTRAINT `fk_enroll_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_enroll_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_enroll_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_enroll_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Logs who attended a live stream lecture and how long they stayed.
DROP TABLE IF EXISTS `live_attendance`;
CREATE TABLE `live_attendance` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `live_session_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `left_at` TIMESTAMP NULL DEFAULT NULL,
  `total_minutes_present` INT DEFAULT '0',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_attend_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attend_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attend_session` FOREIGN KEY (`live_session_id`) REFERENCES `live_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attend_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Threaded responses inside a support ticket.
DROP TABLE IF EXISTS `ticket_messages`;
CREATE TABLE `ticket_messages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `ticket_id` INT NOT NULL,
  `sender_id` VARCHAR(50) NOT NULL,
  `message_body` TEXT NOT NULL,
  `attachment_url` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_msg_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_msg_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_msg_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Remembers lesson completion progress matrices.
DROP TABLE IF EXISTS `lesson_progress`;
CREATE TABLE `lesson_progress` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `enrollment_id` INT NOT NULL,
  `lesson_id` INT NOT NULL,
  `status` ENUM('NOT_STARTED','IN_PROGRESS','COMPLETED') DEFAULT 'NOT_STARTED',
  `video_resume_time_seconds` INT DEFAULT '0',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_enroll_lesson` (`enrollment_id`,`lesson_id`),
  CONSTRAINT `fk_pro_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pro_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pro_enroll` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pro_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Quiz parameters mappings.
DROP TABLE IF EXISTS `quizzes`;
CREATE TABLE `quizzes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `lesson_id` INT DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `passing_score_pct` DECIMAL(5,2) NOT NULL DEFAULT '50.00',
  `time_limit_minutes` INT DEFAULT NULL,
  `max_attempts` INT DEFAULT '1',
  `is_randomized` TINYINT(1) DEFAULT '0',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_quizzes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quizzes_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quizzes_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Project briefs and execution requirements.
DROP TABLE IF EXISTS `assignments`;
CREATE TABLE `assignments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `lesson_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `instructions` TEXT,
  `due_date` TIMESTAMP NULL DEFAULT NULL,
  `max_score` INT DEFAULT '100',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_assign_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_assign_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_assign_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Digital validation documents issued upon completing requirements.
DROP TABLE IF EXISTS `certificates`;
CREATE TABLE `certificates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `enrollment_id` INT NOT NULL,
  `certificate_uuid` VARCHAR(100) NOT NULL,
  `issued_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `pdf_url` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `certificate_uuid` (`certificate_uuid`),
  CONSTRAINT `fk_cert_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cert_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cert_enroll` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Global operational message alerting routing framework.
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) NOT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('SYSTEM_ANNOUNCEMENT','GRADE_RELEASED','DEADLINE_REMINDER','PAYMENT_RECEIPT') NOT NULL,
  `is_read` TINYINT(1) DEFAULT '0',
  `action_url` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notif_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Structural data holding test items.
DROP TABLE IF EXISTS `quiz_questions`;
CREATE TABLE `quiz_questions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `quiz_id` INT NOT NULL,
  `question_text` TEXT NOT NULL,
  `question_type` ENUM('MCQ','TRUE_FALSE','SHORT_ANSWER','CODE') NOT NULL,
  `points` INT DEFAULT '1',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_qq_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_qq_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_qq_quiz` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Task file storage endpoints tracking.
DROP TABLE IF EXISTS `assignment_submissions`;
CREATE TABLE `assignment_submissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `assignment_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `submission_file_url` VARCHAR(255) NOT NULL,
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `graded_by` INT DEFAULT NULL,
  `score_assigned` INT DEFAULT NULL,
  `mentor_feedback` TEXT,
  `status` ENUM('SUBMITTED','GRADED','REJECTED_RESUBMIT_ALLOWED') DEFAULT 'SUBMITTED',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sub_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sub_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sub_assign` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sub_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_sub_mentor` FOREIGN KEY (`graded_by`) REFERENCES `mentor_profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Associated multiple-choice alternatives tracking arrays.
DROP TABLE IF EXISTS `quiz_options`;
CREATE TABLE `quiz_options` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `question_id` INT NOT NULL,
  `option_text` TEXT NOT NULL,
  `is_correct` TINYINT(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_qo_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_qo_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_qo_question` FOREIGN KEY (`question_id`) REFERENCES `quiz_questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Individual instance data summaries recording grade values.
DROP TABLE IF EXISTS `quiz_attempts`;
CREATE TABLE `quiz_attempts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `enrollment_id` INT NOT NULL,
  `quiz_id` INT NOT NULL,
  `score_obtained` DECIMAL(5,2) DEFAULT '0.00',
  `pass_status` TINYINT(1) DEFAULT '0',
  `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `submitted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_qa_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_qa_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_qa_enroll` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_qa_quiz` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Tracking student contextual responses matching specific execution items.
DROP TABLE IF EXISTS `student_answers`;
CREATE TABLE `student_answers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `role_id` CHAR(2) DEFAULT NULL,
  `quiz_attempt_id` INT NOT NULL,
  `question_id` INT NOT NULL,
  `selected_option_id` INT DEFAULT NULL,
  `inserted_text` TEXT,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sa_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sa_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sa_attempt` FOREIGN KEY (`quiz_attempt_id`) REFERENCES `quiz_attempts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sa_question` FOREIGN KEY (`question_id`) REFERENCES `quiz_questions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sa_option` FOREIGN KEY (`selected_option_id`) REFERENCES `quiz_options` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- LEVEL 7: Application Views, Stored Procedures, and Helper Tables
-- =========================================================================

-- USE CASE: Links vendors to colleges.
DROP TABLE IF EXISTS `vendor_colleges`;
CREATE TABLE `vendor_colleges` (
  `vendor_id` INT NOT NULL,
  `college_id` INT NOT NULL,
  `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`vendor_id`, `college_id`),
  CONSTRAINT `fk_vc_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vc_college` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USE CASE: Database view of active mentors.
CREATE OR REPLACE VIEW vw_mentor_logins AS
SELECT 
  u.id AS user_id,
  u.username,
  u.email,
  u.status,
  m.mentor_name,
  m.mobile,
  m.specialization,
  m.role_label,
  u.created_at AS account_created,
  c.college_name
FROM users u
JOIN mentor_profiles m ON u.id = m.id
LEFT JOIN colleges c ON m.college_id = c.id;

DROP PROCEDURE IF EXISTS sp_CreateMentor;
DELIMITER //
CREATE PROCEDURE sp_CreateMentor(
    IN p_username VARCHAR(50),
    IN p_email VARCHAR(100),
    IN p_password VARCHAR(255),
    IN p_mentor_name VARCHAR(100),
    IN p_mobile VARCHAR(15),
    IN p_specialization VARCHAR(150),
    IN p_college_user_id INT,
    OUT o_user_id INT
)
BEGIN
    DECLARE v_college_user_id VARCHAR(50);
    DECLARE v_college_id INT;
    DECLARE v_mentor_user_id VARCHAR(50);
    DECLARE v_emp_id VARCHAR(50);

    -- Look up creator's user_id and college_id
    SELECT user_id INTO v_college_user_id FROM users WHERE id = p_college_user_id;
    SELECT id INTO v_college_id FROM colleges WHERE user_id = v_college_user_id LIMIT 1;

    -- Insert into users
    INSERT INTO users (username, email, password, role_id, status, is_verified, created_by)
    VALUES (p_username, p_email, p_password, '4', 'ACTIVE', 1, v_college_user_id);

    SET o_user_id = LAST_INSERT_ID();
    SET v_mentor_user_id = CONCAT('USR-', YEAR(CURDATE()), '-', LPAD(o_user_id, 6, '0'));
    SET v_emp_id = CONCAT('EMP-M-', LPAD(o_user_id, 4, '0'));

    -- Update users.user_id with generated business ID
    UPDATE users SET user_id = v_mentor_user_id WHERE id = o_user_id;

    -- Insert into mentor_profiles
    INSERT INTO mentor_profiles (id, user_id, role_id, college_id, mentor_name, employee_id, mobile, specialization)
    VALUES (o_user_id, v_mentor_user_id, '4', v_college_id, p_mentor_name, v_emp_id, p_mobile, p_specialization);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_SetMentorStatus;
DELIMITER //
CREATE PROCEDURE sp_SetMentorStatus(
    IN p_mentor_id INT,
    IN p_status VARCHAR(20)
)
BEGIN
    UPDATE users SET status = p_status WHERE id = p_mentor_id;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_ResetMentorPassword;
DELIMITER //
CREATE PROCEDURE sp_ResetMentorPassword(
    IN p_mentor_id INT,
    IN p_hashed_password VARCHAR(255)
)
BEGIN
    UPDATE users SET password = p_hashed_password WHERE id = p_mentor_id;
END //
DELIMITER ;
