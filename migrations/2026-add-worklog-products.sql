-- ============================================================
-- 마이그레이션: work_log_products 테이블 추가 + 기존 데이터 마이그레이션
-- 작성일: 2026-03-27
-- 설명: 한 작업에 여러 제품을 등록할 수 있도록 junction 테이블 추가.
--       기존 work_log 단일 제품 데이터를 work_log_products로 복사.
-- ============================================================

-- 1. work_log_products 테이블 생성 (이미 있으면 스킵)
CREATE TABLE IF NOT EXISTS `work_log_products` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `log_id` INT NOT NULL COMMENT '작업 로그 ID',
  `service_type` VARCHAR(50) NOT NULL COMMENT '서비스 유형 (DB, WEB/WAS 등)',
  `product_type` VARCHAR(50) NOT NULL COMMENT '제품명(Oracle, Tibero, Jeus 등)',
  `product_version` VARCHAR(50) NOT NULL COMMENT '제품 버전 정보',
  PRIMARY KEY (`id`),
  KEY `fk_wlp_worklog` (`log_id`),
  CONSTRAINT `fk_wlp_worklog` FOREIGN KEY (`log_id`) REFERENCES `work_log` (`log_id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='작업 로그 다중 제품';

-- 2. 기존 work_log 단일 제품 데이터 복사 (이미 마이그레이션된 경우 중복 방지)
INSERT INTO `work_log_products` (log_id, service_type, product_type, product_version)
SELECT w.log_id, w.service_type, w.product_type, w.product_version
FROM `work_log` w
LEFT JOIN `work_log_products` p ON p.log_id = w.log_id
WHERE p.id IS NULL
  AND w.service_type IS NOT NULL
  AND w.product_type IS NOT NULL;

-- 3. 검증: 데이터 건수 확인
SELECT
  (SELECT COUNT(*) FROM work_log) AS total_work_logs,
  (SELECT COUNT(DISTINCT log_id) FROM work_log_products) AS migrated_logs,
  (SELECT COUNT(*) FROM work_log_products) AS total_products;
