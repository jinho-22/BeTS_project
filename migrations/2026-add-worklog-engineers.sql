-- ============================================================
-- 마이그레이션: work_log_engineers 테이블 추가
-- 작성일: 2026-05-16
-- 설명: 작업 내역에 작성자 외 추가 엔지니어를 등록할 수 있도록 함.
--       통계에서 추가 엔지니어의 작업 시간도 합산됨.
-- ============================================================

CREATE TABLE IF NOT EXISTS `work_log_engineers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `log_id` INT NOT NULL COMMENT '작업 로그 ID',
  `user_id` INT NOT NULL COMMENT '추가 엔지니어 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_log_user` (`log_id`, `user_id`),
  KEY `fk_wle_log` (`log_id`),
  KEY `fk_wle_user` (`user_id`),
  CONSTRAINT `fk_wle_log` FOREIGN KEY (`log_id`) REFERENCES `work_log` (`log_id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_wle_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='작업 로그 추가 엔지니어';

-- 검증
SHOW CREATE TABLE work_log_engineers;
