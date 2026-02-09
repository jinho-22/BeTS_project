const app = require('./app');
const env = require('./config/env');
const sequelize = require('./config/database');

// 모델 관계 초기화 (반드시 서버 시작 전에 로드)
require('./models');

const startServer = async () => {
  try {
    // DB 연결 확인
    await sequelize.authenticate();
    console.log('✅ MariaDB 연결 성공');

    // 개발 환경에서만 테이블 자동 동기화
    if (env.nodeEnv === 'development') {
      try {
        await sequelize.sync({ alter: true });
        console.log('✅ 데이터베이스 테이블 동기화 완료');
      } catch (syncError) {
        console.warn('⚠️ 테이블 동기화 중 일부 에러 (무시 가능):', syncError.message);
        // alter 실패 시 기본 sync로 재시도
        await sequelize.sync();
        console.log('✅ 데이터베이스 테이블 기본 동기화 완료');
      }
    }

    // 서버 시작
    app.listen(env.port, () => {
      console.log(`🚀 BeTS Work Log Server is running on port ${env.port}`);
      console.log(`📌 Environment: ${env.nodeEnv}`);
      console.log(`📌 API Base: http://localhost:${env.port}/api`);
    });
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error.message);
    process.exit(1);
  }
};

startServer();
