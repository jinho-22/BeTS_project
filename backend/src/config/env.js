const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';

// JWT 시크릿 키 검증 및 생성
const getJwtSecrets = () => {
  const secret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  // 프로덕션 환경: 환경변수 필수
  if (nodeEnv === 'production') {
    if (!secret || !refreshSecret) {
      console.error('❌ [보안 오류] 프로덕션 환경에서는 JWT_SECRET, JWT_REFRESH_SECRET 환경변수가 반드시 설정되어야 합니다.');
      console.error('   .env 파일 또는 환경변수에 다음 항목을 설정하세요:');
      console.error('   JWT_SECRET=<최소 32자 이상의 랜덤 문자열>');
      console.error('   JWT_REFRESH_SECRET=<최소 32자 이상의 랜덤 문자열>');
      process.exit(1);
    }
    return { secret, refreshSecret };
  }

  // 개발 환경: 미설정 시 랜덤 시크릿 자동 생성 (경고 출력)
  if (!secret || !refreshSecret) {
    const generatedSecret = crypto.randomBytes(64).toString('hex');
    const generatedRefreshSecret = crypto.randomBytes(64).toString('hex');
    console.warn('⚠️  [보안 경고] JWT 시크릿 키가 환경변수에 설정되지 않았습니다.');
    console.warn('   개발 환경이므로 임시 랜덤 시크릿을 생성하여 사용합니다.');
    console.warn('   서버를 재시작하면 기존 토큰이 무효화됩니다.');
    console.warn('   .env 파일에 JWT_SECRET, JWT_REFRESH_SECRET을 설정하세요.');
    return {
      secret: secret || generatedSecret,
      refreshSecret: refreshSecret || generatedRefreshSecret,
    };
  }

  return { secret, refreshSecret };
};

const jwtSecrets = getJwtSecrets();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    name: process.env.DB_NAME || 'bets_worklog',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },
  jwt: {
    secret: jwtSecrets.secret,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshSecret: jwtSecrets.refreshSecret,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760,
  },
};
