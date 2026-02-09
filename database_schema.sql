-- ============================================================
-- BeTS (Business engineer Tracking System) Database Schema
-- 테스트 서버 배포용 테이블 생성 SQL
-- 생성일: 2026-02-09
-- ============================================================

-- 데이터베이스 생성 (필요 시)
-- CREATE DATABASE IF NOT EXISTS bets_worklog DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
-- USE bets_worklog;

-- ============================================================
-- 기존 테이블 삭제 (순서 주의: FK 의존성 역순)
-- ============================================================
DROP TABLE IF EXISTS `file_uploads`;
DROP TABLE IF EXISTS `incidents`;
DROP TABLE IF EXISTS `work_log`;
DROP TABLE IF EXISTS `manager_contacts`;
DROP TABLE IF EXISTS `projects`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `client`;
DROP TABLE IF EXISTS `departments`;

-- ============================================================
-- 1. 부서 테이블
-- ============================================================
CREATE TABLE `departments` (
  `dept_id` INT NOT NULL AUTO_INCREMENT COMMENT '부서 고유 식별자',
  `dept_name` VARCHAR(30) NOT NULL COMMENT '부서 명칭',
  PRIMARY KEY (`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='부서 정보';

-- ============================================================
-- 2. 고객사 테이블
-- ============================================================
CREATE TABLE `client` (
  `client_id` INT NOT NULL AUTO_INCREMENT COMMENT '고객사 고유 식별자',
  `client_name` VARCHAR(100) NOT NULL COMMENT '고객사 명칭',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '논리적 삭제 여부',
  PRIMARY KEY (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='고객사 정보';

-- ============================================================
-- 3. 제품 마스터 테이블
-- ============================================================
CREATE TABLE `products` (
  `product_id` INT NOT NULL AUTO_INCREMENT COMMENT '제품 식별자 (PK)',
  `product_type` VARCHAR(50) NOT NULL COMMENT '제품 유형 (DB, OS, WEB, Network 등)',
  `product_name` VARCHAR(100) NOT NULL COMMENT '제품명 (Oracle, Tibero, CentOS 등)',
  PRIMARY KEY (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='제품 기준 정보';

-- ============================================================
-- 4. 사용자 테이블
-- ============================================================
CREATE TABLE `users` (
  `user_id` INT NOT NULL AUTO_INCREMENT COMMENT '사용자 고유 식별자',
  `dept_id` INT NOT NULL COMMENT '소속 부서 ID(FK)',
  `email` VARCHAR(50) NOT NULL COMMENT '회사 이메일 주소(로그인시 사용)',
  `name` VARCHAR(50) NOT NULL COMMENT '성명',
  `position` VARCHAR(20) NOT NULL COMMENT '직급 (전임, 선임 등)',
  `password` VARCHAR(255) NOT NULL COMMENT '암호화된 비밀번호',
  `role` VARCHAR(20) NOT NULL DEFAULT 'engineer' COMMENT '권한(admin, manager, engineer)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '계정 활성화/퇴사 여부',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `fk_users_dept` (`dept_id`),
  CONSTRAINT `fk_users_dept` FOREIGN KEY (`dept_id`) REFERENCES `departments` (`dept_id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='사용자 정보';

-- ============================================================
-- 5. 프로젝트 테이블
-- ============================================================
CREATE TABLE `projects` (
  `project_id` INT NOT NULL AUTO_INCREMENT COMMENT '프로젝트 고유 식별자',
  `client_id` INT NOT NULL COMMENT '고객사 ID',
  `dept_id` INT NOT NULL COMMENT '담당 부서 ID',
  `project_name` VARCHAR(100) NOT NULL COMMENT '프로젝트 명칭',
  `contract_period` VARCHAR(100) NOT NULL COMMENT '계약 기간(문구)',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '논리적 삭제 여부',
  PRIMARY KEY (`project_id`),
  KEY `fk_projects_client` (`client_id`),
  KEY `fk_projects_dept` (`dept_id`),
  CONSTRAINT `fk_projects_client` FOREIGN KEY (`client_id`) REFERENCES `client` (`client_id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_projects_dept` FOREIGN KEY (`dept_id`) REFERENCES `departments` (`dept_id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='프로젝트 정보';

-- ============================================================
-- 6. 고객사 담당자 테이블
-- ============================================================
CREATE TABLE `manager_contacts` (
  `contact_id` INT NOT NULL AUTO_INCREMENT COMMENT '고객사 담당자 고유 식별자',
  `project_id` INT NOT NULL COMMENT '소속 프로젝트 ID',
  `name` VARCHAR(50) NOT NULL COMMENT '요청자 성명',
  `email` VARCHAR(100) NOT NULL COMMENT '요청자 이메일 주소',
  `phone` VARCHAR(20) NOT NULL COMMENT '요청자 연락처',
  PRIMARY KEY (`contact_id`),
  KEY `fk_contacts_project` (`project_id`),
  CONSTRAINT `fk_contacts_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`project_id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='고객사 담당자 정보';

-- ============================================================
-- 7. 작업 로그 테이블
-- ============================================================
CREATE TABLE `work_log` (
  `log_id` INT NOT NULL AUTO_INCREMENT COMMENT '작업 로그 식별자',
  `user_id` INT NOT NULL COMMENT '담당 직원 ID',
  `project_id` INT NOT NULL COMMENT '프로젝트 ID',
  `work_start` DATETIME NOT NULL COMMENT '작업시작일시',
  `work_end` DATETIME NOT NULL COMMENT '작업종료일시',
  `work_type` VARCHAR(50) NOT NULL COMMENT '작업 유형(정기점검, 장애지원, 기술지원, 기타)',
  `supprt_type` VARCHAR(50) NOT NULL COMMENT '지원 구분 (원격, 방문, 가이드 등)',
  `service_type` VARCHAR(50) NOT NULL COMMENT '서비스 유형 (DB, WEB/WAS 등)',
  `product_type` VARCHAR(50) NOT NULL COMMENT '제품명(Oracle, Tibero, Jeus 등)',
  `product_version` VARCHAR(50) NOT NULL COMMENT '제품 버전 정보',
  `status` VARCHAR(10) NOT NULL DEFAULT '등록' COMMENT '결재/상태 (등록, 관리자확인, 승인완료 등)',
  `contact_id` INT NOT NULL COMMENT '요청자 ID',
  `details` TEXT NOT NULL COMMENT '상세 작업 내용 및 특이사항',
  `incident_id` INT DEFAULT NULL COMMENT '연관 장애 ID(장애 시 생성)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`log_id`),
  KEY `fk_worklog_user` (`user_id`),
  KEY `fk_worklog_project` (`project_id`),
  KEY `fk_worklog_contact` (`contact_id`),
  CONSTRAINT `fk_worklog_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_worklog_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`project_id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_worklog_contact` FOREIGN KEY (`contact_id`) REFERENCES `manager_contacts` (`contact_id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='작업 로그';

-- ============================================================
-- 8. 장애 테이블
-- ============================================================
CREATE TABLE `incidents` (
  `incident_id` INT NOT NULL AUTO_INCREMENT COMMENT '장애 고유 식별자',
  `log_id` INT NOT NULL COMMENT '연관 작업 로그 ID',
  `action_type` VARCHAR(50) NOT NULL COMMENT '조치 유형(임시, 영구, 가이드, 모니터링)',
  `start_time` DATETIME NOT NULL COMMENT '장애발생일시',
  `end_time` DATETIME NOT NULL COMMENT '장애복구일시',
  `severity` VARCHAR(20) NOT NULL COMMENT '영향도 (Critical, Major, Minor)',
  `cause_type` VARCHAR(20) NOT NULL COMMENT '장애 원인 분류(OS, DB, 앱 등)',
  `is_recurrence` CHAR(1) NOT NULL DEFAULT 'N' COMMENT '재발 여부 체크(Y/N)',
  PRIMARY KEY (`incident_id`),
  KEY `fk_incidents_worklog` (`log_id`),
  CONSTRAINT `fk_incidents_worklog` FOREIGN KEY (`log_id`) REFERENCES `work_log` (`log_id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='장애 정보';

-- ============================================================
-- 9. 파일 업로드 테이블
-- ============================================================
CREATE TABLE `file_uploads` (
  `file_id` INT NOT NULL AUTO_INCREMENT COMMENT '파일 식별자',
  `log_id` INT NOT NULL COMMENT '작업 로그 ID',
  `user` INT NOT NULL COMMENT '업로드한 사용자 ID',
  `original_name` VARCHAR(255) NOT NULL COMMENT '파일 원본 파일명',
  `stored_name` VARCHAR(255) DEFAULT NULL COMMENT '저장된 파일명',
  `file_path` VARCHAR(500) DEFAULT NULL COMMENT '파일 저장 경로',
  `file_size` INT DEFAULT NULL COMMENT '파일 크기(bytes)',
  PRIMARY KEY (`file_id`),
  KEY `fk_files_worklog` (`log_id`),
  KEY `fk_files_user` (`user`),
  CONSTRAINT `fk_files_worklog` FOREIGN KEY (`log_id`) REFERENCES `work_log` (`log_id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_files_user` FOREIGN KEY (`user`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='파일 업로드 정보';

-- ============================================================
-- 초기 데이터 (기본 부서 + 관리자 계정)
-- ============================================================

-- 기본 부서 생성
INSERT INTO `departments` (`dept_name`) VALUES ('기술지원1팀');
INSERT INTO `departments` (`dept_name`) VALUES ('기술지원2팀');
INSERT INTO `departments` (`dept_name`) VALUES ('기술지원3팀');

-- 관리자 계정 생성 (비밀번호: admin123 → bcrypt 해시)
-- 주의: 아래 해시는 예시입니다. 실제 배포 시 서버에서 회원가입 API를 통해 생성하거나,
--       Node.js 스크립트로 bcrypt 해시를 생성하여 사용하세요.
-- INSERT INTO `users` (`dept_id`, `email`, `name`, `position`, `password`, `role`, `is_active`)
-- VALUES (1, 'admin@company.com', '관리자', '팀장',
--         '$2a$12$해시값', 'admin', 1);

-- ============================================================
-- 제품 마스터 초기 데이터
-- ============================================================
INSERT INTO `products` (`product_type`, `product_name`) VALUES
  -- DB
  ('DB', 'Oracle'),
  ('DB', 'Tibero'),
  ('DB', 'PostgreSQL'),
  ('DB', 'MySQL'),
  ('DB', 'MariaDB'),
  ('DB', 'MS-SQL'),
  -- OS
  ('OS', 'CentOS'),
  ('OS', 'RHEL'),
  ('OS', 'Ubuntu'),
  ('OS', 'Windows Server'),
  ('OS', 'Rocky Linux'),
  -- WEB/WAS
  ('WEB/WAS', 'Jeus'),
  ('WEB/WAS', 'WebtoB'),
  ('WEB/WAS', 'Tomcat'),
  ('WEB/WAS', 'Apache'),
  ('WEB/WAS', 'Nginx'),
  ('WEB/WAS', 'WebLogic'),
  -- Network
  ('Network', 'L4 Switch'),
  ('Network', 'DNS'),
  -- Security
  ('Security', '방화벽'),
  ('Security', 'WAF'),
  -- Cloud
  ('Cloud', 'AWS'),
  ('Cloud', 'Azure'),
  ('Cloud', 'NCP');

-- ============================================================
-- 완료
-- ============================================================
-- 테이블 생성 확인
-- SHOW TABLES;
-- 각 테이블 구조 확인
-- DESCRIBE departments;
-- DESCRIBE client;
-- DESCRIBE products;
-- DESCRIBE users;
-- DESCRIBE projects;
-- DESCRIBE manager_contacts;
-- DESCRIBE work_log;
-- DESCRIBE incidents;
-- DESCRIBE file_uploads;
