/**
 * PM2 프로세스 관리 설정 파일
 * 사용법: pm2 start ecosystem.config.js
 */
module.exports = {
  apps: [{
    name: 'bets-backend',
    script: 'src/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    // 로그 설정
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // 자동 재시작 설정
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    // 재시작 지연
    min_uptime: '10s',
    max_restarts: 10,
  }]
};
