/**
 * 데이터베이스 동기화 스크립트
 * npm run db:sync 명령으로 실행
 *
 * 테이블 구조만 생성하며, 초기 데이터는 웹 UI의 초기 설정 페이지에서 입력합니다.
 * - 최초 접속 시 /setup 페이지로 안내됩니다.
 * - 관리자 계정, 부서, 제품 등을 직접 입력할 수 있습니다.
 */
const sequelize = require('./database');
require('../models'); // 모델 관계 로드

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MariaDB 연결 성공');

    // force: true는 기존 테이블을 DROP 후 재생성
    await sequelize.sync({ force: true });
    console.log('✅ 모든 테이블이 재생성되었습니다.');

    // log_id_sequences 초기 데이터 (작업 로그 번호 체계)
    await sequelize.query(
      `INSERT IGNORE INTO log_id_sequences (work_type, current_max) VALUES
        ('정기점검', 100000), ('장애지원', 300000), ('기술지원', 500000),
        ('프로젝트 지원', 700000), ('기타', 900000)`
    );
    console.log('✅ 작업 로그 시퀀스 초기화 완료');

    console.log('');
    console.log('📌 초기 설정을 완료하려면 서버를 시작하고 웹 브라우저에서 접속하세요.');
    console.log('📌 최초 접속 시 관리자 계정, 부서, 제품을 설정하는 화면이 표시됩니다.');

    process.exit(0);
  } catch (error) {
    console.error('❌ 동기화 실패:', error.message);
    process.exit(1);
  }
};

syncDatabase();
