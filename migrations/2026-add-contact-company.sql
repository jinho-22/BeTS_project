-- ============================================================
-- 마이그레이션: manager_contacts 테이블에 company 컬럼 추가
-- 작성일: 2026-03-27
-- 설명: 요청자 소속 회사를 입력할 수 있도록 company 컬럼 추가
-- ============================================================

-- 컬럼 존재 여부 확인 후 추가 (재실행 안전)
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'manager_contacts'
    AND COLUMN_NAME = 'company'
);

SET @sql = IF(
  @column_exists = 0,
  "ALTER TABLE manager_contacts ADD COLUMN company VARCHAR(100) DEFAULT '' COMMENT '요청자 소속 회사' AFTER name",
  "SELECT '이미 company 컬럼이 존재합니다.' AS info"
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 검증
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'manager_contacts'
  AND COLUMN_NAME = 'company';
