/**
 * 데이터베이스 동기화 스크립트
 * npm run db:sync 명령으로 실행
 */
const sequelize = require('./database');
require('../models'); // 모델 관계 로드

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MariaDB 연결 성공');

    // force: true는 기존 테이블을 DROP 후 재생성 (개발용만 사용)
    await sequelize.sync({ force: true });
    console.log('✅ 모든 테이블이 재생성되었습니다.');

    // 초기 데이터 삽입 (선택)
    const { Department } = require('../models');
    const { User } = require('../models');

    await Department.bulkCreate([
      { dept_name: 'DB기술팀' },
      { dept_name: 'WEB/WAS팀' },
      { dept_name: '클라우드팀' },
      { dept_name: '기술지원팀' },
    ]);
    console.log('✅ 초기 부서 데이터 삽입 완료');

    await User.create({
      email: 'admin@bets.co.kr',
      name: '시스템관리자',
      password: 'admin1234',
      dept_id: 1,
      position: '팀장',
      role: 'admin',
      is_active: true,
    });
    console.log('✅ 관리자 계정 생성 완료 (admin@bets.co.kr / admin1234)');

    process.exit(0);
  } catch (error) {
    console.error('❌ 동기화 실패:', error.message);
    process.exit(1);
  }
};

syncDatabase();
